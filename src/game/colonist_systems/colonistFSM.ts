import { dist2, norm, sub } from "../../core/utils";
import { T, WORLD } from "../constants";
import type { Building, Colonist, Enemy, ColonistState, Resources } from "../types";
import type { ItemType } from "../types/items";
import { grantSkillXP, skillLevel, skillWorkSpeedMultiplier } from "../skills/skills";
import { initializeColonistHealth, healInjuries, updateHealthStats, calculateOverallHealth, updateHealthProgression } from "../health/healthSystem";
import { medicalSystem } from "../health/medicalSystem";
import { medicalWorkGiver, type MedicalJob } from "../health/medicalWorkGiver";
import { executeSurgery, getHospitalBedBonus } from "../health/surgerySystem";
import { isDoorBlocking, isDoorPassable, releaseDoorQueue, isNearDoor, requestDoorOpen, shouldWaitAtDoor, initializeDoor, findBlockingDoor } from "../systems/doorSystem";
import { itemDatabase } from "../../data/itemDatabase";
import { getConstructionAudio, getConstructionCompleteAudio } from "../audio/buildingAudioMap";
import { BUILD_TYPES } from "../buildings";
import { isMountainTile as checkIsMountainTile, mineMountainTile, ORE_PROPERTIES, getOreTypeFromId, OreType } from "../terrain";
import { updateCookingState, updateStonecuttingState, updateSmeltingState, updateSmithingState, updateCoolingState, updateEquipmentState } from "./states";
import { canInterruptColonist, forceInterruptIntent, shouldEnterDecisionPhase, getColonistIntent, setColonistIntent, updateColonistIntent, hasIntent, createWorkIntent } from "../systems/colonistIntent";


// Helper function to check if a position would collide with buildings or mountains
function wouldCollideWithBuildings(game: any, x: number, y: number, radius: number): boolean {
  // Check mountain collision first (most important for getting stuck)
  const gx = Math.floor(x / T);
  const gy = Math.floor(y / T);
  if (game.terrainGrid && checkIsMountainTile(game.terrainGrid, gx, gy)) {
    return true; // Mountains block movement
  }
  
  // Check building collisions
  for (const b of game.buildings) {
    // Skip HQ, paths, houses, and farms as they don't block movement
    // Skip doors that are open
    if (b.kind === 'hq' || b.kind === 'path' || b.kind === 'house' || b.kind === 'farm' || b.kind === 'bed' || !b.done) continue;
    if (b.kind === 'door' && !isDoorBlocking(b)) continue;
    
    // Check circle-rectangle collision
    const closestX = Math.max(b.x, Math.min(x, b.x + b.w));
    const closestY = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - closestX;
    const dy = y - closestY;
    
    if (dx * dx + dy * dy <= radius * radius) {
      return true;
    }
  }
  return false;
}

// Safe movement function that checks for collisions
function getSpeedMultiplier(game: any, x: number, y: number): number {
  // Check if colonist is on a path tile
  const tileSize = T;
  const gx = Math.floor(x / tileSize) * tileSize;
  const gy = Math.floor(y / tileSize) * tileSize;
  
  const path = game.buildings.find((b: any) => 
    b.kind === 'path' && b.done && b.x === gx && b.y === gy
  );
  
  if (path && (path as any).speedBonus) {
    return (path as any).speedBonus;
  }
  
  return 1.0; // default speed
}

function moveTowardsSafely(game: any, c: Colonist, targetX: number, targetY: number, dt: number, speedMultiplier: number = 1): boolean {
  // Check for doors that need to be opened
  const blockingDoor = findBlockingDoor(game, c);
  if (blockingDoor) {
    // Request door to open and wait
    requestDoorOpen(blockingDoor, c, 'colonist');
    c.waitingForDoor = blockingDoor;
    c.doorWaitStart = c.t;
    return false; // Don't move yet
  }
  
  const dx = targetX - c.x;
  const dy = targetY - c.y;
  const distance = Math.hypot(dx, dy);
  
  if (distance < 5) return true; // Close enough
  
  const pathSpeedBonus = getSpeedMultiplier(game, c.x, c.y);
  
  // Apply stagger effect if colonist is staggered (speed reduced to 1/6th)
  const staggerMultiplier = (c.staggeredUntil && c.staggeredUntil > (c.t || 0)) ? (1 / 6) : 1;
  
  const speed = c.speed * speedMultiplier * pathSpeedBonus * staggerMultiplier;
  const moveDistance = speed * dt;
  const normalizedDx = dx / distance;
  const normalizedDy = dy / distance;
  
  // Update direction for sprite facing (only if actually moving)
  if (distance > 1) {
    c.direction = Math.atan2(dy, dx);
  }
  
  const newX = c.x + normalizedDx * moveDistance;
  const newY = c.y + normalizedDy * moveDistance;
  
  // Check if new position would collide with buildings
  if (!wouldCollideWithBuildings(game, newX, newY, c.r)) {
    c.x = Math.max(0, Math.min(newX, WORLD.w));
    c.y = Math.max(0, Math.min(newY, WORLD.h));
    return false;
  } else {
    // Try to slide along the wall by testing perpendicular directions
    const perpDx = -normalizedDy;
    const perpDy = normalizedDx;
    
    // Try sliding right
    const slideRightX = c.x + perpDx * moveDistance * 0.5;
    const slideRightY = c.y + perpDy * moveDistance * 0.5;
    if (!wouldCollideWithBuildings(game, slideRightX, slideRightY, c.r)) {
      // Update direction for sliding movement
      c.direction = Math.atan2(perpDy, perpDx);
      c.x = Math.max(0, Math.min(slideRightX, WORLD.w));
      c.y = Math.max(0, Math.min(slideRightY, WORLD.h));
      return false;
    }
    
    // Try sliding left
    const slideLeftX = c.x - perpDx * moveDistance * 0.5;
    const slideLeftY = c.y - perpDy * moveDistance * 0.5;
    if (!wouldCollideWithBuildings(game, slideLeftX, slideLeftY, c.r)) {
      // Update direction for sliding movement
      c.direction = Math.atan2(-perpDy, -perpDx);
      c.x = Math.max(0, Math.min(slideLeftX, WORLD.w));
      c.y = Math.max(0, Math.min(slideLeftY, WORLD.h));
      return false;
    }
    
    // Can't move, stuck against wall
    return false;
  }
}

// Universal stuck detection and rescue system
function checkAndRescueStuckColonist(game: any, c: Colonist): boolean {
  // Initialize stuck timer and position tracking if they don't exist
  if (c.stuckTimer === undefined) {
    c.stuckTimer = 0;
  }
  if (!(c as any).lastPos) {
    (c as any).lastPos = { x: c.x, y: c.y };
  }
  if (!(c as any).lastMoveCheck) {
    (c as any).lastMoveCheck = 0;
  }

  // Check if colonist is currently inside a building collision area
  const isBuildingStuck = wouldCollideWithBuildings(game, c.x, c.y, c.r);
  
  // Check if colonist is not making progress (movement-based stuck detection)
  (c as any).lastMoveCheck += 1/60;
  let isMovementStuck = false;
  
  if ((c as any).lastMoveCheck > 1.0) { // Check every second
    const moveDistance = Math.hypot(c.x - (c as any).lastPos.x, c.y - (c as any).lastPos.y);
    if (moveDistance < 5 && (c.state === 'chop' || c.state === 'mine' || c.state === 'build' || c.state === 'harvest')) {
      isMovementStuck = true;
    }
    (c as any).lastPos = { x: c.x, y: c.y };
    (c as any).lastMoveCheck = 0;
  }
  
  const isStuck = isBuildingStuck || isMovementStuck;
  
  if (isStuck) {
    c.stuckTimer += 1/60; // Assume 60 FPS
    
    // If stuck for more than 3 seconds, attempt rescue (increased from 2s)
    if (c.stuckTimer > 3.0) {
      const angles = [0, Math.PI/2, Math.PI, 3*Math.PI/2, Math.PI/4, 3*Math.PI/4, 5*Math.PI/4, 7*Math.PI/4];
      let rescued = false;
      
      // Try progressively larger distances
      for (const distance of [20, 40, 60, 80]) {
        for (const angle of angles) {
          const rescueX = c.x + Math.cos(angle) * distance;
          const rescueY = c.y + Math.sin(angle) * distance;
          
          // Ensure rescue position is within world bounds
          const clampedX = Math.max(c.r, Math.min(rescueX, WORLD.w - c.r));
          const clampedY = Math.max(c.r, Math.min(rescueY, WORLD.h - c.r));
          
          if (!wouldCollideWithBuildings(game, clampedX, clampedY, c.r)) {
            c.x = clampedX;
            c.y = clampedY;
            c.stuckTimer = 0;
            rescued = true;
            console.log(`Rescued stuck colonist at (${c.x.toFixed(1)}, ${c.y.toFixed(1)}) using distance ${distance}`);
            break;
          }
        }
        if (rescued) break;
      }
      
      // Emergency fallback: teleport to HQ area
      if (!rescued) {
        const hq = game.buildings.find((b: any) => b.kind === 'hq');
        if (hq) {
          c.x = hq.x + hq.w/2 + (Math.random() - 0.5) * 40;
          c.y = hq.y - 40 + (Math.random() - 0.5) * 20;
          c.stuckTimer = 0;
          console.log('Emergency rescue: teleported stuck colonist to HQ area');
        }
      }
      
      return true; // Colonist was rescued
    }
  } else {
    // Not stuck, reset timer
    c.stuckTimer = 0;
  }
  
  return false; // No rescue needed
}

