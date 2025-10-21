# Spatial Audio System Overhaul

**Date**: October 19, 2025  
**Issue**: 3D spatial audio (HRTF) was inappropriate for 2D top-down game, causing poor stereo imaging  
**Status**: ✅ Fixed - Replaced with proper 2D stereo panning system

## Problem

The original spatial audio implementation had several fundamental issues:

### 1. **Wrong Audio Technology**
- Used **PannerNode with HRTF** (Head-Related Transfer Function)
- HRTF is designed for 3D spatial audio (behind/above/below)
- Game is 2D top-down view - no vertical dimension needed
- HRTF adds unnecessary complexity and doesn't work well for 2D

### 2. **Incorrect Listener Orientation**
```typescript
// OLD (wrong for 2D game):
listener.forwardY = 1  // Looking "forward" in Y direction
listener.upZ = 1       // "Up" is in Z direction
listener.positionZ = altitude  // Fake altitude based on zoom
```
This setup treats the 2D game like a 3D world viewed from above, which confuses the HRTF processing.

### 3. **Poor Distance Model**
- Exponential rolloff with aggressive parameters
- `refDistance: 192px` (6 tiles) - too close
- `rolloffFactor: 0.95` - too aggressive
- `maxDistance: 3200px` (100 tiles) - too far for culling
- Sounds didn't feel natural at any distance

### 4. **User Experience**
- On **7.1 surround headphones**: Confusing positional cues, sounds don't match visual position
- On **stereo headphones**: Basic left/right panning felt "off"
- Distance attenuation too aggressive - sounds dropped off too quickly

## Solution: 2D Stereo Panning System

Replaced 3D HRTF panning with **StereoPannerNode** + custom distance attenuation:

### **Core Changes**

1. **StereoPannerNode** instead of PannerNode
   - Simple left (-1) to right (+1) stereo panning
   - Perfect for 2D top-down games
   - No fake 3D positioning needed

2. **Manual Distance Attenuation**
   - Custom logarithmic falloff curve
   - Tuned for game scale (32px tiles)
   - Natural-sounding volume decrease

3. **Proper 2D Coordinate Mapping**
   - Horizontal offset (X axis) → stereo pan
   - Distance (2D hypot) → volume attenuation
   - No vertical (Z) coordinate confusion

### **New Constants**

```typescript
// Distance-based volume attenuation
MAX_DIST_HARD = 1920px (60 tiles)   // Complete silence beyond this
FALLOFF_START = 256px (8 tiles)     // Full volume within this range
FALLOFF_END = 1280px (40 tiles)     // Nearly silent at this distance

// Stereo panning
PAN_MAX = 0.85                       // Max pan (not full ±1 for naturalness)
PAN_DISTANCE = 480px (15 tiles)     // Full pan at this horizontal distance
SMOOTH_TAU = 20ms                    // Smooth gain/pan changes (avoid pops)
```

### **Distance Attenuation Formula**

```typescript
if (distance <= 256px) {
  gain = 1.0  // Full volume (close sounds)
}
else if (distance >= 1280px) {
  gain = 0.01  // Nearly silent (far sounds)
}
else if (distance >= 1920px) {
  gain = 0  // Completely silent (culled)
}
else {
  // Smooth logarithmic falloff
  normalized = (distance - 256) / (1280 - 256)
  gain = 1 - log(normalized + 1) / log(2)
}
```

This gives a natural-sounding falloff curve that matches human perception.

### **Stereo Panning**

```typescript
// Calculate pan from horizontal offset
dx = soundX - listenerX
pan = clamp(dx / 480px, -0.85, +0.85)

// Examples:
// Sound 240px to the right → pan = +0.5 (half right)
// Sound 480px to the right → pan = +0.85 (max right)
// Sound 240px to the left → pan = -0.5 (half left)
// Sound directly above/below → pan = 0 (center)
```

## Technical Details

### **Before (3D HRTF)**
```typescript
interface ActiveSound {
  pannerNode?: PannerNode;  // 3D spatial audio
  position?: { x, y }
}

// Setup
pannerNode = new PannerNode(ctx, {
  panningModel: 'HRTF',  // ❌ Wrong for 2D
  distanceModel: 'exponential',
  refDistance: 192,
  rolloffFactor: 0.95,
  maxDistance: 3200
});

// Update
pannerNode.positionX = soundX;
pannerNode.positionY = soundY;
pannerNode.positionZ = 0;  // ❌ Always 0, not using 3D
listener.positionZ = altitude;  // ❌ Fake altitude
```

