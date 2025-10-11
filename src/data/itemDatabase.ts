import type { InventoryItem } from '../game/types';

export interface ItemDef {
  defName: string;
  label: string;
  description: string;
  category: string;
  equipSlot: 'helmet' | 'armor' | 'weapon' | 'tool' | 'accessory' | 'none';
  maxDurability?: number;
  stackable: boolean;
  maxStack?: number;
  value: number;
  weight: number;
  
  // Combat stats
  damage?: number;
  range?: number;
  accuracy?: number; // Deprecated - use accuracy at specific ranges
  ammoType?: string;
  
  // Advanced weapon stats (RimWorld-style)
  armorPenetration?: number; // 0-1, ability to ignore armor (AP directly subtracts from armor rating)
  stoppingPower?: number; // >= 1 can stagger humans, reducing speed to 1/6th for 95 ticks (1.58s)
  burstCount?: number; // How many bullets are fired at a time
  aimTime?: number; // Seconds before shooting (warmup)
  cooldownTime?: number; // Seconds after shooting (cooldown)
  meleeHitChance?: number; // Base hit chance for melee weapons (0-1), modified by Melee skill
  damageType?: 'cut' | 'blunt'; // Type of damage for melee weapons (blunt = bruise, cut = cut)
  stunChance?: number; // Chance to stun on hit (only for blunt weapons)
  
  // Accuracy at specific ranges (in tiles)
  accuracyTouch?: number; // Accuracy at 3 tiles (touch range)
  accuracyShort?: number; // Accuracy at 12 tiles (short range)
  accuracyMedium?: number; // Accuracy at 25 tiles (medium range)
  accuracyLong?: number; // Accuracy at 40 tiles (long range)
  
  // Protection stats
  armorRating?: number;
  
  // Work bonuses
  workSpeedBonus?: number;
  workTypes?: string[];
  movementPenalty?: number;
  
  // Medical properties
  healAmount?: number;
  
  // Food properties
  nutrition?: number;
  spoilage?: number; // Days until spoiled
  
  // Agriculture
  cropType?: string;
  growthTime?: number; // Days to grow
}

export class ItemDatabase {
  private static instance: ItemDatabase;
  private itemDefs: Map<string, ItemDef> = new Map();
  private loaded = false;

  static getInstance(): ItemDatabase {
    if (!ItemDatabase.instance) {
      ItemDatabase.instance = new ItemDatabase();
    }
    return ItemDatabase.instance;
  }

