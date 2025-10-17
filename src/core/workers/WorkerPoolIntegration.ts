/**
 * Worker Pool Integration
 * 
 * Helper functions to integrate Web Worker pool with existing game systems.
 * Provides convenient wrappers for pathfinding, rendering, and simulation tasks.
 */

import { WorkerPool, type WorkerTaskType } from './WorkerPool';

export class WorkerPoolIntegration {
  private static instance: WorkerPoolIntegration;
  private pool: WorkerPool;
  private initialized = false;
  
  private constructor() {
    this.pool = WorkerPool.getInstance();
  }
  
  public static getInstance(): WorkerPoolIntegration {
    if (!WorkerPoolIntegration.instance) {
      WorkerPoolIntegration.instance = new WorkerPoolIntegration();
    }
    return WorkerPoolIntegration.instance;
  }
  
  /**
   * Initialize the worker pool (call once at game start)
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await this.pool.initialize();
      this.initialized = true;
      console.log('[WorkerPoolIntegration] Worker pool initialized successfully');
    } catch (error) {
      console.error('[WorkerPoolIntegration] Failed to initialize worker pool:', error);
      // Continue without workers - fallback to main thread
      this.initialized = false;
    }
  }
  
  /**
   * Check if worker pool is available
   */
  public isAvailable(): boolean {
    return this.initialized;
  }
  
  // ===== Pathfinding Integration =====
  
  /**
   * Compute a path using the pathfinding worker
   * Falls back to synchronous computation if workers unavailable
   */
  public async computePath(
    grid: any,
    startX: number,
    startY: number,
    targetX: number,
    targetY: number
  ): Promise<{ x: number; y: number }[] | null> {
    if (!this.initialized) {
      return null; // Fallback to main thread pathfinding
    }
    
    try {
      const response = await this.pool.dispatch({
        type: 'pathfinding',
        operation: 'computePath',
        data: { grid, startX, startY, targetX, targetY },
        priority: 10
      });
      
      return response.data.result;
    } catch (error) {
      console.error('[WorkerPoolIntegration] Pathfinding failed:', error);
      return null;
    }
  }
  
  /**
   * Compute a path with danger avoidance using the pathfinding worker
   */
  public async computePathWithDangerAvoidance(
    grid: any,
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    dangerZones: any[]
  ): Promise<{ x: number; y: number }[] | null> {
    if (!this.initialized) {
      return null;
    }
    
    try {
      const response = await this.pool.dispatch({
        type: 'pathfinding',
        operation: 'computePathWithDangerAvoidance',
        data: { grid, startX, startY, targetX, targetY, dangerZones },
        priority: 10
      });
      
      return response.data.result;
    } catch (error) {
      console.error('[WorkerPoolIntegration] Danger-aware pathfinding failed:', error);
      return null;
    }
  }
  
  /**
   * Compute multiple paths in batch
   */
  public async computeMultiplePaths(
    grid: any,
    requests: Array<{
      id: string | number;
      startX: number;
      startY: number;
      targetX: number;
      targetY: number;
      dangerZones?: any[];
    }>
  ): Promise<Array<{ id: string | number; path: { x: number; y: number }[] | null }>> {
    if (!this.initialized) {
      return requests.map(req => ({ id: req.id, path: null }));
    }
    
    try {
      const response = await this.pool.dispatch({
        type: 'pathfinding',
        operation: 'computeMultiplePaths',
        data: { grid, requests },
        priority: 5
      });
      
      return response.data.result;
    } catch (error) {
      console.error('[WorkerPoolIntegration] Batch pathfinding failed:', error);
      return requests.map(req => ({ id: req.id, path: null }));
    }
  }
  
  // ===== Rendering Integration =====
  
  /**
   * Cull entities outside viewport using rendering worker
   */
  public async cullEntities(
    entities: any[],
    viewport: { minX: number; minY: number; maxX: number; maxY: number },
    padding: number = 100
  ): Promise<(string | number)[]> {
    if (!this.initialized) {
      return entities.map(e => e.id); // Return all if workers unavailable
    }
    
    try {
      const response = await this.pool.dispatch({
        type: 'rendering',
        operation: 'cullEntities',
        data: { entities, viewport, padding },
        priority: 8
      });
      
      return response.data.result;
    } catch (error) {
      console.error('[WorkerPoolIntegration] Entity culling failed:', error);
      return entities.map(e => e.id);
    }
  }
  
  /**
   * Compute visible tiles using rendering worker
   */
  public async computeVisibleTiles(
    viewport: { minX: number; minY: number; maxX: number; maxY: number },
    tileSize: number,
    gridCols: number,
    gridRows: number,
    padding: number = 2
  ): Promise<{ startCol: number; endCol: number; startRow: number; endRow: number }> {
    if (!this.initialized) {
      // Fallback to main thread computation
      return {
        startCol: 0,
        endCol: gridCols,
        startRow: 0,
        endRow: gridRows
      };
    }
    
    try {
      const response = await this.pool.dispatch({
        type: 'rendering',
        operation: 'computeVisibleTiles',
        data: { viewport, tileSize, gridCols, gridRows, padding },
        priority: 7
      });
      
      return response.data.result;
    } catch (error) {
      console.error('[WorkerPoolIntegration] Visible tiles computation failed:', error);
      return { startCol: 0, endCol: gridCols, startRow: 0, endRow: gridRows };
    }
  }
  
  // ===== Simulation Integration =====
  
  /**
   * Process colonist AI in worker
   */
  public async processColonistAI(colonist: any, dt: number): Promise<any> {
    if (!this.initialized) {
      return null;
    }
    
    try {
      const response = await this.pool.dispatch({
        type: 'simulation',
        operation: 'processColonistAI',
        data: { colonist, dt },
        priority: 6
      });
      
      return response.data.result;
    } catch (error) {
      console.error('[WorkerPoolIntegration] Colonist AI processing failed:', error);
      return null;
    }
  }
  
  /**
   * Simulate needs decay for all colonists in batch
   */
  public async simulateNeedsDecay(colonists: any[], dt: number): Promise<Map<string | number, any>> {
    if (!this.initialized) {
      return new Map();
    }
    
    try {
      const response = await this.pool.dispatch({
        type: 'simulation',
        operation: 'simulateNeedsDecay',
        data: { colonists, dt },
        priority: 5
      });
      
      // Convert array of tuples back to Map
      return new Map(response.data.result);
    } catch (error) {
      console.error('[WorkerPoolIntegration] Needs decay simulation failed:', error);
      return new Map();
    }
  }
  
  // ===== Statistics =====
  
  /**
   * Get worker pool statistics
   */
  public getStats(): any {
    return this.pool.getStats();
  }
  
  /**
   * Get queue size
   */
  public getQueueSize(): number {
    return this.pool.getQueueSize();
  }
  
  /**
   * Check if worker type is available
   */
  public isWorkerAvailable(type: WorkerTaskType): boolean {
    return this.pool.isAvailable(type);
  }
}

// Export singleton instance
export const workerPoolIntegration = WorkerPoolIntegration.getInstance();
