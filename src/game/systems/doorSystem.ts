import type { Building, Colonist, Enemy } from "../types";

// Door timing constants (in seconds)
const DOOR_OPEN_TIME = 2.0;      // Time to fully open
const DOOR_CLOSE_DELAY = 3.0;    // Time to wait before auto-closing
const DOOR_CLOSE_TIME = 2.0;     // Time to fully close

/**
 * Initialize a door when it's first built
 */
export function initializeDoor(door: Building) {
  if (door.kind !== 'door') return;
  
  door.doorState = 'closed';
  door.doorProgress = 0.0;
  door.doorOpenTime = 0.0;
  door.doorCloseDelay = 0.0;
  door.doorQueue = [];
}

/**
 * Check if a door is passable (fully open)
 */
export function isDoorPassable(door: Building): boolean {
  if (door.kind !== 'door' || !door.done) return false;
  return door.doorState === 'open' && (door.doorProgress ?? 0) >= 1;
}

/**
 * Check if a door blocks movement (closed or closing)
 */
export function isDoorBlocking(door: Building): boolean {
  if (door.kind !== 'door' || !door.done) return false;
  return door.doorState === 'closed' || door.doorState === 'closing';
}

/**
 * Check if an entity is near a door (within interaction range)
 * FIXED: Reduced range to prevent false triggers for passing colonists
 */
export function isNearDoor(entity: Colonist | Enemy, door: Building): boolean {
  if (door.kind !== 'door') return false;
  
  const doorCenterX = door.x + door.w / 2;
  const doorCenterY = door.y + door.h / 2;
  const distance = Math.hypot(entity.x - doorCenterX, entity.y - doorCenterY);
  
  // Reduced to 1.5 tiles to prevent false triggers for nearby colonists
  return distance < 48;
}

/**
 * Request a door to open for an entity
 * FIXED: Added validation to prevent duplicate entries and race conditions
 */
