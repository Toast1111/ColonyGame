/**
 * Research Database
 * 
 * Centralized data-driven research tree definition.
 * Easy to modify and expand without touching core game logic.
 */

export type ResearchCategory = 'basic' | 'military' | 'agriculture' | 'industry' | 'medicine' | 'advanced';

export interface ResearchNode {
  id: string;
  name: string;
  description: string;
  category: ResearchCategory;
  cost: number;              // Research points required
  time: number;              // Base time in seconds to complete
  prerequisites: string[];   // IDs of required research
  unlocks: {
    buildings?: string[];    // Building kinds that become available
    items?: string[];        // Item defNames that become available
    mechanics?: string[];    // Game mechanics that become available
  };
  position: { x: number; y: number }; // Position in research tree UI
  icon?: string;            // Icon identifier (future)
}

/**
 * Research Tree Data
 * Organized by category for easy maintenance
 */
export const RESEARCH_TREE: Record<string, ResearchNode> = {
  // ====================
  // BASIC RESEARCH
  // ====================
  'basic_construction': {
    id: 'basic_construction',
    name: 'Basic Construction',
    description: 'Learn fundamental building techniques. Unlocks walls and doors.',
    category: 'basic',
    cost: 50,
    time: 30,
    prerequisites: [],
    unlocks: {
      buildings: ['wall', 'door'],
    },
    position: { x: 0, y: 0 }
  },

  'tool_crafting': {
    id: 'tool_crafting',
    name: 'Tool Crafting',
    description: 'Master basic tool creation. Unlocks crafting bench.',
    category: 'basic',
    cost: 100,
    time: 45,
    prerequisites: [],
    unlocks: {
      buildings: ['crafting_bench'],
    },
    position: { x: 0, y: 1 }
  },

  'agriculture': {
    id: 'agriculture',
    name: 'Agriculture',
    description: 'Develop farming techniques. Already unlocked (tutorial).',
    category: 'agriculture',
    cost: 0,
    time: 0,
    prerequisites: [],
    unlocks: {
      buildings: ['farm'],
    },
    position: { x: 0, y: 2 }
  },

  // ====================
  // MILITARY RESEARCH
  // ====================
  'melee_weapons': {
    id: 'melee_weapons',
    name: 'Melee Weapons',
    description: 'Craft basic melee weapons for defense.',
    category: 'military',
    cost: 75,
    time: 40,
    prerequisites: ['tool_crafting'],
    unlocks: {
      items: ['Club', 'Knife'],
    },
    position: { x: 1, y: 1 }
  },

  'ranged_weapons_basic': {
    id: 'ranged_weapons_basic',
    name: 'Basic Firearms',
    description: 'Develop simple firearms. Unlocks pistols and revolvers.',
    category: 'military',
    cost: 150,
    time: 60,
    prerequisites: ['melee_weapons'],
    unlocks: {
      items: ['Revolver', 'Autopistol'],
    },
    position: { x: 2, y: 1 }
  },

  'ranged_weapons_advanced': {
    id: 'ranged_weapons_advanced',
    name: 'Advanced Firearms',
    description: 'Master advanced weapon manufacturing. Unlocks rifles and shotguns.',
    category: 'military',
    cost: 300,
    time: 90,
    prerequisites: ['ranged_weapons_basic'],
    unlocks: {
      items: ['AssaultRifle', 'Shotgun', 'SniperRifle'],
    },
    position: { x: 3, y: 1 }
  },

  'turrets': {
    id: 'turrets',
    name: 'Automated Defense',
    description: 'Build automated turrets for colony defense.',
    category: 'military',
    cost: 250,
    time: 75,
    prerequisites: ['ranged_weapons_basic'],
    unlocks: {
      buildings: ['turret'],
    },
    position: { x: 2, y: 0 }
  },

  // ====================
  // AGRICULTURE RESEARCH
  // ====================
  'irrigation': {
    id: 'irrigation',
    name: 'Irrigation',
    description: 'Improve farming efficiency. Increases crop growth speed.',
    category: 'agriculture',
    cost: 100,
    time: 50,
    prerequisites: ['agriculture'],
    unlocks: {
      mechanics: ['faster_crop_growth'],
    },
    position: { x: 1, y: 2 }
  },

  'animal_husbandry': {
    id: 'animal_husbandry',
    name: 'Animal Husbandry',
    description: 'Domesticate and raise animals for food and resources.',
    category: 'agriculture',
    cost: 200,
    time: 80,
    prerequisites: ['irrigation'],
    unlocks: {
      buildings: ['animal_pen'],
      mechanics: ['animal_taming'],
    },
    position: { x: 2, y: 2 }
  },

  // ====================
  // INDUSTRY RESEARCH
  // ====================
  'stonecutting': {
    id: 'stonecutting',
    name: 'Stonecutting',
    description: 'Work with stone materials. Unlocks stone buildings.',
    category: 'industry',
    cost: 120,
    time: 55,
    prerequisites: ['basic_construction'],
    unlocks: {
      buildings: ['stone_wall'],
      mechanics: ['stone_construction'],
    },
    position: { x: 1, y: 0 }
  },

  'electricity': {
    id: 'electricity',
    name: 'Electricity',
    description: 'Harness electrical power. Unlocks generators and powered devices.',
    category: 'industry',
    cost: 400,
    time: 120,
    prerequisites: ['stonecutting', 'tool_crafting'],
    unlocks: {
      buildings: ['generator', 'battery'],
      mechanics: ['power_grid'],
    },
    position: { x: 2, y: -1 }
  },

  // ====================
  // MEDICINE RESEARCH
  // ====================
  'basic_medicine': {
    id: 'basic_medicine',
    name: 'Basic Medicine',
    description: 'Learn fundamental medical treatments. Already unlocked (tutorial).',
    category: 'medicine',
    cost: 0,
    time: 0,
    prerequisites: [],
    unlocks: {
      buildings: ['medical_bed'],
    },
    position: { x: 0, y: 3 }
  },

  'advanced_medicine': {
    id: 'advanced_medicine',
    name: 'Advanced Medicine',
    description: 'Develop advanced medical procedures. Improves healing speed.',
    category: 'medicine',
    cost: 180,
    time: 70,
    prerequisites: ['basic_medicine'],
    unlocks: {
      mechanics: ['faster_healing', 'surgery'],
    },
    position: { x: 1, y: 3 }
  },

  'pharmaceuticals': {
    id: 'pharmaceuticals',
    name: 'Pharmaceuticals',
    description: 'Manufacture advanced medicine. Unlocks drug production.',
    category: 'medicine',
    cost: 350,
    time: 100,
    prerequisites: ['advanced_medicine'],
    unlocks: {
      buildings: ['drug_lab'],
      items: ['Medicine', 'PainkillerPills'],
    },
    position: { x: 2, y: 3 }
  },
};

