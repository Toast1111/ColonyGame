/**
 * Research Database - Unified Tree Structure
 *
 * Centralized data-driven research tree definition.
 * All categories displayed together in one large interconnected tree.
 */

export type ResearchCategory =
  | 'basic'
  | 'military'
  | 'agriculture'
  | 'industry'
  | 'medicine'
  | 'advanced';

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
 * Layout mirrors the provided image (columns L→R; rows top→bottom).
 * Positions are integer grid slots for easy snapping in your renderer.
 */
export const RESEARCH_TREE: Record<string, ResearchNode> = {
  // ====================
  // COLUMN 0 — Early Basics
  // ====================
  tree_sowing: {
    id: 'tree_sowing',
    name: 'Tree sowing',
    description: 'Plant and grow trees.',
    category: 'basic',
    cost: 1000,
    time: 60,
    prerequisites: [],
    unlocks: { mechanics: ['tree_planting'] },
    position: { x: 0, y: 0 }
  },
  cocoa: {
    id: 'cocoa',
    name: 'Cocoa',
    description: 'Cultivate cocoa trees.',
    category: 'agriculture',
    cost: 1000,
    time: 60,
    prerequisites: [],
    unlocks: { items: ['Chocolate'] },
    position: { x: 0, y: 1 }
  },
  psychoid_brewing: {
    id: 'psychoid_brewing',
    name: 'Psychoid brewing',
    description: 'Brew psychoid tea for mood management.',
    category: 'basic',
    cost: 600,
    time: 50,
    prerequisites: [],
    unlocks: { items: ['PsychoidTea'] },
    position: { x: 0, y: 2 }
  },
  passive_cooler: {
    id: 'passive_cooler',
    name: 'Passive cooler',
    description: 'Simple evaporative cooling.',
    category: 'basic',
    cost: 1000,
    time: 60,
    prerequisites: [],
    unlocks: { buildings: ['passive_cooler'] },
    position: { x: 0, y: 3 }
  },
  beer_brewing: {
    id: 'beer_brewing',
    name: 'Beer brewing',
    description: 'Brew beer for recreation.',
    category: 'basic',
    cost: 700,
    time: 55,
    prerequisites: [],
    unlocks: { items: ['Beer'], buildings: ['brewery'] },
    position: { x: 0, y: 4 }
  },
  stonecutting: {
    id: 'stonecutting',
    name: 'Stonecutting',
    description: 'Cut stone blocks for construction.',
    category: 'basic',
    cost: 1000,
    time: 60,
    prerequisites: [],
    unlocks: { items: ['StoneBlocks'], buildings: ['stonecutting_table'] },
    position: { x: 0, y: 5 }
  },

  // ====================
  // COLUMN 1 — Early Craft & Crops
  // ====================
  greatbow: {
    id: 'greatbow',
    name: 'Greatbow',
    description: 'Craft greatbows for long-range primitive combat.',
    category: 'military',
    cost: 600,
    time: 50,
    prerequisites: [],
    unlocks: { items: ['Greatbow'] },
    position: { x: 1, y: 0 }
  },
  devilstrand: {
    id: 'devilstrand',
    name: 'Devilstrand',
    description: 'Grow devilstrand mushrooms for strong fabric.',
    category: 'agriculture',
    cost: 800,
    time: 55,
    prerequisites: [],
    unlocks: { items: ['DevilstrandCloth'] },
    position: { x: 1, y: 1 }
  },
  pemmican: {
    id: 'pemmican',
    name: 'Pemmican',
    description: 'Preserved travel rations.',
    category: 'agriculture',
    cost: 400,
    time: 45,
    prerequisites: [],
    unlocks: { items: ['Pemmican'] },
    position: { x: 1, y: 2 }
  },
  carpet_making: {
    id: 'carpet_making',
    name: 'Carpet making',
    description: 'Weave carpet for beauty and comfort.',
    category: 'basic',
    cost: 600,
    time: 50,
    prerequisites: [],
    unlocks: { buildings: ['carpet'] },
    position: { x: 1, y: 3 }
  },
  smithing: {
    id: 'smithing',
    name: 'Smithing',
    description: 'Forge basic metal tools and melee weapons.',
    category: 'industry',
    cost: 700,
    time: 55,
    prerequisites: [],
    unlocks: { buildings: ['smithing_bench'], items: ['Gladius', 'Knife', 'Mace'] },
    position: { x: 1, y: 4 }
  },
  complex_furniture: {
    id: 'complex_furniture',
    name: 'Complex furniture',
    description: 'Armchairs, end tables, dressers and more.',
    category: 'basic',
    cost: 800,
    time: 55,
    prerequisites: [],
    unlocks: { buildings: ['armchair', 'dresser', 'end_table'] },
    position: { x: 1, y: 5 }
  },

  // ====================
  // COLUMN 2 — Clothing & Early Weapons
  // ====================
  complex_clothing: {
    id: 'complex_clothing',
    name: 'Complex clothing',
    description: 'Tailored parkas, dusters, and hats.',
    category: 'basic',
    cost: 1200,
    time: 70,
    prerequisites: [],
    unlocks: { items: ['Parka', 'Duster', 'CowboyHat'] },
    position: { x: 2, y: 1 }
  },
  long_blades: {
    id: 'long_blades',
    name: 'Long blades',
    description: 'Craft longswords and spears.',
    category: 'military',
    cost: 1000,
    time: 60,
    prerequisites: ['smithing'],
    unlocks: { items: ['Longsword', 'Spear'] },
    position: { x: 2, y: 2 }
  },
  plate_armor: {
    id: 'plate_armor',
    name: 'Plate armor',
    description: 'Heavy steel plate for robust protection.',
    category: 'military',
    cost: 1400,
    time: 75,
    prerequisites: ['smithing'],
    unlocks: { items: ['PlateArmor'] },
    position: { x: 2, y: 3 }
  },
  gas_operation: {
    id: 'gas_operation',
    name: 'Gas operation',
    description: 'Gas-powered mechanisms and weapons actions.',
    category: 'industry',
    cost: 1000,
    time: 65,
    prerequisites: [],
    unlocks: { mechanics: ['gas_systems'] },
    position: { x: 2, y: 4 }
  },
  recurve_bow: {
    id: 'recurve_bow',
    name: 'Recurve bow',
    description: 'Efficient composite bows.',
    category: 'military',
    cost: 600,
    time: 50,
    prerequisites: [],
    unlocks: { items: ['RecurveBow'] },
    position: { x: 2, y: 5 }
  },

  // ====================
  // COLUMN 3–4 — Drugs
  // ====================
  drug_production: {
    id: 'drug_production',
    name: 'Drug production',
    description: 'Drug lab and basic drug synthesis.',
    category: 'medicine',
    cost: 1200,
    time: 70,
    prerequisites: [],
    unlocks: { buildings: ['drug_lab'] },
    position: { x: 3, y: 0 }
  },
  psychite_refining: {
    id: 'psychite_refining',
    name: 'Psychite refining',
    description: 'Process psychite into yayo and flake.',
    category: 'medicine',
    cost: 1200,
    time: 70,
    prerequisites: ['drug_production'],
    unlocks: { items: ['Yayo', 'Flake'] },
    position: { x: 4, y: 0 }
  },
  wake_up_production: {
    id: 'wake_up_production',
    name: 'Wake-up production',
    description: 'Synthesize wake-up.',
    category: 'medicine',
    cost: 1600,
    time: 80,
    prerequisites: ['drug_production'],
    unlocks: { items: ['WakeUp'] },
    position: { x: 4, y: 1 }
  },
  go_juice_production: {
    id: 'go_juice_production',
    name: 'Go-juice production',
    description: 'Combat performance enhancer.',
    category: 'medicine',
    cost: 1800,
    time: 85,
    prerequisites: ['drug_production'],
    unlocks: { items: ['GoJuice'] },
    position: { x: 4, y: 2 }
  },
  penoxycyline_production: {
    id: 'penoxycyline_production',
    name: 'Penoxycyline production',
    description: 'Disease prevention drug.',
    category: 'medicine',
    cost: 1600,
    time: 80,
    prerequisites: ['drug_production'],
    unlocks: { items: ['Penoxycyline'] },
    position: { x: 4, y: 3 }
  },

  // ====================
  // COLUMN 5–8 — Electricity & Power
  // ====================
  electricity: {
    id: 'electricity',
    name: 'Electricity',
    description: 'Power conduits and basic power.',
    category: 'industry',
    cost: 1800,
    time: 85,
    prerequisites: [],
    unlocks: { mechanics: ['electricity'], buildings: ['power_conduit'] },
    position: { x: 5, y: 3 }
  },
  batteries: {
    id: 'batteries',
    name: 'Batteries',
    description: 'Store electricity safely.',
    category: 'industry',
    cost: 800,
    time: 55,
    prerequisites: ['electricity'],
    unlocks: { buildings: ['battery'] },
    position: { x: 6, y: 1 }
  },
  autodoor: {
    id: 'autodoor',
    name: 'Autodoor',
    description: 'Powered doors that open automatically.',
    category: 'industry',
    cost: 600,
    time: 50,
    prerequisites: ['electricity'],
    unlocks: { buildings: ['autodoor'] },
    position: { x: 6, y: 2 }
  },
  hydroponics: {
    id: 'hydroponics',
    name: 'Hydroponics',
    description: 'Indoor soil-less crop basins.',
    category: 'agriculture',
    cost: 1600,
    time: 80,
    prerequisites: ['electricity'],
    unlocks: { buildings: ['hydroponics_basin'] },
    position: { x: 6, y: 3 }
  },
  air_conditioning: {
    id: 'air_conditioning',
    name: 'Air conditioning',
    description: 'Coolers and heaters for temperature control.',
    category: 'industry',
    cost: 800,
    time: 55,
    prerequisites: ['electricity'],
    unlocks: { buildings: ['cooler', 'heater'] },
    position: { x: 6, y: 4 }
  },
  advanced_lights: {
    id: 'advanced_lights',
    name: 'Advanced lights',
    description: 'Efficient indoor lighting.',
    category: 'industry',
    cost: 800,
    time: 55,
    prerequisites: ['electricity'],
    unlocks: { buildings: ['standing_lamp'] },
    position: { x: 6, y: 5 }
  },
  machining: {
    id: 'machining',
    name: 'Machining',
    description: 'Machine tables and components.',
    category: 'industry',
    cost: 1000,
    time: 65,
    prerequisites: ['electricity', 'smithing'],
    unlocks: { buildings: ['machining_table'], items: ['Components'] },
    position: { x: 6, y: 6 }
  },
  solar_panel: {
    id: 'solar_panel',
    name: 'Solar panel',
    description: 'Photovoltaic power.',
    category: 'industry',
    cost: 1600,
    time: 80,
    prerequisites: ['batteries'],
    unlocks: { buildings: ['solar_generator'] },
    position: { x: 7, y: 1 }
  },
  biofuel_refining: {
    id: 'biofuel_refining',
    name: 'Biofuel refining',
    description: 'Process organics to chemfuel.',
    category: 'industry',
    cost: 1200,
    time: 70,
    prerequisites: ['electricity'],
    unlocks: { items: ['Chemfuel'], buildings: ['biofuel_refinery'] },
    position: { x: 7, y: 4 }
  },
  gunsmithing: {
    id: 'gunsmithing',
    name: 'Gunsmithing',
    description: 'Craft simple firearms.',
    category: 'military',
    cost: 1400,
    time: 75,
    prerequisites: ['machining'],
    unlocks: { items: ['Revolver', 'Autopistol'] },
    position: { x: 7, y: 6 }
  },
  fuel_energy: {
    id: 'fuel_energy',
    name: 'Fuel energy',
    description: 'Chemfuel-powered generators.',
    category: 'industry',
    cost: 1200,
    time: 70,
    prerequisites: ['biofuel_refining'],
    unlocks: { buildings: ['chemfuel_generator'] },
    position: { x: 8, y: 5 }
  },
  smokeleaf_joints: {
    id: 'smokeleaf_joints',
    name: 'Smokeleaf joints',
    description: 'Roll smokeleaf for recreation.',
    category: 'medicine',
    cost: 600,
    time: 50,
    prerequisites: [],
    unlocks: { items: ['SmokeleafJoint'] },
    position: { x: 8, y: 6 }
  },

  // ====================
  // COLUMN 8–9 — Food/Power Extras
  // ====================
  dense_materials: {
    id: 'dense_materials',
    name: 'Dense materials',
    description: 'Work with heavy materials.',
    category: 'industry',
    cost: 1400,
    time: 75,
    prerequisites: [],
    unlocks: { mechanics: ['dense_materials'] },
    position: { x: 8, y: 1 }
  },
  nutrient_paste: {
    id: 'nutrient_paste',
    name: 'Nutrient paste',
    description: 'Automated meal dispensing.',
    category: 'agriculture',
    cost: 800,
    time: 55,
    prerequisites: ['electricity'],
    unlocks: { buildings: ['nutrient_paste_dispenser'] },
    position: { x: 8, y: 2 }
  },
  watermill_generator: {
    id: 'watermill_generator',
    name: 'Watermill generator',
    description: 'Hydro kinetic power.',
    category: 'industry',
    cost: 1200,
    time: 70,
    prerequisites: ['electricity'],
    unlocks: { buildings: ['watermill'] },
    position: { x: 8, y: 3 }
  },
  geothermal_power: {
    id: 'geothermal_power',
    name: 'Geothermal power',
    description: 'Tap geysers for reliable energy.',
    category: 'industry',
    cost: 3000,
    time: 120,
    prerequisites: ['electricity'],
    unlocks: { buildings: ['geothermal_generator'] },
    position: { x: 8, y: 4 }
  },
  packaged_survival_meal: {
    id: 'packaged_survival_meal',
    name: 'Packaged survival meal',
    description: 'Long-shelf-life travel meals.',
    category: 'agriculture',
    cost: 1000,
    time: 65,
    prerequisites: [],
    unlocks: { items: ['PackagedSurvivalMeal'] },
    position: { x: 9, y: 2 }
  },
  // NEW mid-military row from the image
  blowback_operation: {
    id: 'blowback_operation',
    name: 'Blowback operation',
    description: 'Firearm actions enabling SMGs and shotguns.',
    category: 'military',
    cost: 1200,
    time: 70,
    prerequisites: ['gunsmithing'],
    unlocks: { items: ['MachinePistol', 'PumpShotgun'] },
    position: { x: 9, y: 3 }
  },
  gun_turrets: {
    id: 'gun_turrets',
    name: 'Gun turrets',
    description: 'Automated defensive turrets.',
    category: 'military',
    cost: 1600,
    time: 85,
    prerequisites: ['microelectronics'],
    unlocks: { buildings: ['mini_turret'] },
    position: { x: 9, y: 4 }
  },
  mortars: {
    id: 'mortars',
    name: 'Mortars',
    description: 'Indirect-fire siege weapons.',
    category: 'military',
    cost: 2000,
    time: 95,
    prerequisites: ['gunsmithing'],
    unlocks: { buildings: ['mortar'] },
    position: { x: 9, y: 5 }
  },
  prosthetics: {
    id: 'prosthetics',
    name: 'Prosthetics',
    description: 'Basic artificial limbs.',
    category: 'medicine',
    cost: 2000,
    time: 95,
    prerequisites: ['smithing'],
    unlocks: { items: ['PegLeg', 'WoodenFoot', 'WoodenHand'] },
    position: { x: 9, y: 6 }
  },
  foam_turret: {
    id: 'foam_turret',
    name: 'Foam turret',
    description: 'Fire-suppressant foam turrets.',
    category: 'industry',
    cost: 1200,
    time: 70,
    prerequisites: [],
    unlocks: { buildings: ['foam_turret'] },
    position: { x: 9, y: 7 }
  },

  // ====================
  // COLUMN 10–11 — Microelectronics Tier
  // ====================
  microelectronics: {
    id: 'microelectronics',
    name: 'Microelectronics',
    description: 'Comms console, advanced components, fabrication bench.',
    category: 'industry',
    cost: 3000,
    time: 120,
    prerequisites: ['machining'],
    unlocks: { items: ['AdvancedComponent'], buildings: ['comms_console', 'fabrication_bench'] },
    position: { x: 10, y: 4 }
  },
  tube_television: {
    id: 'tube_television',
    name: 'Tube television',
    description: 'Entertainment devices.',
    category: 'industry',
    cost: 1400,
    time: 75,
    prerequisites: ['microelectronics'],
    unlocks: { buildings: ['tube_television'] },
    position: { x: 11, y: 1 }
  },
  fabrication_television: {
    id: 'fabrication_television',
    name: 'Fabrication television',
    description: 'Flatscreen TV tech.',
    category: 'industry',
    cost: 2000,
    time: 95,
    prerequisites: ['microelectronics'],
    unlocks: { buildings: ['flatscreen_television'] },
    position: { x: 11, y: 2 }
  },
  shields: {
    id: 'shields',
    name: 'Shields',
    description: 'Personal energy shield belts.',
    category: 'military',
    cost: 2000,
    time: 95,
    prerequisites: ['microelectronics'],
    unlocks: { items: ['ShieldBelt'] },
    position: { x: 11, y: 3 }
  },
  transport_pod: {
    id: 'transport_pod',
    name: 'Transport pod',
    description: 'Orbital/long-range logistics.',
    category: 'advanced',
    cost: 2000,
    time: 95,
    prerequisites: ['microelectronics'],
    unlocks: { buildings: ['transport_pod_launcher', 'transport_pod'] },
    position: { x: 11, y: 4 }
  },
  autocannon_turret: {
    id: 'autocannon_turret',
    name: 'Autocannon turret',
    description: 'Heavy caliber automated defense.',
    category: 'military',
    cost: 3000,
    time: 120,
    prerequisites: ['gun_turrets'],
    unlocks: { buildings: ['autocannon_turret'] },
    position: { x: 11, y: 5 }
  },
  precision_rifling: {
    id: 'precision_rifling',
    name: 'Precision rifling',
    description: 'Accurate bolt-action & sniper platforms.',
    category: 'military',
    cost: 2600,
    time: 110,
    prerequisites: ['gunsmithing'],
    unlocks: { items: ['BoltActionRifle', 'SniperRifle'] },
    position: { x: 11, y: 6 }
  },
  multibarrel_weapons: {
    id: 'multibarrel_weapons',
    name: 'Multibarrel weapons',
    description: 'Miniguns and HMG designs.',
    category: 'military',
    cost: 4000,
    time: 140,
    prerequisites: ['precision_rifling'],
    unlocks: { items: ['Minigun'] },
    position: { x: 11, y: 7 }
  },

  // ====================
  // COLUMN 12–13 — Scanners & Hospital
  // ====================
  medicine_production: {
    id: 'medicine_production',
    name: 'Medicine production',
    description: 'Industrial medicine recipes.',
    category: 'medicine',
    cost: 2000,
    time: 95,
    prerequisites: [],
    unlocks: { items: ['MedicineIndustrial'] },
    position: { x: 12, y: 0 }
  },
  long_range_mineral_scanner: {
    id: 'long_range_mineral_scanner',
    name: 'Long-range mineral scanner',
    description: 'Scan the world for distant ore deposits.',
    category: 'industry',
    cost: 2000,
    time: 95,
    prerequisites: ['microelectronics'],
    unlocks: { buildings: ['long_range_mineral_scanner'] },
    position: { x: 12, y: 1 }
  },
  ground_penetrating_scanner: {
    id: 'ground_penetrating_scanner',
    name: 'Ground-penetrating scanner',
    description: 'Locate deep underground resources.',
    category: 'industry',
    cost: 3000,
    time: 120,
    prerequisites: ['long_range_mineral_scanner'],
    unlocks: { buildings: ['ground_penetrating_scanner'] },
    position: { x: 12, y: 2 }
  },
  deep_drilling: {
    id: 'deep_drilling',
    name: 'Deep drilling',
    description: 'Drill into deep rock layers.',
    category: 'industry',
    cost: 3000,
    time: 120,
    prerequisites: ['ground_penetrating_scanner'],
    unlocks: { buildings: ['deep_drill'] },
    position: { x: 12, y: 3 }
  },
  multi_analyzer: {
    id: 'multi_analyzer',
    name: 'Multi-analyzer',
    description: 'Advanced research acceleration.',
    category: 'advanced',
    cost: 6000,
    time: 180,
    prerequisites: ['microelectronics'],
    unlocks: { buildings: ['multi_analyzer'], mechanics: ['research_speed_bonus'] },
    position: { x: 12, y: 4 }
  },
  vitals_monitor: {
    id: 'vitals_monitor',
    name: 'Vitals monitor',
    description: 'Hospital monitoring equipment.',
    category: 'medicine',
    cost: 2000,
    time: 95,
    prerequisites: ['microelectronics'],
    unlocks: { buildings: ['vitals_monitor'] },
    position: { x: 12, y: 5 }
  },

  // ====================
  // COLUMN 14–15 — Fabrication & Defenses
  // ====================
  flatscreen_television: {
    id: 'flatscreen_television',
    name: 'Flatscreen television',
    description: 'High-quality entertainment.',
    category: 'industry',
    cost: 2000,
    time: 95,
    prerequisites: ['fabrication_television'],
    unlocks: { buildings: ['flatscreen_television'] },
    position: { x: 14, y: 2 }
  },
  machine_pump: {
    id: 'machine_pump',
    name: 'Moisture pump',
    description: 'Slowly dries moisture from terrain.',
    category: 'industry',
    cost: 2000,
    time: 95,
    prerequisites: ['microelectronics'],
    unlocks: { buildings: ['moisture_pump'] },
    position: { x: 14, y: 3 }
  },
  // extra visible mid-tier defenses
  ieds: {
    id: 'ieds',
    name: 'IEDs',
    description: 'Improvised explosive devices.',
    category: 'military',
    cost: 1200,
    time: 70,
    prerequisites: ['mortars'],
    unlocks: { buildings: ['ied_trap'] },
    position: { x: 14, y: 4 }
  },
  uranium_slug_turret: {
    id: 'uranium_slug_turret',
    name: 'Uranium slug turret',
    description: 'High-velocity uranium slugs for base defense.',
    category: 'military',
    cost: 5000,
    time: 160,
    prerequisites: ['autocannon_turret'],
    unlocks: { buildings: ['uranium_slug_turret'] },
    position: { x: 14, y: 5 }
  },
  rocketswarm_launcher: {
    id: 'rocketswarm_launcher',
    name: 'Rocketswarm launcher',
    description: 'Volley rocket platform.',
    category: 'military',
    cost: 5000,
    time: 160,
    prerequisites: ['autocannon_turret'],
    unlocks: { buildings: ['rocketswarm_launcher'] },
    position: { x: 14, y: 6 }
  },
  cryptosleep_casket: {
    id: 'cryptosleep_casket',
    name: 'Cryptosleep casket',
    description: 'Suspended animation beds.',
    category: 'advanced',
    cost: 6000,
    time: 180,
    prerequisites: ['vitals_monitor'],
    unlocks: { buildings: ['cryptosleep_casket'] },
    position: { x: 14, y: 7 }
  },
  fabrication: {
    id: 'fabrication',
    name: 'Fabrication',
    description: 'Fabricate advanced components and items.',
    category: 'advanced',
    cost: 4000,
    time: 140,
    prerequisites: ['multi_analyzer'],
    unlocks: { mechanics: ['advanced_fabrication'] },
    position: { x: 15, y: 4 }
  },

  // ====================
  // COLUMN 16–19 — Bionics/Armor & Pulse Tech
  // ====================
  bionics: {
    id: 'bionics',
    name: 'Bionics',
    description: 'Advanced prosthetics and cybernetics.',
    category: 'medicine',
    cost: 6000,
    time: 180,
    prerequisites: ['fabrication'],
    unlocks: { items: ['BionicEye', 'BionicArm', 'BionicLeg', 'BionicEar'] },
    position: { x: 16, y: 2 }
  },
  marine_armor: {
    id: 'marine_armor',
    name: 'Marine armor',
    description: 'Powered armor suits.',
    category: 'military',
    cost: 6000,
    time: 180,
    prerequisites: ['fabrication'],
    unlocks: { items: ['MarineArmor', 'MarineHelmet'] },
    position: { x: 17, y: 2 }
  },
  recon_armor: {
    id: 'recon_armor',
    name: 'Recon armor',
    description: 'Lightweight powered recon suits.',
    category: 'military',
    cost: 6000,
    time: 180,
    prerequisites: ['fabrication'],
    unlocks: { items: ['ReconArmor', 'ReconHelmet'] },
    position: { x: 18, y: 2 }
  },
  method_bed: {
    id: 'method_bed',
    name: 'Biosculpter pods',
    description: 'Long-form biological reshaping.',
    category: 'medicine',
    cost: 12000,
    time: 240,
    prerequisites: ['bionics'],
    unlocks: { buildings: ['biosculpter_pod'] },
    position: { x: 17, y: 3 }
  },
  charged_shot: {
    id: 'charged_shot',
    name: 'Charged shot',
    description: 'Charge-powered small arms.',
    category: 'military',
    cost: 6000,
    time: 180,
    prerequisites: ['fabrication'],
    unlocks: { items: ['ChargeRifle', 'ChargeLance'] },
    position: { x: 17, y: 4 }
  },
  pulse_charged_munitions: {
    id: 'pulse_charged_munitions',
    name: 'Pulse-charged munitions',
    description: 'Advanced pulse weaponry.',
    category: 'military',
    cost: 8000,
    time: 200,
    prerequisites: ['charged_shot'],
    unlocks: { items: ['PulseLaser'] },
    position: { x: 18, y: 5 }
  },
  nano_structuring: {
    id: 'nano_structuring',
    name: 'Nano structuring',
    description: 'Nanotech surfaces and processes.',
    category: 'advanced',
    cost: 8000,
    time: 200,
    prerequisites: ['fabrication'],
    unlocks: { mechanics: ['nanotech'] },
    position: { x: 18, y: 6 }
  },
  jump_packs: {
    id: 'jump_packs',
    name: 'Jump packs',
    description: 'Personal mobility backpacks.',
    category: 'military',
    cost: 5000,
    time: 160,
    prerequisites: ['fabrication'],
    unlocks: { items: ['JumpPack'] },
    position: { x: 19, y: 6 }
  },
  artificial_metabolism: {
    id: 'artificial_metabolism',
    name: 'Artificial metabolism',
    description: 'Synthetic organs.',
    category: 'medicine',
    cost: 12000,
    time: 240,
    prerequisites: ['bionics'],
    unlocks: { items: ['BionicStomach', 'BionicHeart', 'BionicLiver'] },
    position: { x: 19, y: 7 }
  },

  // ====================
  // COLUMN 20–25 — Starflight & Ship
  // ====================
  starflight_basics: {
    id: 'starflight_basics',
    name: 'Starflight basics',
    description: 'Unlock starship project.',
    category: 'advanced',
    cost: 6000,
    time: 180,
    prerequisites: ['fabrication'],
    unlocks: { mechanics: ['starship_unlocked'] },
    position: { x: 20, y: 4 }
  },
  machine_persuasion: {
    id: 'machine_persuasion',
    name: 'Machine persuasion',
    description: 'Persona core and high-level AI theory.',
    category: 'advanced',
    cost: 5000,
    time: 160,
    prerequisites: ['starflight_basics'],
    unlocks: { mechanics: ['ai_core'] },
    position: { x: 21, y: 3 }
  },
  reaper_armor: {
    id: 'reaper_armor',
    name: 'Marine armor (variant)',
    description: 'Heavier powered armor line.',
    category: 'military',
    cost: 8000,
    time: 200,
    prerequisites: ['marine_armor'],
    unlocks: { items: ['ReaperArmor', 'ReaperHelmet'] },
    position: { x: 21, y: 2 }
  },
  cataphract_armor: {
    id: 'cataphract_armor',
    name: 'Cataphract armor',
    description: 'Top-tier powered armor.',
    category: 'military',
    cost: 8000,
    time: 200,
    prerequisites: ['marine_armor'],
    unlocks: { items: ['CataphractArmor', 'CataphractHelmet'] },
    position: { x: 22, y: 1 }
  },
  phoenix_armor: {
    id: 'phoenix_armor',
    name: 'Phoenix armor',
    description: 'Alternate heavy suit line.',
    category: 'military',
    cost: 8000,
    time: 200,
    prerequisites: ['marine_armor'],
    unlocks: { items: ['PhoenixArmor', 'PhoenixHelmet'] },
    position: { x: 22, y: 2 }
  },
  advanced_fabrication: {
    id: 'advanced_fabrication',
    name: 'Advanced fabrication',
    description: 'Mastery of fabrication systems.',
    category: 'advanced',
    cost: 10000,
    time: 220,
    prerequisites: ['fabrication'],
    unlocks: { mechanics: ['master_fabrication'] },
    position: { x: 22, y: 4 }
  },
  starflight_basics_ship: {
    id: 'starflight_basics_ship',
    name: 'Starflight basics',
    description: 'Ship hull and structural beams.',
    category: 'advanced',
    cost: 12000,
    time: 240,
    prerequisites: ['starflight_basics'],
    unlocks: { buildings: ['ship_structural_beam'] },
    position: { x: 22, y: 5 }
  },
  vacuum_cryostasis: {
    id: 'vacuum_cryostasis',
    name: 'Vacuum cryostasis',
    description: 'Ship cryptosleep installations.',
    category: 'advanced',
    cost: 12000,
    time: 240,
    prerequisites: ['cryptosleep_casket', 'starflight_basics'],
    unlocks: { buildings: ['ship_cryptosleep_casket'] },
    position: { x: 23, y: 6 }
  },
  johnson_tanaka_drive: {
    id: 'johnson_tanaka_drive',
    name: 'Johnson-Tanaka drive',
    description: 'Main starship reactor.',
    category: 'advanced',
    cost: 15000,
    time: 300,
    prerequisites: ['starflight_basics_ship'],
    unlocks: { buildings: ['ship_reactor'] },
    position: { x: 23, y: 7 }
  },
  starflight_sensors: {
    id: 'starflight_sensors',
    name: 'Starflight sensors',
    description: 'Ship sensor clusters.',
    category: 'advanced',
    cost: 15000,
    time: 300,
    prerequisites: ['starflight_basics_ship'],
    unlocks: { buildings: ['ship_sensor_cluster'] },
    position: { x: 24, y: 6 }
  },
  starflight_reactor: {
    id: 'starflight_reactor',
    name: 'Starflight reactor',
    description: 'Advanced reactor systems.',
    category: 'advanced',
    cost: 18000,
    time: 350,
    prerequisites: ['johnson_tanaka_drive'],
    unlocks: { buildings: ['ship_reactor_advanced'] },
    position: { x: 24, y: 7 }
  },
  starflight_engine: {
    id: 'starflight_engine',
    name: 'Starflight engine',
    description: 'Interstellar ship engines.',
    category: 'advanced',
    cost: 18000,
    time: 350,
    prerequisites: ['johnson_tanaka_drive'],
    unlocks: { buildings: ['ship_engine'] },
    position: { x: 25, y: 7 }
  },

  // ====================
  // EXTRA mid-tree nodes visible in the image (optional but placed)
  // ====================
  firefoam: {
    id: 'firefoam',
    name: 'Firefoam',
    description: 'Firefoam poppers and belts.',
    category: 'industry',
    cost: 800,
    time: 55,
    prerequisites: ['microelectronics'],
    unlocks: { buildings: ['firefoam_popper'], items: ['FirefoamBelt'] },
    position: { x: 10, y: 2 }
  },
  flak_armor: {
    id: 'flak_armor',
    name: 'Flak armor',
    description: 'Vests and simple ballistic protection.',
    category: 'military',
    cost: 1200,
    time: 70,
    prerequisites: ['machining'],
    unlocks: { items: ['FlakVest', 'FlakPants', 'FlakJacket'] },
    position: { x: 10, y: 3 }
  }
};