export function requestDoorOpen(door: Building, entity: Colonist | Enemy, entityType: 'colonist' | 'enemy') {
  if (door.kind !== 'door' || !door.done || !entity) return;
  
  // Ensure entity has an ID
  if (!entity.id) {
    entity.id = `${entityType}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Initialize queue if needed
  if (!door.doorQueue || !Array.isArray(door.doorQueue)) {
    door.doorQueue = [];
  }
  
  // Clean up any invalid entries first
  door.doorQueue = door.doorQueue.filter(e => e && e.id);
  
  // Check if already in queue
  const inQueue = door.doorQueue.some(e => e.id === entity.id);
  if (inQueue) return;
  
  // Add to queue
  door.doorQueue.push({ id: entity.id, type: entityType });
  
  // FIXED: Always reset close delay when adding entities, regardless of state
  if (door.doorState === 'open') {
    door.doorCloseDelay = DOOR_CLOSE_DELAY;
  }
  
  // Start opening if not already opening/open
  if (door.doorState === 'closed' || door.doorState === 'closing') {
    const wasClosing = door.doorState === 'closing';
    const currentProgress = door.doorProgress || 0;
    
    door.doorState = 'opening';
    
    // If we were closing, calculate the new opening time based on current progress
    if (wasClosing && currentProgress !== undefined) {
      door.doorOpenTime = (1 - currentProgress) * DOOR_OPEN_TIME;
    } else {
      door.doorOpenTime = 0;
    }
  }
}

/**
 * Find a blocking door near the provided entity. Returns the first closed door within the search radius.
 * FIXED: Reduced default radius to prevent false triggers
 */
export function findBlockingDoor(game: any, entity: Colonist | Enemy, radius = 48): Building | null {
  if (!game || !game.buildings) return null;

  const searchRadius = radius;
  const searchRadiusSq = searchRadius * searchRadius;

  for (const b of game.buildings as Building[]) {
    if (b.kind !== 'door' || !b.done) continue;
    if (!isDoorBlocking(b)) continue;

    const doorCenterX = b.x + b.w / 2;
    const doorCenterY = b.y + b.h / 2;
    const dx = entity.x - doorCenterX;
    const dy = entity.y - doorCenterY;

    if (dx * dx + dy * dy <= searchRadiusSq) {
      return b;
    }
  }

  return null;
}

/**
 * Remove an entity from the door queue (they passed through or gave up)
 * FIXED: Added validation to prevent race conditions
 */
export function releaseDoorQueue(door: Building, entityId: string) {
  if (door.kind !== 'door' || !entityId) return;
  
  // Ensure door queue exists
  if (!door.doorQueue || !Array.isArray(door.doorQueue)) {
    door.doorQueue = [];
    return;
  }
  
  // Check if entity was actually in the queue before removing
  const wasInQueue = door.doorQueue.some(e => e && e.id === entityId);
  if (!wasInQueue) return;
  
  // Remove entity from queue
  door.doorQueue = door.doorQueue.filter(e => e && e.id !== entityId);
  
  // FIXED: Only start close delay if queue is truly empty and door is fully open
  if (door.doorQueue.length === 0 && door.doorState === 'open' && (door.doorProgress || 0) >= 1.0) {
    door.doorCloseDelay = DOOR_CLOSE_DELAY;
  }
  
  // DEFENSIVE: If we somehow have no queue but door is in opening state, let it finish opening
  if (door.doorQueue.length === 0 && door.doorState === 'opening') {
    // Let the door finish opening naturally, it will transition to close delay in updateDoor
  }
}

/**
 * Update door state machine
 * FIXED: Added state validation and defensive programming to prevent visual bugs
 */
export function updateDoor(door: Building, dt: number, gameTime: number) {
  if (door.kind !== 'door' || !door.done) return;
  
  // Initialize if needed - check for any missing properties
  if (door.doorState === undefined || door.doorProgress === undefined || door.doorQueue === undefined) {
    initializeDoor(door);
  }
  
  // Ensure door queue exists and is valid
  if (!door.doorQueue || !Array.isArray(door.doorQueue)) {
    door.doorQueue = [];
  }
  
  // Clean up any invalid queue entries (entities that no longer exist)
  door.doorQueue = door.doorQueue.filter(entry => entry && entry.id);
  
  const queueLength = door.doorQueue.length;
  
  switch (door.doorState) {
    case 'closed':
      door.doorProgress = 0;
      // If there are queued entities, we should be opening
      if (queueLength > 0) {
        door.doorState = 'opening';
        door.doorOpenTime = 0;
      }
      break;
      
    case 'opening':
      door.doorOpenTime = (door.doorOpenTime || 0) + dt;
      door.doorProgress = Math.min(1, door.doorOpenTime / DOOR_OPEN_TIME);
      
      if (door.doorProgress >= 1) {
        door.doorState = 'open';
        door.doorProgress = 1.0; // Ensure exactly 1.0
        door.doorCloseDelay = DOOR_CLOSE_DELAY;
        door.doorOpenTime = 0; // Reset open time counter
      }
      break;
      
    case 'open':
      door.doorProgress = 1; // Force visual to stay open
      
      // FIXED: Improved queue-based state management
      if (queueLength === 0) {
        // Only start/continue closing if queue is truly empty
        if (door.doorCloseDelay === undefined || door.doorCloseDelay === null) {
          door.doorCloseDelay = DOOR_CLOSE_DELAY;
        }
        
        door.doorCloseDelay = Math.max(0, door.doorCloseDelay - dt);
        
        if (door.doorCloseDelay <= 0) {
          door.doorState = 'closing';
          door.doorOpenTime = 0;
          door.doorCloseDelay = 0; // Clear delay
        }
      } else {
        // FIXED: Always reset close delay when entities are in queue
        // This prevents the door from closing while entities are waiting
        door.doorCloseDelay = DOOR_CLOSE_DELAY;
      }
      break;
      
    case 'closing':
      door.doorOpenTime = (door.doorOpenTime || 0) + dt;
      door.doorProgress = Math.max(0, 1 - door.doorOpenTime / DOOR_CLOSE_TIME);
      
      // If someone requests while closing, switch back to opening
      if (queueLength > 0) {
        door.doorState = 'opening';
        door.doorOpenTime = (1 - door.doorProgress) * DOOR_OPEN_TIME;
      } else if (door.doorProgress <= 0) {
        door.doorState = 'closed';
        door.doorProgress = 0.0; // Ensure exactly 0.0
        door.doorOpenTime = 0; // Reset timer
        door.doorCloseDelay = 0; // Clear any lingering delay
      }
      break;
      
    default:
      // Invalid state - reset to closed
      console.warn(`Door at (${door.x}, ${door.y}) had invalid state: ${door.doorState}, resetting to closed`);
      initializeDoor(door);
      break;
  }
  
  // Additional validation: ensure progress is always in valid range
  door.doorProgress = Math.max(0, Math.min(1, door.doorProgress || 0));
}

/**
 * Check if a colonist should wait at a door
 */
export function shouldWaitAtDoor(colonist: Colonist, door: Building): boolean {
  if (door.kind !== 'door' || !door.done) return false;
  
  // If door is fully open, no need to wait
  if (isDoorPassable(door)) return false;
  
  // If colonist is near the door and it's not passable
  return isNearDoor(colonist, door);
}

/**
 * Get the visual opening amount (0 = closed, 1 = open) for rendering
 */
export function getDoorOpenAmount(door: Building): number {
  if (door.kind !== 'door') return 0;
  return door.doorProgress || 0;
}

/**
 * Handle colonist waiting for door to open
 * Returns true if colonist should continue movement, false if they should wait
 */
export function handleColonistWaitingForDoor(colonist: Colonist): boolean {
  if (!colonist.waitingForDoor) return true;
  
  const door = colonist.waitingForDoor;
  const doorValid = door && door.kind === 'door' && door.done;
  
  if (!doorValid) {
    // Door no longer exists or valid - clear waiting state
    if (door && door.doorQueue && colonist.id) {
      releaseDoorQueue(door, colonist.id);
    }
    colonist.waitingForDoor = null;
    colonist.doorWaitStart = undefined;
    colonist.doorPassingThrough = null;
    colonist.doorApproachVector = null;
    return true;
  } 
  
  if (isDoorBlocking(door)) {
    // Still blocked - request door open and continue waiting
    requestDoorOpen(door, colonist, 'colonist');
    if (!colonist.doorWaitStart) {
      colonist.doorWaitStart = colonist.t || 0;
    }
    return false; // Keep waiting
  } 
  
  // Door is now passable - waitingAtDoor state will clear flags this frame
  return false; // Let FSM handle transition
}

/**
 * Check for blocking doors ahead and setup waiting if needed
 * FIXED: Only trigger for doors that are directly in the colonist's path
 * Returns true if colonist should wait, false if they can continue
 */
export function checkForBlockingDoorAhead(colonist: Colonist, dx: number, dy: number, L: number, game: any): boolean {
  if (colonist.waitingForDoor || L <= 1e-3) return false;
  
  // Check if colonist's current path will intersect with any doors
  // Only check doors that are very close to the actual movement line
  for (const door of game.buildings as Building[]) {
    if (door.kind !== 'door' || !door.done || !isDoorBlocking(door)) continue;
    
    const doorCenterX = door.x + door.w / 2;
    const doorCenterY = door.y + door.h / 2;
    
    // Check if door is reasonably close to current position
    const doorDist = Math.hypot(doorCenterX - colonist.x, doorCenterY - colonist.y);
    if (doorDist > 64) continue; // Must be within 2 tiles
    
    // Calculate closest point on movement line to door center
    const moveEndX = colonist.x + dx;
    const moveEndY = colonist.y + dy;
    
    // Vector from start to end of movement
    const moveVecX = moveEndX - colonist.x;
    const moveVecY = moveEndY - colonist.y;
    const moveLength = Math.hypot(moveVecX, moveVecY);
    if (moveLength < 1) continue;
    
    // Vector from start to door
    const toDoorX = doorCenterX - colonist.x;
    const toDoorY = doorCenterY - colonist.y;
    
    // Project door position onto movement line
    const projectionLength = (toDoorX * moveVecX + toDoorY * moveVecY) / moveLength;
    
    // Only consider doors that are ahead of us (not behind)
    if (projectionLength < 0) continue;
    
    // Don't consider doors that are way beyond our current movement
    if (projectionLength > moveLength + 32) continue;
    
    // Calculate closest point on movement line
    const t = Math.max(0, Math.min(1, projectionLength / moveLength));
    const closestX = colonist.x + t * moveVecX;
    const closestY = colonist.y + t * moveVecY;
    
    // Distance from door center to movement line
    const lineDistance = Math.hypot(doorCenterX - closestX, doorCenterY - closestY);
    
    // STRICT CHECK: Door must be very close to the actual movement line
    const doorSize = Math.max(door.w, door.h);
    if (lineDistance > doorSize * 0.6) continue; // Must be within 60% of door size
    
    // This door is directly in our path - set up waiting
    requestDoorOpen(door, colonist, 'colonist');
    colonist.waitingForDoor = door;
    colonist.doorWaitStart = colonist.t || 0;
    colonist.doorPassingThrough = null;
    const approachX = colonist.x - doorCenterX;
    const approachY = colonist.y - doorCenterY;
    colonist.doorApproachVector = { x: approachX, y: approachY };
    return true; // Start waiting
  }
  
  return false;
}

/**
 * Handle colonist passing through door (cleanup after passing)
 * Returns true if colonist is still passing through, false if done
 */
export function handleColonistPassingThroughDoor(colonist: Colonist): boolean {
  if (!colonist.doorPassingThrough) return false;
  
  const door = colonist.doorPassingThrough;
  const doorValid = door && door.kind === 'door' && door.done;
  
  if (!doorValid) {
    // Door no longer valid - cleanup
    if (door && colonist.id) {
      releaseDoorQueue(door, colonist.id);
    }
    colonist.doorPassingThrough = null;
    colonist.doorApproachVector = null;
    return false;
  }
  
  const centerX = door.x + door.w / 2;
  const centerY = door.y + door.h / 2;
  const relX = colonist.x - centerX;
  const relY = colonist.y - centerY;
  const relDist = Math.hypot(relX, relY);
  const approach = colonist.doorApproachVector;
  const clearance = Math.max(door.w, door.h) * 0.5;
  const farThreshold = clearance * 4;
  let shouldRelease = false;

  if (approach) {
    const approachMag = Math.hypot(approach.x, approach.y);
    if (approachMag > 1e-3) {
      const dot = relX * approach.x + relY * approach.y;
      const denom = approachMag * Math.max(relDist, 1e-3);
      const normalizedDot = dot / denom;
      const crossedPlane = normalizedDot <= -0.15;
      const overshoot = relDist > approachMag + clearance * 0.6;
      shouldRelease = (crossedPlane && relDist >= clearance * 0.6) || overshoot || relDist >= farThreshold;
    } else {
      shouldRelease = relDist >= clearance;
    }
  } else {
    shouldRelease = relDist >= clearance;
  }

  if (shouldRelease) {
    if (door && colonist.id) {
      releaseDoorQueue(door, colonist.id);
    }
    colonist.doorPassingThrough = null;
    colonist.doorApproachVector = null;
    return false;
  }
  
  return true; // Still passing through
}

/**
 * Debug function to check for door state inconsistencies
 * Can be called from debug console to identify problematic doors
 */
export function debugDoorStates(game: any): void {
  if (!game || !game.buildings) return;
  
  const doors = game.buildings.filter((b: Building) => b.kind === 'door' && b.done);
  console.log(`=== Door State Debug (${doors.length} doors) ===`);
  
  for (const door of doors) {
    const progress = door.doorProgress || 0;
    const queueLen = door.doorQueue?.length || 0;
    const state = door.doorState || 'undefined';
    
    // Check for inconsistencies
    const issues: string[] = [];
    
    if (state === 'open' && progress < 0.99) {
      issues.push('VISUAL_BUG: state=open but progress<0.99');
    }
    if (state === 'closed' && progress > 0.01) {
      issues.push('VISUAL_BUG: state=closed but progress>0.01');
    }
    if (state === 'open' && queueLen === 0 && (door.doorCloseDelay || 0) > DOOR_CLOSE_DELAY + 1) {
      issues.push('STUCK_OPEN: no queue but excessive close delay');
    }
    if (!door.doorQueue || !Array.isArray(door.doorQueue)) {
      issues.push('INVALID_QUEUE: doorQueue is not an array');
    }
    
    if (issues.length > 0 || queueLen > 0) {
      console.log(`Door at (${door.x}, ${door.y}): state=${state}, progress=${progress.toFixed(2)}, queue=${queueLen}, issues=${issues.join(', ') || 'none'}`);
    }
  }
  
  console.log('=== End Door Debug ===');
}

/**
 * Enemy attack on door
 */
export function attackDoor(door: Building, damage: number, game: any): boolean {
  if (door.kind !== 'door' || !door.done) return false;
  
  door.hp -= damage;
  
  if (door.hp <= 0) {
    // Door is destroyed
    const index = game.buildings.indexOf(door);
    if (index !== -1) {
      game.buildings.splice(index, 1);
      game.msg('A door has been destroyed!', 'bad');
      
      // Rebuild nav grid
      if (game.rebuildNavGrid) {
        game.rebuildNavGrid();
      }
    }
    return true; // Door destroyed
  }
  
  return false; // Door still standing
}