  async loadItems(): Promise<void> {
    if (this.loaded) return;
    
    try {
      // In a real implementation, you'd fetch this from the XML file
      // For now, we'll define the items in TypeScript
      const itemDefs: ItemDef[] = [
        // Tools
        {
          defName: 'Hoe',
          label: 'hoe',
          description: 'A simple farming tool for tilling soil and planting crops.',
          category: 'Tool',
          equipSlot: 'tool',
          maxDurability: 100,
          stackable: false,
          value: 25,
          weight: 2.0,
          workSpeedBonus: 0.2,
          workTypes: ['Farming', 'Construction']
        },
        {
          defName: 'Axe',
          label: 'axe',
          description: 'A sturdy axe for chopping wood and basic construction work.',
          category: 'Tool',
          equipSlot: 'tool',
          maxDurability: 120,
          stackable: false,
          value: 40,
          weight: 3.5,
          workSpeedBonus: 0.3,
          workTypes: ['Woodcutting', 'Construction']
        },
        {
          defName: 'Pickaxe',
          label: 'pickaxe',
          description: 'Heavy mining tool for extracting stone and ore.',
          category: 'Tool',
          equipSlot: 'tool',
          maxDurability: 150,
          stackable: false,
          value: 60,
          weight: 4.0,
          workSpeedBonus: 0.4,
          workTypes: ['Mining', 'Construction']
        },
        {
          defName: 'Hammer',
          label: 'hammer',
          description: 'Essential construction tool for building and repairs.',
          category: 'Tool',
          equipSlot: 'tool',
          maxDurability: 200,
          stackable: false,
          value: 35,
          weight: 2.5,
          workSpeedBonus: 0.25,
          workTypes: ['Construction', 'Crafting']
        },
        
        // Weapons
        {
          defName: 'Pistol',
          label: 'pistol',
          description: 'A reliable sidearm for personal protection.',
          category: 'Weapon',
          equipSlot: 'weapon',
          maxDurability: 80,
          stackable: false,
          value: 150,
          weight: 1.2,
          damage: 12,
          range: 25,
          accuracy: 0.7, // Legacy fallback
          ammoType: 'Bullets',
          armorPenetration: 0.15,
          stoppingPower: 0.8,
          burstCount: 1,
          aimTime: 0.4,
          cooldownTime: 0.5,
          accuracyTouch: 0.95,
          accuracyShort: 0.80,
          accuracyMedium: 0.55,
          accuracyLong: 0.35
        },
        {
          defName: 'Rifle',
          label: 'assault rifle',
          description: 'Military-grade automatic rifle with high damage output.',
          category: 'Weapon',
          equipSlot: 'weapon',
          maxDurability: 100,
          stackable: false,
          value: 400,
          weight: 3.8,
          damage: 15,
          range: 45,
          accuracy: 0.8, // Legacy fallback
          ammoType: 'Bullets',
          armorPenetration: 0.25,
          stoppingPower: 1.2,
          burstCount: 3,
          aimTime: 0.6,
          cooldownTime: 0.7,
          accuracyTouch: 0.70,
          accuracyShort: 0.88,
          accuracyMedium: 0.75,
          accuracyLong: 0.50
        },
        {
          defName: 'Knife',
          label: 'combat knife',
          description: 'Sharp blade suitable for close combat and utility work.',
          category: 'Weapon',
          equipSlot: 'weapon',
          maxDurability: 60,
          stackable: false,
          value: 30,
          weight: 0.5,
          damage: 15,
          range: 1,
          accuracy: 0.9,
          armorPenetration: 0.1,
          stoppingPower: 0.5,
          burstCount: 1,
          aimTime: 0.2,
          cooldownTime: 0.6,
          meleeHitChance: 0.85,
          damageType: 'cut'
        },
        {
          defName: 'Club',
          label: 'wooden club',
          description: 'A heavy wooden club for bashing enemies. Less effective against armor.',
          category: 'Weapon',
          equipSlot: 'weapon',
          maxDurability: 80,
          stackable: false,
          value: 20,
          weight: 2.5,
          damage: 12,
          range: 1,
          accuracy: 0.8,
          armorPenetration: 0.0, // No armor penetration
          stoppingPower: 1.0, // Can stagger
          burstCount: 1,
          aimTime: 0.3,
          cooldownTime: 0.8,
          meleeHitChance: 0.80,
          damageType: 'blunt',
          stunChance: 0.25 // 25% chance to stun
        },
        {
          defName: 'SniperRifle',
          label: 'sniper rifle',
          description: 'Long-range precision rifle with high damage and armor penetration.',
          category: 'Weapon',
          equipSlot: 'weapon',
          maxDurability: 120,
          stackable: false,
          value: 800,
          weight: 5.2,
          damage: 35,
          range: 60,
          accuracy: 0.9,
          ammoType: 'Bullets',
          armorPenetration: 0.5,
          stoppingPower: 2.0,
          burstCount: 1,
          aimTime: 1.2,
          cooldownTime: 1.5,
          accuracyTouch: 0.30,
          accuracyShort: 0.70,
          accuracyMedium: 0.92,
          accuracyLong: 0.95
        },
        {
          defName: 'SMG',
          label: 'submachine gun',
          description: 'Compact automatic weapon with high fire rate and low range.',
          category: 'Weapon',
          equipSlot: 'weapon',
          maxDurability: 90,
          stackable: false,
          value: 300,
          weight: 2.8,
          damage: 8,
          range: 20,
          accuracy: 0.6,
          ammoType: 'Bullets',
          armorPenetration: 0.1,
          stoppingPower: 0.7,
          burstCount: 5,
          aimTime: 0.3,
          cooldownTime: 0.4,
          accuracyTouch: 0.98,
          accuracyShort: 0.75,
          accuracyMedium: 0.45,
          accuracyLong: 0.20
        },
        
        // Armor
        {
          defName: 'FlakVest',
          label: 'flak vest',
          description: 'Basic body armor that provides protection against projectiles.',
          category: 'Armor',
          equipSlot: 'armor',
          maxDurability: 150,
          stackable: false,
          value: 200,
          weight: 5.0,
          armorRating: 0.3,
          movementPenalty: 0.05
        },
        {
          defName: 'TacticalArmor',
          label: 'tactical armor',
          description: 'Advanced military armor offering superior protection.',
          category: 'Armor',
          equipSlot: 'armor',
          maxDurability: 200,
          stackable: false,
          value: 500,
          weight: 8.0,
          armorRating: 0.5,
          movementPenalty: 0.1
        },
        {
          defName: 'WorkClothes',
          label: 'work clothes',
          description: 'Durable clothing designed for manual labor.',
          category: 'Clothing',
          equipSlot: 'armor',
          maxDurability: 80,
          stackable: false,
          value: 50,
          weight: 1.5,
          armorRating: 0.05,
          workSpeedBonus: 0.1
        },
        
        // Helmets
        {
          defName: 'SimpleHelmet',
          label: 'simple helmet',
          description: 'Basic head protection for dangerous work environments.',
          category: 'Helmet',
          equipSlot: 'helmet',
          maxDurability: 100,
          stackable: false,
          value: 75,
          weight: 1.0,
          armorRating: 0.2
        },
        {
          defName: 'TacticalHelmet',
          label: 'tactical helmet',
          description: 'Military-grade helmet with enhanced protection.',
          category: 'Helmet',
          equipSlot: 'helmet',
          maxDurability: 150,
          stackable: false,
          value: 180,
          weight: 2.0,
          armorRating: 0.35
        },
        
        // Medical
        {
          defName: 'MedicineKit',
          label: 'medicine kit',
          description: 'Basic medical supplies for treating injuries and illnesses.',
          category: 'Medical',
          equipSlot: 'none',
          maxDurability: 50,
          stackable: true,
          maxStack: 10,
          value: 40,
          weight: 0.5,
          healAmount: 25
        },
        {
          defName: 'Bandages',
          label: 'bandages',
          description: 'Clean cloth bandages for wound treatment.',
          category: 'Medical',
          equipSlot: 'none',
          stackable: true,
          maxStack: 25,
          value: 5,
          weight: 0.1,
          healAmount: 10
        },
        
        // Resources
        {
          defName: 'Wood',
          label: 'wood',
          description: 'Raw lumber for construction and crafting.',
          category: 'Resource',
          equipSlot: 'none',
          stackable: true,
          maxStack: 75,
          value: 2,
          weight: 1.0
        },
        {
          defName: 'Stone',
          label: 'stone blocks',
          description: 'Cut stone blocks for sturdy construction.',
          category: 'Resource',
          equipSlot: 'none',
          stackable: true,
          maxStack: 75,
          value: 3,
          weight: 2.0
        },
        {
          defName: 'Steel',
          label: 'steel',
          description: 'Refined metal suitable for advanced construction and weapons.',
          category: 'Resource',
          equipSlot: 'none',
          stackable: true,
          maxStack: 75,
          value: 5,
          weight: 1.5
        },
        
        // Food
        {
          defName: 'Bread',
          label: 'bread',
          description: 'Fresh baked bread that provides sustenance.',
          category: 'Food',
          equipSlot: 'none',
          stackable: true,
          maxStack: 10,
          value: 8,
          weight: 0.3,
          nutrition: 12,
          spoilage: 7
        },
        {
          defName: 'MealRation',
          label: 'meal ration',
          description: 'Preserved military ration with long shelf life.',
          category: 'Food',
          equipSlot: 'none',
          stackable: true,
          maxStack: 20,
          value: 15,
          weight: 0.4,
          nutrition: 20,
          spoilage: 60
        },
        
        // Seeds
        {
          defName: 'WheatSeeds',
          label: 'wheat seeds',
          description: 'Seeds for growing wheat crops.',
          category: 'Seeds',
          equipSlot: 'none',
          stackable: true,
          maxStack: 50,
          value: 3,
          weight: 0.1,
          cropType: 'Wheat',
          growthTime: 15
        },
        {
          defName: 'CornSeeds',
          label: 'corn seeds',
          description: 'Seeds for growing corn crops.',
          category: 'Seeds',
          equipSlot: 'none',
          stackable: true,
          maxStack: 50,
          value: 4,
          weight: 0.1,
          cropType: 'Corn',
          growthTime: 20
        },
        
        // Components
        {
          defName: 'ComponentElectronic',
          label: 'electronic component',
          description: 'Advanced electronic component for complex devices.',
          category: 'Component',
          equipSlot: 'none',
          stackable: true,
          maxStack: 25,
          value: 25,
          weight: 0.2
        },
        {
          defName: 'ComponentMechanical',
          label: 'mechanical component',
          description: 'Precision mechanical parts for machinery.',
          category: 'Component',
          equipSlot: 'none',
          stackable: true,
          maxStack: 25,
          value: 20,
          weight: 0.5
        },
        
        // Valuables
        {
          defName: 'Gold',
          label: 'gold',
          description: 'Precious metal valuable for trade.',
          category: 'Valuable',
          equipSlot: 'none',
          stackable: true,
          maxStack: 25,
          value: 50,
          weight: 0.8
        },
        {
          defName: 'Silver',
          label: 'silver',
          description: 'Valuable metal used in electronics and trade.',
          category: 'Valuable',
          equipSlot: 'none',
          stackable: true,
          maxStack: 25,
          value: 20,
          weight: 0.6
        }
      ];

      // Load all item definitions
      for (const itemDef of itemDefs) {
        this.itemDefs.set(itemDef.defName, itemDef);
      }

      this.loaded = true;
      console.log(`Loaded ${this.itemDefs.size} item definitions`);
    } catch (error) {
      console.error('Failed to load item definitions:', error);
    }
  }

