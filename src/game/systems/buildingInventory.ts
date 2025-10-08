/**
 * Building Inventory System
 * 
 * Manages storage of items/resources within buildings like pantries, farms, warehouses, etc.
 * Allows buildings to hold items that colonists can deposit and retrieve.
 */

import type { Building, BuildingInventory, BuildingInventoryItem, Resources } from '../types';

/**
 * Initialize inventory for a building
 */
export function initializeBuildingInventory(building: Building, capacity: number): void {
  if (!building.inventory) {
    building.inventory = {
      items: [],
      capacity
    };
  }
}

/**
 * Get default inventory capacity for building types
 */
export function getDefaultInventoryCapacity(buildingKind: string): number {
  switch (buildingKind) {
    case 'pantry':
      return 10; // Can store 10 different item stacks
    case 'farm':
      return 5; // Can store 5 stacks of wheat before colonist hauls it
    case 'warehouse':
      return 20; // Large storage
    case 'stock':
      return 15; // Medium storage
    case 'hq':
      return 30; // Very large storage
    case 'stove':
      return 3; // Small temporary storage for cooking
    default:
      return 0; // No inventory by default
  }
}

/**
 * Check if building should have inventory
 */
export function shouldHaveInventory(buildingKind: string): boolean {
  return ['pantry', 'farm', 'warehouse', 'stock', 'hq', 'stove'].includes(buildingKind);
}

/**
 * Add item to building inventory
 * Returns the amount actually added (may be less if inventory full)
 */
export function addItemToInventory(
  building: Building, 
  itemType: keyof Resources, 
  quantity: number
): number {
  if (!building.inventory) {
    const capacity = getDefaultInventoryCapacity(building.kind);
    if (capacity === 0) return 0;
    initializeBuildingInventory(building, capacity);
  }

  const inventory = building.inventory!;
  
  // Find existing stack of this item type
  let existingItem = inventory.items.find(item => item.type === itemType);
  
  if (existingItem) {
    // Add to existing stack
    const maxStack = existingItem.maxStack || getMaxStackSize(itemType);
    const canAdd = Math.min(quantity, maxStack - existingItem.quantity);
    existingItem.quantity += canAdd;
    return canAdd;
  } else {
    // Create new stack
    if (inventory.items.length >= inventory.capacity) {
      return 0; // Inventory full (no more slots)
    }
    
    const maxStack = getMaxStackSize(itemType);
    const amountToAdd = Math.min(quantity, maxStack);
    
    inventory.items.push({
      type: itemType,
      quantity: amountToAdd,
      maxStack
    });
    
    return amountToAdd;
  }
}

/**
 * Remove item from building inventory
 * Returns the amount actually removed
 */
export function removeItemFromInventory(
  building: Building,
  itemType: keyof Resources,
  quantity: number
): number {
  if (!building.inventory) return 0;
  
  const inventory = building.inventory;
  const itemIndex = inventory.items.findIndex(item => item.type === itemType);
  
  if (itemIndex === -1) return 0;
  
  const item = inventory.items[itemIndex];
  const amountToRemove = Math.min(quantity, item.quantity);
  
  item.quantity -= amountToRemove;
  
  // Remove empty stacks
  if (item.quantity <= 0) {
    inventory.items.splice(itemIndex, 1);
  }
  
  return amountToRemove;
}

/**
 * Get quantity of a specific item in building inventory
 */
export function getInventoryItemCount(
  building: Building,
  itemType: keyof Resources
): number {
  if (!building.inventory) return 0;
  
  const item = building.inventory.items.find(i => i.type === itemType);
  return item ? item.quantity : 0;
}

/**
 * Check if building has space for more items
 */
export function hasInventorySpace(building: Building, itemType?: keyof Resources): boolean {
  if (!building.inventory) return false;
  
  if (itemType) {
    // Check if we can add to existing stack or have room for new slot
    const existingItem = building.inventory.items.find(item => item.type === itemType);
    if (existingItem) {
      const maxStack = existingItem.maxStack || getMaxStackSize(itemType);
      return existingItem.quantity < maxStack;
    }
  }
  
  // Check if we have room for a new item slot
  return building.inventory.items.length < building.inventory.capacity;
}

/**
 * Get total number of items (all types combined) in building
 */
export function getTotalInventoryCount(building: Building): number {
  if (!building.inventory) return 0;
  
  return building.inventory.items.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Get inventory usage percentage (0-100)
 */
export function getInventoryUsagePercent(building: Building): number {
  if (!building.inventory) return 0;
  
  const slotsUsed = building.inventory.items.length;
  const slotsTotal = building.inventory.capacity;
  
  return slotsTotal > 0 ? Math.round((slotsUsed / slotsTotal) * 100) : 0;
}

/**
 * Clear all items from inventory
 */
export function clearInventory(building: Building): void {
  if (building.inventory) {
    building.inventory.items = [];
  }
}

/**
 * Get max stack size for different resource types
 */
function getMaxStackSize(itemType: keyof Resources): number {
  switch (itemType) {
    case 'wood':
      return 75;
    case 'stone':
      return 75;
    case 'food':
      return 50;
    case 'wheat':
      return 100;
    case 'bread':
      return 50;
    case 'medicine':
      return 20;
    case 'herbal':
      return 30;
    default:
      return 50;
  }
}

/**
 * Transfer items from one building to another
 */
export function transferItems(
  fromBuilding: Building,
  toBuilding: Building,
  itemType: keyof Resources,
  quantity: number
): number {
  const removed = removeItemFromInventory(fromBuilding, itemType, quantity);
  if (removed > 0) {
    const added = addItemToInventory(toBuilding, itemType, removed);
    
    // If couldn't add all, put remainder back
    if (added < removed) {
      addItemToInventory(fromBuilding, itemType, removed - added);
    }
    
    return added;
  }
  
  return 0;
}

/**
 * Get display name for resource type
 */
export function getResourceDisplayName(resourceType: keyof Resources): string {
  const names: Record<keyof Resources, string> = {
    wood: 'Wood',
    stone: 'Stone',
    food: 'Food',
    wheat: 'Wheat',
    bread: 'Bread',
    medicine: 'Medicine',
    herbal: 'Herbal Medicine'
  };
  
  return names[resourceType] || resourceType;
}

/**
 * Get emoji icon for resource type
 */
export function getResourceIcon(resourceType: keyof Resources): string {
  const icons: Record<keyof Resources, string> = {
    wood: '🪵',
    stone: '🪨',
    food: '🍎',
    wheat: '🌾',
    bread: '🍞',
    medicine: '💊',
    herbal: '🌿'
  };
  
  return icons[resourceType] || '📦';
}
