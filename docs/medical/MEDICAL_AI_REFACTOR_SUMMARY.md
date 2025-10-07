# Medical AI System Refactor - Based on RimWorld

## Problem
The current medical system is confusing with multiple overlapping states (`medical`, `seekMedical`, `medicalMultiple`) that don't follow RimWorld's clear job-based architecture. Colonists behave unintelligently, don't properly claim work, and the context menu actions don't connect to actual medical work.

## Solution - RimWorld-Style Work Giver Architecture

### 1. ✅ Created `medicalWorkGiver.ts` (COMPLETED)
A proper job scanner based on RimWorld's WorkGiver system:

**Key Features:**
- `scanForMedicalWork()` - Main entry point called from FSM, scans for available medical work
- Priority-based job selection (emergency > urgent > normal)
- Proper job reservation/claiming to prevent multiple doctors treating same patient
- Player-forced jobs override automatic priority
- Automatic job cleanup and expiration
- Triage system based on urgency (bleeding, downed, infection, severity)

**Job Flow:**
1. FSM calls `medicalWorkGiver.scanForMedicalWork(doctor, allColonists, currentTime)`
2. Work giver scans for patients needing treatment
3. Creates prioritized jobs with treatments matched to doctor skill
4. Doctor reserves job, preventing other doctors from taking it
5. Job completed or released if patient healed/died

### 2. ✅ Updated FSM States (COMPLETED)
Replaced confusing medical states with two clear states:

**`doctoring` State** - Doctor actively treating a patient
- Doctor has a `medicalJob` assigned
- Moves to patient location
- Performs treatment after duration
- Grants Medicine XP based on difficulty
- Completes job and returns to work

**`beingTreated` State** - Patient receiving/awaiting treatment
- Triggered when colonist has `needsMedical` flag
- Seeks medical bed (prefers medical beds for severe injuries)
- Stays still when being actively treated (checks `isBeingTreated` flag)
- Faces doctor during treatment
- Returns to work when injuries are minor

**Removed States:**
- ~~`medical`~~ → `doctoring`
- ~~`seekMedical`~~ → automatic via work scanning
- ~~`medicalMultiple`~~ → handled by job priority

### 3. Updated Type Definitions
```typescript
// Added new states to ColonistState type
export type ColonistState = ... | 'doctoring' | 'beingTreated' | ...
```

### 4. ⚠️ CRITICAL ISSUE - medicalSystem.ts is Corrupted
The file `src/game/health/medicalSystem.ts` got corrupted during edits and needs to be restored.

**Required Fix:**
```bash
cd /workspaces/ColonyGame
git checkout HEAD -- src/game/health/medicalSystem.ts
```

Then simplify it to only contain:
- `MEDICAL_TREATMENTS` export (unchanged)
- `MedicalPriority` enum (unchanged)
- `performTreatment(doctor, patient, job, deltaTime)` method
- Remove all job management code (now in medicalWorkGiver)

**Simplified MedicalSystem class should only handle:**
- Treatment application
- Success/failure calculation based on skill
- Treatment effects (bandaging, pain reduction, healing bonus)
- XP granting

## What Still Needs to be Done

### 5. ❌ Integrate Job Reservation in FSM
The `doctoring` state needs to properly reserve jobs:

```typescript
case 'doctoring': {
  const job: MedicalJob | undefined = (c as any).medicalJob;
  
  if (!job) {
    // Try to find and reserve a job
    const availableJob = medicalWorkGiver.scanForMedicalWork(c, game.colonists, c.t);
    if (availableJob && medicalWorkGiver.reserveJob(availableJob, c)) {
      (c as any).medicalJob = availableJob;
    } else {
      changeState('seekTask', 'no medical work available');
      break;
    }
  }
  
  // ... rest of doctoring logic ...
}
```

### 6. ❌ Fix Context Menu Medical Actions
Update `src/game/ui/contextMenus/colonistMenu.ts` and `src/game/Game.ts` to use the new system:

