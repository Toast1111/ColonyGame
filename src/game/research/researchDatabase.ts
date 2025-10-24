/**
 * Research Database - Unified Tree Structure
 * 
 * Centralized data-driven research tree definition.
 * All categories displayed together in one large interconnected tree.
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
  position: { x: number; y: number }; // Position in unified research tree
  icon?: string;            // Icon identifier (future)
}

/**
 * Unified Research Tree Data
 * 
 * Layout matches the provided image with nodes arranged in columns from left to right
 */
export const RESEARCH_TREE: Record<string, ResearchNode> = {
  // ====================
  // COLUMN 1 - Basic Starting Tech
  // ====================
  'tree_sowing': {
    id: 'tree_sowing',
    name: 'Tree sowing',
    description: 'Plant and grow trees.',
    category: 'basic',
    cost: 1000,
    time: 60,
    prerequisites: [],
    unlocks: {
      mechanics: ['tree_planting'],
    },
    position: { x: 0, y: 0 }
  },

  'patchleather': {
    id: 'patchleather',
    name: 'Patchleather',
    description: 'Create patchleather from scraps.',
    category: 'basic',
    cost: 400,
    time: 45,
    prerequisites: [],
    unlocks: {
      items: ['Patchleather'],
    },
    position: { x: 0, y: 1 }
  },

  'psychoid_brewing': {
    id: 'psychoid_brewing',
    name: 'Psychoid brewing',
    description: 'Brew psychoid tea.',
    category: 'basic',
    cost: 600,
    time: 50,
    prerequisites: [],
    unlocks: {
      buildings: ['brewing_barrel'],
      items: ['PsychoidTea'],
    },
    position: { x: 0, y: 2 }
  },

  'passive_cooler': {
    id: 'passive_cooler',
    name: 'Passive cooler',
    description: 'Build passive cooling structures.',
    category: 'basic',
    cost: 1000,
    time: 60,
    prerequisites: [],
    unlocks: {
      buildings: ['passive_cooler'],
    },
    position: { x: 0, y: 3 }
  },

  'beer_brewing': {
    id: 'beer_brewing',
    name: 'Beer brewing',
    description: 'Brew beer for recreation.',
    category: 'basic',
    cost: 700,
    time: 55,
    prerequisites: [],
    unlocks: {
      buildings: ['brewery'],
      items: ['Beer'],
    },
    position: { x: 0, y: 4 }
  },

  'stonecutting': {
    id: 'stonecutting',
    name: 'Stonecutting',
    description: 'Cut stone blocks for construction.',
    category: 'basic',
    cost: 1000,
    time: 60,
    prerequisites: [],
    unlocks: {
      buildings: ['stonecutting_table'],
      items: ['StoneBlocks'],
    },
    position: { x: 0, y: 5 }
  },

  // ====================
  // COLUMN 2
  // ====================
  'cocoa': {
    id: 'cocoa',
    name: 'Cocoa',
    description: 'Grow and process cocoa.',
    category: 'agriculture',
    cost: 1000,
    time: 60,
    prerequisites: [],
    unlocks: {
      items: ['Chocolate'],
    },
    position: { x: 1, y: 0 }
  },

  'devilstrand': {
    id: 'devilstrand',
    name: 'Devilstrand',
    description: 'Grow devilstrand, a valuable fabric.',
    category: 'agriculture',
    cost: 800,
    time: 55,
    prerequisites: [],
    unlocks: {
      items: ['Devilstrand'],
    },
    position: { x: 1, y: 1 }
  },

  'pemican': {
    id: 'pemican',
    name: 'Pemmican',
    description: 'Create long-lasting survival food.',
    category: 'agriculture',
    cost: 400,
    time: 45,
    prerequisites: [],
    unlocks: {
      items: ['Pemmican'],
    },
    position: { x: 1, y: 2 }
  },

  'carpet_making': {
    id: 'carpet_making',
    name: 'Carpet making',
    description: 'Craft carpets for comfort.',
    category: 'basic',
    cost: 600,
    time: 50,
    prerequisites: [],
    unlocks: {
      buildings: ['carpet'],
    },
    position: { x: 1, y: 3 }
  },

  'smithing': {
    id: 'smithing',
    name: 'Smithing',
    description: 'Craft basic metal tools and weapons.',
    category: 'industry',
    cost: 700,
    time: 55,
    prerequisites: [],
    unlocks: {
      buildings: ['smithing_bench'],
      items: ['MeleeWeapons'],
    },
    position: { x: 1, y: 4 }
  },

  'complex_furniture': {
    id: 'complex_furniture',
    name: 'Complex furniture',
    description: 'Build advanced furniture.',
    category: 'basic',
    cost: 800,
    time: 55,
    prerequisites: [],
    unlocks: {
      buildings: ['armchair', 'dresser', 'end_table'],
    },
    position: { x: 1, y: 5 }
  },

  // ====================
  // COLUMN 3
  // ====================
  'complex_clothing': {
    id: 'complex_clothing',
    name: 'Complex clothing',
    description: 'Craft advanced clothing and armor.',
    category: 'basic',
    cost: 1200,
    time: 70,
    prerequisites: [],
    unlocks: {
      items: ['Duster', 'Parka'],
    },
    position: { x: 2, y: 1 }
  },

  'plate_armor': {
    id: 'plate_armor',
    name: 'Plate armor',
    description: 'Craft heavy plate armor.',
    category: 'military',
    cost: 1400,
    time: 75,
    prerequisites: ['smithing'],
    unlocks: {
      items: ['PlateArmor'],
    },
    position: { x: 2, y: 3 }
  },

  'gas_operation': {
    id: 'gas_operation',
    name: 'Gas operation',
    description: 'Operate gas-powered equipment.',
    category: 'industry',
    cost: 1000,
    time: 65,
    prerequisites: [],
    unlocks: {
      mechanics: ['gas_systems'],
    },
    position: { x: 2, y: 4 }
  },

  'recurve_bow': {
    id: 'recurve_bow',
    name: 'Recurve bow',
    description: 'Craft recurve bows.',
    category: 'military',
    cost: 600,
    time: 50,
    prerequisites: [],
    unlocks: {
      items: ['RecurveBow'],
    },
    position: { x: 2, y: 5 }
  },

  // ====================
  // COLUMN 4 - Drug Production Branch
  // ====================
  'drug_production': {
    id: 'drug_production',
    name: 'Drug production',
    description: 'Produce various drugs.',
    category: 'medicine',
    cost: 1200,
    time: 70,
    prerequisites: [],
    unlocks: {
      buildings: ['drug_lab'],
    },
    position: { x: 3, y: 0 }
  },

  'psychite_refining': {
    id: 'psychite_refining',
    name: 'Psychite refining',
    description: 'Refine psychite into drugs.',
    category: 'medicine',
    cost: 1200,
    time: 70,
    prerequisites: ['drug_production'],
    unlocks: {
      items: ['Flake', 'Yayo'],
    },
    position: { x: 4, y: 0 }
  },

  'wake_up_production': {
    id: 'wake_up_production',
    name: 'Wake-up production',
    description: 'Produce wake-up stimulant.',
    category: 'medicine',
    cost: 1600,
    time: 80,
    prerequisites: ['drug_production'],
    unlocks: {
      items: ['WakeUp'],
    },
    position: { x: 4, y: 1 }
  },

  'go_juice_production': {
    id: 'go_juice_production',
    name: 'Go-juice production',
    description: 'Produce go-juice combat drug.',
    category: 'medicine',
    cost: 1800,
    time: 85,
    prerequisites: ['drug_production'],
    unlocks: {
      items: ['GoJuice'],
    },
    position: { x: 4, y: 2 }
  },

  'penoxycyline_production': {
    id: 'penoxycyline_production',
    name: 'Penoxycyline production',
    description: 'Produce penoxycyline disease prevention drug.',
    category: 'medicine',
    cost: 1600,
    time: 80,
    prerequisites: ['drug_production'],
    unlocks: {
      items: ['Penoxycyline'],
    },
    position: { x: 4, y: 3 }
  },

  // ====================
  // COLUMN 5 - Electricity Branch
  // ====================
  'electricity': {
    id: 'electricity',
    name: 'Electricity',
    description: 'Harness electrical power.',
    category: 'industry',
    cost: 1800,
    time: 85,
    prerequisites: [],
    unlocks: {
      buildings: ['power_conduit', 'battery'],
      mechanics: ['electricity'],
    },
    position: { x: 5, y: 3 }
  },

  'batteries': {
    id: 'batteries',
    name: 'Batteries',
    description: 'Store electrical power.',
    category: 'industry',
    cost: 800,
    time: 55,
    prerequisites: ['electricity'],
    unlocks: {
      buildings: ['battery'],
    },
    position: { x: 6, y: 1 }
  },

  'autodoor': {
    id: 'autodoor',
    name: 'Autodoor',
    description: 'Build automatic doors.',
    category: 'industry',
    cost: 600,
    time: 50,
    prerequisites: ['electricity'],
    unlocks: {
      buildings: ['autodoor'],
    },
    position: { x: 6, y: 2 }
  },

  'hydroponics': {
    id: 'hydroponics',
    name: 'Hydroponics',
    description: 'Grow crops indoors without soil.',
    category: 'agriculture',
    cost: 1600,
    time: 80,
    prerequisites: ['electricity'],
    unlocks: {
      buildings: ['hydroponics_basin'],
    },
    position: { x: 6, y: 3 }
  },

  'air_conditioning': {
    id: 'air_conditioning',
    name: 'Air conditioning',
    description: 'Control temperature with coolers and heaters.',
    category: 'industry',
    cost: 800,
    time: 55,
    prerequisites: ['electricity'],
    unlocks: {
      buildings: ['cooler', 'heater'],
    },
    position: { x: 6, y: 4 }
  },

  'advanced_lights': {
    id: 'advanced_lights',
    name: 'Advanced lights',
    description: 'Build advanced lighting.',
    category: 'industry',
    cost: 800,
    time: 55,
    prerequisites: ['electricity'],
    unlocks: {
      buildings: ['standing_lamp'],
    },
    position: { x: 6, y: 5 }
  },

  'machining': {
    id: 'machining',
    name: 'Machining',
    description: 'Build machine tools and components.',
    category: 'industry',
    cost: 1000,
    time: 65,
    prerequisites: ['electricity', 'smithing'],
    unlocks: {
      buildings: ['machining_table'],
      items: ['Components'],
    },
    position: { x: 6, y: 6 }
  },

  'solar_panel': {
    id: 'solar_panel',
    name: 'Solar panel',
    description: 'Generate power from sunlight.',
    category: 'industry',
    cost: 1600,
    time: 80,
    prerequisites: ['batteries'],
    unlocks: {
      buildings: ['solar_generator'],
    },
    position: { x: 7, y: 1 }
  },

  'biofuel_refining': {
    id: 'biofuel_refining',
    name: 'Biofuel refining',
    description: 'Refine biofuel for generators.',
    category: 'industry',
    cost: 1200,
    time: 70,
    prerequisites: ['electricity'],
    unlocks: {
      buildings: ['biofuel_refinery'],
      items: ['Chemfuel'],
    },
    position: { x: 7, y: 4 }
  },

  'gunsmithing': {
    id: 'gunsmithing',
    name: 'Gunsmithing',
    description: 'Craft firearms.',
    category: 'military',
    cost: 1400,
    time: 75,
    prerequisites: ['machining'],
    unlocks: {
      items: ['Revolver', 'Autopistol'],
    },
    position: { x: 7, y: 6 }
  },

  'fuel_energy': {
    id: 'fuel_energy',
    name: 'Fuel energy',
    description: 'Generate power from chemfuel.',
    category: 'industry',
    cost: 1200,
    time: 70,
    prerequisites: ['biofuel_refining'],
    unlocks: {
      buildings: ['chemfuel_generator'],
    },
    position: { x: 8, y: 5 }
  },

  'smokeleaf_joints': {
    id: 'smokeleaf_joints',
    name: 'Smokeleaf joints',
    description: 'Roll smokeleaf joints.',
    category: 'medicine',
    cost: 600,
    time: 50,
    prerequisites: [],
    unlocks: {
      items: ['Joint'],
    },
    position: { x: 8, y: 6 }
  },

  // ====================
  // COLUMN 8-9 - Dense Materials
  // ====================
  'dense_materials': {
    id: 'dense_materials',
    name: 'Dense materials',
    description: 'Work with heavy, dense materials.',
    category: 'industry',
    cost: 1400,
    time: 75,
    prerequisites: [],
    unlocks: {
      mechanics: ['dense_materials'],
    },
    position: { x: 8, y: 1 }
  },

  'nutrient_paste': {
    id: 'nutrient_paste',
    name: 'Nutrient paste',
    description: 'Efficiently process meals.',
    category: 'agriculture',
    cost: 800,
    time: 55,
    prerequisites: ['electricity'],
    unlocks: {
      buildings: ['nutrient_paste_dispenser'],
    },
    position: { x: 8, y: 2 }
  },

  'watermill_generator': {
    id: 'watermill_generator',
    name: 'Watermill generator',
    description: 'Generate power from flowing water.',
    category: 'industry',
    cost: 1200,
    time: 70,
    prerequisites: ['electricity'],
    unlocks: {
      buildings: ['watermill'],
    },
    position: { x: 8, y: 3 }
  },

  'geothermal_power': {
    id: 'geothermal_power',
    name: 'Geothermal power',
    description: 'Tap geothermal vents for power.',
    category: 'industry',
    cost: 3000,
    time: 120,
    prerequisites: ['electricity'],
    unlocks: {
      buildings: ['geothermal_generator'],
    },
    position: { x: 8, y: 4 }
  },

  'packaged_survival_meal': {
    id: 'packaged_survival_meal',
    name: 'Packaged survival meal',
    description: 'Package long-lasting survival meals.',
    category: 'agriculture',
    cost: 1000,
    time: 65,
    prerequisites: [],
    unlocks: {
      items: ['SurvivalMeal'],
    },
    position: { x: 9, y: 2 }
  },

  'mortars': {
    id: 'mortars',
    name: 'Mortars',
    description: 'Build siege mortars.',
    category: 'military',
    cost: 2000,
    time: 95,
    prerequisites: ['gunsmithing'],
    unlocks: {
      buildings: ['mortar'],
    },
    position: { x: 9, y: 5 }
  },

  'prosthetics': {
    id: 'prosthetics',
    name: 'Prosthetics',
    description: 'Craft basic prosthetic limbs.',
    category: 'medicine',
    cost: 2000,
    time: 95,
    prerequisites: ['smithing'],
    unlocks: {
      items: ['PegLeg', 'WoodenFoot', 'WoodenHand'],
    },
    position: { x: 9, y: 6 }
  },

  'foam_turret': {
    id: 'foam_turret',
    name: 'Foam turret',
    description: 'Build foam firefighting turrets.',
    category: 'industry',
    cost: 1200,
    time: 70,
    prerequisites: [],
    unlocks: {
      buildings: ['foam_turret'],
    },
    position: { x: 9, y: 7 }
  },

  // ====================
  // COLUMN 10-11 - Microelectronics Branch
  // ====================
  'microelectronics': {
    id: 'microelectronics',
    name: 'Microelectronics',
    description: 'Advanced electronic components.',
    category: 'industry',
    cost: 3000,
    time: 120,
    prerequisites: ['machining'],
    unlocks: {
      buildings: ['fabrication_bench'],
      items: ['AdvancedComponent'],
    },
    position: { x: 10, y: 4 }
  },

  'tube_television': {
    id: 'tube_television',
    name: 'Tube television',
    description: 'Build tube televisions for recreation.',
    category: 'industry',
    cost: 1400,
    time: 75,
    prerequisites: ['microelectronics'],
    unlocks: {
      buildings: ['tube_television'],
    },
    position: { x: 11, y: 1 }
  },

  'fabrication_television': {
    id: 'fabrication_television',
    name: 'Fabrication television',
    description: 'Build flatscreen televisions.',
    category: 'industry',
    cost: 2000,
    time: 95,
    prerequisites: ['microelectronics'],
    unlocks: {
      buildings: ['flatscreen_television'],
    },
    position: { x: 11, y: 2 }
  },

  'shields': {
    id: 'shields',
    name: 'Shields',
    description: 'Personal energy shields.',
    category: 'military',
    cost: 2000,
    time: 95,
    prerequisites: ['microelectronics'],
    unlocks: {
      items: ['ShieldBelt'],
    },
    position: { x: 11, y: 3 }
  },

  'transport_pod': {
    id: 'transport_pod',
    name: 'Transport pod',
    description: 'Launch transport pods.',
    category: 'advanced',
    cost: 2000,
    time: 95,
    prerequisites: ['microelectronics'],
    unlocks: {
      buildings: ['transport_pod_launcher'],
    },
    position: { x: 11, y: 4 }
  },

  'autocannon_turret': {
    id: 'autocannon_turret',
    name: 'Autocannon turret',
    description: 'Build heavy autocannon turrets.',
    category: 'military',
    cost: 3000,
    time: 120,
    prerequisites: ['gunsmithing'],
    unlocks: {
      buildings: ['autocannon_turret'],
    },
    position: { x: 11, y: 5 }
  },

  'precision_rifling': {
    id: 'precision_rifling',
    name: 'Precision rifling',
    description: 'Craft precision rifles.',
    category: 'military',
    cost: 2600,
    time: 110,
    prerequisites: ['gunsmithing'],
    unlocks: {
      items: ['BoltActionRifle', 'SniperRifle'],
    },
    position: { x: 11, y: 6 }
  },

  'multibarrel_weapons': {
    id: 'multibarrel_weapons',
    name: 'Multibarrel weapons',
    description: 'Craft multibarrel weapons.',
    category: 'military',
    cost: 4000,
    time: 140,
    prerequisites: ['precision_rifling'],
    unlocks: {
      items: ['Minigun', 'HeavyMachineGun'],
    },
    position: { x: 11, y: 7 }
  },

  // ====================
  // COLUMN 12-13 - Medicine Branch
  // ====================
  'medicine_production': {
    id: 'medicine_production',
    name: 'Medicine production',
    description: 'Produce industrial medicine.',
    category: 'medicine',
    cost: 2000,
    time: 95,
    prerequisites: [],
    unlocks: {
      buildings: ['drug_lab'],
      items: ['MedicineIndustrial'],
    },
    position: { x: 12, y: 0 }
  },

  'long_range_mineral_scanner': {
    id: 'long_range_mineral_scanner',
    name: 'Long-range mineral scanner',
    description: 'Scan for distant mineral deposits.',
    category: 'industry',
    cost: 2000,
    time: 95,
    prerequisites: ['microelectronics'],
    unlocks: {
      buildings: ['long_range_mineral_scanner'],
    },
    position: { x: 12, y: 1 }
  },

  'ground_penetrating_scanner': {
    id: 'ground_penetrating_scanner',
    name: 'Ground-penetrating scanner',
    description: 'Scan underground for resources.',
    category: 'industry',
    cost: 3000,
    time: 120,
    prerequisites: ['long_range_mineral_scanner'],
    unlocks: {
      buildings: ['ground_penetrating_scanner'],
    },
    position: { x: 12, y: 2 }
  },

  'deep_drilling': {
    id: 'deep_drilling',
    name: 'Deep drilling',
    description: 'Drill deep for underground resources.',
    category: 'industry',
    cost: 3000,
    time: 120,
    prerequisites: ['ground_penetrating_scanner'],
    unlocks: {
      buildings: ['deep_drill'],
    },
    position: { x: 12, y: 3 }
  },

  'multi_analyzer': {
    id: 'multi_analyzer',
    name: 'Multi-analyzer',
    description: 'Advanced research equipment.',
    category: 'advanced',
    cost: 6000,
    time: 180,
    prerequisites: ['microelectronics'],
    unlocks: {
      buildings: ['multi_analyzer'],
      mechanics: ['research_speed_bonus'],
    },
    position: { x: 12, y: 4 }
  },

  'vitals_monitor': {
    id: 'vitals_monitor',
    name: 'Vitals monitor',
    description: 'Monitor patient vitals.',
    category: 'medicine',
    cost: 2000,
    time: 95,
    prerequisites: ['microelectronics'],
    unlocks: {
      buildings: ['vitals_monitor'],
    },
    position: { x: 12, y: 5 }
  },

  // ====================
  // COLUMN 14-15 - Advanced Tech
  // ====================
  'flatscreen_television': {
    id: 'flatscreen_television',
    name: 'Flatscreen television',
    description: 'Build high-quality flatscreen TVs.',
    category: 'industry',
    cost: 2000,
    time: 95,
    prerequisites: ['fabrication_television'],
    unlocks: {
      buildings: ['flatscreen_television'],
    },
    position: { x: 14, y: 2 }
  },

  'machine_pump': {
    id: 'machine_pump',
    name: 'Machine pump',
    description: 'Build moisture pumps.',
    category: 'industry',
    cost: 2000,
    time: 95,
    prerequisites: ['microelectronics'],
    unlocks: {
      buildings: ['moisture_pump'],
    },
    position: { x: 14, y: 3 }
  },

  'uranium_slug_turret': {
    id: 'uranium_slug_turret',
    name: 'Uranium slug turret',
    description: 'Build uranium slug turrets.',
    category: 'military',
    cost: 5000,
    time: 160,
    prerequisites: ['autocannon_turret'],
    unlocks: {
      buildings: ['uranium_slug_turret'],
    },
    position: { x: 14, y: 5 }
  },

  'rocketswarm_launcher': {
    id: 'rocketswarm_launcher',
    name: 'Rocketswarm launcher',
    description: 'Build rocket swarm launchers.',
    category: 'military',
    cost: 5000,
    time: 160,
    prerequisites: ['autocannon_turret'],
    unlocks: {
      buildings: ['rocketswarm_launcher'],
    },
    position: { x: 14, y: 6 }
  },

  'cryptosleep_casket': {
    id: 'cryptosleep_casket',
    name: 'Cryptosleep casket',
    description: 'Build cryptosleep caskets.',
    category: 'advanced',
    cost: 6000,
    time: 180,
    prerequisites: ['vitals_monitor'],
    unlocks: {
      buildings: ['cryptosleep_casket'],
    },
    position: { x: 14, y: 7 }
  },

  'fabrication': {
    id: 'fabrication',
    name: 'Fabrication',
    description: 'Advanced fabrication techniques.',
    category: 'advanced',
    cost: 4000,
    time: 140,
    prerequisites: ['multi_analyzer'],
    unlocks: {
      mechanics: ['advanced_fabrication'],
    },
    position: { x: 15, y: 4 }
  },

  // ====================
  // COLUMN 16-19 - Endgame Tech
  // ====================
  'bionics': {
    id: 'bionics',
    name: 'Bionics',
    description: 'Craft bionic body parts.',
    category: 'medicine',
    cost: 6000,
    time: 180,
    prerequisites: ['fabrication'],
    unlocks: {
      items: ['BionicEye', 'BionicArm', 'BionicLeg', 'BionicEar'],
    },
    position: { x: 16, y: 2 }
  },

  'marine_armor': {
    id: 'marine_armor',
    name: 'Marine armor',
    description: 'Craft marine armor.',
    category: 'military',
    cost: 6000,
    time: 180,
    prerequisites: ['fabrication'],
    unlocks: {
      items: ['MarineArmor', 'MarineHelmet'],
    },
    position: { x: 17, y: 2 }
  },

  'recon_armor': {
    id: 'recon_armor',
    name: 'Recon armor',
    description: 'Craft recon armor.',
    category: 'military',
    cost: 6000,
    time: 180,
    prerequisites: ['fabrication'],
    unlocks: {
      items: ['ReconArmor', 'ReconHelmet'],
    },
    position: { x: 18, y: 2 }
  },

  'method_bed': {
    id: 'method_bed',
    name: 'Method bed',
    description: 'Build biosculpter pods.',
    category: 'medicine',
    cost: 12000,
    time: 240,
    prerequisites: ['bionics'],
    unlocks: {
      buildings: ['biosculpter_pod'],
    },
    position: { x: 17, y: 3 }
  },

  'charged_shot': {
    id: 'charged_shot',
    name: 'Charged shot',
    description: 'Craft charge weapons.',
    category: 'military',
    cost: 6000,
    time: 180,
    prerequisites: ['fabrication'],
    unlocks: {
      items: ['ChargeRifle', 'ChargeLance'],
    },
    position: { x: 17, y: 4 }
  },

  'pulse_charged_munitions': {
    id: 'pulse_charged_munitions',
    name: 'Pulse-charged munitions',
    description: 'Advanced pulse weapons.',
    category: 'military',
    cost: 8000,
    time: 200,
    prerequisites: ['charged_shot'],
    unlocks: {
      items: ['PulseLaser'],
    },
    position: { x: 18, y: 5 }
  },

  'nano_structuring': {
    id: 'nano_structuring',
    name: 'Nano structuring',
    description: 'Nanotechnology research.',
    category: 'advanced',
    cost: 8000,
    time: 200,
    prerequisites: ['fabrication'],
    unlocks: {
      mechanics: ['nanotech'],
    },
    position: { x: 18, y: 6 }
  },

  'jump_packs': {
    id: 'jump_packs',
    name: 'Jump packs',
    description: 'Build jump packs.',
    category: 'military',
    cost: 5000,
    time: 160,
    prerequisites: ['fabrication'],
    unlocks: {
      items: ['JumpPack'],
    },
    position: { x: 19, y: 6 }
  },

  'artificial_metabolism': {
    id: 'artificial_metabolism',
    name: 'Artificial metabolism',
    description: 'Advanced bionic organs.',
    category: 'medicine',
    cost: 12000,
    time: 240,
    prerequisites: ['bionics'],
    unlocks: {
      items: ['BionicStomach', 'BionicHeart', 'BionicLiver'],
    },
    position: { x: 19, y: 7 }
  },

  // ====================
  // COLUMN 20-22 - Ship & Endgame
  // ====================
  'starflight_basics': {
    id: 'starflight_basics',
    name: 'Starflight basics',
    description: 'Begin starship research.',
    category: 'advanced',
    cost: 6000,
    time: 180,
    prerequisites: ['fabrication'],
    unlocks: {
      mechanics: ['starship_unlocked'],
    },
    position: { x: 20, y: 4 }
  },

  'machine_persuasion': {
    id: 'machine_persuasion',
    name: 'Machine persuasion',
    description: 'AI persona core research.',
    category: 'advanced',
    cost: 5000,
    time: 160,
    prerequisites: ['starflight_basics'],
    unlocks: {
      mechanics: ['ai_core'],
    },
    position: { x: 21, y: 3 }
  },

  'reaper_armor': {
    id: 'reaper_armor',
    name: 'Reaper armor',
    description: 'Craft reaper armor.',
    category: 'military',
    cost: 8000,
    time: 200,
    prerequisites: ['marine_armor'],
    unlocks: {
      items: ['ReaperArmor', 'ReaperHelmet'],
    },
    position: { x: 21, y: 2 }
  },

  'cataphract_armor': {
    id: 'cataphract_armor',
    name: 'Cataphract armor',
    description: 'Craft cataphract armor.',
    category: 'military',
    cost: 8000,
    time: 200,
    prerequisites: ['marine_armor'],
    unlocks: {
      items: ['CataphractArmor', 'CataphractHelmet'],
    },
    position: { x: 22, y: 1 }
  },

  'phoenix_armor': {
    id: 'phoenix_armor',
    name: 'Phoenix armor',
    description: 'Craft phoenix armor.',
    category: 'military',
    cost: 8000,
    time: 200,
    prerequisites: ['marine_armor'],
    unlocks: {
      items: ['PhoenixArmor', 'PhoenixHelmet'],
    },
    position: { x: 22, y: 2 }
  },

  'advanced_fabrication': {
    id: 'advanced_fabrication',
    name: 'Advanced fabrication',
    description: 'Master fabrication techniques.',
    category: 'advanced',
    cost: 10000,
    time: 220,
    prerequisites: ['fabrication'],
    unlocks: {
      mechanics: ['master_fabrication'],
    },
    position: { x: 22, y: 4 }
  },

  'starflight_basics_ship': {
    id: 'starflight_basics_ship',
    name: 'Starflight basics',
    description: 'Ship construction research.',
    category: 'advanced',
    cost: 12000,
    time: 240,
    prerequisites: ['starflight_basics'],
    unlocks: {
      buildings: ['ship_structural_beam'],
    },
    position: { x: 22, y: 5 }
  },

  'johnson_tanaka_drive': {
    id: 'johnson_tanaka_drive',
    name: 'Johnson-Tanaka drive',
    description: 'Build the ship reactor.',
    category: 'advanced',
    cost: 15000,
    time: 300,
    prerequisites: ['starflight_basics_ship'],
    unlocks: {
      buildings: ['ship_reactor'],
    },
    position: { x: 23, y: 7 }
  },

  'vacuum_cryostasis': {
    id: 'vacuum_cryostasis',
    name: 'Vacuum cryostasis',
    description: 'Ship cryptosleep systems.',
    category: 'advanced',
    cost: 12000,
    time: 240,
    prerequisites: ['cryptosleep_casket', 'starflight_basics'],
    unlocks: {
      buildings: ['ship_cryptosleep_casket'],
    },
    position: { x: 23, y: 6 }
  },

  'starflight_reactor': {
    id: 'starflight_reactor',
    name: 'Starflight reactor',
    description: 'Advanced ship reactor.',
    category: 'advanced',
    cost: 18000,
    time: 350,
    prerequisites: ['johnson_tanaka_drive'],
    unlocks: {
      buildings: ['ship_reactor_advanced'],
    },
    position: { x: 24, y: 7 }
  },

  'starflight_sensors': {
    id: 'starflight_sensors',
    name: 'Starflight sensors',
    description: 'Build ship sensors.',
    category: 'advanced',
    cost: 15000,
    time: 300,
    prerequisites: ['starflight_basics_ship'],
    unlocks: {
      buildings: ['ship_sensor_cluster'],
    },
    position: { x: 24, y: 6 }
  },

  'starflight_engine': {
    id: 'starflight_engine',
    name: 'Starflight engine',
    description: 'Build ship engines.',
    category: 'advanced',
    cost: 18000,
    time: 350,
    prerequisites: ['johnson_tanaka_drive'],
    unlocks: {
      buildings: ['ship_engine'],
    },
    position: { x: 25, y: 7 }
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
    description: 'Healthcare and augmentation'
  },
  advanced: {
    name: 'Advanced',
    color: '#8b5cf6',
    description: 'Cutting-edge technology'
  }
};
