// Example: Replacing FSM with RimWorld-style AI
// This shows how much simpler and more flexible the new system is

import { ColonistAI, ThinkNode, type ThinkResult } from './colonistAI';
import { RimWorldSystemManager } from '../rimWorldManager';

// OLD FSM APPROACH (Complex and Rigid)
class OldColonistFSM {
  updateFSM(colonist: any, game: any): void {
    switch (colonist.state) {
      case 'idle':
        // Look for work
        const job = game.rimWorld.assignHaulingJob(colonist.id, colonist.position);
        if (job) {
          colonist.state = 'hauling';
          colonist.currentJob = job;
          colonist.targetPosition = job.targetItem.position;
        }
        break;

      case 'hauling':
        if (this.isAtPosition(colonist, colonist.targetPosition)) {
          // Pick up item
          const result = game.rimWorld.pickupItems(colonist.currentJob.targetItem.id, 10);
          if (result.taken > 0) {
            colonist.state = 'hauling_delivery';
            colonist.targetPosition = colonist.currentJob.destination;
          } else {
            colonist.state = 'idle'; // Failed
          }
        } else {
          this.moveToward(colonist, colonist.targetPosition);
        }
        break;

      case 'hauling_delivery':
        if (this.isAtPosition(colonist, colonist.targetPosition)) {
          // Drop off item
          game.rimWorld.dropItems('wood', 10, colonist.targetPosition);
          colonist.state = 'idle';
          colonist.currentJob = null;
        } else {
          this.moveToward(colonist, colonist.targetPosition);
        }
        break;

      case 'construction':
        // Complex construction logic...
        break;

      case 'mining':
        // Complex mining logic...
        break;

      // ... many more states
    }
  }

  private isAtPosition(colonist: any, target: any): boolean {
    return Math.hypot(colonist.position.x - target.x, colonist.position.y - target.y) < 16;
  }

  private moveToward(colonist: any, target: any): void {
    const dx = target.x - colonist.position.x;
    const dy = target.y - colonist.position.y;
    const dist = Math.hypot(dx, dy);
    colonist.position.x += (dx / dist) * 2;
    colonist.position.y += (dy / dist) * 2;
  }
}

// NEW AI APPROACH (Simple and Flexible)
class NewColonistAI {
  private ai: ColonistAI;

  constructor(rimWorldManager: RimWorldSystemManager) {
    this.ai = new ColonistAI(rimWorldManager);
  }

  update(colonist: any): void {
    // That's it! The AI handles everything automatically
    this.ai.update(colonist);
  }

  // Easy to add player commands
  giveOrder(colonist: any, target: any, jobType: string): void {
    colonist.forcedJob = {
      type: jobType,
      target: target,
      steps: [
        { type: 'move', target: target, completed: false }
      ]
    };
  }

  // Easy to check status
  getStatus(colonist: any): string {
    const job = this.ai.getCurrentJob();
    if (!job) return 'idle';
    
    const progress = this.ai.getJobProgress();
    return `${job.type} (${Math.round(progress * 100)}%)`;
  }
}

// COMPARISON: Adding New Work Type

// OLD FSM: Need to modify multiple places
/*
1. Add new state to enum
2. Add case to switch statement  
3. Add transition logic from other states
4. Handle edge cases and failures
5. Update state machine diagram
6. Test all state combinations
*/

// NEW AI: Just add a new ThinkNode
class JobGiver_Mining extends ThinkNode {
  priority = 40;
  label = "Mining";

  tryGetJob(colonist: any, manager: RimWorldSystemManager): ThinkResult {
    // Find mining spots
    const miningSpots = this.findMiningSpots(colonist);
    if (miningSpots.length > 0) {
      return {
        job: {
          id: `mining_${Date.now()}`,
          type: 'mining',
          priority: 40,
          target: miningSpots[0],
          steps: [
            { type: 'move', target: miningSpots[0], completed: false },
            { type: 'work', target: miningSpots[0], duration: 5000, completed: false }
          ],
          currentStep: 0,
          assignedAt: Date.now()
        }
      };
    }
    return { job: null };
  }

  private findMiningSpots(colonist: any): any[] {
    // TODO: Find designated mining areas
    return [];
  }
}

// INTEGRATION EXAMPLE
export class GameWithNewAI {
  private rimWorld: RimWorldSystemManager;
  private colonistAIs = new Map<string, ColonistAI>();

  constructor(canvas: HTMLCanvasElement) {
    this.rimWorld = new RimWorldSystemManager({
      canvas: canvas,
      enableAutoHauling: true,
      defaultStockpileSize: 64,
      useEnhancedLogistics: true
    });
  }

  spawnColonist(x: number, y: number): any {
    const colonist = {
      id: `colonist_${Date.now()}`,
      position: { x, y },
      inventory: [],
      workSettings: {
        workPriorities: new Map([
          ['construction', 2],
          ['hauling', 3],
          ['mining', 1]
        ]),
        canDoWork: true,
        emergencyMode: false
      }
    };

    // Create AI for this colonist
    this.colonistAIs.set(colonist.id, new ColonistAI(this.rimWorld));

    return colonist;
  }

  update(): void {
    this.rimWorld.update();

    // Update all colonists with new AI system
    for (const colonist of this.getColonists()) {
      const ai = this.colonistAIs.get(colonist.id);
      if (ai) {
        ai.update(colonist);
      }
    }
  }

  // Player right-click command
  giveDirectOrder(colonist: any, position: { x: number, y: number }): void {
    // Force the colonist to move to this position
    colonist.forcedJob = {
      type: 'move_to',
      target: position,
      steps: [
        { type: 'move', target: position, completed: false }
      ]
    };

    // The AI will automatically pick this up on next update
  }

  // Get colonist status for UI
  getColonistStatus(colonist: any): string {
    const ai = this.colonistAIs.get(colonist.id);
    if (ai) {
      const job = ai.getCurrentJob();
      if (job) {
        const progress = ai.getJobProgress();
        return `${job.type} (${Math.round(progress * 100)}%)`;
      }
    }
    return 'idle';
  }

  private getColonists(): any[] {
    // Return your colonists array
    return [];
  }
}

// BENEFITS OF THE NEW SYSTEM:

/*
✅ No State Explosion
- Old: Need exponential states for combinations
- New: Linear think nodes, each handles one concern

✅ Easy to Extend  
- Old: Modify switch statement, add transitions
- New: Just add new ThinkNode class

✅ Natural Priorities
- Old: Hard-coded state transitions
- New: Automatic priority-based selection

✅ No Deadlocks
- Old: Can get stuck in invalid states
- New: Always falls back to idle behavior

✅ Interruption Support
- Old: Complex state transition logic
- New: Higher priority automatically interrupts

✅ Better Debugging
- Old: "What state is colonist in?"
- New: "What job is colonist doing and why?"

✅ Player Control
- Old: Force state changes
- New: Inject high-priority jobs

✅ Contextual Decisions
- Old: State only knows previous state
- New: ThinkNodes can consider entire game state
*/
