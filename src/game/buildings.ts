import { T, COLORS } from "./constants";
import type { Building, BuildingDef, Resources } from "./types";
import { initializeBuildingInventory, shouldHaveInventory, getDefaultInventoryCapacity } from "./systems/buildingInventory";
import { ZONE_TYPES } from "./zones";

export const BUILD_TYPES: Record<string, BuildingDef> = {
  house: { 
    category:'Housing', 
    name: 'House', 
    description: 'Provides shelter for 2 colonists. Colonists can rest inside to recover fatigue.',
    key: '1', 
    cost: { wood: 20, stone: 5 }, 
    hp: 220, 
    size: { w: 2, h: 2 }, 
    build: 100, 
    color: COLORS.house, 
    popCap: 2 
  },
  farm: { 
    category:'Production', 
    name: 'Farm', 
    description: 'Grows crops that colonists can harvest for food. Takes 2 days to grow.',
    key: '2', 
    cost: { wood: 15 }, 
    hp: 120, 
    size: { w: 2, h: 2 }, 
    build: 80, 
    color: COLORS.farm, 
    growTime: 1 // 1 unit = 2 days with 0.5 growth per day
  },
  turret: { 
    category:'Defense', 
    name: 'Turret', 
    description: 'Automated defense structure. Shoots at enemies within range.',
    key: '3', 
    cost: { wood: 5, stone: 20 }, 
    hp: 160, 
    size: { w: 1, h: 1 }, 
    build: 120, 
    color: COLORS.turret, 
    range: 190, 
    fireRate: 0.6, 
    dps: 30 
  },
  wall: { 
    category:'Defense', 
    name: 'Wall', 
    description: 'Blocks enemy movement. Essential for creating defensive perimeters.',
    key: '4', 
    cost: { wood: 0, stone: 1 }, 
    hp: 150, 
    size: { w: 1, h: 1 }, 
    build: 40, 
    color: COLORS.wall 
  },
  // NOTE: 'stock' (Stockpile) removed - now zone-only, not a building
  // NOTE: 'warehouse' removed - now zone-only, not a building
  tent: { 
    category:'Utility', 
    name: 'Recruit Tent', 
    description: 'Attracts new colonists every 60 seconds. Requires 15 food per recruit.',
    key: '6', 
    cost: { wood: 30, food: 10 }, 
    hp: 140, 
    size: { w: 2, h: 2 }, 
    build: 80, 
    color: COLORS.tent 
  },
  well: { 
    category:'Production', 
    name: 'Well', 
    description: 'Provides clean water. Colonists can collect water here for food production.',
    key:'8', 
    cost: { stone: 25 }, 
    hp: 160, 
    size: { w: 1, h: 1 }, 
    build: 80, 
    color: COLORS.farm
  },
  infirmary: { 
    category:'Utility', 
    name: 'Infirmary', 
    description: 'Heals injured colonists within range. Essential for colony survival.',
    key:'9', 
    cost: { wood: 30, stone: 20, food: 10 }, 
    hp: 200, 
    size: { w: 2, h: 2 }, 
    build: 140, 
  color: COLORS.bld, 
    healRate: 3, 
  healRange: 140,
  popCap: 2 // allow up to 2 patients inside for direct healing
  },
  // ===== FLOORS (Terrain System) =====
  // These are built using the terrain system, not as buildings
  floor_path: {
    category: 'Flooring',
    name: 'Dirt Path',
    description: 'Basic path that speeds up movement. Costs nothing but provides modest speed boost.',
    key: '0',
    cost: { wood: 0 },
    hp: 1,
    size: { w: 1, h: 1 },
    build: 3,
    color: '#9ca3af',
    isFloor: true,
    floorType: 'BASIC_PATH' as const
  },
  floor_stone_road: {
    category: 'Flooring',
    name: 'Stone Road',
    description: 'Premium paved road. Fast movement speed, very durable. Great for high-traffic areas.',
    key: '9',
    cost: { stone: 2 },
    hp: 1,
    size: { w: 1, h: 1 },
    build: 8,
    color: '#6b7280',
    isFloor: true,
    floorType: 'STONE_ROAD' as const
  },
  floor_wooden: {
    category: 'Flooring',
    name: 'Wooden Floor',
    description: 'Interior flooring. Comfortable and attractive, provides minor speed bonus.',
    key: '8',
    cost: { wood: 3 },
    hp: 1,
    size: { w: 1, h: 1 },
    build: 5,
    color: '#92400e',
    isFloor: true,
    floorType: 'WOODEN_FLOOR' as const
  },
  bed: {
    category: 'Furniture',
    name: 'Bed',
    description: 'Gives a colonist a comfortable spot to sleep. Restores fatigue faster than the ground.',
    key: 'B',
    cost: { wood: 12 },
    hp: 80,
    size: { w: 1, h: 2 },
    build: 40,
    color: COLORS.bed,
    popCap: 1
  },
  door: {
    category: 'Defense',
    name: 'Door',
    description: 'Allows colonists to pass while blocking enemies. Must be opened before passing through.',
    key: 'D',
    cost: { wood: 5 },
    hp: 100,
    size: { w: 1, h: 1 },
    build: 30,
    color: '#8b4513'
  },
  stove: {
    category: 'Furniture',
    name: 'Stove',
    description: 'Used for cooking wheat into bread. Colonists bring wheat here and cook it over time.',
    key: 'S',
    cost: { wood: 20, stone: 10 },
    hp: 150,
    size: { w: 2, h: 1 },
    build: 60,
    color: '#cd5c5c'
  },
  pantry: {
    category: 'Furniture',
    name: 'Pantry',
    description: 'Stores prepared food (bread). Colonists can retrieve meals when hungry.',
    key: 'P',
    cost: { wood: 10, stone: 10 },
    hp: 120,
    size: { w: 2, h: 2 },
    build: 50,
    color: '#daa520'
  },
};

