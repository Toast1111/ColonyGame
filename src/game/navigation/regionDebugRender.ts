/**
 * Region Debug Rendering - Visualize regions, links, and rooms
 */

import type { Game } from "../Game";
import type { Region, Room } from "../navigation/regions";
import { T } from "../constants";

/**
 * Draw region boundaries and debug info
 */
export function drawRegionDebug(game: Game): void {
  if (!game.regionManager.isEnabled()) {
    game.ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
    game.ctx.font = '20px monospace';
    game.ctx.fillText('Regions Disabled', 20, 100);
    return;
  }

  const ctx = game.ctx;
  const regions = game.regionManager.getRegions();
  const rooms = game.regionManager.getRooms();
  const regionGrid = (game.regionManager as any).builder.getRegionGrid();

  // Draw region cells
  ctx.globalAlpha = 0.2;
  for (const region of regions.values()) {
    // Generate a color based on region ID
    const hue = (region.id * 137) % 360;
    ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;

    for (const cellIdx of region.cells) {
      const x = (cellIdx % regionGrid.cols) * T;
      const y = Math.floor(cellIdx / regionGrid.cols) * T;
      ctx.fillRect(x, y, T, T);
    }
  }
  ctx.globalAlpha = 1.0;

  // Draw region borders
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  for (const region of regions.values()) {
    for (const cellIdx of region.cells) {
      const gx = cellIdx % regionGrid.cols;
      const gy = Math.floor(cellIdx / regionGrid.cols);
      const x = gx * T;
      const y = gy * T;

      // Check each edge
      const neighbors = [
        { dx: 0, dy: -1 }, // North
        { dx: 1, dy: 0 },  // East
        { dx: 0, dy: 1 },  // South
        { dx: -1, dy: 0 }, // West
      ];

      for (const { dx, dy } of neighbors) {
        const nx = gx + dx;
        const ny = gy + dy;
        if (nx < 0 || ny < 0 || nx >= regionGrid.cols || ny >= regionGrid.rows) {
          // Map edge
          ctx.strokeRect(x, y, T, T);
          continue;
        }

        const nRegionId = regionGrid.get(nx, ny);
        if (nRegionId !== region.id) {
          // Different region - draw border
          ctx.beginPath();
          if (dx === 0) {
            // Horizontal border
            const by = y + (dy > 0 ? T : 0);
            ctx.moveTo(x, by);
            ctx.lineTo(x + T, by);
          } else {
            // Vertical border
            const bx = x + (dx > 0 ? T : 0);
            ctx.moveTo(bx, y);
            ctx.lineTo(bx, y + T);
          }
          ctx.stroke();
        }
      }
    }
  }

  // Draw region links
  ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
  ctx.lineWidth = 2;
  for (const region of regions.values()) {
    for (const link of region.links) {
      const x = link.x * T;
      const y = link.y * T;

      ctx.beginPath();
      if (link.edge === 0) {
        // North edge
        ctx.moveTo(x, y);
        ctx.lineTo(x + link.span * T, y);
      } else if (link.edge === 1) {
        // East edge
        ctx.moveTo(x + T, y);
        ctx.lineTo(x + T, y + link.span * T);
      } else if (link.edge === 2) {
        // South edge
        ctx.moveTo(x, y + T);
        ctx.lineTo(x + link.span * T, y + T);
      } else {
        // West edge
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + link.span * T);
      }
      ctx.stroke();
    }
  }

  // Draw region IDs
  ctx.fillStyle = 'white';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const region of regions.values()) {
    // Find center of region
    let sumX = 0, sumY = 0;
    for (const cellIdx of region.cells) {
      const gx = cellIdx % regionGrid.cols;
      const gy = Math.floor(cellIdx / regionGrid.cols);
      sumX += gx * T + T / 2;
      sumY += gy * T + T / 2;
    }
    const centerX = sumX / region.cells.size;
    const centerY = sumY / region.cells.size;

    ctx.fillText(`R${region.id}`, centerX, centerY - 6);
    if (region.roomId !== null) {
      ctx.fillText(`Room${region.roomId}`, centerX, centerY + 6);
    }
  }

  // Draw stats
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(10, 10, 300, 100);
  ctx.fillStyle = 'white';
  ctx.font = '14px monospace';
  const stats = game.regionManager.getStats();
  ctx.fillText(`Regions: ${stats.regionCount}`, 20, 20);
  ctx.fillText(`Rooms: ${stats.roomCount}`, 20, 40);
  ctx.fillText(`Avg Region Size: ${stats.avgRegionSize.toFixed(1)} cells`, 20, 60);
  ctx.fillText(`Avg Room Size: ${stats.avgRoomSize.toFixed(1)} regions`, 20, 80);
}

/**
 * Draw region info for a specific position
 */
export function drawRegionInfoAtPosition(game: Game, worldX: number, worldY: number): void {
  if (!game.regionManager.isEnabled()) return;

  const region = game.regionManager.getRegionAt(worldX, worldY);
  if (!region) return;

  const ctx = game.ctx;
  ctx.save();

  // Draw info box
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(worldX + 20, worldY - 40, 200, 80);

  ctx.fillStyle = 'white';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  let y = worldY - 35;
  ctx.fillText(`Region ID: ${region.id}`, worldX + 25, y);
  y += 15;
  ctx.fillText(`Cells: ${region.cells.size}`, worldX + 25, y);
  y += 15;
  ctx.fillText(`Neighbors: ${region.neighbors.size}`, worldX + 25, y);
  y += 15;
  ctx.fillText(`Room: ${region.roomId ?? 'None'}`, worldX + 25, y);
  y += 15;
  ctx.fillText(`Edge: ${region.touchesMapEdge ? 'Yes' : 'No'}`, worldX + 25, y);

  ctx.restore();
}
