import type { Vec2 } from "../../core/utils";
import type { ItemType, FloorItem, ItemStack } from "../types/items";

// Item definitions with properties
const ITEM_DEFINITIONS: Record<ItemType, { weight: number; stackLimit: number; stackRadius: number; color: string }> = {
  wood: {
    weight: 1,
    stackLimit: 50,
    stackRadius: 24,
    color: '#8B4513'
  },
  stone: {
    weight: 1,
    stackLimit: 30,
    stackRadius: 24,
    color: '#708090'
  },
  rubble: {
    weight: 1.2,
    stackLimit: 50,
    stackRadius: 26,
    color: '#5a6268' // Darker gray for raw rubble
  },
  food: {
    weight: 0.5,
    stackLimit: 20,
    stackRadius: 16,
    color: '#90EE90'
  },
  wheat: {
    weight: 0.3,
    stackLimit: 40,
    stackRadius: 20,
    color: '#F0E68C'
  },
  bread: {
    weight: 0.5,
    stackLimit: 30,
    stackRadius: 18,
    color: '#DEB887'
  },
  metal: {
    weight: 2,
    stackLimit: 25,
    stackRadius: 20,
    color: '#C0C0C0'
  },
  cloth: {
    weight: 0.1,
    stackLimit: 100,
    stackRadius: 16,
    color: '#F5F5DC'
  },
  medicine: {
    weight: 0.1,
    stackLimit: 10,
    stackRadius: 16,
    color: '#FF6347'
  },
  // Ore resources from mining mountains
  coal: {
    weight: 0.8,
    stackLimit: 75,
    stackRadius: 22,
    color: '#1f2937' // Dark gray/black
  },
  copper: {
    weight: 1.2,
    stackLimit: 75,
    stackRadius: 22,
    color: '#b45309' // Reddish-brown
  },
  steel: {
    weight: 1.5,
    stackLimit: 75,
    stackRadius: 22,
    color: '#64748b' // Blue-gray steel
  },
  silver: {
    weight: 0.008,
    stackLimit: 500,
    stackRadius: 20,
    color: '#d4d4d8' // Light silver
  },
  gold: {
    weight: 0.8,
    stackLimit: 25,
    stackRadius: 18,
    color: '#fbbf24' // Golden yellow
  }
};

export class FloorItemManager {
  private items: FloorItem[] = [];
  private nextId = 1;

  createItem(type: ItemType, quantity: number, position: Vec2, metadata?: { [key: string]: any }): FloorItem {
    const item: FloorItem = {
      id: `item_${this.nextId++}`,
      type,
      quantity,
      weight: this.getItemWeight(type) * quantity,
      stackLimit: this.getStackLimit(type),
      position: { x: position.x, y: position.y },
      createdAt: Date.now(),
      metadata
    };

    // Try to stack with nearby items of the same type AT THE EXACT POSITION (tile-based)
    const nearbyStack = this.findStackableItemAtPosition(item);
    if (nearbyStack) {
      return this.stackItems(nearbyStack, item);
    }

    this.items.push(item);
    return item;
  }

  /**
   * Find a stackable item at the EXACT position (for tile-based stacking)
   * This ensures items stack on the same tile, not just nearby
   */
  private findStackableItemAtPosition(newItem: FloorItem): FloorItem | null {
    const POSITION_TOLERANCE = 8; // Small tolerance for floating point errors
    
    for (const existingItem of this.items) {
      if (existingItem.type === newItem.type && existingItem.quantity < existingItem.stackLimit) {
        const distance = Math.hypot(existingItem.position.x - newItem.position.x, existingItem.position.y - newItem.position.y);
        if (distance <= POSITION_TOLERANCE) {
          // Found an item at the same position that can be stacked
          return existingItem;
        }
      }
    }
    return null;
  }

