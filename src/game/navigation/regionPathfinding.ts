/**
 * Region-Aware Pathfinding - Enhances A* with region-based reachability checks
 * 
 * Before running expensive A*, check if the destination is reachable
 * using the region system. This prevents wasting CPU on impossible paths.
 */

import type { Grid } from "../../core/pathfinding";
import { aStar } from "../../core/pathfinding";
import type { RegionManager } from "./regionManager";

export interface PathfindingResult {
  path: Array<{ x: number; y: number }> | null;
  reachable: boolean;
  reason?: string; // Why it failed (for debugging)
}

/**
 * Find a path with region-based reachability check
 */
export function findPathWithRegions(
  grid: Grid,
  regionManager: RegionManager,
  startX: number,
  startY: number,
  endX: number,
  endY: number
): PathfindingResult {
  // If regions are disabled, fall back to regular A*
  if (!regionManager.isEnabled()) {
    const path = aStar(grid, startX, startY, endX, endY);
    return {
      path,
      reachable: path !== null,
      reason: path ? undefined : 'No path found (regions disabled)',
    };
  }

  // Check reachability using regions first
  const reachable = regionManager.isReachable(startX, startY, endX, endY);

  if (!reachable) {
    return {
      path: null,
      reachable: false,
      reason: 'Destination not reachable (different region)',
    };
  }

  // Destination is reachable, run A*
  const path = aStar(grid, startX, startY, endX, endY);

  return {
    path,
    reachable: path !== null,
    reason: path ? undefined : 'No path found despite being in same region (may be bug)',
  };
}

/**
 * Helper to get a path or null (for backward compatibility)
 */
export function getPath(
  grid: Grid,
  regionManager: RegionManager,
  startX: number,
  startY: number,
  endX: number,
  endY: number
): Array<{ x: number; y: number }> | null {
  const result = findPathWithRegions(grid, regionManager, startX, startY, endX, endY);
  return result.path;
}
