import type { WorkGiver, WorkGiverContext, WorkCandidate } from './types';

export const CookingWorkGiver: WorkGiver = {
  getCandidates(ctx: WorkGiverContext): WorkCandidate[] {
    const { game, colonist, getWorkPriority, canDoWork } = ctx;
    const out: WorkCandidate[] = [];
    if (!canDoWork('Cooking')) return out;

    // Check if there's wheat on the floor to cook
    const rim = (game as any).itemManager;
    if (!rim) return out;
    
    const wheatItems = rim.floorItems.filter((item: any) => item.type === 'wheat' && item.quantity >= 5);
    if (wheatItems.length === 0) return out;

    // Find available stoves
    const stoves = game.buildings.filter((b: any) => 
      b.kind === 'stove' && 
      b.done &&
      (!b.cookingColonist || b.cookingColonist === colonist.id)
    );

    if (stoves.length > 0) {
      // Find closest available stove
      const availableStove = stoves.reduce((closest: any, stove: any) => {
        if (!closest) return stove;
        const d1 = Math.hypot(colonist.x - (stove.x + stove.w / 2), colonist.y - (stove.y + stove.h / 2));
        const d2 = Math.hypot(colonist.x - (closest.x + closest.w / 2), colonist.y - (closest.y + closest.h / 2));
        return d1 < d2 ? stove : closest;
      }, null);
      
      if (availableStove) {
        const distance = Math.hypot(
          colonist.x - (availableStove.x + availableStove.w / 2), 
          colonist.y - (availableStove.y + availableStove.h / 2)
        );
        out.push({
          workType: 'Cooking',
          task: 'cookWheat',
          target: availableStove,
          distance,
          priority: getWorkPriority('Cooking')
        });
      }
    }

    return out;
  }
};
