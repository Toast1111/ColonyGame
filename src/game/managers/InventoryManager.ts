/**
 * InventoryManager - Manages colonist inventory, equipment, and item-based bonuses
 * 
 * Another victim of the Great Paste-Eating Intervention of 2025! 🍝
 * Game.ts was stuffing its face with inventory calculations, equipment bonuses,
 * and food consumption logic. Now it politely asks InventoryManager instead! 🎨✨
 * 
 * Extracted from Game.ts lines 395-555 (RIP more paste-eating behavior)
 */

import type { Colonist } from '../types';
import { itemDatabase } from '../../data/itemDatabase';

export class InventoryManager {
  /**
   * Get all equipped items for a colonist
   * 
   * Filters out empty slots and returns only items that exist.
   * 
   * @param colonist - Colonist to get equipment for
   * @returns Array of equipped items (helmet, armor, weapon, tool, accessory)
   */
  getEquippedItems(colonist: Colonist): any[] {
    const equipment = colonist.inventory?.equipment || {} as any;
    return [
      equipment.helmet,
      equipment.armor,
      equipment.weapon,
      equipment.tool,
      equipment.accessory
    ].filter(Boolean);
  }

  /**
   * Calculate movement speed multiplier from equipment
   * 
   * Equipment can impose movement penalties (heavy armor slows you down).
   * 
   * Rules:
   * - Each item can have a `movementPenalty` (0-1 range)
   * - Penalties are additive but capped at 40% max
   * - Final speed is never slower than 60% (0.6 multiplier)
   * 
   * @param colonist - Colonist to calculate movement speed for
   * @returns Movement speed multiplier (0.6 to 1.0)
   * 
   * @example
   * const speed = inventoryManager.getMoveSpeedMultiplier(colonist);
   * // colonist.actualSpeed = colonist.baseSpeed * speed;
   */
  getMoveSpeedMultiplier(colonist: Colonist): number {
    let penalty = 0;
    
    for (const item of this.getEquippedItems(colonist)) {
      if (!item?.defName) continue;
      
      const def = itemDatabase.getItemDef(item.defName);
      if (def?.movementPenalty) {
        penalty += def.movementPenalty;
      }
    }
    
    // Clamp total penalty to 40% max (prevents extreme slowdown)
    penalty = Math.min(0.4, Math.max(0, penalty));
    
    const multiplier = 1 - penalty;
    
    // Never slower than 60% of base speed
    return Math.max(0.6, multiplier);
  }

  /**
   * Calculate work speed multiplier from equipment and health
   * 
   * Tools and equipment can provide work speed bonuses for specific work types.
   * Health conditions (manipulation, consciousness) also affect work speed.
   * 
   * Work Types:
   * - Construction, Woodcutting, Mining, Farming, Harvest, etc.
   * 
   * Rules:
   * - Each item can provide `workSpeedBonus` (0-1 range)
   * - Items can specify `workTypes` they apply to (if undefined, applies to all)
   * - Bonuses are additive but capped at +80% max
   * - Health penalties multiply the final result
   * 
   * @param colonist - Colonist to calculate work speed for
   * @param workType - Type of work being performed
   * @returns Work speed multiplier (typically 0.5 to 1.8)
   * 
   * @example
   * const speed = inventoryManager.getWorkSpeedMultiplier(colonist, 'Mining');
   * // colonist with pickaxe (+40% mining bonus) = 1.4x speed
   */
  getWorkSpeedMultiplier(
    colonist: Colonist,
    workType: 'Construction' | 'Woodcutting' | 'Mining' | 'Farming' | 'Harvest' | string
  ): number {
    let bonus = 0;
    
    for (const item of this.getEquippedItems(colonist)) {
      if (!item?.defName) continue;
      
      const def = itemDatabase.getItemDef(item.defName);
      if (!def?.workSpeedBonus) continue;
      
      // Check if this item applies to this work type
      // If workTypes is undefined, it applies to all work types
      if (!def.workTypes || def.workTypes.includes(workType)) {
        bonus += def.workSpeedBonus; // Additive bonuses
      }
    }
    
    // Cap bonus at +80% to avoid extreme speed
    bonus = Math.min(0.8, Math.max(0, bonus));
    
    // Apply health-based penalties
    const manipulationMultiplier = (colonist as any).manipulationMultiplier || 1.0;
    const consciousnessMultiplier = (colonist as any).consciousnessMultiplier || 1.0;
    
    return (1 + bonus) * manipulationMultiplier * consciousnessMultiplier;
  }

  /**
   * Calculate armor damage reduction from equipped armor pieces
   * 
   * Armor rating reduces incoming damage by a percentage.
   * 
   * Rules:
   * - Only helmet and body armor provide protection
   * - Armor ratings are additive but capped at 80% max reduction
   * - Blunt damage (bruises) ignores most armor (caller should reduce effectiveness)
   * 
   * @param colonist - Colonist to calculate armor for
   * @returns Damage reduction fraction (0 to 0.8)
   * 
   * @example
   * const armor = inventoryManager.getArmorReduction(colonist);
   * const effectiveDamage = rawDamage * (1 - armor);
   */
  getArmorReduction(colonist: Colonist): number {
    let armor = 0;
    const equipment = colonist.inventory?.equipment || {} as any;
    
    // Only helmet and armor provide protection
    const armorPieces = [equipment.helmet, equipment.armor];
    
    for (const item of armorPieces) {
      if (!item?.defName) continue;
      
      const def = itemDatabase.getItemDef(item.defName);
      if (def?.armorRating) {
        armor += def.armorRating;
      }
    }
    
    // Cap at 80% damage reduction (prevents invincibility)
    return Math.min(0.8, Math.max(0, armor));
  }

