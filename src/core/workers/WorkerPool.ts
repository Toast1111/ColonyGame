/**
 * WorkerPool - Manages a pool of Web Workers for offloading heavy computations
 * 
 * Architecture:
 * - 4 workers total:
 *   - 1 dedicated to pathfinding (A* computations)
 *   - 1 dedicated to rendering preparation
 *   - 2 dedicated to simulation (AI/FSM and game logic updates)
 * 
 * Features:
 * - Asynchronous task dispatch with Promise-based results
 * - Automatic worker selection based on task type
 * - Task queuing when workers are busy
 * - Compatible with BudgetedExecutionManager
 * - Non-blocking main thread
 */

export type WorkerTaskType = 'pathfinding' | 'rendering' | 'simulation';

export interface WorkerTask {
  id: string;
  type: WorkerTaskType;
  operation: string;
  data: any;
  priority?: number;
}

export interface WorkerResponse {
  taskId: string;
  success: boolean;
  data?: any;
  error?: string;
}

interface PendingTask {
  task: WorkerTask;
  resolve: (response: WorkerResponse) => void;
  reject: (error: Error) => void;
}

/**
 * Worker Pool Manager
 * Coordinates communication with Web Workers and distributes tasks
 */
export class WorkerPool {
  private static instance: WorkerPool;
  
  // Worker pools by type
  private pathfindingWorker: Worker | null = null;
  private renderingWorker: Worker | null = null;
  private simulationWorkers: Worker[] = [];
  
  // Task tracking
  private pendingTasks = new Map<string, PendingTask>();
  private taskQueue: PendingTask[] = [];
  private nextTaskId = 0;
  
  // Worker status tracking
  private workerBusy = new Map<Worker, boolean>();
  
  // Statistics
  public stats = {
    tasksDispatched: 0,
    tasksCompleted: 0,
    tasksFailed: 0,
    averageTaskTime: 0,
  };

  private totalTaskTimeMs = 0;
  private tasksWithTiming = 0;
  
  private constructor() {}
  
  public static getInstance(): WorkerPool {
    if (!WorkerPool.instance) {
      WorkerPool.instance = new WorkerPool();
    }
    return WorkerPool.instance;
  }
  
  /**
   * Initialize the worker pool
   * Creates all workers and sets up message handlers
   */
  public async initialize(): Promise<void> {
    try {
      // Create pathfinding worker
      this.pathfindingWorker = new Worker(
        new URL('./pathfindingWorker.ts', import.meta.url),
        { type: 'module' }
      );
      this.setupWorkerHandlers(this.pathfindingWorker, 'pathfinding');
      this.workerBusy.set(this.pathfindingWorker, false);
      
      // Create rendering worker
      this.renderingWorker = new Worker(
        new URL('./renderingWorker.ts', import.meta.url),
        { type: 'module' }
      );
      this.setupWorkerHandlers(this.renderingWorker, 'rendering');
      this.workerBusy.set(this.renderingWorker, false);
      
      // Create 2 simulation workers
      for (let i = 0; i < 2; i++) {
        const worker = new Worker(
          new URL('./simulationWorker.ts', import.meta.url),
          { type: 'module' }
        );
        this.setupWorkerHandlers(worker, `simulation-${i}`);
        this.simulationWorkers.push(worker);
        this.workerBusy.set(worker, false);
      }
      
      console.log('[WorkerPool] Initialized with 4 workers');
    } catch (error) {
      console.error('[WorkerPool] Failed to initialize workers:', error);
      throw error;
    }
  }
  
  /**
   * Set up message handlers for a worker
   */
  private setupWorkerHandlers(worker: Worker, workerName: string): void {
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      const pending = this.pendingTasks.get(response.taskId);
      
      if (pending) {
        this.pendingTasks.delete(response.taskId);
        
        if (response.success) {
          this.stats.tasksCompleted++;
          const executionTime = response.data?.executionTime;
          if (typeof executionTime === 'number' && !Number.isNaN(executionTime)) {
            this.totalTaskTimeMs += executionTime;
            this.tasksWithTiming++;
          }
          pending.resolve(response);
        } else {
          this.stats.tasksFailed++;
          pending.reject(new Error(response.error || 'Worker task failed'));
        }
        
        // Mark worker as free
        this.workerBusy.set(worker, false);
        
        // Process next task in queue
        this.processQueue();
      }
    };
    
