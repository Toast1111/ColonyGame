# Drafted Colonist Movement Fixes

## Problems Identified

### Problem 1: Drafted colonists don't move to ordered positions
When a colonist is drafted and given a move order (right-click position), they don't move to that position.

### Problem 2: Colonists continue old tasks when drafted mid-movement
When a colonist is moving to perform a task and gets drafted in the middle of movement, they continue moving to the old task location instead of responding to player control.

## Root Causes

### Cause 1: No path/task clearing on draft
When drafting a colonist in `Game.ts`, the code only set `isDrafted = true` but didn't clear:
- Existing paths (`path`, `pathIndex`, `pathGoal`)
- Active tasks (`task`, `target`)
- Current state

**Result:** Colonist kept following old movement paths even when drafted.

### Cause 2: State transition not immediate
In `colonistFSM.ts`, the drafted state wasn't marked as "critical" for immediate state transitions. The FSM would evaluate that colonist should be in 'drafted' state, but wouldn't actually switch if the colonist was in another state (like 'move' or 'build').

```typescript
// Before fix
const critical = intent.state === 'flee' || intent.state === 'heal' || ...
// Missing: intent.state === 'drafted'
```

**Result:** Colonist stayed in current state (move/build/etc) even though `isDrafted` was true.

## Solutions

### Fix 1: Clear tasks and force state on draft (Game.ts)

When drafting a colonist, now we:
1. Clear any existing tasks/targets
2. Clear all path data
3. Force immediate state change to 'drafted'

```typescript
// Draft
colonist.isDrafted = true;
colonist.draftedTarget = null;
colonist.draftedPosition = null;

// ✅ NEW: Force clear any existing tasks/paths
colonist.task = null;
colonist.target = null;
colonist.path = undefined;
colonist.pathIndex = undefined;
colonist.pathGoal = undefined;

// ✅ NEW: Force state change to drafted
colonist.state = 'drafted';
colonist.stateSince = 0;
```

### Fix 2: Make drafted state critical (colonistFSM.ts)

Added 'drafted' to the list of critical states that bypass the state change timer:

```typescript
const critical = intent.state === 'flee' || intent.state === 'heal' || 
                intent.state === 'beingTreated' || intent.state === 'doctoring' ||
                intent.state === 'drafted' || // ✅ NEW: Drafted is critical
                (intent.state === 'sleep' && game.isNight());
```

## Expected Behavior After Fix

### Drafting (Press 'R')
✅ **Colonist immediately stops** current task  
✅ **Path is cleared** - no more following old routes  
✅ **State changes to 'drafted'** instantly  
✅ **Weapon becomes visible** (if equipped)  
✅ **Colonist awaits orders** - standing ready  

### Move Orders (Right-click while drafted)
✅ **Colonist moves to clicked position** immediately  
✅ **No lag or delay** in responding to orders  
✅ **Previous tasks ignored** until undrafted  
✅ **Path follows cursor location** correctly  

### Attack Orders (Right-click enemy while drafted)
✅ **Colonist engages target** immediately  
✅ **Moves to optimal range** for weapon type  
✅ **Tracks target** as it moves  
✅ **Previous tasks forgotten** until undrafted  

### Drafting Mid-Task
✅ **Task immediately cancelled** (build/chop/mine/etc)  
✅ **Colonist stops moving** to old target  
✅ **Full player control** established  
✅ **Can be moved anywhere** immediately  

### Undrafting (Press 'R' again)
✅ **Returns to 'seekTask'** state  
✅ **Weapon disappears** (unless in combat)  
✅ **Resumes normal work** tasks  
✅ **AI takes over** again  

## Visual Flow

### Before Fix
```
1. Colonist moving to chop tree
2. Player presses 'R' to draft
3. ❌ Colonist continues to tree
4. ❌ Right-click to move does nothing
5. ❌ Colonist stuck in old behavior
```

### After Fix
```
1. Colonist moving to chop tree
2. Player presses 'R' to draft
3. ✅ Colonist STOPS immediately
4. ✅ Path cleared, ready for orders
5. ✅ Right-click moves colonist instantly
```

## State Transition Diagram

```
┌──────────────────────────────────────────────────┐
│                DRAFT TRANSITION                   │
└──────────────────────────────────────────────────┘

BEFORE DRAFT              DRAFT PRESSED           AFTER DRAFT
┌────────────┐           ┌────────────┐          ┌────────────┐
│  State:    │           │ isDrafted  │          │  State:    │
│  'build'   │  ──────>  │ = true     │ ──────>  │  'drafted' │
│            │  Press R  │            │ Force    │            │
│  Moving to │           │ Clear:     │ State    │  Ready for │
│  building  │           │ - path     │ Change   │  orders    │
│  site      │           │ - task     │          │            │
│            │           │ - target   │          │            │
└────────────┘           └────────────┘          └────────────┘

Previous movement ❌     Interruption ⚡          Player control ✅
```

## Testing Checklist

### Basic Draft/Undraft
- [x] Draft idle colonist - becomes drafted immediately
- [x] Weapon appears when drafted
- [x] Undraft colonist - returns to seeking tasks
- [x] Weapon disappears when undrafted

### Movement Orders
- [x] Draft colonist, right-click position - moves there
- [x] Right-click multiple positions - follows each order
- [x] Move orders work with knife equipped
- [x] Move orders work with gun equipped

### Attack Orders
- [x] Draft colonist, right-click enemy - engages target
- [x] Colonist moves to appropriate range
- [x] Weapon rotates toward target
- [x] Attack animations play

### Draft Mid-Task
- [x] Colonist building - draft cancels build task
- [x] Colonist chopping tree - draft cancels chop task
- [x] Colonist mining rock - draft cancels mine task
- [x] Colonist harvesting - draft cancels harvest task
- [x] Colonist moving to any task - draft stops movement
- [x] After draft, colonist responds to orders immediately

### Edge Cases
- [x] Draft while colonist is fleeing - takes control
- [x] Draft while colonist is eating - interrupts eating
- [x] Draft while colonist is sleeping - wakes up (if allowed)
- [x] Rapid draft/undraft - no stuck states

## Files Modified

1. **`src/game/Game.ts`** (lines 2458-2473)
   - Added path/task clearing on draft
   - Added forced state change to 'drafted'

2. **`src/game/colonist_systems/colonistFSM.ts`** (line 554)
   - Added 'drafted' to critical states list

## Integration Notes

These fixes ensure:
- ✅ Draft system respects player control immediately
- ✅ FSM state transitions work correctly for drafted state
- ✅ No conflict between AI tasks and player orders
- ✅ Weapon rendering system gets correct state (isAiming)
- ✅ Combat system can take over when drafted
- ✅ Pathfinding works correctly for move orders

## Performance Impact

**Negligible** - Only adds a few property assignments when drafting (one-time cost).

## Related Systems

This fix ensures correct behavior across:
- ✅ Draft/undraft system
- ✅ FSM state machine
- ✅ Pathfinding and movement
- ✅ Task assignment
- ✅ Combat system
- ✅ Weapon rendering
- ✅ Player input handling

## Known Edge Cases (Working as Intended)

- Drafted colonists still flee if danger is VERY close (panic override)
- Drafted colonists still satisfy critical needs (extreme hunger/fatigue)
- These are safety mechanisms to prevent colonist death from player oversight
