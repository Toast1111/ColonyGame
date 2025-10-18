/**
 * NavigationManager - Handles all pathfinding and navigation operations
 * Extracted from Game.ts to improve maintainability and reduce complexity
 */

import type { Game } from '../Game';
import type { Colonist, Building } from '../types';
import { T } from '../constants';
import { 
  rebuildNavGrid as rebuildNavGridNav, 
  rebuildNavGridPartial as rebuildNavGridPartialNav,
  computePath as computePathNav, 
  computePathWithDangerAvoidance as computePathWithDangerAvoidanceNav, 
  cellIndexAt as cellIndexAtNav, 
  isBlocked as isBlockedNav 
} from '../navigation/navGrid';
import { syncTerrainToGrid } from '../../core/pathfinding';

export class NavigationManager {
  constructor(private game: Game) {}

  /**
   * Rebuild the navigation grid (call when buildings/obstacles change)
   */
  rebuildNavGrid(): void {
    rebuildNavGridNav(this.game);
  }

  /**
   * Rebuild only a small area of the navigation grid (for tree/rock removal)
   * This is much faster than rebuilding the entire grid
   * @param worldX - World X coordinate of the center
   * @param worldY - World Y coordinate of the center
   * @param radius - Radius around the point to rebuild (in world units)
   */
  rebuildNavGridPartial(worldX: number, worldY: number, radius: number): void {
    rebuildNavGridPartialNav(this.game, worldX, worldY, radius);
  }

  /**
   * Sync terrain data to the navigation grid
   */
  syncTerrainToGrid(): void {
    syncTerrainToGrid(this.game.grid);
  }

  /**
   * Compute a path from (sx, sy) to (tx, ty)
   * Async wrapper for compatibility - just calls synchronous version
   */
  async computePathAsync(sx: number, sy: number, tx: number, ty: number) {
    return computePathNav(this.game, sx, sy, tx, ty);
  }

  /**
   * Synchronous path computation (for compatibility)
   */
  computePath(sx: number, sy: number, tx: number, ty: number) {
    return computePathNav(this.game, sx, sy, tx, ty);
  }

  /**
   * Colonist-aware pathfinding that avoids dangerous areas from memory
   * Async wrapper for compatibility - just calls synchronous version
   */
  async computePathWithDangerAvoidanceAsync(c: Colonist, sx: number, sy: number, tx: number, ty: number) {
    return computePathWithDangerAvoidanceNav(this.game, c, sx, sy, tx, ty);
  }

  /**
   * Synchronous danger-aware pathfinding (for compatibility)
   */
  computePathWithDangerAvoidance(c: Colonist, sx: number, sy: number, tx: number, ty: number) {
    return computePathWithDangerAvoidanceNav(this.game, c, sx, sy, tx, ty);
  }



  /**
   * Get the grid cell index at world position (x, y)
   */
  cellIndexAt(x: number, y: number): number {
    return cellIndexAtNav(this.game, x, y);
  }

  /**
   * Check if a world position is blocked (unwalkable)
   */
  isBlocked(x: number, y: number): boolean {
    return isBlockedNav(this.game, x, y);
  }

  /**
   * Find the nearest building matching a filter - linear search through all buildings
   */
  findNearestBuilding(x: number, y: number, filter: (b: Building) => boolean): Building | null {
    const { game } = this;
    
    let best: Building | null = null;
    let bestDist = Infinity;
    for (const b of game.buildings) {
      if (!filter(b)) continue;
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const d = Math.hypot(x - cx, y - cy);
      if (d < bestDist) {
        bestDist = d;
        best = b;
      }
    }
    return best;
  }

  /**
   * Find the nearest tree - linear search through all trees
   */
  findNearestTree(x: number, y: number): typeof this.game.trees[0] | null {
    const { game } = this;
    
    let best = null;
    let bestDist = Infinity;
    for (const t of game.trees) {
      if (t.hp <= 0) continue;
      const d = Math.hypot(x - t.x, y - t.y);
      if (d < bestDist) {
        bestDist = d;
        best = t;
      }
    }
    return best;
  }

  /**
   * Find the nearest rock - linear search through all rocks
   */
  findNearestRock(x: number, y: number): typeof this.game.rocks[0] | null {
    const { game } = this;
    
    let best = null;
    let bestDist = Infinity;
    for (const r of game.rocks) {
      if (r.hp <= 0) continue;
      const d = Math.hypot(x - r.x, y - r.y);
      if (d < bestDist) {
        bestDist = d;
        best = r;
      }
    }
    return best;
  }

  /**
   * Check if a position is within interaction range of a circle
   */
  isWithinInteractionRange(x: number, y: number, circle: { x: number; y: number; r: number }, interactDistance: number): boolean {
    const dx = x - circle.x;
    const dy = y - circle.y;
    const dist = Math.hypot(dx, dy);
    return dist <= circle.r + interactDistance;
  }

