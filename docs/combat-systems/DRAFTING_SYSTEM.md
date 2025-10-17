# Drafting System - Complete Implementation

## Overview
This implementation adds a RimWorld-style combat drafting system to the colony game. Players can draft colonists for direct combat control, assign specific targets, and give movement orders.

## Features

### 1. Draft/Undraft Toggle
- Access via right-click context menu on any colonist
- Draft: Takes colonist under player control for combat
- Undraft: Returns colonist to normal AI behavior

### 2. Automatic Combat Engagement
When drafted, colonists automatically:
- **Ranged Combat**: Fire at enemies in weapon range
  - Must be stationary to aim and shoot (RimWorld-style)
  - Line-of-sight required (walls block shots)
  - Friendly fire avoidance
- **Melee Combat**: Attack adjacent enemies
  - Automatic when next to enemy
  - Works even if colonist has ranged weapon

### 3. Direct Orders
**Target Assignment:**
- Select drafted colonist (left-click)
- Right-click on enemy to assign as priority target
- Visual: Red dashed line + crosshair on target

**Movement Orders:**
- Select drafted colonist (left-click)
- Right-click on ground to move to position
- Visual: Green X marker at destination

### 4. Visual Indicators
- **Green Shield**: Appears above drafted colonists
- **Red Targeting Line**: Shows assigned enemy target
- **Red Crosshair**: Marks target enemy
- **Green X Marker**: Shows movement destination

## Implementation Details

### Files Modified

1. **types.ts** - Type definitions
   - Added 'drafted' state
   - Added draft properties (isDrafted, draftedTarget, draftedPosition)

2. **colonistFSM.ts** - State machine logic
   - Draft state handling (priority 99)
   - Movement to position/target
   - Auto-undraft on player command

3. **pawnCombat.ts** - Combat system
   - Drafted colonists auto-engage enemies
   - Target priority system
   - Stationary fire requirement

4. **colonistMenu.ts** - UI
   - Draft/undraft context menu option

5. **Game.ts** - Input handling
   - Draft/undraft action handler
   - Right-click order assignment
   - findEnemyAt() helper

6. **RenderManager.ts** - Visual feedback
   - Draft status indicator
   - Target assignment visuals
   - Movement order markers

### State Priority System
```
100: Flee (danger)
 99: Drafted (player control)
 98: Waiting for door
 96: Being treated (medical)
 95: Doctoring
 90: Heal
 80: Sleep
 65: Eat
 40: Work tasks
 10: Seek task (idle)
```

### Combat Behavior

**Ranged Weapons:**
1. Check if drafted or inCombat
2. Acquire target (draftedTarget or auto-acquire)
3. Move to optimal range if needed
4. Stop and aim (warmup period)
5. Fire burst (stationary required)
6. Cooldown before next burst

**Melee Combat:**
1. Detect enemy within melee range (1.3 tiles)
2. Stop movement
3. Apply cooldown-gated strikes
4. Grant Melee skill XP

**Line of Fire:**
- Uses existing hasLineOfFire() function
- Checks wall intersections
- Blocks shot if any building in path (except HQ, paths, houses, farms, beds)

## Usage Guide

### Basic Workflow
1. **Draft Colonist**
   ```
   Right-click colonist → "Draft"
   Green shield appears above colonist
   ```

2. **Give Orders**
   ```
   Left-click to select drafted colonist
   
   To attack specific enemy:
     Right-click enemy → Red line/crosshair appears
   
   To move to position:
     Right-click ground → Green X marker appears
   ```

3. **Combat Happens Automatically**
   ```
   Colonist engages enemies while:
   - Standing at position
   - Moving to position
   - Pursuing target
   ```

4. **Undraft When Done**
   ```
   Right-click drafted colonist → "Undraft"
   Colonist returns to normal activities
   ```

### Advanced Tactics

**Cover Fighting:**
- Draft colonist
- Right-click position behind wall
- Colonist moves and engages from cover
- Walls block enemy shots

**Focus Fire:**
- Draft multiple colonists
- Assign same target to all (right-click enemy)
- All colonists prioritize that target

**Kiting:**
- Draft ranged colonist
- Right-click ground to retreat
- Colonist fires while moving away

## Technical Notes

### Pathfinding Integration
- Uses existing A* pathfinding
- Respects building collisions
- Auto-updates on target movement

### Combat System Integration
- Reuses existing weapon stats (range, damage, accuracy)
- Works with skill system (Shooting/Melee XP)
- Compatible with injury system

### Performance
- Draft state checked in FSM priority evaluation
- Combat updates only when drafted or inCombat flag set
- Visual indicators only rendered for drafted colonists

### Edge Cases Handled
- Target dies → auto-clear assignment
- Undraft → clear all orders
- Inside building → cannot draft
- Danger nearby → flee overrides draft

## Testing

### Manual Testing Checklist
- [x] Draft toggle in context menu
- [x] Visual indicators appear
- [x] Ranged auto-fire works
- [x] Melee when adjacent works
- [x] Walls block shots
- [x] Target assignment works
- [x] Movement orders work
- [x] Undraft clears orders
- [x] State priority correct
- [x] No console errors

### Known Limitations
- No group selection (must draft individually)
- No formation controls
- No stance controls (aggressive/defensive)
- No hold fire command

### Future Enhancements
Potential additions (not in current scope):
- Group drafting (select multiple colonists)
- Formation movement
- Hold fire toggle
- Aggressive/defensive stance
- Retreat command
- Rally point system

## Code Examples

### Draft Check in FSM
```typescript
if (c.isDrafted && !c.inside) {
  set('drafted', 99, 'drafted by player');
  return best;
}
```

### Target Assignment
```typescript
if (this.selColonist?.isDrafted) {
  const enemy = this.findEnemyAt(wx, wy);
  if (enemy) {
    this.selColonist.draftedTarget = enemy;
    this.msg('Targeting enemy', 'info');
  }
}
```

### Visual Indicator
```typescript
if (c.isDrafted) {
  // Draw green shield
  ctx.strokeStyle = '#10b981';
  ctx.beginPath();
  // ... shield drawing code
}
```

## Compatibility

- ✅ Works with existing combat system
- ✅ Works with pathfinding
- ✅ Works with door system
- ✅ Works with inventory/equipment
- ✅ Works with skill system
- ✅ Works with health system
- ✅ Mobile touch compatible

## Performance Impact

- Minimal CPU impact (state checked once per FSM update)
- Minimal rendering impact (few extra draw calls for indicators)
- No memory leaks (orders cleared on undraft)
- Compatible with adaptive tick rate system
