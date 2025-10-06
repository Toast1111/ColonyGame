/**
 * Terrain System - Base layer for tiles separate from buildings/structures
 * 
 * This system handles the ground layer (biomes, terrain types) that exists
 * independently of buildings. Buildings are placed ON TOP of terrain, not
 * replacing it.
 */

import { T } from "./constants";

// Terrain type definitions with movement costs
export enum TerrainType {
  // Basic terrain
  GRASS = 'grass',
  DIRT = 'dirt',
  STONE = 'stone',
  SAND = 'sand',
  
  // Slow terrain
  MUD = 'mud',
  SOFT_DIRT = 'soft_dirt',
  SHALLOW_WATER = 'shallow_water',
  
  // Impassable terrain
  DEEP_WATER = 'deep_water',
  ROCK = 'rock',
  
  // Future biomes
  SNOW = 'snow',
  ICE = 'ice',
  MARSH = 'marsh',
  GRAVEL = 'gravel',
}

// Floor types (built structures that go on terrain)
export enum FloorType {
  NONE = 'none',
  BASIC_PATH = 'basic_path',
  STONE_ROAD = 'stone_road',
  WOODEN_FLOOR = 'wooden_floor',
  CONCRETE = 'concrete',
  METAL_FLOOR = 'metal_floor',
  CARPET = 'carpet',
}

// Movement cost for each terrain type
// Lower = faster movement (0.5 = 2x speed, 2.0 = half speed)
export const TERRAIN_COSTS: Record<TerrainType, number> = {
  // Normal terrain (baseline)
  [TerrainType.GRASS]: 1.0,
  [TerrainType.DIRT]: 1.0,
  [TerrainType.STONE]: 1.1,
  [TerrainType.SAND]: 1.2,
  
  // Slow terrain (harder to walk through)
  [TerrainType.MUD]: 2.5,           // 2.5x slower
  [TerrainType.SOFT_DIRT]: 1.4,
  [TerrainType.SHALLOW_WATER]: 1.8,
  
  // Impassable (extremely high cost = pathfinding avoids)
  [TerrainType.DEEP_WATER]: 999.0,  // Effectively impassable
  [TerrainType.ROCK]: 999.0,
  
  // Future biomes
  [TerrainType.SNOW]: 1.3,
  [TerrainType.ICE]: 0.9,            // Faster but slippery
  [TerrainType.MARSH]: 2.0,
  [TerrainType.GRAVEL]: 1.05,
};

// Floor costs (built structures)
// These are MULTIPLIED with terrain cost, so they modify the base terrain
export const FLOOR_COSTS: Record<FloorType, number> = {
  [FloorType.NONE]: 1.0,             // No floor = use terrain cost as-is
  [FloorType.BASIC_PATH]: 0.6,       // 40% speed bonus
  [FloorType.STONE_ROAD]: 0.5,       // 50% speed bonus (best)
  [FloorType.WOODEN_FLOOR]: 0.7,
  [FloorType.CONCRETE]: 0.55,
  [FloorType.METAL_FLOOR]: 0.65,
  [FloorType.CARPET]: 0.85,          // Decorative, minor benefit
};

// Visual properties for terrain rendering
export interface TerrainVisuals {
  color: string;
  secondaryColor?: string;  // For patterns/variation
  pattern?: 'dots' | 'noise' | 'stripes' | 'solid';
  renderLayer: number;  // Lower = rendered first
}