export function hasCost(res: Resources, cost?: Partial<Resources>) {
  if (!cost) return true;
  for (const k of Object.keys(cost) as (keyof Resources)[]) {
    if ((res[k] || 0) < (cost[k] || 0)) return false;
  }
  return true;
}
export function payCost(res: Resources, cost?: Partial<Resources>) {
  if (!cost) return;
  for (const k of Object.keys(cost) as (keyof Resources)[]) {
    res[k] -= cost[k] || 0;
  }
}

export function refundCost(res: Resources, cost?: Partial<Resources>, percentage: number = 1.0) {
  if (!cost) return;
  // Refund resources with optional percentage (e.g., 0.75 for 75% refund)
  for (const k of Object.keys(cost) as (keyof Resources)[]) {
    res[k] += Math.floor((cost[k] || 0) * percentage);
  }
}

export function makeBuilding(kind: keyof typeof BUILD_TYPES, wx: number, wy: number): Building {
  const def = BUILD_TYPES[kind];
  const gx = Math.floor(wx / T) * T;
  const gy = Math.floor(wy / T) * T;
  const building: Building = {
    kind,
    ...def,
    x: gx, y: gy,
    w: def.size.w * T,
    h: def.size.h * T,
    hp: def.hp,
    buildLeft: def.build,
    done: false,
    growth: 0,
    ready: false,
    cooldown: 0,
    ...(kind === 'bed' ? { isMedicalBed: false } : {}),
  } as Building;
  
  // Initialize inventory for storage buildings
  if (shouldHaveInventory(kind)) {
    const capacity = getDefaultInventoryCapacity(kind);
    initializeBuildingInventory(building, capacity);
  }
  
  return building;
}

export function costText(cost: Partial<Resources>): string {
  const parts: string[] = [];
  if (cost.wood) parts.push(`${cost.wood}w`);
  if (cost.stone) parts.push(`${cost.stone}s`);
  if (cost.food) parts.push(`${cost.food}f`);
  return parts.join(' ');
}

/**
 * Group buildings and zones by category for the build menu
 * Zones are drag-to-create areas (like stockpiles) that aren't physical buildings
 */
export function groupByCategory(defs: Record<string, BuildingDef>) {
  const out: Record<string, Array<[string, BuildingDef]>> = {};
  
  // Add buildings
  for (const k of Object.keys(defs)) {
    const d = defs[k]; const cat = d.category || 'Other';
    (out[cat] ||= []).push([k, d]);
  }
  
  // Add zones (these are drag-to-create areas, not physical buildings)
  for (const k of Object.keys(ZONE_TYPES)) {
    const z = ZONE_TYPES[k];
    const cat = z.category || 'Other';
    // Zones use the same structure as BuildingDef for UI purposes
    (out[cat] ||= []).push([k, z as any]);
  }
  
  // Sort each category alphabetically
  for (const c of Object.keys(out)) out[c].sort((a,b)=>a[1].name.localeCompare(b[1].name));
  return out;
}
