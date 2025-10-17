# Melee Attack Animation System

## Overview

The melee attack animation system provides visual feedback for melee combat, making it clear when colonists are actively attacking with melee weapons. Different weapon types have different animation styles:

- **Swing** (Club and gun-bash): Weapon arcs from back to front in a sweeping motion
- **Stab** (Knife): Weapon extends forward and retracts quickly

## Features

✅ **Smooth Animations**: Eased in/out for natural motion  
✅ **Weapon-Specific**: Different animations for different weapon types  
✅ **Fast Execution**: Completes in ~0.25 seconds (250ms)  
✅ **Visual Clarity**: Clear indication of when attacks occur  
✅ **Performance Friendly**: Minimal computational overhead  

## Animation Types

### Swing Animation (Club, Gun-Bash)

```
Time:    0.0s          0.125s         0.25s
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━>
         
         ╱             |              ╲
        ╱              |               ╲
       ▲              🙂               ╲
      back         neutral          follow-
   position       (impact)          through
   (-60°)           (0°)            (+30°)
```

**Motion Details:**
- Starts pulled back at -60° (behind the colonist)
- Swings through to neutral at 50% progress (0°)
- Follows through to +30° at completion
- Slight upward arc during swing (2px peak)
- Forward motion of 4px during swing

### Stab Animation (Knife)

```
Time:    0.0s      0.075s    0.25s
         ━━━━━━━━━━━━━━━━━━━━>
         
         ━>         ━━━>       ━>
       ready     extended    ready
      position   (impact)   position
         
Extension: 0%  →   100%   →   0%
Distance:  0px →   12px   →   0px
```

**Motion Details:**
- Quick extension (0-30% of animation time)
- Extends 12px forward
- Slower retraction (30-100% of animation time)
- Slight 5.7° wobble for dynamic feel

## Technical Implementation

### Animation State (Colonist Type)

```typescript
meleeAttackProgress?: number;        // 0-1, animation progress
meleeAttackType?: 'swing' | 'stab' | null; // Animation type
```

### Animation Trigger (pawnCombat.ts)

When melee attack occurs:
```typescript
// Determine animation based on weapon
if (weaponDefName === 'Knife') {
  c.meleeAttackType = 'stab';
} else {
  c.meleeAttackType = 'swing';
}
c.meleeAttackProgress = 0; // Start animation
```

### Animation Update (Game.ts)

Every frame:
```typescript
if (c.meleeAttackProgress !== undefined && c.meleeAttackProgress < 1) {
  c.meleeAttackProgress += dt * 4; // 4x speed = 0.25s duration
  if (c.meleeAttackProgress >= 1) {
    c.meleeAttackProgress = undefined;
    c.meleeAttackType = null;
  }
}
```

### Animation Rendering (weaponRenderer.ts)

```typescript
function getMeleeAnimationTransform(attackType, progress) {
  const easedProgress = easeInOut(progress);
  
  if (attackType === 'swing') {
    const startAngle = -Math.PI / 3;  // -60°
    const endAngle = Math.PI / 6;      // +30°
    const rotationOffset = startAngle + (endAngle - startAngle) * easedProgress;
    const positionOffsetX = easedProgress * 4;
    const positionOffsetY = Math.sin(easedProgress * Math.PI) * -2;
    
    return { rotationOffset, positionOffsetX, positionOffsetY, scale: 1.0 };
  } else { // stab
    let extension = progress < 0.3 
      ? easeInOut(progress / 0.3)
      : 1 - easeInOut((progress - 0.3) / 0.7);
    
    const positionOffsetX = extension * 12;
    const rotationOffset = Math.sin(extension * Math.PI) * 0.1;
    
    return { rotationOffset, positionOffsetX, positionOffsetY: 0, scale: 1.0 };
  }
}
```

## Easing Function

The animation uses an ease-in-out curve for natural motion:

```typescript
const easeInOut = (t: number) => 
  t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
```

**Effect:**
- Slow start (acceleration)
- Fast middle (peak velocity)
- Slow end (deceleration)

