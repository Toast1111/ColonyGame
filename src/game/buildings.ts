import { T, COLORS } from "./constants";
import type { Building, BuildingDef, Resources } from "./types";

export const BUILD_TYPES: Record<string, BuildingDef> = {
  house: { category:'Housing', name: 'House', key: '1', cost: { wood: 20, stone: 5 }, hp: 220, size: { w: 2, h: 2 }, build: 100, color: COLORS.house, popCap: 2 },
  farm:  { category:'Production', name: 'Farm', key: '2', cost: { wood: 15 }, hp: 120, size: { w: 2, h: 2 }, build: 80, color: COLORS.farm, growTime: 1 },
  turret:{ category:'Defense', name: 'Turret', key: '3', cost: { wood: 10, stone: 20 }, hp: 160, size: { w: 1, h: 1 }, build: 120, color: COLORS.turret, range: 190, fireRate: 0.6, dps: 30 },
  wall:  { category:'Defense', name: 'Wall', key: '4', cost: { wood: 5, stone: 5 }, hp: 150, size: { w: 1, h: 1 }, build: 40, color: COLORS.wall },
  stock: { category:'Utility', name: 'Stockpile', key: '5', cost: { wood: 10 }, hp: 140, size: { w: 2, h: 2 }, build: 60, color: COLORS.stock },
  tent:  { category:'Utility', name: 'Recruit Tent', key: '6', cost: { wood: 30, food: 10 }, hp: 140, size: { w: 2, h: 2 }, build: 80, color: COLORS.tent },
  // New buildings
  warehouse: { category:'Utility', name: 'Warehouse', key:'7', cost: { wood: 40, stone: 20 }, hp: 260, size: { w: 3, h: 2 }, build: 160, color: COLORS.stock },
  well:      { category:'Production', name: 'Well', key:'8', cost: { stone: 25 }, hp: 160, size: { w: 1, h: 1 }, build: 80, color: COLORS.farm, prodKind:'food', prodRateSec: 0.2 },
  infirmary: { category:'Utility', name: 'Infirmary', key:'9', cost: { wood: 30, stone: 20, food: 10 }, hp: 200, size: { w: 2, h: 2 }, build: 140, color: COLORS.bld, healRate: 3, healRange: 140 },
  path:     { category:'Utility', name: 'Path', key:'0', cost: { wood: 1 }, hp: 1, size: { w: 1, h: 1 }, build: 5, color: '#475569' },
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

export function makeBuilding(kind: keyof typeof BUILD_TYPES, wx: number, wy: number): Building {
  const def = BUILD_TYPES[kind];
  const gx = Math.floor(wx / T) * T;
  const gy = Math.floor(wy / T) * T;
  return {
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
  } as Building;
}

export function costText(cost: Partial<Resources>): string {
  const parts: string[] = [];
  if (cost.wood) parts.push(`${cost.wood}w`);
  if (cost.stone) parts.push(`${cost.stone}s`);
  if (cost.food) parts.push(`${cost.food}f`);
  return parts.join(' ');
}

export function groupByCategory(defs: Record<string, BuildingDef>) {
  const out: Record<string, Array<[string, BuildingDef]>> = {};
  for (const k of Object.keys(defs)) {
    const d = defs[k]; const cat = d.category || 'Other';
    (out[cat] ||= []).push([k, d]);
  }
  for (const c of Object.keys(out)) out[c].sort((a,b)=>a[1].name.localeCompare(b[1].name));
  return out;
}
