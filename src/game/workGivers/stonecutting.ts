import type { WorkGiver, WorkGiverContext, WorkCandidate } from './types';

export const StonecuttingWorkGiver: WorkGiver = {
  getCandidates(ctx: WorkGiverContext): WorkCandidate[] {
    const { game, colonist, getWorkPriority, canDoWork } = ctx;
    const out: WorkCandidate[] = [];
    
    // Check if colonist can do crafting work
    if (!canDoWork('Crafting')) return out;

    // Check if there's raw stone available on the floor
    const rim = (game as any).itemManager;
    if (!rim) return out;
    
    // Get all floor items and check for rubble (mined mountain stone chunks)
    const allFloorItems = rim.floorItems.getAllItems();
    
    // Rubble is raw stone chunks from mining mountains that need to be cut into usable stone blocks
    // Need at least 2 rubble chunks to make 1 stone block
    const totalRubble = allFloorItems
      .filter((item: any) => item.type === 'rubble' && item.quantity > 0)
      .reduce((sum: number, item: any) => sum + item.quantity, 0);
    
    if (totalRubble < 2) return out; // Need at least 2 rubble to cut

    // Find available stonecutting tables
    const tables = game.buildings.filter((b: any) => 
      b.kind === 'stonecutting_table' && 
      b.done &&
      (!b.cuttingColonist || b.cuttingColonist === colonist.id)
    );

    if (tables.length > 0) {
      // Find closest available table
      const availableTable = tables.reduce((closest: any, table: any) => {
        if (!closest) return table;
        const d1 = Math.hypot(colonist.x - (table.x + table.w / 2), colonist.y - (table.y + table.h / 2));
        const d2 = Math.hypot(colonist.x - (closest.x + closest.w / 2), colonist.y - (closest.y + closest.h / 2));
        return d1 < d2 ? table : closest;
      }, null);
      
      if (availableTable) {
        const distance = Math.hypot(
          colonist.x - (availableTable.x + availableTable.w / 2), 
          colonist.y - (availableTable.y + availableTable.h / 2)
        );
        out.push({
          workType: 'Crafting',
          task: 'stonecutting',
          target: availableTable,
          distance,
          priority: getWorkPriority('Crafting')
        });
      }
    }

    return out;
  }
};
