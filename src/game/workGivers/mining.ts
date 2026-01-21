import type { WorkGiver, WorkGiverContext, WorkCandidate } from './types';
import { isMountainTile } from '../terrain';
import { T } from '../constants';
import { snapToTileCenter } from '../utils/tileAlignment';

export const MiningWorkGiver: WorkGiver = {
  getCandidates(ctx: WorkGiverContext): WorkCandidate[] {
    const { game, colonist, getWorkPriority, canDoWork } = ctx;
    const out: WorkCandidate[] = [];
    if (!canDoWork('Mining')) return out;

    const priority = getWorkPriority('Mining');

    // Look for mountain tiles within mining zones
    const miningZones = (game as any).miningZones || [];
    if (miningZones.length > 0) {
      let nearestMountainTile: { gx: number; gy: number; x: number; y: number } | null = null;
      let nearestDist = Infinity;

      for (const zone of miningZones) {
        // Scan the zone for mineable mountain tiles
        const startGX = Math.floor(zone.x / T);
        const startGY = Math.floor(zone.y / T);
        const endGX = Math.floor((zone.x + zone.w) / T);
        const endGY = Math.floor((zone.y + zone.h) / T);

        for (let gy = startGY; gy <= endGY; gy++) {
          for (let gx = startGX; gx <= endGX; gx++) {
            // Check if this tile is a mountain
            if (!isMountainTile(game.terrainGrid, gx, gy)) continue;

            // Check if already assigned
            const tileKey = `${gx},${gy}`;
            if ((game as any).assignedTiles?.has(tileKey)) continue;

            // Calculate distance using tile-aligned position
            const tileCenter = snapToTileCenter(gx * T, gy * T);
            const dist = Math.hypot(colonist.x - tileCenter.x, colonist.y - tileCenter.y);

            if (dist < nearestDist) {
              nearestDist = dist;
              nearestMountainTile = { 
                gx, 
                gy, 
                x: tileCenter.x, 
                y: tileCenter.y 
              };
            }
          }
        }
      }

      // If we found a mountain tile, validate pathfinding before assigning
      if (nearestMountainTile) {
        // Quick pathfinding validation to prevent stuck colonists
        try {
          const path = game.navigationManager?.computePathWithDangerAvoidance(
            colonist, colonist.x, colonist.y, nearestMountainTile.x, nearestMountainTile.y
          );
          
          if (path && path.length > 0) {
            out.push({
              workType: 'Mining',
              task: 'mine',
              target: nearestMountainTile,
              distance: nearestDist,
              priority
            });
            return out; // Return immediately - mountain mining takes precedence
          } else {
            // Mountain tile is unreachable - mark as assigned to prevent retrying
            const tileKey = `${nearestMountainTile.gx},${nearestMountainTile.gy}`;
            if ((game as any).assignedTiles) {
              (game as any).assignedTiles.add(tileKey);
            }
            console.log(`[Mining] Mountain tile at (${nearestMountainTile.gx},${nearestMountainTile.gy}) is unreachable, skipping`);
          }
        } catch (error) {
          console.warn('[Mining] Pathfinding validation failed:', error);
        }
      }
    }

    // Fallback: mine rocks if we need stone
    if (!(game.RES.stone < game.RES.wood || game.RES.stone < 20)) return out;

    const availableRocks = game.rocks.filter((r: any) => !game.assignedTargets.has(r));
    const nearRock = game.nearestSafeCircle(colonist, { x: colonist.x, y: colonist.y }, availableRocks as any);
    if (!nearRock) return out;

    const distance = Math.hypot(colonist.x - nearRock.x, colonist.y - nearRock.y);
    out.push({
      workType: 'Mining',
      task: 'mine',
      target: nearRock,
      distance,
      priority
    });

    return out;
  }
};
