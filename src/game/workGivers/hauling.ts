import type { WorkGiver, WorkGiverContext, WorkCandidate } from './types';
import { getInventoryItemCount, hasInventorySpace } from '../systems/buildingInventory';

export const HaulingWorkGiver: WorkGiver = {
  getCandidates(ctx: WorkGiverContext): WorkCandidate[] {
    const { game, colonist, getWorkPriority, canDoWork } = ctx;
    const out: WorkCandidate[] = [];
    if (!canDoWork('Hauling')) return out;

    const stoves = game.buildings.filter((b: any) => b.kind === 'stove' && b.done && b.inventory);
    const pantries = game.buildings.filter((b: any) => b.kind === 'pantry' && b.done);
    if (pantries.length === 0) return out;

    // Prevent double-assignment: skip stoves already targeted by another colonist hauling bread
    const claimedStoves = new Set<any>();
    for (const col of game.colonists as any[]) {
      if (col !== colonist && col.task === 'haulBread' && col.target) {
        claimedStoves.add(col.target);
      }
    }

    for (const stove of stoves) {
      if (claimedStoves.has(stove)) continue;
      const breadInStove = getInventoryItemCount(stove, 'bread');
      if (breadInStove > 0) {
        // Prefer pantries with space for bread
        const pantriesWithSpace = pantries.filter((p: any) => hasInventorySpace(p, 'bread'));
        const candidatePantries = pantriesWithSpace.length > 0 ? pantriesWithSpace : pantries;
        
        // Find nearest pantry with safety check for empty array
        if (candidatePantries.length === 0) continue; // Skip if no pantries available
        
        const nearestPantry = candidatePantries.reduce((closest: any, p: any) => {
          const dist = Math.hypot(colonist.x - (p.x + p.w / 2), colonist.y - (p.y + p.h / 2));
          const closestDist = Math.hypot(colonist.x - (closest.x + closest.w / 2), colonist.y - (closest.y + closest.h / 2));
          return dist < closestDist ? p : closest;
        });
        const distanceToStove = Math.hypot(colonist.x - (stove.x + stove.w / 2), colonist.y - (stove.y + stove.h / 2));
        out.push({
          workType: 'Hauling',
          task: 'haulBread',
          target: stove,
          extraData: nearestPantry,
          distance: distanceToStove,
          priority: getWorkPriority('Hauling')
        });
      }
    }

    return out;
  }
};
