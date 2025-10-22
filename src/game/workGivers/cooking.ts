import type { WorkGiver, WorkGiverContext, WorkCandidate } from './types';
import { getInventoryItemCount } from '../systems/buildingInventory';

export const CookingWorkGiver: WorkGiver = {
  getCandidates(ctx: WorkGiverContext): WorkCandidate[] {
    const { game, colonist, getWorkPriority, canDoWork } = ctx;
    const out: WorkCandidate[] = [];
    if (!canDoWork('Cooking')) return out;

    const stoves = game.buildings.filter((b: any) => b.kind === 'stove' && b.done);
    const farms = game.buildings.filter((b: any) => b.kind === 'farm' && b.done);
    let totalWheatAvailable = game.RES.wheat || 0;
    for (const farm of farms) {
      if (farm.inventory) totalWheatAvailable += getInventoryItemCount(farm, 'wheat');
    }

    if (stoves.length > 0 && totalWheatAvailable >= 5) {
      // Avoid assigning the same stove to multiple colonists; prefer idle stoves
      const busyStoveIds = new Set<string | number>();
      for (const col of game.colonists as any[]) {
        if (col.task === 'cookWheat' && col.target) {
          busyStoveIds.add(col.target.id || col.target);
        }
      }
      const availableStove = stoves.find((s: any) => (!s.cookingColonist || s.cookingColonist === colonist.id) && !busyStoveIds.has(s.id || s));
      if (availableStove) {
        const distance = Math.hypot(colonist.x - (availableStove.x + availableStove.w / 2), colonist.y - (availableStove.y + availableStove.h / 2));
        out.push({
          workType: 'Cooking',
          task: 'cookWheat',
          target: availableStove,
          distance,
          priority: getWorkPriority('Cooking')
        });
      }
    }

    if (colonist.carryingBread && colonist.carryingBread > 0) {
      const pantries = game.buildings.filter((b: any) => b.kind === 'pantry' && b.done);
      if (pantries.length > 0) {
        // Find nearest pantry - safe because we checked length > 0
        let nearestPantry = pantries[0];
        let minDist = Math.hypot(colonist.x - (nearestPantry.x + nearestPantry.w / 2), colonist.y - (nearestPantry.y + nearestPantry.h / 2));
        
        for (let i = 1; i < pantries.length; i++) {
          const p = pantries[i];
          const dist = Math.hypot(colonist.x - (p.x + p.w / 2), colonist.y - (p.y + p.h / 2));
          if (dist < minDist) {
            minDist = dist;
            nearestPantry = p;
          }
        }
        
        out.push({
          workType: 'Cooking',
          task: 'storeBread',
          target: nearestPantry,
          distance: minDist,
          priority: getWorkPriority('Cooking') - 1 // Slight bias to finish the job
        });
      }
    }

    return out;
  }
};
