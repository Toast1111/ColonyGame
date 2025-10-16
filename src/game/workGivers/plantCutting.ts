import type { WorkGiver, WorkGiverContext, WorkCandidate } from './types';

export const PlantCuttingWorkGiver: WorkGiver = {
  getCandidates(ctx: WorkGiverContext): WorkCandidate[] {
    const { game, colonist, getWorkPriority, canDoWork } = ctx;
    const out: WorkCandidate[] = [];
    if (!canDoWork('PlantCutting')) return out;

    const needsFood = game.RES.food < Math.max(4, game.colonists.length * 2);
    if (!(needsFood || game.RES.wood < game.RES.stone)) return out;

    const availableTrees = game.trees.filter((t: any) => !game.assignedTargets.has(t));
    const nearTree = game.nearestSafeCircle(colonist, { x: colonist.x, y: colonist.y }, availableTrees as any);
    if (!nearTree) return out;

    const distance = Math.hypot(colonist.x - nearTree.x, colonist.y - nearTree.y);
    out.push({
      workType: 'PlantCutting',
      task: 'chop',
      target: nearTree,
      distance,
      priority: getWorkPriority('PlantCutting')
    });

    return out;
  }
};
