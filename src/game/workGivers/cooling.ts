import type { WorkGiver, WorkGiverContext, WorkCandidate } from './types';

/**
 * CoolingWorkGiver - Assigns colonists to manually manage cooling racks
 * 
 * This work giver looks for hot ingots on the floor and assigns colonists to:
 * 1. Pick up hot ingots from the floor
 * 2. Move them to available cooling racks
 * 3. Monitor cooling progress until completion
 * 4. Collect cooled ingots when ready
 * 
 * Works alongside passive cooling where smelters auto-place ingots on racks.
 */
export const CoolingWorkGiver: WorkGiver = {
  getCandidates(ctx: WorkGiverContext): WorkCandidate[] {
    const { game, colonist, getWorkPriority, canDoWork } = ctx;
    const out: WorkCandidate[] = [];
    
    // Check if colonist can do crafting work
    if (!canDoWork('Crafting')) return out;

    // Check if there are hot ingots available on the floor
    const rim = game.itemManager;
    if (!rim) return out;
    
    // Get all floor items and check for hot ingots
    const allFloorItems = rim.floorItems.getAllItems();
    const hotIngotTypes = ['hot_copper_ingot', 'hot_steel_ingot', 'hot_silver_ingot', 'hot_gold_ingot'];
    
    // Count available hot ingots
    const totalHotIngots = allFloorItems
      .filter((item: any) => hotIngotTypes.includes(item.type) && item.quantity > 0)
      .reduce((sum: number, item: any) => sum + item.quantity, 0);
    
    if (totalHotIngots < 1) return out; // Need at least 1 hot ingot to cool

    // Find available cooling racks
    const coolingRacks = game.state.buildings.filter((b: any) => 
      b.kind === 'cooling_rack' && 
      b.done &&
      (!b.coolingColonist || b.coolingColonist === colonist.id)
    );

    if (coolingRacks.length > 0) {
      // Find closest available cooling rack
      const availableRack = coolingRacks.reduce((closest: any, rack: any) => {
        if (!closest) return rack;
        const d1 = Math.hypot(colonist.x - (rack.x + rack.w / 2), colonist.y - (rack.y + rack.h / 2));
        const d2 = Math.hypot(colonist.x - (closest.x + closest.w / 2), colonist.y - (closest.y + closest.h / 2));
        return d1 < d2 ? rack : closest;
      }, null);
      
      if (availableRack) {
        const distance = Math.hypot(
          colonist.x - (availableRack.x + availableRack.w / 2), 
          colonist.y - (availableRack.y + availableRack.h / 2)
        );
        out.push({
          workType: 'Crafting',
          task: 'cooling',
          target: availableRack,
          distance,
          priority: getWorkPriority('Crafting')
        });
      }
    }

    return out;
  }
};
