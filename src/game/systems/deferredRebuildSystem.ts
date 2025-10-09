/**
 * Deferred Navigation Rebuild System
 * 
 * Problem: Multiple navmesh rebuilds per frame cause stuttering
 * - Wall painting calls rebuildNavGrid() every segment (~5-8ms each)
 * - syncTerrainToGrid() processes all 57,600 cells every rebuild
 * - Region rebuilds after every navmesh change
 * 
 * Solution: Defer and batch rebuilds
 * - Queue rebuild requests instead of rebuilding immediately
 * - Process queue once at end of frame
 * - Track dirty areas to avoid redundant work
 */

import type { Game } from "../Game";
import type { Grid } from "../../core/pathfinding";
import { rebuildNavGrid, rebuildNavGridPartial } from "../navigation/navGrid";

export interface RebuildRequest {
  type: 'full' | 'partial';
  x?: number;
  y?: number;
  radius?: number;
}

export class DeferredRebuildSystem {
  private game: Game;
  private rebuildQueued: boolean = false;
  private partialRebuilds: Array<{ x: number; y: number; radius: number }> = [];
  private fullRebuildQueued: boolean = false;
  private terrainSyncNeeded: boolean = false;
  
  // Performance tracking
  private lastRebuildTime: number = 0;
  private rebuildCount: number = 0;
  
  constructor(game: Game) {
    this.game = game;
  }
  
  /**
   * Request a full navmesh rebuild (deferred until end of frame)
   */
  requestFullRebuild(): void {
    this.fullRebuildQueued = true;
    this.rebuildQueued = true;
  }
  
  /**
   * Request a partial navmesh rebuild (deferred until end of frame)
   */
  requestPartialRebuild(x: number, y: number, radius: number): void {
    // If full rebuild already queued, ignore partial requests
    if (this.fullRebuildQueued) return;
    
    // Check if this area is already covered by an existing partial rebuild
    for (const pr of this.partialRebuilds) {
      const dist = Math.hypot(pr.x - x, pr.y - y);
      if (dist + radius <= pr.radius) {
        // Already covered
        return;
      }
    }
    
    this.partialRebuilds.push({ x, y, radius });
    this.rebuildQueued = true;
  }
  
  /**
   * Request terrain sync (deferred until next rebuild)
   */
  requestTerrainSync(): void {
    this.terrainSyncNeeded = true;
  }
  
  /**
   * Process all queued rebuilds (call this at end of frame)
   */
  processQueue(): void {
    if (!this.rebuildQueued) return;
    
    const startTime = performance.now();
    
    if (this.fullRebuildQueued) {
      // Full rebuild requested - do it once
      rebuildNavGrid(this.game);
      this.partialRebuilds.length = 0; // Clear partial requests
      this.fullRebuildQueued = false;
    } else if (this.partialRebuilds.length > 0) {
      // Process all partial rebuilds
      // TODO: Merge overlapping areas to reduce redundant work
      for (const pr of this.partialRebuilds) {
        rebuildNavGridPartial(this.game, pr.x, pr.y, pr.radius);
      }
      this.partialRebuilds.length = 0;
    }
    
    this.rebuildQueued = false;
    this.terrainSyncNeeded = false;
    
    const elapsed = performance.now() - startTime;
    this.lastRebuildTime = elapsed;
    this.rebuildCount++;
    
    // Debug logging (can be disabled in production)
    if (elapsed > 5) {
      console.warn(`[DeferredRebuild] Slow rebuild: ${elapsed.toFixed(2)}ms`);
    }
  }
  
  /**
   * Check if any rebuilds are queued
   */
  hasQueuedRebuilds(): boolean {
    return this.rebuildQueued;
  }
  
  /**
   * Force immediate rebuild (for special cases)
   */
  forceRebuild(): void {
    if (this.fullRebuildQueued) {
      rebuildNavGrid(this.game);
      this.fullRebuildQueued = false;
      this.partialRebuilds.length = 0;
    } else if (this.partialRebuilds.length > 0) {
      for (const pr of this.partialRebuilds) {
        rebuildNavGridPartial(this.game, pr.x, pr.y, pr.radius);
      }
      this.partialRebuilds.length = 0;
    }
    this.rebuildQueued = false;
  }
  
  /**
   * Get performance stats
   */
  getStats() {
    return {
      lastRebuildTime: this.lastRebuildTime,
      rebuildCount: this.rebuildCount,
      queuedRebuilds: this.rebuildQueued,
      fullRebuildQueued: this.fullRebuildQueued,
      partialRebuildCount: this.partialRebuilds.length
    };
  }
  
  /**
   * Reset stats
   */
  resetStats(): void {
    this.rebuildCount = 0;
    this.lastRebuildTime = 0;
  }
}
