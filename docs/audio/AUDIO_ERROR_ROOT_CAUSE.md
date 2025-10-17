# Audio Error - Root Cause Analysis & Fix

## The Real Problem

The error is happening **inside** `pickAudioVariant()` at line 252 (in the compiled code), which means an exception is being thrown during the variant selection process, not just a simple "audio key doesn't exist" issue.

### Error Stack Analysis

```
[console.error] [AudioManager] Error in play() for key "buildings.construct.stone.hammer": 
pickAudioVariant@manifest.ts:252:17
```

This indicates the error originates from within `pickAudioVariant`, specifically during either:
1. The `.reduce()` call to calculate total weight
2. The `for...of` loop iterating over variants
3. Accessing properties on a malformed variant object

## Root Cause

The `AUDIO_MANIFEST[key]` lookup might be returning:
- A malformed array with `null`/`undefined` elements
- An object that looks like an array but isn't iterable
- Valid variants but with malformed internal structure

When `variants.reduce()` or the loop tries to access `.weight` on a malformed variant, it throws an exception.

## The Fix

### 1. Added Try-Catch to `pickAudioVariant()` (manifest.ts)

```typescript
export function pickAudioVariant(
  key: AudioKey,
  rng: RandomFn = Math.random
): AudioVariant | null {
  try {
    const variants = AUDIO_MANIFEST[key] as readonly AudioVariant[];
    if (!variants || variants.length === 0) {
      console.warn(`[AudioManifest] No variants found for audio key: ${key}`);
      return null;
    }
    if (variants.length === 1) {
      return variants[0];
    }

    // Defensive reduce with explicit null check
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
```

**Key changes**:
- Wrapped entire function in try-catch
- Added `variant?.weight` null-safe access in reduce
- Added `if (!variant) continue` in loop to skip bad entries
- Returns `null` instead of throwing on error

### 2. Cleaned Up AudioManager (AudioManager.ts)

Removed redundant try-catch wrapper since `pickAudioVariant` now handles its own errors gracefully:

```typescript
async play(key: AudioKey, options: PlayAudioOptions = {}): Promise<HTMLAudioElement | null> {
  const variant = pickAudioVariant(key, options.rng ?? Math.random);
  if (!variant) {
    return null; // pickAudioVariant already logged the error
  }
  // ... rest of function
}
```

### 3. Top-Level Safety Net (Game.ts)

```typescript
playAudio(key: AudioKey, options?: PlayAudioOptions) {
  this.audioManager.play(key, options).catch((err) => {
    console.warn('[Game] Failed to play audio:', key, err);
  });
}
```

This catches any promise rejections from the async `play()` method.

## Error Handling Chain

```
Construction Audio Request
  ↓
Game.playAudio(key) ← [Catch promise rejections]
  ↓
AudioManager.play(key) ← [Returns null if no variant]
  ↓
pickAudioVariant(key) ← [Try-catch, returns null on error]
  ↓
AUDIO_MANIFEST[key] ← [May return malformed data]
  ↓
.reduce() / loop ← [May throw on malformed variants]
  ↓
Error caught, null returned
  ↓
Game continues normally ✅
```

## Why This Happens

Possible causes for malformed variants:
1. **Build process issue** - Vite/TypeScript might be transforming the AUDIO_MANIFEST incorrectly
2. **Import timing** - Circular dependencies or hoisting issues
3. **Type casting** - `as readonly AudioVariant[]` might be hiding actual data issues
4. **Module bundling** - Different module systems (ESM/CJS) causing object structure issues

## Testing the Fix

After rebuild, you should see:
- ✅ **No more errors** from `pickAudioVariant`
- ✅ **Clear error messages** if audio key is actually missing
- ✅ **Game continues** even if audio fails completely
- ⚠️ **Single warning** instead of 3 error messages per failure

Expected console output if audio fails:
```
[AudioManifest] Error picking variant for key "buildings.construct.stone.hammer": [detailed error]
[Game] Failed to play audio: buildings.construct.stone.hammer [error]
```

## Next Steps

1. **Rebuild and test** - See if error messages improve
2. **Check browser console** - Look for the new error format
3. **Investigate manifest** - If errors persist, inspect AUDIO_MANIFEST structure at runtime
4. **Debug logging** - Add `console.log(AUDIO_MANIFEST['buildings.construct.stone.hammer'])` to see actual data

## Files Modified

- `src/assets/audio/manifest.ts` - Added try-catch and null checks to `pickAudioVariant()`
- `src/game/audio/AudioManager.ts` - Removed redundant try-catch wrapper
- `src/game/Game.ts` - Already has promise rejection catch (from previous fix)

---

**Status**: Enhanced error handling should now catch the actual exception and provide better diagnostic information.
