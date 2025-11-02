import { COLORS } from "./constants";

/**
 * Zone definitions for drag-to-create areas (not physical buildings)
 * These appear in the build menu but create zones instead of buildings
 */
export interface ZoneDef {
  category: string;
  name: string;
  description: string;
  key: string;
  color: string;
  /** If true, this is a drag-to-create zone, not a building */
  isZone: true;
  /** Research required to unlock this zone */
  requiresResearch?: string;
}

export const ZONE_TYPES: Record<string, ZoneDef> = {
  stock: {
    category: 'Zones',
    name: 'Stockpile Zone',
    description: 'Drag to create a storage area. Colonists will haul items here automatically.',
    key: '5',
    color: COLORS.stock,
    isZone: true
  },
  mine: {
    category: 'Zones',
    name: 'Mining Zone',
    description: 'Drag to designate an area for mining. Colonists will mine mountains and rocks within this zone.',
    key: '6',
    color: '#f59e0b', // Orange/amber color
    isZone: true
  },
  tree_growing: {
    category: 'Zones',
    name: 'Tree Growing Zone',
    description: 'Drag to designate an area for planting trees. Colonists will plant and tend trees within this zone.',
    key: '7',
    color: '#22c55e', // Green color for growing trees
    isZone: true,
    requiresResearch: 'tree_sowing'
  },
  // Future zones can be added here (dumping zones, etc.)
};

/**
 * Check if a build key is a zone (not a building)
 */
export function isZone(key: string): boolean {
  return key in ZONE_TYPES;
}

/**
 * Get zone definition
 */
export function getZoneDef(key: string): ZoneDef | undefined {
  return ZONE_TYPES[key];
}
