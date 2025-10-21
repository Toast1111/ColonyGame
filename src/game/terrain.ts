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
  MOUNTAIN = 'mountain', // Impassable until mined
  
  // Future biomes
  SNOW = 'snow',
  ICE = 'ice',
  MARSH = 'marsh',
  GRAVEL = 'gravel',
}

// Ore types found within mountains
export enum OreType {
  NONE = 'none',
  COAL = 'coal',
  COPPER = 'copper',
  STEEL = 'steel',
  SILVER = 'silver',
  GOLD = 'gold',
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
  [TerrainType.MOUNTAIN]: 999.0,     // Impassable until mined
  
  // Future biomes
  [TerrainType.SNOW]: 1.3,
  [TerrainType.ICE]: 0.9,            // Faster but slippery
  [TerrainType.MARSH]: 2.0,
  [TerrainType.GRAVEL]: 1.05,
};

// Ore properties
export interface OreProperties {
  name: string;
  rarity: number; // 0-1, lower = more rare
  miningYield: number; // Amount of resource per tile mined
  hp: number; // HP to mine through
  color: string; // Visual color
  secondaryColor?: string; // For variation
}

export const ORE_PROPERTIES: Record<OreType, OreProperties> = {
  [OreType.NONE]: {
    name: 'Stone',
    rarity: 1.0,
    miningYield: 3,
    hp: 80,
    color: '#6b7280',
    secondaryColor: '#5b6270',
  },
  [OreType.COAL]: {
    name: 'Coal',
    rarity: 0.25,
    miningYield: 5,
    hp: 70,
    color: '#1f2937',
    secondaryColor: '#111827',
  },
  [OreType.COPPER]: {
    name: 'Copper',
    rarity: 0.15,
    miningYield: 4,
    hp: 90,
    color: '#b45309',
    secondaryColor: '#92400e',
  },
  [OreType.STEEL]: {
    name: 'Steel Ore',
    rarity: 0.12,
    miningYield: 6,
    hp: 120,
    color: '#64748b',
    secondaryColor: '#475569',
  },
  [OreType.SILVER]: {
    name: 'Silver',
    rarity: 0.08,
    miningYield: 3,
    hp: 100,
    color: '#d4d4d8',
    secondaryColor: '#a1a1aa',
  },
  [OreType.GOLD]: {
    name: 'Gold',
    rarity: 0.05,
    miningYield: 2,
    hp: 110,
    color: '#fbbf24',
    secondaryColor: '#f59e0b',
  },
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
  [TerrainType.MOUNTAIN]: { color: '#3f3f46', secondaryColor: '#27272a', pattern: 'noise', renderLayer: 0 },
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
  
  // Mountain ore data (stores ore type for mountain tiles)
  ores: Uint8Array;     // OreType enum values (only valid where terrain === MOUNTAIN)
  
  // Ore visibility (fog of war - true if ore is exposed/visible)
  oreVisible: Uint8Array; // 0 = hidden, 1 = visible
  
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
    ores: new Uint8Array(size).fill(getOreTypeId(OreType.NONE)),
    oreVisible: new Uint8Array(size).fill(0),
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
 * Get numeric ID for ore type
 */
export function getOreTypeId(type: OreType): number {
  return Object.values(OreType).indexOf(type);
}

/**
 * Get ore type from numeric ID
 */
export function getOreTypeFromId(id: number): OreType {
  return Object.values(OreType)[id] as OreType;
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

/**
 * Simple 2D Perlin-like noise generator for procedural generation
 * Based on smooth interpolated random values
 */
class SimpleNoise {
  private seed: number;

  constructor(seed: number = Math.random()) {
    this.seed = seed;
  }

  // Simple hash function for pseudo-random values
  private hash(x: number, y: number): number {
    let h = (x * 374761393 + y * 668265263 + this.seed * 1234567) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296; // Normalize to 0-1
  }

  // Smooth interpolation (smoothstep)
  private smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
  }

  // 2D noise at any coordinate
  noise(x: number, y: number, frequency: number = 1): number {
    x *= frequency;
    y *= frequency;

    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = x0 + 1;
    const y1 = y0 + 1;

    const sx = this.smoothstep(x - x0);
    const sy = this.smoothstep(y - y0);

    const n00 = this.hash(x0, y0);
    const n10 = this.hash(x1, y0);
    const n01 = this.hash(x0, y1);
    const n11 = this.hash(x1, y1);

    const nx0 = n00 * (1 - sx) + n10 * sx;
    const nx1 = n01 * (1 - sx) + n11 * sx;

    return nx0 * (1 - sy) + nx1 * sy;
  }

  // Layered noise (octaves) for more natural variation
  octaveNoise(x: number, y: number, octaves: number = 4): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += this.noise(x, y, frequency * 0.01) * amplitude; // Lower frequency = larger features
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return value / maxValue;
  }
}

