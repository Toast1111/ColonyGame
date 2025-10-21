import { dist2 } from "../core/utils";
import { T } from "../game/constants";
import type { Building, Enemy, Colonist } from "../game/types";
import { isDoorBlocking, isNearDoor, attackDoor } from "../game/systems/doorSystem";
import { computeEnemyPath } from "../core/pathfinding";
import { isMountainTile } from "../game/terrain";

// Helper function to check if a position would collide with buildings or mountains (for enemies)
function wouldCollideWithBuildings(game: any, x: number, y: number, radius: number): boolean {
  // Check mountain collision first
  const gx = Math.floor(x / T);
  const gy = Math.floor(y / T);
  if (game.terrainGrid && isMountainTile(game.terrainGrid, gx, gy)) {
    return true; // Mountains block enemies too
  }
  
  // Check building collisions
  for (const b of game.buildings) {
    // Enemies can walk through HQ, paths, houses, and farms, but not other buildings
    // Doors block enemies unless they're destroyed
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

const GOAL_REPATH_EPS = 48; // Increased threshold - only repath if target moves significantly
const PATH_NODE_EPS = 4;    // Smaller tolerance for reaching nodes (grid-aligned)
const PATH_SPEED_BONUS = 25;
const STUCK_RESET_TIME = 0.75;

function ensureEnemyPath(game: any, e: Enemy, target: { x: number; y: number }, dt: number): boolean {
  const enemyAny = e as any;
  const distToGoal = Math.hypot(target.x - e.x, target.y - e.y);
  if (distToGoal <= e.r + 4) {
    enemyAny.path = undefined;
    enemyAny.pathIndex = undefined;
    return false;
  }

  enemyAny.repath = Math.max(0, (enemyAny.repath ?? 0) - dt);
  const goal = enemyAny.pathGoal;
  const goalChanged = !goal || Math.hypot(goal.x - target.x, goal.y - target.y) > GOAL_REPATH_EPS;
  const pathInvalid = !enemyAny.path || enemyAny.pathIndex == null || enemyAny.pathIndex >= enemyAny.path.length;

  if (goalChanged || pathInvalid || (enemyAny.repath ?? 0) <= 0) {
    // Use the new grid-based pathfinding
    if (!game.grid) return false;
    const newPath = computeEnemyPath(
      game.grid, 
      e.x, 
      e.y, 
      target.x, 
      target.y
    );
    
    if (newPath && newPath.length) {
      // Remove nodes we're already past
      while (newPath.length && Math.hypot(newPath[0].x - e.x, newPath[0].y - e.y) < T * 0.25) {
        newPath.shift();
      }
      if (!newPath.length) {
        enemyAny.path = undefined;
        enemyAny.pathIndex = undefined;
        return false;
      }
      enemyAny.path = newPath;
      enemyAny.pathIndex = 0;
      enemyAny.pathGoal = { x: target.x, y: target.y };
      enemyAny.repath = 1.5 + Math.random() * 1.0; // Longer repath interval
      return true;
    }
    enemyAny.path = undefined;
    enemyAny.pathIndex = undefined;
    enemyAny.repath = 0.5 + Math.random() * 0.5;
    return false;
  }

  return true;
}

function moveEnemyAlongPath(game: any, e: Enemy, dt: number): number {
  const enemyAny = e as any;
  const path: { x: number; y: number }[] | undefined = enemyAny.path;
  const pathIndex: number = enemyAny.pathIndex ?? 0;

  if (!path || pathIndex >= path.length) {
    enemyAny.path = undefined;
    enemyAny.pathIndex = undefined;
    return 0;
  }

  const node = path[pathIndex];
  if (!node) {
    enemyAny.path = undefined;
    enemyAny.pathIndex = undefined;
    return 0;
  }

  const prevX = e.x;
  const prevY = e.y;
  const dx = node.x - e.x;
  const dy = node.y - e.y;
  const dist = Math.hypot(dx, dy);

  let speed = e.speed;
  if (game.grid) {
    const gx = Math.floor(e.x / T);
    const gy = Math.floor(e.y / T);
    if (gx >= 0 && gy >= 0 && gx < game.grid.cols && gy < game.grid.rows) {
      const idx = gy * game.grid.cols + gx;
      if (game.grid.cost[idx] <= 0.7) {
        speed += PATH_SPEED_BONUS;
      }
    }
  }

  // Apply stagger effect if enemy is staggered (speed reduced to 1/6th)
  const currentTime = performance.now() / 1000;
  if (e.staggeredUntil && e.staggeredUntil > currentTime) {
    speed = speed / 6;
  }
  
  // Apply stun effect if enemy is stunned (speed reduced to near zero)
  if ((e as any).stunnedUntil && (e as any).stunnedUntil > currentTime) {
    speed = speed * 0.1; // 90% reduction
  }

  const step = speed * dt;

  // Grid-aligned movement: smaller tolerance to ensure we hit node centers
  const tolerance = PATH_NODE_EPS;
  if (dist <= tolerance) {
    // Snap exactly to the node center for grid-aligned movement
    e.x = node.x;
    e.y = node.y;
    enemyAny.pathIndex = pathIndex + 1;
    if (enemyAny.pathIndex >= path.length) {
      enemyAny.path = undefined;
      enemyAny.pathIndex = undefined;
    }
  } else if (dist > 0) {
    // Move directly toward node center
    const inv = 1 / dist;
    const moveX = dx * inv * step;
    const moveY = dy * inv * step;
    
    // Check if we would overshoot - if so, snap to the node
    if (Math.hypot(moveX, moveY) >= dist) {
      e.x = node.x;
      e.y = node.y;
      enemyAny.pathIndex = pathIndex + 1;
      if (enemyAny.pathIndex >= path.length) {
        enemyAny.path = undefined;
        enemyAny.pathIndex = undefined;
      }
    } else {
      e.x += moveX;
      e.y += moveY;
    }
  }

  return Math.hypot(e.x - prevX, e.y - prevY);
}

function moveDirectlyWithCollision(game: any, e: Enemy, target: { x: number; y: number }, dt: number): boolean {
  const dx = target.x - e.x;
  const dy = target.y - e.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1e-3) return false;

  const step = e.speed * dt;
  const nx = dx / distance;
  const ny = dy / distance;

  const newX = e.x + nx * step;
  const newY = e.y + ny * step;

  if (!wouldCollideWithBuildings(game, newX, newY, e.r)) {
    e.x = newX;
    e.y = newY;
    return true;
  }

  const perpX = -ny;
  const perpY = nx;

  const slideRightX = e.x + perpX * step * 0.5;
  const slideRightY = e.y + perpY * step * 0.5;
  if (!wouldCollideWithBuildings(game, slideRightX, slideRightY, e.r)) {
    e.x = slideRightX;
    e.y = slideRightY;
    return true;
  }

  const slideLeftX = e.x - perpX * step * 0.5;
  const slideLeftY = e.y - perpY * step * 0.5;
  if (!wouldCollideWithBuildings(game, slideLeftX, slideLeftY, e.r)) {
    e.x = slideLeftX;
    e.y = slideLeftY;
    return true;
  }

  return false;
}

/**
 * Enemy FSM update
 * Added RimWorld-style melee cadence:
 *  - Enemies now perform discrete melee hits on a cooldown (meleeCd) instead of continuous DPS.
 *  - Must be effectively stationary (no significant movement this frame) to land a hit.
 *  - Applies to both attacking colonists and buildings.
 */
export function updateEnemyFSM(game: any, e: Enemy, dt: number) {
  // Track last position to detect movement for stationary attack requirement
  const lastPos = (e as any)._lastPos || { x: e.x, y: e.y };
  const movedDist = Math.hypot(e.x - lastPos.x, e.y - lastPos.y);
  (e as any)._lastPos = { x: e.x, y: e.y };
  const movedThisTick = movedDist > 0.5;

  // Melee cooldown (discrete hits) replacing continuous DPS application
  (e as any).meleeCd = Math.max(0, ((e as any).meleeCd || 0) - dt);
  const HQ = (game.buildings as Building[]).find(b => b.kind === 'hq')!;
  let tgt: any = HQ; let bestD = dist2(e as any, game.centerOf(HQ) as any);
  for (const c of game.colonists as Colonist[]) { const d = dist2(e as any, c as any); if (d < bestD) { bestD = d; tgt = c; } }
  const targetPos = (tgt as Building).w
    ? game.centerOf(tgt as Building)
    : { x: (tgt as Colonist).x, y: (tgt as Colonist).y };
  e.target = tgt;

  let distanceToTarget = Math.hypot(targetPos.x - e.x, targetPos.y - e.y);
  let attemptedPath = false;
  let pathDisplacement = 0;

  if (distanceToTarget > e.r + 4) {
    attemptedPath = ensureEnemyPath(game, e, targetPos, dt);
    if (attemptedPath) {
      pathDisplacement = moveEnemyAlongPath(game, e, dt);
      distanceToTarget = Math.hypot(targetPos.x - e.x, targetPos.y - e.y);
    }
  } else {
    (e as any).path = undefined;
    (e as any).pathIndex = undefined;
  }

  let directMoved = false;
  if (distanceToTarget > e.r + 4 && (pathDisplacement < 0.5 || !attemptedPath)) {
    // Check if there's a door in the way
    const nearbyDoor = (game.buildings as Building[]).find((b: Building) => 
      b.kind === 'door' && b.done && isDoorBlocking(b) && isNearDoor(e, b)
    );
    
    if (nearbyDoor) {
      // Enemy attacks the door instead of moving
      e.waitingForDoor = nearbyDoor;
      if (!e.doorWaitStart) {
        e.doorWaitStart = (game as any).time || 0;
      }
      
      // Attack the door if melee cooldown is ready
      if (!movedThisTick && (e as any).meleeCd <= 0) {
        const doorDestroyed = attackDoor(nearbyDoor, e.dmg, game);
        (e as any).meleeCd = 1.0;
        
        if (doorDestroyed) {
          e.waitingForDoor = null;
          e.doorWaitStart = undefined;
        }
      }
    } else {
      e.waitingForDoor = null;
      e.doorWaitStart = undefined;
      directMoved = moveDirectlyWithCollision(game, e, targetPos, dt);
    }
    
    if (!directMoved && attemptedPath && (e as any).path) {
      (e as any).stuckTimer = ((e as any).stuckTimer || 0) + dt;
      if ((e as any).stuckTimer > STUCK_RESET_TIME) {
        (e as any).path = undefined;
        (e as any).pathIndex = undefined;
        (e as any).repath = 0;
        (e as any).stuckTimer = 0;
      }
    } else if (attemptedPath) {
      (e as any).stuckTimer = 0;
    }
  } else if (attemptedPath) {
    (e as any).stuckTimer = 0;
  }

  if (!attemptedPath) {
    (e as any).stuckTimer = 0;
  }
  
  if ((tgt as Building).w) {
    const b = tgt as Building;
    if (game.pointInRect(e as any, b)) {
      // Only attack if stationary and cooldown elapsed
      if (!movedThisTick && (e as any).meleeCd <= 0) {
        b.hp -= e.dmg; // single hit
        (e as any).meleeCd = 1.0; // enemy swing every 1s
      }
      if (b.hp <= 0) {
        if (b.kind === 'hq') { game.lose(); } else { game.evictColonistsFrom(b); (game.buildings as Building[]).splice((game.buildings as Building[]).indexOf(b), 1); game.msg((b.name || b.kind) + ' destroyed', 'warn'); }
      }
    }
  } else {
    const c = tgt as Colonist; const d = Math.hypot(e.x - c.x, e.y - c.y);
    if (d < e.r + 8) {
      // Check if another enemy is already attacking this colonist (prevent stacking)
      const otherEnemyAttacking = (game.enemies as Enemy[]).some((other: Enemy) => {
        if (other === e) return false;
        const otherDist = Math.hypot(other.x - c.x, other.y - c.y);
        return otherDist < other.r + 8 && other.target === c;
      });
      
      if (otherEnemyAttacking) {
        // Another enemy is already attacking this colonist, don't stack
        return;
      }
      
      if (!movedThisTick && (e as any).meleeCd <= 0) {
        // Apply armor-aware damage with appropriate damage type (discrete hit)
        let damageType: 'cut' | 'bruise' | 'burn' | 'bite' | 'gunshot' | 'fracture' = 'bruise';
        const enemyColor = e.color?.toLowerCase() || '';
        if (enemyColor.includes('red') || enemyColor.includes('orange')) damageType = 'burn';
        else if (enemyColor.includes('green') || enemyColor.includes('brown')) damageType = 'bite';
        else if (e.dmg > 15) damageType = 'cut';
        if (typeof (game as any).applyDamageToColonist === 'function') {
          (game as any).applyDamageToColonist(c, e.dmg, damageType);
        } else {
          c.hp -= e.dmg;
        }
        (e as any).meleeCd = 1.0; // enemy swing cooldown
        if (c.hp <= 0) { c.alive = false; (game.colonists as Colonist[]).splice((game.colonists as Colonist[]).indexOf(c), 1); game.msg('A colonist has fallen', 'warn'); }
      }
    }
  }
}
