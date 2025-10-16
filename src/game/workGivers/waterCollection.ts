import type { WorkGiver, WorkGiverContext, WorkCandidate } from './types';

// Water collection from wells (treated as part of Growing work type)
// Emits a harvestWell task when colony food is low and at least one completed well exists.
export const WaterCollectionWorkGiver: WorkGiver = {
  getCandidates(ctx: WorkGiverContext): WorkCandidate[] {
    const { game, colonist, getWorkPriority, canDoWork } = ctx;
    const out: WorkCandidate[] = [];
    if (!canDoWork('Growing')) return out;

    // Only propose water collection if food is low (mirror PlantCutting gate)
    const needsFood = (game.RES?.food || 0) < Math.max(4, (game.colonists?.length || 1) * 2);
    if (!needsFood) return out;

    const wells = game.buildings.filter((b: any) => b.kind === 'well' && b.done);
    if (!wells.length) return out;

    // Choose the nearest well to reduce contention and pointless travel
    let best: any | null = null;
    let bestDist = Infinity;
    for (const w of wells) {
      const wx = w.x + w.w / 2;
      const wy = w.y + w.h / 2;
      const d = Math.hypot(colonist.x - wx, colonist.y - wy);
      if (d < bestDist) { bestDist = d; best = w; }
    }

    if (best) {
      out.push({
        workType: 'Growing',
        task: 'harvestWell',
        target: best,
        distance: bestDist,
        priority: getWorkPriority('Growing')
      });
    }

    return out;
  }
};