export const TERRAIN_VISUALS: Record<TerrainType, TerrainVisuals> = {
  [TerrainType.GRASS]: { color: '#4a7c59', secondaryColor: '#5a8c69', pattern: 'noise', renderLayer: 0 },
  [TerrainType.DIRT]: { color: '#8b6f47', pattern: 'solid', renderLayer: 0 },
  [TerrainType.STONE]: { color: '#6b7280', pattern: 'solid', renderLayer: 0 },
  [TerrainType.SAND]: { color: '#d4a574', secondaryColor: '#c99563', pattern: 'noise', renderLayer: 0 },
  [TerrainType.MUD]: { color: '#5d4e37', secondaryColor: '#4d3e27', pattern: 'noise', renderLayer: 0 },
  [TerrainType.SOFT_DIRT]: { color: '#a0826d', pattern: 'solid', renderLayer: 0 },
  [TerrainType.SHALLOW_WATER]: { color: '#4a90a4', secondaryColor: '#5aa0b4', pattern: 'noise', renderLayer: 0 },
  [TerrainType.DEEP_WATER]: { color: '#1e3a5f', secondaryColor: '#2e4a6f', pattern: 'noise', renderLayer: 0 },
  [TerrainType.ROCK]: { color: '#4b5563', pattern: 'solid', renderLayer: 0 },
  [TerrainType.SNOW]: { color: '#f0f4f8', secondaryColor: '#e0e8f0', pattern: 'noise', renderLayer: 0 },
  [TerrainType.ICE]: { color: '#c7d7e8', secondaryColor: '#d7e7f8', pattern: 'stripes', renderLayer: 0 },
  [TerrainType.MARSH]: { color: '#3d5a4c', secondaryColor: '#4d6a5c', pattern: 'dots', renderLayer: 0 },
  [TerrainType.GRAVEL]: { color: '#8a9ba8', secondaryColor: '#7a8b98', pattern: 'dots', renderLayer: 0 },
};

export const FLOOR_VISUALS: Record<FloorType, TerrainVisuals> = {
  [FloorType.NONE]: { color: 'transparent', renderLayer: 1 },
  [FloorType.BASIC_PATH]: { color: '#9ca3af', pattern: 'solid', renderLayer: 1 },
  [FloorType.STONE_ROAD]: { color: '#6b7280', secondaryColor: '#5b6270', pattern: 'noise', renderLayer: 1 },
  [FloorType.WOODEN_FLOOR]: { color: '#92400e', secondaryColor: '#a2500e', pattern: 'stripes', renderLayer: 1 },
  [FloorType.CONCRETE]: { color: '#9ca3af', pattern: 'solid', renderLayer: 1 },
  [FloorType.METAL_FLOOR]: { color: '#71717a', secondaryColor: '#81818a', pattern: 'stripes', renderLayer: 1 },
  [FloorType.CARPET]: { color: '#991b1b', pattern: 'solid', renderLayer: 1 },
};

/**
 * Terrain Grid - stores base terrain and floor layers separately
 */
export interface TerrainGrid {
  cols: number;
  rows: number;
  
  // Base terrain layer (the ground itself)
  terrain: Uint8Array;  // TerrainType enum values
  
  // Floor layer (built structures on top of terrain)
  floors: Uint8Array;   // FloorType enum values
  
  // Biome regions (for future use)
  biomes?: Uint8Array;  // Biome IDs
}

/**
 * Create terrain grid matching pathfinding grid dimensions
 */
export function makeTerrainGrid(cols: number, rows: number): TerrainGrid {
  const size = cols * rows;
  
  return {
    cols,
    rows,
    terrain: new Uint8Array(size).fill(getTerrainTypeId(TerrainType.GRASS)),
    floors: new Uint8Array(size).fill(getFloorTypeId(FloorType.NONE)),
  };
}

/**
 * Get numeric ID for terrain type (for storage in Uint8Array)
 */
export function getTerrainTypeId(type: TerrainType): number {
  return Object.values(TerrainType).indexOf(type);
}

/**
 * Get terrain type from numeric ID
 */
export function getTerrainTypeFromId(id: number): TerrainType {
  return Object.values(TerrainType)[id] as TerrainType;
}

/**
 * Get numeric ID for floor type
 */
export function getFloorTypeId(type: FloorType): number {
  return Object.values(FloorType).indexOf(type);
}

/**
 * Get floor type from numeric ID
 */
export function getFloorTypeFromId(id: number): FloorType {
  return Object.values(FloorType)[id] as FloorType;
}

/**
 * Calculate final movement cost for a tile
 * This combines terrain cost with floor cost
 * 
 * Example: Mud (2.5x) + Stone Road (0.5x) = 1.25x (still slow but better than no road)
 */
