import { dist2, norm, sub } from "../../core/utils";
import { WORLD } from "../constants";
import type { Building, Colonist, Enemy, ColonistState } from "../types";
import { grantSkillXP, skillLevel, skillWorkSpeedMultiplier } from "../skills/skills";
import { initializeColonistHealth, healInjuries, updateHealthStats, calculateOverallHealth, updateHealthProgression } from "../health/healthSystem";
import { medicalSystem } from "../health/medicalSystem";
import { medicalWorkGiver, type MedicalJob } from "../health/medicalWorkGiver";
import { isDoorBlocking, isDoorPassable, releaseDoorQueue, isNearDoor, requestDoorOpen, shouldWaitAtDoor, initializeDoor } from "../systems/doorSystem";

// Helper to check if colonist should wait for a door
function checkDoorInteraction(game: any, c: Colonist): Building | null {
  // Find any doors near the colonist that are blocking
  // Increased range to detect doors earlier
  for (const b of game.buildings) {
    if (b.kind === 'door' && b.done && isDoorBlocking(b)) {
      const doorCenterX = b.x + b.w / 2;
      const doorCenterY = b.y + b.h / 2;
      const distance = Math.hypot(c.x - doorCenterX, c.y - doorCenterY);
      
      // Detect door from further away so colonist stops before reaching it
      if (distance < 96) { // 3 tiles
        return b;
      }
    }
  }
  return null;
}

