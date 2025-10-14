# Weapon Audio System Analysis

## Current Status: ❌ **NOT IMPLEMENTED**

The weapon audio system has audio files and manifest entries, but **no actual playback code** exists in the combat systems.

---

## 📊 What Exists

### ✅ Audio Files & Manifest

Audio files exist and are properly registered in `src/assets/audio/manifest.ts`:

#### Ranged Weapons
- **`weapons.ranged.autopistol.fire`** - 5 variants (volume 0.9)
- **`weapons.ranged.assault_rifle.fire`** - 4 variants (volume 1.0)

#### Melee Weapons  
- **`weapons.melee.club.impact`** - 7 variants (volume 0.85)
- **`weapons.melee.sword.impact`** - 8 variants (volume 0.85)

### ✅ AudioManager Ready

The `AudioManager` singleton is available and working:
- Accessed via `game.playAudio(key, options)`
- Supports weapon category volume control
- Handles audio variants with random selection

---

## ❌ What's Missing

### No Audio Playback Calls

**None of the combat systems call `game.playAudio()`:**

1. **`src/game/combat/pawnCombat.ts`** (670 lines)
   - ❌ No audio when colonist fires ranged weapon (line ~650)
   - ❌ No audio when colonist melee attacks (line ~470)
   - ❌ No audio on gun-bash attack (line ~550)

2. **`src/game/combat/combatSystem.ts`** (244 lines)
   - ❌ No audio when turret fires (line ~110)
   - No impact/hit sounds

3. **`src/ai/enemyFSM.ts`**
   - ❌ No audio when enemies attack

---

## 🔍 Specific Missing Calls

### Colonist Ranged Fire
**Location:** `src/game/combat/pawnCombat.ts` ~line 650

**Current code** (no audio):
```typescript
game.bullets.push(bullet);
const muzzle = createMuzzleFlash(c.x, c.y, ang);
game.particles.push(...muzzle);
```

**Should be** (with audio):
```typescript
game.bullets.push(bullet);
const muzzle = createMuzzleFlash(c.x, c.y, ang);
game.particles.push(...muzzle);

// Play weapon fire sound
const weaponDefName = c.inventory?.equipment?.weapon?.defName;
const audioKey = getWeaponFireAudio(weaponDefName);
if (audioKey) {
  game.playAudio(audioKey, { volume: 0.9, rng: Math.random });
}
```

### Colonist Melee Attack
**Location:** `src/game/combat/pawnCombat.ts` ~line 470

**Current code** (no audio):
```typescript
target.hp -= dmg;
// Stun logic...
```

**Should be** (with audio):
```typescript
target.hp -= dmg;

// Play melee impact sound
const weaponDefName = c.inventory?.equipment?.weapon?.defName;
const audioKey = getMeleeImpactAudio(weaponDefName);
if (audioKey) {
  game.playAudio(audioKey, { volume: 0.85, rng: Math.random });
}

// Stun logic...
```

### Turret Fire
**Location:** `src/game/combat/combatSystem.ts` ~line 110

**Current code** (no audio):
```typescript
game.bullets.push(bullet);
const muzzleFlash = createMuzzleFlash(bc.x, bc.y, ang);
game.particles.push(...muzzleFlash);
(b as any).flashTimer = 0.08;
(b as any).cooldown = fireRate;
```

**Should be** (with audio):
```typescript
game.bullets.push(bullet);
const muzzleFlash = createMuzzleFlash(bc.x, bc.y, ang);
game.particles.push(...muzzleFlash);

// Play turret fire sound
game.playAudio('weapons.ranged.autopistol.fire', { 
  volume: 0.7, 
  rng: Math.random 
});

(b as any).flashTimer = 0.08;
(b as any).cooldown = fireRate;
```

---

## 🛠️ Implementation Plan

### Step 1: Create Weapon Audio Mapping

Similar to building audio, create `src/game/audio/weaponAudioMap.ts`:

