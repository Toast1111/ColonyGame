import { aStar, clearGrid, markRectSolid, markCircleSolid, markRoadPath, syncTerrainToGrid } from "../../core/pathfinding";
import { T } from "../constants";
import type { Colonist } from "../types";
import type { Game } from "../Game";
import { isDoorBlocking } from "../systems/doorSystem";

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
  
  // Rebuild regions after nav grid is updated
  if (game.regionManager.isEnabled()) {
    game.regionManager.onBuildingsChanged(game.buildings);
    game.regionManager.updateObjectCaches(game.buildings, game.trees, game.rocks);
  }
}

export function computePath(game: Game, sx: number, sy: number, tx: number, ty: number) {
  return aStar(game.grid, sx, sy, tx, ty);
}

export function computePathWithDangerAvoidance(game: Game, c: Colonist, sx: number, sy: number, tx: number, ty: number) {
  const dangerMemory = (c as any).dangerMemory;
  if (!dangerMemory || !Array.isArray(dangerMemory) || dangerMemory.length === 0) {
    return aStar(game.grid, sx, sy, tx, ty);
  }
  const modifiedCosts: Array<{ idx: number; originalCost: number }> = [];
  for (const mem of dangerMemory) {
    const timeSinceDanger = c.t - mem.time;
    if (timeSinceDanger >= 20) continue;
    const currentRadius = timeSinceDanger < 5 ? mem.radius : timeSinceDanger < 20 ? mem.radius * (1 - (timeSinceDanger - 5) / 15) : 0;
    if (currentRadius <= 0) continue;
    const dangCost = 10.0;
    const radiusInTiles = Math.ceil(currentRadius / T);
    const centerGx = Math.floor(mem.x / T);
    const centerGy = Math.floor(mem.y / T);
    for (let dy = -radiusInTiles; dy <= radiusInTiles; dy++) {
      for (let dx = -radiusInTiles; dx <= radiusInTiles; dx++) {
        const gx = centerGx + dx, gy = centerGy + dy;
        if (gx < 0 || gy < 0 || gx >= game.grid.cols || gy >= game.grid.rows) continue;
        const tileWorldX = gx * T + T / 2, tileWorldY = gy * T + T / 2;
        const distanceToTarget = Math.hypot(tileWorldX - mem.x, tileWorldY - mem.y);
        if (distanceToTarget <= currentRadius) {
          const idx = gy * game.grid.cols + gx;
          if (!game.grid.solid[idx]) { modifiedCosts.push({ idx, originalCost: game.grid.cost[idx] }); game.grid.cost[idx] = dangCost; }
        }
      }
    }
  }
  const path = aStar(game.grid, sx, sy, tx, ty);
  for (const mod of modifiedCosts) game.grid.cost[mod.idx] = mod.originalCost;
  return path;
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