export function calculateMovementCost(terrainGrid: TerrainGrid, gx: number, gy: number): number {
  const idx = gy * terrainGrid.cols + gx;
  
  const terrainType = getTerrainTypeFromId(terrainGrid.terrain[idx]);
  const floorType = getFloorTypeFromId(terrainGrid.floors[idx]);
  
  const baseCost = TERRAIN_COSTS[terrainType] || 1.0;
  const floorModifier = FLOOR_COSTS[floorType] || 1.0;
  
  // Floor multiplies the terrain cost
  // This means roads help even on slow terrain, but don't eliminate the penalty
  return baseCost * floorModifier;
}

/**
 * Check if a tile is passable (not deep water, rock, etc.)
 */
export function isTerrainPassable(terrainGrid: TerrainGrid, gx: number, gy: number): boolean {
  const idx = gy * terrainGrid.cols + gx;
  const terrainType = getTerrainTypeFromId(terrainGrid.terrain[idx]);
  
  // Terrain with cost >= 100 is considered impassable
  return TERRAIN_COSTS[terrainType] < 100;
}

/**
 * Set terrain type for a rectangular area
 */
export function setTerrainRect(
  terrainGrid: TerrainGrid,
  gx: number,
  gy: number,
  gw: number,
  gh: number,
  terrainType: TerrainType
): void {
  const typeId = getTerrainTypeId(terrainType);
  
  for (let y = gy; y < gy + gh; y++) {
    for (let x = gx; x < gx + gw; x++) {
      if (x >= 0 && y >= 0 && x < terrainGrid.cols && y < terrainGrid.rows) {
        const idx = y * terrainGrid.cols + x;
        terrainGrid.terrain[idx] = typeId;
      }
    }
  }
}

/**
 * Set floor type for a rectangular area (e.g., building a road)
 */
export function setFloorRect(
  terrainGrid: TerrainGrid,
  gx: number,
  gy: number,
  gw: number,
  gh: number,
  floorType: FloorType
): void {
  const typeId = getFloorTypeId(floorType);
  
  for (let y = gy; y < gy + gh; y++) {
    for (let x = gx; x < gx + gw; x++) {
      if (x >= 0 && y >= 0 && x < terrainGrid.cols && y < terrainGrid.rows) {
        const idx = y * terrainGrid.cols + x;
        terrainGrid.floors[idx] = typeId;
      }
    }
  }
}

/**
 * Remove floor from a rectangular area (back to base terrain)
 */
export function removeFloorRect(
  terrainGrid: TerrainGrid,
  gx: number,
  gy: number,
  gw: number,
  gh: number
): void {
  setFloorRect(terrainGrid, gx, gy, gw, gh, FloorType.NONE);
}

/**
 * Generate simple biome-based terrain (basic implementation)
 * This is a placeholder for future procedural generation
 */
export function generateTerrainFromBiome(
  terrainGrid: TerrainGrid,
  biomeType: 'temperate' | 'desert' | 'tundra' | 'swamp'
): void {
  const { cols, rows } = terrainGrid;
  
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x;
      
      // Simple noise-based terrain selection
      const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.5 + 0.5;
      
      switch (biomeType) {
        case 'temperate':
          terrainGrid.terrain[idx] = noise > 0.7 
            ? getTerrainTypeId(TerrainType.STONE)
            : getTerrainTypeId(TerrainType.GRASS);
          break;
          
        case 'desert':
          terrainGrid.terrain[idx] = noise > 0.8
            ? getTerrainTypeId(TerrainType.ROCK)
            : getTerrainTypeId(TerrainType.SAND);
          break;
          
        case 'tundra':
          terrainGrid.terrain[idx] = noise > 0.6
            ? getTerrainTypeId(TerrainType.ICE)
            : getTerrainTypeId(TerrainType.SNOW);
          break;
          
        case 'swamp':
          if (noise > 0.7) {
            terrainGrid.terrain[idx] = getTerrainTypeId(TerrainType.SHALLOW_WATER);
          } else if (noise > 0.4) {
            terrainGrid.terrain[idx] = getTerrainTypeId(TerrainType.MUD);
          } else {
            terrainGrid.terrain[idx] = getTerrainTypeId(TerrainType.MARSH);
          }
          break;
      }
    }
  }
}