  private stackItems(existingItem: FloorItem, newItem: FloorItem): FloorItem {
    const canStack = Math.min(newItem.quantity, existingItem.stackLimit - existingItem.quantity);
    
    existingItem.quantity += canStack;
    existingItem.weight += this.getItemWeight(newItem.type) * canStack;
    
    // If there are leftover items, create a new stack
    // Note: The ItemManager should handle finding a new tile position via findBestStorageLocation
    // If items overflow here, they'll be created at the same position and trigger hauling
    const leftover = newItem.quantity - canStack;
    if (leftover > 0) {
      const leftoverItem: FloorItem = {
        ...newItem,
        id: `item_${this.nextId++}`,
        quantity: leftover,
        weight: this.getItemWeight(newItem.type) * leftover,
        position: { x: newItem.position.x, y: newItem.position.y } // Keep same position
      };
      
      this.items.push(leftoverItem);
    }
    
    return existingItem;
  }

  removeItem(itemId: string): FloorItem | null {
    const index = this.items.findIndex(item => item.id === itemId);
    if (index !== -1) {
      return this.items.splice(index, 1)[0];
    }
    return null;
  }

  takeFromItem(itemId: string, quantity: number): { item: FloorItem | null; taken: number } {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return { item: null, taken: 0 };

    const taken = Math.min(quantity, item.quantity);
    item.quantity -= taken;
    item.weight -= this.getItemWeight(item.type) * taken;

    if (item.quantity <= 0) {
      this.removeItem(itemId);
      return { item: null, taken };
    }

    return { item, taken };
  }

  getItemsInArea(center: Vec2, radius: number): FloorItem[] {
    return this.items.filter(item => {
      const distance = Math.hypot(item.position.x - center.x, item.position.y - center.y);
      return distance <= radius;
    });
  }

  getItemsNearPosition(position: Vec2, radius: number = 50): FloorItem[] {
    return this.items.filter(item => {
      const distance = Math.hypot(item.position.x - position.x, item.position.y - position.y);
      return distance <= radius;
    });
  }

  getAllItems(): FloorItem[] {
    return [...this.items];
  }

  // Get visual stacks for rendering (groups nearby items of same type)
  getVisualStacks(): ItemStack[] {
    const stacks: ItemStack[] = [];
    const processed = new Set<string>();

    for (const item of this.items) {
      if (processed.has(item.id)) continue;

      const stack: ItemStack = {
        type: item.type,
        totalQuantity: item.quantity,
        position: { x: item.position.x, y: item.position.y },
        itemIds: [item.id]
      };

      processed.add(item.id);

      // Find nearby items of the same type for visual grouping
      for (const otherItem of this.items) {
        if (processed.has(otherItem.id) || otherItem.type !== item.type) continue;
        
        const distance = Math.hypot(otherItem.position.x - item.position.x, otherItem.position.y - item.position.y);
        const def = ITEM_DEFINITIONS[item.type];
        if (distance <= def.stackRadius * 1.5) { // Slightly larger radius for visual grouping
          stack.itemIds.push(otherItem.id);
          stack.totalQuantity += otherItem.quantity;
          processed.add(otherItem.id);
        }
      }

      // Recalculate center based on all items in stack
      if (stack.itemIds.length > 1) {
        const stackItems = this.items.filter(i => stack.itemIds.includes(i.id));
        stack.position.x = stackItems.reduce((sum, item) => sum + item.position.x, 0) / stackItems.length;
        stack.position.y = stackItems.reduce((sum, item) => sum + item.position.y, 0) / stackItems.length;
      }

      stacks.push(stack);
    }

    return stacks;
  }

  getItemColor(type: ItemType): string {
    return ITEM_DEFINITIONS[type]?.color || '#FFFFFF';
  }

  private getItemWeight(type: ItemType): number {
    return ITEM_DEFINITIONS[type].weight;
  }

  private getStackLimit(type: ItemType): number {
    return ITEM_DEFINITIONS[type].stackLimit;
  }
}
