import { dist2, norm, sub } from "../core/utils";
import { WORLD } from "../game/constants";
import type { Building, Colonist, Enemy, ColonistState } from "../game/types";

// Helper function to check if a position would collide with buildings
function wouldCollideWithBuildings(game: any, x: number, y: number, radius: number): boolean {
  for (const b of game.buildings) {
    // Skip HQ, paths, and houses as they don't block movement
    if (b.kind === 'hq' || b.kind === 'path' || b.kind === 'house' || !b.done) continue;
    
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
      c.x = Math.max(0, Math.min(slideRightX, WORLD.w));
      c.y = Math.max(0, Math.min(slideRightY, WORLD.h));
      return false;
    }
    
    // Try sliding left
    const slideLeftX = c.x - perpDx * moveDistance * 0.5;
    const slideLeftY = c.y - perpDy * moveDistance * 0.5;
    if (!wouldCollideWithBuildings(game, slideLeftX, slideLeftY, c.r)) {
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
  if (!c.alive) return; c.t += dt;
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
  const hungerRate = working ? 0.25 : c.inside ? 0.1 : 0.15; // Much slower hunger accumulation - per second
  c.hunger = Math.max(0, Math.min(100, (c.hunger || 0) + dt * hungerRate));
  // Fatigue rises when active, falls when inside/resting (adjusted for balanced gameplay)
  const fatigueRise = working ? 0.8 : 0.3; // Much slower fatigue accumulation
  if (c.inside || c.state === 'resting' || c.state === 'sleep') c.fatigue = Math.max(0, (c.fatigue || 0) - dt * 8); // Slightly slower recovery too
  else c.fatigue = Math.min(100, (c.fatigue || 0) + dt * fatigueRise);
  // Movement penalty from fatigue
  (c as any).fatigueSlow = (c.fatigue || 0) > 66 ? 0.8 : (c.fatigue || 0) > 33 ? 0.9 : 1.0;
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

  const danger = (game.enemies as Enemy[]).find(e => dist2(e as any, c as any) < 140 * 140);
  c.lastHp = c.lastHp ?? c.hp;
  if (c.hp < c.lastHp) { c.hurt = 1.5; }
  c.lastHp = c.hp; c.hurt = Math.max(0, (c.hurt || 0) - dt);

  // Helper function to cleanly change state and clear conflicting task data
  function changeState(newState: ColonistState, reason?: string) {
    if (c.state !== newState) {
      // Clear work task/target when changing to non-work states to prevent navigation conflicts
      if (newState === 'sleep' || newState === 'flee' || newState === 'heal' || newState === 'goToSleep' || newState === 'eat' || newState === 'resting') {
        if (c.task && (c.task === 'chop' || c.task === 'mine' || c.task === 'build' || c.task === 'harvestFarm' || c.task === 'harvestWell')) {
          // Release any reservations for work tasks
          if (c.task === 'build' && c.target) {
            game.releaseBuildReservation && game.releaseBuildReservation(c);
          }
          if (c.target && game.assignedTargets && game.assignedTargets.has(c.target)) {
            game.assignedTargets.delete(c.target);
          }
          c.task = null;
          c.target = null;
          // Only clear path if we were doing a work task with pathfinding
          game.clearPath && game.clearPath(c);
        }
      }
      c.state = newState;
      c.stateSince = 0;
      if (reason && Math.random() < 0.1) {
        console.log(`Colonist state change: ${c.state} → ${newState} (${reason})`);
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

  // Critical states that can interrupt anything
  if (!c.inside && danger && c.state !== 'flee') { changeState('flee', 'danger detected'); }
  else if (!c.inside && !danger && game.isNight() && c.state !== 'sleep' && c.state !== 'flee' && canChangeState) { changeState('sleep', 'night time'); }
  // If gravely hurt (< 35 HP), seek infirmary
  else if (!c.inside && (c.hp || 0) < 35 && c.state !== 'flee' && canChangeState) { changeState('heal', 'low health'); }
  // If very tired (80+ fatigue), seek rest during day
  else if (!c.inside && !danger && !game.isNight() && (c.fatigue || 0) > 80 && c.state !== 'flee' && c.state !== 'heal' && c.state !== 'goToSleep' && canChangeState) { changeState('goToSleep', 'fatigue'); }
  // If hungry and we have food, prioritize eating (adjusted threshold for realistic meal frequency)
  else if (!c.inside && (c.hunger || 0) > 75 && (game.RES.food || 0) > 0 && c.state !== 'flee' && c.state !== 'eat' && canChangeState) { changeState('eat', 'hunger'); }
  else if (c.inside && c.state !== 'resting') { changeState('resting', 'entered building'); }

  switch (c.state) {
    case 'resting': {
      c.hideTimer = Math.max(0, (c.hideTimer || 0) - dt);
      // Rest recovers fatigue quickly and heals slowly
      c.hp = Math.min(100, c.hp + 1.2 * dt);
      const leave = (!game.isNight()) && (!danger && (c.hurt || 0) <= 0 && (c.hideTimer || 0) <= 0);
      if (leave) { game.leaveBuilding(c); c.safeTarget = null; c.safeTimer = 0; c.state = 'seekTask'; c.stateSince = 0; }
      break;
    }
    case 'heal': {
      // Find nearest infirmary
      const infirmaries = (game.buildings as Building[]).filter(b => b.kind === 'infirmary' && b.done);
      if (!infirmaries.length) { c.state = 'seekTask'; c.stateSince = 0; break; }
      let best = infirmaries[0]; let bestD = dist2(c as any, game.centerOf(best) as any);
      for (let i = 1; i < infirmaries.length; i++) { const d = dist2(c as any, game.centerOf(infirmaries[i]) as any); if (d < bestD) { bestD = d; best = infirmaries[i]; } }
      const ic = game.centerOf(best);
      const range = (best as any).healRange || 140;
      const nearRect = (c.x >= best.x - 8 && c.x <= best.x + best.w + 8 && c.y >= best.y - 8 && c.y <= best.y + best.h + 8);
      const dist = Math.hypot(c.x - ic.x, c.y - ic.y);
      // If close enough, try to enter (uses building capacity via popCap); else stand in heal radius
      if (nearRect && game.tryEnterBuilding(c as any, best as any)) {
        c.state = 'resting'; c.stateSince = 0; break;
      }
      if (dist <= range * 0.9) {
        // Wait and heal in aura; leave when healthy enough
        if (c.hp >= 80) { c.state = 'seekTask'; c.stateSince = 0; }
      } else {
        // Move toward infirmary center using pathfinding
        game.moveAlongPath(c, dt, ic, range * 0.9);
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
        c.state = game.isNight() ? 'sleep' : 'seekTask'; c.stateSince = 0;
        break;
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
          c.state = 'seekTask'; c.stateSince = 0;
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
          // Close enough to eat
          if (c.stateSince > 0.6) {
            console.log(`Colonist successfully ate! Food: ${game.RES.food} → ${game.RES.food - 1}, hunger: ${c.hunger} → ${Math.max(0, (c.hunger || 0) - 60)}`);
            game.RES.food -= 1;
            c.hunger = Math.max(0, (c.hunger || 0) - 60); // More filling meal
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
            c.hideTimer = 3; c.state = 'resting'; c.stateSince = 0;
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
      } else {
        const d = norm(sub(c as any, danger as any) as any); c.x += d.x * (c.speed + 90) * dt; c.y += d.y * (c.speed + 90) * dt;
      }
      if (!danger) { c.state = 'seekTask'; c.stateSince = 0; }
      break;
    }
    case 'sleep': {
      const protectedHouses = (game.buildings as Building[]).filter(b => b.kind === 'house' && b.done && game.isProtectedByTurret(b) && game.buildingHasSpace(b));
      if (!game.isNight() || protectedHouses.length === 0) { c.state = 'seekTask'; c.stateSince = 0; break; }
      let best = protectedHouses[0]; let bestD = dist2(c as any, game.centerOf(best) as any);
      for (let i = 1; i < protectedHouses.length; i++) { const d = dist2(c as any, game.centerOf(protectedHouses[i]) as any); if (d < bestD) { bestD = d; best = protectedHouses[i]; } }
      let hc = game.centerOf(best);
      
      // Use direct movement instead of pathfinding
      const dx = hc.x - c.x;
      const dy = hc.y - c.y;
      const distance = Math.hypot(dx, dy);
      const nearRect = (c.x >= best.x - 8 && c.x <= best.x + best.w + 8 && c.y >= best.y - 8 && c.y <= best.y + best.h + 8);
      
      if (distance <= 20 || nearRect) {
        if (game.tryEnterBuilding(c, best)) { c.hideTimer = 0; c.state = 'resting'; c.stateSince = 0; }
        else {
          // Try another house with space, or HQ if available
          const next = (game.buildings as Building[])
            .filter((b: Building) => b.done && game.buildingHasSpace(b) && (b.kind === 'house' || b.kind === 'hq'))
            .sort((a: Building, b: Building) => dist2(c as any, game.centerOf(a) as any) - dist2(c as any, game.centerOf(b) as any))[0];
          if (next) { const nc = game.centerOf(next); best = next; hc = nc; /* retarget without clearing path */ }
          else { c.state = 'seekTask'; c.stateSince = 0; }
        }
      } else {
        // Move toward the house using pathfinding
        game.moveAlongPath(c, dt, hc, 20);
      }
      break;
    }
    case 'goToSleep': {
      // Seek houses or infirmaries for daytime rest when very tired
      const restBuildings = (game.buildings as Building[]).filter(b => 
        (b.kind === 'house' || b.kind === 'infirmary') && b.done && game.buildingHasSpace(b)
      );
      
      if (restBuildings.length === 0) {
        // No rest buildings available, just rest in place briefly
        if (c.stateSince > 3.0) {
          c.state = 'seekTask'; c.stateSince = 0;
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
          c.state = 'resting'; 
          c.stateSince = 0; 
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
            // No buildings available, rest enough to continue working
            if ((c.fatigue || 0) < 60) {
              c.state = 'seekTask'; c.stateSince = 0; 
            }
          }
        }
      } else {
        // Move toward the rest building using pathfinding
        game.moveAlongPath(c, dt, bc, 20);
      }
      break;
    }
    case 'seekTask': {
      if (game.isNight()) { changeState('sleep', 'night time'); break; }
      if (!c.task || (c.task === 'idle' && Math.random() < 0.005)) {
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
        case 'idle': default: changeState('idle', 'no tasks available'); break;
      }
      break;
    }
    case 'idle': {
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
      
      // Track position for jitter detection
      const distToTarget = Math.hypot(c.x - pt.x, c.y - pt.y);
      if (!c.lastDistToNode) c.lastDistToNode = distToTarget;
      
      // Check for build jittering (not making progress)
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
      c.lastDistToNode = distToTarget;
      
      if (game.moveAlongPath(c, dt, pt, 12)) {
        b.buildLeft -= 25 * dt;
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
          game.releaseBuildReservation(c); c.task = null; c.target = null; c.state = 'seekTask';
        }
      }
      break;
    }
    case 'harvest': {
      const f = c.target as Building; 
      if (!f) { c.task = null; c.target = null; game.clearPath(c); c.state = 'seekTask'; break; }
      
      // Check if farm is ready or if it's a well
      if (f.kind === 'farm' && !f.ready) { 
        c.task = null; c.target = null; game.clearPath(c); c.state = 'seekTask'; break; 
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
        c.task = null; c.target = null; game.clearPath(c); c.state = 'seekTask'; 
      }
      break;
    }
    case 'chop': {
      const t = c.target as any; 
      if (!t || t.hp <= 0) { 
        if (t && game.assignedTargets.has(t)) game.assignedTargets.delete(t); 
        c.task = null; c.target = null; game.clearPath(c); c.state = 'seekTask'; break; 
      }
      
      // Simplified approach: move directly toward the tree
      const dx = t.x - c.x;
      const dy = t.y - c.y;
      const distance = Math.hypot(dx, dy);
      const interact = (t.r || 12) + c.r + 4;
      const slack = 2.5;
      
      if (distance <= interact + slack + 0.1) {
        // Close enough to chop
        t.hp -= 18 * dt;
        if (t.hp <= 0) {
          const collected = game.addResource('wood', 6);
          (game.trees as any[]).splice((game.trees as any[]).indexOf(t), 1);
          if (game.assignedTargets.has(t)) game.assignedTargets.delete(t);
          if (collected > 0) {
            game.msg(`+${collected} wood`, 'good');
          }
          // Rebuild navigation grid since tree was removed
          game.rebuildNavGrid();
          c.task = null; c.target = null; game.clearPath(c); c.state = 'seekTask';
        }
        break;
      } else {
        // Move toward the tree using pathfinding
        game.moveAlongPath(c, dt, t, interact + slack);
        
        // Track progress to detect if we're making movement towards the tree
        if (!c.lastDistToNode) c.lastDistToNode = distance;
        
        // If we've been trying for more than 5 seconds and not getting closer, try clearing path
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
        c.lastDistToNode = distance;
      }

      // If stuck too long, abandon (increased from 10 to 20 seconds)
      if (c.stateSince && c.stateSince > 20) {
        console.log(`Chop task timeout after ${c.stateSince.toFixed(1)}s, abandoning tree`);
        if (game.assignedTargets.has(t)) game.assignedTargets.delete(t);
        c.task = null; c.target = null; game.clearPath(c); c.state = 'seekTask';
      }
      break;
    }
    case 'mine': {
      const r = c.target as any; 
      if (!r || r.hp <= 0) { 
        if (r && game.assignedTargets.has(r)) game.assignedTargets.delete(r); 
        c.task = null; c.target = null; game.clearPath(c); c.state = 'seekTask'; break; 
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
  r.hp -= 16 * dt;
        if (r.hp <= 0) {
          const collected = game.addResource('stone', 5);
          (game.rocks as any[]).splice((game.rocks as any[]).indexOf(r), 1);
          if (game.assignedTargets.has(r)) game.assignedTargets.delete(r);
          if (collected > 0) {
            game.msg(`+${collected} stone`, 'good');
          }
          // Rebuild navigation grid since rock was removed
          game.rebuildNavGrid();
          c.task = null; c.target = null; game.clearPath(c); c.state = 'seekTask';
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
        c.task = null; c.target = null; game.clearPath(c); c.state = 'seekTask';
      }
      break;
    }
  }

  // basic separation to avoid stacking
  for (const o of game.colonists as Colonist[]) {
    if (o === c) continue; 
    
    // Skip separation if this colonist is actively mining or chopping (within interaction range)
    if ((c.state === 'mine' || c.state === 'chop') && c.target) {
      const interact = ((c.target as any).r || 12) + c.r + 4;
      const slack = 2.5;
      const d = Math.hypot(c.x - (c.target as any).x, c.y - (c.target as any).y);
      if (d <= interact + slack) continue; // Skip separation when actively working
    }
    
    const dx = c.x - o.x, dy = c.y - o.y; const d2 = dx * dx + dy * dy; const rr = (c.r + 2) * (c.r + 2);
    if (d2 > 0 && d2 < rr * 4) { const d = Math.sqrt(d2) || 1; const push = (rr * 2 - d) * 0.5; c.x += (dx / d) * push * dt * 6; c.y += (dy / d) * push * dt * 6; }
  }
}