    worker.onerror = (error: ErrorEvent) => {
      console.error(`[WorkerPool] Error in ${workerName}:`, error);
      
      // Mark worker as free
      this.workerBusy.set(worker, false);
      
      // Fail all pending tasks for this worker
      for (const [taskId, pending] of this.pendingTasks.entries()) {
        pending.reject(new Error(`Worker ${workerName} crashed: ${error.message}`));
        this.pendingTasks.delete(taskId);
        this.stats.tasksFailed++;
      }
    };
  }
  
  /**
   * Dispatch a task to an appropriate worker
   * Returns a Promise that resolves when the task completes
   */
  public dispatch(task: Omit<WorkerTask, 'id'>): Promise<WorkerResponse> {
    return new Promise((resolve, reject) => {
      const taskId = `task-${this.nextTaskId++}`;
      const fullTask: WorkerTask = { ...task, id: taskId };
      
      const pending: PendingTask = { task: fullTask, resolve, reject };
      this.pendingTasks.set(taskId, pending);
      this.stats.tasksDispatched++;
      
      // Try to dispatch immediately, or queue if all workers busy
      if (!this.tryDispatch(pending)) {
        this.taskQueue.push(pending);
      }
    });
  }
  
  /**
   * Try to dispatch a task immediately
   * Returns true if dispatched, false if all workers busy
   */
  private tryDispatch(pending: PendingTask): boolean {
    const { task } = pending;
    const worker = this.selectWorker(task.type);
    
    if (!worker || this.workerBusy.get(worker)) {
      return false;
    }
    
    // Mark worker as busy and dispatch
    this.workerBusy.set(worker, true);
    worker.postMessage(task);
    return true;
  }
  
  /**
   * Process queued tasks when workers become available
   */
  private processQueue(): void {
    while (this.taskQueue.length > 0) {
      const pending = this.taskQueue[0];
      if (this.tryDispatch(pending)) {
        this.taskQueue.shift();
      } else {
        break; // No available workers
      }
    }
  }
  
  /**
   * Select the appropriate worker for a task type
   */
  private selectWorker(type: WorkerTaskType): Worker | null {
    switch (type) {
      case 'pathfinding':
        return this.pathfindingWorker;
      case 'rendering':
        return this.renderingWorker;
      case 'simulation':
        // Round-robin selection between simulation workers
        // Find the first available simulation worker
        for (const worker of this.simulationWorkers) {
          if (!this.workerBusy.get(worker)) {
            return worker;
          }
        }
        // If all busy, return first one (will be queued)
        return this.simulationWorkers[0] || null;
      default:
        return null;
    }
  }
  
  /**
   * Terminate all workers (cleanup)
   */
  public terminate(): void {
    if (this.pathfindingWorker) {
      this.pathfindingWorker.terminate();
      this.pathfindingWorker = null;
    }
    if (this.renderingWorker) {
      this.renderingWorker.terminate();
      this.renderingWorker = null;
    }
    for (const worker of this.simulationWorkers) {
      worker.terminate();
    }
    this.simulationWorkers = [];
    this.workerBusy.clear();
    this.pendingTasks.clear();
    this.taskQueue = [];
    
    console.log('[WorkerPool] All workers terminated');
  }
  
  /**
   * Get statistics about worker pool performance
   */
  public getStats(): typeof this.stats {
    const averageTaskTime =
      this.tasksWithTiming > 0 ? this.totalTaskTimeMs / this.tasksWithTiming : 0;

    return { ...this.stats, averageTaskTime };
  }
  
  /**
   * Check if a worker type is available (not busy)
   */
  public isAvailable(type: WorkerTaskType): boolean {
    const worker = this.selectWorker(type);
    return worker ? !this.workerBusy.get(worker) : false;
  }
  
  /**
   * Get queue size for monitoring
   */
  public getQueueSize(): number {
    return this.taskQueue.length;
  }
}
