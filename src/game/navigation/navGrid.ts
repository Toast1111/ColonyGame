import { aStar, clearGrid, markRectSolid, markCircleSolid, markRoadPath, syncTerrainToGrid, clearGridArea } from "../../core/pathfinding";
import { T } from "../constants";
import type { Colonist } from "../types";
import type { Game } from "../Game";
import { isDoorBlocking } from "../systems/doorSystem";

/**
 * Rebuild only a small area of the nav grid (for tree/rock removal)
 * This is much faster than rebuilding the entire grid
 */
export function rebuildNavGridPartial(game: Game, worldX: number, worldY: number, radius: number) {
  // Convert world coordinates to grid coordinates with padding
  const centerGx = Math.floor(worldX / T);
  const centerGy = Math.floor(worldY / T);
  const gridRadius = Math.ceil(radius / T) + 2; // Add extra padding for safety
  
  const minGx = Math.max(0, centerGx - gridRadius);
  const maxGx = Math.min(game.grid.cols - 1, centerGx + gridRadius);
  const minGy = Math.max(0, centerGy - gridRadius);
  const maxGy = Math.min(game.grid.rows - 1, centerGy + gridRadius);
  
  // Clear only the affected area (this now uses partial terrain sync internally)
  clearGridArea(game.grid, minGx, minGy, maxGx - minGx + 1, maxGy - minGy + 1);
  
  // NOTE: clearGridArea now calls syncTerrainToGridPartial internally, so we don't need to call it here
  
  // Re-mark buildings that intersect with this area
  for (const b of game.buildings) {
    const bMinGx = Math.floor(b.x / T);
    const bMaxGx = Math.floor((b.x + b.w - 1) / T);
    const bMinGy = Math.floor(b.y / T);
    const bMaxGy = Math.floor((b.y + b.h - 1) / T);
    
    // Check if building intersects with rebuild area
    if (bMaxGx < minGx || bMinGx > maxGx || bMaxGy < minGy || bMinGy > maxGy) {
      continue; // No intersection
    }
    
    // Re-mark this building
    if (b.kind !== 'hq' && b.kind !== 'path' && b.kind !== 'house' && b.kind !== 'farm' && b.kind !== 'bed' && b.kind !== 'door') {
      markRectSolid(game.grid, b.x, b.y, b.w, b.h);
    }
    if (b.kind === 'path') {
      markRoadPath(game.grid, b.x, b.y, b.w, b.h, 'BASIC_PATH');
    }
    if (b.kind === 'door' && b.done) {
      markRoadPath(game.grid, b.x, b.y, b.w, b.h, 'BASIC_PATH');
    }
    if (b.kind === 'house' && b.done) {
      const doorX = b.x + b.w / 2 - T / 2;
      const doorY = b.y + b.h;
      markRoadPath(game.grid, doorX, doorY, T, T, 'FAST_ROAD');
    }
  }
  
  // Re-mark trees that intersect with this area
  for (const tree of game.trees) {
    const tGx = Math.floor(tree.x / T);
    const tGy = Math.floor(tree.y / T);
    if (tGx >= minGx && tGx <= maxGx && tGy >= minGy && tGy <= maxGy) {
      markCircleSolid(game.grid, tree.x, tree.y, tree.r);
    }
  }
  
  // Re-mark rocks that intersect with this area
  for (const rock of game.rocks) {
    const rGx = Math.floor(rock.x / T);
    const rGy = Math.floor(rock.y / T);
    if (rGx >= minGx && rGx <= maxGx && rGy >= minGy && rGy <= maxGy) {
      markCircleSolid(game.grid, rock.x, rock.y, rock.r);
    }
  }
}

export function rebuildNavGrid(game: Game) {
  clearGrid(game.grid);
  
  // Restore terrain/floor costs from terrain grid after clearing
  if (game.grid.terrainGrid) {
    syncTerrainToGrid(game.grid);
  }
  
  // Buildings
  for (const b of game.buildings) {
    // Doors are treated as passable by pathfinding (colonists will open them)
    // but blocking doors will slow movement temporarily
    if (b.kind !== 'hq' && b.kind !== 'path' && b.kind !== 'house' && b.kind !== 'farm' && b.kind !== 'bed' && b.kind !== 'door') {
      markRectSolid(game.grid, b.x, b.y, b.w, b.h);
    }
    if (b.kind === 'path') {
      markRoadPath(game.grid, b.x, b.y, b.w, b.h, 'BASIC_PATH');
    }
    if (b.kind === 'door' && b.done) {
      // Doors are walkable tiles (colonists can path through them)
      markRoadPath(game.grid, b.x, b.y, b.w, b.h, 'BASIC_PATH');
    }
    if (b.kind === 'house' && b.done) {
      const doorX = b.x + b.w / 2 - T / 2;
      const doorY = b.y + b.h;
      markRoadPath(game.grid, doorX, doorY, T, T, 'FAST_ROAD');
    }
  }
  // Obstacles
  for (const tree of game.trees) markCircleSolid(game.grid, tree.x, tree.y, tree.r);
  for (const rock of game.rocks) markCircleSolid(game.grid, rock.x, rock.y, rock.r);
}

export function computePath(game: Game, sx: number, sy: number, tx: number, ty: number) {
  return aStar(game.grid, sx, sy, tx, ty);
}

export function computePathWithDangerAvoidance(game: Game, c: Colonist, sx: number, sy: number, tx: number, ty: number) {
  // Danger memory system removed - just use regular pathfinding
  return aStar(game.grid, sx, sy, tx, ty);
}

export function cellIndexAt(game: Game, x: number, y: number) {
  const gx = Math.floor(x / T), gy = Math.floor(y / T);
  if (gx < 0 || gy < 0 || gx >= game.grid.cols || gy >= game.grid.rows) return -1;
  return gy * game.grid.cols + gx;
}

export function isBlocked(game: Game, x: number, y: number) {
  const idx = cellIndexAt(game, x, y);
  return idx < 0 ? true : !!game.grid.solid[idx];
}
