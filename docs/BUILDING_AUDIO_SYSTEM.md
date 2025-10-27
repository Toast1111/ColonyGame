# Enhanced Building Audio System

## Overview

The building audio system has been enhanced to support:
- ✅ **Multiple sound variants** per building (arrays of sounds)
- ✅ **Per-clip volume control** for fine-tuned mixing
- ✅ **Operational/ambient sounds** for completed buildings
- ✅ **Shuffled sound clips** (randomized, non-looping)
- ✅ **Looping ambient sounds** for continuous atmosphere
- ✅ **3D positional audio** with configurable radius

## Core Types

### `AudioClip`
```typescript
interface AudioClip {
  key: AudioKey;
  volume?: number;      // 0.0 to 1.0, default 1.0
  loop?: boolean;       // Default false
  playbackRate?: number; // Pitch/speed, default 1.0
}
```

### `AudioVariant`
Can be either:
- A simple `AudioKey` string (e.g., `'buildings.construct.wood.hammer_nail'`)
- An `AudioClip` object with volume/loop controls

### `BuildingAudioConfig`
```typescript
interface BuildingAudioConfig {
  placement: AudioVariant;
  constructionLoop?: AudioVariant | AudioVariant[];
  complete?: AudioVariant;
  
  operational?: {
    loops?: AudioVariant[];
    shuffle?: {
      clips: AudioVariant[];
      minInterval: number;
      maxInterval: number;
    };
    radius?: number;
    volume?: number;
  };
}
```

## Usage Examples

### Basic Configuration (String)
```typescript
{
  house: {
    placement: 'buildings.placement.confirm',
    constructionLoop: 'buildings.construct.wood.hammer_pin',
    complete: 'buildings.construct.wood.finish'
  }
}
```

### Multiple Construction Variants (Array)
```typescript
{
  research_bench: {
    placement: 'buildings.placement.confirm',
    constructionLoop: [
      'buildings.construct.wood.hammer_nail',
      'buildings.construct.wood.saw_hand',
      'buildings.construct.wood.rummage'
    ],
    complete: 'buildings.construct.wood.finish'
  }
}
```
System will randomly pick one variant each time it plays.

### Per-Clip Volume Control
```typescript
{
  stove: {
    placement: 'buildings.placement.confirm',
    constructionLoop: [
      { key: 'buildings.construct.metal.heavy', volume: 0.8 },
      { key: 'buildings.construct.stone.hammer', volume: 0.7 }
    ],
    complete: 'buildings.construct.stone.drop'
  }
}
```

### Operational Sounds (NEW!)

#### Looping Ambient
```typescript
{
  generator: {
    placement: 'buildings.placement.confirm',
    constructionLoop: 'buildings.construct.metal.heavy',
    complete: 'buildings.construct.stone.drop',
    operational: {
      loops: [
        { key: 'ambient.generator.hum', volume: 0.4, loop: true }
      ],
      radius: 300,
      volume: 0.6
    }
  }
}
```

#### Shuffled Sounds
```typescript
{
  farm: {
    placement: 'buildings.placement.confirm',
    constructionLoop: 'buildings.construct.wood.hammer_nail',
    complete: 'buildings.construct.wood.finish',
    operational: {
      shuffle: {
        clips: [
          { key: 'ambient.farm.birds', volume: 0.3 },
          { key: 'ambient.farm.wind', volume: 0.2 },
          { key: 'ambient.farm.rustling', volume: 0.25 }
        ],
        minInterval: 5,  // Minimum 5 seconds between sounds
        maxInterval: 15  // Maximum 15 seconds between sounds
      },
      radius: 250,
      volume: 0.4
    }
  }
}
```

#### Both Loops + Shuffle
```typescript
{
  stove: {
    placement: 'buildings.placement.confirm',
    constructionLoop: 'buildings.construct.metal.heavy',
    complete: 'buildings.construct.stone.drop',
    operational: {
      loops: [
        { key: 'cooking.fire_crackle', volume: 0.3, loop: true }
      ],
      shuffle: {
        clips: [
          { key: 'cooking.sizzle', volume: 0.5 },
          { key: 'cooking.pot_bubble', volume: 0.4 }
        ],
        minInterval: 8,
        maxInterval: 20
      },
      radius: 180,
      volume: 0.7
    }
  }
}
```

