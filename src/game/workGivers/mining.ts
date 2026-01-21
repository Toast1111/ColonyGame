import type { WorkGiver, WorkGiverContext, WorkCandidate } from './types';
import { isMountainTile, getVisibleOreAt } from '../terrain';
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
      let nearestVisibleOre: { gx: number; gy: number; x: number; y: number; dist: number } | null = null;
      let nearestEdgeTile: { gx: number; gy: number; x: number; y: number; dist: number } | null = null;

      const isEdgeTile = (gx: number, gy: number) => {
        const n = [
          [gx + 1, gy],
          [gx - 1, gy],
          [gx, gy + 1],
          [gx, gy - 1],
        ];
        for (const [nx, ny] of n) {
          if (!isMountainTile(game.terrainGrid, nx, ny)) return true;
        }
        return false;
      };

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

            const tileCenter = snapToTileCenter(gx * T, gy * T);
            const dist = Math.hypot(colonist.x - tileCenter.x, colonist.y - tileCenter.y);

            // Prefer tiles with visible ore first
            const oreType = getVisibleOreAt(game.terrainGrid, gx, gy);
            if (oreType) {
              if (!nearestVisibleOre || dist < nearestVisibleOre.dist) {
                nearestVisibleOre = { gx, gy, x: tileCenter.x, y: tileCenter.y, dist };
              }
              continue;
            }

            // Otherwise pick an edge tile to expose ore deeper in the mountain
            if (isEdgeTile(gx, gy)) {
              if (!nearestEdgeTile || dist < nearestEdgeTile.dist) {
                nearestEdgeTile = { gx, gy, x: tileCenter.x, y: tileCenter.y, dist };
              }
            }
          }
        }
      }

      // Prefer visible ore tiles; otherwise mine edge tiles to expose ore
      const chosen = nearestVisibleOre || nearestEdgeTile;

      // If we found a mountain tile, validate pathfinding before assigning
      if (chosen) {
        // Quick pathfinding validation to prevent stuck colonists
        try {
          const path = game.navigationManager?.computePathWithDangerAvoidance(
            colonist, colonist.x, colonist.y, chosen.x, chosen.y
          );
          
          if (path && path.length > 0) {
            out.push({
              workType: 'Mining',
              task: 'mine',
              target: { gx: chosen.gx, gy: chosen.gy, x: chosen.x, y: chosen.y },
              distance: chosen.dist,
              priority
            });
            return out; // Return immediately - mountain mining takes precedence
          } else {
            // Mountain tile is unreachable - mark as assigned to prevent retrying
            const tileKey = `${chosen.gx},${chosen.gy}`;
            if ((game as any).assignedTiles) {
              (game as any).assignedTiles.add(tileKey);
            }
            console.log(`[Mining] Mountain tile at (${chosen.gx},${chosen.gy}) is unreachable, skipping`);
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
