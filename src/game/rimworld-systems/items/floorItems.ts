import type { Vec2 } from "../../../core/utils";

export type ItemType = 'wood' | 'stone' | 'food' | 'metal' | 'cloth' | 'medicine';

export interface FloorItem {
  id: string;
  type: ItemType;
  quantity: number;
  weight: number; // Total weight of this stack
  stackLimit: number; // Maximum items in this stack
  position: Vec2; // World position of this item
  metadata?: { [key: string]: any }; // Additional data (buildingId, etc.)
}

export interface ItemStack {
  centerX: number;
  centerY: number;
  items: FloorItem[];
  totalQuantity: number;
  totalWeight: number;
}

// Item definitions with properties
const ITEM_DEFINITIONS: Record<ItemType, { weight: number; stackLimit: number; stackRadius: number }> = {
  wood: {
    weight: 1,
    stackLimit: 50,
    stackRadius: 24
  },
  stone: {
    weight: 1,
    stackLimit: 30,
    stackRadius: 24
  },
  food: {
    weight: 0.5,
    stackLimit: 20,
    stackRadius: 16
  },
  metal: {
    weight: 2,
    stackLimit: 25,
    stackRadius: 20
  },
  cloth: {
    weight: 0.1,
    stackLimit: 100,
    stackRadius: 16
  },
  medicine: {
    weight: 0.1,
    stackLimit: 10,
    stackRadius: 16
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
      metadata
    };

    // Try to stack with nearby items of the same type
    const nearbyStack = this.findNearbyStackableItem(item);
    if (nearbyStack) {
      return this.stackItems(nearbyStack, item);
    }

    this.items.push(item);
    return item;
  }

  private findNearbyStackableItem(newItem: FloorItem): FloorItem | null {
    const def = ITEM_DEFINITIONS[newItem.type];
    
    for (const existingItem of this.items) {
      if (existingItem.type === newItem.type && existingItem.quantity < existingItem.stackLimit) {
        const distance = Math.hypot(existingItem.position.x - newItem.position.x, existingItem.position.y - newItem.position.y);
        if (distance <= def.stackRadius) {
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
    const leftover = newItem.quantity - canStack;
    if (leftover > 0) {
      // Offset the new position slightly to avoid overlap
      const offsetPosition = {
        x: newItem.position.x + (Math.random() - 0.5) * 16,
        y: newItem.position.y + (Math.random() - 0.5) * 16
      };
      
      const leftoverItem: FloorItem = {
        ...newItem,
        id: `item_${this.nextId++}`,
        quantity: leftover,
        weight: this.getItemWeight(newItem.type) * leftover,
        position: offsetPosition
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
        centerX: item.position.x,
        centerY: item.position.y,
        items: [item],
        totalQuantity: item.quantity,
        totalWeight: item.weight
      };

      processed.add(item.id);

      // Find nearby items of the same type for visual grouping
      for (const otherItem of this.items) {
        if (processed.has(otherItem.id) || otherItem.type !== item.type) continue;
        
        const distance = Math.hypot(otherItem.position.x - item.position.x, otherItem.position.y - item.position.y);
        const def = ITEM_DEFINITIONS[item.type];
        if (distance <= def.stackRadius * 1.5) { // Slightly larger radius for visual grouping
          stack.items.push(otherItem);
          stack.totalQuantity += otherItem.quantity;
          stack.totalWeight += otherItem.weight;
          processed.add(otherItem.id);
        }
      }

      // Recalculate center based on all items in stack
      if (stack.items.length > 1) {
        stack.centerX = stack.items.reduce((sum, item) => sum + item.position.x, 0) / stack.items.length;
        stack.centerY = stack.items.reduce((sum, item) => sum + item.position.y, 0) / stack.items.length;
      }

      stacks.push(stack);
    }

    return stacks;
  }

  private getItemWeight(type: ItemType): number {
    return ITEM_DEFINITIONS[type].weight;
  }

  private getStackLimit(type: ItemType): number {
    return ITEM_DEFINITIONS[type].stackLimit;
  }
}