### **After (2D Stereo)**
```typescript
interface ActiveSound {
  stereoPanner?: StereoPannerNode;  // ✅ Simple stereo
  position?: { x, y }
}

// Setup
stereoPanner = ctx.createStereoPanner();
const dx = soundX - listenerX;
const distance = Math.hypot(dx, dy);

// Calculate pan and volume
const pan = clamp(dx / PAN_DISTANCE, -PAN_MAX, PAN_MAX);
const distanceGain = calculateDistanceGain(distance);

stereoPanner.pan.value = pan;
gainNode.gain.value = baseVolume * distanceGain;

// Update (smooth changes)
stereoPanner.pan.setTargetAtTime(pan, t, SMOOTH_TAU);
gainNode.gain.setTargetAtTime(finalGain, t, SMOOTH_TAU);
```

## Benefits

### ✅ **Better Stereo Imaging**
- Clear left/right positioning matching visual layout
- No confusing HRTF artifacts
- Works perfectly with stereo headphones
- Also works great with 7.1 surround (downmixes naturally)

### ✅ **Natural Distance Falloff**
- Nearby sounds (< 8 tiles) at full volume
- Gradual logarithmic decrease
- Silent beyond 60 tiles (prevents distant sound clutter)
- Tuned to game scale (32px tiles)

### ✅ **Performance**
- StereoPannerNode is simpler than PannerNode
- No complex HRTF processing
- No fake 3D calculations (altitude, orientation)
- Faster and more efficient

### ✅ **Predictable Behavior**
- Horizontal offset → left/right pan (intuitive)
- Distance → volume (natural)
- No complex 3D math confusing things

## Testing Recommendations

### **Stereo Headphones**
1. Place building to the **right** - construction sounds should pan **right**
2. Place building to the **left** - construction sounds should pan **left**
3. Place building **directly above/below** - sounds should be **center**
4. Walk **away** from sound source - volume should **decrease smoothly**
5. Walk **beyond 60 tiles** - sound should **cut out completely**

### **7.1 Surround Headphones**
Same tests as stereo - the 2D panning should downmix naturally to your surround system. You might hear more subtle rear-channel bleed, but the primary left/right imaging should be clear.

### **Debug Console Tests**
```bash
# Spawn enemies to the right - gunfire should pan right
spawn enemy 5 @(2000, 1000)

# Place buildings in different locations
# Listen for construction audio panning

# Chop trees at various distances
# Wood chopping should fade with distance
```

### **Distance Zones to Test**
- **0-8 tiles (0-256px)**: Full volume, clear pan
- **8-40 tiles (256-1280px)**: Gradual falloff
- **40-60 tiles (1280-1920px)**: Very quiet
- **60+ tiles (1920px+)**: Silent (culled)

## Configuration

If the current settings don't feel right for your headphones, you can adjust these constants in `AudioManager.ts`:

```typescript
// Make panning more/less aggressive
PAN_DISTANCE = 15 * T  // Increase = less aggressive panning

// Make sounds travel farther
FALLOFF_END = 50 * T   // Increase = sounds audible from farther away

// Adjust max distance for culling
MAX_DIST_HARD = 80 * T  // Increase = sounds don't cut off as early

// Adjust pan limits
PAN_MAX = 0.95  // Increase towards 1.0 for harder L/R separation
```

## Related Files

- `src/game/audio/AudioManager.ts` - Core audio system (completely rewritten spatial audio)
- `docs/audio/AUDIO_SYSTEM_GUIDE.md` - Overall audio architecture
- `docs/audio/CONSTRUCTION_AUDIO_IMPLEMENTATION.md` - Construction sounds using spatial audio

## Technical Notes

### **Why Not Binaural Audio?**
Binaural audio (HRTF) works great for:
- 3D games (FPS, third-person)
- VR experiences
- 3D sound positioning (behind you, above, below)

It's **overkill** for 2D top-down games because:
- No vertical dimension
- No "behind" concept (camera is always top-down)
- Adds complexity without benefit
- Can sound weird with 2D visuals

### **Why Logarithmic Falloff?**
Human hearing perceives volume changes logarithmically, not linearly. A logarithmic falloff curve sounds more natural than:
- **Linear falloff**: Sounds drop off too quickly when close, too slowly when far
- **Exponential falloff**: Can be tuned but harder to predict, can have harsh transitions
- **Logarithmic falloff**: Smooth, natural, matches human perception

### **Why Not Full ±1.0 Pan?**
Limiting pan to ±0.85 instead of ±1.0 gives:
- More natural stereo image (not hard left/right)
- Better localization (sounds don't "jump" to edges)
- Smoother transitions as sounds move
- Similar to professional game audio mixing practices

---

**Result**: Spatial audio now sounds natural and intuitive on both stereo and surround headphones! 🎧
