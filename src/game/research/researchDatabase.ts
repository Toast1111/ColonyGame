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

    'basic_crafting': {
    id: 'basic_crafting',
    name: 'Basic Crafting',
    description: 'Learn fundamental crafting techniques. Unlocks crafting spot.',
    category: 'basic',
    cost: 50,
    time: 30,
    prerequisites: [],
    unlocks: {
      buildings: ['crafting_spot'],
    },
    position: { x: 0, y: 1 }
  },

  'basic_tools': {
    id: 'basic_tools',
    name: 'Basic Tools',
    description: 'Master basic tool creation. Unlocks more crafting blueprints.',
    category: 'basic',
    cost: 100,
    time: 45,
    prerequisites: ['basic_crafting'],
    unlocks: {
      items: ['hoe', 'axe', 'pickaxe'],
    },
    position: { x: 1, y: 1 }
  },

      'smithing': {
    id: 'smithing',
    name: 'smithing',
    description: 'Learn smithing techniques. Unlocks smithing workbench.',
    category: 'basic',
    cost: 50,
    time: 30,
    prerequisites: ['basic_tools'],
    unlocks: {
      buildings: ['smithing_workbench'],
    },
    position: { x: 2, y: 1 }
  },

    'mountain_deconstruction': {
    id: 'mountain_deconstruction',
    name: 'Mountain De-Construction',
    description: 'Learn how to mine mountain tiles. Unlocks mining zones.',
    category: 'basic',
    cost: 50,
    time: 30,
    prerequisites: ['basic_tools'],
    unlocks: {
      buildings: ['mining_zone'],
    },
    position: { x: 1, y: 2 }
  },   

    'alternative_fuel': {
    id: 'alternative_fuel',
    name: 'Alternative Fuel',
    description: 'Learn how to use coal for fuel. Unlocks coal processor.',
    category: 'basic',
    cost: 50,
    time: 30,
    prerequisites: ['mountain_deconstruction'],
    unlocks: {
      buildings: ['alternative fuel'],
    },
    position: { x: 2, y: 3 }
  },

      'metal_use': {
    id: 'metal_use',
    name: 'Metal Use',
    description: 'Learn smithing techniques. Unlocks smithing workbench.',
    category: 'basic',
    cost: 50,
    time: 30,
    prerequisites: ['mountain_deconstruction'],
    unlocks: {
      buildings: ['bloomery'],
    },
    position: { x: 2, y: 4 }
  },

      'smithing': {
    id: 'smithing',
    name: 'smithing',
    description: 'Learn smithing techniques. Unlocks smithing workbench.',
    category: 'basic',
    cost: 50,
    time: 30,
    prerequisites: ['basic_tools'],
    unlocks: {
      buildings: ['smithing_workbench'],
    },
    position: { x: 2, y: 1 }
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

  'cooking': {
    id: 'cooking',
    name: 'Cooking',
    description: 'Learn to prepare meals. Unlocks stove and basic recipes.',
    category: 'basic',
    cost: 80,
    time: 35,
    prerequisites: [],
    unlocks: {
      buildings: ['stove'],
      mechanics: ['meal_preparation']
    },
    position: { x: 1, y: 0 }
  },

  'advanced_cooking': {
    id: 'advanced_cooking',
    name: 'Advanced Cooking',
    description: 'Master culinary techniques. Better meals and buff foods.',
    category: 'basic',
    cost: 200,
    time: 75,
    prerequisites: ['cooking'],
    unlocks: {
      buildings: ['industrial_stove'],
      items: ['LavishMeal', 'PackagedSurvivalMeal'],
      mechanics: ['buff_meals']
    },
    position: { x: 2, y: 0 }
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
    prerequisites: ['turrets', 'stonecutting'],
    unlocks: {
      buildings: ['turret'],
    },
    position: { x: 3, y: 0 }
  },

  'body_armor': {
    id: 'body_armor',
    name: 'Body Armor',
    description: 'Protective gear for colonists. Unlocks vests and helmets.',
    category: 'military',
    cost: 180,
    time: 65,
    prerequisites: ['melee_weapons'],
    unlocks: {
      items: ['Vest', 'Helmet', 'FlakJacket'],
    },
    position: { x: 2, y: 2 }
  },

  'advanced_turrets': {
    id: 'advanced_turrets',
    name: 'Advanced Turrets',
    description: 'Heavy weapons platforms. Unlocks rocket and laser turrets.',
    category: 'military',
    cost: 450,
    time: 130,
    prerequisites: ['turrets', 'electricity'],
    unlocks: {
      buildings: ['heavy_turret', 'laser_turret'],
    },
    position: { x: 4, y: 1 }
  },

  'fortifications': {
    id: 'fortifications',
    name: 'Fortifications',
    description: 'Advanced defensive structures. Unlocks bunkers and barricades.',
    category: 'military',
    cost: 300,
    time: 95,
    prerequisites: ['ranged_weapons_basic'],
    unlocks: {
      buildings: ['bunker', 'barricade', 'sandbag'],
    },
    position: { x: 2, y: 0 }
  },

  'explosives': {
    id: 'explosives',
    name: 'Explosives',
    description: 'Manufacture bombs and grenades for offense and defense.',
    category: 'military',
    cost: 320,
    time: 100,
    prerequisites: ['ranged_weapons_advanced'],
    unlocks: {
      items: ['Grenade', 'MolotovCocktail', 'RocketLauncher'],
    },
    position: { x: 4, y: 2 }
  },

  'powered_armor': {
    id: 'powered_armor',
    name: 'Powered Armor',
    description: 'Mechanized combat suits. Elite protection for colonists.',
    category: 'military',
    cost: 600,
    time: 180,
    prerequisites: ['body_armor', 'electricity'],
    unlocks: {
      items: ['PowerArmor', 'PowerHelmet'],
    },
    position: { x: 5, y: 2 }
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

  'advanced_farming': {
    id: 'advanced_farming',
    name: 'Advanced Farming',
    description: 'Improved farming techniques. Unlocks greenhouses and fertilizer.',
    category: 'agriculture',
    cost: 250,
    time: 85,
    prerequisites: ['irrigation'],
    unlocks: {
      buildings: ['greenhouse'],
      mechanics: ['fertilizer', 'crop_rotation']
    },
    position: { x: 2, y: 1 }
  },

  'food_preservation': {
    id: 'food_preservation',
    name: 'Food Preservation',
    description: 'Keep food fresh longer. Unlocks smokehouses and freezers.',
    category: 'agriculture',
    cost: 180,
    time: 65,
    prerequisites: ['cooking'],
    unlocks: {
      buildings: ['smokehouse', 'freezer', 'salt_cellar'],
    },
    position: { x: 3, y: 1 }
  },

  'hydroponics': {
    id: 'hydroponics',
    name: 'Hydroponics',
    description: 'Grow crops without soil. Faster growth, all-season farming.',
    category: 'agriculture',
    cost: 380,
    time: 120,
    prerequisites: ['advanced_farming', 'electricity'],
    unlocks: {
      buildings: ['hydroponic_basin', 'climate_controlled_greenhouse'],
      mechanics: ['soilless_farming']
    },
    position: { x: 4, y: 1 }
  },

  'breeding_programs': {
    id: 'breeding_programs',
    name: 'Breeding Programs',
    description: 'Selectively breed animals for superior traits.',
    category: 'agriculture',
    cost: 320,
    time: 105,
    prerequisites: ['animal_husbandry'],
    unlocks: {
      buildings: ['breeding_facility'],
      mechanics: ['selective_breeding', 'increased_yields']
    },
    position: { x: 3, y: 2 }
  },

  'genetic_modification': {
    id: 'genetic_modification',
    name: 'Genetic Modification',
    description: 'Modify crops and animals at the genetic level for superior traits.',
    category: 'agriculture',
    cost: 750,
    time: 220,
    prerequisites: ['hydroponics', 'breeding_programs', 'advanced_medicine'],
    unlocks: {
      buildings: ['gene_lab', 'bioreactor'],
      mechanics: ['crop_modification', 'enhanced_livestock']
    },
    position: { x: 6, y: 1 }
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

  'mining': {
    id: 'mining',
    name: 'Mining',
    description: 'Extract resources from the ground. Unlocks quarry and mining operations.',
    category: 'industry',
    cost: 150,
    time: 60,
    prerequisites: ['stonecutting'],
    unlocks: {
      buildings: ['quarry', 'mine'],
      mechanics: ['deep_mining'],
    },
    position: { x: 2, y: 0 }
  },

  'smelting': {
    id: 'smelting',
    name: 'Smelting',
    description: 'Process raw ore into metal. Unlocks smelter and metalworking.',
    category: 'industry',
    cost: 200,
    time: 75,
    prerequisites: ['mining'],
    unlocks: {
      buildings: ['smelter', 'forge'],
      items: ['SteelBar', 'IronBar'],
    },
    position: { x: 3, y: 0 }
  },

  'electricity': {
    id: 'electricity',
    name: 'Electricity',
    description: 'Harness electrical power. Unlocks generators and powered devices.',
    category: 'industry',
    cost: 400,
    time: 120,
    prerequisites: ['smelting'],
    unlocks: {
      buildings: ['generator', 'battery', 'power_conduit'],
      mechanics: ['power_grid'],
    },
    position: { x: 4, y: 0 }
  },

  'automation': {
    id: 'automation',
    name: 'Automation',
    description: 'Automate production with machinery. Unlocks automated workstations.',
    category: 'industry',
    cost: 500,
    time: 150,
    prerequisites: ['electricity'],
    unlocks: {
      buildings: ['auto_loom', 'auto_kitchen', 'assembly_line'],
      mechanics: ['automated_production'],
    },
    position: { x: 5, y: 0 }
  },

  'machining': {
    id: 'machining',
    name: 'Machining',
    description: 'Precision manufacturing and components. Unlocks advanced fabrication.',
    category: 'industry',
    cost: 350,
    time: 110,
    prerequisites: ['smelting'],
    unlocks: {
      buildings: ['machine_shop', 'fabricator'],
      items: ['Component', 'AdvancedComponent'],
    },
    position: { x: 4, y: -1 }
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

  'prosthetics': {
    id: 'prosthetics',
    name: 'Prosthetics',
    description: 'Replace lost limbs with mechanical prosthetics.',
    category: 'medicine',
    cost: 420,
    time: 125,
    prerequisites: ['advanced_medicine', 'machining'],
    unlocks: {
      buildings: ['prosthetics_lab'],
      items: ['ProstheticArm', 'ProstheticLeg', 'SimpleEye', 'SimpleEar'],
    },
    position: { x: 3, y: 3 }
  },

  'bionics': {
    id: 'bionics',
    name: 'Bionics',
    description: 'Advanced bionic implants that enhance colonist abilities.',
    category: 'medicine',
    cost: 650,
    time: 180,
    prerequisites: ['prosthetics', 'electricity'],
    unlocks: {
      buildings: ['bionic_workshop'],
      items: ['BionicArm', 'BionicLeg', 'BionicEye', 'BionicHeart', 'BionicSpine'],
    },
    position: { x: 5, y: 3 }
  },

  'regenerative_medicine': {
    id: 'regenerative_medicine',
    name: 'Regenerative Medicine',
    description: 'Heal permanent injuries and regrow organs.',
    category: 'medicine',
    cost: 550,
    time: 160,
    prerequisites: ['pharmaceuticals'],
    unlocks: {
      buildings: ['regeneration_tank'],
      items: ['HealerSerum', 'RegenerationGel'],
      mechanics: ['scar_healing']
    },
    position: { x: 4, y: 3 }
  },

  'gene_therapy': {
    id: 'gene_therapy',
    name: 'Gene Therapy',
    description: 'Modify colonist genetics. Enhance traits and cure genetic diseases.',
    category: 'medicine',
    cost: 900,
    time: 250,
    prerequisites: ['regenerative_medicine', 'bionics'],
    unlocks: {
      buildings: ['gene_therapy_lab'],
      mechanics: ['trait_modification', 'genetic_enhancement']
    },
    position: { x: 6, y: 3 }
  },

  // ====================
  // ADVANCED RESEARCH
  // ====================
  'advanced_materials': {
    id: 'advanced_materials',
    name: 'Advanced Materials',
    description: 'Research exotic materials. Unlocks plasteel and advanced composites.',
    category: 'advanced',
    cost: 500,
    time: 150,
    prerequisites: ['machining'],
    unlocks: {
      items: ['Plasteel', 'Composite', 'Hyperweave'],
    },
    position: { x: 6, y: 0 }
  },

  'robotics': {
    id: 'robotics',
    name: 'Robotics',
    description: 'Build autonomous robots to help with colony tasks.',
    category: 'advanced',
    cost: 800,
    time: 220,
    prerequisites: ['automation', 'advanced_turrets'],
    unlocks: {
      buildings: ['robotics_facility', 'charging_station'],
      mechanics: ['autonomous_workers']
    },
    position: { x: 7, y: 0 }
  },

  'artificial_intelligence': {
    id: 'artificial_intelligence',
    name: 'Artificial Intelligence',
    description: 'Develop AI assistants. Improves research and defense systems.',
    category: 'advanced',
    cost: 950,
    time: 280,
    prerequisites: ['robotics'],
    unlocks: {
      buildings: ['ai_core'],
      mechanics: ['ai_research_bonus', 'smart_defense']
    },
    position: { x: 8, y: 0 }
  },

  'energy_weapons': {
    id: 'energy_weapons',
    name: 'Energy Weapons',
    description: 'Plasma and laser weaponry. Superior damage and accuracy.',
    category: 'advanced',
    cost: 700,
    time: 200,
    prerequisites: ['powered_armor', 'electricity'],
    unlocks: {
      items: ['PlasmaRifle', 'LaserPistol', 'ChargeLance'],
    },
    position: { x: 7, y: 2 }
  },

  'shields': {
    id: 'shields',
    name: 'Shield Technology',
    description: 'Personal and base shields. Absorb damage before health loss.',
    category: 'advanced',
    cost: 850,
    time: 240,
    prerequisites: ['energy_weapons'],
    unlocks: {
      buildings: ['shield_generator'],
      items: ['ShieldBelt', 'ShieldPack'],
    },
    position: { x: 8, y: 2 }
  },

  'nanotechnology': {
    id: 'nanotechnology',
    name: 'Nanotechnology',
    description: 'Microscopic machines. Revolutionary healing and construction.',
    category: 'advanced',
    cost: 1200,
    time: 350,
    prerequisites: ['gene_therapy', 'artificial_intelligence'],
    unlocks: {
      buildings: ['nanoforge'],
      items: ['NanoHealer', 'NanoAssembler'],
      mechanics: ['nano_healing', 'instant_construction']
    },
    position: { x: 9, y: 1 }
  },

  'quantum_computing': {
    id: 'quantum_computing',
    name: 'Quantum Computing',
    description: 'Harness quantum mechanics for ultimate computational power.',
    category: 'advanced',
    cost: 1500,
    time: 400,
    prerequisites: ['artificial_intelligence'],
    unlocks: {
      buildings: ['quantum_processor'],
      mechanics: ['research_speed_x3']
    },
    position: { x: 9, y: 0 }
  },

  'cryogenics': {
    id: 'cryogenics',
    name: 'Cryogenics',
    description: 'Freeze colonists for long-term storage. Suspend aging and injuries.',
    category: 'advanced',
    cost: 600,
    time: 180,
    prerequisites: ['bionics'],
    unlocks: {
      buildings: ['cryo_pod', 'cryo_casket'],
      mechanics: ['suspended_animation']
    },
    position: { x: 7, y: 3 }
  },

  'teleportation': {
    id: 'teleportation',
    name: 'Teleportation',
    description: 'Instant transport across the map. Ultimate mobility.',
    category: 'advanced',
    cost: 1800,
    time: 450,
    prerequisites: ['quantum_computing', 'shields'],
    unlocks: {
      buildings: ['teleporter', 'teleport_beacon'],
      mechanics: ['instant_travel']
    },
    position: { x: 10, y: 1 }
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
