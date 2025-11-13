/**
 * ColonistNavigationManager - Handles colonist movement and navigation to various locations
 * 
 * Extracted from Game.ts lines 3235-3315 as part of the manager architecture refactor.
 * This manager handles sending colonists to specific locations and forcing colonist actions.
 * Also includes core pathfinding movement logic moved from Game.ts moveAlongPath method.
 */

import type { Colonist, Building } from '../types';
import type { Game } from '../Game';
import { T, WORLD } from '../constants';
import { handleColonistWaitingForDoor, checkForBlockingDoorAhead, handleColonistPassingThroughDoor } from '../systems/doorSystem';

export class ColonistNavigationManager {
  constructor(private game: Game) {}

  /**
   * Force a colonist to rest at the best available location
   */
  forceColonistToRest(colonist: Colonist, isPlayerCommand = false): void {
    // Undraft colonist to prevent combat interference during rest
    // This ensures colonists don't try to attack while going to bed
    if (colonist.isDrafted) {
      colonist.isDrafted = false;
      colonist.draftedTarget = null;
      colonist.draftedPosition = null;
    }
    
    // TODO: Replace with proper manager delegation once all managers are in Game class
    const needsMedical = (this.game as any).colonistNeedsMedicalBed?.(colonist) ?? false;
    const restBuilding = (this.game as any).findBestRestBuilding?.(colonist, { 
      preferMedical: needsMedical, 
      allowShelterFallback: true 
    });
    
    if (restBuilding) {
      this.game.taskManager.setTask(colonist, 'rest', restBuilding, { isPlayerCommand });
      const targetLabel = restBuilding.kind === 'bed' ? 
        (restBuilding.isMedicalBed ? 'medical bed' : 'bed') : 
        restBuilding.name || restBuilding.kind;
      this.game.msg(`${colonist.profile?.name || 'Colonist'} going to ${targetLabel}`, 'info');
    } else {
      this.game.msg('No available sleeping quarters', 'warn');
    }
  }

  /**
   * Force a colonist to eat food
   */
  forceColonistToEat(colonist: Colonist, isPlayerCommand = false): void {
    if (this.game.RES.food > 0) {
      // Mark as player command if forced by player
      if (isPlayerCommand) {
        colonist.playerCommand = {
          issued: true,
          timestamp: colonist.t || 0,
          task: 'eat',
          expires: (colonist.t || 0) + 60 // Eating command expires after 1 minute
        };
      }
      // Simulate eating
      colonist.hunger = Math.max(0, (colonist.hunger || 0) - 30);
      this.game.RES.food = Math.max(0, this.game.RES.food - 1);
      this.game.msg(`${colonist.profile?.name || 'Colonist'} eating food`, 'good');
    } else {
      this.game.msg('No food available', 'warn');
    }
  }

  /**
   * Send colonist to HQ building
   */
  sendColonistToHQ(colonist: Colonist): void {
    const hq = this.game.buildings.find(b => b.kind === 'hq');
    if (hq) {
      const target = { x: hq.x + hq.w/2, y: hq.y + hq.h/2 };
      this.game.taskManager.setTask(colonist, 'goto', target);
      this.game.msg(`${colonist.profile?.name || 'Colonist'} going to HQ`, 'info');
    }
  }

  /**
   * Send colonist to the safest available building (protected by turrets)
   */
  sendColonistToSafety(colonist: Colonist): void {
    // Find a building protected by turrets
    for (const building of this.game.buildings) {
      if (building.done && 
          (this.game as any).isProtectedByTurret?.(building) && 
          (this.game as any).buildingHasSpace?.(building)) {
        this.game.taskManager.setTask(colonist, 'goto', building);
        this.game.msg(`${colonist.profile?.name || 'Colonist'} going to safety`, 'info');
        return;
      }
    }
    // Fallback to HQ if no protected building found
    this.sendColonistToHQ(colonist);
  }