  /**
   * Try to consume a food item from colonist's inventory
   * 
   * Searches inventory for food items and consumes one, reducing hunger
   * and providing a small health boost.
   * 
   * Nutrition System:
   * - Each food item has a `nutrition` value (default 10)
   * - Hunger reduction = nutrition * 3 (clamped 20-70)
   * - Small HP boost: +1.5 HP
   * 
   * @param colonist - Colonist to feed
   * @param messageCallback - Optional callback for displaying messages
   * @returns True if food was consumed, false if no food available
   * 
   * @example
   * if (inventoryManager.tryConsumeInventoryFood(colonist, game.msg.bind(game))) {
   *   console.log('Colonist ate from inventory!');
   * }
   */
  tryConsumeInventoryFood(
    colonist: Colonist,
    messageCallback?: (msg: string, type: 'good' | 'warn' | 'bad') => void
  ): boolean {
    if (!colonist.inventory) return false;
    
    const items = colonist.inventory.items;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Check if item is food (prefer explicit category, fallback to def lookup)
      const isFood = item.category === 'Food' || 
        (!!item.defName && (itemDatabase.getItemDef(item.defName)?.category === 'Food'));
      
      if (!isFood || item.quantity <= 0) continue;
      
      // Calculate nutrition value and hunger reduction
      const nutrition = item.defName 
        ? (itemDatabase.getItemDef(item.defName)?.nutrition || 10) 
        : 10;
      
      // Map nutrition to hunger reduction (roughly 1 nutrition = 3 hunger)
      const hungerReduce = Math.max(20, Math.min(70, Math.round(nutrition * 3)));
      
      // Reduce hunger
      colonist.hunger = Math.max(0, (colonist.hunger || 0) - hungerReduce);
      
      // Small heal and mood bump
      colonist.hp = Math.min(100, colonist.hp + 1.5);
      
      // Display message if callback provided
      if (messageCallback) {
        messageCallback(
          `${colonist.profile?.name || 'Colonist'} ate ${item.name}`,
          'good'
        );
      }
      
      // Decrement stack and remove if empty
      item.quantity -= 1;
      if (item.quantity <= 0) {
        items.splice(i, 1);
      }
      
      // Recalculate inventory weight after consumption
      this.recalculateInventoryWeight(colonist);
      
      return true;
    }
    
    return false; // No food found
  }

  /**
   * Recalculate total inventory weight for a colonist
   * 
   * Calculates weight from:
   * - Inventory items (weight × quantity)
   * - Equipped items (helmet, armor, weapon, tool, accessory)
   * 
   * Updates the `currentWeight` property on the colonist's inventory.
   * 
   * @param colonist - Colonist to recalculate weight for
   * 
   * @example
   * inventoryManager.recalculateInventoryWeight(colonist);
   * console.log(`Carrying: ${colonist.inventory.currentWeight} kg`);
   */
  recalculateInventoryWeight(colonist: Colonist): void {
    if (!colonist.inventory) return;
    
    let totalWeight = 0;
    
    // Sum weight from inventory items
    for (const item of colonist.inventory.items) {
      totalWeight += (item.weight || 0) * (item.quantity || 1);
    }
    
    // Sum weight from equipped items
    const equipment: any = colonist.inventory.equipment || {};
    const slots = ['helmet', 'armor', 'weapon', 'tool', 'accessory'];
    
    for (const slot of slots) {
      const item = equipment[slot];
      if (item) {
        totalWeight += item.weight || 0;
      }
    }
    
    // Round to 2 decimal places
    colonist.inventory.currentWeight = Math.round(totalWeight * 100) / 100;
  }

  /**
   * Get a summary of a colonist's equipment loadout
   * 
   * Useful for UI displays and tooltips.
   * 
   * @param colonist - Colonist to get equipment summary for
   * @returns Object with equipped items by slot
   */
  getEquipmentSummary(colonist: Colonist): {
    helmet?: any;
    armor?: any;
    weapon?: any;
    tool?: any;
    accessory?: any;
    totalWeight: number;
    armorRating: number;
    moveSpeedPenalty: number;
  } {
    const equipment = colonist.inventory?.equipment || {} as any;
    
    return {
      helmet: equipment.helmet,
      armor: equipment.armor,
      weapon: equipment.weapon,
      tool: equipment.tool,
      accessory: equipment.accessory,
      totalWeight: colonist.inventory?.currentWeight || 0,
      armorRating: this.getArmorReduction(colonist),
      moveSpeedPenalty: 1 - this.getMoveSpeedMultiplier(colonist)
    };
  }
}
