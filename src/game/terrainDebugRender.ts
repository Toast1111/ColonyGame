/**
 * Terrain Debug Visualization
 * Shows terrain and floor layers for debugging
 */

import { T } from "./constants";
import { getFloorTypeFromId, getTerrainTypeFromId, FLOOR_VISUALS, TERRAIN_VISUALS, FloorType } from "./terrain";
import type { Game } from "./Game";

/**
 * Draw terrain debug overlay
 * Shows floor types (paths, roads) as semi-transparent overlays
 */
export function drawTerrainDebug(game: Game) {
  const { ctx, camera, terrainGrid } = game;
  
  ctx.save();
  
  // Calculate visible bounds
  const startX = Math.max(0, Math.floor(camera.x / T));
  const startY = Math.max(0, Math.floor(camera.y / T));
  const endX = Math.min(terrainGrid.cols, Math.ceil((camera.x + ctx.canvas.width / camera.zoom) / T));
  const endY = Math.min(terrainGrid.rows, Math.ceil((camera.y + ctx.canvas.height / camera.zoom) / T));
  
  // Draw floor layer (paths, roads, etc.)
  for (let gy = startY; gy < endY; gy++) {
    for (let gx = startX; gx < endX; gx++) {
      const idx = gy * terrainGrid.cols + gx;
      const floorType = getFloorTypeFromId(terrainGrid.floors[idx]);
      
      // Skip empty floor tiles
      if (floorType === FloorType.NONE) continue;
      
      const visual = FLOOR_VISUALS[floorType];
      if (!visual) continue;
      
      // Draw floor overlay
      ctx.fillStyle = visual.color;
      ctx.globalAlpha = 0.6; // Semi-transparent
      ctx.fillRect(gx * T, gy * T, T, T);
      
      // Draw border to make tiles distinct
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.4;
      ctx.strokeRect(gx * T, gy * T, T, T);
      
      // Draw floor type label for better debugging
      ctx.fillStyle = 'white';
      ctx.globalAlpha = 0.8;
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Abbreviate floor type name
      const label = floorType === FloorType.BASIC_PATH ? 'P' :
                    floorType === FloorType.STONE_ROAD ? 'R' :
                    floorType === FloorType.WOODEN_FLOOR ? 'W' :
                    floorType === FloorType.CONCRETE ? 'C' :
                    floorType === FloorType.METAL_FLOOR ? 'M' :
                    floorType === FloorType.CARPET ? 'Cp' : '?';
      
      ctx.fillText(label, gx * T + T/2, gy * T + T/2);
    }
  }
  
  ctx.restore();
}

/**
 * Draw detailed terrain info (optional, more verbose)
 * Shows both terrain AND floor layers with costs
 */
export function drawDetailedTerrainDebug(game: Game) {
  const { ctx, camera, terrainGrid, grid } = game;
  
  ctx.save();
  
  // Calculate visible bounds
  const startX = Math.max(0, Math.floor(camera.x / T));
  const startY = Math.max(0, Math.floor(camera.y / T));
  const endX = Math.min(terrainGrid.cols, Math.ceil((camera.x + ctx.canvas.width / camera.zoom) / T));
  const endY = Math.min(terrainGrid.rows, Math.ceil((camera.y + ctx.canvas.height / camera.zoom) / T));
  
  // Draw both terrain and floor
  for (let gy = startY; gy < endY; gy++) {
    for (let gx = startX; gx < endX; gx++) {
      const idx = gy * terrainGrid.cols + gx;
      
      const terrainType = getTerrainTypeFromId(terrainGrid.terrain[idx]);
      const floorType = getFloorTypeFromId(terrainGrid.floors[idx]);
      const cost = grid.cost[idx];
      
      // Draw terrain base (faded)
      const terrainVisual = TERRAIN_VISUALS[terrainType];
      if (terrainVisual) {
        ctx.fillStyle = terrainVisual.color;
        ctx.globalAlpha = 0.2;
        ctx.fillRect(gx * T, gy * T, T, T);
      }
      
      // Draw floor if present (more visible)
      if (floorType !== FloorType.NONE) {
        const floorVisual = FLOOR_VISUALS[floorType];
        if (floorVisual) {
          ctx.fillStyle = floorVisual.color;
          ctx.globalAlpha = 0.5;
          ctx.fillRect(gx * T, gy * T, T, T);
        }
      }
      
      // Draw cost value
      ctx.fillStyle = cost < 1 ? '#00ff00' : cost > 1 ? '#ff0000' : '#ffffff';
      ctx.globalAlpha = 0.9;
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cost.toFixed(1), gx * T + T/2, gy * T + T/2);
      
      // Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.3;
      ctx.strokeRect(gx * T, gy * T, T, T);
    }
  }
  
  ctx.restore();
}
