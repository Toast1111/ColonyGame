# Audio System - Complete Guide

## Overview

The audio system has been refactored to be **fully data-driven** and eliminate hardcoded audio file references. All building placement sounds are now dynamically determined based on building type and category.

## Architecture

### Core Components

1. **AudioManager** (`src/game/audio/AudioManager.ts`)
   - Singleton pattern audio manager
   - Handles playback, volume control, and looping
   - Category-based volume management (ambient, buildings, cooking, medical, ui, weapons)
   - Supports audio variants with weighted random selection

2. **Audio Manifest** (`src/assets/audio/manifest.ts`)
   - Central registry of all audio files
   - 340 lines of audio definitions
   - Organized by category (buildings, cooking, medical, ui, weapons)
   - Each key maps to one or more audio variants

3. **Building Audio Map** (`src/game/audio/buildingAudioMap.ts`)
   - **NEW** - Maps building types to appropriate audio keys
   - Category-based defaults with per-building overrides
   - Three audio types per building:
     - `placement` - Played when blueprint is placed
     - `constructionLoop` - Played during construction (future use)
     - `complete` - Played when construction finishes (future use)

### Audio Key Structure

All audio keys follow a hierarchical naming pattern:
```
category.subcategory.variant
```

Examples:
- `buildings.placement.confirm`
- `buildings.construct.wood.hammer_pin`
- `buildings.construct.metal.heavy`
- `cooking.stove.pan_fry`
- `weapons.ranged.autopistol.fire`

## Building Audio Configuration

### Category Defaults

Each building category has default audio assignments:

| Category | Placement | Construction Loop | Complete |
|----------|-----------|------------------|----------|
| Housing | placement.confirm | wood.hammer_pin | wood.finish |
| Production | placement.confirm | wood.hammer_nail | wood.finish |
| Defense | placement.confirm | stone.hammer | stone.drop |
| Utility | placement.confirm | wood.hammer_pin | wood.finish |
| Flooring | placement.confirm | stone.chunk_light | wood.finish |
| Furniture | placement.confirm | wood.hammer_nail | wood.finish |

### Building-Specific Overrides

Individual buildings override category defaults for thematic accuracy:

**Heavy Construction (Metal/Stone):**
- Turret: metal.heavy → stone.drop
- Stove: metal.heavy → stone.drop
- Wall: stone.hammer → stone.drop
- Well: stone.hammer → stone.drop

**Wooden Construction:**
- Stock: wood.saw_hand → wood.finish
- Warehouse: wood.saw_circular → wood.finish
- Door: wood.saw_hand → wood.finish

**Light Construction:**
- Tent: wood.rummage → wood.finish
- Floor tiles: Vary by material type

## Usage

### Playing Audio (General)

```typescript
// Simple playback
game.playAudio('buildings.placement.confirm');

// With options
game.playAudio('weapons.pistol.shoot', {
  volume: 0.8,
  rng: Math.random
});

// Looping audio
game.playAudio('cooking.stove.pan_fry', { 
  loop: true,
  replaceExisting: true 
});

// Stop looping audio
game.stopAudio('cooking.stove.pan_fry');
```

### Building Placement Audio

The placement system automatically selects audio based on building type:

```typescript
import { getBuildingPlacementAudio } from "../audio/buildingAudioMap";

// Automatically plays correct audio for building type
const def = BUILD_TYPES[buildingType];
const audioKey = getBuildingPlacementAudio(buildingType, def);
game.playAudio(audioKey);
```

**No hardcoding needed!** The system handles all mappings automatically.

### Volume Control

```typescript
// Master volume (0.0 to 1.0)
game.audioManager.setMasterVolume(0.5);

// Category volumes
game.audioManager.setCategoryVolume('buildings', 0.8);
game.audioManager.setCategoryVolume('weapons', 1.0);
game.audioManager.setCategoryVolume('ui', 0.7);

// Mute/unmute
game.audioManager.setMuted(true);
```

## Available Audio Categories

### Buildings
- `buildings.placement.confirm` - 5 variants
- `buildings.construct.metal.heavy` - 6 variants (drill, jackhammer, hammer, wrench)
- `buildings.construct.wood.hammer_pin` - 6 variants
- `buildings.construct.wood.hammer_nail` - 5 variants
- `buildings.construct.wood.flex` - 3 variants
- `buildings.construct.wood.sand` - 4 looping variants
- `buildings.construct.wood.saw_hand` - 8 looping variants
- `buildings.construct.wood.saw_circular` - 6 looping variants
- `buildings.construct.wood.rummage` - 7 variants
- `buildings.construct.wood.finish` - 4 variants
- `buildings.construct.stone.chunk_light` - 6 variants
- `buildings.construct.stone.hammer` - 5 variants
- `buildings.construct.stone.drop` - 1 variant

### Cooking
- `cooking.stove.pan_fry` - 4 looping variants

### Medical
- `medical.tend.start` - 7 variants (bandage foley sounds)
- `medical.tend.loop` - 10 looping variants (bandage tape/rip)
- `medical.surgery.loop` - 14 looping variants

