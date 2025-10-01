import type { Vec2 } from "../core/utils";

export type Camera = { x: number; y: number; zoom: number };

export type Resources = { wood: number; stone: number; food: number };

export type Circle = { x: number; y: number; r: number; hp: number; type: "tree" | "rock" };

export type BuildingKind = "hq" | "house" | "farm" | "turret" | "wall" | "stock" | "tent" | "warehouse" | "well" | "infirmary" | "path" | "bed";

export type BuildingDef = {
  name: string;
  description?: string; // Building description for UI
  key?: string;
  cost?: Partial<Resources>;
  hp: number;
  size: { w: number; h: number };
  build: number;
  color: string;
  category?: 'Housing' | 'Production' | 'Defense' | 'Utility' | 'Furniture';
  // optional mechanics
  popCap?: number;
  growTime?: number;
  range?: number;
  fireRate?: number;
  dps?: number;
  // utility
  healRate?: number; // hp per second
  healRange?: number; // pixels
  storageBonus?: number; // additional storage capacity
  // production
  prodKind?: keyof Resources;
  prodRateSec?: number; // amount per second
  // movement
  speedBonus?: number; // movement speed multiplier on this tile
};

export type Building = BuildingDef & {
  kind: BuildingKind;
  x: number; y: number; w: number; h: number;
  buildLeft: number; done: boolean; hp: number;
  growth?: number; ready?: boolean; cooldown?: number;
  rot?: 0 | 90 | 180 | 270; // orientation in degrees
};

export type ColonistState = 'seekTask' | 'idle' | 'move' | 'build' | 'harvest' | 'chop' | 'mine' | 'flee' | 'sleep' | 'resting' | 'eat' | 'heal' | 'goToSleep' | 'medical' | 'seekMedical' | 'medicalMultiple' | 'downed';

// Inventory and equipment types
export interface InventoryItem {
  name: string;
  quantity: number;
  description?: string;
  quality?: 'poor' | 'normal' | 'good' | 'excellent' | 'masterwork' | 'legendary' | 'awful';
  durability?: number; // For equipment items
  maxDurability?: number;
  stackable?: boolean;
  category?: string;
  value?: number;
  weight?: number;
  defName?: string; // Reference to item definition
}

export interface Equipment {
  helmet?: InventoryItem;
  armor?: InventoryItem;
  pants?: InventoryItem;
  boots?: InventoryItem;
  weapon?: InventoryItem;
  tool?: InventoryItem;
  accessory?: InventoryItem;
}

export interface ColonistInventory {
  items: InventoryItem[];
  equipment: Equipment;
  carryCapacity: number;
  currentWeight: number;
}

// Health and injury system types
export type BodyPartType = 'head' | 'torso' | 'left_arm' | 'right_arm' | 'left_leg' | 'right_leg';

export interface BodyPart {
  type: BodyPartType;
  label: string;
  maxHp: number;
  currentHp: number;
  coverage: number; // 0-1, chance of being hit
  vital: boolean; // death if destroyed
  efficiency: number; // 0-1, how well it functions
}

export type InjuryType = 'cut' | 'bruise' | 'burn' | 'bite' | 'gunshot' | 'fracture' | 'infection';

export interface Injury {
  id: string;
  type: InjuryType;
  bodyPart: BodyPartType;
  severity: number; // 0-1, higher = worse
  pain: number; // 0-1, pain caused
  bleeding: number; // 0-1, blood loss rate
  healRate: number; // HP recovered per day
  permanent: boolean; // leaves scar/disability
  timeCreated: number; // game time when injury occurred
  description: string;
  treatedBy?: string; // colonist who treated it
  infected: boolean;
  infectionChance: number; // 0-1, chance to become infected
  // Enhanced system fields
  bandaged?: boolean; // bandaging reduces bleeding multiplier
  infectionProgress?: number; // 0-1 progression toward severe infection
}

