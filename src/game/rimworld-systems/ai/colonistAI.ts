import type { Vec2 } from "../../../core/utils";
import type { RimWorldSystemManager } from "../rimWorldManager";

// Base class for all AI decision nodes (like RimWorld's ThinkNode)
export abstract class ThinkNode {
  abstract priority: number;
  abstract label: string;
  
  // Try to get a job for this colonist
  abstract tryGetJob(colonist: any, manager: RimWorldSystemManager): ThinkResult;
  
  // Check if this node can run for this colonist
  canRun(colonist: any): boolean {
    return true; // Override in subclasses
  }
}

export interface ThinkResult {
  job: ColonistJob | null;
  tag?: string;
  node?: ThinkNode;
}

export interface ColonistJob {
  id: string;
  type: string;
  priority: number;
  target?: any; // Item, position, building, etc.
  steps: JobStep[];
  currentStep: number;
  assignedAt: number;
  estimatedDuration?: number;
}

export interface JobStep {
  type: 'move' | 'pickup' | 'dropoff' | 'work' | 'wait';
  target?: Vec2 | any;
  duration?: number;
  completed: boolean;
  startTime?: number; // For timed steps
}

// Emergency situations (highest priority)
export class JobGiver_Emergency extends ThinkNode {
  priority = 100;
  label = "Emergency";

  tryGetJob(colonist: any, manager: RimWorldSystemManager): ThinkResult {
    // Check for fires, medical emergencies, etc.
    
    // For now, just handle critical hauling (food spoiling, etc.)
    const urgentItems = manager.floorItems.getAllItems().filter((item: any) => {
      if (item.type === 'food') {
        // Food left outside for too long
        const timeSinceDropped = Date.now() - (item.metadata?.droppedAt || 0);
        return timeSinceDropped > 60000; // 1 minute
      }
      return false;
    });

    if (urgentItems.length > 0) {
      const closest = this.findClosestItem(colonist, urgentItems);
      if (closest) {
        return {
          job: this.createHaulingJob(colonist, closest, 'emergency_haul'),
          tag: 'emergency'
        };
      }
    }

    return { job: null };
  }

  private findClosestItem(colonist: any, items: any[]): any {
    let closest = null;
    let closestDist = Infinity;
    
    for (const item of items) {
      const dist = this.getDistance(colonist.position, item.position);
      if (dist < closestDist) {
        closest = item;
        closestDist = dist;
      }
    }
    
    return closest;
  }

  private createHaulingJob(colonist: any, item: any, jobType: string): ColonistJob {
    const storage = this.findBestStorage(item);
    
    return {
      id: `${jobType}_${Date.now()}`,
      type: jobType,
      priority: 100,
      target: item,
      currentStep: 0,
      assignedAt: Date.now(),
      steps: [
        { type: 'move', target: item.position, completed: false },
        { type: 'pickup', target: item, completed: false },
        { type: 'move', target: storage, completed: false },
        { type: 'dropoff', target: storage, completed: false }
      ]
    };
  }

  private findBestStorage(item: any): Vec2 {
    // TODO: Find best stockpile zone
    return { x: 200, y: 200 }; // Default storage location
  }

  private getDistance(pos1: Vec2, pos2: Vec2): number {
    return Math.hypot(pos1.x - pos2.x, pos1.y - pos2.y);
  }
}

// Normal work assignments (medium priority)
export class JobGiver_Work extends ThinkNode {
  priority = 50;
  label = "Work";

  tryGetJob(colonist: any, manager: RimWorldSystemManager): ThinkResult {
    if (!colonist.workSettings?.canDoWork) {
      return { job: null };
    }

    // Use the enhanced logistics manager for RimWorld-style job assignment
    const haulingJob = manager.enhancedLogistics.tryAssignJob(colonist);
    if (haulingJob) {
      return {
        job: this.convertToColonistJob(haulingJob),
        tag: 'work'
      };
    }

    return { job: null };
  }

