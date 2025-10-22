import { Building, Colonist, ColonistCommandIntent } from '../types';
import { dist2, rand } from '../../core/utils';
import { releaseDoorQueue } from '../systems/doorSystem';
import { initializeWorkPriorities, getWorkTypeForTask } from '../systems/workPriority';
import type { Game } from '../Game';
import type { ReservationManager } from './ReservationManager';

/**
 * TaskManager
 * 
 * Handles colonist task assignment and work coordination:
 * - Task assignment with resource reservation
 * - Work giver integration
 * - Task picking with priority and distance sorting
 * - Path clearing on task changes
 * 
 * Extracted from Game.ts lines 2068-2280 as part of manager architecture refactor.
 */
export class TaskManager {
  constructor(
    private game: Game,
    private reservationManager: ReservationManager
  ) {}

  /**
   * Clear a colonist's pathfinding state
   */
  clearPath(c: Colonist) {
    c.path = undefined;
    c.pathIndex = undefined;
    if (c.pendingPathRequest) c.pendingPathRequest = undefined;
    if (c.pendingPathPromise) c.pendingPathPromise = null;
  }

  /**
   * Assign a task to a colonist with proper reservation handling
   */
  setTask(
    c: Colonist, 
    task: string, 
    target: any, 
    options?: { isPlayerCommand?: boolean; extraData?: any }
  ) {
    const isPlayerCommand = options?.isPlayerCommand ?? false;
    const extraData = options?.extraData;

    // Normalize high level commands into concrete tasks
    if (task === 'work') {
      if (target && typeof target === 'object' && 'buildLeft' in target && 
          typeof (target as any).buildLeft === 'number' && !(target as Building).done) {
        task = 'build';
      } else {
        task = 'goto';
      }
    }

    // Determine command intent
    let commandIntent: ColonistCommandIntent | null = null;
    switch (task) {
      case 'goto':
      case 'rest':
      case 'medical':
      case 'seekMedical':
      case 'guard':
        commandIntent = task;
        break;
      default:
        commandIntent = null;
        break;
    }

    // Release old reserved target
    if (c.target) {
      const oldTarget = c.target as any;
      // Handle mountain tile keys
      if (oldTarget.gx !== undefined && oldTarget.gy !== undefined) {
        this.reservationManager.releaseMountainTile(oldTarget.gx, oldTarget.gy);
      } else {
        this.reservationManager.releaseTarget(oldTarget);
      }
    }

    // Release old build reservation if changing away from that building
    if (c.reservedBuildFor && c.reservedBuildFor !== target) {
      this.reservationManager.releaseBuildReservation(c);
    }

    // Assign new task
    c.task = task;
    c.target = target;
    c.taskData = extraData ?? null;
    this.clearPath(c);

    // Reset any lingering door interactions when task changes
    const releaseDoorIfQueued = (door: any) => {
      if (!door || door.kind !== 'door' || !c.id) return;
      releaseDoorQueue(door, c.id);
    };
    if (c.waitingForDoor) {
      releaseDoorIfQueued(c.waitingForDoor);
    }
    if (c.doorPassingThrough && c.doorPassingThrough !== c.waitingForDoor) {
      releaseDoorIfQueued(c.doorPassingThrough);
    }
    c.waitingForDoor = null;
    c.doorPassingThrough = null;
    c.doorApproachVector = null;
    c.doorWaitStart = undefined;

    // Track direct-command metadata
    if (commandIntent) {
      c.commandIntent = commandIntent;
      c.commandData = extraData ?? null;
      if (commandIntent === 'guard') {
        if (target && typeof target === 'object' && 'x' in target && 'y' in target && !('w' in target)) {
          c.guardAnchor = { x: target.x, y: target.y };
        } else if (target && typeof target === 'object' && 'x' in target && 'y' in target && 
                   'w' in target && 'h' in target) {
          const building = target as Building;
          c.guardAnchor = { 
            x: building.x + building.w / 2, 
            y: building.y + building.h / 2 
          };
        } else {
          c.guardAnchor = null;
        }
      } else {
        c.guardAnchor = null;
      }
    } else {
      c.commandIntent = null;
      c.commandData = null;
      c.guardAnchor = null;
    }
    
    // Mark player-issued commands with a timestamp and expiration
    if (isPlayerCommand) {
      c.playerCommand = {
        issued: true,
        timestamp: c.t || 0,
        task: task,
        expires: (c.t || 0) + 300 // Commands expire after 5 minutes (300 seconds)
      };
    }
    
    // Reserve resources so only one colonist picks the same tree/rock/mountain
    const targetObj = target as any;
    if (targetObj && targetObj.type && (targetObj.type === 'tree' || targetObj.type === 'rock')) {
      this.reservationManager.reserveTarget(target);
    } else if (targetObj && targetObj.gx !== undefined && targetObj.gy !== undefined) {
      // Mountain tile assignment
      this.reservationManager.reserveMountainTile(targetObj.gx, targetObj.gy);
    }

    // Reserve a build slot
    if (task === 'build' && target && (target as Building).w != null && !c.reservedBuildFor) {
      this.reservationManager.reserveBuildSlot(c, target as Building);
    }
  }

