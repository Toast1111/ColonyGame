# Intent-Based Action System Implementation

## Problem Analysis

You correctly identified that the current radius-based system treats colonists like **passive automatons** rather than **intelligent agents**. This creates several issues:

### Current Problems:
1. **Involuntary Actions**: Colonists work while moving ("drive-by chopping")
2. **Movement Lockdown**: Once in beds/buildings, colonists can't respond to emergencies  
3. **No Decision Process**: Actions trigger automatically by proximity, not choice
4. **Poor Player Control**: Drafted colonists get stuck in buildings/tasks

## Solution: Three-Phase Intent System

### Phase 1: Movement → Target
- Colonist moves toward their assigned target
- No work happens during movement
- Can be interrupted at any time (drafting, emergencies)

### Phase 2: Decision → Evaluation  
- Colonist arrives and enters "deciding" phase
- Brief pause (0.5s) to "size up" the task
- Colonist is stationary, considers their options
- Can still be interrupted during this phase

### Phase 3: Commitment → Work
- Colonist deliberately chooses to start working
- Now they are committed to the action
- Work only happens while stationary and in range
- Can set different interruption rules per task type

## Example: Tree Chopping

### Old System ❌
```
1. Colonist walks toward tree
2. Gets within radius → automatically starts chopping
3. Continues chopping while still moving
4. Gets drafted → can't stop, stuck chopping
```

### New System ✅  
```
1. Colonist walks toward tree (intent: 'moving')
2. Arrives at tree → enters decision phase (intent: 'deciding')  
3. Brief pause → decides to chop (intent: 'working')
4. Only chops while stationary and committed
5. Gets drafted → immediately interrupts, can move
```

## Implementation Files Created

### `src/game/systems/colonistIntent.ts`
- Core intent system with decision phases
- Interruption handling for emergencies/drafting
- Helper functions for managing colonist intentions

### Modified `src/game/colonist_systems/colonistFSM.ts`
- Added intent-based interruption system
- Modified `chop` case as example implementation
- Added drafting interruption at FSM entry point

## Key Benefits

### 1. **Realistic Behavior**
- Colonists must stop and decide before working
- No more "drive-by" actions
- Work only happens when stationary

### 2. **Better Player Control**
- Drafting interrupts any non-critical task immediately
- Emergency situations can break colonists out of work
- Clear visual feedback about colonist intentions

### 3. **Flexible Interruption Rules**
```typescript
// Different tasks can have different interruption policies
createWorkIntent(target, range, canCancel: true)  // Easy to interrupt
createRestIntent(bed, canCancel: false)           // Harder to interrupt
```

### 4. **Solves Specific Issues**
- ✅ **Bed Locks**: Colonists can be drafted out of beds
- ✅ **Drive-by Work**: Only work when stationary and committed  
- ✅ **Emergency Response**: Always interruptible for flee/medical
- ✅ **Task Transitions**: Clear decision points between activities

## Usage Examples

### Bed Interaction
```typescript
// Old: Automatic entry when in radius
if (nearBed) { automaticallyUseBed(); }

// New: Deliberate decision process
if (shouldEnterDecisionPhase(colonist, bed, range)) {
  setColonistIntent(colonist, 'deciding', { target: bed });
  // Brief pause, then decide whether to use bed
}
```

### Emergency Interruption
```typescript
// Works for any task - colonist cutting trees, using beds, building
if (playerDraftsColonist && canInterruptColonist(colonist)) {
  forceInterruptIntent(colonist, 'drafted by player');
  changeState('drafted', 'emergency control');
}
```

## Next Steps

To fully implement this system:

1. **Apply to More Tasks**: Extend beyond chopping to mining, building, bed usage
2. **Visual Feedback**: Show colonist decision states in UI
3. **Balance Timing**: Tune decision phase durations for different tasks
4. **Test Edge Cases**: Ensure smooth transitions between all intent states

This transforms colonists from **passive radius-responders** into **active decision-makers** who choose their actions deliberately and can be interrupted when needed.