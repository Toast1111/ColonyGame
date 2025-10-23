import type { WorkGiver, WorkGiverContext, WorkCandidate } from './types';

export const CookingWorkGiver: WorkGiver = {
  getCandidates(ctx: WorkGiverContext): WorkCandidate[] {
    const { game, colonist, getWorkPriority, canDoWork } = ctx;
    const out: WorkCandidate[] = [];
    if (!canDoWork('Cooking')) return out;

    // Check if there's wheat on the floor to cook
    const rim = (game as any).itemManager;
    if (!rim) return out;
    
    // Check total wheat available (could be split across multiple piles)
    const totalWheat = rim.floorItems
      .filter((item: any) => item.type === 'wheat' && item.quantity > 0)
      .reduce((sum: number, item: any) => sum + item.quantity, 0);
    
    if (totalWheat < 5) return out; // Need at least 5 wheat to cook

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
