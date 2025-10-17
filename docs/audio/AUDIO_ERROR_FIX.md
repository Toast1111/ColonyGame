# Audio Error Fix - Construction Sound Unhandled Promise Rejection

## Problem
Unhandled promise rejections were occurring when colonists built walls (or any construction). The error manifested as:
```
[unhandledrejection] Bc@https://toast1111.github.io/ColonyGame/...
playAudio@https://toast1111.github.io/ColonyGame/...
```

## Root Cause
The `playAudio()` method in `Game.ts` was calling `this.audioManager.play()`, which returns a Promise, but wasn't handling potential promise rejections. When audio failed to load or play (network issues, codec problems, autoplay restrictions, etc.), the unhandled promise rejection would crash the browser console.

## Solution
Added `.catch()` handler to the `playAudio()` method in `Game.ts`:

```typescript
// BEFORE (problematic):
playAudio(key: AudioKey, options?: PlayAudioOptions) {
  this.audioManager.play(key, options);
}

// AFTER (fixed):
playAudio(key: AudioKey, options?: PlayAudioOptions) {
  this.audioManager.play(key, options).catch((err) => {
    console.warn('[Game] Failed to play audio:', key, err);
  });
}
```

## Impact
- ✅ **No more unhandled promise rejections** when audio fails to play
- ✅ **Graceful degradation** - game continues even if audio fails
- ✅ **Better debugging** - warnings logged to console for investigation
- ✅ **Consistent error handling** - matches AudioManager's internal error handling pattern

## Files Modified
- `src/game/Game.ts` - Added promise rejection handler to `playAudio()` method

## Testing
Build successful:
```bash
npm run build
# ✓ TypeScript compilation successful
# ✓ Vite build successful (538.03 kB)
```

## Why This Happens
Audio can fail to play for several reasons:
1. **Network issues** - Audio files fail to load on GitHub Pages
2. **Autoplay restrictions** - Modern browsers block autoplay without user interaction
3. **Codec support** - Browser doesn't support `.ogg` format
4. **Resource loading** - Audio file not yet loaded when play() is called
5. **User interaction** - Some browsers require user gesture before playing audio

The AudioManager already has error handling in its `play()` method, but the Game wrapper was not catching the promise rejection, causing it to bubble up as an unhandled error.

## Additional Notes
- AudioManager's internal `element.play().catch()` handles HTMLAudioElement playback errors
- Game's wrapper `playAudio().catch()` handles Promise rejection errors
- Both layers provide defense-in-depth error handling

## Related Systems
- Construction audio system (`colonistFSM.ts` lines 1419-1441)
- Combat audio (`pawnCombat.ts`, `combatSystem.ts`)
- UI audio (click sounds, etc.)

All systems using `game.playAudio()` now benefit from proper error handling.

---

**Status**: ✅ FIXED - Ready for deployment