  /**
   * Find the best tile to approach a circular target (tree, rock, etc.)
   * Uses intelligent sampling around the circle and pathfinding to find the optimal approach
   */
  bestApproachToCircle(c: Colonist, circle: { x: number; y: number; r: number }, interact: number): { x: number; y: number } {
    const { game } = this;
    
    // Sample multiple angles around the circle, snap to tile centers, and dedupe
    const samples = 16;
    const candidateTiles = new Set<string>(); // Use string key for deduplication
    const candidates: { x: number; y: number; gx: number; gy: number }[] = [];
    
    // Nudge radius slightly inside to avoid solid edge issues
    const R = Math.max(6, circle.r + interact - 2); // small inward bias
    
    // Order sample angles to try the most promising side first (toward colonist)
    const baseAng = Math.atan2(circle.y - c.y, circle.x - c.x);
    const order: number[] = [];
    for (let k = 0; k < samples; k++) {
      const s = ((k % 2) ? +1 : -1) * Math.ceil(k / 2);
      order.push(((s / samples) * Math.PI * 2) + baseAng);
    }
    
    for (const ang of order) {
      // Place target using adjusted radius
      const px = circle.x + Math.cos(ang) * R;
      const py = circle.y + Math.sin(ang) * R;
      
      // Snap to tile center with bounds check
      const gx = Math.floor(px / T);
      const gy = Math.floor(py / T);
      
      // Bounds-check before isBlocked to avoid redundant cellIndexAt calls
      if (gx < 0 || gy < 0 || gx >= game.grid.cols || gy >= game.grid.rows) continue;
      
      const tileCenterX = gx * T + T / 2;
      const tileCenterY = gy * T + T / 2;
      
      // Dedupe by tile coordinates
      const tileKey = `${gx},${gy}`;
      if (candidateTiles.has(tileKey)) continue;
      candidateTiles.add(tileKey);
      
      // Skip if tile is blocked
      if (this.isBlocked(tileCenterX, tileCenterY)) continue;
      
      candidates.push({ x: tileCenterX, y: tileCenterY, gx, gy });
    }
    
    if (candidates.length === 0) {
      // Fallback: walk back along the ray from the resource toward the colonist
      const ang = Math.atan2(c.y - circle.y, c.x - circle.x);
      const startR = circle.r + interact;
      const step = Math.max(4, T * 0.33);

      for (let rr = startR; rr >= Math.max(circle.r + 2, startR - 6 * T); rr -= step) {
        const px = circle.x + Math.cos(ang) * rr;
        const py = circle.y + Math.sin(ang) * rr;

        // snap to center
        const gx = Math.floor(px / T), gy = Math.floor(py / T);
        if (gx < 0 || gy < 0 || gx >= game.grid.cols || gy >= game.grid.rows) continue;

        const cx = gx * T + T / 2, cy = gy * T + T / 2;
        if (this.isBlocked(cx, cy)) continue;

        const path = this.computePathWithDangerAvoidance(c, c.x, c.y, cx, cy);
        if (path) return { x: cx, y: cy };
      }

      // last resort: a point on the ring toward the colonist
      return {
        x: circle.x + Math.cos(ang) * startR,
        y: circle.y + Math.sin(ang) * startR
      };
    }
    
    // Sort candidates by path quality - prefer road tiles with meaningful tie-break
    let best: { x: number; y: number } | null = null;
    let bestPathLength = Infinity;
    let bestPathCost = Infinity;
    let evaluatedCandidates = 0;
    const maxEvaluations = 8; // Cap A* evaluations for performance
    
    for (const candidate of candidates) {
      // Performance cap: stop after evaluating enough candidates
      if (evaluatedCandidates >= maxEvaluations) break;
      
      // Use A* to evaluate the actual path
      const path = this.computePathWithDangerAvoidance(c, c.x, c.y, candidate.x, candidate.y);
      if (!path || path.length === 0) continue;
      
      evaluatedCandidates++;
      
      // Calculate path cost by summing grid costs along the path
      let pathCost = 0;
      for (const node of path) {
        const idx = this.cellIndexAt(node.x, node.y);
        if (idx < 0) { 
          pathCost = Infinity; 
          break; 
        }
        pathCost += game.grid.cost[idx] || 1;
      }
      
      if (pathCost === Infinity) continue;
      
      // Prefer if the approach tile is on road (feels like "approach via path")
      const lastIdx = this.cellIndexAt(candidate.x, candidate.y);
      if (lastIdx >= 0 && game.grid.cost[lastIdx] <= 0.7) {
        pathCost -= 0.05; // Meaningful road preference
      }
      
      // Early-out if we find a great path (short and cheap)
      if (path.length <= 3 && pathCost <= 2.0) {
        if (Math.random() < 0.02) {
          console.log(`Early-out: great path found with length ${path.length} and cost ${pathCost.toFixed(3)}`);
        }
        return candidate;
      }
      
      // Track best option
      if (pathCost < bestPathCost || (pathCost === bestPathCost && path.length < bestPathLength)) {
        bestPathCost = pathCost;
        bestPathLength = path.length;
        best = candidate;
      }
    }
    
    if (best) {
      // Debug logging
      if (Math.random() < 0.02) {
        console.log(`Best approach: (${best.x.toFixed(1)}, ${best.y.toFixed(1)}) with path cost ${bestPathCost.toFixed(3)} and length ${bestPathLength} (evaluated ${evaluatedCandidates} candidates)`);
      }
      return best;
    }
    
    // Should never reach here given our fallback above
    return candidates[0];
  }
}