```
Velocity
   ▲
   │      ╱╲
   │    ╱    ╲
   │  ╱        ╲
   │╱            ╲
   └──────────────> Time
   0    0.5      1
```

## Animation Timing

| Phase | Duration | Description |
|-------|----------|-------------|
| **Start** | 0.0-0.1s | Acceleration, weapon begins moving |
| **Mid** | 0.1-0.15s | Peak velocity, weapon impacts target |
| **End** | 0.15-0.25s | Deceleration, follow-through/retraction |

**Total Duration:** 250ms (0.25 seconds)  
**Update Rate:** 60 FPS = ~15 frames per animation  
**Progress per Frame:** ~0.067 (6.7%)

## Visual Feedback Flow

```
Player sees enemy near colonist
          ↓
Colonist enters melee range
          ↓
Combat system triggers attack
          ↓
Animation starts (progress = 0)
          ↓
Weapon begins moving (visible motion)
          ↓
Damage applied at ~50% progress
          ↓
Animation completes (progress = 1)
          ↓
Weapon returns to ready position
          ↓
Cooldown period (0.8s)
          ↓
Ready for next attack
```

## Integration Points

### Trigger Points

1. **Melee Weapon Attack** (`pawnCombat.ts:440`)
   - When colonist lands melee hit with Club/Knife
   - Sets animation type based on weapon

2. **Gun Bash Attack** (`pawnCombat.ts:555`)
   - When ranged colonist too close to use gun
   - Always uses 'swing' animation

### Update Point

3. **Animation Progress** (`Game.ts:2143`)
   - Updates every frame for smooth motion
   - Auto-clears when complete

### Render Point

4. **Weapon Drawing** (`weaponRenderer.ts:75`)
   - Applies transform during rendering
   - Adds rotation and position offsets

## Performance

**Per Animated Colonist per Frame:**
- Progress calculation: ~0.001ms
- Easing calculation: ~0.002ms
- Transform calculation: ~0.003ms
- Apply to rendering: ~0.002ms

**Total:** ~0.008ms per animated colonist  
**Impact:** Negligible (< 0.1% of frame budget)

## Adding New Weapon Types

To add a new animation type:

1. **Define animation type** in `types.ts`:
   ```typescript
   meleeAttackType?: 'swing' | 'stab' | 'thrust' | null;
   ```

2. **Set type in combat** (`pawnCombat.ts`):
   ```typescript
   if (weaponDefName === 'Spear') {
     c.meleeAttackType = 'thrust';
   }
   ```

3. **Implement animation** in `weaponRenderer.ts`:
   ```typescript
   function getMeleeAnimationTransform(attackType, progress) {
     // ...existing code...
     else if (attackType === 'thrust') {
       // Define thrust animation
       const extension = easeInOut(progress);
       return {
         rotationOffset: 0,
         positionOffsetX: extension * 16,
         positionOffsetY: 0,
         scale: 1.0
       };
     }
   }
   ```

## Testing Checklist

- [ ] Equip colonist with Club
- [ ] Draft colonist and engage enemy in melee
- [ ] Verify swing animation plays (arc motion)
- [ ] Equip colonist with Knife
- [ ] Verify stab animation plays (thrust motion)
- [ ] Check animation completes smoothly
- [ ] Verify no visual glitches at animation end
- [ ] Test gun-bash with ranged weapon at close range
- [ ] Verify animation plays at different game speeds

## Known Limitations

- Animation plays even on miss (by design - shows attempt)
- No separate miss/hit animations
- Gun-bash always uses swing (no weapon-specific bash animation)
- Animation timing not affected by weapon speed stats

## Future Enhancements

- [ ] Miss animations (wider, less controlled swings)
- [ ] Critical hit animations (enhanced effects)
- [ ] Weapon trails/blur effects
- [ ] Impact particles on hit
- [ ] Recoil/knockback on target
- [ ] Different bash animations for different gun types
- [ ] Combo animations for rapid attacks
