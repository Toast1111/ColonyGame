import type { AudioKey } from './AudioManager';
import type { BuildingDef } from '../types';

/**
 * Enhanced building audio configuration with support for:
 * - Multiple sound loops per building
 * - Shuffled ambient sounds (non-looping)
 * - Per-clip volume control
 * - Operational sounds for completed buildings
 */

export interface AudioClip {
  key: AudioKey;
  volume?: number; // 0.0 to 1.0, default 1.0
  loop?: boolean; // Default false
  playbackRate?: number; // Pitch/speed, default 1.0
}

export type AudioVariant = AudioKey | AudioClip;

export interface BuildingAudioConfig {
  // Placement sound when building is placed
  placement: AudioVariant;
  
  // Construction sounds while building (can be array for variety)
  constructionLoop?: AudioVariant | AudioVariant[];
  
  // Sound when construction completes
  complete?: AudioVariant;
  
  // NEW: Operational sounds for completed buildings
  operational?: {
    // Looping ambient sounds (e.g., machine hum, fire crackle)
    loops?: AudioVariant[];
    
    // Periodic shuffled sounds (plays randomly, not looping)
    shuffle?: {
      clips: AudioVariant[];
      minInterval: number; // Minimum seconds between clips
      maxInterval: number; // Maximum seconds between clips
    };
    
    // Radius for 3D audio falloff (default 200)
    radius?: number;
    
    // Base volume multiplier for all operational sounds (default 1.0)
    volume?: number;
  };
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
    complete: 'buildings.construct.wood.finish',
    // NEW: Ambient farm sounds (birds, wind, rustling)
    operational: {
      shuffle: {
        clips: [
          // Add farm ambient sounds here when available
          // { key: 'ambient.farm.birds', volume: 0.3 },
          // { key: 'ambient.farm.wind', volume: 0.2 }
        ],
        minInterval: 5,
        maxInterval: 15
      },
      radius: 250,
      volume: 0.4
    }
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
  
  // Stove - metal construction with operational crackling fire
  stove: {
    placement: 'buildings.placement.confirm',
    constructionLoop: [
      { key: 'buildings.construct.metal.heavy', volume: 0.8 },
      { key: 'buildings.construct.stone.hammer', volume: 0.7 }
    ],
    complete: 'buildings.construct.stone.drop',
    // NEW: Operational stove sounds (add audio keys to manifest first)
    operational: {
      loops: [
        // { key: 'cooking.pan_fry', volume: 0.5, loop: true }
      ],
      shuffle: {
        clips: [
          // { key: 'cooking.pan_fry', volume: 0.6 },
        ],
        minInterval: 8,
        maxInterval: 20
      },
      radius: 180,
      volume: 0.7
    }
  },
  
  pantry: {
    placement: 'buildings.placement.confirm',
    constructionLoop: 'buildings.construct.wood.hammer_pin',
    complete: 'buildings.construct.wood.finish'
  },
  
  // Research bench - multiple construction sound variants
  research_bench: {
    placement: 'buildings.placement.confirm',
    constructionLoop: [
      'buildings.construct.wood.hammer_nail',
      'buildings.construct.wood.saw_hand',
      'buildings.construct.wood.rummage'
    ],
    complete: 'buildings.construct.wood.finish'
  },
  
  // Stonecutting table - heavy stone work
  stonecutting_table: {
    placement: 'buildings.placement.confirm',
    constructionLoop: [
      { key: 'buildings.construct.stone.hammer', volume: 0.9 },
      // { key: 'mining.drill', volume: 0.6 } // Add when audio key exists
    ],
    complete: 'buildings.construct.stone.drop',
    // NEW: Operational stonecutting sounds (add audio keys to manifest first)
    operational: {
      shuffle: {
        clips: [
          { key: 'buildings.construct.stone.hammer', volume: 0.4 },
          // { key: 'mining.drill', volume: 0.3 }
        ],
        minInterval: 15,
        maxInterval: 40
      },
      radius: 200,
      volume: 0.6
    }
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
 * Helper: Convert AudioVariant to AudioClip with defaults
 */
export function normalizeAudioVariant(variant: AudioVariant): AudioClip {
  if (typeof variant === 'string') {
    return { key: variant, volume: 1.0, loop: false, playbackRate: 1.0 };
  }
  return {
    key: variant.key,
    volume: variant.volume ?? 1.0,
    loop: variant.loop ?? false,
    playbackRate: variant.playbackRate ?? 1.0
  };
}

/**
 * Helper: Pick random variant from array
 */
export function pickRandomVariant(variants: AudioVariant | AudioVariant[]): AudioClip {
  if (Array.isArray(variants)) {
    const randomVariant = variants[Math.floor(Math.random() * variants.length)];
    return normalizeAudioVariant(randomVariant);
  }
  return normalizeAudioVariant(variants);
}

/**
 * Get construction loop audio key for a building.
 * Returns the audio key to play while colonists are actively building.
 * Now supports multiple variants - will pick one randomly.
 * 
 * @param buildingKey - The building type key (e.g., 'wall', 'house')
 * @param buildingDef - The building definition
 * @returns Audio clip configuration for construction work loop
 * 
 * @example
 * const clip = getConstructionAudio('wall', BUILD_TYPES['wall']);
 * // Returns: { key: 'buildings.construct.stone.hammer', volume: 1.0, ... }
 */
export function getConstructionAudio(
  buildingKey: string,
  buildingDef: BuildingDef
): AudioClip {
  const config = getBuildingAudio(buildingKey, buildingDef);
  const defaultClip: AudioClip = { 
    key: 'buildings.construct.wood.hammer_nail',
    volume: 1.0,
    loop: false,
    playbackRate: 1.0
  };
  
  if (!config.constructionLoop) return defaultClip;
  return pickRandomVariant(config.constructionLoop);
}

/**
 * Get construction completion audio key for a building.
 * Returns the audio key to play when construction finishes.
 * 
 * @param buildingKey - The building type key
 * @param buildingDef - The building definition
 * @returns Audio clip configuration for construction completion
 * 
 * @example
 * const clip = getConstructionCompleteAudio('turret', BUILD_TYPES['turret']);
 * // Returns: { key: 'buildings.construct.stone.drop', volume: 1.0, ... }
 */
export function getConstructionCompleteAudio(
  buildingKey: string,
  buildingDef: BuildingDef
): AudioClip {
  const config = getBuildingAudio(buildingKey, buildingDef);
  const defaultClip: AudioClip = {
    key: 'buildings.construct.wood.finish',
    volume: 1.0,
    loop: false,
    playbackRate: 1.0
  };
  
  if (!config.complete) return defaultClip;
  return normalizeAudioVariant(config.complete);
}

/**
 * Get just the placement sound for a building.
 * Convenience function for the most common use case.
 */
export function getBuildingPlacementAudio(
  buildingKey: string,
  buildingDef: BuildingDef
): AudioClip {
  const config = getBuildingAudio(buildingKey, buildingDef);
  return normalizeAudioVariant(config.placement);
}

/**
 * NEW: Get operational audio configuration for a completed building
 * Returns loops and/or shuffle configuration for ambient building sounds
 * 
 * @example
 * const opAudio = getOperationalAudio('stove', BUILD_TYPES['stove']);
 * // Returns: { loops: [...], shuffle: {...}, radius: 200, volume: 0.8 }
 */
export function getOperationalAudio(
  buildingKey: string,
  buildingDef: BuildingDef
): BuildingAudioConfig['operational'] | null {
  const config = getBuildingAudio(buildingKey, buildingDef);
  return config.operational || null;
}
