# Enhanced Particle System Documentation

## Overview
Complete overhaul of the particle system to add dynamic behaviors, visual variety, and new effect types. The particle system now supports advanced features like rotation, scaling, type-specific physics, glow effects, and additive blending.

## Changes Summary

### 1. Extended Particle Type System
**File:** `src/game/types.ts`

Added new optional properties to the `Particle` type:
```typescript
rotation?: number;         // Current rotation in radians
rotationSpeed?: number;    // Rotation speed (rad/s)
scale?: number;            // Size multiplier (1.0 = normal)
scaleSpeed?: number;       // Scale change rate
gravity?: number;          // Custom gravity multiplier (default 1.0)
drag?: number;             // Air resistance (default 0.98)
bounce?: number;           // Bounciness factor (0-1) - for future use
type?: 'spark' | 'smoke' | 'debris' | 'glow' | 'blood' | 'dust';
secondaryColor?: string;   // For gradient effects - for future use
glowIntensity?: number;    // Glow/bloom strength
```

### 2. Enhanced Particle Physics
**File:** `src/core/particles/particlePhysics.ts`

**New Features:**
- **Type-specific behaviors**: Each particle type has unique physics
  - **Sparks**: Erratic motion, rapid fade, quick shrink
  - **Smoke**: Floats upward, expands over time, drifts horizontally
  - **Debris**: Strong rotation that slows over time
  - **Glow**: Pulsating glow intensity
  - **Blood**: Sticks to surfaces, minimal bounce
  - **Dust**: Settles slowly, gentle fade

- **Custom gravity and drag**: Per-particle customization
- **Rotation animation**: Smooth rotation over time
- **Scale animation**: Dynamic size changes
- **Smart fade patterns**: Different alpha curves per type

### 3. Upgraded Muzzle Flash Effect
**File:** `src/core/particles/muzzleFlash.ts`

**Multi-stage effect now includes:**
1. **Bright directional sparks** (15-23 particles)
   - Wide cone spread (1.4 radians)
   - Bright yellow-white-orange colors
   - High-speed ejection (120-220 pixels/sec)
   - Rotation and glow

2. **Expanding smoke puffs** (8-12 particles)
   - Gray smoke colors
   - Rising motion (negative gravity)
   - Rotation animation
   - Longer lifetime (0.25-0.4s)

3. **Intense bright core** (5 particles)
   - Pure white glow
   - Very short lifetime (0.05-0.08s)
   - Rapid shrinking
   - Maximum glow intensity

4. **Secondary embers** (6-10 particles)
   - Orange-red trailing effects
   - Medium speed
   - Arcing motion with gravity

### 4. Upgraded Impact Effect
**File:** `src/core/particles/impactEffect.ts`

**Five-layer impact visualization:**
1. **Radial spark burst** (12-22 particles)
   - 360° coverage with variation
   - Bright impact colors
   - Arcing trajectories

2. **Expanding dust cloud** (10-16 particles)
   - Gray/smoke colors
   - Spreads outward
   - Long-lasting (0.3-0.55s)

3. **Debris chunks** (6-10 particles)
   - Brown/dark colors
   - Heavy, spinning pieces
   - Strong gravity, arcing up then falling

4. **Impact ring flash** (8 particles)
   - White glow ring
   - Brief, intense (0.08-0.12s)
   - Rapidly expanding

5. **Secondary fine sparks** (8 particles)
   - Small, fast-moving
   - Yellow accents
   - Quick fade

### 5. New Special Effects
**File:** `src/core/particles/specialEffects.ts`

#### Blood Splatter
```typescript
createBloodSplatter(x: number, y: number, angle: number, intensity: number = 1.0)
```
- Dark red spectrum colors
- Mix of large splatters and fine mist
- Directional spray pattern
- Intensity parameter scales particle count and speed
- Heavier particles stick to ground

#### Wood Debris
```typescript
createWoodDebris(x: number, y: number, amount: number = 1.0)
```
- Brown and tan wood chip colors
- Mix of large chunks and small splinters
- Accompanied by sawdust cloud
- Initial upward pop with gravity falloff
- Fast rotation for realistic tumbling

#### Stone Debris
```typescript
createStoneDebris(x: number, y: number, amount: number = 1.0)
```
- Gray stone fragment colors
- Heavy particles with strong gravity
- Large fragments and fine dust
- Stone dust cloud effect
- Realistic falling motion

#### Explosion
```typescript
createExplosion(x: number, y: number, size: number = 1.0)
```
- Massive multi-stage effect
- **Shockwave ring**: White expanding circle
- **Fire burst**: 30-50 particles with fire colors
- **Smoke plume**: Rising dark smoke
- Size parameter scales entire effect
- Additive blending for intense brightness

#### Healing Sparkles
```typescript
createHealingSparkles(x: number, y: number)
```
- Green-cyan-white spectrum
- Upward floating motion (negative gravity)
- Gentle glow effect
- Perfect for medical treatment feedback