```typescript
import type { AudioKey } from './AudioManager';

export interface WeaponAudioConfig {
  fire?: AudioKey;      // Ranged weapon fire sound
  impact?: AudioKey;    // Melee weapon impact sound
  reload?: AudioKey;    // Reload sound (future)
  dryFire?: AudioKey;   // Out of ammo sound (future)
}

const WEAPON_AUDIO_MAP: Record<string, WeaponAudioConfig> = {
  // Ranged weapons
  Pistol: {
    fire: 'weapons.ranged.autopistol.fire'
  },
  Rifle: {
    fire: 'weapons.ranged.assault_rifle.fire'
  },
  
  // Melee weapons
  Club: {
    impact: 'weapons.melee.club.impact'
  },
  Knife: {
    impact: 'weapons.melee.sword.impact'
  }
};

export function getWeaponFireAudio(weaponDefName?: string): AudioKey | null {
  if (!weaponDefName) return 'weapons.ranged.autopistol.fire'; // Default
  return WEAPON_AUDIO_MAP[weaponDefName]?.fire || null;
}

export function getMeleeImpactAudio(weaponDefName?: string): AudioKey | null {
  if (!weaponDefName) return 'weapons.melee.club.impact'; // Default
  return WEAPON_AUDIO_MAP[weaponDefName]?.impact || null;
}
```

### Step 2: Update Colonist Combat

Modify `src/game/combat/pawnCombat.ts`:

```typescript
import { getWeaponFireAudio, getMeleeImpactAudio } from '../audio/weaponAudioMap';

// In updateColonistCombat(), after creating bullet:
const weaponDefName = c.inventory?.equipment?.weapon?.defName;
const audioKey = getWeaponFireAudio(weaponDefName);
if (audioKey) {
  game.playAudio(audioKey, { volume: 0.9, rng: Math.random });
}

// In melee attack section, after dealing damage:
const impactAudioKey = getMeleeImpactAudio(weaponDefName);
if (impactAudioKey) {
  game.playAudio(impactAudioKey, { volume: 0.85, rng: Math.random });
}
```

### Step 3: Update Turret Combat

Modify `src/game/combat/combatSystem.ts`:

```typescript
// In updateTurret(), after creating bullet:
game.playAudio('weapons.ranged.autopistol.fire', { 
  volume: 0.7, 
  rng: Math.random 
});
```

### Step 4: Optional Enhancements

- **Impact sounds**: Play on bullet hit (in `updateProjectiles()`)
- **Spatial audio**: Reduce volume based on distance from camera
- **Miss sounds**: Different sound for missed shots
- **Reload sounds**: When colonist reloads (future feature)

---

## 📝 Files to Modify

1. ✏️ `src/game/audio/weaponAudioMap.ts` (NEW - 60 lines)
2. ✏️ `src/game/combat/pawnCombat.ts` (3 additions)
3. ✏️ `src/game/combat/combatSystem.ts` (1 addition)

---

## 🎯 Expected Results

After implementation:

✅ **Colonist ranged fire**: Pistol/rifle sounds play on shot
✅ **Colonist melee**: Club/sword impact sounds play on hit
✅ **Turret fire**: Autopistol sound plays when turret shoots
✅ **Audio variants**: Random selection from sound pool
✅ **Proper volume**: Category-based volume control works
✅ **No hardcoding**: All audio looked up from weaponAudioMap

---

## 🔊 Audio Volume Recommendations

| Weapon Type | Volume | Reasoning |
|-------------|--------|-----------|
| Colonist Ranged | 0.9 | Player-controlled, should be loud/impactful |
| Colonist Melee | 0.85 | Slightly quieter than guns |
| Turret Fire | 0.7 | Automated, shouldn't overwhelm other sounds |
| Impact/Hit | 0.6 | Background feedback, not primary |

---

## 🧪 Testing

Debug console commands to test:

```bash
# Draft colonist and give weapons
game.colonists[0].isDrafted = true
game.colonists[0].inventory.equipment.weapon = game.itemDatabase.createItem('Pistol')

# Spawn enemy to attack
spawn enemy

# Test melee
game.colonists[0].inventory.equipment.weapon = game.itemDatabase.createItem('Club')

# Test turret
spawn turret
spawn enemy
```

**Expected**: Hear weapon sounds during combat.

---

## 🚨 Current Impact

**Players currently experience:**
- ❌ Silent gunfire (only visual muzzle flash)
- ❌ Silent melee attacks (only animation)
- ❌ Silent turret shots
- ⚠️ Combat feels hollow/unresponsive without audio feedback

**This is a critical UX issue** - weapon sounds are essential combat feedback!

---

## 📚 Related Systems

- **AudioManager**: Already working, just needs calls
- **Audio Manifest**: Already has all weapon sounds
- **Building Audio**: Same pattern, proven to work
- **Particle System**: Visual effects work, just missing audio

---

**Status**: Ready for implementation
**Difficulty**: Low (simple function calls)
**Impact**: High (major UX improvement)
**Files**: 3 files to modify/create
**Lines of code**: ~40 lines total
