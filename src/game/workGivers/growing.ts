import type { WorkGiver, WorkGiverContext, WorkCandidate } from './types';

export const GrowingWorkGiver: WorkGiver = {
  getCandidates(ctx: WorkGiverContext): WorkCandidate[] {
    const { game, colonist, getWorkPriority, canDoWork } = ctx;
    const out: WorkCandidate[] = [];
    if (!canDoWork('Growing')) return out;

    // Find first ready farm (preserve existing behavior). Can be extended to choose nearest.
    const readyFarm = game.buildings.find((b: any) => b.kind === 'farm' && b.done && b.ready);
    if (!readyFarm) return out;

    const cx = colonist.x;
    const cy = colonist.y;
    const fx = readyFarm.x + readyFarm.w / 2;
    const fy = readyFarm.y + readyFarm.h / 2;
    const distance = Math.hypot(cx - fx, cy - fy);

    out.push({
      workType: 'Growing',
      task: 'harvestFarm',
      target: readyFarm,
      distance,
      priority: getWorkPriority('Growing')
    });

    return out;
  }
};
