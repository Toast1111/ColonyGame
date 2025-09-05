import type { Vec2 } from "../core/utils";

export type Camera = { x: number; y: number; zoom: number };

export type Resources = { wood: number; stone: number; food: number };

export type Circle = { x: number; y: number; r: number; hp: number; type: "tree" | "rock" };

export type BuildingKind = "hq" | "house" | "farm" | "turret" | "wall" | "stock" | "tent" | "warehouse" | "well" | "infirmary" | "path";

export type BuildingDef = {
  name: string;
  description?: string; // Building description for UI
  key?: string;
  cost?: Partial<Resources>;
  hp: number;
  size: { w: number; h: number };
  build: number;
  color: string;
  category?: 'Housing' | 'Production' | 'Defense' | 'Utility';
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

export type ColonistState = 'seekTask' | 'idle' | 'move' | 'build' | 'harvest' | 'chop' | 'mine' | 'flee' | 'sleep' | 'resting' | 'eat' | 'heal' | 'goToSleep';

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
  colonist: string; enemy: string; tree: string; rock: string; ghost: string; wall: string; bld: string; turret: string; farm: string; house: string; stock: string; tent: string;
};

export type World = { w: number; h: number };
