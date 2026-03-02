/**
 * Deferred Navigation Rebuild System
 * 
 * Problem: Multiple navmesh rebuilds per frame cause stuttering
 * - Wall painting calls rebuildNavGrid() every segment (~5-8ms each)
 * - Repeated rebuild calls in one frame create redundant work
 * 
 * Solution: Defer and batch rebuilds
 * - Queue rebuild requests instead of rebuilding immediately
 * - Process queue once at end of frame
 * - Prefer one full rebuild over many partial rebuilds
 */

import type { Game } from "../Game";
import { rebuildNavGrid, rebuildNavGridPartial } from "./navGrid";

export class DeferredRebuildSystem {
  private game: Game;
  private rebuildQueued: boolean = false;
  private partialRebuilds: Array<{ x: number; y: number; radius: number }> = [];
  private fullRebuildQueued: boolean = false;
  
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
    // A queued full rebuild supersedes any partial rebuild work.
    if (this.fullRebuildQueued) return;
    
    // Skip if an existing partial rebuild already covers this request.
    for (const pr of this.partialRebuilds) {
      const dist = Math.hypot(pr.x - x, pr.y - y);
      if (dist + radius <= pr.radius) {
        // Covered by an already-queued request.
        return;
      }
    }
    
    this.partialRebuilds.push({ x, y, radius });
    this.rebuildQueued = true;
  }
  
  /**
   * Process all queued rebuilds (call this at end of frame)
   */
  processQueue(): void {
    if (!this.rebuildQueued) return;
    
    const startTime = performance.now();
    
    if (this.fullRebuildQueued) {
      // Execute one full rebuild and discard partial queue.
      rebuildNavGrid(this.game);
      this.partialRebuilds.length = 0; // Clear partial requests
      this.fullRebuildQueued = false;
    } else if (this.partialRebuilds.length > 0) {
      // Execute queued partial rebuild requests.
      // TODO: Merge overlapping areas to reduce redundant work
      for (const pr of this.partialRebuilds) {
        rebuildNavGridPartial(this.game, pr.x, pr.y, pr.radius);
      }
      this.partialRebuilds.length = 0;
    }
    
    this.rebuildQueued = false;
    const elapsed = performance.now() - startTime;
    
    // Warn when rebuild cost exceeds a small frame-time budget.
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
}