  private convertToColonistJob(haulingJob: any): ColonistJob {
    const steps: JobStep[] = [];

    if (haulingJob.targetItem) {
      // Hauling job
      steps.push(
        { type: 'move', target: haulingJob.targetItem.position, completed: false },
        { type: 'pickup', target: haulingJob.targetItem, completed: false }
      );

      if (haulingJob.destination) {
        steps.push(
          { type: 'move', target: haulingJob.destination, completed: false },
          { type: 'dropoff', target: haulingJob.destination, completed: false }
        );
      }
    } else if (haulingJob.targetPosition) {
      // Construction or other positional job
      steps.push(
        { type: 'move', target: haulingJob.targetPosition, completed: false },
        { type: 'work', target: haulingJob.targetPosition, duration: 3000, completed: false }
      );
    }

    return {
      id: haulingJob.id,
      type: haulingJob.workType || 'hauling',
      priority: haulingJob.priority,
      target: haulingJob.targetItem || haulingJob.targetPosition,
      steps,
      currentStep: 0,
      assignedAt: Date.now(),
      estimatedDuration: steps.length * 2000 // Rough estimate
    };
  }
}

// Recreation and idle behavior (low priority)
export class JobGiver_Idle extends ThinkNode {
  priority = 10;
  label = "Idle";

  tryGetJob(colonist: any, manager: RimWorldSystemManager): ThinkResult {
    // Create a simple wander job
    const wanderTarget = this.getRandomWanderTarget(colonist);
    
    return {
      job: {
        id: `idle_${Date.now()}`,
        type: 'wander',
        priority: 1,
        target: wanderTarget,
        steps: [
          { type: 'move', target: wanderTarget, completed: false },
          { type: 'wait', duration: 2000, completed: false }
        ],
        currentStep: 0,
        assignedAt: Date.now()
      },
      tag: 'idle'
    };
  }

  private getRandomWanderTarget(colonist: any): Vec2 {
    const range = 100;
    return {
      x: colonist.position.x + (Math.random() - 0.5) * range,
      y: colonist.position.y + (Math.random() - 0.5) * range
    };
  }
}

// Player-forced jobs (override priority)
export class JobGiver_PlayerForced extends ThinkNode {
  priority = 200; // Highest priority
  label = "Player Orders";

  tryGetJob(colonist: any, manager: RimWorldSystemManager): ThinkResult {
    if (!colonist.forcedJob) {
      return { job: null };
    }

    const job = colonist.forcedJob;
    colonist.forcedJob = null; // Clear after assigning

    return {
      job: {
        id: `forced_${Date.now()}`,
        type: job.type || 'forced',
        priority: 200,
        target: job.target,
        steps: job.steps || [
          { type: 'move', target: job.target, completed: false }
        ],
        currentStep: 0,
        assignedAt: Date.now()
      },
      tag: 'forced'
    };
  }
}

// Main AI controller (replaces the FSM)
export class ColonistAI {
  private thinkNodes: ThinkNode[] = [];
  private currentJob: ColonistJob | null = null;
  private jobExecutor: JobExecutor;

  constructor(private manager: RimWorldSystemManager) {
    // Initialize think nodes in priority order
    this.thinkNodes = [
      new JobGiver_PlayerForced(),
      new JobGiver_Emergency(),
      new JobGiver_Work(),
      new JobGiver_Idle()
    ].sort((a, b) => b.priority - a.priority);

    this.jobExecutor = new JobExecutor(manager);
  }

  // Main AI update (replaces FSM update)
  update(colonist: any): void {
    // Execute current job if we have one
    if (this.currentJob) {
      const jobResult = this.jobExecutor.executeJob(colonist, this.currentJob);
      
      if (jobResult.completed) {
        console.log(`${colonist.id} completed job: ${this.currentJob.type}`);
        this.currentJob = null;
      } else if (jobResult.failed) {
        console.log(`${colonist.id} failed job: ${this.currentJob.type}`);
        this.currentJob = null;
      }
      // If job is still in progress, continue executing it
      else {
        return; // Don't look for new jobs while executing current one
      }
    }

    // Look for new job if we don't have one
    this.findNewJob(colonist);
  }

  private findNewJob(colonist: any): void {
    for (const node of this.thinkNodes) {
      if (!node.canRun(colonist)) continue;

      try {
        const result = node.tryGetJob(colonist, this.manager);
        if (result.job) {
          console.log(`${colonist.id} assigned ${result.job.type} job (priority ${result.job.priority})`);
          this.currentJob = result.job;
          return;
        }
      } catch (error) {
        console.error(`Error in think node ${node.label}:`, error);
      }
    }
  }

  // Interrupt current job (for higher priority work)
  interruptJob(reason: string = 'interrupted'): void {
    if (this.currentJob) {
      console.log(`${reason}: interrupting ${this.currentJob.type}`);
      this.currentJob = null;
    }
  }

