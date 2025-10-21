import type { WorkGiver, WorkGiverContext, WorkCandidate } from './types';
import type { FloorItem } from '../types/items';

// Haul ground items to appropriate stockpile zone (floor item system)
export const FloorHaulingWorkGiver: WorkGiver = {
  getCandidates(ctx: WorkGiverContext): WorkCandidate[] {
    const { game, colonist, getWorkPriority, canDoWork } = ctx as any;
    const out: WorkCandidate[] = [];
    if (!canDoWork('Hauling')) return out;

    const rim = (game as any).itemManager;
    if (!rim) return out; // Floor item system not initialized

    // Get items that need hauling (outside allowed zones)
    const items: FloorItem[] = rim.getItemsNeedingHauling();
    if (!items || items.length === 0) return out;

    // Simple reservation to reduce conflicts: see if another colonist is targeting this item
    const claimed = new Set<string>();
    for (const col of game.colonists as any[]) {
      if (col !== colonist && col.task === 'haulFloorItem' && col.taskData && col.taskData.itemId) {
        claimed.add(col.taskData.itemId as string);
      }
    }

    for (const item of items) {
      if (claimed.has(item.id)) continue;
      // Find best storage location for this item type
      const best = rim.findBestStorageLocation(item.type);
      if (!best) continue;

      const dist = Math.hypot(colonist.x - item.position.x, colonist.y - item.position.y);
      out.push({
        workType: 'Hauling',
        task: 'haulFloorItem',
        target: item, // we'll walk to the item position
        distance: dist,
        priority: getWorkPriority('Hauling'),
        extraData: {
          itemId: item.id,
          itemType: item.type,
          destination: best.position,
          zoneId: best.zone.id
        }
      });
    }

    return out;
  }
};