## API Functions

### `getConstructionAudio(buildingKey, buildingDef)`
Returns `AudioClip` for construction loop sounds. If multiple variants exist, picks one randomly.

```typescript
const clip = getConstructionAudio('wall', BUILD_TYPES['wall']);
// Returns: { key: 'buildings.construct.stone.hammer', volume: 1.0, loop: false }
```

### `getConstructionCompleteAudio(buildingKey, buildingDef)`
Returns `AudioClip` for building completion sound.

### `getBuildingPlacementAudio(buildingKey, buildingDef)`
Returns `AudioClip` for placement sound.

### `getOperationalAudio(buildingKey, buildingDef)`
Returns operational audio configuration or `null` if none configured.

```typescript
const opAudio = getOperationalAudio('stove', BUILD_TYPES['stove']);
if (opAudio) {
  // opAudio.loops - Array of looping sounds
  // opAudio.shuffle - Shuffled sound configuration
  // opAudio.radius - 3D audio falloff radius
  // opAudio.volume - Base volume multiplier
}
```

### `normalizeAudioVariant(variant)`
Helper to convert `AudioVariant` to `AudioClip` with defaults.

### `pickRandomVariant(variants)`
Helper to pick random variant from array or return single variant.

## Integration

The system is already integrated into:
- ✅ `colonistFSM.ts` - Construction sounds with volume control
- ⏳ Operational sounds need implementation (see below)

## TODO: Operational Audio Implementation

To implement operational sounds for completed buildings:

1. **Create BuildingAudioManager** (new file: `src/game/audio/BuildingAudioManager.ts`):
```typescript
class BuildingAudioManager {
  private activeLoops: Map<string, AudioInstance>;
  private shuffleTimers: Map<string, { next: number }>;
  
  update(dt: number, buildings: Building[], game: Game): void {
    for (const building of buildings) {
      if (!building.done) continue;
      
      const opAudio = getOperationalAudio(building.kind, BUILD_TYPES[building.kind]);
      if (!opAudio) continue;
      
      const buildingId = `${building.x}_${building.y}`;
      
      // Handle loops
      if (opAudio.loops) {
        this.updateLoops(buildingId, opAudio, building, game);
      }
      
      // Handle shuffle
      if (opAudio.shuffle) {
        this.updateShuffle(buildingId, opAudio, building, game, dt);
      }
    }
  }
}
```

2. **Add to Game.ts**:
```typescript
private buildingAudioManager = new BuildingAudioManager();

update(dt: number) {
  this.buildingAudioManager.update(dt, this.buildings, this);
}
```

3. **Cleanup** when buildings are destroyed:
```typescript
buildingAudioManager.stopBuildingAudio(buildingId);
```

## Adding New Audio

1. Add audio files to `src/assets/audio/`
2. Add keys to audio manifest (`src/assets/audio/manifest.ts`)
3. Update `BuildingAudioConfig` in `buildingAudioMap.ts`

Example:
```typescript
stove: {
  placement: 'buildings.placement.confirm',
  constructionLoop: 'buildings.construct.metal.heavy',
  complete: 'buildings.construct.stone.drop',
  operational: {
    loops: [
      { key: 'cooking.fire_crackle', volume: 0.3, loop: true }
    ],
    shuffle: {
      clips: [
        { key: 'cooking.sizzle', volume: 0.5 },
        { key: 'cooking.pot_bubble', volume: 0.4 }
      ],
      minInterval: 8,
      maxInterval: 20
    },
    radius: 180,
    volume: 0.7
  }
}
```

## Benefits

✅ **Flexible** - Simple strings or complex configurations
✅ **Backward Compatible** - Existing configs still work
✅ **Variety** - Multiple variants prevent repetition
✅ **Control** - Per-clip volume, loop, and pitch control
✅ **Immersive** - Operational sounds bring buildings to life
✅ **Performant** - Shuffle system prevents audio spam