  getItemDef(defName: string): ItemDef | undefined {
    return this.itemDefs.get(defName);
  }

  getAllItemDefs(): ItemDef[] {
    return Array.from(this.itemDefs.values());
  }

  getItemDefsByCategory(category: string): ItemDef[] {
    return Array.from(this.itemDefs.values()).filter(item => item.category === category);
  }

  createItem(defName: string, quantity: number = 1, quality?: 'poor' | 'normal' | 'good' | 'excellent' | 'masterwork' | 'legendary' | 'awful'): InventoryItem | null {
    const itemDef = this.getItemDef(defName);
    if (!itemDef) {
      console.warn(`Item definition not found: ${defName}`);
      return null;
    }

    return {
      name: itemDef.label,
      quantity: Math.min(quantity, itemDef.maxStack || quantity),
      description: itemDef.description,
      quality: quality || 'normal',
      durability: itemDef.maxDurability,
      maxDurability: itemDef.maxDurability,
      stackable: itemDef.stackable,
      category: itemDef.category,
      value: itemDef.value,
      weight: itemDef.weight,
      defName: defName
    };
  }

  // Helper methods for game mechanics
  getWorkSpeedBonus(item: InventoryItem): number {
    const itemDef = this.getItemDef(item.defName || '');
    return itemDef?.workSpeedBonus || 0;
  }