### UI
- `ui.click.primary` - 2 variants
- `ui.click.secondary` - 1 variant
- `ui.hover` - 3 variants
- `ui.panel.open` - 3 variants
- `ui.panel.close` - 3 variants
- `ui.drag.start/end` - 1 variant each
- `ui.tick` - 3 variants
- `ui.notification.positive/negative` - 2 variants each
- `ui.misc` - 3 variants
- `ui.clock.tick.normal/fast` - Looping variants
- `ui.clock.stop` - 1 variant

### Weapons
- `weapons.ranged.autopistol.fire` - 5 variants
- `weapons.ranged.assault_rifle.fire` - 4 variants
- `weapons.melee.club.impact` - 7 variants
- `weapons.melee.sword.impact` - 8 variants

## Adding New Audio

### 1. Add Audio Files

Place `.ogg` files in appropriate directory:
```
src/assets/audio/
  buildings/
    placement/
    construct/
      wood/
      stone/
      metal/
  cooking/
  medical/
  ui/
  weapons/
```

### 2. Register in Manifest

Add entry to `src/assets/audio/manifest.ts`:

```typescript
'buildings.construct.glass.shatter': variants('buildings/construct/glass', [
  { name: 'Glass_Break_1a', volume: 0.7 },
  { name: 'Glass_Break_1b', volume: 0.7 },
  { name: 'Glass_Break_1c', volume: 0.7 }
]),
```

### 3. Update Building Audio Map (if needed)

For new building types, add override in `buildingAudioMap.ts`:

```typescript
greenhouse: {
  placement: 'buildings.placement.confirm',
  constructionLoop: 'buildings.construct.glass.shatter',
  complete: 'buildings.construct.wood.finish'
}
```

### 4. Use in Code

```typescript
// Automatically works!
const audioKey = getBuildingPlacementAudio('greenhouse', def);
game.playAudio(audioKey);
```

## Current Implementation Status

### ✅ Implemented
- [x] Centralized audio manifest with all RimWorld-inspired sounds
- [x] Building-to-audio mapping system (no hardcoding)
- [x] Category-based audio defaults
- [x] Per-building audio overrides
- [x] Placement audio for all building types
- [x] Volume control (master + per-category)
- [x] Audio variants with weighted selection
- [x] Looping audio support

### 🚧 Future Enhancements
- [ ] Construction loop audio (play during building construction)
- [ ] Completion audio (play when building finishes)
- [ ] Ambient environmental sounds
- [ ] Music system
- [ ] Audio settings UI panel
- [ ] Spatial audio (volume based on camera distance)
- [ ] Audio preloading for performance

## Testing

Use the debug console to test audio:

```bash
# Toggle debug console (backtick key)
`

# Spawn buildings to test placement audio
spawn house
spawn turret
spawn farm
spawn wall

# Test different building categories
spawn floor_stone_road
spawn bed
spawn stove
spawn door

# Adjust volumes
# (Use in-game UI or modify AudioManager directly)
```

### Expected Behavior

1. **Placement Audio**: Each building type plays appropriate sound when blueprint is placed
2. **No Hardcoding**: All audio is looked up from buildingAudioMap.ts
3. **Fallback System**: Unknown buildings use category defaults
4. **Consistent Volume**: All placement sounds normalized to ~0.8 volume

## Troubleshooting

### No Sound on Placement
1. Check browser console for audio errors
2. Verify audio files exist in `src/assets/audio/`
3. Check AudioManager is not muted: `game.audioManager.isMuted()`
4. Verify master volume: `game.audioManager.getMasterVolume()`

### Wrong Audio Playing
1. Check `buildingAudioMap.ts` for correct mapping
2. Verify building category in `buildings.ts`
3. Check fallback logic in `getBuildingPlacementAudio()`

### Audio Not Found Error
1. Ensure audio key exists in `manifest.ts`
2. Check for typos in audio key string
3. Verify `.ogg` files are in correct directories

## Best Practices

1. **Always use audio keys, never file paths**
   ```typescript
   // ✅ Good
   game.playAudio('buildings.placement.confirm');
   
   // ❌ Bad
   new Audio('../../assets/audio/buildings/placement/PlaceBuilding2a.ogg').play();
   ```

2. **Use the building audio map for building sounds**
   ```typescript
   // ✅ Good
   const audioKey = getBuildingPlacementAudio(buildingType, def);
   game.playAudio(audioKey);
   
   // ❌ Bad
   game.playAudio('buildings.placement.confirm'); // hardcoded
   ```

3. **Stop looping audio when appropriate**
   ```typescript
   game.playAudio('cooking.stove.pan_fry', { loop: true });
   // ... later ...
   game.stopAudio('cooking.stove.pan_fry');
   ```

4. **Use category volumes for global control**
   ```typescript
   // User preference: quiet UI sounds
   game.audioManager.setCategoryVolume('ui', 0.3);
   ```

## References

- Audio manifest: `src/assets/audio/manifest.ts`
- Building audio map: `src/game/audio/buildingAudioMap.ts`
- Audio manager: `src/game/audio/AudioManager.ts`
- Placement system: `src/game/placement/placementSystem.ts`
