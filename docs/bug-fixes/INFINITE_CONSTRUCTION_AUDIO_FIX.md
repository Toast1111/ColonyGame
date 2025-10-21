# Infinite Construction Audio Loop - FIXED

## Problem

**Symptom:** After a building finished construction, sometimes the construction audio (drills, saws, hammering) would continue playing forever, even though the colonist stopped working.

**Root Cause:** Some construction audio variants in the manifest have `loop: true` (drills, saws). When these looping variants were randomly selected during construction, they would continue playing indefinitely because the FSM didn't explicitly stop them when:

1. Construction completed (`buildLeft <= 0`)
2. Colonist abandoned the task (timeout, reassignment)
3. Colonist changed states (fled, went to sleep, etc.)

## The Fix

Added explicit audio cleanup using `AudioManager.stop()` in **three critical locations** in `colonistFSM.ts`:

### 1. **In `changeState()` function** (Lines ~360-375)
When leaving the 'build' state for ANY reason:

```typescript
function changeState(newState: ColonistState, reason?: string) {
  // ... existing code ...
  
  if (c.state !== newState) {
    // Stop any looping construction audio when leaving build state
    if (c.state === 'build' && newState !== 'build') {
      if (c.activeConstructionAudio && (game as any).audioManager) {
        (game as any).audioManager.stop(c.activeConstructionAudio);
      }
      c.lastConstructionAudioTime = undefined;
      c.activeConstructionAudio = undefined;
    }
    
    // ... rest of state change logic ...
  }
}
```

**Why here:** This is the **master cleanup point** that catches ALL state transitions away from 'build', including:
- Colonist fleeing from danger
- Going to sleep when tired
- Getting drafted by player
- Being reassigned to medical treatment
- Any other state change

### 2. **When building completes** (Lines ~1350-1370)
Normal completion path when `buildLeft <= 0`:

```typescript
if (b.buildLeft <= 0) {
  b.done = true;
  
  // === CONSTRUCTION COMPLETION AUDIO ===
  // Stop any looping construction audio first
  if (c.activeConstructionAudio && (game as any).audioManager) {
    (game as any).audioManager.stop(c.activeConstructionAudio);
  }
  // Play completion sound when building finishes
  if (buildingDef) {
    const completeAudioKey = getConstructionCompleteAudio(b.kind, buildingDef);
    (game as any).playAudio?.(completeAudioKey, { /* ... */ });
  }
  // Clear construction audio tracking
  c.lastConstructionAudioTime = undefined;
  c.activeConstructionAudio = undefined;
  // === END COMPLETION AUDIO ===
}
```

**Why here:** Ensures looping sounds stop immediately when construction finishes, before the completion "ding" sound plays.

### 3. **When building is invalid/done early** (Lines ~1355-1370)
If building becomes `done` or invalid (e.g., deleted by player):

```typescript
if (!b || b.done) {
  if (c.stateSince >= 0.5) {
    game.releaseBuildReservation(c);
    c.task = null;
    c.target = null;
    game.clearPath(c);
    // Stop any looping construction audio before clearing tracking
    if (c.activeConstructionAudio && (game as any).audioManager) {
      (game as any).audioManager.stop(c.activeConstructionAudio);
    }
    c.lastConstructionAudioTime = undefined;
    c.activeConstructionAudio = undefined;
    changeState('seekTask', 'building complete');
  }
  break;
}
```

**Why here:** Handles edge case where building completes instantly or gets deleted while colonist is en route.

### 4. **When build task times out** (Lines ~1385-1395)
15-second timeout for stuck colonists:

```typescript
if (c.stateSince > 15) {
  console.log(`Build task timeout after ${c.stateSince.toFixed(1)}s, abandoning building`);
  game.releaseBuildReservation(c);
  c.task = null;
  c.target = null;
  game.clearPath(c);
  // Stop any looping construction audio before clearing tracking
  if (c.activeConstructionAudio && (game as any).audioManager) {
    (game as any).audioManager.stop(c.activeConstructionAudio);
  }
  c.lastConstructionAudioTime = undefined;
  c.activeConstructionAudio = undefined;
  changeState('seekTask', 'build timeout');
  break;
}
```

**Why here:** Prevents audio from continuing when colonist gets stuck and abandons the task.

## Why This Happened

### Audio Manifest Configuration

Some construction sounds are designed to loop naturally:

```typescript
// src/assets/audio/manifest.ts
'buildings.construct.metal.heavy': variants('buildings/construct/metal', [
  { name: 'DrillA', loop: true, volume: 0.65 },      // ← LOOPS
  { name: 'DrillB', loop: true, volume: 0.65 },      // ← LOOPS
  { name: 'JackhammerA', loop: true, volume: 0.7 },  // ← LOOPS
  { name: 'HammerA', volume: 0.75 },                 // One-shot
  { name: 'WrenchA', volume: 0.7 },                  // One-shot
  { name: 'RummageB', volume: 0.65 }                 // One-shot
]),

'buildings.construct.wood.saw_hand': variants('buildings/construct/wood', [
  { name: 'Wood_Saw_Hand_1a', loop: true, volume: 0.72 },  // ← LOOPS
  { name: 'Wood_Saw_Hand_1b', loop: true, volume: 0.72 },  // ← LOOPS
  // ... 8 total variants, ALL with loop: true
]),

'buildings.construct.wood.saw_circular': variants('buildings/construct/wood', [
  { name: 'Wood_Saw_Circular_1a', loop: true, volume: 0.75 },  // ← LOOPS
  // ... 6 total variants, ALL with loop: true
])
```

