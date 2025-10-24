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
 * Layout: 20 columns (x) × 12 rows (y)
 * X: 0-3=Basic, 4-7=Military, 8-11=Industry, 12-15=Medicine, 16-19=Advanced
 * Y: 0-2=Early, 3-5=Mid, 6-8=Late, 9-11=Endgame
 */
export const RESEARCH_TREE: Record<string, ResearchNode> = {
  // ====================
  // BASIC (Gray #94a3b8)
  // X: 0-3, Y: 0-3
  // ====================
  'cooking': {
    id: 'cooking',
    name: 'Cooking',
    description: 'Learn to cook basic meals from raw ingredients.',
    category: 'basic',
    cost: 50,
    time: 30,
    prerequisites: [],
    unlocks: {
      buildings: ['campfire', 'stove'],
      items: ['SimpleMeal', 'Bread'],
    },
    position: { x: 0, y: 3 }
  },

  'basic_construction': {
    id: 'basic_construction',
    name: 'Basic Construction',
    description: 'Learn fundamental building techniques.',
    category: 'basic',
    cost: 50,
    time: 30,
    prerequisites: [],
    unlocks: {
      buildings: ['wall', 'door'],
    },
    position: { x: 1, y: 4 }
  },

  'basic_crafting': {
    id: 'basic_crafting',
    name: 'Basic Crafting',
    description: 'Learn to craft simple items and clothing.',
    category: 'basic',
    cost: 50,
    time: 30,
    prerequisites: [],
    unlocks: {
      buildings: ['crafting_spot'],
      items: ['ClothShirt', 'ClothPants'],
    },
    position: { x: 0, y: 5 }
  },

  'agriculture': {
    id: 'agriculture',
    name: 'Agriculture',
    description: 'Develop farming techniques. (Tutorial unlock)',
    category: 'agriculture',
    cost: 0,
    time: 0,
    prerequisites: [],
    unlocks: {
      buildings: ['farm'],
    },
    position: { x: 0, y: 6 }
  },

  'basic_medicine': {
    id: 'basic_medicine',
    name: 'Basic Medicine',
    description: 'Learn fundamental medical treatments. (Tutorial unlock)',
    category: 'medicine',
    cost: 0,
    time: 0,
    prerequisites: [],
    unlocks: {
      buildings: ['medical_bed'],
      items: ['Bandage'],
    },
    position: { x: 1, y: 3 }
  },

  'basic_furniture': {
    id: 'basic_furniture',
    name: 'Basic Furniture',
    description: 'Craft tables, chairs, and beds for your colonists.',
    category: 'basic',
    cost: 80,
    time: 35,
    prerequisites: ['basic_construction'],
    unlocks: {
      buildings: ['small_table', 'large_table', 'stool', 'dining_chair', 'bed', 'end_table'],
      mechanics: ['eat_at_table']
    },
    position: { x: 1, y: 4 }
  },

  'tool_crafting': {
    id: 'tool_crafting',
    name: 'Tool Crafting',
    description: 'Master basic tool creation for survival.',
    category: 'basic',
    cost: 100,
    time: 45,
    prerequisites: ['basic_crafting'],
    unlocks: {
      items: ['Hoe', 'Axe', 'Pickaxe', 'Hammer'],
    },
    position: { x: 1, y: 5 }
  },

  'advanced_cooking': {
    id: 'advanced_cooking',
    name: 'Advanced Cooking',
    description: 'Master culinary techniques for better meals.',
    category: 'basic',
    cost: 150,
    time: 60,
    prerequisites: ['cooking'],
    unlocks: {
      buildings: ['industrial_stove'],
      items: ['FineMeal', 'LavishMeal'],
      mechanics: ['meal_quality_bonus']
    },
    position: { x: 1, y: 6 }
  },

  'smithing': {
    id: 'smithing',
    name: 'Smithing',
    description: 'Work metal to create superior tools and materials.',
    category: 'basic',
    cost: 200,
    time: 75,
    prerequisites: ['tool_crafting', 'stonecutting'],
    unlocks: {
      buildings: ['smithing_workbench'],
      items: ['SteelTools'],
    },
    position: { x: 2, y: 2 }
  },

  // ====================
  // MILITARY (Red #ef4444)
  // X: 4-7, Y: 2-6
  // ====================
  'melee_weapons': {
    id: 'melee_weapons',
    name: 'Melee Weapons',
    description: 'Craft basic weapons for close combat defense.',
    category: 'military',
    cost: 75,
    time: 40,
    prerequisites: ['tool_crafting'],
    unlocks: {
      items: ['Club', 'Knife', 'Spear'],
    },
    position: { x: 2, y: 3 }
  },

  'defensive_structures': {
    id: 'defensive_structures',
    name: 'Defensive Structures',
    description: 'Build basic defensive positions.',
    category: 'military',
    cost: 100,
    time: 50,
    prerequisites: ['basic_construction'],
    unlocks: {
      buildings: ['barricade', 'sandbag', 'spike_trap'],
    },
    position: { x: 2, y: 4 }
  },

  'basic_firearms': {
    id: 'basic_firearms',
    name: 'Basic Firearms',
    description: 'Manufacture simple firearms for ranged combat.',
    category: 'military',
    cost: 150,
    time: 60,
    prerequisites: ['melee_weapons', 'smithing'],
    unlocks: {
      items: ['Revolver', 'Autopistol', 'BoltActionRifle'],
    },
    position: { x: 2, y: 5 }
  },

  'body_armor': {
    id: 'body_armor',
    name: 'Body Armor',
    description: 'Craft protective gear to reduce combat damage.',
    category: 'military',
    cost: 180,
    time: 65,
    prerequisites: ['basic_firearms'],
    unlocks: {
      items: ['LeatherVest', 'FlakVest', 'SteelHelmet'],
    },
    position: { x: 2, y: 6 }
  },

  'fortifications': {
    id: 'fortifications',
    name: 'Fortifications',
    description: 'Build advanced defensive structures.',
    category: 'military',
    cost: 200,
    time: 80,
    prerequisites: ['defensive_structures', 'stonecutting'],
    unlocks: {
      buildings: ['bunker', 'embrasure', 'kill_box'],
    },
    position: { x: 2, y: 7 }
  },

  'advanced_firearms': {
    id: 'advanced_firearms',
    name: 'Advanced Firearms',
    description: 'Master military-grade weapon manufacturing.',
    category: 'military',
    cost: 300,
    time: 90,
    prerequisites: ['basic_firearms', 'machining'],
    unlocks: {
      items: ['AssaultRifle', 'Shotgun', 'SniperRifle', 'MachineGun'],
    },
    position: { x: 3, y: 1 }
  },

  'automated_defense': {
    id: 'automated_defense',
    name: 'Automated Defense',
    description: 'Build autonomous turrets to defend your colony.',
    category: 'military',
    cost: 350,
    time: 100,
    prerequisites: ['advanced_firearms', 'electricity'],
    unlocks: {
      buildings: ['mini_turret', 'auto_turret'],
    },
    position: { x: 3, y: 2 }
  },

  'explosives': {
    id: 'explosives',
    name: 'Explosives',
    description: 'Manufacture grenades and explosive weaponry.',
    category: 'military',
    cost: 320,
    time: 100,
    prerequisites: ['advanced_firearms'],
    unlocks: {
      items: ['Grenade', 'MolotovCocktail', 'IED'],
    },
    position: { x: 3, y: 3 }
  },

  'heavy_armor': {
    id: 'heavy_armor',
    name: 'Heavy Armor',
    description: 'Craft military-grade protective armor.',
    category: 'military',
    cost: 400,
    time: 120,
    prerequisites: ['body_armor', 'smelting'],
    unlocks: {
      items: ['MarineArmor', 'CataphractArmor'],
    },
    position: { x: 3, y: 4 }
  },

  'heavy_turrets': {
    id: 'heavy_turrets',
    name: 'Heavy Turrets',
    description: 'Deploy heavy weapons platforms.',
    category: 'military',
    cost: 500,
    time: 140,
    prerequisites: ['automated_defense'],
    unlocks: {
      buildings: ['heavy_turret', 'mortar', 'rocket_turret'],
    },
    position: { x: 3, y: 5 }
  },

  'powered_armor': {
    id: 'powered_armor',
    name: 'Powered Armor',
    description: 'Mechanized combat suits with superior protection.',
    category: 'military',
    cost: 600,
    time: 180,
    prerequisites: ['heavy_armor', 'advanced_materials'],
    unlocks: {
      items: ['PoweredArmor', 'PoweredHelmet'],
    },
    position: { x: 3, y: 6 }
  },

  // ====================
  // AGRICULTURE (Green #22c55e)
  // X: 0-6, Y: 4-10
  // ====================
  'composting': {
    id: 'composting',
    name: 'Composting',
    description: 'Create fertilizer to boost crop growth.',
    category: 'agriculture',
    cost: 80,
    time: 40,
    prerequisites: ['agriculture'],
    unlocks: {
      buildings: ['compost_bin'],
      mechanics: ['fertilizer', 'growth_boost_15'],
    },
    position: { x: 4, y: 0 }
  },

  'cooking_efficiency': {
    id: 'cooking_efficiency',
    name: 'Cooking Efficiency',
    description: 'Cook multiple meals at once.',
    category: 'agriculture',
    cost: 100,
    time: 45,
    prerequisites: ['advanced_cooking'],
    unlocks: {
      mechanics: ['bulk_cooking_4x'],
    },
    position: { x: 4, y: 1 }
  },

  'irrigation': {
    id: 'irrigation',
    name: 'Irrigation',
    description: 'Water management systems for faster crop growth.',
    category: 'agriculture',
    cost: 150,
    time: 60,
    prerequisites: ['composting'],
    unlocks: {
      buildings: ['irrigation_channel'],
      mechanics: ['growth_boost_20', 'drought_resistance'],
    },
    position: { x: 4, y: 3 }
  },

  'animal_husbandry': {
    id: 'animal_husbandry',
    name: 'Animal Husbandry',
    description: 'Tame and raise animals for resources.',
    category: 'agriculture',
    cost: 180,
    time: 70,
    prerequisites: ['agriculture'],
    unlocks: {
      buildings: ['animal_pen', 'haygrass_farm'],
      items: ['Kibble'],
      mechanics: ['animal_taming'],
    },
    position: { x: 4, y: 4 }
  },

  'advanced_farming': {
    id: 'advanced_farming',
    name: 'Advanced Farming',
    description: 'Greenhouses and year-round crop production.',
    category: 'agriculture',
    cost: 250,
    time: 85,
    prerequisites: ['irrigation'],
    unlocks: {
      buildings: ['greenhouse'],
      mechanics: ['year_round_growing', 'crop_rotation'],
    },
    position: { x: 4, y: 5 }
  },

  'food_preservation': {
    id: 'food_preservation',
    name: 'Food Preservation',
    description: 'Keep food fresh for extended periods.',
    category: 'agriculture',
    cost: 200,
    time: 70,
    prerequisites: ['cooking_efficiency'],
    unlocks: {
      buildings: ['smokehouse', 'salt_cellar'],
      items: ['Jerky', 'Pemmican'],
      mechanics: ['food_lasts_300_percent'],
    },
    position: { x: 4, y: 6 }
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
      mechanics: ['selective_breeding', 'enhanced_animals'],
    },
    position: { x: 5, y: 1 }
  },

  'cold_storage': {
    id: 'cold_storage',
    name: 'Cold Storage',
    description: 'Refrigeration technology for indefinite food storage.',
    category: 'agriculture',
    cost: 280,
    time: 90,
    prerequisites: ['food_preservation', 'electricity'],
    unlocks: {
      buildings: ['freezer', 'refrigerator'],
      mechanics: ['indefinite_storage'],
    },
    position: { x: 5, y: 3 }
  },

  'hydroponics': {
    id: 'hydroponics',
    name: 'Hydroponics',
    description: 'Soilless farming with accelerated growth.',
    category: 'agriculture',
    cost: 450,
    time: 130,
    prerequisites: ['advanced_farming', 'electricity'],
    unlocks: {
      buildings: ['hydroponic_basin', 'climate_greenhouse'],
      mechanics: ['growth_200_percent', 'soilless'],
    },
    position: { x: 6, y: 1 }
  },

  'industrial_ranching': {
    id: 'industrial_ranching',
    name: 'Industrial Ranching',
    description: 'Automated animal product collection.',
    category: 'agriculture',
    cost: 400,
    time: 120,
    prerequisites: ['breeding_programs', 'automation'],
    unlocks: {
      buildings: ['auto_feeder', 'milking_station', 'shearing_station'],
      mechanics: ['passive_production'],
    },
    position: { x: 6, y: 2 }
  },

  'genetic_modification': {
    id: 'genetic_modification',
    name: 'Genetic Modification',
    description: 'Modify genetics for custom crops and livestock.',
    category: 'agriculture',
    cost: 800,
    time: 240,
    prerequisites: ['hydroponics', 'industrial_ranching', 'gene_therapy'],
    unlocks: {
      buildings: ['gene_lab', 'bioreactor'],
      mechanics: ['gmo_crops', 'super_animals'],
    },
    position: { x: 6, y: 3 }
  },

  // ====================
  // INDUSTRY (Orange #f59e0b)
  // X: 8-12, Y: 1-7
  // ====================
  'stonecutting': {
    id: 'stonecutting',
    name: 'Stonecutting',
    description: 'Process stone into building blocks.',
    category: 'industry',
    cost: 80,
    time: 45,
    prerequisites: ['basic_construction'],
    unlocks: {
      buildings: ['stonecutter_table', 'stone_wall'],
      items: ['StoneBlocks'],
      mechanics: ['stone_construction'],
    },
    position: { x: 7, y: 1 }
  },

  'deep_mining': {
    id: 'deep_mining',
    name: 'Deep Mining',
    description: 'Extract ore and minerals from mountains.',
    category: 'industry',
    cost: 150,
    time: 60,
    prerequisites: ['tool_crafting'],
    unlocks: {
      buildings: ['mining_zone', 'quarry', 'deep_drill'],
      mechanics: ['ore_extraction'],
    },
    position: { x: 7, y: 3 }
  },

  'logging_efficiency': {
    id: 'logging_efficiency',
    name: 'Logging Efficiency',
    description: 'Process lumber more effectively.',
    category: 'industry',
    cost: 100,
    time: 50,
    prerequisites: ['tool_crafting'],
    unlocks: {
      buildings: ['sawmill'],
      mechanics: ['wood_bonus_50'],
    },
    position: { x: 10, y: 0 }
  },

  'smelting': {
    id: 'smelting',
    name: 'Smelting',
    description: 'Process raw ore into metal ingots.',
    category: 'industry',
    cost: 200,
    time: 75,
    prerequisites: ['deep_mining'],
    unlocks: {
      buildings: ['bloomery', 'smelter', 'forge'],
      items: ['IronBar', 'SteelBar'],
    },
    position: { x: 10, y: 1 }
  },

  'masonry': {
    id: 'masonry',
    name: 'Masonry',
    description: 'Craft advanced stone structures and furniture.',
    category: 'industry',
    cost: 180,
    time: 65,
    prerequisites: ['stonecutting'],
    unlocks: {
      buildings: ['stone_table', 'stone_chair'],
      items: ['Marble', 'Granite'],
    },
    position: { x: 10, y: 2 }
  },

  'machining': {
    id: 'machining',
    name: 'Machining',
    description: 'Precision manufacturing and component production.',
    category: 'industry',
    cost: 300,
    time: 100,
    prerequisites: ['smelting'],
    unlocks: {
      buildings: ['machine_shop', 'fabricator'],
      items: ['Component', 'MechanicalPart'],
    },
    position: { x: 10, y: 3 }
  },

  'power_generation': {
    id: 'power_generation',
    name: 'Power Generation',
    description: 'Generate electrical power for your colony.',
    category: 'industry',
    cost: 400,
    time: 120,
    prerequisites: ['machining'],
    unlocks: {
      buildings: ['wood_generator', 'water_wheel', 'battery'],
      mechanics: ['power_grid'],
    },
    position: { x: 10, y: 4 }
  },

  'electricity': {
    id: 'electricity',
    name: 'Electricity',
    description: 'Harness electrical power for advanced technology.',
    category: 'industry',
    cost: 450,
    time: 130,
    prerequisites: ['power_generation'],
    unlocks: {
      buildings: ['power_conduit', 'electric_light', 'electric_crafting_bench'],
      mechanics: ['electricity_unlocked'],
    },
    position: { x: 10, y: 5 }
  },

  'renewable_energy': {
    id: 'renewable_energy',
    name: 'Renewable Energy',
    description: 'Infinite clean power from sun and wind.',
    category: 'industry',
    cost: 380,
    time: 115,
    prerequisites: ['electricity'],
    unlocks: {
      buildings: ['solar_panel', 'wind_turbine', 'geothermal_tap'],
    },
    position: { x: 10, y: 6 }
  },

  'automation': {
    id: 'automation',
    name: 'Automation',
    description: 'Automate production with machinery.',
    category: 'industry',
    cost: 550,
    time: 160,
    prerequisites: ['electricity'],
    unlocks: {
      buildings: ['auto_loom', 'auto_kitchen', 'assembly_line', 'conveyor'],
      mechanics: ['automated_crafting'],
    },
    position: { x: 10, y: 7 }
  },

  'advanced_materials': {
    id: 'advanced_materials',
    name: 'Advanced Materials',
    description: 'Research exotic materials for superior construction.',
    category: 'industry',
    cost: 500,
    time: 150,
    prerequisites: ['machining', 'smelting'],
    unlocks: {
      items: ['Plasteel', 'Composite', 'Hyperweave'],
    },
    position: { x: 12, y: 2 }
  },

  'industrial_fabrication': {
    id: 'industrial_fabrication',
    name: 'Industrial Fabrication',
    description: 'Mass production and advanced manufacturing.',
    category: 'industry',
    cost: 700,
    time: 200,
    prerequisites: ['automation', 'advanced_materials'],
    unlocks: {
      buildings: ['advanced_fabricator', 'nanoforge'],
      mechanics: ['instant_crafting'],
    },
    position: { x: 12, y: 3 }
  },

  // ====================
  // MEDICINE (Pink #ec4899)
  // X: 12-16, Y: 2-8
  // ====================
  'herbal_medicine': {
    id: 'herbal_medicine',
    name: 'Herbal Medicine',
    description: 'Craft healing items from plants.',
    category: 'medicine',
    cost: 100,
    time: 50,
    prerequisites: ['basic_medicine'],
    unlocks: {
      items: ['HerbalMedicine', 'HealingPoultice'],
    },
    position: { x: 12, y: 4 }
  },

  'surgery': {
    id: 'surgery',
    name: 'Surgery',
    description: 'Perform medical operations on colonists.',
    category: 'medicine',
    cost: 200,
    time: 80,
    prerequisites: ['basic_medicine'],
    unlocks: {
      buildings: ['operating_table'],
      mechanics: ['surgery', 'remove_bullets'],
    },
    position: { x: 12, y: 5 }
  },

  'pharmaceuticals': {
    id: 'pharmaceuticals',
    name: 'Pharmaceuticals',
    description: 'Manufacture advanced medicine and drugs.',
    category: 'medicine',
    cost: 250,
    time: 90,
    prerequisites: ['herbal_medicine'],
    unlocks: {
      buildings: ['drug_lab'],
      items: ['Medicine', 'Painkillers'],
    },
    position: { x: 13, y: 2 }
  },

  'advanced_medicine': {
    id: 'advanced_medicine',
    name: 'Advanced Medicine',
    description: 'Cutting-edge medical procedures and techniques.',
    category: 'medicine',
    cost: 350,
    time: 110,
    prerequisites: ['surgery', 'pharmaceuticals'],
    unlocks: {
      buildings: ['vitals_monitor', 'iv_drip'],
      mechanics: ['healing_speed_50', 'surgery_success_boost'],
    },
    position: { x: 13, y: 3 }
  },

  'prosthetics': {
    id: 'prosthetics',
    name: 'Prosthetics',
    description: 'Replace lost limbs with mechanical prosthetics.',
    category: 'medicine',
    cost: 380,
    time: 115,
    prerequisites: ['surgery', 'machining'],
    unlocks: {
      buildings: ['prosthetics_workbench'],
      items: ['PegLeg', 'HookHand', 'Dentures', 'GlassEye'],
    },
    position: { x: 13, y: 4 }
  },

  'regenerative_medicine': {
    id: 'regenerative_medicine',
    name: 'Regenerative Medicine',
    description: 'Heal permanent injuries and scars.',
    category: 'medicine',
    cost: 500,
    time: 150,
    prerequisites: ['advanced_medicine'],
    unlocks: {
      buildings: ['regeneration_tank'],
      items: ['HealerSerum', 'RegenerationGel'],
      mechanics: ['scar_healing', 'old_wound_healing'],
    },
    position: { x: 13, y: 5 }
  },

  'bionics': {
    id: 'bionics',
    name: 'Bionics',
    description: 'Advanced bionic implants that enhance abilities.',
    category: 'medicine',
    cost: 600,
    time: 170,
    prerequisites: ['prosthetics', 'electricity'],
    unlocks: {
      buildings: ['bionic_workshop'],
      items: ['BionicArm', 'BionicLeg', 'BionicEye', 'BionicEar', 'BionicHeart', 'BionicSpine'],
      mechanics: ['stat_boost'],
    },
    position: { x: 13, y: 6 }
  },

  'gene_therapy': {
    id: 'gene_therapy',
    name: 'Gene Therapy',
    description: 'Modify colonist genetics and traits.',
    category: 'medicine',
    cost: 850,
    time: 230,
    prerequisites: ['regenerative_medicine', 'bionics'],
    unlocks: {
      buildings: ['gene_therapy_lab'],
      mechanics: ['trait_modification', 'genetic_enhancement'],
    },
    position: { x: 15, y: 6 }
  },

  'archotech_implants': {
    id: 'archotech_implants',
    name: 'Archotech Implants',
    description: 'Legendary technology from an ancient civilization.',
    category: 'medicine',
    cost: 1000,
    time: 300,
    prerequisites: ['bionics', 'nanotechnology'],
    unlocks: {
      items: ['ArchotechEye', 'ArchotechArm', 'ArchotechLeg'],
      mechanics: ['massive_stat_boost'],
    },
    position: { x: 16, y: 7 }
  },

  // ====================
  // ADVANCED (Purple #8b5cf6)
  // X: 16-19, Y: 4-11
  // ====================
  'energy_weapons': {
    id: 'energy_weapons',
    name: 'Energy Weapons',
    description: 'Plasma and laser weaponry.',
    category: 'advanced',
    cost: 650,
    time: 180,
    prerequisites: ['advanced_firearms', 'electricity'],
    unlocks: {
      items: ['LaserPistol', 'PlasmaRifle', 'ChargeLance'],
    },
    position: { x: 16, y: 4 }
  },

  'laser_turrets': {
    id: 'laser_turrets',
    name: 'Laser Turrets',
    description: 'Energy-based defensive installations.',
    category: 'advanced',
    cost: 600,
    time: 170,
    prerequisites: ['heavy_turrets', 'energy_weapons'],
    unlocks: {
      buildings: ['laser_turret', 'plasma_turret'],
    },
    position: { x: 17, y: 5 }
  },

  'robotics': {
    id: 'robotics',
    name: 'Robotics',
    description: 'Build autonomous robots to assist colonists.',
    category: 'advanced',
    cost: 750,
    time: 210,
    prerequisites: ['automation', 'laser_turrets'],
    unlocks: {
      buildings: ['robotics_facility', 'charging_station'],
      mechanics: ['worker_bots', 'auto_hauling'],
    },
    position: { x: 17, y: 6 }
  },

  'shields': {
    id: 'shields',
    name: 'Shield Technology',
    description: 'Personal and base shields that absorb damage.',
    category: 'advanced',
    cost: 800,
    time: 220,
    prerequisites: ['energy_weapons'],
    unlocks: {
      buildings: ['shield_generator'],
      items: ['ShieldBelt', 'PersonalShield'],
    },
    position: { x: 16, y: 6 }
  },

  'artificial_intelligence': {
    id: 'artificial_intelligence',
    name: 'Artificial Intelligence',
    description: 'AI assistants and advanced computing.',
    category: 'advanced',
    cost: 900,
    time: 260,
    prerequisites: ['robotics'],
    unlocks: {
      buildings: ['ai_core'],
      mechanics: ['research_speed_30', 'smart_defense'],
    },
    position: { x: 18, y: 7 }
  },

  'cryogenics': {
    id: 'cryogenics',
    name: 'Cryogenics',
    description: 'Freeze colonists for long-term storage.',
    category: 'advanced',
    cost: 850,
    time: 230,
    prerequisites: ['bionics', 'electricity'],
    unlocks: {
      buildings: ['cryo_pod', 'cryo_casket'],
      mechanics: ['suspended_animation', 'no_aging'],
    },
    position: { x: 16, y: 8 }
  },

  'nanotechnology': {
    id: 'nanotechnology',
    name: 'Nanotechnology',
    description: 'Microscopic machines for healing and construction.',
    category: 'advanced',
    cost: 1100,
    time: 320,
    prerequisites: ['gene_therapy', 'artificial_intelligence'],
    unlocks: {
      buildings: ['nano_assembler'],
      items: ['NanoHealer', 'NanoConstructor'],
      mechanics: ['nano_healing', 'instant_build'],
    },
    position: { x: 17, y: 8 }
  },

  'quantum_computing': {
    id: 'quantum_computing',
    name: 'Quantum Computing',
    description: 'Harness quantum mechanics for ultimate computation.',
    category: 'advanced',
    cost: 1400,
    time: 380,
    prerequisites: ['artificial_intelligence'],
    unlocks: {
      buildings: ['quantum_processor'],
      mechanics: ['research_speed_300'],
    },
    position: { x: 18, y: 8 }
  },

  'teleportation': {
    id: 'teleportation',
    name: 'Teleportation',
    description: 'Instant transport across the map.',
    category: 'advanced',
    cost: 1600,
    time: 420,
    prerequisites: ['quantum_computing', 'shields'],
    unlocks: {
      buildings: ['teleporter', 'teleport_beacon'],
      mechanics: ['instant_travel'],
    },
    position: { x: 18, y: 9 }
  },

  'starship_construction': {
    id: 'starship_construction',
    name: 'Starship Construction',
    description: 'Build a ship to escape the planet. [VICTORY]',
    category: 'advanced',
    cost: 2000,
    time: 500,
    prerequisites: ['quantum_computing', 'nanotechnology'],
    unlocks: {
      buildings: ['ship_reactor', 'ship_engine', 'ship_hull', 'ship_sensors', 'ship_cryptosleep'],
      mechanics: ['victory_path'],
    },
    position: { x: 18, y: 10 }
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
