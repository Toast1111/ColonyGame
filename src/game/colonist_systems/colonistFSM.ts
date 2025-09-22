import { dist2, norm, sub } from "../../core/utils";
import { WORLD } from "../constants";
import type { Building, Colonist, Enemy, ColonistState } from "../types";
import { initializeColonistHealth, healInjuries, updateHealthStats, calculateOverallHealth, updateHealthProgression } from "../health/healthSystem";
import { medicalSystem } from "../health/medicalSystem";

// Helper function to check if a position would collide with buildings
function wouldCollideWithBuildings(game: any, x: number, y: number, radius: number): boolean {
  for (const b of game.buildings) {
    // Skip HQ, paths, houses, and farms as they don't block movement
    if (b.kind === 'hq' || b.kind === 'path' || b.kind === 'house' || b.kind === 'farm' || !b.done) continue;
    
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
      // Mark for medical only if not already in a medical related state
      if (!['medical','seekMedical','medicalMultiple','resting','sleep'].includes(c.state || '')) {
        // Could set a flag for medical system to pick up
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
      // Clear work task/target when changing to non-work states to prevent navigation conflicts
      if (newState === 'sleep' || newState === 'flee' || newState === 'heal' || newState === 'goToSleep' || 
          newState === 'eat' || newState === 'resting' || newState === 'seekMedical' || 
          newState === 'medical' || newState === 'medicalMultiple') {
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
      
      // When fleeing from danger, remember the dangerous location
      if (newState === 'flee' && danger) {
        (c as any).dangerMemory = (c as any).dangerMemory || [];
        (c as any).dangerMemory.push({
          x: danger.x,
          y: danger.y,
          time: c.t,
          radius: 180 // Avoid area within 180 pixels of where danger was
        });
        // Keep only recent danger memories (last 20 seconds)
        (c as any).dangerMemory = (c as any).dangerMemory.filter((mem: any) => c.t - mem.time < 20);
      }
      
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
  const canChangeState = c.stateSince > minStateDuration || 
                        c.state === 'idle' || 
                        c.state === 'seekTask' ||
                        c.state === 'chop' ||
                        c.state === 'mine' ||
                        c.state === 'build' ||
                        c.state === 'harvest' ||
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
    
    // Medical needs - check if colonist needs treatment or can provide it
    if (!c.inside && !danger && c.health && c.health.totalPain > 0.2) {
      // Check if this colonist has medical skills (simplified check for now)
      const hasMedicalSkill = c.profile?.personality?.some(trait => 
        trait.toLowerCase().includes('medical') || 
        trait.toLowerCase().includes('doctor') || 
        trait.toLowerCase().includes('nurse')
      ) || false;
      const medicalSystem = (game as any).medicalSystem;
      
      if (hasMedicalSkill && medicalSystem) {
        // This colonist can provide medical care
        const availableJob = medicalSystem.assignMedicalJob(c);
        if (availableJob) {
          set('seekMedical', 92, 'can provide medical care');
        }
      } else if (medicalSystem) {
        // This colonist needs medical care
        const needsTreatment = medicalSystem.colonistNeedsTreatment(c);
        if (needsTreatment) {
          set('seekMedical', 90 + Math.min(10, c.health.totalPain * 30), 'needs medical treatment');
        }
      }
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
        case 'medical': return 95; // High priority for active medical work
        case 'seekMedical': return 92; // High priority to find medical work
        case 'medicalMultiple': return 94; // High priority for comprehensive care
        case 'heal': return 90;
        case 'sleep': return 80;
        case 'goToSleep': return 75;
        case 'eat': return 65;
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
    const intent = evaluateIntent();
    if (intent && intent.state !== c.state) {
      const critical = intent.state === 'flee' || intent.state === 'heal' || 
                      intent.state === 'seekMedical' || intent.state === 'medical' || intent.state === 'medicalMultiple' ||
                      (intent.state === 'sleep' && game.isNight());
      const curPrio = statePriority(c.state as ColonistState);
      const shouldSwitch = critical || (intent.prio > curPrio && canChangeState);
      if (shouldSwitch) changeState(intent.state, intent.reason);
    }
  }

  switch (c.state) {
    case 'resting': {
      c.hideTimer = Math.max(0, (c.hideTimer || 0) - dt);
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
    case 'seekMedical': {
      // Look for medical work to do
      const medicalJob = medicalSystem.findMedicalWork(c, game.colonists);
      if (medicalJob) {
        c.task = 'medical';
        (c as any).medicalJob = medicalJob;
        changeState('medical', 'found medical work');
      } else {
        // No medical work available, return to normal tasks
        changeState('seekTask', 'no medical work available');
      }
      break;
    }
    case 'medical': {
      const medicalJob = (c as any).medicalJob;
      if (!medicalJob) {
        changeState('seekTask', 'no medical job assigned');
        break;
      }

      // Find the patient
      const patient = game.colonists.find((col: any) => 
        (col as any).id === medicalJob.patientId
      );
      
      if (!patient || !patient.health) {
        changeState('seekTask', 'patient not found or healthy');
        (c as any).medicalJob = null;
        break;
      }

      // Move to patient
      const distance = Math.hypot(c.x - patient.x, c.y - patient.y);
      if (distance > 40) {
        game.moveAlongPath(c, dt, { x: patient.x, y: patient.y }, 40);
      } else {
        // Close enough to perform treatment
        if (c.stateSince > medicalJob.treatment.duration / 1000) {
          // Perform the treatment
          const success = medicalSystem.performTreatment(c, patient, medicalJob, dt);
          const treatmentName = medicalJob.treatment.name;
          
          if (success) {
            game.msg(`${c.profile?.name || 'Doctor'} successfully applied ${treatmentName}`, 'good');
          } else {
            game.msg(`${c.profile?.name || 'Doctor'} failed to apply ${treatmentName}`, 'warn');
          }
          
          medicalSystem.completeMedicalJob(medicalJob.id);
          (c as any).medicalJob = null;
          changeState('seekTask', 'treatment completed');
        }
      }
      break;
    }
    case 'medicalMultiple': {
      // Handle comprehensive medical care
      const targetData = c.target;
      if (!targetData?.patient) {
        changeState('seekTask', 'no patient for comprehensive care');
        break;
      }

      const patient = targetData.patient;
      if (!patient.health?.injuries?.length) {
        changeState('seekTask', 'patient has no injuries');
        (patient as any).needsComprehensiveCare = false;
        break;
      }

      // Move to patient
      const distance = Math.hypot(c.x - patient.x, c.y - patient.y);
      if (distance > 40) {
        game.moveAlongPath(c, dt, { x: patient.x, y: patient.y }, 40);
      } else {
        // Find next treatment needed
        const availableJobs = medicalSystem.findAvailableTreatments(patient, game.getColonistMedicalSkill(c));
        if (availableJobs.length > 0) {
          const nextJob = availableJobs[0]; // Take highest priority
          
          if (c.stateSince > nextJob.treatment.duration / 1000) {
            const success = medicalSystem.performTreatment(c, patient, nextJob, dt);
            const treatmentName = nextJob.treatment.name;
            
            if (success) {
              game.msg(`${c.profile?.name || 'Doctor'} applied ${treatmentName}`, 'good');
            } else {
              game.msg(`${c.profile?.name || 'Doctor'} failed ${treatmentName}`, 'warn');
            }
            
            // Reset timer for next treatment
            c.stateSince = 0;
          }
        } else {
          // No more treatments available
          (patient as any).needsComprehensiveCare = false;
          changeState('seekTask', 'comprehensive care completed');
        }
      }
      break;
    }
  case 'eat': {
      // Go to HQ, warehouse, or storage to eat
      const canEat = (game.RES.food || 0) > 0;
      
      // Debug: Log when colonist is in eat state (reduced frequency)
      if (Math.random() < 0.01) {
        console.log(`Colonist eating: food=${game.RES.food}, hunger=${c.hunger}, stateSince=${c.stateSince.toFixed(1)}`);
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

      // Find the nearest food source building
      const foodBuildings = game.buildings.filter((b: any) => 
        (b.kind === 'hq' || b.kind === 'warehouse' || b.kind === 'stock') && 
        b.done
        // Removed buildingHasSpace check - colonists don't need to enter food buildings
      );

      // Debug: Log available buildings (reduced frequency)
      if (Math.random() < 0.01) {
        console.log(`Food buildings found: ${foodBuildings.length}, buildings: ${foodBuildings.map((b: any) => b.kind).join(', ')}`);
      }

      if (foodBuildings.length === 0) {
        // No accessible food buildings, just eat on the spot if we've been waiting
        console.log(`No food buildings found! Available buildings: ${game.buildings.filter((b: any) => b.done).map((b: any) => b.kind).join(', ')}`);
        if (c.stateSince > 1.0) {
          game.RES.food -= 1;
          c.hunger = Math.max(0, (c.hunger || 0) - 60); // More filling meal
          c.hp = Math.min(100, c.hp + 2.5);
          changeState('seekTask', 'ate without building');
          console.log(`Colonist ate without building! Food remaining: ${game.RES.food}`);
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
            console.log(`Colonist successfully ate from storage`);
            game.RES.food = Math.max(0, game.RES.food - 1);
            c.hunger = Math.max(0, (c.hunger || 0) - 60);
            c.hp = Math.min(100, c.hp + 2.5);
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
        const house = (game.buildings as Building[]).find(b => b.kind === 'house' && b.done && game.buildingHasSpace(b) && dist2(game.centerOf(b) as any, tc as any) < range * range);
        if (house) { buildingDest = house; dest = game.centerOf(house); }
      }
      if (!dest) { const hq = (game.buildings as Building[]).find((b: Building) => b.kind === 'hq' && game.buildingHasSpace(b)); if (hq) { buildingDest = hq; dest = game.centerOf(hq); } }
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
            const choices = (game.buildings as Building[]).filter((b: Building) => b.done && game.buildingHasSpace(b) && (b.kind === 'house' || b.kind === 'hq'));
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
      // Persist target house briefly to avoid oscillation between similar choices
      const selectSleepTarget = (options: Building[]): Building | null => {
        if (!options.length) return null;
        const now = c.t || 0;
        const remembered: Building | undefined = (c as any).sleepTarget;
        const lockUntil: number = (c as any).sleepTargetLockUntil || 0;
        if (remembered && options.includes(remembered) && now < lockUntil) {
          return remembered;
        }
        // Compute best by available space and distance
        let best = options[0];
        let bestScore = -Infinity;
        for (const house of options) {
          const distance = dist2(c as any, game.centerOf(house) as any);
          const capacity = game.buildingCapacity(house);
          const current = game.insideCounts.get(house) || 0;
          const spaceAvailable = capacity - current;
          const score = spaceAvailable * 100 - Math.sqrt(distance);
          if (score > bestScore) { bestScore = score; best = house; }
        }
        // Remember choice for a short time to reduce thrashing
        (c as any).sleepTarget = best;
        (c as any).sleepTargetLockUntil = now + 3.0; // lock for 3s
        return best;
      };
      const protectedHouses = (game.buildings as Building[]).filter(b => b.kind === 'house' && b.done && game.isProtectedByTurret(b) && game.buildingHasSpace(b));
      
      // If no protected houses available, try any house or HQ, or sleep in place near HQ
      if (protectedHouses.length === 0) {
        const anyHouse = (game.buildings as Building[]).filter(b => (b.kind === 'house' || b.kind === 'hq') && b.done && game.buildingHasSpace(b));
        
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
          const next = (game.buildings as Building[])
            .filter((b: Building) => b.done && game.buildingHasSpace(b) && (b.kind === 'house' || b.kind === 'hq'))
            .sort((a: Building, b: Building) => dist2(c as any, game.centerOf(a) as any) - dist2(c as any, game.centerOf(b) as any))[0];
          if (next) { 
            const nc = game.centerOf(next); 
            best = next; 
            hc = nc; 
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
      // Seek houses or infirmaries for daytime rest when very tired
      const restBuildings = (game.buildings as Building[]).filter(b => 
        (b.kind === 'house' || b.kind === 'infirmary') && b.done && game.buildingHasSpace(b)
      );
      
      // Simple threshold: only give up if fatigue drops to exit threshold (20) or below
      const minTryTime = 2.0; // Try for at least 2 seconds
      const shouldGiveUp = (c.fatigue || 0) <= fatigueExitThreshold && c.stateSince >= minTryTime;
      
      if (restBuildings.length === 0) {
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
      
      // Find closest rest building
      let best = restBuildings[0]; 
      let bestD = dist2(c as any, game.centerOf(best) as any);
      for (let i = 1; i < restBuildings.length; i++) { 
        const d = dist2(c as any, game.centerOf(restBuildings[i]) as any); 
        if (d < bestD) { bestD = d; best = restBuildings[i]; } 
      }
      
      const bc = game.centerOf(best);
      const distance = Math.hypot(bc.x - c.x, bc.y - c.y);
      const nearRect = (c.x >= best.x - 8 && c.x <= best.x + best.w + 8 && c.y >= best.y - 8 && c.y <= best.y + best.h + 8);
      
      if (distance <= 20 || nearRect) {
        if (game.tryEnterBuilding(c, best)) { 
          c.hideTimer = 0; 
          changeState('resting', 'entered rest building');
        } else {
          // Try another building with space
          const next = restBuildings
            .filter((b: Building) => b !== best && game.buildingHasSpace(b))
            .sort((a: Building, b: Building) => dist2(c as any, game.centerOf(a) as any) - dist2(c as any, game.centerOf(b) as any))[0];
          if (next) { 
            const nc = game.centerOf(next); 
            game.clearPath(c); 
            // Continue trying to find rest
          } else { 
            // No buildings available - check if we should give up
            if (shouldGiveUp) {
              changeState('seekTask', 'no available rest buildings, fatigue recovered');
            }
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
        game.releaseBuildReservation(c); 
        c.task = null; 
        c.target = null; 
        game.clearPath(c); 
        changeState('seekTask', 'building complete'); 
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
  // Apply equipment work speed bonuses (Construction)
  const workMult = (game as any).getWorkSpeedMultiplier ? (game as any).getWorkSpeedMultiplier(c, 'Construction') : 1;
  b.buildLeft -= 25 * dt * workMult;
        if (b.buildLeft <= 0) {
          b.done = true; if (b.kind === 'farm') { b.growth = 0; b.ready = false; }
          
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
      if (!f) { c.task = null; c.target = null; game.clearPath(c); changeState('seekTask', 'no harvest target'); break; }
      
      // Check if farm is ready or if it's a well
      if (f.kind === 'farm' && !f.ready) { 
        c.task = null; c.target = null; game.clearPath(c); changeState('seekTask', 'farm not ready'); break; 
      }
      
      const pt = { x: f.x + f.w / 2, y: f.y + f.h / 2 };
      if (game.moveAlongPath(c, dt, pt, 12)) { 
        if (f.kind === 'farm') {
          f.ready = false; 
          f.growth = 0; 
          const harvested = game.addResource('food', 10);
          if (harvested > 0) {
            game.msg(`Farm harvested (+${harvested} food)`, 'good');
          }
        } else if (f.kind === 'well') {
          const collected = game.addResource('food', 5);
          if (collected > 0) {
            game.msg(`Well collected (+${collected} food)`, 'good');
          }
        }
        c.task = null; c.target = null; game.clearPath(c); changeState('seekTask', 'harvest complete'); 
      }
      break;
    }
    case 'chop': {
      const t = c.target as any; 
      if (!t || t.hp <= 0) { 
        if (t && game.assignedTargets.has(t)) game.assignedTargets.delete(t); 
        c.task = null; c.target = null; game.clearPath(c); changeState('seekTask', 'tree gone'); break; 
      }
      
      // Simplified approach: move directly toward the tree
      const dx = t.x - c.x;
      const dy = t.y - c.y;
      const distance = Math.hypot(dx, dy);
      const interact = (t.r || 12) + c.r + 4;
      const slack = 2.5;
      
      if (distance <= interact + slack + 0.1) {
        // Close enough to chop
  // Apply equipment work speed bonuses (Woodcutting)
  const workMult = (game as any).getWorkSpeedMultiplier ? (game as any).getWorkSpeedMultiplier(c, 'Woodcutting') : 1;
  t.hp -= 18 * dt * workMult;
        if (t.hp <= 0) {
          const collected = game.addResource('wood', 6);
          (game.trees as any[]).splice((game.trees as any[]).indexOf(t), 1);
          if (game.assignedTargets.has(t)) game.assignedTargets.delete(t);
          if (collected > 0) {
            game.msg(`+${collected} wood`, 'good');
          }
          // Rebuild navigation grid since tree was removed
          game.rebuildNavGrid();
          c.task = null; c.target = null; game.clearPath(c); changeState('seekTask', 'chopped tree');
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
        if (r && game.assignedTargets.has(r)) game.assignedTargets.delete(r); 
        c.task = null; c.target = null; game.clearPath(c); changeState('seekTask', 'rock gone'); break; 
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
  // Apply equipment work speed bonuses (Mining)
  const workMult = (game as any).getWorkSpeedMultiplier ? (game as any).getWorkSpeedMultiplier(c, 'Mining') : 1;
  r.hp -= 16 * dt * workMult;
        if (r.hp <= 0) {
          const collected = game.addResource('stone', 5);
          (game.rocks as any[]).splice((game.rocks as any[]).indexOf(r), 1);
          if (game.assignedTargets.has(r)) game.assignedTargets.delete(r);
          if (collected > 0) {
            game.msg(`+${collected} stone`, 'good');
          }
          // Rebuild navigation grid since rock was removed
          game.rebuildNavGrid();
          c.task = null; c.target = null; game.clearPath(c); changeState('seekTask', 'mined rock');
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