  /**
   * Send colonist to best available bed
   */
  sendColonistToBed(colonist: Colonist): void {
    // Undraft colonist to prevent combat interference during rest
    if (colonist.isDrafted) {
      colonist.isDrafted = false;
      colonist.draftedTarget = null;
      colonist.draftedPosition = null;
    }
    
    const preferMedical = (this.game as any).colonistNeedsMedicalBed?.(colonist) ?? false;
    const bed = (this.game as any).findBestRestBuilding?.(colonist, { 
      preferMedical, 
      allowShelterFallback: true 
    });

    if (bed) {
      this.game.taskManager.setTask(colonist, 'rest', bed);
      const label = bed.kind === 'bed' ? 
        (bed.isMedicalBed ? 'medical bed' : 'bed') : 'shelter';
      this.game.msg(`${colonist.profile?.name || 'Colonist'} going to ${label}`, 'info');
    } else {
      this.game.msg('No available beds', 'warn');
    }
  }

  /**
   * Send colonist to food storage
   */
  sendColonistToFood(colonist: Colonist): void {
    const storage = this.game.buildings.find(b => 
      (b.kind === 'warehouse' || b.kind === 'hq') && b.done
    );
    
    if (storage) {
      const target = { x: storage.x + storage.w/2, y: storage.y + storage.h/2 };
      this.game.taskManager.setTask(colonist, 'goto', target);
      this.game.msg(`${colonist.profile?.name || 'Colonist'} going to food storage`, 'info');
    } else {
      // Fallback to HQ if no storage found
      this.sendColonistToHQ(colonist);
    }
  }

  /**
   * Send colonist to a specific building by kind
   */
  sendColonistToBuilding(colonist: Colonist, buildingKind: string): Building | null {
    const building = this.game.buildings.find(b => b.kind === buildingKind && b.done);
    if (building) {
      const target = (this.game as any).centerOf?.(building) ?? { x: building.x + building.w/2, y: building.y + building.h/2 };
      this.game.taskManager.setTask(colonist, 'goto', target);
      this.game.msg(`${colonist.profile?.name || 'Colonist'} going to ${buildingKind}`, 'info');
      return building;
    } else {
      this.game.msg(`No ${buildingKind} available`, 'warn');
      return null;
    }
  }

  /**
   * Send colonist to nearest building of a specific type
   */
  sendColonistToNearestBuilding(colonist: Colonist, buildingKind: string): Building | null {
    // TODO: Replace with proper manager method
    let nearest: Building | null = null;
    let minDist = Infinity;
    for (const building of this.game.buildings) {
      if (building.kind === buildingKind && building.done) {
        const dist = Math.hypot(colonist.x - (building.x + building.w/2), colonist.y - (building.y + building.h/2));
        if (dist < minDist) {
          minDist = dist;
          nearest = building;
        }
      }
    }
    
    if (nearest) {
      const target = (this.game as any).centerOf?.(nearest) ?? { x: nearest.x + nearest.w/2, y: nearest.y + nearest.h/2 };
      this.game.taskManager.setTask(colonist, 'goto', target);
      this.game.msg(`${colonist.profile?.name || 'Colonist'} going to nearest ${buildingKind}`, 'info');
      return nearest;
    } else {
      this.game.msg(`No ${buildingKind} available`, 'warn');
      return null;
    }
  }

  /**
   * Send colonist to a specific position
   */
  sendColonistToPosition(colonist: Colonist, x: number, y: number, description?: string): void {
    const target = { x, y };
    this.game.taskManager.setTask(colonist, 'goto', target);
    const desc = description || `position (${x.toFixed(0)}, ${y.toFixed(0)})`;
    this.game.msg(`${colonist.profile?.name || 'Colonist'} going to ${desc}`, 'info');
  }

  /**
   * Make colonist guard a specific position
   */
  makeColonistGuard(colonist: Colonist, x?: number, y?: number): void {
    const guardPos = { x: x ?? colonist.x, y: y ?? colonist.y };
    this.game.taskManager.setTask(colonist, 'guard', guardPos, { isPlayerCommand: true });
    this.game.msg(`${colonist.profile?.name || 'Colonist'} guarding position`, 'info');
  }

