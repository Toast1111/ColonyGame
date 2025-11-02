export interface AudioVariant {
  file: string;
  volume?: number;
  loop?: boolean;
  tags?: string[];
  weight?: number;
}

type VariantInput =
  | string
  | ({
      name?: string;
      file?: string;
      volume?: number;
      loop?: boolean;
      tags?: string[];
      weight?: number;
    });

function ensureExtension(path: string): string {
  return path.endsWith('.ogg') ? path : `${path}.ogg`;
}

function variants(
  folder: string,
  inputs: readonly VariantInput[],
  defaults: Partial<AudioVariant> = {}
): AudioVariant[] {
  return inputs.map((input) => {
    const data = typeof input === 'string' ? { name: input } : input;
    const resolvedFile = data.file
      ? ensureExtension(data.file)
      : ensureExtension(`${folder}/${data.name}`);

    return {
      file: resolvedFile,
      volume: data.volume ?? defaults.volume,
      loop: data.loop ?? defaults.loop,
      tags: data.tags ?? defaults.tags,
      weight: data.weight ?? defaults.weight
    };
  });
}

export const AUDIO_MANIFEST = {
  'buildings.placement.confirm': variants(
    'buildings/placement',
    ['PlaceBuilding2a', 'PlaceBuilding2b', 'PlaceBuilding2c', 'PlaceBuilding2d', 'PlaceBuilding2e'],
    { volume: 0.8 }
  ),

  'buildings.construct.metal.heavy': variants('buildings/construct/metal', [
    { name: 'DrillA', loop: true, volume: 0.65 },
    { name: 'DrillB', loop: true, volume: 0.65 },
    { name: 'JackhammerA', loop: true, volume: 0.7 },
    { name: 'HammerA', volume: 0.75 },
    { name: 'WrenchA', volume: 0.7 },
    { name: 'RummageB', volume: 0.65 }
  ]),

  'buildings.construct.wood.hammer_pin': variants('buildings/construct/wood/construct_wood', [
    { name: 'Hammer_Pin_Wood_1a', volume: 0.78 },
    { name: 'Hammer_Pin_Wood_1b', volume: 0.78 },
    { name: 'Hammer_Pin_Wood_1c', volume: 0.78 },
    { name: 'Hammer_Pin_Wood_1d', volume: 0.78 },
    { name: 'Hammer_Pin_Wood_1e', volume: 0.78 },
    { name: 'Hammer_Pin_Wood_1f', volume: 0.78 }
  ]),

  'buildings.construct.wood.hammer_nail': variants('buildings/construct/wood/construct_wood', [
    { name: 'Hammer_Nail_Wood_1a', volume: 0.78 },
    { name: 'Hammer_Nail_Wood_1b', volume: 0.78 },
    { name: 'Hammer_Nail_Wood_1c', volume: 0.78 },
    { name: 'Hammer_Nail_Wood_1d', volume: 0.78 },
    { name: 'Hammer_Nail_Wood_1e', volume: 0.78 }
  ]),

  'buildings.construct.wood.flex': variants('buildings/construct/wood/construct_wood', [
    { name: 'Flex_Wood_1a', volume: 0.7 },
    { name: 'Flex_Wood_1b', volume: 0.7 },
    { name: 'Flex_Wood_1c', volume: 0.7 }
  ]),

  'buildings.construct.wood.sand': variants('buildings/construct/wood/construct_wood', [
    { name: 'Sand_Wood_1a', loop: true, volume: 0.6 },
    { name: 'Sand_Wood_1b', loop: true, volume: 0.6 },
    { name: 'Sand_Wood_1c', loop: true, volume: 0.6 },
    { name: 'Sand_Wood_1d', loop: true, volume: 0.6 }
  ]),

  'buildings.construct.wood.saw_hand': variants('buildings/construct/wood/wood_saw_hand', [
    { name: 'Wood_Saw_Hand_1a', loop: true, volume: 0.72 },
    { name: 'Wood_Saw_Hand_1b', loop: true, volume: 0.72 },
    { name: 'Wood_Saw_Hand_1c', loop: true, volume: 0.72 },
    { name: 'Wood_Saw_Hand_1d', loop: true, volume: 0.72 },
    { name: 'Wood_Saw_Hand_1e', loop: true, volume: 0.72 },
    { name: 'Wood_Saw_Hand_1f', loop: true, volume: 0.72 },
    { name: 'Wood_Saw_Hand_1g', loop: true, volume: 0.72 },
    { name: 'Wood_Saw_Hand_1h', loop: true, volume: 0.72 }
  ]),

  'buildings.construct.wood.saw_circular': variants('buildings/construct/wood/wood_saw_circular', [
    { name: 'Wood_Saw_Circular_1a', loop: true, volume: 0.75 },
    { name: 'Wood_Saw_Circular_1b', loop: true, volume: 0.75 },
    { name: 'Wood_Saw_Circular_1c', loop: true, volume: 0.75 },
    { name: 'Wood_Saw_Circular_1d', loop: true, volume: 0.75 },
    { name: 'Wood_Saw_Circular_1e', loop: true, volume: 0.75 },
    { name: 'Wood_Saw_Circular_1f', loop: true, volume: 0.75 }
  ]),

  'buildings.construct.wood.rummage': variants('buildings/construct/wood/rummage_wood', [
    { name: 'Rummage_Wood_1a', volume: 0.65 },
    { name: 'Rummage_Wood_1b', volume: 0.65 },
    { name: 'Rummage_Wood_1c', volume: 0.65 },
    { name: 'Rummage_Wood_1d', volume: 0.65 },
    { name: 'Rummage_Wood_1e', volume: 0.65 },
    { name: 'Rummage_Wood_1f', volume: 0.65 },
    { name: 'Rummage_Wood_1g', volume: 0.65 }
  ]),

  'buildings.construct.wood.finish': variants('buildings/construct/wood/finish_wood', [
    { name: 'Place_Wood_1a', volume: 0.7 },
    { name: 'Place_Wood_1b', volume: 0.7 },
    { name: 'Place_Wood_1c', volume: 0.7 },
    { name: 'Place_Wood_1d', volume: 0.7 }
  ]),

  'buildings.construct.stone.chunk_light': variants('buildings/construct/stone/stone_chunk_light', [
    { name: 'Stone_Chunk_Light_1a', volume: 0.7 },
    { name: 'Stone_Chunk_Light_1b', volume: 0.7 },
    { name: 'Stone_Chunk_Light_1c', volume: 0.7 },
    { name: 'Stone_Chunk_Light_1d', volume: 0.7 },
    { name: 'Stone_Chunk_Light_1e', volume: 0.7 },
    { name: 'Stone_Chunk_Light_1f', volume: 0.7 }
  ]),

  'buildings.construct.stone.hammer': variants('buildings/construct/stone/hammer_stone', [
    { name: 'Hammer_Stone_1a', volume: 0.8 },
    { name: 'Hammer_Stone_1b', volume: 0.8 },
    { name: 'Hammer_Stone_1c', volume: 0.8 },
    { name: 'Hammer_Stone_1d', volume: 0.8 },
    { name: 'Hammer_Stone_1e', volume: 0.8 }
  ]),

  'buildings.construct.stone.drop': variants('buildings/construct/stone/stoneblock_drop', [
    { name: 'StoneBlock_Drop_1a', volume: 0.8 }
  ]),

  'cooking.stove.pan_fry': variants(
    'cooking/stove/pan_fry',
    ['Pan_Fry_1a', 'Pan_Fry_1b', 'Pan_Fry_1c', 'Pan_Fry_1d'],
    { loop: true, volume: 0.6 }
  ),

  'medical.tend.start': variants('medical/tend/tend_start', [
    { name: 'Bandage_Foley_1a', volume: 0.75 },
    { name: 'Bandage_Foley_1b', volume: 0.75 },
    { name: 'Bandage_Foley_1c', volume: 0.75 },
    { name: 'Bandage_Foley_1d', volume: 0.75 },
    { name: 'Bandage_Foley_1e', volume: 0.75 },
    { name: 'Bandage_Foley_1f', volume: 0.75 },
    { name: 'Bandage_Foley_1g', volume: 0.75 }
  ]),

  'medical.tend.loop': variants('medical/tend/tend_loop', [
    { name: 'Bandage_Tape_1a', loop: true, volume: 0.6 },
    { name: 'Bandage_Tape_1b', loop: true, volume: 0.6 },
    { name: 'Bandage_Tape_1c', loop: true, volume: 0.6 },
    { name: 'Bandage_Tape_1d', loop: true, volume: 0.6 },
    { name: 'Bandage_Tape_1e', loop: true, volume: 0.6 },
    { name: 'Bandage_Tape_1e_dupe', loop: true, volume: 0.6 },
    { name: 'Bandage_Rip_1a', loop: true, volume: 0.6 },
    { name: 'Bandage_Rip_1b', loop: true, volume: 0.6 },
    { name: 'Bandage_Rip_1c', loop: true, volume: 0.6 },
    { name: 'Bandage_Rip_1d', loop: true, volume: 0.6 }
  ]),

  'medical.surgery.loop': variants('medical/surgery/surgery_loop', [
    { name: 'Surgery_1a', loop: true, volume: 0.55 },
    { name: 'Surgery_1b', loop: true, volume: 0.55 },
    { name: 'Surgery_1c', loop: true, volume: 0.55 },
    { name: 'Surgery_1d', loop: true, volume: 0.55 },
    { name: 'Surgery_1e', loop: true, volume: 0.55 },
    { name: 'Surgery_1f', loop: true, volume: 0.55 },
    { name: 'Surgery_1g', loop: true, volume: 0.55 },
    { name: 'Surgery_1h', loop: true, volume: 0.55 },
    { name: 'Surgery_1i', loop: true, volume: 0.55 },
    { name: 'Surgery_1j', loop: true, volume: 0.55 },
    { name: 'Surgery_1k', loop: true, volume: 0.55 },
    { name: 'Surgery_1l', loop: true, volume: 0.55 },
    { name: 'Surgery_1m', loop: true, volume: 0.55 },
    { name: 'Surgery_1n', loop: true, volume: 0.55 }
  ]),

  'ui.click.primary': variants('ui', [
    { name: 'Click', volume: 0.55 },
    { name: 'Click2', volume: 0.55 }
  ]),

  'ui.click.secondary': variants('ui', [
    { name: 'ClickReject', volume: 0.6 }
  ]),

  'ui.hover': variants('ui', [
    { name: 'OptionMouseoverThump', volume: 0.5 },
    { name: 'ToggleButton_Mouseover', volume: 0.45 },
    { name: 'Pip', volume: 0.45 }
  ]),

  'ui.panel.open': variants('ui', [
    { name: 'TabOpen', volume: 0.6 }
  ]),

  'ui.panel.close': variants('ui', [
    { name: 'TabClose', volume: 0.6 }
  ]),

  // Hotbar specific (single-variant each to avoid shuffling)
  'ui.hotbar.open': variants('ui', [
    { name: 'TabOpen', volume: 0.6 }
  ]),
  'ui.hotbar.hover': variants('ui', [
    { name: 'OptionMouseoverThump', volume: 0.5 }
  ]),
  'ui.hotbar.close': variants('ui', [
    { name: 'TabClose', volume: 0.6 }
  ]),

  'ui.drag.start': variants('ui', [
    { name: 'DragElement', volume: 0.5 }
  ]),

  'ui.drag.end': variants('ui', [
    { name: 'DropElement', volume: 0.5 }
  ]),

  'ui.tick': variants('ui', [
    { name: 'TickHigh', volume: 0.4 },
    { name: 'TickLow', volume: 0.4 },
    { name: 'TickTiny', volume: 0.35 }
  ]),

  'ui.notification.positive': variants('ui', [
    { name: 'GentleBeep', volume: 0.6 },
    { name: 'SelectThing', volume: 0.55 }
  ]),

  'ui.notification.negative': variants('ui', [
    { name: 'OptionDeselected', volume: 0.6 },
    { name: 'FlickWhooshRev', volume: 0.55 }
  ]),

  'ui.misc': variants('ui', [
    { name: 'FlickWhoosh', volume: 0.55 },
    { name: 'DraftOff', volume: 0.55 },
    { name: 'Crunch', volume: 0.45 }
  ]),

  'ui.clock.tick.normal': variants('ui/clock', [
    { name: 'ClockTickingNormal', loop: true, volume: 0.4 }
  ]),

  'ui.clock.tick.fast': variants('ui/clock', [
    { name: 'ClockTickingFast', loop: true, volume: 0.4 },
    { name: 'ClockTickingSuperFast', loop: true, volume: 0.4 }
  ]),

  'ui.clock.stop': variants('ui/clock', [
    { name: 'ClockStops', volume: 0.6 }
  ]),

  'weapons.ranged.autopistol.fire': variants('weapons/ranged/autopistol', [
    { file: 'weapons/ranged/autopistol/AutoPistol_Fire1a.ogg', volume: 0.9 },
    { name: 'AutoPistol_Fire_1b', volume: 0.9 },
    { name: 'AutoPistol_Fire_1c', volume: 0.9 },
    { name: 'AutoPistol_Fire_1d', volume: 0.9 },
    { name: 'AutoPistol_Fire_1e', volume: 0.9 }
  ]),

  'weapons.ranged.assault_rifle.fire': variants('weapons/ranged/assultrifle', [
    { name: 'AssultRifle_Fire_1a', volume: 1.0 },
    { name: 'AssultRifle_Fire_1b', volume: 1.0 },
    { name: 'AssultRifle_Fire_1c', volume: 1.0 },
    { name: 'AssultRifle_Fire_1d', volume: 1.0 }
  ]),

  // SMG: currently reuses Autopistol pool; unique key allows swapping later
  'weapons.ranged.smg.fire': variants('weapons/ranged/autopistol', [
    { file: 'weapons/ranged/autopistol/AutoPistol_Fire1a.ogg', volume: 0.95 },
    { name: 'AutoPistol_Fire_1b', volume: 0.95 },
    { name: 'AutoPistol_Fire_1c', volume: 0.95 },
    { name: 'AutoPistol_Fire_1d', volume: 0.95 },
    { name: 'AutoPistol_Fire_1e', volume: 0.95 }
  ]),

  // Sniper: currently reuses Assault Rifle pool; unique key allows swapping later
  'weapons.ranged.sniper_rifle.fire': variants('weapons/ranged/assultrifle', [
    { name: 'AssultRifle_Fire_1a', volume: 1.0 },
    { name: 'AssultRifle_Fire_1b', volume: 1.0 },
    { name: 'AssultRifle_Fire_1c', volume: 1.0 },
    { name: 'AssultRifle_Fire_1d', volume: 1.0 }
  ]),

  'weapons.melee.club.impact': variants('weapons/melee/club', [
    { name: 'MeleeHit_Metal_Blunt_1a', volume: 0.85 },
    { name: 'MeleeHit_Metal_Blunt_1b', volume: 0.85 },
    { name: 'MeleeHit_Metal_Blunt_1c', volume: 0.85 },
    { name: 'MeleeHit_Metal_Blunt_1d', volume: 0.85 },
    { name: 'MeleeHit_Metal_Blunt_1e', volume: 0.85 },
    { name: 'MeleeHit_Metal_Blunt_1f', volume: 0.85 },
    { name: 'MeleeHit_Metal_Blunt_1g', volume: 0.85 }
  ]),

  'weapons.melee.sword.impact': variants('weapons/melee/sword', [
    { name: 'MeleeHit_Metal_Sharp_1a', volume: 0.85 },
    { name: 'MeleeHit_Metal_Sharp_1b', volume: 0.85 },
    { name: 'MeleeHit_Metal_Sharp_1c', volume: 0.85 },
    { name: 'MeleeHit_Metal_Sharp_1d', volume: 0.85 },
    { name: 'MeleeHit_Metal_Sharp_1e', volume: 0.85 },
    { name: 'MeleeHit_Metal_Sharp_1f', volume: 0.85 },
    { name: 'MeleeHit_Metal_Sharp_1g', volume: 0.85 },
    { name: 'MeleeHit_Metal_Sharp_1h', volume: 0.85 }
  ]),

  'weapons.miss.melee': variants('ui', [
    { name: 'FlickWhoosh', volume: 0.6 },
    { name: 'FlickWhooshRev', volume: 0.6 }
  ]),

  'weapons.miss.ranged': variants('ui', [
    { name: 'FlickWhoosh', volume: 0.4 }
  ]),

  'music.gameover.sad': variants('music/game_over', [
    { name: 'New Horizons', loop: true, volume: 0.4 }
  ])
} as const satisfies Record<string, readonly AudioVariant[]>;