// Helper function to check if a position would collide with buildings
function wouldCollideWithBuildings(game: any, x: number, y: number, radius: number): boolean {
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
  const T = 24; // tile size
  const gx = Math.floor(x / T) * T;
  const gy = Math.floor(y / T) * T;
  
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
  const blockingDoor = checkDoorInteraction(game, c);
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
  const speed = c.speed * speedMultiplier * pathSpeedBonus;
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
  
  // Update health system (heal injuries, update stats)
  if (c.health) {
  // Progress bleeding/infections on cadence
  updateHealthProgression(c.health, dt);
  healInjuries(c.health, dt);
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
  
  const hungerRate = (working ? 0.25 : c.inside ? 0.1 : 0.15) * hungerMultiplier; // Apply personality modifier
  c.hunger = Math.max(0, Math.min(100, (c.hunger || 0) + dt * hungerRate));
  
  // Fatigue rises when active, falls when inside/resting (adjusted for balanced gameplay)
  const fatigueRise = (working ? 0.8 : 0.3) * fatigueMultiplier; // Apply personality modifier
  // Only reduce fatigue when actually inside a building or in the resting state, NOT when just seeking sleep
  if (c.inside || c.state === 'resting') c.fatigue = Math.max(0, (c.fatigue || 0) - dt * 8); // Slightly slower recovery too
  else c.fatigue = Math.min(100, (c.fatigue || 0) + dt * fatigueRise);
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

  // Danger detection with hysteresis to prevent rapid state flipping
  // Enter flee mode at 140 pixels, but don't exit until 180 pixels away
  const dangerEnterDistance = 140 * 140; // squared for performance
  const dangerExitDistance = 180 * 180;
  const currentDanger = (game.enemies as Enemy[]).find(e => dist2(e as any, c as any) < dangerEnterDistance);
  
  // Check if currently fleeing and still within exit distance
  const fleeingFromDanger = c.state === 'flee' && (c as any).lastDanger && 
                           dist2((c as any).lastDanger as any, c as any) < dangerExitDistance;
  
  const danger = currentDanger || (fleeingFromDanger ? (c as any).lastDanger : null);
  
  // Remember the danger we're fleeing from for hysteresis
  if (currentDanger) {
    (c as any).lastDanger = currentDanger;
  } else if (!fleeingFromDanger) {
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

  // Add minimum state duration to prevent rapid switching (except for critical states and work states)
  const minStateDuration = 1.0; // 1 second minimum for most states
  // Work states CAN change immediately, but only for critical intents (flee/heal/medical)
  // For seekTask transitions, work states should respect minimum duration to prevent rapid task cycling
  const isWorkState = c.state === 'chop' || c.state === 'mine' || c.state === 'build' || c.state === 'harvest';
  const canChangeState = c.stateSince > minStateDuration || 
                        c.state === 'idle' || 
                        c.state === 'seekTask' ||
                        danger; // Always allow immediate flee from danger

  // Simple energy-based fatigue system with hysteresis
  // Enter rest state when fatigue >= 80, exit when fatigue <= 20 (60-point gap prevents oscillation)
  const fatigueEnterThreshold = 80;
  const fatigueExitThreshold = 20;

  // Priority-based intent evaluation
  function evaluateIntent(): { state: ColonistState; prio: number; reason: string } | null {
    let best: { state: ColonistState; prio: number; reason: string } | null = null;
    const set = (state: ColonistState, prio: number, reason: string) => {
      if (!best || prio > best.prio) best = { state, prio, reason };
    };
    // Highest first
    if (!c.inside && danger) set('flee', 100, 'danger detected');
    
    // Medical work - ALL colonists can treat injuries (RimWorld style)
    // Use the new work giver system to scan for medical work
    if (!c.inside && !danger && c.health && c.health.totalPain < 0.6) {
      const medicalJob = medicalWorkGiver.scanForMedicalWork(c, game.colonists, c.t);
      if (medicalJob && !medicalJob.reservedBy) {
        // Reserve the job and assign it to this doctor
        if (medicalWorkGiver.reserveJob(medicalJob, c)) {
          (c as any).medicalJob = medicalJob;
          set('doctoring', 95, 'medical work available');
        }
      }
    }
    
    // Medical needs - check if THIS colonist needs treatment
    // Patients should stay still or go to bed when injured
    if (!c.inside && c.health && (c as any).needsMedical) {
      const urgency = c.health.bloodLevel < 0.4 ? 98 : 
                     c.health.injuries.some((i: any) => i.bleeding > 0.4) ? 95 : 90;
      set('beingTreated', urgency, 'needs medical treatment');
    }
    
    if (!c.inside && !danger && (c.hp || 0) < 35) set('heal', 85 - Math.max(0, c.hp) * 0.1, 'low health');
    if (!c.inside && !danger && game.isNight()) set('sleep', 80, 'night time');
    if (!c.inside && !danger && !game.isNight() && (c.fatigue || 0) >= fatigueEnterThreshold)
      set('goToSleep', 70 + Math.min(20, (c.fatigue || 0) - fatigueEnterThreshold), 'high fatigue');
    if (!c.inside && (c.hunger || 0) > 75 && (game.RES.food || 0) > 0)
      set('eat', 60 + Math.min(25, (c.hunger || 0) - 75), 'hunger');
    // Default: keep working/seek tasks
    set('seekTask', 10, 'default');
    return best;
  }

  // If inside any building and not resting, immediately switch to resting
  if (c.inside && c.state !== 'resting') { changeState('resting', 'entered building'); }
  else {
    const statePriority = (s: ColonistState | undefined): number => {
      switch (s) {
        case 'flee': return 100;
        case 'waitingAtDoor': return 98; // High priority - must wait
        case 'beingTreated': return 96; // Very high priority - patient needs care
        case 'doctoring': return 95; // High priority for active medical work
        case 'heal': return 90;
        case 'sleep': return 80;
        case 'goToSleep': return 75;
        case 'eat': return 65;
        case 'storingBread': return 45; // Complete current cooking job
        case 'cooking': return 42; // Cooking is productive work
        case 'build':
        case 'chop':
        case 'mine':
        case 'harvest': return 40;
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
    
    const intent = evaluateIntent();
    if (intent && intent.state !== c.state) {
      const critical = intent.state === 'flee' || intent.state === 'heal' || 
                      intent.state === 'beingTreated' || intent.state === 'doctoring' ||
                      (intent.state === 'sleep' && game.isNight());
      const curPrio = statePriority(c.state as ColonistState);
      const shouldSwitch = critical || (intent.prio > curPrio && canChangeState);
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
      
      // Simple hysteresis: only leave when fatigue drops to 20 or below (entered at 80+)
      // This creates a 60-point gap to prevent oscillation
      const minRestTime = 1.0; // Minimum 1 second of rest
      const canLeaveFromFatigue = (c.fatigue || 0) <= fatigueExitThreshold && c.stateSince >= minRestTime;
      
      const leave = (!game.isNight()) && (!danger && (c.hurt || 0) <= 0 && (c.hideTimer || 0) <= 0 && canLeaveFromFatigue);
      if (leave) { 
        game.leaveBuilding(c); 
        c.safeTarget = null; 
        c.safeTimer = 0; 
        changeState('seekTask', 'finished resting');
      }
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
      let dest: { x: number; y: number } | null = null; let buildingDest: Building | null = null;
      const tgtTurret = danger ? game.findSafeTurret(c, danger) : null;
      if (tgtTurret) {
        const range = (tgtTurret as any).range || 120; const tc = game.centerOf(tgtTurret);
        const house = (game.buildings as Building[]).find(b => b.kind === 'house' && b.done && game.buildingHasSpace(b, c) && dist2(game.centerOf(b) as any, tc as any) < range * range);
        if (house) { buildingDest = house; dest = game.centerOf(house); }
      }
      if (!dest) { const hq = (game.buildings as Building[]).find((b: Building) => b.kind === 'hq' && game.buildingHasSpace(b, c)); if (hq) { buildingDest = hq; dest = game.centerOf(hq); } }
      if (!dest && tgtTurret) dest = game.centerOf(tgtTurret);
  if (dest) {
        // Use direct movement instead of pathfinding
        const dx = dest.x - c.x;
        const dy = dest.y - c.y;
        const distance = Math.hypot(dx, dy);
        const nearRect = buildingDest ? (c.x >= buildingDest.x - 8 && c.x <= buildingDest.x + buildingDest.w + 8 && c.y >= buildingDest.y - 8 && c.y <= buildingDest.y + buildingDest.h + 8) : false;
        
        if (distance <= 20 || nearRect) {
      if (buildingDest && game.tryEnterBuilding(c, buildingDest)) {
    c.hideTimer = 3; changeState('resting', 'hid from danger');
          } else {
            // Retarget: find closest house with space, else HQ
            const choices = (game.buildings as Building[]).filter((b: Building) => b.done && game.buildingHasSpace(b, c) && (b.kind === 'house' || b.kind === 'hq'));
            if (choices.length) {
              const next = choices.sort((a: Building, b: Building) => dist2(c as any, game.centerOf(a) as any) - dist2(c as any, game.centerOf(b) as any))[0];
              const nc = game.centerOf(next);
              // Don't clear path immediately - let pathfinding handle retargeting
              buildingDest = next; dest = nc; // keep fleeing toward next spot
            } else {
              // Nowhere to hide; fall through and keep running
            }
          }
        } else {
          // Move toward the destination using pathfinding (faster when fleeing)
          game.moveAlongPath(c, dt, dest, 20);
        }
      } else if (danger) {
        // Move away from danger if it still exists
        const d = norm(sub(c as any, danger as any) as any); 
        // Update direction for flee movement
        c.direction = Math.atan2(d.y, d.x);
        c.x += d.x * (c.speed + 90) * dt; c.y += d.y * (c.speed + 90) * dt;
      }
      if (!danger) { changeState('seekTask', 'no more danger'); }
      break;
    }
    case 'sleep': {
      const needsMedicalBed = game.colonistNeedsMedicalBed(c);
      // Persist target house briefly to avoid oscillation between similar choices
      const selectSleepTarget = (options: Building[]): Building | null => {
        if (!options.length) return null;
        const now = c.t || 0;

        // If we already have a reservation that's still valid, stick with it
        if (c.reservedSleepFor && options.includes(c.reservedSleepFor)) {
          (c as any).sleepTarget = c.reservedSleepFor;
          (c as any).sleepTargetLockUntil = now + 5.0;
          return c.reservedSleepFor;
        }

        let remembered: Building | undefined = (c as any).sleepTarget;
        const lockUntil: number = (c as any).sleepTargetLockUntil || 0;

        if (remembered && !options.includes(remembered)) {
          if (c.reservedSleepFor === remembered) {
            game.releaseSleepReservation(c);
          }
          remembered = undefined;
          (c as any).sleepTarget = undefined;
          (c as any).sleepTargetLockUntil = 0;
        }

        if (remembered && now < lockUntil) {
          if (game.reserveSleepSpot(c, remembered)) {
            return remembered;
          }
          if (c.reservedSleepFor === remembered) {
            game.releaseSleepReservation(c);
          }
          remembered = undefined;
          (c as any).sleepTarget = undefined;
          (c as any).sleepTargetLockUntil = 0;
        }

        const scored = options
          .map(house => {
            const distance = Math.sqrt(dist2(c as any, game.centerOf(house) as any));
            const capacity = game.buildingCapacity(house);
            const current = game.insideCounts.get(house) || 0;
            const spaceAvailable = Math.max(0, capacity - current);
            const score = spaceAvailable * 100 - distance;
            return { house, score };
          })
          .sort((a, b) => b.score - a.score);

        for (const { house } of scored) {
          if (game.reserveSleepSpot(c, house)) {
            (c as any).sleepTarget = house;
            (c as any).sleepTargetLockUntil = now + 5.0;
            return house;
          }
        }

        return null;
      };
      const protectedHouses = (game.buildings as Building[]).filter(b => 
        (b.kind === 'house' || b.kind === 'bed' || b.kind === 'tent') && 
        b.done && 
        !(b.kind === 'bed' && b.isMedicalBed && !needsMedicalBed) &&
        game.isProtectedByTurret(b) && 
        game.buildingHasSpace(b, c)
      );
      
      // If no protected houses available, try any house or HQ, or sleep in place near HQ
      if (protectedHouses.length === 0) {
        const anyHouse = (game.buildings as Building[]).filter(b => 
          (b.kind === 'house' || b.kind === 'bed' || b.kind === 'tent' || b.kind === 'hq') && 
          b.done && 
          !(b.kind === 'bed' && b.isMedicalBed && !needsMedicalBed) &&
          game.buildingHasSpace(b, c)
        );
        
        if (anyHouse.length > 0) {
          // Try any available house/HQ (with brief target lock to prevent flipping)
          const house = selectSleepTarget(anyHouse);
          if (!house) { changeState('seekTask', 'no bed available'); break; }
          const hc = game.centerOf(house);
          const distance = Math.hypot(hc.x - c.x, hc.y - c.y);
          
          if (distance <= 20) {
            if (game.tryEnterBuilding(c, house)) {
              c.hideTimer = 0;
              // Clear remembered target after success
              (c as any).sleepTarget = undefined;
              (c as any).sleepTargetLockUntil = 0;
              changeState('resting', 'sleeping in unprotected shelter');
            } else {
              // Entry failed (maybe filled meanwhile) - allow immediate re-pick
              (c as any).sleepTarget = undefined;
              (c as any).sleepTargetLockUntil = 0;
              game.releaseSleepReservation(c);
              // If can't enter, sleep nearby
              changeState('resting', 'sleeping outside shelter');
            }
          } else {
            game.moveAlongPath(c, dt, hc, 20);
          }
        } else {
          // No buildings available - sleep in place or move to HQ area for safety
          const hq = (game.buildings as Building[]).find(b => b.kind === 'hq');
          if (hq) {
            const hqCenter = game.centerOf(hq);
            const distToHQ = Math.hypot(hqCenter.x - c.x, hqCenter.y - c.y);
            if (distToHQ > 50) {
              // Move closer to HQ for safety
              game.moveAlongPath(c, dt, hqCenter, 40);
            } else {
              // Sleep in place near HQ
              changeState('resting', 'sleeping near HQ');
            }
          } else {
            // No HQ - just sleep in place
            changeState('resting', 'sleeping in place');
          }
        }
        
        // Timeout to prevent getting stuck
        if (c.stateSince > 15) {
          changeState('resting', 'sleep timeout - resting in place');
        }
        break;
      }
      
      if (!game.isNight()) { 
        changeState('seekTask', 'daybreak'); 
        break; 
      }
      
    // Improve house selection - prefer houses with more space and closer distance, but lock briefly once chosen
    let best = selectSleepTarget(protectedHouses);
    if (!best) { changeState('seekTask', 'no bed available'); break; }
    let hc = game.centerOf(best);
      
      // Use direct movement instead of pathfinding
      const dx = hc.x - c.x;
      const dy = hc.y - c.y;
      const distance = Math.hypot(dx, dy);
      const nearRect = (c.x >= best.x - 8 && c.x <= best.x + best.w + 8 && c.y >= best.y - 8 && c.y <= best.y + best.h + 8);
      
      if (distance <= 20 || nearRect) {
        if (game.tryEnterBuilding(c, best)) { 
          c.hideTimer = 0; 
      // Clear remembered target after success
      (c as any).sleepTarget = undefined;
      (c as any).sleepTargetLockUntil = 0;
          changeState('resting', 'fell asleep'); 
        } else {
          // Try another house with space, or HQ if available
      // Allow immediate re-pick if entry failed
      (c as any).sleepTarget = undefined;
      (c as any).sleepTargetLockUntil = 0;
          game.releaseSleepReservation(c);
          const alternatives = (game.buildings as Building[])
            .filter((b: Building) => b.done && game.buildingHasSpace(b, c) && (b.kind === 'house' || b.kind === 'bed' || b.kind === 'tent' || b.kind === 'hq') && !(b.kind === 'bed' && b.isMedicalBed && !needsMedicalBed));
          const next = selectSleepTarget(alternatives);
          if (next) { 
            best = next; 
            hc = game.centerOf(next); 
            /* retarget without clearing path */ 
          } else { 
            changeState('seekTask', 'no bed available'); 
          }
        }
      } else {
        // Move toward the house using pathfinding
        game.moveAlongPath(c, dt, hc, 20);
        
        // Add timeout for stuck colonists - if they've been trying to sleep for too long, give up
        if (c.stateSince > 15) { // 15 seconds timeout
          changeState('seekTask', 'sleep timeout');
        }
      }
      break;
    }
    case 'goToSleep': {
      const needsMedicalBed = game.colonistNeedsMedicalBed(c);
      // Seek houses or infirmaries for daytime rest when very tired
      const restBuildings = (game.buildings as Building[]).filter(b => 
        (b.kind === 'house' || b.kind === 'bed' || b.kind === 'infirmary' || b.kind === 'tent' || b.kind === 'hq') && 
        b.done && 
        !(b.kind === 'bed' && b.isMedicalBed && !needsMedicalBed) &&
        game.buildingHasSpace(b, c)
      );
      
      // Simple threshold: only give up if fatigue drops to exit threshold (20) or below
      const minTryTime = 2.0; // Try for at least 2 seconds
      const shouldGiveUp = (c.fatigue || 0) <= fatigueExitThreshold && c.stateSince >= minTryTime;
      
      if (restBuildings.length === 0) {
        game.releaseSleepReservation(c);
        // No rest buildings available, rest in place if very tired
        if (c.stateSince > 3.0) {
          if (shouldGiveUp) {
            changeState('seekTask', 'no rest buildings, fatigue recovered');
          } else {
            // Rest in place - reduce fatigue slowly
            c.fatigue = Math.max(0, (c.fatigue || 0) - dt * 2);
          }
        }
        break;
      }
      
      const chooseRestBuilding = (): Building | null => {
        if (c.reservedSleepFor && restBuildings.includes(c.reservedSleepFor)) {
          (c as any).sleepTarget = c.reservedSleepFor;
          (c as any).sleepTargetLockUntil = (c.t || 0) + 5.0;
          return c.reservedSleepFor;
        }
        const sorted = restBuildings
          .map(b => ({
            b,
            d: dist2(c as any, game.centerOf(b) as any),
            priority: (needsMedicalBed && b.kind === 'bed' && b.isMedicalBed) ? 0 : (b.kind === 'bed' ? 1 : 2)
          }))
          .sort((a, b) => (a.priority - b.priority) || (a.d - b.d));
        for (const { b } of sorted) {
          if (game.reserveSleepSpot(c, b)) {
            (c as any).sleepTarget = b;
            (c as any).sleepTargetLockUntil = (c.t || 0) + 5.0;
            return b;
          }
        }
        return null;
      };

      const best = chooseRestBuilding();
      if (!best) {
        if (shouldGiveUp) {
          changeState('seekTask', 'no available rest buildings, fatigue recovered');
        }
        break;
      }

      const bc = game.centerOf(best);
      const distance = Math.hypot(bc.x - c.x, bc.y - c.y);
      const nearRect = (c.x >= best.x - 8 && c.x <= best.x + best.w + 8 && c.y >= best.y - 8 && c.y <= best.y + best.h + 8);
      
      if (distance <= 20 || nearRect) {
        if (game.tryEnterBuilding(c, best)) { 
          c.hideTimer = 0; 
          changeState('resting', 'entered rest building');
        } else {
          game.releaseSleepReservation(c);
          const next = chooseRestBuilding();
          if (!next) {
            if (shouldGiveUp) {
              changeState('seekTask', 'no available rest buildings, fatigue recovered');
            }
          } else if (next !== best) {
            game.clearPath(c);
          }
        }
      } else {
        // Move toward the rest building using pathfinding
        game.moveAlongPath(c, dt, bc, 20);
        
        // If fatigue has recovered enough, give up the search
        if (shouldGiveUp) {
          changeState('seekTask', 'fatigue recovered while searching for rest');
        }
      }
      break;
    }
    case 'seekTask': {
      if (game.isNight()) { changeState('sleep', 'night time'); break; }
      if (!c.task || (c.task === 'idle' && Math.random() < 0.05)) {
        const oldTask = c.task;
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
        case 'cookWheat': changeState('cooking', 'assigned cooking task'); break;
        case 'storeBread': changeState('storingBread', 'assigned bread storage task'); break;
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
      // Check for night time even when idle - colonists should go to sleep
      if (game.isNight()) { 
        // Debug: Log when we catch a colonist being idle during night
        if (Math.random() < 0.1) {
          console.log(`Colonist was idle during night time, forcing sleep transition`);
        }
        changeState('sleep', 'night time while idle'); 
        break; 
      }
      
      const dst = c.target; if (!dst) { changeState('seekTask', 'no target'); break; }
      if (game.moveAlongPath(c, dt, dst, 8)) { c.task = null; c.target = null; game.clearPath(c); changeState('seekTask', 'reached target'); }
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
          changeState('seekTask', 'building complete');
        }
        break; 
      }
      
      const pt = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
      
      // Build-specific stuck detection and timeout
      if (c.stateSince > 15) {
        console.log(`Build task timeout after ${c.stateSince.toFixed(1)}s, abandoning building`);
        game.releaseBuildReservation(c);
        c.task = null;
        c.target = null;
        game.clearPath(c);
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
      
      if (game.moveAlongPath(c, dt, pt, 12)) {
        // Apply equipment work speed bonuses (Construction) and skill multiplier
        const equipMult = (game as any).getWorkSpeedMultiplier ? (game as any).getWorkSpeedMultiplier(c, 'Construction') : 1;
        const lvl = c.skills ? skillLevel(c, 'Construction') : 0;
        const skillMult = skillWorkSpeedMultiplier(lvl);
        const workMult = equipMult * skillMult;
        b.buildLeft -= 25 * dt * workMult;
        // Grant construction XP over time while actively building
        if (c.skills) {
          // Base XP per second while building
          grantSkillXP(c, 'Construction', 6 * dt, c.t || 0);
        }
        if (b.buildLeft <= 0) {
          b.done = true; 
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
          // Farms now produce wheat instead of food
          const harvested = game.addResource('wheat', Math.round(10 * yieldMult));
          if (harvested > 0) {
            game.msg(`Farm harvested (+${harvested} wheat)`, 'good');
          }
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
        // Only switch to seekTask if we've been in this state for at least a short duration
        if (c.stateSince >= 0.5) {
          if (t && game.assignedTargets.has(t)) game.assignedTargets.delete(t); 
          c.task = null; c.target = null; game.clearPath(c); changeState('seekTask', 'tree gone');
        }
        break; 
      }
      
      // Simplified approach: move directly toward the tree
      const dx = t.x - c.x;
      const dy = t.y - c.y;
      const distance = Math.hypot(dx, dy);
      const interact = (t.r || 12) + c.r + 4;
      const slack = 2.5;
      
      if (distance <= interact + slack + 0.1) {
        // Close enough to chop
        const equipMult = (game as any).getWorkSpeedMultiplier ? (game as any).getWorkSpeedMultiplier(c, 'Woodcutting') : 1;
        const plantsLvl = c.skills ? skillLevel(c, 'Plants') : 0; // use Plants for woodcutting
        const skillMult = skillWorkSpeedMultiplier(plantsLvl);
        const workMult = equipMult * skillMult;
        t.hp -= 18 * dt * workMult;
        if (c.skills) grantSkillXP(c, 'Plants', 4 * dt, c.t || 0); // trickle while chopping
        if (t.hp <= 0) {
          const yieldMult = 1 + Math.min(0.5, plantsLvl * 0.02);
          const collected = game.addResource('wood', Math.round(6 * yieldMult));
          (game.trees as any[]).splice((game.trees as any[]).indexOf(t), 1);
          if (game.assignedTargets.has(t)) game.assignedTargets.delete(t);
          if (collected > 0) {
            game.msg(`+${collected} wood`, 'good');
          }
          // Rebuild navigation grid since tree was removed
          game.rebuildNavGrid();
          
          // Only switch to seekTask if we've been in this state for at least a short duration
          if (c.stateSince >= 0.5) {
            c.task = null; c.target = null; game.clearPath(c); changeState('seekTask', 'chopped tree');
          }
        }
        break;
      } else {
        // Move toward the tree using pathfinding
        game.moveAlongPath(c, dt, t, interact + slack);
        
        // Track progress to detect if we're making movement towards the tree - TEMPORARILY DISABLED
        if (!c.lastDistToNode) c.lastDistToNode = distance;
        
        // If we've been trying for more than 5 seconds and not getting closer, try clearing path - TEMPORARILY DISABLED
        /*
        if (c.stateSince > 5.0 && Math.abs(distance - c.lastDistToNode) < 2) {
          c.jitterScore = (c.jitterScore || 0) + 1;
          if (c.jitterScore > 120) { // 2 seconds of no progress (at 60fps)
            console.log(`Chop task stuck, clearing path and retrying`);
            game.clearPath(c);
            c.jitterScore = 0;
          }
        } else {
          c.jitterScore = 0;
        }
        */
        c.lastDistToNode = distance;
      }

      // If stuck too long, abandon (increased from 10 to 20 seconds)
      if (c.stateSince && c.stateSince > 20) {
        console.log(`Chop task timeout after ${c.stateSince.toFixed(1)}s, abandoning tree`);
        if (game.assignedTargets.has(t)) game.assignedTargets.delete(t);
        c.task = null; c.target = null; game.clearPath(c); changeState('seekTask', 'chop timeout');
      }
      break;
    }
    case 'mine': {
      const r = c.target as any; 
      if (!r || r.hp <= 0) {
        // Only switch to seekTask if we've been in this state for at least a short duration
        if (c.stateSince >= 0.5) {
          if (r && game.assignedTargets.has(r)) game.assignedTargets.delete(r); 
          c.task = null; c.target = null; game.clearPath(c); changeState('seekTask', 'rock gone');
        }
        break; 
      }
      
      // Simplified approach: move directly toward the rock
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
          const collected = game.addResource('stone', Math.round(5 * yieldMult));
          (game.rocks as any[]).splice((game.rocks as any[]).indexOf(r), 1);
          if (game.assignedTargets.has(r)) game.assignedTargets.delete(r);
          if (collected > 0) {
            game.msg(`+${collected} stone`, 'good');
          }
          // Rebuild navigation grid since rock was removed
          game.rebuildNavGrid();
          
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
      break;
    }
    case 'waitingAtDoor': {
      // Colonist is waiting for a door to open
      const door = c.waitingForDoor;
      if (!door || door.kind !== 'door' || !door.done) {
        // Door was destroyed or doesn't exist
        c.waitingForDoor = null;
        c.doorWaitStart = undefined;
        changeState('seekTask', 'door no longer exists');
        break;
      }
      
      // Check if door is now passable
      if (isDoorPassable(door)) {
        // Door is open, can proceed
        if (c.id) {
          releaseDoorQueue(door, c.id);
        }
        c.waitingForDoor = null;
        c.doorWaitStart = undefined;
        
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
          changeState('move', 'door opened, resuming movement');
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
          c.task = null;
          c.target = null;
          game.clearPath && game.clearPath(c);
          changeState('seekTask', 'door wait timeout');
        }
      }
      break;
    }
    
    case 'cooking': {
      const stove = c.target as Building;
      if (!stove || stove.kind !== 'stove' || !stove.done) {
        // Stove was destroyed or doesn't exist
        c.task = null;
        c.target = null;
        game.clearPath(c);
        changeState('seekTask', 'stove no longer available');
        break;
      }
      
      const pt = { x: stove.x + stove.w / 2, y: stove.y + stove.h / 2 };
      const distance = Math.hypot(c.x - pt.x, c.y - pt.y);
      
      // Move to the stove
      if (distance > 20) {
        game.moveAlongPath(c, dt, pt, 20);
        break;
      }
      
      // At the stove - cooking workflow
      // Step 1: Pick up wheat if not carrying any
      if (!c.carryingWheat || c.carryingWheat === 0) {
        if ((game.RES.wheat || 0) >= 5) {
          // Take wheat from global resources
          game.RES.wheat = (game.RES.wheat || 0) - 5;
          c.carryingWheat = 5;
          stove.cookingColonist = c.id;
          game.msg(`${c.profile?.name || 'Colonist'} picked up 5 wheat`, 'info');
        } else {
          // No wheat available
          c.task = null;
          c.target = null;
          changeState('seekTask', 'no wheat available');
          break;
        }
      }
      
      // Step 2: Put wheat in stove and start cooking
      if (c.carryingWheat > 0 && (!stove.wheatStored || stove.wheatStored === 0)) {
        stove.wheatStored = c.carryingWheat;
        c.carryingWheat = 0;
        stove.cookingProgress = 0;
        game.msg(`${c.profile?.name || 'Colonist'} started cooking`, 'info');
      }
      
      // Step 3: Cook the wheat (takes 10 seconds)
      if (stove.wheatStored && stove.wheatStored > 0 && stove.cookingProgress !== undefined) {
        // Cooking skill affects speed
        const cookingLvl = c.skills ? skillLevel(c, 'Cooking') : 0;
        const skillMult = skillWorkSpeedMultiplier(cookingLvl);
        const cookSpeed = 0.1 * skillMult; // Base 10 seconds to cook
        
        stove.cookingProgress += cookSpeed * dt;
        
        // Grant cooking XP while cooking
        if (c.skills) grantSkillXP(c, 'Cooking', 3 * dt, c.t || 0);
        
        if (stove.cookingProgress >= 1.0) {
          // Cooking complete! Convert wheat to bread
          const breadProduced = Math.floor(stove.wheatStored / 5) * 3; // 5 wheat = 3 bread
          c.carryingBread = (c.carryingBread || 0) + breadProduced;
          stove.wheatStored = 0;
          stove.cookingProgress = 0;
          stove.cookingColonist = undefined;
          
          game.msg(`${c.profile?.name || 'Colonist'} cooked ${breadProduced} bread!`, 'good');
          if (c.skills) grantSkillXP(c, 'Cooking', 30, c.t || 0); // Bonus XP for completion
          
          // Now colonist needs to store the bread
          c.task = null;
          c.target = null;
          changeState('seekTask', 'finished cooking');
        }
      }
      
      // Timeout check
      if (c.stateSince > 30) {
        console.log(`Cooking task timeout after ${c.stateSince.toFixed(1)}s, abandoning`);
        stove.cookingColonist = undefined;
        c.task = null;
        c.target = null;
        changeState('seekTask', 'cooking timeout');
      }
      break;
    }
    
    case 'storingBread': {
      const pantry = c.target as Building;
      if (!pantry || pantry.kind !== 'pantry' || !pantry.done) {
        // Pantry was destroyed or doesn't exist - just add bread to global resources
        if (c.carryingBread && c.carryingBread > 0) {
          game.addResource('bread', c.carryingBread);
          c.carryingBread = 0;
        }
        c.task = null;
        c.target = null;
        changeState('seekTask', 'pantry no longer available');
        break;
      }
      
      const pt = { x: pantry.x + pantry.w / 2, y: pantry.y + pantry.h / 2 };
      const distance = Math.hypot(c.x - pt.x, c.y - pt.y);
      
      // Move to the pantry
      if (distance > 20) {
        game.moveAlongPath(c, dt, pt, 20);
        break;
      }
      
      // At the pantry - store the bread
      if (c.carryingBread && c.carryingBread > 0) {
        pantry.breadStored = (pantry.breadStored || 0) + c.carryingBread;
        game.addResource('bread', c.carryingBread);
        game.msg(`${c.profile?.name || 'Colonist'} stored ${c.carryingBread} bread`, 'good');
        c.carryingBread = 0;
        
        c.task = null;
        c.target = null;
        changeState('seekTask', 'bread stored');
      } else {
        // No bread to store
        c.task = null;
        c.target = null;
        changeState('seekTask', 'no bread to store');
      }
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
