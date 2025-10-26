import type { WorkGiver, WorkGiverContext, WorkCandidate } from './types';

export const SmeltingWorkGiver: WorkGiver = {
  getCandidates(ctx: WorkGiverContext): WorkCandidate[] {
    const { game, colonist, getWorkPriority, canDoWork } = ctx;
    const out: WorkCandidate[] = [];
    
    // Check if colonist can do crafting work
    if (!canDoWork('Crafting')) return out;

    // Check if there's raw ore available on the floor
    const rim = (game as any).itemManager;
    if (!rim) return out;
    
    // Get all floor items and check for ores (copper, steel, silver, gold)
    // NOTE: Coal is NOT smelted - it's already usable as fuel
    const allFloorItems = rim.floorItems.getAllItems();
    
    // Count available ores - need at least 1 to smelt
    const oreTypes = ['copper', 'steel', 'silver', 'gold']; // Removed coal - it doesn't need smelting
    const totalOre = allFloorItems
      .filter((item: any) => oreTypes.includes(item.type) && item.quantity > 0)
      .reduce((sum: number, item: any) => sum + item.quantity, 0);
    
    if (totalOre < 1) return out; // Need at least 1 ore to smelt

    // Find available smelters
    const smelters = game.buildings.filter((b: any) => 
      b.kind === 'smelter' && 
      b.done &&
      (!b.smeltingColonist || b.smeltingColonist === colonist.id)
    );

    if (smelters.length > 0) {
      // Find closest available smelter
      const availableSmelter = smelters.reduce((closest: any, smelter: any) => {
        if (!closest) return smelter;
        const d1 = Math.hypot(colonist.x - (smelter.x + smelter.w / 2), colonist.y - (smelter.y + smelter.h / 2));
        const d2 = Math.hypot(colonist.x - (closest.x + closest.w / 2), colonist.y - (closest.y + closest.h / 2));
        return d1 < d2 ? smelter : closest;
      }, null);
      
      if (availableSmelter) {
        const distance = Math.hypot(
          colonist.x - (availableSmelter.x + availableSmelter.w / 2), 
          colonist.y - (availableSmelter.y + availableSmelter.h / 2)
        );
        out.push({
          workType: 'Crafting',
          task: 'smelting',
          target: availableSmelter,
          distance,
          priority: getWorkPriority('Crafting')
        });
      }
    }

    return out;
  }
};
