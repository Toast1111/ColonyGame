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
  // Future zones can be added here (growing zones, dumping zones, etc.)
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