  /**
   * Emergency evacuation - send all colonists to safest building
   */
  evacuateAllColonists(): void {
    const safeBuildings = this.game.buildings.filter(b => 
      b.done && 
      (this.game as any).isProtectedByTurret?.(b) &&
      (this.game as any).buildingHasSpace?.(b)
    );

    if (safeBuildings.length === 0) {
      this.game.msg('No safe buildings available for evacuation!', 'warn');
      return;
    }

    let evacuated = 0;
    for (const colonist of this.game.colonists) {
      if (colonist.alive) {
        // Assign to different safe buildings to spread them out
        const targetBuilding = safeBuildings[evacuated % safeBuildings.length];
        this.game.taskManager.setTask(colonist, 'goto', targetBuilding);
        evacuated++;
      }
    }

    this.game.msg(`Evacuated ${evacuated} colonists to safety!`, evacuated > 0 ? 'info' : 'warn');
  }

  /**
   * Core pathfinding movement logic - moved from Game.ts moveAlongPath method
   * This is the heart of colonist movement and navigation through the world.
   */
  moveAlongPath(c: Colonist, dt: number, target?: { x: number; y: number }, arrive = 10): boolean {
    // Check if colonist is using async pathfinding mode (via PathRequestQueue)
    const colonistAny = c as any;
    const useAsync = colonistAny.useAsyncPathfinding === true;

    // periodic re-pathing but only if goal changed or timer elapsed - REPATH TIMER TEMPORARILY DISABLED
    // c.repath = (c.repath || 0) - dt; // TEMPORARILY DISABLED
    const goalChanged = target && (!c.pathGoal || Math.hypot(c.pathGoal.x - target.x, c.pathGoal.y - target.y) > 24);
    if (target && (goalChanged || !c.path || c.pathIndex == null)) {
      if (useAsync) {
        const pending = colonistAny.pendingPathRequest as undefined | {
          targetX: number;
          targetY: number;
          requestId: number;
          startedAt: number;
          fallbackIssued?: boolean;
        };
        const samePendingTarget = pending
          ? Math.abs(pending.targetX - target.x) < 1 && Math.abs(pending.targetY - target.y) < 1
          : false;

        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (pending && pending.startedAt && now - pending.startedAt > 750 && !pending.fallbackIssued) {
          pending.fallbackIssued = true;
          const fallback = this.game.navigationManager.computePathWithDangerAvoidance(c, c.x, c.y, target.x, target.y);
          if (fallback && fallback.length) {
            colonistAny.pendingPathRequest = undefined;
            colonistAny.pendingPathPromise = null;
            c.path = fallback;
            c.pathIndex = 0;
            c.pathGoal = { x: target.x, y: target.y };
            return false;
          }
        }

        if (!samePendingTarget) {
          const requestId = (pending?.requestId ?? 0) + 1;
          const requestInfo = {
            targetX: target.x,
            targetY: target.y,
            requestId,
            startedAt: now,
            fallbackIssued: false,
          };
          colonistAny.pendingPathRequest = requestInfo;
          const promise = this.game.navigationManager.computePathWithDangerAvoidanceAsync(
            c,
            c.x,
            c.y,
            target.x,
            target.y
          );
          colonistAny.pendingPathPromise = promise;

          promise
            .then(path => {
              const current = (c as any).pendingPathRequest;
              if (!current || current.requestId !== requestId) {
                return;
              }

              (c as any).pendingPathRequest = undefined;
              (c as any).pendingPathPromise = null;

              let resolved = path ?? undefined;
              if (!resolved || !resolved.length) {
                resolved = this.game.navigationManager.computePathWithDangerAvoidance(c, c.x, c.y, target.x, target.y) ?? undefined;
              }

              if (resolved && resolved.length) {
                c.path = resolved;
                c.pathIndex = 0;
                c.pathGoal = { x: target.x, y: target.y };
              } else {
                this.clearPath(c);
              }
            })
            .catch(error => {
              const current = (c as any).pendingPathRequest;
              if (current && current.requestId === requestId) {
                (c as any).pendingPathRequest = undefined;
                (c as any).pendingPathPromise = null;
              }
              console.warn('[Game] Async pathfinding failed, using fallback:', error);
              const fallback = this.game.navigationManager.computePathWithDangerAvoidance(c, c.x, c.y, target.x, target.y);
              if (fallback && fallback.length) {
                c.path = fallback;
                c.pathIndex = 0;
                c.pathGoal = { x: target.x, y: target.y };
              }
            });
        }

        return false;
      }

      // Compute path immediately when not using async workers
      const p = this.game.computePathWithDangerAvoidance(c, c.x, c.y, target.x, target.y);
      if (p && p.length) {
        c.path = p;
        c.pathIndex = 0;
        c.pathGoal = { x: target.x, y: target.y };
      }
    }

    if (!c.path || c.pathIndex == null || c.pathIndex >= c.path.length) {
      if (target) { const d = Math.hypot(c.x - target.x, c.y - target.y); return d <= arrive; }
      return false;
    }
    // Use pathIndex to get current node
    const node = c.path[c.pathIndex];
    if (!node || node.x == null || node.y == null) {
      // Invalid node - clear path and return failure
      console.log(`Invalid path node at index ${c.pathIndex}, clearing path`);
      this.clearPath(c);
      if (target) { const d = Math.hypot(c.x - target.x, c.y - target.y); return d <= arrive; }
      return false;
    }
    const dx = node.x - c.x; const dy = node.y - c.y; let L = Math.hypot(dx, dy);

    // Handle door interactions before movement so colonists don't clip through
    if (!handleColonistWaitingForDoor(c)) {
      return false; // Still waiting for door
    }

    if (checkForBlockingDoorAhead(c, dx, dy, L, this.game)) {
      return false; // Started waiting for door ahead
    }

    // Hysteresis to avoid oscillation around a node
    const arriveNode = 15; // base arrival radius for nodes (increased from 10 to be more forgiving)
    const hysteresis = 6; // extra slack once we've been near a node (increased from 4)
    
    // Movement speed with terrain/floor modifiers
    let baseSpeed = c.speed * ((c as any).fatigueSlow || 1) * this.getMoveSpeedMultiplier(c);
    let speed = baseSpeed;
    let onPath = false;
    
    // Apply floor speed bonus based on terrain cost
    {
      const gx = Math.floor(c.x / T), gy = Math.floor(c.y / T);
      const inBounds = gx >= 0 && gy >= 0 && gx < this.game.grid.cols && gy < this.game.grid.rows;
      if (inBounds) {
        const idx = gy * this.game.grid.cols + gx;
        const tileCost = this.game.grid.cost[idx];
        
        // Speed is inversely proportional to cost
        // Cost of 1.0 (grass) = base speed
        // Cost of 0.5 (stone road) = 2x speed
        // Cost of 0.6 (dirt path) = 1.67x speed
        // Cost of 2.5 (mud) = 0.4x speed
        if (tileCost > 0 && tileCost < 1.0) {
          // On a fast surface (floor) - speed boost!
          speed = baseSpeed / tileCost;
          onPath = true;
        } else if (tileCost > 1.0) {
          // On slow terrain (mud, etc.) - speed penalty
          speed = baseSpeed / tileCost;
        }
        
        if (onPath && Math.random() < 0.01) { // 1% chance to log
          console.log(`Colonist at (${c.x.toFixed(1)}, ${c.y.toFixed(1)}) on floor - cost: ${tileCost.toFixed(2)}, speed: ${speed.toFixed(1)} (base: ${baseSpeed.toFixed(1)})`);
        }
      }
    }
    // STRICT TILE-CENTER MOVEMENT: Always snap to exact tile centers
    const step = speed * dt;
    const tileThreshold = 4; // Much smaller threshold for precise tile-center movement
    
    if (L <= Math.max(tileThreshold, step)) {
      // FORCE exact tile center positioning - no approximation
      c.x = node.x; 
      c.y = node.y;
      c.pathIndex++;
      // Don't shift the array, just use pathIndex to track position
      c.jitterScore = 0; c.jitterWindow = 0; c.lastDistToNode = undefined; (c as any).lastDistSign = undefined;
      if (c.pathIndex >= c.path.length) { c.path = undefined; c.pathIndex = undefined; if (target) return Math.hypot(c.x - target.x, c.y - target.y) <= arrive; return true; }
      return false;
    }

    // Jitter detection: only react to true oscillation (distance trend sign flip) when near the node
    c.jitterWindow = (c.jitterWindow || 0) + dt;
    if (c.lastDistToNode != null) {
      const delta = L - c.lastDistToNode;
      const sign = delta === 0 ? 0 : (delta > 0 ? 1 : -1);
      const prevSign = (c as any).lastDistSign ?? sign;
      // Count as jitter only if the distance trend flips while we're reasonably near the node
      if (sign !== 0 && prevSign !== 0 && sign !== prevSign && L < arriveNode + 15) { // Increased threshold from 10 to 15
        c.jitterScore = (c.jitterScore || 0) + 1;
      } else {
        c.jitterScore = Math.max(0, (c.jitterScore || 0) - 1);
      }
      (c as any).lastDistSign = sign;
    }
    c.lastDistToNode = L;
    if ((c.jitterScore || 0) >= 8 || (c.jitterWindow || 0) > 3.0) { // Increased thresholds to be less aggressive
      // If very close to node, just advance; otherwise, try a light replan once - PATHINDEX RE-ENABLED
      if (L < arriveNode + hysteresis) {
        c.pathIndex++;
        // Check bounds after increment to prevent accessing invalid nodes
        if (c.pathIndex >= c.path.length) {
          this.clearPath(c);
          if (target) return Math.hypot(c.x - target.x, c.y - target.y) <= arrive;
          return false;
        }
        // Don't shift array when using pathIndex
      } else if (target) {
        const p = this.game.computePath(c.x, c.y, target.x, target.y);
        if (p && p.length) { c.path = p; c.pathIndex = 0; } // PATHINDEX RE-ENABLED
      }
      c.jitterScore = 0; c.jitterWindow = 0; c.lastDistToNode = undefined; (c as any).lastDistSign = undefined;
      if (!c.path || c.pathIndex == null || c.pathIndex >= c.path.length) return false; // RE-ENABLED
    }

    // TILE-CENTER MOVEMENT: Move in straight lines between exact tile centers
    // Update direction for sprite facing (only if moving significantly)
    // Wait until colonist is actually moving before updating direction to prevent sprite "snapping"
    const moveDistance = step;
    if (L > moveDistance + 5) { // Only update direction if we're far enough from target to actually move
      c.direction = Math.atan2(dy, dx);
    }
    
    // Move directly toward the tile center with no deviation
    const moveX = (dx / (L || 1)) * step;
    const moveY = (dy / (L || 1)) * step;
    
    // Check for overshoot to prevent going past the tile center
    if (Math.hypot(moveX, moveY) >= L) {
      // Would overshoot - snap directly to tile center
      c.x = node.x;
      c.y = node.y;
      c.pathIndex++;
      if (c.pathIndex >= c.path.length) { 
        c.path = undefined; 
        c.pathIndex = undefined; 
      }
    } else {
      // Normal movement toward tile center
      c.x = Math.max(0, Math.min(c.x + moveX, WORLD.w));
      c.y = Math.max(0, Math.min(c.y + moveY, WORLD.h));
    }

    // Handle passing through door logic
    handleColonistPassingThroughDoor(c);

    return false;
  }

  /**
   * Clear colonist's path - delegate to TaskManager
   */
  private clearPath(c: Colonist) { 
    this.game.taskManager.clearPath(c); 
  }

  /**
   * Get movement speed multiplier - delegate to InventoryManager
   */
  private getMoveSpeedMultiplier(c: Colonist): number {
    return this.game.inventoryManager.getMoveSpeedMultiplier(c);
  }

  // Debug console methods (required by debugConsole.ts)
  enableNewPathfinding(): void {
    console.log('Tile-center pathfinding is now always enabled');
  }

  disableNewPathfinding(): void {
    console.log('Cannot disable tile-center pathfinding - it is the default behavior');
  }

  isUsingNewPathfinding(): boolean {
    return true; // Always using tile-center pathfinding
  }
}