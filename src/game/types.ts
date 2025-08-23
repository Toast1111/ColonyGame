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
};

export type ColonistState = 'seekTask' | 'idle' | 'move' | 'build' | 'harvest' | 'chop' | 'mine' | 'flee' | 'sleep' | 'resting' | 'eat' | 'heal' | 'goToSleep';

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
  
  // Movement direction for sprite facing
  direction?: number; // angle in radians of movement direction
  
  // New personality system
  profile?: import('./colonistGenerator').ColonistProfile;
};

export type Enemy = { x: number; y: number; r: number; hp: number; speed: number; dmg: number; target: any; color: string };

export type Bullet = { x: number; y: number; tx: number; ty: number; t: number };

export type Message = { text: string; t: number; kind: "info" | "warn" | "good" | "bad" };

export type Colors = {
  sky: string; ground: string; grass: string; water: string; wood: string; stone: string; food: string; metal: string;
  colonist: string; enemy: string; tree: string; rock: string; ghost: string; wall: string; bld: string; turret: string; farm: string; house: string; stock: string; tent: string;
};

export type World = { w: number; h: number };
