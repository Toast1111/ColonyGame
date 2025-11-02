/**
 * Equipment State Handler
 * 
 * Handles colonists picking up and equipping weapons/armor from the floor:
 * 1. Find nearby weapons on floor that are better than current equipment
 * 2. Move to weapon location
 * 3. Pick up weapon and automatically equip it
 * 4. Drop old weapon if inventory is full
 */

import type { Colonist, ColonistState } from '../../types';
import type { Game } from '../../Game';
import type { ItemType } from '../../types/items';
import { itemDatabase } from '../../../data/itemDatabase';

export function updateEquipmentState(
  c: Colonist,
  game: Game,
  dt: number,
  changeState: (newState: ColonistState, reason?: string) => void
): void {
  // Timeout check - if stuck for too long, abandon
  if ((c.stateSince ?? 0) > 30) {
    console.log(`Equipment pickup timeout after ${(c.stateSince ?? 0).toFixed(1)}s, abandoning`);
    abandonEquipment(c, game, changeState, 'equipment pickup timeout');
    return;
  }
  
  const targetWeapon = c.target as any; // Should be a floor item
  
  // Validate target weapon still exists
  const rim = game.itemManager;
  if (!rim || !targetWeapon) {
    abandonEquipment(c, game, changeState, 'no target weapon');
    return;
  }
  
  // Find the actual floor item
  const allFloorItems = rim.floorItems.getAllItems();
  const weaponItem = allFloorItems.find((item: any) => 
    item.id === targetWeapon.id || 
    (item.position.x === targetWeapon.x && item.position.y === targetWeapon.y && isWeapon(item.type))
  );
  
  if (!weaponItem) {
    abandonEquipment(c, game, changeState, 'weapon item not found');
    return;
  }
  
  const weaponPos = { x: weaponItem.position.x, y: weaponItem.position.y };
  const distance = Math.hypot(c.x - weaponPos.x, c.y - weaponPos.y);
  
  // Phase 1: Move to weapon
  if (distance > 10) {
    game.moveAlongPath(c, dt, weaponPos, 10);
    return;
  }
  
  // Phase 2: Pick up and equip weapon
  handleWeaponPickupAndEquip(c, game, weaponItem, changeState);
}

/**
 * Handle picking up and equipping a weapon
 */
function handleWeaponPickupAndEquip(
  c: Colonist,
  game: Game,
  weaponItem: any,
  changeState: (newState: ColonistState, reason?: string) => void
): void {
  // Ensure colonist has inventory
  if (!c.inventory) {
    c.inventory = {
      items: [],
      equipment: {},
      carryCapacity: 50,
      currentWeight: 0
    };
  }
  
  // Pick up the weapon from floor
  const pickupResult = game.itemManager.pickupItems(weaponItem.id, 1);
  const picked = pickupResult?.taken || 0;
  
  if (picked <= 0) {
    abandonEquipment(c, game, changeState, 'failed to pickup weapon');
    return;
  }
  
  // Create weapon item for equipment
  const weaponDef = itemDatabase.getItemDef(weaponItem.type);
  if (!weaponDef) {
    abandonEquipment(c, game, changeState, 'weapon definition not found');
    return;
  }
  
  const newWeapon = itemDatabase.createItem(weaponItem.type, 1, 'normal');
  if (!newWeapon) {
    abandonEquipment(c, game, changeState, 'failed to create weapon item');
    return;
  }
  
  // Handle old weapon - drop it on floor if we have one
  const oldWeapon = c.inventory.equipment.weapon;
  if (oldWeapon) {
    const dropPos = { x: c.x, y: c.y };
    game.itemManager.dropItems(oldWeapon.defName as ItemType, 1, dropPos);
    game.msg(`${c.profile?.name || 'Colonist'} dropped ${oldWeapon.name}`, 'info');
  }
  
  // Equip new weapon
  c.inventory.equipment.weapon = newWeapon;
  
  // Recalculate inventory weight
  game.recalcInventoryWeight(c);
  
  game.msg(`${c.profile?.name || 'Colonist'} equipped ${newWeapon.name}!`, 'good');
  
  // Task complete
  c.task = null;
  c.target = null;
  game.clearPath(c);
  changeState('seekTask', 'weapon equipped');
}

/**
 * Check if an item type is a weapon
 */
function isWeapon(itemType: ItemType): boolean {
  const weaponTypes: ItemType[] = ['gladius', 'mace', 'knife'];
  return weaponTypes.includes(itemType);
}

/**
 * Abandon equipment pickup and clean up state
 */
function abandonEquipment(
  c: Colonist,
  game: Game,
  changeState: (newState: ColonistState, reason?: string) => void,
  reason: string
): void {
  c.task = null;
  c.target = null;
  game.clearPath(c);
  changeState('seekTask', reason);
}

/**
 * Find the best weapon upgrade for a colonist
 */
export function findBestWeaponUpgrade(colonist: Colonist, game: Game): any | null {
  const rim = game.itemManager;
  if (!rim) return null;
  
  const allFloorItems = rim.floorItems.getAllItems();
  const weaponItems = allFloorItems.filter((item: any) => isWeapon(item.type) && item.quantity > 0);
  
  if (weaponItems.length === 0) return null;
  
  const currentWeapon = colonist.inventory?.equipment?.weapon;
  const currentWeaponValue = getWeaponValue(currentWeapon?.defName as ItemType);
  
  // Find best weapon that's better than current
  let bestWeapon = null;
  let bestValue = currentWeaponValue;
  
  for (const weapon of weaponItems) {
    const weaponValue = getWeaponValue(weapon.type);
    if (weaponValue > bestValue) {
      // Check if we can reach this weapon (distance check)
      const distance = Math.hypot(colonist.x - weapon.position.x, colonist.y - weapon.position.y);
      if (distance < 500) { // Reasonable pickup distance
        bestWeapon = weapon;
        bestValue = weaponValue;
      }
    }
  }
  
  return bestWeapon;
}

/**
 * Get weapon value for comparison (higher = better)
 */
function getWeaponValue(weaponType: ItemType | undefined): number {
  if (!weaponType) return 0;
  
  const weaponDef = itemDatabase.getItemDef(weaponType);
  if (!weaponDef) return 0;
  
  // Simple weapon value calculation based on damage
  return weaponDef.damage || 0;
}