#### Crafting Sparkles
```typescript
createCraftingSparkles(x: number, y: number)
```
- Blue-purple-golden magical colors
- Radial burst pattern
- Upward floating
- Strong glow intensity
- Great for research/crafting completion

### 6. Enhanced Particle Renderer
**File:** `src/core/particles/particleRender.ts`

**Major improvements:**
- **Batch rendering by type**: Groups particles for optimal blend mode usage
- **Additive blending**: `lighter` composite mode for sparks/glows
- **Rotation support**: Full rotation transformation
- **Scale support**: Dynamic particle sizing
- **Glow rendering**: Multi-layer glow with bright core
- **Type-specific rendering**: Debris gets highlights, glows get halos
- **Performance optimization**: Smart fallback to sprite rendering when possible

**Render Pipeline:**
1. Split particles into normal and glow groups
2. Render normal particles (source-over blend)
3. Render glow particles (lighter/additive blend)
4. Apply rotation/scale transforms per particle
5. Add glow halos for high-intensity particles

### 7. Enhanced Projectile Trail
**File:** `src/core/particles/projectileTrail.ts`

**Improvements:**
- Mix of vapor trail and smoke
- Occasional spark tracers (30% chance)
- Lighter vapor particles (fast fade)
- Darker smoke trail (gunpowder residue)
- More realistic bullet trail appearance

## Usage Examples

### Basic Effects (Already Integrated)
```typescript
// Muzzle flash when shooting
const muzzleParticles = createMuzzleFlash(weaponX, weaponY, weaponAngle);
game.state.particles.push(...muzzleParticles);

// Impact when bullet hits
const impactParticles = createImpactEffect(bulletX, bulletY);
game.state.particles.push(...impactParticles);
```

### New Effects (Ready to Use)
```typescript
// Blood splatter on colonist hit
const bloodParticles = createBloodSplatter(colonistX, colonistY, attackAngle, 1.5);
game.state.particles.push(...bloodParticles);

// Wood debris when chopping trees
const woodParticles = createWoodDebris(treeX, treeY, 1.0);
game.state.particles.push(...woodParticles);

// Stone debris when mining rocks
const stoneParticles = createStoneDebris(rockX, rockY, 1.2);
game.state.particles.push(...stoneParticles);

// Explosion effect (for future features)
const explosionParticles = createExplosion(centerX, centerY, 2.0);
game.state.particles.push(...explosionParticles);

// Healing effect on medical treatment
const healParticles = createHealingSparkles(patientX, patientY);
game.state.particles.push(...healParticles);

// Crafting completion celebration
const craftParticles = createCraftingSparkles(benchX, benchY);
game.state.particles.push(...craftParticles);
```

## Performance Considerations

1. **Sprite rendering fallback**: When particles don't use rotation/scale, the system automatically uses the faster sprite-blitting path

2. **Particle count**: New effects create more particles but with shorter lifetimes, keeping total count manageable

3. **Type-based culling**: Particles below 0.1 size are automatically filtered out

4. **Batch rendering**: Grouping by blend mode reduces context switches

5. **Smart updates**: Type-specific physics only runs for particles of that type

## Integration Points

The enhanced particle system integrates seamlessly with existing game code:

- **Combat system**: Use `createBloodSplatter()` in colonist/enemy damage handlers
- **Resource gathering**: Add `createWoodDebris()` and `createStoneDebris()` to tree/rock destruction
- **Medical system**: Use `createHealingSparkles()` when applying treatment
- **Research/crafting**: Use `createCraftingSparkles()` on project completion
- **Future explosions**: `createExplosion()` ready for grenades/explosive weapons

## Visual Impact

The enhanced particle system provides:
- ✨ **More visual feedback** - Players can immediately see action results
- 🎨 **Greater variety** - Different effects for different actions
- 💫 **Better polish** - Professional-looking effects with multi-stage animations
- 🔥 **Enhanced drama** - Explosive, dynamic visual moments
- 🎯 **Clear communication** - Visual language for different game events

## Future Enhancements

Potential additions (already supported by the type system):
- Bounce physics (property exists, needs implementation)
- Gradient colors (secondaryColor property ready)
- Weather effects (rain, snow using particle types)
- Magic effects for future supernatural elements
- Building destruction cascades
- Fire spread visualization

## Technical Details

**Coordinate System**: World-space coordinates (pixels)
**Physics Rate**: Runs at simulation tick rate (30Hz by default)
**Render Rate**: Rendered every frame with delta-time interpolation
**Memory**: Particles auto-cleanup when lifetime expires or size < 0.1
**Blend Modes**: Source-over for solid particles, lighter for glows/sparks

---

**Last Updated**: February 12, 2026  
**System Version**: Enhanced Particle System v2.0  
**Files Modified**: 7 files  
**Lines Added**: ~800 lines of enhanced particle code
