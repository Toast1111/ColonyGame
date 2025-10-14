import type { Building, Colonist, Enemy } from "../types";

// Door timing constants (in seconds)
const DOOR_OPEN_TIME = 2.0;      // Time to fully open
const DOOR_CLOSE_DELAY = 1.0;    // Time to wait before auto-closing
const DOOR_CLOSE_TIME = 2.0;     // Time to fully close

/**
 * Initialize a door when it's first built
 */
export function initializeDoor(door: Building) {
  if (door.kind !== 'door') return;
  
  door.doorState = 'closed';
  door.doorProgress = 0;
  door.doorOpenTime = 0;
  door.doorCloseDelay = 0;
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
 */
export function isNearDoor(entity: Colonist | Enemy, door: Building): boolean {
  if (door.kind !== 'door') return false;
  
  const doorCenterX = door.x + door.w / 2;
  const doorCenterY = door.y + door.h / 2;
  const distance = Math.hypot(entity.x - doorCenterX, entity.y - doorCenterY);
  
  // Within 3 tiles - increased to detect earlier
  return distance < 96;
}

/**
 * Request a door to open for an entity
 */
export function requestDoorOpen(door: Building, entity: Colonist | Enemy, entityType: 'colonist' | 'enemy') {
  if (door.kind !== 'door' || !door.done) return;
  
  // Ensure entity has an ID
  if (!entity.id) {
    entity.id = `${entityType}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Check if already in queue
  const inQueue = door.doorQueue?.some(e => e.id === entity.id);
  if (inQueue) return;
  
  // Add to queue
  if (!door.doorQueue) door.doorQueue = [];
  door.doorQueue.push({ id: entity.id, type: entityType });
  
  // Start opening if closed
  if (door.doorState === 'closed' || door.doorState === 'closing') {
    door.doorState = 'opening';
    door.doorOpenTime = 0;
  }
}

/**
 * Find a blocking door near the provided entity. Returns the first closed door within the search radius.
 */
export function findBlockingDoor(game: any, entity: Colonist | Enemy, radius = 96): Building | null {
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
 */
export function releaseDoorQueue(door: Building, entityId: string) {
  if (door.kind !== 'door' || !door.doorQueue) return;
  
  door.doorQueue = door.doorQueue.filter(e => e.id !== entityId);
  
  // If queue is empty, start close delay
  if (door.doorQueue.length === 0 && door.doorState === 'open') {
    door.doorCloseDelay = DOOR_CLOSE_DELAY;
  }
}

/**
 * Update door state machine
 */
export function updateDoor(door: Building, dt: number, gameTime: number) {
  if (door.kind !== 'door' || !door.done) return;
  
  // Initialize if needed
  if (door.doorState === undefined) {
    initializeDoor(door);
  }
  
  switch (door.doorState) {
    case 'closed':
      door.doorProgress = 0;
      break;
      
    case 'opening':
      door.doorOpenTime! += dt;
      door.doorProgress = Math.min(1, door.doorOpenTime! / DOOR_OPEN_TIME);
      
      if (door.doorProgress >= 1) {
        door.doorState = 'open';
        door.doorCloseDelay = DOOR_CLOSE_DELAY;
      }
      break;
      
    case 'open':
      door.doorProgress = 1;
      
      // Check if we should start closing
      if (door.doorQueue && door.doorQueue.length === 0) {
        door.doorCloseDelay = Math.max(0, (door.doorCloseDelay || 0) - dt);
        
        if (door.doorCloseDelay <= 0) {
          door.doorState = 'closing';
          door.doorOpenTime = 0;
        }
      } else {
        // Reset close delay if entities are still in queue
        door.doorCloseDelay = DOOR_CLOSE_DELAY;
      }
      break;
      
    case 'closing':
      door.doorOpenTime! += dt;
      door.doorProgress = Math.max(0, 1 - door.doorOpenTime! / DOOR_CLOSE_TIME);
      
      // If someone requests while closing, switch back to opening
      if (door.doorQueue && door.doorQueue.length > 0) {
        door.doorState = 'opening';
        door.doorOpenTime = (1 - door.doorProgress) * DOOR_OPEN_TIME;
      } else if (door.doorProgress <= 0) {
        door.doorState = 'closed';
      }
      break;
  }
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