**Context Menu Actions:**
- "Treat [Patient]" → `medicalWorkGiver.createForcedJob(doctor, patient)`
- "Bandage Wounds" → `medicalWorkGiver.createForcedJob(doctor, patient, 'bandage_wound')`
- "Treat Infection" → `medicalWorkGiver.createForcedJob(doctor, patient, 'treat_infection')`
- "Surgery" → `medicalWorkGiver.createForcedJob(doctor, patient, 'remove_bullet')`

**Implementation:**
```typescript
// In Game.ts handleContextMenuAction()
case 'prioritize_treat_patient': {
  if (this.selColonist && target) {
    const job = medicalWorkGiver.createForcedJob(this.selColonist, target);
    if (job) {
      (this.selColonist as any).medicalJob = job;
      (this.selColonist as any).state = 'doctoring';
      this.msg(`${this.selColonist.profile?.name} will treat ${target.profile?.name}`, 'good');
    }
  }
  break;
}
```

### 7. ❌ Add Patient Behavior Intelligence
Patients should:
- Automatically seek beds when seriously injured
- Stay in bed when `isBeingTreated` is set
- Not wander off mid-treatment
- Prioritize medical beds for surgery/severe injuries
- Return to light work if injuries are minor

### 8. ❌ Testing Scenarios
Test the following:
1. **Downed Colonist** - Should be highest priority, doctor rushes to treat
2. **Bleeding Injury** - Doctor bandages wounds before infection sets in
3. **Multiple Patients** - Triage works correctly, most urgent treated first
4. **Player-Forced Treatment** - Context menu selection overrides automatic priority
5. **Infection** - Infected colonists prioritized over minor injuries
6. **Surgery** - High-skill treatments require skilled doctors
7. **Bed Assignment** - Patients correctly seek and claim medical beds

## Benefits of New System

**RimWorld-Like Intelligence:**
- Clear priority system (bleed > infect > pain)
- Proper job claiming prevents duplicate work
- Skill-based treatment assignment
- Emergent behavior from simple rules

**Performance:**
- Throttled scanning (0.5s intervals)
- Automatic job cleanup
- No redundant state checks

**Player Control:**
- Force specific treatments via context menu
- Assign specific doctor to patient
- Clear feedback on what's happening

**Maintainability:**
- Separation of concerns (work scanning vs. treatment vs. FSM)
- Single source of truth for medical jobs
- Easy to add new treatments or conditions

## Files Modified
1. ✅ `/src/game/health/medicalWorkGiver.ts` - NEW, RimWorld-style work giver
2. ✅ `/src/game/types.ts` - Updated ColonistState type
3. ✅ `/src/game/colonist_systems/colonistFSM.ts` - New states and work scanning
4. ⚠️ `/src/game/health/medicalSystem.ts` - NEEDS FIX (corrupted)
5. ❌ `/src/game/ui/contextMenus/colonistMenu.ts` - TODO: Wire up actions
6. ❌ `/src/game/Game.ts` - TODO: Handle context menu medical actions

## Next Steps
1. **Fix medicalSystem.ts** - Restore from git and simplify
2. **Add job reservation** - Update FSM to properly claim/release jobs
3. **Wire context menus** - Connect UI actions to forced jobs
4. **Test thoroughly** - All scenarios above
5. **Document behavior** - Update game documentation with new medical system

## Architecture Diagram
```
Player Action (Context Menu)
    ↓
medicalWorkGiver.createForcedJob()
    ↓
MedicalJob (reserved, priority=0)
    ↓
FSM evaluateIntent() → 'doctoring' state
    ↓
moveToPatient() → performTreatment()
    ↓
medicalSystem.performTreatment()
    ↓
Grant XP, apply effects, complete job
    ↓
medicalWorkGiver.completeJob()
```

## Comparison to Old System

### Old (Confusing)
- Multiple overlapping states
- No clear job claiming
- Duplicate work common
- Context menus disconnected
- No priority system
- State transitions unclear

### New (RimWorld-Style)
- Two clear states: doctoring/beingTreated
- Proper job reservation
- Triage-based priority
- Context menus create forced jobs
- Skill-based assignment
- Emergent intelligent behavior