/**
 * Get all research nodes in a category
 */
export function getResearchByCategory(category: ResearchCategory): ResearchNode[] {
  return Object.values(RESEARCH_TREE).filter(node => node.category === category);
}

/**
 * Get research node by ID
 */
export function getResearch(id: string): ResearchNode | undefined {
  return RESEARCH_TREE[id];
}

/**
 * Check if research is available (all prerequisites completed)
 */
export function isResearchAvailable(researchId: string, completedResearch: Set<string>): boolean {
  const node = RESEARCH_TREE[researchId];
  if (!node) return false;
  
  return node.prerequisites.every(prereqId => completedResearch.has(prereqId));
}

/**
 * Get all currently available research (prerequisites met but not yet completed)
 */
export function getAvailableResearch(completedResearch: Set<string>): ResearchNode[] {
  return Object.values(RESEARCH_TREE).filter(node => {
    if (completedResearch.has(node.id)) return false; // Already completed
    return isResearchAvailable(node.id, completedResearch);
  });
}

/**
 * Category display info
 */
export const CATEGORY_INFO: Record<ResearchCategory, { name: string; color: string; description: string }> = {
  basic: {
    name: 'Basic',
    color: '#94a3b8',
    description: 'Fundamental colony technologies'
  },
  military: {
    name: 'Military',
    color: '#ef4444',
    description: 'Weapons and defense systems'
  },
  agriculture: {
    name: 'Agriculture',
    color: '#22c55e',
    description: 'Farming and food production'
  },
  industry: {
    name: 'Industry',
    color: '#f59e0b',
    description: 'Production and infrastructure'
  },
  medicine: {
    name: 'Medicine',
    color: '#ec4899',
    description: 'Healthcare and healing'
  },
  advanced: {
    name: 'Advanced',
    color: '#8b5cf6',
    description: 'Cutting-edge technology'
  }
};