  // Force assign a specific job (player command)
  forceJob(job: Partial<ColonistJob>): void {
    this.interruptJob('player command');
    // The job will be picked up by JobGiver_PlayerForced on next update
  }

  getCurrentJob(): ColonistJob | null {
    return this.currentJob;
  }

  getJobProgress(): number {
    if (!this.currentJob) return 0;
    
    const completedSteps = this.currentJob.steps.filter(step => step.completed).length;
    return completedSteps / this.currentJob.steps.length;
  }
}

// Executes the steps of a job
export class JobExecutor {
  constructor(private manager: RimWorldSystemManager) {}

  executeJob(colonist: any, job: ColonistJob): { completed: boolean; failed: boolean; inProgress: boolean } {
    if (job.currentStep >= job.steps.length) {
      return { completed: true, failed: false, inProgress: false };
    }

    const currentStep = job.steps[job.currentStep];
    if (currentStep.completed) {
      job.currentStep++;
      return this.executeJob(colonist, job); // Move to next step
    }

    const stepResult = this.executeStep(colonist, currentStep);
    
    if (stepResult.completed) {
      currentStep.completed = true;
      job.currentStep++;
      
      // Check if all steps are done
      if (job.currentStep >= job.steps.length) {
        return { completed: true, failed: false, inProgress: false };
      }
    } else if (stepResult.failed) {
      return { completed: false, failed: true, inProgress: false };
    }

    return { completed: false, failed: false, inProgress: true };
  }

  private executeStep(colonist: any, step: JobStep): { completed: boolean; failed: boolean } {
    switch (step.type) {
      case 'move':
        return this.executeMove(colonist, step);
      case 'pickup':
        return this.executePickup(colonist, step);
      case 'dropoff':
        return this.executeDropoff(colonist, step);
      case 'work':
        return this.executeWork(colonist, step);
      case 'wait':
        return this.executeWait(colonist, step);
      default:
        console.warn(`Unknown step type: ${step.type}`);
        return { completed: true, failed: false };
    }
  }

  private executeMove(colonist: any, step: JobStep): { completed: boolean; failed: boolean } {
    if (!step.target) return { completed: false, failed: true };

    const target = step.target as Vec2;
    const distance = Math.hypot(colonist.position.x - target.x, colonist.position.y - target.y);
    
    if (distance < 16) { // Reached target
      return { completed: true, failed: false };
    }

    // Move toward target
    const speed = 2;
    const dx = target.x - colonist.position.x;
    const dy = target.y - colonist.position.y;
    const norm = Math.hypot(dx, dy);
    
    colonist.position.x += (dx / norm) * speed;
    colonist.position.y += (dy / norm) * speed;

    return { completed: false, failed: false };
  }

  private executePickup(colonist: any, step: JobStep): { completed: boolean; failed: boolean } {
    const item = step.target;
    if (!item) return { completed: false, failed: true };

    const result = this.manager.pickupItems(item.id, item.quantity);
    if (result.taken > 0) {
      // Add to colonist inventory
      if (!colonist.inventory) colonist.inventory = [];
      colonist.inventory.push({
        type: item.type,
        quantity: result.taken
      });
      
      return { completed: true, failed: false };
    }

    return { completed: false, failed: true };
  }

  private executeDropoff(colonist: any, step: JobStep): { completed: boolean; failed: boolean } {
    const target = step.target as Vec2;
    if (!colonist.inventory || colonist.inventory.length === 0) {
      return { completed: true, failed: false }; // Nothing to drop off
    }

    // Drop all items at target location
    for (const item of colonist.inventory) {
      this.manager.dropItems(item.type, item.quantity, target);
    }
    
    colonist.inventory = [];
    return { completed: true, failed: false };
  }

  private executeWork(colonist: any, step: JobStep): { completed: boolean; failed: boolean } {
    // Simulate work progress
    if (!step.startTime) {
      step.startTime = Date.now();
    }

    const duration = step.duration || 3000;
    const elapsed = Date.now() - step.startTime;
    
    if (elapsed >= duration) {
      return { completed: true, failed: false };
    }

    return { completed: false, failed: false };
  }

  private executeWait(colonist: any, step: JobStep): { completed: boolean; failed: boolean } {
    if (!step.startTime) {
      step.startTime = Date.now();
    }

    const duration = step.duration || 1000;
    const elapsed = Date.now() - step.startTime;
    
    return { completed: elapsed >= duration, failed: false };
  }
}
