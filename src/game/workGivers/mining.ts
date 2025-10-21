import type { WorkGiver, WorkGiverContext, WorkCandidate } from './types';
import { isMountainTile, getVisibleOreAt } from '../terrain';
import { T } from '../constants';

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

            // Check if ore is visible (exposed)
            const oreType = getVisibleOreAt(game.terrainGrid, gx, gy);
            if (oreType === null) continue; // Not exposed yet

            // Check if already assigned
            const tileKey = `${gx},${gy}`;
            if ((game as any).assignedTiles?.has(tileKey)) continue;

            // Calculate distance
            const tileX = gx * T + T / 2;
            const tileY = gy * T + T / 2;
            const dist = Math.hypot(colonist.x - tileX, colonist.y - tileY);

            if (dist < nearestDist) {
              nearestDist = dist;
              nearestMountainTile = { gx, gy, x: tileX, y: tileY };
            }
          }
        }
      }

      // If we found a mountain tile, prioritize it
      if (nearestMountainTile) {
        out.push({
          workType: 'Mining',
          task: 'mine',
          target: nearestMountainTile,
          distance: nearestDist,
          priority
        });
        return out; // Return immediately - mountain mining takes precedence
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
