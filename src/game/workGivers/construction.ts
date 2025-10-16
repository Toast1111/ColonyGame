import type { WorkGiver, WorkGiverContext, WorkCandidate } from './types';

export const ConstructionWorkGiver: WorkGiver = {
  getCandidates(ctx: WorkGiverContext): WorkCandidate[] {
    const { game, colonist, getWorkPriority, canDoWork } = ctx;
    const out: WorkCandidate[] = [];
    if (!canDoWork('Construction')) return out;

    for (const b of game.buildings) {
      if (b.done) continue;
      const cur = game.buildReservations.get(b) || 0;
      if (cur >= game.getMaxCrew(b)) continue;

      const distance = Math.hypot(colonist.x - (b.x + b.w / 2), colonist.y - (b.y + b.h / 2));
      out.push({
        workType: 'Construction',
        task: 'build',
        target: b,
        distance,
        priority: getWorkPriority('Construction')
      });
    }

    return out;
  }
};
