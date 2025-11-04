import { T } from "../constants";
import type { Vec2 } from "../../core/utils";

/**
 * Tile Alignment Utilities
 * 
 * These functions ensure objects spawn at tile centers for proper pathfinding.
 * The pathfinding system expects objects to be positioned at grid-aligned locations.
 */

/**
 * Snap a world position to the nearest tile center
 * @param x World X coordinate in pixels
 * @param y World Y coordinate in pixels
 * @returns Position at the center of the nearest tile
 */
export function snapToTileCenter(x: number, y: number): Vec2 {
  const gx = Math.floor(x / T);
  const gy = Math.floor(y / T);
  return {
    x: gx * T + T / 2,
    y: gy * T + T / 2
  };
}

/**
 * Get the tile center position for specific grid coordinates
 * @param gx Grid X coordinate (tile index)
 * @param gy Grid Y coordinate (tile index)
 * @returns Position at the center of the specified tile
 */
export function getTileCenterPos(gx: number, gy: number): Vec2 {
  return {
    x: gx * T + T / 2,
    y: gy * T + T / 2
  };
}

/**
 * Convert world coordinates to grid coordinates
 * @param x World X coordinate in pixels
 * @param y World Y coordinate in pixels
 * @returns Grid coordinates (tile indices)
 */
export function worldToGrid(x: number, y: number): { gx: number; gy: number } {
  return {
    gx: Math.floor(x / T),
    gy: Math.floor(y / T)
  };
}

/**
 * Check if a position is aligned to a tile center (within tolerance)
 * @param x World X coordinate
 * @param y World Y coordinate
 * @param tolerance Allowable deviation from center (default: 1 pixel)
 * @returns True if position is close to a tile center
 */
export function isAlignedToTileCenter(x: number, y: number, tolerance: number = 1): boolean {
  const center = snapToTileCenter(x, y);
  const dx = Math.abs(x - center.x);
  const dy = Math.abs(y - center.y);
  return dx <= tolerance && dy <= tolerance;
}

/**
 * Find a nearby tile-aligned position that avoids obstacles
 * Used when the ideal tile center is blocked by buildings or other objects
 * @param x Initial world X coordinate
 * @param y Initial world Y coordinate
 * @param maxRadius Maximum search radius in tiles
 * @param isBlocked Function to check if a position is blocked
 * @returns Nearby tile-aligned position, or null if none found
 */
export function findNearbyAlignedPosition(
  x: number, 
  y: number, 
  maxRadius: number = 3,
  isBlocked?: (wx: number, wy: number) => boolean
): Vec2 | null {
  // Start with the requested position
  const idealCenter = snapToTileCenter(x, y);
  
  // If no blocking check provided, return ideal center
  if (!isBlocked) {
    return idealCenter;
  }
  
  // Check if ideal position is available
  if (!isBlocked(idealCenter.x, idealCenter.y)) {
    return idealCenter;
  }
  
  // Search in expanding rings around the ideal position
  for (let radius = 1; radius <= maxRadius; radius++) {
    for (let gx = -radius; gx <= radius; gx++) {
      for (let gy = -radius; gy <= radius; gy++) {
        // Only check positions on the edge of current radius
        if (Math.abs(gx) !== radius && Math.abs(gy) !== radius) continue;
        
        const { gx: baseGx, gy: baseGy } = worldToGrid(x, y);
        const testCenter = getTileCenterPos(baseGx + gx, baseGy + gy);
        
        if (!isBlocked(testCenter.x, testCenter.y)) {
          return testCenter;
        }
      }
    }
  }
  
  return null; // No suitable position found
}