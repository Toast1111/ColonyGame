# Audio Debugging - Enhanced Diagnostics

## What I Added

Enhanced debug logging to `pickAudioVariant()` to show exactly what's happening:

```typescript
// 1. Check if key exists before accessing
if (!(key in AUDIO_MANIFEST)) {
  console.warn(`[AudioManifest] Key "${key}" not found in AUDIO_MANIFEST`);
  return null;
}

// 2. Debug logging for stone.hammer specifically
if (key === 'buildings.construct.stone.hammer') {
  console.log('[DEBUG] Checking variants for stone.hammer:', {
    keyExists: key in AUDIO_MANIFEST,
    rawValue: AUDIO_MANIFEST[key],
    variants: variants,
    isArray: Array.isArray(variants),
    length: variants?.length,
    firstVariant: variants?.[0]
  });
}

// 3. Enhanced error logging
catch (error) {
  console.error(`[AudioManifest] Error picking variant for key "${key}":`, error);
  console.error(`[AudioManifest] Error message:`, error instanceof Error ? error.message : String(error));
  console.error(`[AudioManifest] Error stack:`, error instanceof Error ? error.stack : 'No stack');
  return null;
}
```

## What to Look For

When you build a wall now, check the browser console for:

### 1. Debug Output
```
[DEBUG] Checking variants for stone.hammer: {
  keyExists: true/false,
  rawValue: [...],
  variants: [...],
  isArray: true/false,
  length: 5,
  firstVariant: { file: "...", volume: 0.8 }
}
```

This will show us:
- ✅ If the key exists in AUDIO_MANIFEST
- ✅ What the raw manifest value is
- ✅ If it's actually an array
- ✅ What the first variant looks like

### 2. Error Details
```
[AudioManifest] Error picking variant for key "buildings.construct.stone.hammer": [Error object]
[AudioManifest] Error message: "Cannot read property 'weight' of undefined"
[AudioManifest] Error stack: [full stack trace]
```

This will show us:
- ✅ The exact error message
- ✅ The full stack trace
- ✅ What line is actually failing

## Possible Issues We'll Identify

Based on the debug output, we'll know if:

1. **Key doesn't exist** → `keyExists: false`
   - Fix: Check spelling or add to manifest

2. **Not an array** → `isArray: false`
   - Fix: `variants()` helper is broken

3. **Empty array** → `length: 0`
   - Fix: Check `variants()` function

4. **Malformed variant** → `firstVariant: undefined` or weird structure
   - Fix: Check `variants()` mapping logic

5. **Import/bundling issue** → `rawValue: undefined`
   - Fix: Module loading problem, check imports

## Next Steps

1. **Check console** - Look for the `[DEBUG]` message
2. **Share output** - Copy the debug object and error details
3. **Identify root cause** - We'll know exactly what's wrong
4. **Apply fix** - Once we see the actual data, fix will be obvious

---

**The dev server should auto-reload now. Try building a wall and check the console!** 🔍