/**
 * Get all research nodes in a category
 */
export function getResearchByCategory(category: ResearchCategory): ResearchNode[] {
  return Object.values(RESEARCH_TREE).filter((node) => node.category === category);
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
  return node.prerequisites.every((prereqId) => completedResearch.has(prereqId));
}

/**
 * Get all currently available research (prerequisites met but not yet completed)
 */
export function getAvailableResearch(completedResearch: Set<string>): ResearchNode[] {
  return Object.values(RESEARCH_TREE).filter((node) => {
    if (completedResearch.has(node.id)) return false;
    return isResearchAvailable(node.id, completedResearch);
  });
}

/**
 * Category display info
 */
export const CATEGORY_INFO: Record<
  ResearchCategory,
  { name: string; color: string; description: string }
> = {
  basic: { name: 'Basic', color: '#94a3b8', description: 'Fundamental colony technologies' },
  military: { name: 'Military', color: '#ef4444', description: 'Weapons and defense systems' },
  agriculture: { name: 'Agriculture', color: '#22c55e', description: 'Farming and food production' },
  industry: { name: 'Industry', color: '#f59e0b', description: 'Production and infrastructure' },
  medicine: { name: 'Medicine', color: '#ec4899', description: 'Healthcare and augmentation' },
  advanced: { name: 'Advanced', color: '#8b5cf6', description: 'Cutting-edge technology' }
};
