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
  accuracy?: number;
  ammoType?: string;
  // Advanced weapon tuning (optional)
  warmup?: number;           // seconds to aim before first shot/burst
  cooldown?: number;         // seconds after burst
  burstCount?: number;       // shots per burst
  burstSpacing?: number;     // seconds between burst shots
  projectileSpeed?: number;  // px/sec
  minRange?: number;         // tiles (applies to ranged only)
  
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
          damage: 25,
          range: 15,
          accuracy: 0.7,
          ammoType: 'Bullets',
          warmup: 0.35,
          cooldown: 0.5,
          burstCount: 1,
          burstSpacing: 0.1,
          projectileSpeed: 700,
          minRange: 1.1
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
          damage: 40,
          range: 25,
          accuracy: 0.8,
          ammoType: 'Bullets',
          warmup: 0.6,
          cooldown: 0.75,
          burstCount: 3,
          burstSpacing: 0.1,
          projectileSpeed: 760,
          minRange: 1.25
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
          accuracy: 0.9
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
