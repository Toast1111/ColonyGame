# Combat & Navigation Testing Quick Guide

## Quick Start Testing (5 minutes)

### 1. Launch Game
```bash
npm run dev
```

### 2. Open Debug Console
Press **backtick (`)** key to open console

### 3. Setup Test Environment
```bash
# Disable night enemy spawns for controlled testing
toggle enemies

# Spawn test colonists
spawn colonist 3

# Give weapons for combat testing
give pistol all

# Unlimited resources (optional)
resources unlimited
```

---

## Test Scenarios

### Scenario 1: Combat Accuracy (2 minutes)
**Goal**: Verify bullets miss when accuracy is low

1. Wait for night (darkness reduces accuracy)
2. Draft all colonists: **`draft all`**
3. Manually spawn enemy: Use console or wait for existing enemies
4. Watch combat:
   - ✅ Bullets should visibly miss (wide angles, wrong distances)
   - ✅ Hit rate should be visibly lower than daytime
5. Compare to daytime accuracy

**Expected**: 
- Night combat has ~50-60% accuracy (many visible misses)
- Day combat has ~80-90% accuracy (mostly hits)

---

### Scenario 2: Pathfinding Through Forests (1 minute)
**Goal**: Verify colonists walk through trees

1. Send colonist into forest area
2. Press **`D`** to toggle debug visualizer
3. Observe:
   - ✅ No red squares on trees/rocks
   - ✅ Colonist walks directly through trees
   - ✅ Buildings still show red squares (correct)

**Expected**: Smooth pathfinding, no routing around trees

---

### Scenario 3: Cover Seeking (3 minutes)
**Goal**: Verify drafted colonists seek cover under fire

1. Build some walls: Place wall segments near colonists
2. Spawn enemy: **`spawn enemy 5`** (or wait for night)
3. Draft colonists: **`draft all`**
4. Attack enemies (right-click target)
5. **After initial engagement**, undraft colonists: **`undraft all`**
6. Watch drafted colonists with no specific orders:
   - ✅ Should move behind walls when under fire
   - ✅ Should peek out to shoot
   - ✅ Should stay in cover between shots

**Expected**: Colonists actively reposition behind walls/rocks

---

### Scenario 4: Flee to Defensive Positions (3 minutes)
**Goal**: Verify colonists retreat to turrets/walls

1. Build turret and walls
2. Spawn strong enemy: **`spawn enemy 10`**
3. **Undraft all colonists** (let AI control them)
4. Watch flee behavior:
   - ✅ Colonists should flee toward turrets/walls
   - ✅ Should NOT flee to random buildings (old behavior)
   - ✅ Should stop fleeing when safe behind defenses

**Expected**: Intelligent retreat, not random panic

---

### Scenario 5: Focus Fire (2 minutes)
**Goal**: Verify multiple colonists target same enemy

1. Draft 3+ colonists: **`draft all`**
2. Spawn multiple enemies: **`spawn enemy 5`**
3. Right-click ONE enemy to attack
4. Watch combat log (if available) or observe visually:
   - ✅ Multiple colonists should shoot at same target
   - ✅ Should switch to next target after first dies
   - ✅ Should prioritize low-HP enemies

**Expected**: Coordinated fire, not each colonist picking different targets

---

## Debug Console Commands

### Setup Commands
```bash
toggle enemies           # Disable/enable night spawns
spawn colonist <count>   # Add colonists
spawn enemy <count>      # Add enemies at random edges
draft all               # Draft all colonists
undraft all             # Undraft all colonists
give pistol all         # Equip autopistols
give rifle all          # Equip assault rifles
```

### Testing Commands
```bash
heal all                # Full heal everyone (reset between tests)
godmode all             # Make invincible (test without casualties)
speed 3                 # 3x speed (faster testing)
speed 1                 # Normal speed
resources unlimited     # Infinite resources for building
```

### Debug Visualization
```bash
D                       # Toggle pathfinding debug (red squares)
P                       # Toggle performance HUD
`                       # Toggle console (backtick key)
```

---

## What to Look For

### ✅ Success Indicators
1. **Accuracy**: Visible bullet misses in low-accuracy situations
2. **Pathfinding**: No red squares on trees/rocks, smooth forest movement
3. **Cover**: Drafted colonists move behind walls when shot at
4. **Retreat**: Fleeing colonists run toward turrets/walls
5. **Focus Fire**: Multiple colonists attack same dangerous enemy

### ❌ Failure Indicators
1. **Accuracy**: All bullets hit regardless of darkness/cover
2. **Pathfinding**: Red squares on trees, colonists route around forests
3. **Cover**: Colonists stand in open when being shot
4. **Retreat**: Random fleeing to any building
5. **Focus Fire**: Each colonist picks different target

---

## Performance Check

Press **`P`** to toggle performance HUD. Watch:
- **FPS**: Should stay 60+ (combat is optimized)
- **Tick Rate**: Should be 30Hz (or adaptive)
- **Entity Count**: Track colonists/enemies/projectiles

**If FPS drops below 30**: Combat system may need optimization

---

## Quick Reset Between Tests
```bash
heal all
undraft all
speed 1
```

---

## Full Cleanup (Reset Game State)
If you need to start fresh:
1. Reload page (F5)
2. Or use console: **`resources unlimited`** then rebuild defenses

---

## Expected Results Summary

| Feature | Before Fix | After Fix |
|---------|-----------|-----------|
| **Combat Accuracy** | Always hits | Misses visible based on accuracy |
| **Pathfinding Trees** | Routes around | Walks through |
| **Cover Seeking** | Never seeks cover | Actively moves to walls |
| **Retreat** | Random buildings | Turrets/defensive positions |
| **Target Priority** | Closest enemy | Most dangerous enemy |
| **State Flipping** | Rapid flee/idle cycles | Smooth hysteresis |

---

## Troubleshooting

### "No enemies spawning"
- Check if `toggle enemies` was used (disables spawns)
- Manually spawn with `spawn enemy 5`
- Wait for night (enemies spawn at night)

### "Colonists won't shoot"
- Verify weapons equipped: `give pistol all`
- Draft colonists: `draft all`
- Right-click enemy to attack

### "Can't see cover behavior"
- Build walls first (colonists need cover to seek it)
- Make sure colonists are drafted (`draft all`)
- Enemies must be attacking (not fleeing)

### "Pathfinding still blocking"
- Press `D` to toggle debug visualizer
- Check if red squares appear on trees/rocks
- If yes: Build failed, re-run `npm run build`

---

## Full Test Run (10 minutes)
1. ✅ Launch game, open console
2. ✅ Setup: `toggle enemies`, `spawn colonist 3`, `give pistol all`
3. ✅ Test accuracy (night vs day combat)
4. ✅ Test pathfinding (send colonist through forest, press D)
5. ✅ Build walls and turret
6. ✅ Test cover seeking (`draft all`, attack enemies)
7. ✅ Test retreat (`spawn enemy 10`, `undraft all`)
8. ✅ Test focus fire (draft 3+ colonists, attack one enemy)
9. ✅ Check performance (press P)
10. ✅ Cleanup: `heal all`, `speed 1`

---

## Known Good Test Sequence
```bash
# Console setup
toggle enemies
spawn colonist 3
give pistol all
resources unlimited

# Test combat accuracy (wait for night)
draft all
# Attack enemies, watch for misses

# Test pathfinding
undraft all
D  # Toggle debug visualizer
# Send colonist through forest, verify no red squares on trees

# Test cover & retreat (build walls first)
spawn enemy 10
draft all
# Watch cover-seeking behavior
undraft all
# Watch retreat to defensive positions

# Cleanup
heal all
speed 1
```

---

## Reporting Issues

If any test fails:
1. Note which scenario failed
2. Check browser console for errors (F12)
3. Take screenshot of unexpected behavior
4. Report with test scenario name + expected vs actual behavior

Example: "Scenario 3 (Cover Seeking) failed - colonists did not move to walls under fire. Expected: movement to cover, Actual: stood in open."
