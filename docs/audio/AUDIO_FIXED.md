# Audio System - FIXED! 🎉

## The Bug

**Root Cause**: Passing `Math.random()` instead of `Math.random` to the audio system.

### The Problem

In `colonistFSM.ts` line 1436:
```typescript
// ❌ WRONG - Calls Math.random() immediately, passes the NUMBER result (0.7257...)
rng: Math.random()

// ✅ CORRECT - Passes the FUNCTION itself
rng: Math.random
```

### Why This Broke

The `pickAudioVariant()` function expects `rng` to be a **function** that it can call:
```typescript
let roll = rng() * totalWeight;  // Tries to call rng as a function
```

When you pass `Math.random()` (with parentheses):
1. `Math.random()` executes immediately → returns a number (e.g., `0.7257`)
2. Audio system receives `rng: 0.7257` (a number, not a function)
3. When it tries `rng()`, it fails: **"0.7257 is not a function"**

### The Error Message

```
Error message: rng is not a function. (In 'rng()', 'rng' is 0.7257325243977266)
```

This clearly showed that `rng` was a number instead of a function!

## The Fix

Changed line 1436 in `src/game/colonist_systems/colonistFSM.ts`:

```typescript
// BEFORE
(game as any).playAudio?.(audioKey, { 
  category: 'buildings',
  volume: 0.75,
  rng: Math.random() // ❌ Called immediately
});

// AFTER
(game as any).playAudio?.(audioKey, { 
  category: 'buildings',
  volume: 0.75,
  rng: Math.random  // ✅ Pass the function
});
```

## Files Modified

1. **src/game/colonist_systems/colonistFSM.ts** - Fixed construction audio call
2. **src/assets/audio/manifest.ts** - Cleaned up debug logging

## Testing

After the dev server reloads:
- ✅ **Build a wall** - You should hear construction sounds!
- ✅ **No console errors** - Audio should play without errors
- ✅ **Random variants** - Different hammer sounds will play

## How Random Variant Selection Works

```typescript
// AudioManager calls pickAudioVariant with the function
const variant = pickAudioVariant(key, Math.random);

// pickAudioVariant calls the function when it needs a random number
let roll = rng() * totalWeight;  // Calls Math.random() internally
```

This allows the audio system to:
1. Call `rng()` multiple times if needed
2. Use custom random functions for testing
3. Control randomness deterministically

## Common JavaScript Gotcha

This is a classic JavaScript mistake:

```javascript
// Function reference (correct for callbacks)
setTimeout(myFunction, 1000);     // ✅ Pass function
array.map(transformFunction);     // ✅ Pass function

// Function call (executes immediately)
setTimeout(myFunction(), 1000);   // ❌ Calls now, passes return value
array.map(transformFunction());   // ❌ Calls now, passes return value
```

## Why It Took So Long to Find

The error stack trace pointed to `pickAudioVariant`, not the calling code, making it seem like the audio system was broken. The enhanced debug logging finally showed the actual error message: **"rng is not a function"**, which immediately revealed the issue.

---

**Status**: ✅ FIXED - Construction audio should now play correctly!

**Try it now**: Build a wall and listen for hammer sounds! 🔨🎵
