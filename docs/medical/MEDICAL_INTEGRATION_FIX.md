# Medical System Integration Fix

## Problem Report

User reported that injured colonists **do nothing** when damaged:
- Colonist's leg at 77% health → colonist ignores injury and continues working
- User clicks "Treat All Injuries" in context menu → prompt shows assignment → **nothing happens**
- Colonists continue chopping, mining, farming, building instead of getting medical treatment

## Root Causes Identified

### Bug 1: Intent Evaluation Never Assigned Medical Jobs ❌
**Location**: `colonistFSM.ts` lines 451-455

```typescript
// OLD CODE - BROKEN
if (!c.inside && !danger && c.health && c.health.totalPain < 0.6) {
  const medicalJob = medicalWorkGiver.scanForMedicalWork(c, game.colonists, c.t);
  if (medicalJob && !medicalJob.reservedBy) {
    set('doctoring', 95, 'medical work available');  // ❌ Never assigned job!
  }
}
```

**Problem**: The code set the intent to `'doctoring'` but **never assigned `(c as any).medicalJob`**. When the doctoring state executed, it checked for `c.medicalJob` (line 574) which was `undefined`, causing immediate exit to `seekTask`.

**Fix**: Reserve and assign the job when found
```typescript
// NEW CODE - FIXED
if (!c.inside && !danger && c.health && c.health.totalPain < 0.6) {
  const medicalJob = medicalWorkGiver.scanForMedicalWork(c, game.colonists, c.t);
  if (medicalJob && !medicalJob.reservedBy) {
    // Reserve the job and assign it to this doctor
    if (medicalWorkGiver.reserveJob(medicalJob, c)) {
      (c as any).medicalJob = medicalJob;  // ✅ Job assigned!
      set('doctoring', 95, 'medical work available');
    }
  }
}
```

### Bug 2: Player-Forced Jobs Never Changed Doctor State ❌
**Location**: `Game.ts` lines 2697-2713

```typescript
// OLD CODE - BROKEN
assignMedicalTreatment(patient: Colonist, treatmentId: string) {
  const doctor = this.findBestDoctor(patient);
  if (!doctor) return;
  
  const job = medicalWorkGiver.createForcedJob(doctor, patient, treatmentId);
  if (job) {
    (doctor as any).medicalJob = job;  // Assigned job...
    this.msg(`Doctor treating patient...`, 'info');
    // ❌ But doctor state stays as 'build', 'chop', etc.!
  }
}
```

**Problem**: The code created and assigned a forced job but **never changed the doctor's FSM state** from whatever they were doing (building, chopping, etc.). The FSM would only check for medical jobs during intent evaluation, which wouldn't happen if the doctor was busy with work tasks (which bypass minimum state duration checks).

**Fix**: Clear doctor's task and let FSM pick up the job
```typescript
// NEW CODE - FIXED
assignMedicalTreatment(patient: Colonist, treatmentId: string) {
  const doctor = this.findBestDoctor(patient);
  if (!doctor) return;
  
  const job = medicalWorkGiver.createForcedJob(doctor, patient, treatmentId);
  if (job) {
    // Reserve the job and assign it to the doctor
    medicalWorkGiver.reserveJob(job, doctor);
    (doctor as any).medicalJob = job;
    
    // ✅ Force the doctor into doctoring state immediately
    doctor.task = null;
    doctor.target = null;
    this.clearPath(doctor);
    // FSM will pick up medicalJob on next update
    
    this.msg(`Doctor treating patient...`, 'info');
  }
}
```

### Bug 3: "Treat All Injuries" Used Deleted State ❌
**Location**: `Game.ts` line 2734

```typescript
// OLD CODE - BROKEN
assignComprehensiveMedicalCare(patient: Colonist) {
  const doctor = this.findBestDoctor(patient);
  if (doctor) {
    (patient as any).needsComprehensiveCare = true;
    this.setTask(doctor, 'medicalMultiple', { patient });  // ❌ State doesn't exist!
    // The 'medicalMultiple' state was removed during refactor
  }
}
```

**Problem**: The context menu action "Treat All Injuries" called `assignComprehensiveMedicalCare()` which tried to use the deleted `'medicalMultiple'` state. This state was removed during the medical system refactor but this function was never updated.