// Finite State Machine update for a single colonist
export function updateColonistFSM(game: any, c: Colonist, dt: number) {
  // Initialize health system if not present (for existing colonists)
  if (!c.health) {
    initializeColonistHealth(c);
  }
  
  // Clear expired player commands
  if (c.playerCommand?.issued && c.playerCommand.expires && (c.t || 0) >= c.playerCommand.expires) {
    c.playerCommand = undefined;
  }
  
  // Update health system (heal injuries, update stats)
  if (c.health) {
  // Progress bleeding/infections on cadence
  updateHealthProgression(c, dt);
  healInjuries(c, dt);
  updateHealthStats(c.health);
    
    // Sync legacy HP with new health system
    const overallHealth = calculateOverallHealth(c.health);
    c.hp = overallHealth;
    c.hp = overallHealth;

    // Auto medical seeking trigger (basic): if bleeding significantly or severe injury
    if (c.alive && (c.health.injuries.some(i => (i.bleeding > 0.25 && !i.bandaged) || i.severity > 0.7 || i.infected))) {
      // Mark for medical only if not already being treated
      if (!['doctoring','beingTreated','resting','sleep'].includes(c.state || '')) {
        (c as any).needsMedical = true;
      }
    } else {
      (c as any).needsMedical = false;
    }

    // DOWNED STATE HANDLING -------------------------------------------------
    if (c.alive) {
      const shouldDown = (c.health.consciousness < 0.25) || (c.health.bloodLevel < 0.25) || c.health.injuries.some(i=>i.severity>0.85);
      if (shouldDown && c.state !== 'downed') {
        c.prevState = c.state;
        c.state = 'downed';
        c.task = null; c.target = null;
        if ((game as any).msg) (game as any).msg(`${c.profile?.name || 'Colonist'} is downed`, 'warn');
      } else if (!shouldDown && c.state === 'downed') {
        // Recover if consciousness & blood recovered
        if ((game as any).msg) (game as any).msg(`${c.profile?.name || 'Colonist'} has recovered from downed state`, 'good');
        c.state = 'seekTask';
      }
    }
    
    // Apply pain-based penalties to colonist performance
    const painPenalty = c.health.totalPain;
    const consciousnessPenalty = 1.0 - c.health.consciousness;
    
    // Movement speed penalty from pain and leg injuries
    const baseFatigueSlow = (c.fatigue || 0) > 66 ? 0.8 : (c.fatigue || 0) > 33 ? 0.9 : 1.0;
    (c as any).fatigueSlow = baseFatigueSlow * c.health.mobility * (1.0 - painPenalty * 0.3);
    
    // Store health multipliers for work speed calculations
    (c as any).manipulationMultiplier = c.health.manipulation * (1.0 - painPenalty * 0.2);
    (c as any).consciousnessMultiplier = c.health.consciousness;
  } else {
    // Fallback for colonists without health system
    (c as any).fatigueSlow = (c.fatigue || 0) > 66 ? 0.8 : (c.fatigue || 0) > 33 ? 0.9 : 1.0;
    (c as any).manipulationMultiplier = 1.0;
    (c as any).consciousnessMultiplier = 1.0;
  }
  if (!c.alive) return; c.t += dt;
  // If downed, skip most FSM logic besides passive timers
  if (c.state === 'downed') {
    // Minimal decay or future rescue logic could go here
    return;
  }
  if (!c.state) changeState('seekTask', 'initial state');
  c.stateSince = (c.stateSince || 0) + dt;
  
  // Universal stuck detection and rescue system (runs every frame)
  if (checkAndRescueStuckColonist(game, c)) {
    // If colonist was rescued, clear their current task and let them reassess
    c.task = null;
    c.target = null;
    c.taskData = null;
    c.commandIntent = null;
    c.commandData = null;
    c.guardAnchor = null;
    game.clearPath && game.clearPath(c);
    changeState('seekTask', 'rescued from stuck');
    return; // Skip rest of FSM this frame to let colonist reorient
  }
  
  // Needs progression
  // Hunger increases faster when working; slower when resting (rebalanced for realistic meal frequency)
  const working = c.state === 'build' || c.state === 'chop' || c.state === 'mine' || c.state === 'harvest' || c.state === 'flee' || c.state === 'move';
  
  // Apply personality stats to hunger and fatigue rates
  const hungerMultiplier = c.profile?.stats.hungerRate || 1.0;
  const fatigueMultiplier = c.profile?.stats.fatigueRate || 1.0;
  
  // Skip hunger/fatigue if godmode is enabled
  if (!(c as any).godmode) {
    const hungerRate = (working ? 0.25 : c.inside ? 0.1 : 0.15) * hungerMultiplier; // Apply personality modifier
    c.hunger = Math.max(0, Math.min(100, (c.hunger || 0) + dt * hungerRate));
    
    // Fatigue rises when active, falls when inside/resting (adjusted for balanced gameplay)
    const fatigueRise = (working ? 0.8 : 0.3) * fatigueMultiplier; // Apply personality modifier
    // Only reduce fatigue when actually inside a building or in the resting state, NOT when just seeking sleep
    if (c.inside || c.state === 'resting') c.fatigue = Math.max(0, (c.fatigue || 0) - dt * 8); // Slightly slower recovery too
    else c.fatigue = Math.min(100, (c.fatigue || 0) + dt * fatigueRise);
  } else {
    // Godmode: keep hunger and fatigue at 0
    c.hunger = 0;
    c.fatigue = 0;
  }
  
  // Starvation damage if very hungry (reduced from 4 to 2 damage per second)
  if ((c.hunger || 0) >= 95) { 
    const damage = 2 * dt;
    c.hp = Math.max(0, c.hp - damage); 
    // Debug logging for starvation
    if (Math.random() < 0.05) { // Log occasionally to avoid spam
      console.log(`Colonist starving: hunger=${(c.hunger || 0).toFixed(1)}, hp=${c.hp.toFixed(1)}, damage=${damage.toFixed(2)}/frame`);
    }
  }
  // Passive very-slow heal if not hungry and not working
  if ((c.hunger || 0) < 30 && !working && !c.inside) { c.hp = Math.min(100, c.hp + 0.8 * dt); }
  // Infirmary healing aura
  const inf = (game.buildings as Building[]).find(b => b.kind === 'infirmary' && b.done);
  if (inf) {
    const range = (inf as any).healRange || 140; const rate = (inf as any).healRate || 3;
    const d2 = (c.x - (inf.x + inf.w/2)) ** 2 + (c.y - (inf.y + inf.h/2)) ** 2;
    if (d2 <= range * range) { c.hp = Math.min(100, c.hp + rate * dt); }
  }

  // Danger detection using CombatManager with intelligent threat assessment and hysteresis
  // Combat manager uses:
  // - Enter flee at threat level > 50 (based on distance, HP, weapon range)
  // - Exit flee at threat level < 30 (hysteresis prevents flipping)
  // - Considers multiple threats, line of sight, and colonist health
  const dangerState = game.combatManager.getDangerState(c);
  const danger = dangerState.inDanger ? dangerState.threat : null;
  
  // Backward compatibility: store danger info for legacy code
  if (danger) {
    (c as any).lastDanger = danger;
  } else if (!dangerState.inDanger) {
    (c as any).lastDanger = null;
  }
  
  c.lastHp = c.lastHp ?? c.hp;
  if (c.hp < c.lastHp) { c.hurt = 1.5; }
  c.lastHp = c.hp; c.hurt = Math.max(0, (c.hurt || 0) - dt);

  // Helper function to cleanly change state and clear conflicting task data
  function changeState(newState: ColonistState, reason?: string) {
    // Critical states bypass locks
    const isCritical = (s: ColonistState) => (s === 'flee' || s === 'heal' || (s === 'sleep' && game.isNight()));
    // Soft-lock: block low-priority flips while the timer runs
    if (!isCritical(newState) && c.softLockUntil != null && c.t < (c.softLockUntil || 0)) {
      return; // ignore low-priority flip
    }
    if (c.state !== newState) {
      // Stop any looping construction audio when leaving build state
      if (c.state === 'build' && newState !== 'build') {
        if (c.activeConstructionAudio && (game as any).audioManager) {
          (game as any).audioManager.stop(c.activeConstructionAudio);
        }
        c.lastConstructionAudioTime = undefined;
        c.activeConstructionAudio = undefined;
      }
      
      const leavingSleepPipeline = (c.state === 'sleep' || c.state === 'goToSleep') && newState !== 'sleep' && newState !== 'goToSleep';
      if (leavingSleepPipeline) {
        game.releaseSleepReservation && game.releaseSleepReservation(c);
        (c as any).sleepTarget = undefined;
        (c as any).sleepTargetLockUntil = 0;
      }
      // Clear work task/target when changing to non-work states to prevent navigation conflicts
      if (newState === 'sleep' || newState === 'flee' || newState === 'heal' || newState === 'goToSleep' || 
          newState === 'eat' || newState === 'resting' || newState === 'beingTreated' || 
          newState === 'doctoring') {
        const oldTask = c.task;
        if (oldTask && (oldTask === 'chop' || oldTask === 'mine' || oldTask === 'build' || oldTask === 'harvestFarm' || oldTask === 'harvestWell')) {
          // Release any reservations for work tasks
          if (c.task === 'build' && c.target) {
            game.releaseBuildReservation && game.releaseBuildReservation(c);
          }
          if (c.target && game.assignedTargets && game.assignedTargets.has(c.target)) {
            game.assignedTargets.delete(c.target);
          }
          c.task = null;
          c.target = null;
          // Clear path to prevent navigation conflicts
          game.clearPath && game.clearPath(c);
          
          if (reason && Math.random() < 0.2) {
            console.log(`Cleared work task (${oldTask}) when changing to ${newState}: ${reason}`);
          }
        }
      }
      // Track previous state and reason for debugging
      const prev = c.state;
      (c as any).prevState = prev;
      c.state = newState;
      c.stateSince = 0;
      (c as any).lastStateChangeReason = reason || '';
      
      // Apply a short soft-lock to reduce thrashing for some states
      if (newState === 'eat') c.softLockUntil = c.t + 1.5;
      else if (newState === 'goToSleep') c.softLockUntil = c.t + 2.0;
      else if (newState === 'sleep') c.softLockUntil = c.t + 2.0;
      else if (newState === 'resting') c.softLockUntil = c.t + 1.0;
      else c.softLockUntil = undefined;
      if (reason && Math.random() < 0.1) {
        console.log(`Colonist state change: ${prev} → ${newState} (${reason})`);
      }
    }
  }

  // Intent system - handle interruptions and player control
  // Functions imported at top of file
  
  // Check for drafting interruption - highest priority
  if (c.isDrafted && c.state !== 'drafted') {
    if (canInterruptColonist(c)) {
      forceInterruptIntent(c, 'drafted by player');
      changeState('drafted', 'player drafted colonist');
      return; // Exit early to prevent state conflicts
    }
  }

  // Add minimum state duration to prevent rapid switching (except for critical states and work states)
  const minStateDuration = 1.0; // 1 second minimum for most states
  // Work states CAN change immediately, but only for critical intents (flee/heal/medical)
  // For seekTask transitions, work states should respect minimum duration to prevent rapid task cycling
  const isWorkState = c.state === 'chop' || c.state === 'mine' || c.state === 'build' || c.state === 'harvest';
  const canChangeState = c.stateSince > minStateDuration || 
                        c.state === 'idle' || 
                        c.state === 'seekTask' ||
                        danger; // Always allow immediate flee from danger

  // Energy-based fatigue system with hysteresis
  // Colonists start preferring sleep at 60% fatigue, strongly prefer it at 80%+
  // Exit sleep when fatigue <= 20 (40-point gap prevents oscillation)
  const fatigueEnterThreshold = 60; // Lowered so colonists prefer sleep earlier
  const fatigueExitThreshold = 20;
  
  // Check if player has issued a command that should override automatic behavior
  const hasActivePlayerCommand = c.playerCommand?.issued && 
                                   c.playerCommand.expires && 
                                   (c.t || 0) < c.playerCommand.expires;

  // Priority-based intent evaluation
  function evaluateIntent(): { state: ColonistState; prio: number; reason: string } | null {
    let best: { state: ColonistState; prio: number; reason: string } | null = null;
    const set = (state: ColonistState, prio: number, reason: string) => {
      if (!best || prio > best.prio) best = { state, prio, reason };
    };
    // Highest first
    
    // Drafted state - player has direct control, override almost everything
    if (c.isDrafted && !c.inside) {
      set('drafted', 99, 'drafted by player');
      return best; // Return immediately - drafted overrides all other considerations
    }
    
    if (!c.inside && danger) set('flee', 100, 'danger detected');
    
    // Medical work - ALL colonists can treat injuries (RimWorld style)
    // Use the new work giver system to scan for medical work
    if (!c.inside && !danger && c.health && c.health.totalPain < 0.6) {
      const medicalJob = medicalWorkGiver.scanForMedicalWork(c, game.colonists, c.t, game.buildings);
      if (medicalJob && !medicalJob.reservedBy) {
        // Reserve the job and assign it to this doctor
        if (medicalWorkGiver.reserveJob(medicalJob, c)) {
          (c as any).medicalJob = medicalJob;
          
          // Different states for different job types
          if (medicalJob.type === 'surgery') {
            set('performingSurgery', 97, 'surgery work available');
          } else if (medicalJob.type === 'feedPatient') {
            set('feedingPatient', 96, 'bed-bound patient needs feeding');
          } else {
            set('doctoring', 95, 'medical work available');
          }
        }
      }
    }
    
    // Patient awaiting surgery - check if THIS colonist has queued operations
    if (!c.inside && c.health && c.health.queuedOperations && c.health.queuedOperations.length > 0) {
      // High priority - patient needs to get to medical bed
      set('awaitingSurgery', 98, 'queued for surgery');
    }
    
    // Medical needs - check if THIS colonist needs treatment
    // Patients should stay still or go to bed when injured
    if (!c.inside && c.health && (c as any).needsMedical) {
      const urgency = c.health.bloodLevel < 0.4 ? 98 : 
                     c.health.injuries.some((i: any) => i.bleeding > 0.4) ? 95 : 90;
      set('beingTreated', urgency, 'needs medical treatment');
    }
    
    if (!c.inside && !danger && (c.hp || 0) < 35) set('heal', 85 - Math.max(0, c.hp) * 0.1, 'low health');
    
    // Sleep is now purely intent-based - colonists choose beds via spatial interactions
    // No more automatic fatigue-based forcing - full player and colonist agency
    
    if (!c.inside && (c.hunger || 0) > 75 && (game.RES.food || 0) > 0)
      set('eat', 60 + Math.min(25, (c.hunger || 0) - 75), 'hunger');
    // Default: keep working/seek tasks
    set('seekTask', 10, 'default');
    return best;
  }

  // Colonists now control their own bed entry/exit via spatial interactions
  // No more automatic forcing into resting when inside buildings
  {
    const statePriority = (s: ColonistState | undefined): number => {
      switch (s) {
        case 'flee': return 100;
        case 'drafted': return 99; // Player control - overrides almost everything
        case 'waitingAtDoor': return 98; // High priority - must wait
        case 'awaitingSurgery': return 98; // Patient needs to get to surgery
        case 'performingSurgery': return 97; // Doctor performing surgery
        case 'recoveringFromSurgery': return 96; // Patient recovering in bed
        case 'feedingPatient': return 96; // Doctor feeding bed-bound patient
        case 'beingTreated': return 96; // Very high priority - patient needs care
        case 'doctoring': return 95; // High priority for active medical work
        case 'guard': return 94; // Hold position command from player
        case 'heal': return 90;
        case 'sleep': return 80; // Sleep in progress (already in bed)
        case 'goToSleep': return 55; // Base priority at 60% fatigue, scales to 95+ at 100% fatigue with night bonus
        case 'eat': return 65;
        case 'cooking': return 42; // Cooking is productive work
        case 'stonecutting': return 42; // Stonecutting is productive work
        case 'smelting': return 42; // Smelting is productive work
        case 'smithing': return 43; // Smithing weapons is high priority productive work
        case 'cooling': return 42; // Cooling is productive work
        case 'equipment': return 45; // Equipment upgrades are high priority for combat readiness
        case 'research': return 41; // Research is productive work
        case 'haulFloorItem': return 40; // Hauling items via floor system
        case 'build':
        case 'chop':
        case 'mine':
        case 'harvest':
        case 'plantTree':
        case 'harvestPlantedTree': return 40;
        case 'resting': return 35;
        case 'move': return 25;
        case 'idle': return 15;
        case 'seekTask': return 10;
        default: return 0;
      }
    };
    
    // Check if colonist needs to wait for a door
    if (c.state !== 'waitingAtDoor' && c.waitingForDoor) {
      changeState('waitingAtDoor', 'encountered closed door');
    }
    
    const commandActive = c.commandIntent != null;
    const intent = evaluateIntent();
    if (intent && intent.state !== c.state) {
      const critical = intent.state === 'flee' || intent.state === 'heal' || 
                      intent.state === 'beingTreated' || intent.state === 'doctoring' ||
                      intent.state === 'drafted' || // Drafted state is critical - immediate control
                      (intent.state === 'sleep' && game.isNight());
      const curPrio = statePriority(c.state as ColonistState);
      const shouldSwitch = critical || (!commandActive && intent.prio > curPrio && canChangeState);
      if (shouldSwitch) changeState(intent.state, intent.reason);
    }
  }

  switch (c.state) {
    case 'resting': {
      c.hideTimer = Math.max(0, (c.hideTimer || 0) - dt);
      if (c.inside && c.inside.kind === 'bed') {
        const bed = c.inside;
        const centerX = bed.x + bed.w / 2;
        const centerY = bed.y + bed.h / 2;
        c.x = centerX;
        c.y = centerY;
        if ((c as any).sleepFacing != null) {
          c.direction = (c as any).sleepFacing;
        }
      }
      // Rest recovers fatigue quickly and heals slowly
      c.hp = Math.min(100, c.hp + 1.2 * dt);
      
      // Colonists now stay in bed until they actively choose to leave via spatial interaction
      // No more automatic exit based on fatigue - full player and colonist control
      break;
    }
    case 'heal': {
      // Find nearest infirmary
      const infirmaries = (game.buildings as Building[]).filter(b => b.kind === 'infirmary' && b.done);
  if (!infirmaries.length) { changeState('seekTask', 'no infirmary'); break; }
      let best = infirmaries[0]; let bestD = dist2(c as any, game.centerOf(best) as any);
      for (let i = 1; i < infirmaries.length; i++) { const d = dist2(c as any, game.centerOf(infirmaries[i]) as any); if (d < bestD) { bestD = d; best = infirmaries[i]; } }
      const ic = game.centerOf(best);
      const range = (best as any).healRange || 140;
      const nearRect = (c.x >= best.x - 8 && c.x <= best.x + best.w + 8 && c.y >= best.y - 8 && c.y <= best.y + best.h + 8);
      const dist = Math.hypot(c.x - ic.x, c.y - ic.y);
      // If close enough, try to enter (uses building capacity via popCap); else stand in heal radius
      if (nearRect && game.tryEnterBuilding(c as any, best as any)) {
        changeState('resting', 'entered infirmary'); break;
      }
      if (dist <= range * 0.9) {
        // Wait and heal in aura; leave when healthy enough
        if (c.hp >= 80) { changeState('seekTask', 'healed enough'); }
      } else {
        // Move toward infirmary center using pathfinding
        game.moveAlongPath(c, dt, ic, range * 0.9);
      }
      break;
    }
    case 'doctoring': {
      // RimWorld-style medical work - doctor treating a patient
      const job: MedicalJob | undefined = (c as any).medicalJob;
      
      if (!job) {
        // No job assigned - this shouldn't happen, but recover gracefully
        changeState('seekTask', 'no medical job assigned');
        break;
      }

      // Validate job and patient still exist and need treatment
      const patient = job.patient;
      if (!patient || !patient.alive || !patient.health || !patient.health.injuries.length) {
        // Patient healed, died, or no longer needs treatment
        medicalWorkGiver.releaseJob(job, c);
        (c as any).medicalJob = null;
        changeState('seekTask', 'patient no longer needs treatment');
        break;
      }

      // Move to patient
      const distance = Math.hypot(c.x - patient.x, c.y - patient.y);
      const treatmentRange = 40;
      
      if (distance > treatmentRange) {
        // Move closer to patient
        game.moveAlongPath(c, dt, { x: patient.x, y: patient.y }, treatmentRange);
      } else {
        // Close enough to perform treatment
        const treatmentTime = (job.treatment?.duration || 30) / 1000; // Convert ms to seconds
        
        if (c.stateSince >= treatmentTime) {
          // Perform the treatment
          if (!job.treatment || !job.targetInjury) {
            if (game.msg) game.msg(`${c.profile?.name || 'Doctor'} could not perform treatment - invalid job`, 'bad');
            medicalWorkGiver.completeJob(job.id);
            (c as any).medicalJob = null;
            changeState('seekTask', 'invalid medical job');
            return;
          }
          
          const success = medicalSystem.performTreatment(c, patient, job.treatment, job.targetInjury);
          const treatmentName = job.treatment.name;
          
          if (success) {
            if (game.msg) game.msg(`${c.profile?.name || 'Doctor'} successfully applied ${treatmentName} to ${patient.profile?.name || 'patient'}`, 'good');
          } else {
            if (game.msg) game.msg(`${c.profile?.name || 'Doctor'} failed to apply ${treatmentName} to ${patient.profile?.name || 'patient'}`, 'warn');
          }
          
          // Complete the job
          medicalWorkGiver.completeJob(job.id);
          (c as any).medicalJob = null;
          changeState('seekTask', 'treatment completed');
        }
        // else: still performing treatment, wait for timer
      }
      break;
    }
    
    case 'beingTreated': {
      // Patient state - colonist needs medical treatment
      // Find a bed to rest in, or stay still if being actively treated
      
      const isBeingTreated = (c as any).isBeingTreated;
      const doctorId = (c as any).doctorId;
      
      if (isBeingTreated && doctorId) {
        // Being actively treated by a doctor - stay still
        // Find the doctor
        const doctor = game.colonists.find((col: Colonist) => (col as any).id === doctorId);
        if (doctor) {
          // Face the doctor
          const dx = doctor.x - c.x;
          const dy = doctor.y - c.y;
          if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
            c.direction = Math.atan2(dy, dx);
          }
        }
        // Do nothing - just wait for doctor
        break;
      }
      
      // Not being treated - try to find a bed
      const needsMedicalBed = c.health && (c.health.injuries.some((i: any) => i.severity > 0.6) || c.health.bloodLevel < 0.5);
      const beds = (game.buildings as Building[]).filter((b: Building) => 
        (b.kind === 'bed' || b.kind === 'house') && 
        b.done && 
        (!needsMedicalBed || (b.kind === 'bed' && b.isMedicalBed)) &&
        game.buildingHasSpace && game.buildingHasSpace(b, c)
      );
      
      if (beds.length > 0) {
        // Find closest bed
        let closest = beds[0];
        let minDist = dist2(c as any, game.centerOf(closest) as any);
        for (const bed of beds.slice(1)) {
          const d = dist2(c as any, game.centerOf(bed) as any);
          if (d < minDist) {
            minDist = d;
            closest = bed;
          }
        }
        
        const bedCenter = game.centerOf(closest);
        const distToBed = Math.hypot(c.x - bedCenter.x, c.y - bedCenter.y);
        
        if (distToBed <= 20) {
          // Try to enter bed
          if (game.tryEnterBuilding && game.tryEnterBuilding(c, closest)) {
            changeState('resting', 'entered medical bed');
          }
        } else {
          // Move to bed
          game.moveAlongPath && game.moveAlongPath(c, dt, bedCenter, 20);
        }
      } else {
        // No beds available - stay still and wait
        // Heal slowly while waiting
        if (c.health) {
          c.hp = Math.min(100, c.hp + 0.3 * dt);
        }
        
        // If injuries are minor now, can go back to work
        if (c.health && !(c as any).needsMedical) {
          changeState('seekTask', 'minor injuries, resuming work');
        }
      }
      
      // Timeout - if stuck too long, give up and seek task
      if (c.stateSince > 30) {
        changeState('seekTask', 'medical bed search timeout');
      }
      break;
    }
    
    case 'awaitingSurgery': {
      // Patient state - colonist has queued surgery and needs to get to medical bed
      if (!c.health || !c.health.queuedOperations || c.health.queuedOperations.length === 0) {
        // No surgery queued anymore
        changeState('seekTask', 'surgery queue empty');
        break;
      }

      // Find medical bed
      const medicalBeds = (game.buildings as Building[]).filter((b: Building) => 
        b.kind === 'bed' && 
        b.done && 
        b.isMedicalBed &&
        (!b.occupiedBy || b.occupiedBy === (c as any).id) // Either free or occupied by this colonist
      );

      if (!medicalBeds.length) {
        // No medical beds available - wait in place
        if (c.stateSince > 60) {
          // Timeout after 60 seconds
          if (game.msg) game.msg(`${c.profile?.name || 'Colonist'} cannot find medical bed for surgery`, 'warn');
          changeState('seekTask', 'no medical bed available');
        }
        break;
      }

      // Find closest medical bed
      let closestBed = medicalBeds[0];
      let minDist = dist2(c as any, game.centerOf(closestBed) as any);
      for (const bed of medicalBeds.slice(1)) {
        const d = dist2(c as any, game.centerOf(bed) as any);
        if (d < minDist) {
          minDist = d;
          closestBed = bed;
        }
      }

      // Reserve the bed
      if (!closestBed.occupiedBy) {
        closestBed.occupiedBy = (c as any).id;
      }

      const bedCenter = game.centerOf(closestBed);
      const distToBed = Math.hypot(c.x - bedCenter.x, c.y - bedCenter.y);

      if (distToBed <= 20) {
        // At bed - lie down and wait for doctor
        c.x = bedCenter.x;
        c.y = bedCenter.y;
        (c as any).assignedMedicalBed = closestBed;
        // Stay in this state - doctor will find us here
      } else {
        // Move to bed
        game.moveAlongPath && game.moveAlongPath(c, dt, bedCenter, 20);
      }
      break;
    }
    
    case 'performingSurgery': {
      // Doctor state - performing surgery on a patient
      const job: MedicalJob | undefined = (c as any).medicalJob;
      
      if (!job || job.type !== 'surgery') {
        // No surgery job assigned
        changeState('seekTask', 'no surgery job assigned');
        break;
      }

      const patient = job.patient;
      const operation = job.operation;
      
      if (!patient || !patient.alive || !operation) {
        // Patient died or operation canceled
        medicalWorkGiver.releaseJob(job, c);
        (c as any).medicalJob = null;
        if (job.targetBed) {
          job.targetBed.occupiedBy = undefined;
        }
        changeState('seekTask', 'surgery invalid');
        break;
      }

      // Check if patient is at their bed
      const patientBed = (patient as any).assignedMedicalBed;
      if (!patientBed) {
        // Patient hasn't reached bed yet - wait
        if (c.stateSince > 120) {
          // Timeout after 2 minutes
          if (game.msg) game.msg(`Surgery canceled: ${patient.profile?.name || 'patient'} did not reach medical bed`, 'warn');
          medicalWorkGiver.releaseJob(job, c);
          (c as any).medicalJob = null;
          changeState('seekTask', 'patient no-show timeout');
        }
        break;
      }

      // Move to patient's bedside
      const bedCenter = game.centerOf(patientBed);
      const distance = Math.hypot(c.x - bedCenter.x, c.y - bedCenter.y);
      const workRange = 45; // Need to be close to perform surgery
      
      if (distance > workRange) {
        // Move closer to bedside
        game.moveAlongPath(c, dt, bedCenter, workRange);
      } else {
        // At bedside - perform surgery
        // Surgery duration based on operation complexity (30-120 seconds)
        const surgeryDuration = operation.type === 'amputate' ? 30 :
                               operation.type === 'install_prosthetic' ? 60 :
                               operation.type === 'install_implant' ? 90 :
                               operation.type === 'transplant_organ' ? 120 :
                               operation.type === 'harvest_organ' ? 90 :
                               45; // Default for other operations

        if (c.stateSince >= surgeryDuration) {
          // Surgery time complete - execute the operation
          const result = executeSurgery(game, patient, c, operation);
          
          if (result.success) {
            if (game.msg) game.msg(`${c.profile?.name || 'Doctor'} successfully performed ${operation.label} on ${patient.profile?.name || 'patient'}`, 'good');
            
            // Grant medical XP to doctor
            if (c.skills) {
              grantSkillXP(c, 'Medicine', 500, c.t); // Significant XP for surgery
            }
          } else {
            if (game.msg) game.msg(`${result.message}`, 'bad');
            
            // Still grant some XP for attempting
            if (c.skills) {
              grantSkillXP(c, 'Medicine', 100, c.t);
            }
          }

          // Remove operation from queue
          if (patient.health && patient.health.queuedOperations) {
            const opIndex = patient.health.queuedOperations.findIndex(op => op.id === operation.id);
            if (opIndex !== -1) {
              patient.health.queuedOperations.splice(opIndex, 1);
            }
          }

          // Put patient into recovery
          (patient as any).surgeryRecoveryUntil = c.t + (surgeryDuration * 2); // Recovery is 2x surgery time
          patient.state = 'recoveringFromSurgery';
          patient.stateSince = 0;

          // Complete the job
          medicalWorkGiver.completeJob(job.id);
          (c as any).medicalJob = null;
          
          changeState('seekTask', 'surgery completed');
        }
        // else: still performing surgery, continue waiting
      }
      break;
    }
    
    case 'recoveringFromSurgery': {
      // Patient state - recovering in bed after surgery
      const recoveryEnd = (c as any).surgeryRecoveryUntil || 0;
      
      if (c.t >= recoveryEnd) {
        // Recovery complete
        const assignedBed = (c as any).assignedMedicalBed;
        if (assignedBed) {
          assignedBed.occupiedBy = undefined;
          (c as any).assignedMedicalBed = null;
        }
        (c as any).surgeryRecoveryUntil = null;
        
        if (game.msg) game.msg(`${c.profile?.name || 'Colonist'} has recovered from surgery`, 'good');
        changeState('seekTask', 'surgery recovery complete');
        break;
      }

      // Stay in bed during recovery
      const assignedBed = (c as any).assignedMedicalBed;
      if (assignedBed) {
        const bedCenter = game.centerOf(assignedBed);
        c.x = bedCenter.x;
        c.y = bedCenter.y;
      }

      // Gradual health improvement during recovery
      if (c.health) {
        c.hp = Math.min(100, c.hp + 0.5 * dt);
      }
      break;
    }
    
    case 'feedingPatient': {
      // Doctor state - bringing food to bed-bound patient
      const job: MedicalJob | undefined = (c as any).medicalJob;
      
      if (!job || job.type !== 'feedPatient') {
        // No feeding job assigned
        changeState('seekTask', 'no feeding job assigned');
        break;
      }

      const patient = job.patient;
      const targetBed = job.targetBed;
      
      if (!patient || !patient.alive || !targetBed) {
        // Patient died or invalid job
        medicalWorkGiver.releaseJob(job, c);
        (c as any).medicalJob = null;
        changeState('seekTask', 'feeding job invalid');
        break;
      }

      // Check if patient is still hungry
      const patientHunger = patient.hunger || 0;
      if (patientHunger < 40) {
        // Patient no longer hungry
        medicalWorkGiver.completeJob(job.id);
        (c as any).medicalJob = null;
        if (game.msg) game.msg(`${patient.profile?.name || 'Patient'} is no longer hungry`, 'good');
        changeState('seekTask', 'patient no longer hungry');
        break;
      }

      // Check if doctor has food
      const doctorHasFood = job.hasFoodInInventory || (c as any).carryingFood;
      
      if (!doctorHasFood) {
        // Need to get food first
        const hasColonyFood = (game.RES.bread || 0) > 0 || (game.RES.food || 0) > 0;
        
        if (!hasColonyFood) {
          // No food available
          medicalWorkGiver.releaseJob(job, c);
          (c as any).medicalJob = null;
          if (game.msg) game.msg(`Cannot feed ${patient.profile?.name || 'patient'}: no food available`, 'warn');
          changeState('seekTask', 'no food for patient');
          break;
        }

        // Get food from storage (instant for now, could be expanded with pantry pathfinding)
        if (game.RES.bread && game.RES.bread > 0) {
          game.RES.bread -= 1;
          (c as any).carryingFood = 'bread';
        } else if (game.RES.food && game.RES.food > 0) {
          game.RES.food -= 1;
          (c as any).carryingFood = 'food';
        }
        
        // Update job to reflect doctor now has food
        job.hasFoodInInventory = true;
      }

      // Move to patient's bedside
      const bedCenter = game.centerOf(targetBed);
      const distance = Math.hypot(c.x - bedCenter.x, c.y - bedCenter.y);
      const feedRange = 50;
      
      if (distance > feedRange) {
        // Move closer to bedside
        game.moveAlongPath(c, dt, bedCenter, feedRange);
      } else {
        // At bedside - feed the patient
        const foodValue = (c as any).carryingFood === 'bread' ? 40 : 30;
        
        // Reduce patient's hunger
        patient.hunger = Math.max(0, (patient.hunger || 0) - foodValue);
        
        // Mark as fed
        (patient as any).lastFedTime = c.t;
        if (!(c as any).id) {
          (c as any).id = `colonist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        (patient as any).fedBy = (c as any).id;
        
        // Clear carrying food
        (c as any).carryingFood = null;
        
        if (game.msg) game.msg(`${c.profile?.name || 'Doctor'} fed ${patient.profile?.name || 'patient'} in bed`, 'good');
        
        // Complete the job
        medicalWorkGiver.completeJob(job.id);
        (c as any).medicalJob = null;
        
        changeState('seekTask', 'patient fed successfully');
      }
      break;
    }
    
  case 'eat': {
      // Prioritize eating bread from pantry first, then fall back to regular food
      const hasBread = (game.RES.bread || 0) > 0;
      const hasFood = (game.RES.food || 0) > 0;
      const canEat = hasBread || hasFood;
      
      // Debug: Log when colonist is in eat state (reduced frequency)
      if (Math.random() < 0.01) {
        console.log(`Colonist eating: bread=${game.RES.bread}, food=${game.RES.food}, hunger=${c.hunger}, stateSince=${c.stateSince.toFixed(1)}`);
      }
      
      if (!canEat) {
        // No food available; if night, try to sleep, else continue tasks
        // Add hunger damage over time when stuck in eat state without food
        if (c.stateSince > 1.0) {
          c.hp = Math.max(0, c.hp - 2.5 * dt); // Slow starvation damage
        }
        console.log(`NO FOOD AVAILABLE! Colonist will continue tasks or sleep.`);
        changeState(game.isNight() ? 'sleep' : 'seekTask', 'no food available');
        break;
      }

      // First try to eat from personal inventory if available (instant, immersive)
      if ((c.hunger || 0) > 40) {
        const ate = (game as any).tryConsumeInventoryFood ? (game as any).tryConsumeInventoryFood(c) : false;
        if (ate) {
          changeState('seekTask', 'ate from inventory');
          break;
        }
      }

      // Try to find pantry with bread first
      const pantries = game.buildings.filter((b: any) => 
        b.kind === 'pantry' && b.done && (b.breadStored || 0) > 0
      );
      
      // If no bread in pantries, look for regular food buildings
      const foodBuildings = pantries.length > 0 ? pantries : game.buildings.filter((b: any) => 
        (b.kind === 'hq' || b.kind === 'warehouse' || b.kind === 'stock') && 
        b.done
      );

      // Debug: Log available buildings (reduced frequency)
      if (Math.random() < 0.01) {
        console.log(`Food buildings found: ${foodBuildings.length}, pantries: ${pantries.length}, buildings: ${foodBuildings.map((b: any) => b.kind).join(', ')}`);
      }

      if (foodBuildings.length === 0 && canEat) {
        // No accessible food buildings, just eat on the spot if we've been waiting
        console.log(`No food buildings found! Available buildings: ${game.buildings.filter((b: any) => b.done).map((b: any) => b.kind).join(', ')}`);
        if (c.stateSince > 1.0) {
          // Prefer bread over regular food
          if (hasBread) {
            game.RES.bread = (game.RES.bread || 0) - 1;
            c.hunger = Math.max(0, (c.hunger || 0) - 80); // Bread is more filling
            c.hp = Math.min(100, c.hp + 5);
            changeState('seekTask', 'ate bread without building');
            console.log(`Colonist ate bread without building! Bread remaining: ${game.RES.bread}`);
          } else {
            game.RES.food -= 1;
            c.hunger = Math.max(0, (c.hunger || 0) - 60);
            c.hp = Math.min(100, c.hp + 2.5);
            changeState('seekTask', 'ate food without building');
            console.log(`Colonist ate food without building! Food remaining: ${game.RES.food}`);
          }
        }
        break;
      }

      // Find closest food building
      let closestBuilding = null;
      let closestDist = Infinity;
      for (const b of foodBuildings) {
        const center = game.centerOf(b);
        const dist = Math.hypot(c.x - center.x, c.y - center.y);
        if (dist < closestDist) {
          closestDist = dist;
          closestBuilding = b;
        }
      }

      if (closestBuilding) {
        const center = game.centerOf(closestBuilding);
        const reachDist = Math.max(closestBuilding.w, closestBuilding.h) / 2 + c.r + 15; // Increased from 10 to 15
        
        // Debug logging for eating issues (reduced frequency)
        if (Math.random() < 0.01) {
          console.log(`Eating: distance=${closestDist.toFixed(1)}, reachDist=${reachDist.toFixed(1)}, stateSince=${c.stateSince.toFixed(1)}`);
        }
        
        if (closestDist <= reachDist) {
          // Close enough to eat from colony storage
          if (c.stateSince > 0.6) {
            // Prefer bread from pantry over regular food
            const isPantry = closestBuilding.kind === 'pantry';
            if (isPantry && (game.RES.bread || 0) > 0) {
              console.log(`Colonist successfully ate bread from pantry`);
              game.RES.bread = (game.RES.bread || 0) - 1;
              closestBuilding.breadStored = Math.max(0, (closestBuilding.breadStored || 0) - 1);
              c.hunger = Math.max(0, (c.hunger || 0) - 80); // Bread is more filling
              c.hp = Math.min(100, c.hp + 5); // Bread restores more HP
            } else {
              console.log(`Colonist successfully ate food from storage`);
              game.RES.food = Math.max(0, game.RES.food - 1);
              c.hunger = Math.max(0, (c.hunger || 0) - 60);
              c.hp = Math.min(100, c.hp + 2.5);
            }
            changeState('seekTask', 'finished eating');
          }
        } else {
          // Move toward the food building using pathfinding
          game.moveAlongPath(c, dt, center, reachDist);
        }
      }
      break;
    }
    case 'flee': {
      // Use CombatManager for smart retreat
      const fleeDecision = game.combatManager.shouldFlee(c);
      
      if (!fleeDecision.flee) {
        // Hysteresis: safe enough to return to work
        changeState('seekTask', 'threat level acceptable');
        break;
      }
      
      // Determine best retreat destination
      let dest: { x: number; y: number } | null = null;
      let buildingDest: Building | null = null;
      
      if (fleeDecision.building) {
        // Combat manager found a safe building (turret range, defensive position)
        buildingDest = fleeDecision.building;
        dest = game.centerOf(buildingDest);
      } else if (fleeDecision.target) {
        // Combat manager found a safe position (no specific building)
        dest = fleeDecision.target;
      }
      
      // Fallback to basic flee logic if combat manager didn't provide destination
      if (!dest && danger) {
        const tgtTurret = game.findSafeTurret(c, danger);
        if (tgtTurret) {
          const range = (tgtTurret as any).range || 120;
          const tc = game.centerOf(tgtTurret);
          const house = (game.buildings as Building[]).find(b => 
            b.kind === 'house' && b.done && 
            game.buildingHasSpace(b, c) && 
            dist2(game.centerOf(b) as any, tc as any) < range * range
          );
          if (house) { buildingDest = house; dest = game.centerOf(house); }
        }
        if (!dest) {
          const hq = (game.buildings as Building[]).find((b: Building) => 
            b.kind === 'hq' && game.buildingHasSpace(b, c)
          );
          if (hq) { buildingDest = hq; dest = game.centerOf(hq); }
        }
        if (!dest && tgtTurret) dest = game.centerOf(tgtTurret);
      }
      
      if (dest) {
        const dx = dest.x - c.x;
        const dy = dest.y - c.y;
        const distance = Math.hypot(dx, dy);
        const nearRect = buildingDest ? 
          (c.x >= buildingDest.x - 8 && c.x <= buildingDest.x + buildingDest.w + 8 && 
           c.y >= buildingDest.y - 8 && c.y <= buildingDest.y + buildingDest.h + 8) : false;
        
        if (distance <= 20 || nearRect) {
          if (buildingDest && game.tryEnterBuilding(c, buildingDest)) {
            c.hideTimer = 3;
            changeState('resting', 'hid from danger');
          } else {
            // Retarget: find closest house with space, else HQ
            const choices = (game.buildings as Building[]).filter((b: Building) => 
              b.done && game.buildingHasSpace(b, c) && (b.kind === 'house' || b.kind === 'hq')
            );
            if (choices.length) {
              const next = choices.sort((a: Building, b: Building) => 
                dist2(c as any, game.centerOf(a) as any) - dist2(c as any, game.centerOf(b) as any)
              )[0];
              const nc = game.centerOf(next);
              buildingDest = next;
              dest = nc;
            }
          }
        } else {
          // Move toward the destination using pathfinding (faster when fleeing)
          game.moveAlongPath(c, dt, dest, 20);
        }
      } else if (danger) {
        // Move away from danger if it still exists
        const d = norm(sub(c as any, danger as any) as any);
        c.direction = Math.atan2(d.y, d.x);
        c.x += d.x * (c.speed + 90) * dt;
        c.y += d.y * (c.speed + 90) * dt;
      }
      
      break;
    }
    case 'sleep': {
      // Sleep is now purely intent-based via spatial interactions
      // Just rest in place if no bed is available
      changeState('resting', 'sleeping without bed');
      break;
    }
    case 'goToSleep': {
      // GoToSleep is now purely intent-based via spatial interactions
      // Just rest in place if no bed is available  
      changeState('resting', 'resting without bed');
      break;
    }
    case 'seekTask': {
      // Removed forced night sleep - colonists choose sleep naturally when tired
      
      // Always pick a new task when in seekTask state, unless we're executing a command
      if (!c.task || c.task === 'idle') {
        const oldTask = c.task;
        
        // Clear any stale carrying data from previous tasks
        if (oldTask !== 'cookWheat') {
          c.carryingWheat = 0;
        }
        if (oldTask !== 'haulFloorItem') {
          (c as any).carryingItem = null;
        }
        
        game.pickTask(c);
        if (oldTask !== c.task && Math.random() < 0.1) {
          console.log(`Colonist assigned task: ${c.task}, target:`, c.target);
        }
      }
      switch (c.task) {
        case 'build': changeState('build', 'assigned build task'); break;
        case 'harvestFarm': changeState('harvest', 'assigned farm task'); break;
        case 'harvestWell': changeState('harvest', 'assigned well task'); break;
        case 'chop': changeState('chop', 'assigned chop task'); break;
        case 'mine': changeState('mine', 'assigned mine task'); break;
        case 'haulFloorItem': changeState('haulFloorItem', 'assigned floor hauling task'); break;
        case 'cookWheat': changeState('cooking', 'assigned cooking task'); break;
        case 'stonecutting': changeState('stonecutting', 'assigned stonecutting task'); break;
        case 'smelting': changeState('smelting', 'assigned smelting task'); break;
        case 'smithing': changeState('smithing', 'assigned smithing task'); break;
        case 'cooling': changeState('cooling', 'assigned cooling task'); break;
        case 'equipment': changeState('equipment', 'assigned equipment pickup task'); break;
        case 'research': changeState('research', 'assigned research task'); break;
        case 'plantTree': changeState('plantTree', 'assigned tree planting task'); break;
        case 'harvestPlantedTree': changeState('harvestPlantedTree', 'assigned tree harvest task'); break;
        case 'beingTreated': changeState('beingTreated', 'assigned patient task'); break;
        case 'goto':
        case 'rest':
        case 'medical':
        case 'seekMedical':
        case 'guard': {
          if (!c.commandIntent) {
            c.commandIntent = c.task as any;
          }
          changeState('move', 'player command task');
          break;
        }
        case 'idle': default:
          // Keep moving toward a random idle target if we have one; else assign a new idle target
          if (!c.target) {
            c.target = { x: c.x + (Math.random() - 0.5) * 160, y: c.y + (Math.random() - 0.5) * 160 };
          }
          changeState('idle', 'no tasks available');
          break;
      }
      break;
    }
    case 'idle': {
      // Idle colonists can choose to interact with nearby objects like beds
      
      // Check for nearby spatial interactions when colonist is idle
      if (!c.target && c.stateSince > 1.0) {  // Wait 1 second before checking interactions
        const nearbyBuildings = (game.buildings as Building[]).filter(b => {
          if (!b.done || b.kind !== 'bed') return false;
          const distance = Math.hypot(c.x - (b.x + b.w/2), c.y - (b.y + b.h/2));
          return distance <= 40; // Check beds within 40 pixels
        });
        
        if (nearbyBuildings.length > 0) {
          // If colonist is tired and there's a bed nearby, consider using it
          if ((c.fatigue || 0) > 50 && !c.inside) {
            const bed = nearbyBuildings[0];
            const bedCenter = { x: bed.x + bed.w/2, y: bed.y + bed.h/2 };
            const distance = Math.hypot(c.x - bedCenter.x, c.y - bedCenter.y);
            
            if (distance <= 20) {
              // Close enough to interact - get in bed
              c.inside = bed;
              c.x = bedCenter.x;
              c.y = bedCenter.y;
              (c as any).sleepFacing = Math.PI / 2;
              
              // Update reservation system
              if (game.reservationManager) {
                game.reservationManager.insideCounts.set(bed, (game.reservationManager.insideCounts.get(bed) || 0) + 1);
              }
              
              changeState('resting', 'chose to use bed');
              break;
            } else {
              // Move toward bed
              c.target = bedCenter;
            }
          } else if (c.inside && (c.fatigue || 0) < 30) {
            // In bed but not tired - consider getting out
            const bed = c.inside;
            if (bed && bed.kind === 'bed') {
              // Get out of bed
              c.inside = null;
              c.x = bed.x + bed.w/2 + 20;
              c.y = bed.y + bed.h/2;
              (c as any).sleepFacing = undefined;
              
              // Update reservation system
              if (game.reservationManager) {
                const cur = (game.reservationManager.insideCounts.get(bed) || 1) - 1;
                if (cur <= 0) game.reservationManager.insideCounts.delete(bed);
                else game.reservationManager.insideCounts.set(bed, cur);
              }
              
              changeState('seekTask', 'got out of bed');
              break;
            }
          }
        }
      }
      
      const dst = c.target;
      if (!dst) {
        // Create a random idle target if none exists
        c.target = { x: c.x + (Math.random() - 0.5) * 160, y: c.y + (Math.random() - 0.5) * 160 };
        break;
      }
      
      if (game.moveAlongPath(c, dt, dst, 8)) {
        c.task = null;
        c.target = null;
        game.clearPath(c);
        changeState('seekTask', 'reached target');
      }
      break;
    }
    case 'move': {
      const intent = c.commandIntent;
      const target = c.target as any;
      if (!intent || !target) {
        if (intent !== 'guard') {
          c.task = null;
          c.target = null;
          c.taskData = null;
          c.commandData = null;
          c.guardAnchor = null;
        }
        if (intent !== 'guard') {
          c.commandIntent = null;
        }
        changeState('seekTask', 'move missing context');
        break;
      }

      const targetIsBuilding = typeof target.x === 'number' && typeof target.y === 'number' && target.w != null && target.h != null;
      const destination = targetIsBuilding
        ? { x: (target as Building).x + (target as Building).w / 2, y: (target as Building).y + (target as Building).h / 2 }
        : { x: target.x, y: target.y };
      const arriveRadius = intent === 'guard'
        ? 14
        : targetIsBuilding ? Math.max((target as Building).w, (target as Building).h) / 2 + c.r + 12 : 14;

      if (game.moveAlongPath(c, dt, destination, arriveRadius)) {
        const clearCommand = () => {
          c.task = null;
          c.target = null;
          c.taskData = null;
          c.commandIntent = null;
          c.commandData = null;
          c.guardAnchor = null;
          game.clearPath && game.clearPath(c);
        };

        switch (intent) {
          case 'goto': {
            let entered = false;
            if (targetIsBuilding && game.tryEnterBuilding) {
              if (!game.buildingHasSpace || game.buildingHasSpace(target, c)) {
                entered = game.tryEnterBuilding(c, target);
              }
            }
            if (entered) {
              clearCommand();
              changeState('resting', 'entered requested building');
            } else {
              clearCommand();
              changeState('seekTask', 'reached ordered location');
            }
            break;
          }
          case 'rest': {
            let entered = false;
            if (targetIsBuilding && game.tryEnterBuilding) {
              entered = game.tryEnterBuilding(c, target);
            }
            clearCommand();
            changeState('resting', entered ? 'resting in assigned shelter' : 'resting at ordered spot');
            break;
          }
          case 'medical':
          case 'seekMedical': {
            let entered = false;
            if (targetIsBuilding && game.tryEnterBuilding) {
              entered = game.tryEnterBuilding(c, target);
            }
            (c as any).needsMedical = true;
            clearCommand();
            changeState('beingTreated', entered ? 'entered medical facility' : 'awaiting treatment');
            break;
          }
          case 'guard': {
            c.guardAnchor = { x: destination.x, y: destination.y };
            c.commandIntent = 'guard';
            c.commandData = c.commandData ?? null;
            c.target = { x: destination.x, y: destination.y };
            c.taskData = null;
            game.clearPath && game.clearPath(c);
            changeState('guard', 'holding position');
            break;
          }
          default: {
            clearCommand();
            changeState('seekTask', 'unknown move intent');
            break;
          }
        }
      }
      break;
    }
    case 'build': {
      const b = c.target as Building; 
      if (!b || b.done) {
        // Only switch to seekTask if we've been in this state for at least a short duration
        // This prevents rapid task cycling when buildings complete instantly or targets become invalid
        if (c.stateSince >= 0.5) {
          game.releaseBuildReservation(c); 
          c.task = null; 
          c.target = null; 
          game.clearPath(c);
          // Stop any looping construction audio before clearing tracking
          if (c.activeConstructionAudio && (game as any).audioManager) {
            (game as any).audioManager.stop(c.activeConstructionAudio);
          }
          c.lastConstructionAudioTime = undefined;
          c.activeConstructionAudio = undefined;
          changeState('seekTask', 'building complete');
        }
        break; 
      }
      
      const pt = { x: b.x + b.w / 2, y: b.y + b.h / 2 };

      // Walls and other 1x1 structures block their own tile even while under construction.
      // When builders stand on the adjacent tile, the distance to the building centre is
      // roughly half the building's largest dimension (~16px for a wall). The previous
      // arrive radius of 12px meant we would only register "in range" for a single frame
      // as the colonist slid into position, then immediately fall out of range and stop
      // progressing the build. Expand the reach based on building size so tiny blueprints
      // can be completed while standing just outside the blocked tile.
      const largestHalfExtent = Math.max(b.w, b.h) / 2;
      const interactRadius = Math.max(12, largestHalfExtent + 6);

      // Build-specific stuck detection and timeout
      if (c.stateSince > 15) {
        console.log(`Build task timeout after ${c.stateSince.toFixed(1)}s, abandoning building`);
        game.releaseBuildReservation(c);
        c.task = null;
        c.target = null;
        game.clearPath(c);
        // Stop any looping construction audio before clearing tracking
        if (c.activeConstructionAudio && (game as any).audioManager) {
          (game as any).audioManager.stop(c.activeConstructionAudio);
        }
        c.lastConstructionAudioTime = undefined;
        c.activeConstructionAudio = undefined;
        changeState('seekTask', 'build timeout');
        break;
      }
      
      // Track position for jitter detection - TEMPORARILY DISABLED
      const distToTarget = Math.hypot(c.x - pt.x, c.y - pt.y);
      if (!c.lastDistToNode) c.lastDistToNode = distToTarget;
      
      // Check for build jittering (not making progress) - TEMPORARILY DISABLED
      /*
      if (c.stateSince > 3 && Math.abs(distToTarget - c.lastDistToNode) < 5) {
        c.jitterScore = (c.jitterScore || 0) + 1;
        if (c.jitterScore > 30) { // 30 frames of no progress
          console.log(`Build jittering detected, clearing path and retrying`);
          game.clearPath(c);
          c.jitterScore = 0;
          // Try moving to a slightly different position around the building
          const offset = (Math.random() - 0.5) * 20;
          pt.x += offset;
          pt.y += offset;
        }
      } else {
        c.jitterScore = 0;
      }
      */
      c.lastDistToNode = distToTarget;
      
      // Check if colonist is within interaction range first
      const currentDist = Math.hypot(c.x - pt.x, c.y - pt.y);
      
      // Only move if not in range - prevents infinite repathing when already at destination
      if (currentDist > interactRadius) {
        game.moveAlongPath(c, dt, pt, interactRadius);
      }
      
      // Build if within interaction range
      if (currentDist <= interactRadius) {
        // Apply equipment work speed bonuses (Construction) and skill multiplier
        const equipMult = (game as any).getWorkSpeedMultiplier ? (game as any).getWorkSpeedMultiplier(c, 'Construction') : 1;
        const lvl = c.skills ? skillLevel(c, 'Construction') : 0;
        const skillMult = skillWorkSpeedMultiplier(lvl);
        const workMult = equipMult * skillMult;
        b.buildLeft -= 25 * dt * workMult;
        
        // === CONSTRUCTION AUDIO SYSTEM ===
        // Play construction work sounds while actively building
        const buildingDef = BUILD_TYPES[b.kind];
        if (buildingDef) {
          const audioClip = getConstructionAudio(b.kind, buildingDef);
          const currentTime = c.t || 0;
          
          // Play construction audio every 1-2 seconds (randomized for natural feel)
          // Each audio clip plays to completion, then a new one starts
          const audioInterval = 1.5 + Math.random() * 0.5; // 1.5-2.0 seconds
          
          if (!c.lastConstructionAudioTime || (currentTime - c.lastConstructionAudioTime) >= audioInterval) {
            // Stop any previous looping construction audio before starting new one
            if (c.activeConstructionAudio && (game as any).audioManager) {
              (game as any).audioManager.stop(c.activeConstructionAudio);
            }
            
            // Play construction sound with per-clip volume control
            (game as any).playAudio?.(audioClip.key, { 
              category: 'buildings',
              volume: audioClip.volume ?? 0.75,
              rng: Math.random, // Pass the function, not the result
              position: { x: b.x + b.w / 2, y: b.y + b.h / 2 },
              listenerPosition: (game as any).audioManager?.getListenerPosition(),
              replaceExisting: true // Ensure only one instance of construction audio per colonist
            });
            c.lastConstructionAudioTime = currentTime;
            c.activeConstructionAudio = audioClip.key;
          }
        }
        // === END CONSTRUCTION AUDIO ===
        
        // Grant construction XP over time while actively building
        if (c.skills) {
          // Base XP per second while building
          grantSkillXP(c, 'Construction', 6 * dt, c.t || 0);
        }
        if (b.buildLeft <= 0) {
          b.done = true;
          
          // === CONSTRUCTION COMPLETION AUDIO ===
          // Stop any looping construction audio first
          if (c.activeConstructionAudio && (game as any).audioManager) {
            (game as any).audioManager.stop(c.activeConstructionAudio);
          }
          // Play completion sound when building finishes
          if (buildingDef) {
            const completeAudioClip = getConstructionCompleteAudio(b.kind, buildingDef);
            (game as any).playAudio?.(completeAudioClip.key, {
              category: 'buildings',
              volume: completeAudioClip.volume ?? 0.85,
              position: { x: b.x + b.w / 2, y: b.y + b.h / 2 },
              listenerPosition: (game as any).audioManager?.getListenerPosition()
            });
          }
          // Clear construction audio tracking
          c.lastConstructionAudioTime = undefined;
          c.activeConstructionAudio = undefined;
          // === END COMPLETION AUDIO ===
          
          if (b.kind === 'farm') { b.growth = 0; b.ready = false; }
          if (b.kind === 'door') { initializeDoor(b); }
          
          // Handle floor construction completion - convert to terrain floor
          if ((b as any).isFloorConstruction && (b as any).floorType) {
            const floorTypeStr = (b as any).floorType as string;
            const floorTypeMap: Record<string, number> = {
              'BASIC_PATH': 1,
              'STONE_ROAD': 2,
              'WOODEN_FLOOR': 3,
              'CONCRETE': 4,
              'METAL_FLOOR': 5,
              'CARPET': 6
            };
            const floorTypeId = floorTypeMap[floorTypeStr] || 1;
            
            // Get tile position
            const tx = Math.floor(b.x / 32);
            const ty = Math.floor(b.y / 32);
            
            // Set floor in terrain grid
            if (game.terrainGrid && tx >= 0 && ty >= 0 && tx < game.grid.cols && ty < game.grid.rows) {
              const idx = ty * game.grid.cols + tx;
              game.terrainGrid.floors[idx] = floorTypeId;
              
              // Use deferred cache invalidation to prevent performance issues during
              // rapid floor placement (immediate invalidation caused 200%+ render time)
              game.deferredRebuildSystem.requestCacheInvalidation();
              
              // Sync terrain to pathfinding grid
              (game as any).syncTerrainToGrid?.();
              
              // Remove the construction marker building
              const buildingIdx = game.buildings.indexOf(b);
              if (buildingIdx !== -1) {
                game.buildings.splice(buildingIdx, 1);
              }
              
              // Show completion message
              game.msg(`Floor construction complete`, 'good');
            }
          }
          
          // Check if colonist is stuck inside the building and move them to safety
          if (wouldCollideWithBuildings(game, c.x, c.y, c.r)) {
            // Find a safe position around the building
            const angles = [0, Math.PI/2, Math.PI, 3*Math.PI/2, Math.PI/4, 3*Math.PI/4, 5*Math.PI/4, 7*Math.PI/4];
            let moved = false;
            
            for (const angle of angles) {
              const safeDistance = Math.max(b.w, b.h) / 2 + c.r + 10;
              const safeX = b.x + b.w/2 + Math.cos(angle) * safeDistance;
              const safeY = b.y + b.h/2 + Math.sin(angle) * safeDistance;
              
              // Ensure safe position is within world bounds
              const clampedX = Math.max(c.r, Math.min(safeX, WORLD.w - c.r));
              const clampedY = Math.max(c.r, Math.min(safeY, WORLD.h - c.r));
              
              if (!wouldCollideWithBuildings(game, clampedX, clampedY, c.r)) {
                c.x = clampedX;
                c.y = clampedY;
                moved = true;
                if (Math.random() < 0.1) {
                  console.log(`Moved colonist to safety after building completion: (${c.x.toFixed(1)}, ${c.y.toFixed(1)})`);
                }
                break;
              }
            }
            
            if (!moved) {
              // Emergency fallback: move to HQ area
              const hq = game.buildings.find((bld: any) => bld.kind === 'hq');
              if (hq) {
                c.x = hq.x + hq.w/2;
                c.y = hq.y - 30;
                console.log('Emergency teleport to HQ area after building completion');
              }
            }
          }
          
          game.msg(b.name ? b.name + " complete" : "Building complete"); game.rebuildNavGrid(); game.clearPath(c);
          game.releaseBuildReservation(c); c.task = null; c.target = null; changeState('seekTask', 'building complete');
        }
      }
      break;
    }
    case 'harvest': {
      const f = c.target as Building; 
      if (!f) {
        // Only switch to seekTask if we've been in this state for at least a short duration
        if (c.stateSince >= 0.5) {
          c.task = null; c.target = null; game.clearPath(c); changeState('seekTask', 'no harvest target');
        }
        break;
      }
      
      // Check if farm is ready or if it's a well
      if (f.kind === 'farm' && !f.ready) {
        // Only switch to seekTask if we've been in this state for at least a short duration
        if (c.stateSince >= 0.5) {
          c.task = null; c.target = null; game.clearPath(c); changeState('seekTask', 'farm not ready');
        }
        break; 
      }
      
      const pt = { x: f.x + f.w / 2, y: f.y + f.h / 2 };
      if (game.moveAlongPath(c, dt, pt, 12)) { 
        // Plants skill influences harvest yield slightly
        const plantsLvl = c.skills ? skillLevel(c, 'Plants') : 0;
        const yieldMult = 1 + Math.min(0.5, plantsLvl * 0.02); // up to +50% at lvl 25 (capped)
        if (f.kind === 'farm') {
          f.ready = false; 
          f.growth = 0; 
          // Farms now drop wheat on the floor for haulers to transport
          const wheatAmount = Math.round(10 * yieldMult);
          const dropAt = { x: f.x + f.w / 2, y: f.y + f.h / 2 };
          game.itemManager.dropItems('wheat', wheatAmount, dropAt);
          game.msg(`Farm harvested (dropped ${wheatAmount} wheat)`, 'good');
          
          if (c.skills) grantSkillXP(c, 'Plants', 20, c.t || 0); // big tick on harvest
        } else if (f.kind === 'well') {
          const collected = game.addResource('food', Math.round(5 * yieldMult * 0.6));
          if (collected > 0) {
            game.msg(`Well collected (+${collected} food)`, 'good');
          }
        }
        
        // Only switch to seekTask if we've been in this state for at least a short duration
        if (c.stateSince >= 0.5) {
          c.task = null; c.target = null; game.clearPath(c); changeState('seekTask', 'harvest complete');
        }
      }
      break;
    }
    case 'chop': {
      const t = c.target as any; 
      if (!t || t.hp <= 0) {
        // Clean up and exit
        if (t && game.assignedTargets.has(t)) game.assignedTargets.delete(t); 
        c.task = null; c.target = null; game.clearPath(c);
        (c as any).intentContext = undefined; // Clear intent
        changeState('seekTask', 'tree gone');
        break; 
      }
      
      const dx = t.x - c.x;
      const dy = t.y - c.y;
      const distance = Math.hypot(dx, dy);
      const interact = (t.r || 12) + c.r + 4;
      const slack = 2.5;
      const interactionRange = interact + slack;
      
      // Intent system functions imported at top of file
      
      // Update intent context
      updateColonistIntent(c, dt);
      const intent = getColonistIntent(c);
      
      // PHASE 1: Moving to tree
      if (!intent || intent.intent === 'moving') {
        if (shouldEnterDecisionPhase(c, t, interactionRange)) {
          // Arrived at tree - enter decision phase
          setColonistIntent(c, 'deciding', { 
            target: t, 
            interactionRange,
            decisionTime: 0.5, // Half second to "size up" the tree
            canCancel: true 
          });
        } else {
          // Keep moving toward tree
          if (!intent) {
            setColonistIntent(c, 'moving', { target: t, canCancel: true });
          }
          game.moveAlongPath(c, dt, t, interactionRange);
        }
      }
      
      // PHASE 2: Deciding whether to chop
      else if (intent.intent === 'deciding') {
        // Stand still and "consider" the tree
        if (intent.decisionTime && intent.decisionTime <= 0) {
          // Decision made - start chopping
          setColonistIntent(c, 'working', createWorkIntent(t, interactionRange, true));
        }
        // Don't move while deciding - colonist is stationary
      }
      
      // PHASE 3: Actually chopping (stationary)
      else if (intent.intent === 'working') {
        // Must be stationary and in range to work
        if (distance <= interactionRange) {
          // Perform the actual chopping work
          const equipMult = (game as any).getWorkSpeedMultiplier ? (game as any).getWorkSpeedMultiplier(c, 'Woodcutting') : 1;
          const plantsLvl = c.skills ? skillLevel(c, 'Plants') : 0;
          const skillMult = skillWorkSpeedMultiplier(plantsLvl);
          const workMult = equipMult * skillMult;
          
          t.hp -= 18 * dt * workMult;
          if (c.skills) grantSkillXP(c, 'Plants', 4 * dt, c.t || 0);
          
          if (t.hp <= 0) {
            // Tree chopped down
            const yieldMult = 1 + Math.min(0.5, plantsLvl * 0.02);
            const amount = Math.round(6 * yieldMult);
            const dropAt = { x: t.x, y: t.y };
            (game as any).itemManager?.dropItems('wood', amount, dropAt);
            (game.trees as any[]).splice((game.trees as any[]).indexOf(t), 1);
            if (game.assignedTargets.has(t)) game.assignedTargets.delete(t);
            game.msg(`Dropped ${amount} wood`, 'good');
            
            // Clean up and finish
            c.task = null; c.target = null; game.clearPath(c);
            (c as any).intentContext = undefined;
            changeState('seekTask', 'chopped tree');
          }
        } else {
          // Lost range - go back to moving
          setColonistIntent(c, 'moving', { target: t, canCancel: true });
        }
      }

      // Timeout safety check
      if (c.stateSince && c.stateSince > 20) {
        console.log(`Chop task timeout after ${c.stateSince.toFixed(1)}s, abandoning tree`);
        if (game.assignedTargets.has(t)) game.assignedTargets.delete(t);
        c.task = null; c.target = null; game.clearPath(c); 
        (c as any).intentContext = undefined;
        changeState('seekTask', 'chop timeout');
      }
      break;
    }
    case 'plantTree': {
      const plantingSpot = c.target as { x: number; y: number; zoneId: string };
      if (!plantingSpot) {
        if (c.stateSince >= 0.5) {
          c.task = null; c.target = null; game.clearPath(c); changeState('seekTask', 'no planting spot');
        }
        break;
      }

      const pt = { x: plantingSpot.x, y: plantingSpot.y };
      if (game.moveAlongPath(c, dt, pt, 16)) {
        // Plants skill influences planting speed
        const plantsLvl = c.skills ? skillLevel(c, 'Plants') : 0;
        const skillMult = skillWorkSpeedMultiplier(plantsLvl);
        
        // Planting takes about 3 seconds base time
        const plantingTime = 3.0 / skillMult;
        
        if (c.stateSince >= plantingTime) {
          // Plant the tree using the tree growing manager
          if (game.treeGrowingManager && game.treeGrowingManager.plantTreeAt(plantingSpot.x, plantingSpot.y, plantingSpot.zoneId)) {
            game.msg('Tree planted', 'good');
            if (c.skills) grantSkillXP(c, 'Plants', 25, c.t || 0);
          }
          
          if (c.stateSince >= 0.5) {
            c.task = null; c.target = null; game.clearPath(c); changeState('seekTask', 'tree planted');
          }
        }
      }

      // Timeout after 20 seconds
      if (c.stateSince && c.stateSince > 20) {
        c.task = null; c.target = null; game.clearPath(c); changeState('seekTask', 'plant timeout');
      }
      break;
    }
    case 'harvestPlantedTree': {
      const treeSpot = c.target as { x: number; y: number; zoneId: string };
      if (!treeSpot) {
        if (c.stateSince >= 0.5) {
          c.task = null; c.target = null; game.clearPath(c); changeState('seekTask', 'no tree to harvest');
        }
        break;
      }

      const pt = { x: treeSpot.x, y: treeSpot.y };
      if (game.moveAlongPath(c, dt, pt, 16)) {
        // Plants skill influences harvest speed and yield
        const plantsLvl = c.skills ? skillLevel(c, 'Plants') : 0;
        const skillMult = skillWorkSpeedMultiplier(plantsLvl);
        const yieldMult = 1 + Math.min(0.5, plantsLvl * 0.02);
        
        // Harvesting takes about 2 seconds base time
        const harvestTime = 2.0 / skillMult;
        
        if (c.stateSince >= harvestTime) {
          // Harvest the tree using the tree growing manager
          if (game.treeGrowingManager && game.treeGrowingManager.harvestTreeAt(treeSpot.x, treeSpot.y, treeSpot.zoneId)) {
            const woodAmount = Math.round(8 * yieldMult); // Planted trees give more wood than wild trees
            const dropAt = { x: treeSpot.x, y: treeSpot.y };
            game.itemManager.dropItems('wood', woodAmount, dropAt);
            game.msg(`Harvested tree (dropped ${woodAmount} wood)`, 'good');
            if (c.skills) grantSkillXP(c, 'Plants', 30, c.t || 0);
          }
          
          if (c.stateSince >= 0.5) {
            c.task = null; c.target = null; game.clearPath(c); changeState('seekTask', 'tree harvested');
          }
        }
      }

      // Timeout after 20 seconds
      if (c.stateSince && c.stateSince > 20) {
        c.task = null; c.target = null; game.clearPath(c); changeState('seekTask', 'harvest timeout');
      }
      break;
    }
    case 'mine': {
      const r = c.target as any; 
      if (!r || (r.hp !== undefined && r.hp <= 0)) {
        // Only switch to seekTask if we've been in this state for at least a short duration
        if (c.stateSince >= 0.5) {
          // Handle mountain tile key tracking
          if (r && r.gx !== undefined && r.gy !== undefined) {
            const tileKey = `${r.gx},${r.gy}`;
            if ((game as any).assignedTiles?.has(tileKey)) (game as any).assignedTiles.delete(tileKey);
          } else if (r && game.assignedTargets.has(r)) {
            game.assignedTargets.delete(r);
          }
          c.task = null; c.target = null; game.clearPath(c); changeState('seekTask', 'rock gone');
        }
        break; 
      }
      
      // Check if target is a mountain tile (object with gx/gy properties) or a rock (Circle)
      const isMountainTile = r.gx !== undefined && r.gy !== undefined;
      
      if (isMountainTile) {
        // Mining a mountain tile
        const { gx, gy } = r;
        const worldX = gx * T + T / 2;
        const worldY = gy * T + T / 2;
        
        const dx = worldX - c.x;
        const dy = worldY - c.y;
        const distance = Math.hypot(dx, dy);
        const interact = T; // One tile away
        
        if (distance <= interact + 2) {
          // Close enough to mine
          
          // Verify it's still a mountain
          if (!checkIsMountainTile(game.terrainGrid, gx, gy)) {
            // Mountain already mined
            const tileKey = `${gx},${gy}`;
            if ((game as any).assignedTiles?.has(tileKey)) (game as any).assignedTiles.delete(tileKey);
            c.task = null; c.target = null; game.clearPath(c); 
            changeState('seekTask', 'mountain already mined');
            break;
          }
          
          const equipMult = (game as any).getWorkSpeedMultiplier ? (game as any).getWorkSpeedMultiplier(c, 'Mining') : 1;
          const miningLvl = c.skills ? skillLevel(c, 'Mining') : 0;
          const skillMult = skillWorkSpeedMultiplier(miningLvl);
          const workMult = equipMult * skillMult;
          
          // Mountain tiles have HP stored in the target object
          if (!r.hp) {
            // Initialize HP based on ore type
            const idx = gy * game.terrainGrid.cols + gx;
            const oreType = getOreTypeFromId(game.terrainGrid.ores[idx]);
            r.hp = ORE_PROPERTIES[oreType].hp;
          }
          
          r.hp -= 12 * dt * workMult; // Slower than regular rocks
          if (c.skills) grantSkillXP(c, 'Mining', 5 * dt, c.t || 0);
          
          if (r.hp <= 0) {
            // Mine the tile
            const oreType = mineMountainTile(game.terrainGrid, gx, gy);
            
            if (oreType) {
              const oreProps = ORE_PROPERTIES[oreType];
              const yieldMult = 1 + Math.min(0.5, miningLvl * 0.02);
              const amount = Math.round(oreProps.miningYield * yieldMult);
              
              // Determine resource type from ore - oreType enum values match ItemType
              let resourceType: ItemType;
              switch (oreType) {
                case OreType.COAL: resourceType = 'coal'; break;
                case OreType.COPPER: resourceType = 'copper'; break;
                case OreType.STEEL: resourceType = 'steel'; break;
                case OreType.SILVER: resourceType = 'silver'; break;
                case OreType.GOLD: resourceType = 'gold'; break;
                default: resourceType = 'rubble'; break; // Plain mountain drops rubble (must be refined to stone)
              }
              
              // Drop resources on the ground as floor items
              const dropAt = { x: worldX, y: worldY };
              (game as any).itemManager?.dropItems(resourceType, amount, dropAt);
              game.msg(`Mined ${amount} ${oreProps.name}`, 'good');
              
              // Update pathfinding (mountain is now passable)
              game.navigationManager.rebuildNavGridPartial(worldX, worldY, T * 2);
              
              // Invalidate world cache so the mined mountain disappears from rendering
              game.renderManager?.invalidateWorldCache();
            }
            
            const tileKey = `${gx},${gy}`;
            if ((game as any).assignedTiles?.has(tileKey)) (game as any).assignedTiles.delete(tileKey);
            c.task = null; c.target = null; game.clearPath(c); 
            changeState('seekTask', 'mined mountain');
          }
        } else {
          // Move toward the mountain tile
          game.moveAlongPath(c, dt, { x: worldX, y: worldY }, interact);
          
          // If colonist hasn't moved much in a while, they might be stuck
          // Store last position check in the target object itself
          if (!(r as any).lastCheckTime || c.t - (r as any).lastCheckTime > 3) {
            const lastX = (r as any).lastCheckX ?? c.x;
            const lastY = (r as any).lastCheckY ?? c.y;
            const movedDist = Math.hypot(c.x - lastX, c.y - lastY);
            
            if ((r as any).lastCheckTime && movedDist < 10) {
              // Stuck - clear path and abandon
              // console.log(`Colonist stuck mining mountain at (${gx},${gy}), abandoning`);
              const tileKey = `${gx},${gy}`;
              if ((game as any).assignedTiles?.has(tileKey)) (game as any).assignedTiles.delete(tileKey);
              c.task = null; c.target = null; game.clearPath(c);
              delete (r as any).lastCheckTime;
              delete (r as any).lastCheckX;
              delete (r as any).lastCheckY;
              changeState('seekTask', 'stuck mining mountain');
              break;
            }
            
            // Update check position
            (r as any).lastCheckTime = c.t;
            (r as any).lastCheckX = c.x;
            (r as any).lastCheckY = c.y;
          }
        }
        
        // Timeout check
        if (c.stateSince && c.stateSince > 20) {
          console.log(`Mountain mining timeout after ${c.stateSince.toFixed(1)}s`);
          const tileKey = `${gx},${gy}`;
          if ((game as any).assignedTiles?.has(tileKey)) (game as any).assignedTiles.delete(tileKey);
          c.task = null; c.target = null; game.clearPath(c); 
          delete (r as any).lastCheckTime;
          delete (r as any).lastCheckX;
          delete (r as any).lastCheckY;
          changeState('seekTask', 'mine timeout');
        }
      } else {
        // Mining a regular rock (existing code)
        const dx = r.x - c.x;
        const dy = r.y - c.y;
        const distance = Math.hypot(dx, dy);
        const interact = (r.r || 12) + c.r + 4;
        const slack = 2.5;
        
        // Debug logging
        if (Math.random() < 0.01) { 
          console.log(`Mining: distance=${distance.toFixed(1)}, interact=${interact}, colonist at (${c.x.toFixed(1)}, ${c.y.toFixed(1)}), rock at (${r.x.toFixed(1)}, ${r.y.toFixed(1)})`);
        }
        
        if (distance <= interact + slack + 0.1) {
          // Close enough to mine
          const equipMult = (game as any).getWorkSpeedMultiplier ? (game as any).getWorkSpeedMultiplier(c, 'Mining') : 1;
          const miningLvl = c.skills ? skillLevel(c, 'Mining') : 0;
          const skillMult = skillWorkSpeedMultiplier(miningLvl);
          const workMult = equipMult * skillMult;
          r.hp -= 16 * dt * workMult;
          if (c.skills) grantSkillXP(c, 'Mining', 4 * dt, c.t || 0); // trickle while mining
          if (r.hp <= 0) {
            const yieldMult = 1 + Math.min(0.5, miningLvl * 0.02);
            const amount = Math.round(5 * yieldMult);
            // Drop stone on the ground at the rock position
            const dropAt = { x: r.x, y: r.y };
            (game as any).itemManager?.dropItems('stone', amount, dropAt);
            (game.rocks as any[]).splice((game.rocks as any[]).indexOf(r), 1);
            if (game.assignedTargets.has(r)) game.assignedTargets.delete(r);
            game.msg(`Dropped ${amount} stone`, 'good');
            // OPTIMIZATION: No nav grid rebuild needed - rocks don't block pathfinding anymore!
            // This eliminates stuttering from region rebuilds when harvesting
            
            // Only switch to seekTask if we've been in this state for at least a short duration
            if (c.stateSince >= 0.5) {
              c.task = null; c.target = null; game.clearPath(c); changeState('seekTask', 'mined rock');
            }
          }
          break;
        } else {
          // Move toward the rock using pathfinding
          game.moveAlongPath(c, dt, r, interact + slack);
          
          // Debug movement
          if (Math.random() < 0.01) {
            console.log(`Moving toward rock: target=(${r.x.toFixed(1)}, ${r.y.toFixed(1)}), distance=${distance.toFixed(1)}`);
          }
        }
        
        // If stuck too long, abandon
        if (c.stateSince && c.stateSince > 15) {
          console.log(`Colonist stuck mining for ${c.stateSince.toFixed(1)}s, abandoning`);
          if (game.assignedTargets.has(r)) game.assignedTargets.delete(r);
          c.task = null; c.target = null; game.clearPath(c); changeState('seekTask', 'mine timeout');
        }
      }
      break;
    }
    case 'waitingAtDoor': {
      // Colonist is waiting for a door to open
      const door = c.waitingForDoor;
      if (!door || door.kind !== 'door' || !door.done) {
        // Door was destroyed or doesn't exist
        if (door && c.id) {
          releaseDoorQueue(door, c.id);
        }
        c.waitingForDoor = null;
        c.doorWaitStart = undefined;
        c.doorPassingThrough = null;
        c.doorApproachVector = null;
        changeState('seekTask', 'door no longer exists');
        break;
      }
      
      // Check if door is now passable
      if (isDoorPassable(door)) {
        // Door is open, mark for traversal so queue stays alive until we pass through
        c.waitingForDoor = null;
        c.doorWaitStart = undefined;
        c.doorPassingThrough = door;
        
        // Return to previous task state
        if (c.task === 'build') {
          changeState('build', 'door opened, resuming build');
        } else if (c.task === 'chop') {
          changeState('chop', 'door opened, resuming chop');
        } else if (c.task === 'mine') {
          changeState('mine', 'door opened, resuming mine');
        } else if (c.task === 'harvestFarm' || c.task === 'harvestWell') {
          changeState('harvest', 'door opened, resuming harvest');
        } else {
          changeState('seekTask', 'door opened, resuming movement');
        }
      } else {
        // Still waiting - check for timeout
        const waitTime = c.doorWaitStart ? (c.t - c.doorWaitStart) : 0;
        if (waitTime > 10) {
          // Waited too long, give up
          console.log(`Colonist gave up waiting at door after ${waitTime.toFixed(1)}s`);
          if (c.id) {
            releaseDoorQueue(door, c.id);
          }
          c.waitingForDoor = null;
          c.doorWaitStart = undefined;
          c.doorPassingThrough = null;
          c.doorApproachVector = null;
          c.task = null;
          c.target = null;
          game.clearPath && game.clearPath(c);
          changeState('seekTask', 'door wait timeout');
        }
      }
      break;
    }
    
    case 'cooking': {
      // Delegate to modular cooking state handler
      updateCookingState(c, game, dt, changeState);
      break;
    }
    
    case 'stonecutting': {
      // Delegate to modular stonecutting state handler
      updateStonecuttingState(c, game, dt, changeState);
      break;
    }
    
    case 'smelting': {
      // Delegate to modular smelting state handler
      updateSmeltingState(c, game, dt, changeState);
      break;
    }
    
    case 'smithing': {
      // Delegate to modular smithing state handler
      updateSmithingState(c, game, dt, changeState);
      break;
    }
    
    case 'equipment': {
      // Delegate to modular equipment state handler
      updateEquipmentState(c, game, dt, changeState);
      break;
    }
    
    case 'cooling': {
      // Delegate to modular cooling state handler
      updateCoolingState(c, game, dt, changeState);
      break;
    }
    
    case 'haulFloorItem': {
      // Haul a ground item from floor item system to a stockpile destination
      const data = (c as any).taskData as any;
      const rim = (game as any).itemManager;
      if (!data || !rim) {
        c.task = null;
        c.target = null;
        c.taskData = null;
        (c as any).carryingItem = null;
        game.clearPath(c);
        changeState('seekTask', 'no hauling data');
        break;
      }
      const itemId: string = data.itemId;
      const dest = data.destination as { x: number; y: number };
      if (!itemId || !dest) {
        c.task = null;
        c.target = null;
        c.taskData = null;
        (c as any).carryingItem = null;
        game.clearPath(c);
        changeState('seekTask', 'invalid hauling data');
        break;
      }

      // Timeout check - if stuck for too long, abandon the hauling task
      if (c.stateSince > 30) {
        console.log(`Floor item hauling timeout after ${c.stateSince.toFixed(1)}s, abandoning`);
        // Drop any carried items at current position before abandoning
        const carried = (c as any).carryingItem;
        if (carried && carried.qty > 0) {
          rim.dropItems(carried.type, carried.qty, { x: c.x, y: c.y });
        }
        c.task = null;
        c.target = null;
        c.taskData = null;
        (c as any).carryingItem = null;
        game.clearPath(c);
        changeState('seekTask', 'hauling timeout');
        break;
      }

      // Support a two-phase flow: pickup -> deliver. Preserve phase in taskData.
      const pickedUp: boolean = !!data.pickedUp;

      if (!pickedUp) {
        // Phase 1: go to item position (target may have been cached as FloorItem when assigned)
        const item = rim.floorItems.getAllItems().find((it: any) => it.id === itemId);
        if (!item) {
          // Item disappeared before pickup; abort gracefully
          c.task = null;
          c.target = null;
          c.taskData = null;
          (c as any).carryingItem = null;
          game.clearPath(c);
          changeState('seekTask', 'item missing before pickup');
          break;
        }

        const itemPt = { x: item.position.x, y: item.position.y };
        const dItem = Math.hypot(c.x - itemPt.x, c.y - itemPt.y);
        if (dItem > 18) {
          game.moveAlongPath(c, dt, itemPt, 16);
          break;
        }

        // At item: pick up whole stack or up to a carry limit
        const carryLimit = 20; // simple limit for now
        const takeRes = rim.pickupItems(itemId, carryLimit);
        const taken = takeRes ? takeRes.taken : 0;
        if (taken <= 0) {
          // Nothing to take (race lost)
          c.task = null;
          c.target = null;
          c.taskData = null;
          (c as any).carryingItem = null;
          game.clearPath(c);
          changeState('seekTask', 'nothing to pick up');
          break;
        }
        // Store temporarily in colonist cargo
        const itemType = (takeRes.item?.type) ?? data.itemType;
        (c as any).carryingItem = { type: itemType, qty: taken };

        // Mark phase as picked up so we proceed to destination next tick
        (c as any).taskData = { ...data, pickedUp: true };
        break;
      }

      // Phase 2: go to destination and drop (even if source item was removed already)
      const dDest = Math.hypot(c.x - dest.x, c.y - dest.y);
      if (dDest > 18) {
        game.moveAlongPath(c, dt, dest, 16);
        break;
      }

      // Drop at destination (floor) and mark task complete
      const payload = (c as any).carryingItem;
      if (payload && payload.qty > 0) {
        // Physically drop on the floor at the stockpile
        rim.dropItems(payload.type, payload.qty, dest);

        // If dropped into a valid stockpile, also credit tracked resources so HUD counts reflect availability
        try {
          const zone = rim.stockpiles?.getZoneAtPosition?.(dest);
          const accepts = zone && (zone.settings.allowAll || zone.allowedItems.has(payload.type));
          if (accepts) {
            const map: Record<string, 'wood'|'stone'|'food'|'medicine'|undefined> = {
              wood: 'wood', stone: 'stone', food: 'food', medicine: 'medicine'
            };
            const resKey = map[payload.type];
            if (resKey) {
              // Add to global resources (capacity-checked for wood/stone/food; medicine not capacity-limited)
              (game as any).addResource(resKey, payload.qty);
            }
          }
        } catch {}
        game.msg(`${c.profile?.name || 'Colonist'} hauled ${payload.qty} ${payload.type}`, 'good');
      }
      c.task = null;
      c.target = null;
      c.taskData = null;
      (c as any).carryingItem = null;
      game.clearPath(c);
      changeState('seekTask', 'floor item hauled');
      break;
    }
    
    case 'guard': {
      const anchor = c.guardAnchor;
      if (!anchor) {
        c.task = null;
        c.commandIntent = null;
        c.commandData = null;
        changeState('seekTask', 'guard anchor missing');
        break;
      }

      const distance = Math.hypot(c.x - anchor.x, c.y - anchor.y);
      if (distance > 18) {
        game.moveAlongPath(c, dt, anchor, 10);
      } else {
        const dx = anchor.x - c.x;
        const dy = anchor.y - c.y;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          c.direction = Math.atan2(-dy, -dx);
        }
      }

      const commandStillActive = c.playerCommand?.issued && (!c.playerCommand.expires || (c.t || 0) < c.playerCommand.expires);
      if (!commandStillActive) {
        c.task = null;
        c.target = null;
        c.commandIntent = null;
        c.commandData = null;
        c.guardAnchor = null;
        changeState('seekTask', 'guard command expired');
      }
      break;
    }
    
    case 'research': {
      // Research state - colonist works at research bench
      const bench = c.target as Building;
      if (!bench || bench.kind !== 'research_bench' || !bench.done) {
        // Research bench was destroyed or doesn't exist
        c.target = null;
        game.clearPath(c);
        changeState('seekTask', 'research bench no longer available');
        break;
      }
      
      // Check if research is still active
      if (!game.researchManager?.getCurrentResearch()) {
        c.target = null;
        changeState('seekTask', 'no active research');
        break;
      }
      
      const pt = { x: bench.x + bench.w / 2, y: bench.y + bench.h / 2 };
      const distance = Math.hypot(c.x - pt.x, c.y - pt.y);
      
      // Move to research bench
      if (distance > 20) {
        game.moveAlongPath(c, dt, pt, 20);
        break;
      }
      
      // At research bench - do research work
      if (game.pointInRect(c, bench)) {
        // Generate research points based on colonist's research skill (or use base rate)
        const researchSpeed = 5; // Base research points per second
        const points = researchSpeed * dt;
        
        // Add progress to research manager
        const completed = game.researchManager.addProgress(points);
        
        if (completed) {
          // Research completed!
          game.msg(`Research completed!`, 'success');
          c.target = null;
          changeState('seekTask', 'research completed');
        }
      } else {
        // Not in correct position, try to move there
        game.moveAlongPath(c, dt, pt, 0);
      }
      break;
    }
    
    case 'drafted': {
      // Drafted colonists are under player control for combat
      // They will automatically engage enemies they can see with ranged weapons
      // Or fight in melee when adjacent to enemies
      
      // Release door queue if colonist was waiting at a door when drafted
      if (c.waitingForDoor) {
        if (c.id) {
          releaseDoorQueue(c.waitingForDoor, c.id);
        }
        c.waitingForDoor = null;
        c.doorWaitStart = undefined;
        c.doorPassingThrough = null;
        c.doorApproachVector = null;
      }
      
      // Check if colonist should exit drafted state
      if (!c.isDrafted) {
        changeState('seekTask', 'undrafted by player');
        break;
      }
      
      // If player assigned a position, move there
      if (c.draftedPosition) {
        const distance = Math.hypot(c.x - c.draftedPosition.x, c.y - c.draftedPosition.y);
        if (distance > 10) {
          game.moveAlongPath(c, dt, c.draftedPosition, 10);
        }
        // Combat will be handled by updateColonistCombat which runs before this FSM
        break;
      }
      
      // If player assigned a specific target, try to move toward it (if it's far)
      if (c.draftedTarget && (c.draftedTarget as any).alive !== false && (c.draftedTarget as any).hp > 0) {
        const target = c.draftedTarget as any;
        const distance = Math.hypot(c.x - target.x, c.y - target.y);
        
        // Get weapon range to determine appropriate distance
        const weapon = c.inventory?.equipment?.weapon;
        let optimalRange = 40; // Default melee/close range
        if (weapon && weapon.defName) {
          const itemDef = (itemDatabase as any).getItemDef(weapon.defName);
          if (itemDef && itemDef.range > 2) {
            // Ranged weapon - stay at 60% of max range for optimal positioning
            const T = 32;
            optimalRange = (itemDef.range * T) * 0.6;
          }
        }
        
        // Move to optimal engagement range
        if (distance > optimalRange * 1.2) {
          game.moveAlongPath(c, dt, { x: target.x, y: target.y }, optimalRange);
        }
        // Combat will be handled by updateColonistCombat
        break;
      }
      
      // No specific orders - check if should take cover
      if (game.combatManager.shouldTakeCover(c)) {
        const dangerState = game.combatManager.getDangerState(c);
        if (dangerState.inDanger && dangerState.threat) {
          const coverPos = game.combatManager.findCoverPosition(c, dangerState.threat);
          if (coverPos) {
            // Move to cover position
            const distance = Math.hypot(c.x - coverPos.x, c.y - coverPos.y);
            if (distance > 10) {
              game.moveAlongPath(c, dt, coverPos, 10);
            }
            break;
          }
        }
      }
      
      // No specific orders and no need for cover - just hold position and engage enemies automatically
      // Combat handled by updateColonistCombat
      break;
    }
  }

  // Soft separation with grace period - colonists can overlap for 1 second before personal space kicks in
  // Initialize overlap timers if not present
  if (!(c as any).overlapTimers) {
    (c as any).overlapTimers = new Map();
  }
  
  for (const o of game.colonists as Colonist[]) {
    if (o === c || !o.alive) continue; 
    
    // Skip separation if this colonist is actively mining or chopping (within interaction range)
    if ((c.state === 'mine' || c.state === 'chop') && c.target) {
      const interact = ((c.target as any).r || 12) + c.r + 4;
      const slack = 2.5;
      const d = Math.hypot(c.x - (c.target as any).x, c.y - (c.target as any).y);
      if (d <= interact + slack) continue; // Skip separation when actively working
    }
    
    // Also skip separation if either colonist is inside a building
    if (c.inside || o.inside) continue;
    
    const dx = c.x - o.x, dy = c.y - o.y; 
    const d2 = dx * dx + dy * dy; 
    const personalSpace = (c.r + o.r + 8); // Increased personal space preference
    const rr = personalSpace * personalSpace;
    
    const otherId = (o as any).id || o; // Use colonist id as key
    const overlapTimers = (c as any).overlapTimers as Map<any, number>;
    
    // Check if colonists are overlapping
    if (d2 > 0 && d2 < rr) { 
      // Track overlap time
      if (!overlapTimers.has(otherId)) {
        overlapTimers.set(otherId, 0);
      }
      overlapTimers.set(otherId, overlapTimers.get(otherId)! + dt);
      
      // Only apply separation after 1 second grace period
      const overlapTime = overlapTimers.get(otherId)!;
      if (overlapTime >= 1.0) {
        const d = Math.sqrt(d2) || 1; 
        const pushStrength = (personalSpace - d) / personalSpace; // Normalized push strength (0-1)
        const softPush = pushStrength * 0.3; // Much gentler push
        
        // Apply gentle separation after grace period
        c.x += (dx / d) * softPush * dt * 3;
        c.y += (dy / d) * softPush * dt * 3;
      }
    } else {
      // Not overlapping - clear the timer
      overlapTimers.delete(otherId);
    }
  }
}