/**
 * Generate procedural mountains with ore deposits
 * Creates natural-looking mountain ranges that avoid the HQ area
 */
export function generateMountains(
  terrainGrid: TerrainGrid,
  hqGridX: number,
  hqGridY: number,
  hqProtectionRadius: number = 15 // tiles to keep clear around HQ
): void {
  const { cols, rows } = terrainGrid;
  const noise = new SimpleNoise(Date.now());
  const mountainTypeId = getTerrainTypeId(TerrainType.MOUNTAIN);

  console.log(`[Mountain Gen] Starting generation: grid ${cols}x${rows}, HQ @ (${hqGridX},${hqGridY}), mountainTypeId=${mountainTypeId}`);
  
  let mountainCount = 0;
  let sampleNoiseValues: number[] = [];

  // Generate mountain heightmap
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x;

      // Distance from HQ (in tiles)
      const dx = x - hqGridX;
      const dy = y - hqGridY;
      const distFromHQ = Math.sqrt(dx * dx + dy * dy);

      // Skip tiles near HQ
      if (distFromHQ < hqProtectionRadius) {
        continue;
      }

      // Generate mountain noise (multiple octaves for natural look)
      const mountainNoise = noise.octaveNoise(x, y, 5);
      
      // Sample first 10 noise values for debugging
      if (sampleNoiseValues.length < 10) {
        sampleNoiseValues.push(mountainNoise);
      }

      // Create mountain threshold that varies across the map
      // This creates clusters of mountains rather than uniform distribution
      const clusterNoise = noise.noise(x, y, 0.005);
      const threshold = 0.55 + clusterNoise * 0.1; // Lower threshold for more mountains

      // Place mountain if noise exceeds threshold
      if (mountainNoise > threshold) {
        terrainGrid.terrain[idx] = mountainTypeId;
        mountainCount++;
        
        // Generate ore deposits for this mountain tile
        generateOreDeposit(terrainGrid, x, y, noise);
      }
    }
  }

  console.log(`[Mountain Gen] Generated ${mountainCount} mountain tiles`);
  console.log(`[Mountain Gen] Sample noise values:`, sampleNoiseValues);
  console.log(`[Mountain Gen] Threshold range: 0.55-0.65`);

  // Update ore visibility (initially all hidden)
  updateOreVisibility(terrainGrid);
}

/**
 * Generate ore deposit for a mountain tile
 * Uses weighted random distribution based on ore rarity
 */
function generateOreDeposit(
  terrainGrid: TerrainGrid,
  gx: number,
  gy: number,
  noise: SimpleNoise
): void {
  const idx = gy * terrainGrid.cols + gx;

  // Use noise to determine ore type (more natural clustering)
  const oreNoise = noise.noise(gx * 2.5, gy * 2.5, 0.1);

  // Weighted ore selection based on rarity
  // Most tiles are plain stone, rarer ores need higher noise values
  let oreType: OreType = OreType.NONE;

  if (oreNoise > 0.95) {
    oreType = OreType.GOLD; // Rarest (5% of high-noise areas)
  } else if (oreNoise > 0.87) {
    oreType = OreType.SILVER; // (8%)
  } else if (oreNoise > 0.75) {
    oreType = OreType.STEEL; // (12%)
  } else if (oreNoise > 0.60) {
    oreType = OreType.COPPER; // (15%)
  } else if (oreNoise > 0.35) {
    oreType = OreType.COAL; // (25%)
  }
  // else: NONE (plain stone) - (35%)

  terrainGrid.ores[idx] = getOreTypeId(oreType);
}

/**
 * Update ore visibility based on exposure to non-mountain tiles
 * Ores are only visible when adjacent to an exposed tile (fog of war)
 */