export type AudioKey = keyof typeof AUDIO_MANIFEST;

export type RandomFn = () => number;

export function getAudioVariants(key: AudioKey): readonly AudioVariant[] {
  return AUDIO_MANIFEST[key];
}

export function pickAudioVariant(
  key: AudioKey,
  rng: RandomFn = Math.random
): AudioVariant | null {
  try {
    // Direct check before type assertion
    if (!(key in AUDIO_MANIFEST)) {
      console.warn(`[AudioManifest] Key "${key}" not found in AUDIO_MANIFEST`);
      return null;
    }
    
    const variants = AUDIO_MANIFEST[key] as readonly AudioVariant[];
    
    if (!variants || variants.length === 0) {
      console.warn(`[AudioManifest] No variants found for audio key: ${key}`);
      return null;
    }
    if (variants.length === 1) {
      return variants[0];
    }

    const totalWeight = variants.reduce((sum, variant) => {
      const weight = variant?.weight ?? 1;
      return sum + weight;
    }, 0);
    
    let roll = rng() * totalWeight;
    for (const variant of variants) {
      if (!variant) continue; // Skip null/undefined variants
      roll -= variant.weight ?? 1;
      if (roll <= 0) {
        return variant;
      }
    }
    return variants[variants.length - 1];
  } catch (error) {
    console.error(`[AudioManifest] Error picking variant for key "${key}":`, error);
    return null;
  }
}

export function listAudioKeys(prefix: string): AudioKey[] {
  return (Object.keys(AUDIO_MANIFEST) as AudioKey[]).filter((key) => key.startsWith(prefix));
}

export function resolveAudioSrc(relativeFile: string): string {
  // FIXED: Better URL resolution for Vite dev server
  // During development, check if we're running on localhost (dev server)
  const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  
  let resolvedUrl: string;
  if (isDev) {
    // In development, serve directly from /src/assets/audio/
    resolvedUrl = `/src/assets/audio/${relativeFile}`;
  } else {
    // In production, use import.meta.url resolution
    resolvedUrl = new URL(`./${relativeFile}`, import.meta.url).href;
  }
  
  // Debug logging (can be removed later)
  if (isDev && relativeFile.includes('StoneBlock_Drop')) {
    console.log(`[AudioManager] Resolving audio: ${relativeFile} -> ${resolvedUrl}`);
  }
  
  return resolvedUrl;
}
