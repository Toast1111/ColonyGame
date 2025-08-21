import type { Colors, World } from "./types";

export const T = 32; // tile size
export const WORLD: World = { w: 240 * T, h: 240 * T };
export const HQ_POS = { x: WORLD.w / 2, y: WORLD.h / 2 };

export const COLORS: Colors = {
  sky: '#0a0e14', ground: '#0e161f', grass: '#112233', water: '#0b1220',
  wood: '#b08968', stone: '#a1a1aa', food: '#9ae6b4', metal: '#cbd5e1',
  colonist: '#c7f9cc', enemy: '#ff9aa2', tree: '#6fbf73', rock: '#9aa5b1',
  ghost: '#6ee7ff', wall: '#9aa5b1', bld: '#93c5fd', turret: '#93c5fd', farm: '#8bd3dd', house: '#e2b714', stock: '#c084fc', tent: '#f59e0b'
};

export const NIGHT_SPAN = { start: 0.72, end: 0.07 };