  /**
   * Pick the best available task for a colonist based on work priorities
   */
  pickTask(c: Colonist) {
    // Ensure colonist has work priorities initialized
    if (!(c as any).workPriorities) {
      initializeWorkPriorities(c);
    }
    
    // During night time, don't assign new tasks - colonists should be sleeping
    if (this.game.isNight()) {
      this.setTask(c, 'idle', { x: c.x, y: c.y }); // FSM will handle sleep transition
      return;
    }
    
    // Build a list of available work with priorities
    const candidates: any[] = [];
    
    // Helper to get work priority
    const getWorkPriority = (workType: string): number => {
      const priorities = (c as any).workPriorities;
      if (!priorities || !priorities[workType]) return 3; // Default priority
      const p = priorities[workType];
      return p === 0 ? 999 : p; // 0 = disabled
    };
    
    // Helper to check if colonist can do work
    const canDoWork = (workType: string): boolean => {
      const priorities = (c as any).workPriorities;
      if (!priorities) return true;
      const p = priorities[workType];
      return p !== 0; // Can do if not disabled
    };
    
    // Gather candidates from Work Givers
    const produced = this.game.workGiverManager.getCandidates({
      game: this.game,
      colonist: c,
      getWorkPriority,
      canDoWork
    });
    if (produced && produced.length) candidates.push(...produced);
    
    // Sort candidates by priority (lower = better), then by work type affinity, then distance
    const currentWorkType = getWorkTypeForTask(c.task);
    
    candidates.sort((a, b) => {
      // First: Sort by priority (lower number = higher priority)
      if (a.priority !== b.priority) return a.priority - b.priority;
      
      // Second: Prefer continuing the same work type (work type affinity)
      if (currentWorkType) {
        const aIsSameType = a.workType === currentWorkType ? 1 : 0;
        const bIsSameType = b.workType === currentWorkType ? 1 : 0;
        if (aIsSameType !== bIsSameType) return bIsSameType - aIsSameType;
      }
      
      // Third: Sort by distance (closer is better)
      return a.distance - b.distance;
    });
    
    if (candidates.length > 0) {
      // Reachability-gated assignment: ensure we can reach the target before assigning
      const MAX_REACH_CHECKS = 5; // Budget path checks per assignment
      let assigned = false;
      
      for (let i = 0, checks = 0; i < candidates.length && checks < MAX_REACH_CHECKS; i++) {
        const cand = candidates[i];
        
        // Construction can be built from adjacent tiles; center may be blocked
        const skipCheck = cand.task === 'build';
        let reachable = true;
        
        if (!skipCheck) {
          // Identify a reasonable approach point (center for most targets)
          let tx: number | null = null, ty: number | null = null;
          const tgt: any = cand.target;
          if (tgt && typeof tgt.x === 'number' && typeof tgt.y === 'number') {
            if (typeof tgt.w === 'number' && typeof tgt.h === 'number') {
              tx = tgt.x + tgt.w / 2; 
              ty = tgt.y + tgt.h / 2;
            } else {
              tx = tgt.x; 
              ty = tgt.y;
            }
          }
          if (tx != null && ty != null) {
            checks++;
            try {
              const path = this.game.navigationManager.computePathWithDangerAvoidance(
                c, c.x, c.y, tx, ty
              );
              reachable = !!(path && path.length);
            } catch {
              reachable = false;
            }
          }
        }
        
        if (reachable) {
          this.setTask(c, cand.task, cand.target, { extraData: cand.extraData });
          assigned = true;
          // Debug logging
          if (Math.random() < 0.1) {
            console.log(`Colonist ${c.profile?.name || 'Unknown'} assigned ${cand.workType} (priority ${cand.priority}): ${cand.task}`);
          }
          break;
        }
      }
      
      if (!assigned) {
        // Fallback: if none validated within budget, assign the top candidate
        const bestWork = candidates[0];
        this.setTask(c, bestWork.task, bestWork.target, { extraData: bestWork.extraData });
        if (Math.random() < 0.05) {
          console.log(`Assigned without reachability validation due to budget: ${bestWork.task}`);
        }
      }
    } else {
      // No work available - idle
      this.setTask(c, 'idle', { x: c.x + rand(-80, 80), y: c.y + rand(-80, 80) });
      if (Math.random() < 0.05) {
        console.log(`Colonist ${c.profile?.name || 'Unknown'} has no available work (idling)`);
      }
    }
  }

  /**
   * Find nearest object in an array by distance
   */
  nearestCircle<T extends { x: number; y: number }>(
    p: { x: number; y: number }, 
    arr: T[]
  ): T | null {
    let best: T | null = null;
    let bestD = 1e9;
    for (const o of arr) {
      const d = dist2(p as any, o as any);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    return best;
  }
  
  /**
   * Find nearest safe object (danger memory system removed, just uses nearest)
   */
  nearestSafeCircle<T extends { x: number; y: number }>(
    c: Colonist, 
    p: { x: number; y: number }, 
    arr: T[]
  ): T | null {
    return this.nearestCircle(p, arr);
  }
}
