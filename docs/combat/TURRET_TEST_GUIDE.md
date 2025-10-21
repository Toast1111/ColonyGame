# Turret System - Quick Test Guide

## Quick Start

Press **backtick (`)** to open debug console, then:

```bash
spawn colonist 3
resources unlimited
build turret
# Click to place turret

spawn enemy 5
speed 1
```

## What to Look For

### ✅ Visual Checks

1. **Rotating Barrel** - Watch the gray barrel rotate toward enemies
2. **Orange Muzzle Flash** - Two orange flashes per burst (0.1s apart)
3. **Projectile Trails** - Visible bullet particles
4. **Impact Effects** - Particle burst on hit/miss

### ✅ Combat Checks

1. **2-Round Burst** - Count 2 distinct shots per engagement
2. **4.8s Cooldown** - ~5 second pause between bursts
3. **30 Damage** - Each shot does 30 damage to enemies
4. **96% Accuracy** - Should hit ~24 out of 25 shots
5. **28.9 Tile Range** - Turret won't target enemies beyond ~925 pixels

### ✅ Friendly Fire Test

```bash
# Position a colonist between turret and enemy
# Turret should damage colonist if in line of fire
# Watch for warning: "Turret hit [Name]! Friendly fire!"
```

## Debug Commands

```bash
# Spawn enemies at specific locations
spawn enemy 1

# Check turret stats
# (inspect in browser console)
game.buildings.filter(b => b.kind === 'turret')

# Heal colonist after friendly fire
heal all

# Speed up for rapid testing
speed 3
```

## Expected Behavior

**Burst Fire Sequence:**
1. Turret acquires target
2. Barrel rotates toward target
3. Fire shot 1 (orange flash, sound, projectile)
4. Wait 0.1 seconds
5. Fire shot 2 (second flash)
6. Cooldown starts (4.8 seconds)
7. Repeat

**Accuracy:**
- 96% hit chance at all ranges
- Hits: Small spread around target (5°)
- Misses: Large spread (35°)

**Friendly Fire:**
- Only from turrets (`owner === 'turret'`)
- Applies armor penetration
- Applies stopping power (stagger)
- Shows warning message

## Troubleshooting

**Turret not firing?**
- Check if enemies are within 28.9 tiles (924.8px)
- Check if line of sight is blocked by buildings
- Check if turret is finished building (`done = true`)

**No visual effects?**
- Check browser console for errors
- Verify barrel rotation (should track target)
- Verify flash timer is updating

**Damage too low/high?**
- Base damage: 30 per shot
- With armor: `30 * (1 - (armor - 0.20))`
- Two shots = 60 total burst damage

**No friendly fire?**
- Ensure colonist is between turret and enemy
- Check bullet collision detection
- Verify warning message appears

## Performance

**Acceptable:**
- 10+ turrets with no FPS drop
- Smooth barrel rotation
- Flash effects render correctly

**Issues:**
- FPS drops → Report to devs
- Visual glitches → Check browser console
- Collision bugs → Verify game state

---

**Test Complete When:**
- ✅ Turret fires 2-round bursts
- ✅ 4.8 second cooldown observed
- ✅ Barrel rotates toward targets
- ✅ Orange muzzle flash visible
- ✅ Friendly fire damages colonists
- ✅ Accuracy ~96% at all ranges
- ✅ Audio plays correctly
- ✅ No console errors