export interface ColonistHealth {
  bodyParts: BodyPart[];
  injuries: Injury[];
  totalPain: number; // calculated from all injuries
  bloodLevel: number; // 0-1, blood loss
  consciousness: number; // 0-1, affects all actions
  mobility: number; // 0-1, movement speed multiplier
  manipulation: number; // 0-1, work speed multiplier
  immunity: number; // 0-1, resistance to infections
  // Internal timers for bleeding/infection cadence
  lastBleedCalcTime?: number;
  lastInfectionTick?: number;
}

// Skill System
export type SkillName = 'Medicine' | 'Construction' | 'Shooting' | 'Melee' | 'Plants' | 'Mining' | 'Crafting' | 'Social' | 'Cooking' | 'Research';

export interface Skill {
  name: SkillName;
  level: number;      // 0-20
  xp: number;         // current accumulated XP toward next level
  passion?: 'none' | 'interested' | 'burning'; // affects xp gain rate
  lastUsed?: number;  // game time last xp granted
  // recent xp gains for UI tooltips (pairs of game time and amount)
  xpDeltas?: { t: number; amount: number }[];
}

export interface SkillSet {
  byName: Record<SkillName, Skill>;
  xpMultiplier?: number; // global modifiers (traits, mood)
}

export type Colonist = { 
  x: number; y: number; r: number; hp: number; speed: number; 
  task: string | null; target: any; carrying: any; hunger: number; 
  alive: boolean; color: string; t: number; 
  fatigue?: number; fatigueSlow?: number; 
  state?: ColonistState; stateSince?: number; 
  path?: import('../core/utils').Vec2[]; pathIndex?: number; repath?: number; pathGoal?: import('../core/utils').Vec2; 
  lastHp?: number; hurt?: number; 
  inside?: import('./types').Building | null; hideTimer?: number; 
  safeTarget?: import('./types').Building | null; safeTimer?: number; 
  reservedBuildFor?: import('./types').Building | null; 
  stuckTimer?: number; lastDistToNode?: number; jitterScore?: number; jitterWindow?: number; lastDistSign?: number;
  // FSM robustness helpers
  prevState?: ColonistState; // last state before current
  softLockUntil?: number;    // game-time (c.t) until which low-priority transitions are blocked
  lastStateChangeReason?: string; // debug info
  
  // Movement direction for sprite facing
  direction?: number; // angle in radians of movement direction
  
  // New personality system
  profile?: import('./colonist_systems/colonistGenerator').ColonistProfile;
  
  // Enhanced inventory system
  inventory?: ColonistInventory;
  
  // Health and injury system
  health?: ColonistHealth;
  // Skill system
  skills?: SkillSet;
  
  // Medical assignment system
  assignedMedicalPatientId?: string; // If this colonist (doctor) is prioritizing a specific patient
  medicalPriorityUntil?: number;     // Game time until forced priority expires (safety auto-clear)
  // Furniture interactions
  restingOn?: Building | null;       // Furniture (like a bed) the colonist is currently using
};

export type Enemy = { x: number; y: number; r: number; hp: number; speed: number; dmg: number; target: any; color: string };

export type Bullet = {
  x: number; y: number;
  tx: number; ty: number; // intended aim point
  t: number;              // legacy timer
  // Ballistics (optional)
  vx?: number; vy?: number; // velocity
  speed?: number;           // pixels/sec
  dmg?: number;             // damage on hit
  life?: number;            // current lifespan
  maxLife?: number;         // max lifespan before despawn
  owner?: 'turret' | 'colonist' | 'enemy';
  shooterId?: string;       // colonist id for XP attribution (if owner is colonist)
  particles?: Particle[];
};

export type Particle = {
  x: number; y: number; vx: number; vy: number; 
  life: number; maxLife: number; 
  size: number; color: string; alpha: number;
};

export type Message = { text: string; t: number; kind: "info" | "warn" | "good" | "bad" };

export type Colors = {
  sky: string; ground: string; grass: string; water: string; wood: string; stone: string; food: string; metal: string;
  colonist: string; enemy: string; tree: string; rock: string; ghost: string; wall: string; bld: string; turret: string; farm: string; house: string; stock: string; tent: string; bed: string;
};

export type World = { w: number; h: number };
