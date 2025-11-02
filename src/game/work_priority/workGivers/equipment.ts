/**
 * EquipmentWorkGiver - Assigns weapon pickup tasks to colonists
 * 
 * This work giver looks for weapons on the floor that would be upgrades
 * for colonists and assigns them equipment pickup tasks.
 */

import type { WorkGiver, WorkGiverContext, WorkCandidate } from '../../workGivers/types';
import { findBestWeaponUpgrade } from '../../colonist_systems/states/equipmentState';

// Helper function to check if item type is a weapon
function isWeapon(itemType: string): boolean {
  return ['gladius', 'mace', 'knife'].includes(itemType);
}

// Helper function to get weapon value for prioritization
function getWeaponValue(weaponType: string): number {
  const weaponValues: Record<string, number> = {
    'knife': 30,
    'gladius': 150,
    'mace': 180
  };
  return weaponValues[weaponType] || 0;
}

export const EquipmentWorkGiver: WorkGiver = {
  getCandidates(ctx: WorkGiverContext): WorkCandidate[] {
    const { game, colonist, getWorkPriority } = ctx;
    const out: WorkCandidate[] = [];
    
    // Don't assign equipment tasks to colonists who are busy with critical work
    if (colonist.state === 'doctoring' || colonist.state === 'beingTreated' || 
        colonist.state === 'downed' || colonist.state === 'flee') {
      return out;
    }
    
    // Don't assign if colonist is already carrying something important
    if ((colonist as any).carryingItem && (colonist as any).carryingItem.qty > 0) {
      return out;
    }
    
    // Check if there are weapons on the floor
    const rim = (game as any).itemManager;
    if (!rim) return out;
    
    const allFloorItems = rim.floorItems.getAllItems();
    const weaponItems = allFloorItems.filter((item: any) => 
      isWeapon(item.type) && item.quantity > 0
    );
    
    if (weaponItems.length === 0) return out;
    
    // Find the best weapon upgrade for this colonist
    const bestWeapon = findBestWeaponUpgrade(colonist, game);
    if (!bestWeapon) return out;
    
    // Check if another colonist is already going for this weapon
    const otherColonistTargeting = game.state.colonists.some((c: any) => 
      c !== colonist && 
      c.state === 'equipment' && 
      c.target && 
      c.target.id === bestWeapon.id
    );
    
    if (otherColonistTargeting) return out;
    
    // Calculate distance to weapon
    const distance = Math.hypot(colonist.x - bestWeapon.position.x, colonist.y - bestWeapon.position.y);
    
    // Calculate priority based on weapon value and colonist's current equipment
    const currentWeapon = colonist.inventory?.equipment?.weapon;
    const currentValue = currentWeapon ? getWeaponValue(currentWeapon.defName) : 0;
    const upgradeValue = getWeaponValue(bestWeapon.type);
    
    let priority = getWorkPriority('Handle'); // Use Handle work type for equipment management
    
    // Bonus priority for unarmed colonists
    if (!currentWeapon) {
      priority += 30;
    }
    
    // Bonus priority for significant upgrades
    if (upgradeValue > currentValue * 1.5) {
      priority += 20;
    }
    
    out.push({
      workType: 'Handle',
      task: 'equipment',
      target: bestWeapon,
      distance,
      priority
    });
    
    return out;
  }
};