  getArmorRating(item: InventoryItem): number {
    const itemDef = this.getItemDef(item.defName || '');
    return itemDef?.armorRating || 0;
  }

  getDamage(item: InventoryItem): number {
    const itemDef = this.getItemDef(item.defName || '');
    return itemDef?.damage || 0;
  }

  getHealAmount(item: InventoryItem): number {
    const itemDef = this.getItemDef(item.defName || '');
    return itemDef?.healAmount || 0;
  }

  getNutrition(item: InventoryItem): number {
    const itemDef = this.getItemDef(item.defName || '');
    return itemDef?.nutrition || 0;
  }

  // Get random items for starting equipment
  getRandomItemsByCategory(category: string, count: number = 1): string[] {
    const items = this.getItemDefsByCategory(category);
    const result: string[] = [];
    
    for (let i = 0; i < count && items.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * items.length);
      result.push(items[randomIndex].defName);
    }
    
    return result;
  }

  // Get items suitable for a specific background
  getItemsForBackground(background: string): string[] {
    const items: string[] = [];
    
    switch (background.toLowerCase()) {
      case 'farmer':
        items.push('Hoe', 'WheatSeeds', 'WorkClothes');
        break;
      case 'soldier':
        items.push('Rifle', 'TacticalArmor', 'TacticalHelmet', 'MedicineKit');
        break;
      case 'doctor':
        items.push('MedicineKit', 'Bandages');
        break;
      case 'engineer':
        items.push('Hammer', 'ComponentElectronic', 'ComponentMechanical');
        break;
      case 'miner':
        items.push('Pickaxe', 'SimpleHelmet', 'WorkClothes');
        break;
      case 'trader':
        items.push('Gold', 'Silver');
        break;
      default:
        items.push('Knife', 'Bread');
        break;
    }
    
    return items;
  }
}

// Export singleton instance
export const itemDatabase = ItemDatabase.getInstance();
