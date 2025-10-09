/**
 * Budgeted Execution System
 * 
 * Provides time-budgeted execution for expensive subsystems:
 * - Each subsystem gets a fixed time budget per frame (e.g., 2ms)
 * - Tasks can be queued and executed over multiple frames
 * - Automatic overflow handling to prevent frame drops
 * - Priority-based execution for critical tasks
 */

export interface BudgetedTask {
  /** Unique identifier for the task */
  id: string;
  /** Task execution function - should return true when complete */
  execute: () => boolean;
  /** Priority (higher = more important) */
  priority?: number;
  /** Subsystem name for tracking */
  subsystem: string;
  /** Optional metadata for debugging */
  metadata?: any;
}

export interface BudgetConfig {
  /** Time budget in milliseconds */
  budgetMs: number;
  /** Whether to carry over unused time to next frame */
  allowCarryover?: boolean;
  /** Maximum carryover time in milliseconds */
  maxCarryoverMs?: number;
}

export class BudgetedExecutionQueue {
  private queue: BudgetedTask[] = [];
  private config: Required<BudgetConfig>;
  private carryover: number = 0;
  
  // Statistics
  public tasksExecuted = 0;
  public tasksCompleted = 0;
  public totalExecutionTime = 0;
  public budgetExceeded = 0;

  constructor(config: BudgetConfig) {
    this.config = {
      budgetMs: config.budgetMs,
      allowCarryover: config.allowCarryover ?? true,
      maxCarryoverMs: config.maxCarryoverMs ?? config.budgetMs * 0.5,
    };
  }

  /**
   * Add a task to the queue
   */
  public enqueue(task: BudgetedTask): void {
    this.queue.push(task);
    // Sort by priority (higher priority first)
    this.queue.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /**
   * Remove a task from the queue by ID
   */
  public remove(taskId: string): boolean {
    const index = this.queue.findIndex((t) => t.id === taskId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Execute tasks within the time budget
   * Returns the number of tasks executed
   */
  public execute(): number {
    const startTime = performance.now();
    const budget = this.config.budgetMs + (this.config.allowCarryover ? this.carryover : 0);
    let executed = 0;
    
    this.carryover = 0; // Reset carryover

    while (this.queue.length > 0) {
      const elapsed = performance.now() - startTime;
      
      // Check if we've exceeded budget
      if (elapsed >= budget) {
        this.budgetExceeded++;
        break;
      }

      // Execute next task
      const task = this.queue[0];
      const taskStart = performance.now();
      
      let completed = false;
      try {
        completed = task.execute();
      } catch (error) {
        console.error(`BudgetedExecution: Task ${task.id} failed:`, error);
        completed = true; // Remove failed task
      }

      const taskDuration = performance.now() - taskStart;
      this.totalExecutionTime += taskDuration;
      this.tasksExecuted++;
      executed++;

      // Remove task if completed
      if (completed) {
        this.queue.shift();
        this.tasksCompleted++;
      } else {
        // Task not complete, check if we should continue
        const totalElapsed = performance.now() - startTime;
        if (totalElapsed >= budget) {
          this.budgetExceeded++;
          break;
        }
      }
    }

    // Calculate carryover for next frame
    if (this.config.allowCarryover) {
      const totalElapsed = performance.now() - startTime;
      if (totalElapsed < this.config.budgetMs) {
        this.carryover = Math.min(
          this.config.budgetMs - totalElapsed,
          this.config.maxCarryoverMs
        );
      }
    }

    return executed;
  }

  /**
   * Get current queue size
   */
  public size(): number {
    return this.queue.length;
  }

  /**
   * Clear all tasks
   */
  public clear(): void {
    this.queue = [];
  }

  /**
   * Get queue statistics
   */
  public getStats(): {
    queueSize: number;
    tasksExecuted: number;
    tasksCompleted: number;
    avgExecutionTime: number;
    budgetExceeded: number;
    carryover: number;
  } {
    return {
      queueSize: this.queue.length,
      tasksExecuted: this.tasksExecuted,
      tasksCompleted: this.tasksCompleted,
      avgExecutionTime: this.tasksExecuted > 0 ? this.totalExecutionTime / this.tasksExecuted : 0,
      budgetExceeded: this.budgetExceeded,
      carryover: this.carryover,
    };
  }

  /**
   * Reset statistics
   */
  public resetStats(): void {
    this.tasksExecuted = 0;
    this.tasksCompleted = 0;
    this.totalExecutionTime = 0;
    this.budgetExceeded = 0;
  }
}

/**
 * Global budgeted execution helper
 * Manages multiple subsystem queues
 */
export class BudgetedExecutionManager {
  private static instance: BudgetedExecutionManager;
  private queues: Map<string, BudgetedExecutionQueue> = new Map();

  private constructor() {}

  public static getInstance(): BudgetedExecutionManager {
    if (!BudgetedExecutionManager.instance) {
      BudgetedExecutionManager.instance = new BudgetedExecutionManager();
    }
    return BudgetedExecutionManager.instance;
  }

  /**
   * Create or get a queue for a subsystem
   */
  public getQueue(subsystem: string, config?: BudgetConfig): BudgetedExecutionQueue {
    if (!this.queues.has(subsystem)) {
      const defaultConfig: BudgetConfig = {
        budgetMs: 2.0, // Default 2ms budget
        allowCarryover: true,
        maxCarryoverMs: 1.0,
      };
      this.queues.set(subsystem, new BudgetedExecutionQueue(config ?? defaultConfig));
    }
    return this.queues.get(subsystem)!;
  }

  /**
   * Execute all queues
   */
  public executeAll(): void {
    for (const [subsystem, queue] of this.queues) {
      queue.execute();
    }
  }

  /**
   * Get statistics for all queues
   */
  public getAllStats(): Map<string, ReturnType<BudgetedExecutionQueue['getStats']>> {
    const stats = new Map();
    for (const [subsystem, queue] of this.queues) {
      stats.set(subsystem, queue.getStats());
    }
    return stats;
  }

  /**
   * Reset all statistics
   */
  public resetAllStats(): void {
    for (const queue of this.queues.values()) {
      queue.resetStats();
    }
  }
}

/**
 * Convenience function for budgeted execution
 * 
 * Example usage:
 * ```typescript
 * budgetedRun('pathfinding', [
 *   { id: 'path-1', execute: () => computePath(...), priority: 10 },
 *   { id: 'path-2', execute: () => computePath(...), priority: 5 },
 * ], 2.0);
 * ```
 */
export function budgetedRun(
  subsystem: string,
  tasks: Omit<BudgetedTask, 'subsystem'>[],
  budgetMs: number = 2.0
): number {
  const manager = BudgetedExecutionManager.getInstance();
  const queue = manager.getQueue(subsystem, { budgetMs });

  // Enqueue new tasks
  for (const task of tasks) {
    queue.enqueue({ ...task, subsystem });
  }

  // Execute within budget
  return queue.execute();
}
