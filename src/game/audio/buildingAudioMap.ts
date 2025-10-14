import type { AudioKey } from './AudioManager';
import type { BuildingDef } from '../types';

/**
 * Maps building types to their appropriate audio keys.
 * This prevents hardcoding audio file paths and provides a centralized
 * configuration for building sounds.
 */

export interface BuildingAudioConfig {
  placement: AudioKey;
  constructionLoop?: AudioKey;
  complete?: AudioKey;
}

/**
 * Default audio configurations per building category.
 * Individual buildings can override these defaults.
 */
const CATEGORY_AUDIO_DEFAULTS: Record<string, BuildingAudioConfig> = {
  Housing: {
    placement: 'buildings.placement.confirm',
    constructionLoop: 'buildings.construct.wood.hammer_pin',
    complete: 'buildings.construct.wood.finish'
  },
  Production: {
    placement: 'buildings.placement.confirm',
    constructionLoop: 'buildings.construct.wood.hammer_nail',
    complete: 'buildings.construct.wood.finish'
  },
  Defense: {
    placement: 'buildings.placement.confirm',
    constructionLoop: 'buildings.construct.stone.hammer',
    complete: 'buildings.construct.stone.drop'
  },
  Utility: {
    placement: 'buildings.placement.confirm',
    constructionLoop: 'buildings.construct.wood.hammer_pin',
    complete: 'buildings.construct.wood.finish'
  },
  Flooring: {
    placement: 'buildings.placement.confirm',
    constructionLoop: 'buildings.construct.stone.chunk_light',
    complete: 'buildings.construct.wood.finish'
  },
  Furniture: {
    placement: 'buildings.placement.confirm',
    constructionLoop: 'buildings.construct.wood.hammer_nail',
    complete: 'buildings.construct.wood.finish'
  }
};

/**
 * Specific audio overrides for individual building types.
 * These take precedence over category defaults.
 */
const BUILDING_AUDIO_OVERRIDES: Partial<Record<string, BuildingAudioConfig>> = {
  // Defense structures - heavier construction sounds
  turret: {
    placement: 'buildings.placement.confirm',
    constructionLoop: 'buildings.construct.metal.heavy',
    complete: 'buildings.construct.stone.drop'
  },
  wall: {
    placement: 'buildings.placement.confirm',
    constructionLoop: 'buildings.construct.stone.hammer',
    complete: 'buildings.construct.stone.drop'
  },
  
  // Production buildings
  farm: {
    placement: 'buildings.placement.confirm',
    constructionLoop: 'buildings.construct.wood.hammer_nail',
    complete: 'buildings.construct.wood.finish'
  },
  
  // Storage buildings - wooden construction
  stock: {
    placement: 'buildings.placement.confirm',
    constructionLoop: 'buildings.construct.wood.saw_hand',
    complete: 'buildings.construct.wood.finish'
  },
  warehouse: {
    placement: 'buildings.placement.confirm',
    constructionLoop: 'buildings.construct.wood.saw_circular',
    complete: 'buildings.construct.wood.finish'
  },
  
  // Housing - comfortable wood sounds
  house: {
    placement: 'buildings.placement.confirm',
    constructionLoop: 'buildings.construct.wood.hammer_pin',
    complete: 'buildings.construct.wood.finish'
  },
  tent: {
    placement: 'buildings.placement.confirm',
    constructionLoop: 'buildings.construct.wood.rummage',
    complete: 'buildings.construct.wood.finish'
  },
  
  // Utility structures - mixed materials
  well: {
    placement: 'buildings.placement.confirm',
    constructionLoop: 'buildings.construct.stone.hammer',
    complete: 'buildings.construct.stone.drop'
  },
  infirmary: {
    placement: 'buildings.placement.confirm',
    constructionLoop: 'buildings.construct.wood.hammer_nail',
    complete: 'buildings.construct.wood.finish'
  },
  
  // Floors - quick placement sounds
  floor_path: {
    placement: 'buildings.placement.confirm',
    constructionLoop: 'buildings.construct.stone.chunk_light',
    complete: 'buildings.construct.wood.finish'
  },
  floor_stone_road: {
    placement: 'buildings.placement.confirm',
    constructionLoop: 'buildings.construct.stone.hammer',
    complete: 'buildings.construct.stone.drop'
  },
  floor_wooden: {
    placement: 'buildings.placement.confirm',
    constructionLoop: 'buildings.construct.wood.sand',
    complete: 'buildings.construct.wood.finish'
  },
  
  // Furniture - lighter construction
  bed: {
    placement: 'buildings.placement.confirm',
    constructionLoop: 'buildings.construct.wood.hammer_nail',
    complete: 'buildings.construct.wood.finish'
  },
  door: {
    placement: 'buildings.placement.confirm',
    constructionLoop: 'buildings.construct.wood.saw_hand',
    complete: 'buildings.construct.wood.finish'
  },
  stove: {
    placement: 'buildings.placement.confirm',
    constructionLoop: 'buildings.construct.metal.heavy',
    complete: 'buildings.construct.stone.drop'
  },
  pantry: {
    placement: 'buildings.placement.confirm',
    constructionLoop: 'buildings.construct.wood.hammer_pin',
    complete: 'buildings.construct.wood.finish'
  }
};

/**
 * Get audio configuration for a building type.
 * Falls back to category defaults if no specific override exists.
 * 
 * @param buildingKey - The building type key (e.g., 'house', 'turret')
 * @param buildingDef - The building definition (needed for category)
 * @returns Audio configuration for the building
 */
export function getBuildingAudio(
  buildingKey: string,
  buildingDef: BuildingDef
): BuildingAudioConfig {
  // Check for specific building override first
  if (BUILDING_AUDIO_OVERRIDES[buildingKey]) {
    return BUILDING_AUDIO_OVERRIDES[buildingKey]!;
  }
  
  // Fall back to category default
  const category = buildingDef.category || 'Utility';
  return CATEGORY_AUDIO_DEFAULTS[category] || CATEGORY_AUDIO_DEFAULTS.Utility;
}

/**
 * Get construction loop audio key for a building.
 * Returns the audio key to play while colonists are actively building.
 * 
 * @param buildingKey - The building type key (e.g., 'wall', 'house')
 * @param buildingDef - The building definition
 * @returns Audio key for construction work loop
 * 
 * @example
 * const audioKey = getConstructionAudio('wall', BUILD_TYPES['wall']);
 * // Returns: 'buildings.construct.stone.hammer'
 */
export function getConstructionAudio(
  buildingKey: string,
  buildingDef: BuildingDef
): AudioKey {
  const config = getBuildingAudio(buildingKey, buildingDef);
  return config.constructionLoop || 'buildings.construct.wood.hammer_nail';
}

/**
 * Get construction completion audio key for a building.
 * Returns the audio key to play when construction finishes.
 * 
 * @param buildingKey - The building type key
 * @param buildingDef - The building definition
 * @returns Audio key for construction completion
 * 
 * @example
 * const audioKey = getConstructionCompleteAudio('turret', BUILD_TYPES['turret']);
 * // Returns: 'buildings.construct.stone.drop'
 */
export function getConstructionCompleteAudio(
  buildingKey: string,
  buildingDef: BuildingDef
): AudioKey {
  const config = getBuildingAudio(buildingKey, buildingDef);
  return config.complete || 'buildings.construct.wood.finish';
}

/**
 * Get just the placement sound for a building.
 * Convenience function for the most common use case.
 */
export function getBuildingPlacementAudio(
  buildingKey: string,
  buildingDef: BuildingDef
): AudioKey {
  return getBuildingAudio(buildingKey, buildingDef).placement;
}