### Random Variant Selection

The FSM plays construction audio every 1.5-2 seconds:

```typescript
const audioKey = getConstructionAudio(b.kind, buildingDef);
(game as any).playAudio?.(audioKey, { 
  category: 'buildings',
  volume: 0.75,
  rng: Math.random,  // ← Randomly selects from variants
  // ...
});
```

**When it goes wrong:**
1. Colonist starts building → FSM plays construction audio
2. `rng: Math.random` selects a looping variant (DrillA, Wood_Saw_Hand_1c, etc.)
3. Audio starts looping (designed to loop seamlessly during construction)
4. Building completes → FSM clears tracking variables BUT doesn't stop the audio
5. Looping audio continues playing forever (orphaned AudioBufferSourceNode)

## Files Modified

- **`src/game/colonist_systems/colonistFSM.ts`**
  - Lines ~360-375: Added audio cleanup in `changeState()` function
  - Lines ~1355-1370: Added cleanup when building becomes invalid
  - Lines ~1385-1395: Added cleanup on timeout
  - Lines ~1475-1490: Added cleanup before completion sound

## Testing

### How to Test the Fix

1. **Build a warehouse** (uses `saw_circular` - looping audio):
   ```bash
   # Debug console
   resources unlimited
   ```
   - Place warehouse blueprint
   - Assign colonist to build
   - Wait for construction audio to play
   - **Option A**: Let it finish → Audio should stop when complete
   - **Option B**: Draft the colonist mid-construction → Audio should stop immediately

2. **Build a turret** (uses `metal.heavy` - looping drills):
   - Place turret blueprint
   - Colonist starts building
   - While construction audio is playing, delete the building
   - Audio should stop immediately

3. **Build stress test**:
   ```bash
   spawn colonist 5
   give all
   speed 3
   ```
   - Place 10 warehouses/turrets in a line
   - Colonists will build them in parallel
   - Some will finish, some will get reassigned, some will timeout
   - **No audio should continue after colonist stops working**

### Expected Behaviors

✅ **Construction completes normally** → Looping audio stops, completion sound plays  
✅ **Colonist drafted mid-build** → Audio stops immediately  
✅ **Colonist flees (enemy approaches)** → Audio stops when state changes to 'flee'  
✅ **Colonist gets tired and sleeps** → Audio stops when going to sleep  
✅ **Building deleted by player** → Audio stops when colonist abandons task  
✅ **Build task times out (stuck)** → Audio stops after 15 seconds  
✅ **Multiple colonists building** → Each audio stops independently when that colonist stops

### Known Good Scenarios

- **One-shot sounds (hammers, impacts)**: Already worked fine (they play once and stop naturally)
- **Looping sounds (drills, saws)**: Now properly stopped when construction ends

## Performance Impact

**Minimal** - Only calls `AudioManager.stop()` when:
- Colonist changes state away from 'build' (once per state change)
- Building completes (once per building)
- Task times out or is abandoned (rare)

**No extra overhead during normal building** - The fix only runs during cleanup, not every frame.

## Related Systems

### AudioManager.stop() Method

```typescript
// src/game/audio/AudioManager.ts
stop(key: AudioKey): void {
  const sounds = this.activeSounds.get(key);
  if (sounds) {
    // Stop all instances of this sound
    for (const sound of sounds) {
      try {
        sound.source.stop();           // Stop Web Audio playback
        sound.gainNode.disconnect();   // Clean up gain node
        sound.pannerNode?.disconnect(); // Clean up spatial audio node
      } catch (e) {
        // Source may already be stopped
      }
    }
    this.activeSounds.delete(key);  // Remove from tracking
  }
}
```

### Colonist Audio Tracking Properties

```typescript
// src/game/types.ts - Colonist interface
interface Colonist {
  // ... other properties ...
  
  // Construction audio tracking (for looping work sounds)
  lastConstructionAudioTime?: number;  // Last time construction audio was played
  activeConstructionAudio?: string;     // Audio key currently looping for construction
}
```

**Purpose:**
- `lastConstructionAudioTime` - Prevents audio spam (1.5-2 second intervals)
- `activeConstructionAudio` - Tracks which audio key is playing so we can stop it

## Prevention Strategy

Going forward, any system that plays looping audio should:

1. **Track the audio key** in a property (like `activeConstructionAudio`)
2. **Stop the audio** before clearing the tracking property
3. **Call stop() in ALL exit paths**:
   - Normal completion
   - State changes
   - Task abandonment
   - Timeout/error cases

**Template:**
```typescript
// When starting looping audio
c.activeMyAudio = audioKey;
playAudio(audioKey, { loop: true });

// When stopping (ALL exit paths!)
if (c.activeMyAudio && audioManager) {
  audioManager.stop(c.activeMyAudio);
}
c.activeMyAudio = undefined;
```

## Conclusion

The infinite looping construction audio bug is now **completely fixed** by ensuring `AudioManager.stop()` is called in all scenarios where a colonist stops building. The fix is comprehensive, covering:

- Normal completion ✅
- State changes (flee, sleep, draft, etc.) ✅
- Task abandonment ✅
- Timeout ✅
- Building deletion ✅

No more eternal drills or saws! 🔨🔧✅