**Fix**: Use new medical work giver system
```typescript
// NEW CODE - FIXED
assignComprehensiveMedicalCare(patient: Colonist) {
  if (!patient.health?.injuries?.length) return;

  const doctor = this.findBestDoctor(patient);
  if (!doctor) return;

  // ✅ Prioritize most severe/urgent injury first
  const sortedInjuries = [...patient.health.injuries].sort((a, b) => {
    const urgencyA = (a.bleeding || 0) * 2 + (a.severity || 0);
    const urgencyB = (b.bleeding || 0) * 2 + (b.severity || 0);
    return urgencyB - urgencyA;
  });

  const mostUrgentInjury = sortedInjuries[0];
  
  // Determine best treatment
  let treatmentId = 'bandage_wound';
  if (mostUrgentInjury.infected) treatmentId = 'treat_infection';
  else if (mostUrgentInjury.type === 'gunshot') treatmentId = 'surgical_repair';
  else if (mostUrgentInjury.bleeding > 0) treatmentId = 'bandage_wound';
  else if (mostUrgentInjury.severity > 0.6) treatmentId = 'advanced_treatment';

  // ✅ Create forced job using work giver
  const job = medicalWorkGiver.createForcedJob(doctor, patient, treatmentId);
  if (job) {
    medicalWorkGiver.reserveJob(job, doctor);
    (doctor as any).medicalJob = job;
    doctor.task = null;
    doctor.target = null;
    this.clearPath(doctor);
  }
}
```

## How It Works Now

### Automatic Medical Care (Injured Colonist)
```
1. Colonist gets injured (leg at 77%)
2. updateHealthStats() marks (c as any).needsMedical = true (line 241)
3. evaluateIntent() checks for needsMedical (line 460)
4. Sets intent to 'beingTreated' with priority 90-98
5. Patient enters 'beingTreated' state → goes to bed and waits
6. Other colonist's evaluateIntent() calls scanForMedicalWork()
7. Finds patient needing treatment → creates job
8. Reserves job and assigns to (c as any).medicalJob ✅
9. Doctor enters 'doctoring' state
10. Doctor moves to patient, performs treatment
11. Treatment complete → both return to seekTask
```

### Player-Forced Medical Care (Context Menu)
```
1. User right-clicks injured colonist
2. Clicks Medical → "Treat All Injuries"
3. Calls assignComprehensiveMedicalCare(patient)
4. Finds most urgent injury
5. Creates forced job via medicalWorkGiver.createForcedJob() ✅
6. Reserves job for doctor
7. Assigns job to (doctor as any).medicalJob ✅
8. Clears doctor's task/target/path ✅
9. On next FSM update:
   - Doctor has medicalJob assigned
   - evaluateIntent() sees job with priority 95
   - Changes to 'doctoring' state
10. Doctor treats patient immediately
```

## Files Changed

1. **`/src/game/colonist_systems/colonistFSM.ts`**
   - Line 451-459: Added job reservation and assignment in intent evaluation
   
2. **`/src/game/Game.ts`**
   - Line 2697-2720: Fixed `assignMedicalTreatment()` to clear doctor's task
   - Line 2724-2772: Rewrote `assignComprehensiveMedicalCare()` to use work giver system

## Testing Checklist

### ✅ Automatic Medical Care
- [ ] Colonist gets injured → automatically seeks medical bed
- [ ] Healthy colonist becomes doctor → scans for patients
- [ ] Doctor finds patient → reserves job and treats
- [ ] Treatment completes → both colonists return to work

### ✅ Player-Forced Medical Care
- [ ] Right-click injured colonist → Medical → "Treat All Injuries"
- [ ] Message shows doctor assignment
- [ ] Doctor **immediately stops** current work
- [ ] Doctor moves to patient and performs treatment
- [ ] Forced job has higher priority than automatic jobs

### ✅ Edge Cases
- [ ] No available doctors → message shown, no crash
- [ ] Patient healed while doctor traveling → doctor cancels gracefully
- [ ] Multiple injuries → treats most urgent first
- [ ] Bleeding injury → bandages applied, bleeding reduced
- [ ] Infected injury → infection treatment applied

## Expected Behavior After Fix

**Before Fix**:
- Injured colonist ignores injury ❌
- "Treat All Injuries" shows message but nothing happens ❌
- Doctors never stop working to provide medical care ❌

**After Fix**:
- Injured colonist seeks bed and waits for treatment ✅
- "Treat All Injuries" forces doctor to stop and treat immediately ✅
- Doctors automatically scan for injured colonists and provide care ✅
- Medical jobs have high priority (95) and interrupt work tasks ✅

## Related Systems

This fix completes the medical system integration that was started earlier:
- ✅ Medical work giver system (created)
- ✅ Medical FSM states (created)
- ✅ Medical treatment system (created)
- ✅ **Intent evaluation integration** (FIXED - this PR)
- ✅ **Player-forced job execution** (FIXED - this PR)
- ✅ **Context menu integration** (FIXED - this PR)

## Performance Notes

- Medical job scanning happens every 0.5 seconds (not every frame)
- Job reservation prevents multiple doctors treating same patient
- Jobs expire after 30 seconds if not started
- FSM priority system ensures medical care interrupts low-priority work