export function updateOreVisibility(terrainGrid: TerrainGrid): void {
  const { cols, rows } = terrainGrid;
  const mountainTypeId = getTerrainTypeId(TerrainType.MOUNTAIN);

  // Reset visibility
  terrainGrid.oreVisible.fill(0);

  // Check each mountain tile
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x;

      // Only check mountain tiles
      if (terrainGrid.terrain[idx] !== mountainTypeId) {
        continue;
      }

      // Check if any adjacent tile is NOT a mountain (exposed edge)
      const neighbors = [
        { dx: -1, dy: 0 },  // left
        { dx: 1, dy: 0 },   // right
        { dx: 0, dy: -1 },  // up
        { dx: 0, dy: 1 },   // down
      ];

      let isExposed = false;
      for (const { dx, dy } of neighbors) {
        const nx = x + dx;
        const ny = y + dy;

        // Edge of map counts as exposed
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) {
          isExposed = true;
          break;
        }

        const nIdx = ny * cols + nx;
        if (terrainGrid.terrain[nIdx] !== mountainTypeId) {
          isExposed = true;
          break;
        }
      }

      // Mark as visible if exposed
      if (isExposed) {
        terrainGrid.oreVisible[idx] = 1;
      }
    }
  }
}

/**
 * Mine a mountain tile - converts it back to grass and returns the ore type
 * Updates ore visibility for neighboring tiles
 */
export function mineMountainTile(
  terrainGrid: TerrainGrid,
  gx: number,
  gy: number
): OreType | null {
  const idx = gy * terrainGrid.cols + gx;
  const mountainTypeId = getTerrainTypeId(TerrainType.MOUNTAIN);

  // Check if this is actually a mountain tile
  if (terrainGrid.terrain[idx] !== mountainTypeId) {
    return null;
  }

  // Get the ore type before removing
  const oreType = getOreTypeFromId(terrainGrid.ores[idx]);

  // Convert to grass (or could be stone/dirt based on surrounding terrain)
  terrainGrid.terrain[idx] = getTerrainTypeId(TerrainType.GRASS);
  terrainGrid.ores[idx] = getOreTypeId(OreType.NONE);
  terrainGrid.oreVisible[idx] = 0;

  // Update visibility for neighboring mountain tiles (they might be newly exposed)
  updateOreVisibilityAround(terrainGrid, gx, gy);

  return oreType;
}

/**
 * Update ore visibility for tiles around a specific location
 * More efficient than full grid update when only one tile changed
 */
export function updateOreVisibilityAround(
  terrainGrid: TerrainGrid,
  gx: number,
  gy: number,
  radius: number = 1
): void {
  const { cols, rows } = terrainGrid;
  const mountainTypeId = getTerrainTypeId(TerrainType.MOUNTAIN);

  // Check tiles in radius
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = gx + dx;
      const y = gy + dy;

      if (x < 0 || y < 0 || x >= cols || y >= rows) continue;

      const idx = y * cols + x;
      if (terrainGrid.terrain[idx] !== mountainTypeId) continue;

      // Check if this mountain tile is exposed
      const neighbors = [
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
      ];

      let isExposed = false;
      for (const { dx: ndx, dy: ndy } of neighbors) {
        const nx = x + ndx;
        const ny = y + ndy;

        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) {
          isExposed = true;
          break;
        }

        const nIdx = ny * cols + nx;
        if (terrainGrid.terrain[nIdx] !== mountainTypeId) {
          isExposed = true;
          break;
        }
      }

      terrainGrid.oreVisible[idx] = isExposed ? 1 : 0;
    }
  }
}

/**
 * Check if a grid position is a mountain tile
 */
export function isMountainTile(terrainGrid: TerrainGrid, gx: number, gy: number): boolean {
  if (gx < 0 || gy < 0 || gx >= terrainGrid.cols || gy >= terrainGrid.rows) {
    return false;
  }
  const idx = gy * terrainGrid.cols + gx;
  return terrainGrid.terrain[idx] === getTerrainTypeId(TerrainType.MOUNTAIN);
}

/**
 * Get ore type at a grid position (returns NONE if not a mountain or ore not visible)
 */
export function getVisibleOreAt(terrainGrid: TerrainGrid, gx: number, gy: number): OreType | null {
  if (!isMountainTile(terrainGrid, gx, gy)) {
    return null;
  }

  const idx = gy * terrainGrid.cols + gx;
  
  // Only return ore if it's visible (exposed)
  if (terrainGrid.oreVisible[idx] === 0) {
    return null;
  }

  return getOreTypeFromId(terrainGrid.ores[idx]);
}

