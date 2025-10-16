import type { WorkGiver, WorkGiverContext, WorkCandidate } from './types';

export const MiningWorkGiver: WorkGiver = {
  getCandidates(ctx: WorkGiverContext): WorkCandidate[] {
    const { game, colonist, getWorkPriority, canDoWork } = ctx;
    const out: WorkCandidate[] = [];
    if (!canDoWork('Mining')) return out;

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
      priority: getWorkPriority('Mining')
    });

    return out;
  }
};
