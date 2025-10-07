# Medical System - Quick Implementation Guide

## Immediate Problems & Fixes

### Problem 1: No colonists perform medical work
**Issue:** Medical jobs are created but never assigned because colonists don't check for medical work in FSM

**Fix Location:** `src/game/colonist_systems/colonistFSM.ts` lines ~445-470

**Add this code in the `evaluateIntent()` function BEFORE the "heal" check:**

```typescript
// Medical work - ALL colonists can treat injuries (RimWorld style)
if (!c.inside && !danger && c.health && c.health.totalPain < 0.6) { // Only if not too injured themselves
  const medicalJob = medicalSystem.findMedicalWork(c, game.colonists, game);
  if (medicalJob) {
    set('medical', 95, 'medical work available');
  }
}
```

### Problem 2: Downed colonists never get rescued
**Issue:** No rescue system exists

**Quick Fix:** Add to Game.ts context menu handler (line ~2447):

```typescript
case 'medical_rescue':
  // Find nearest healthy colonist to perform rescue
  const rescuer = this.colonists.find(c => 
    c !== colonist && 
    c.alive && 
    c.state !== 'downed' &&
    c.health && 
    c.health.consciousness > 0.5
  );
  
  if (rescuer) {
    const bed = this.buildings.find(b => 
      b.kind === 'bed' && 
      b.done && 
      this.buildingHasSpace(b, colonist)
    );
    
    if (bed) {
      // Simple version: teleport to bed and start rest
      colonist.x = bed.x + bed.w / 2;
      colonist.y = bed.y + bed.h / 2;
      this.tryEnterBuilding(colonist, bed);
      colonist.state = 'resting';
      this.msg(`${rescuer.profile?.name || 'Colonist'} rescued ${colonist.profile?.name || 'patient'}`, 'good');
    } else {
      this.msg('No available bed', 'warn');
    }
  } else {
    this.msg('No healthy colonist available to rescue', 'warn');
  }
  break;
```

### Problem 3: Medical state doesn't exist in FSM
**Issue:** FSM has medical state check but no medical state handler

**Fix Location:** `src/game/colonist_systems/colonistFSM.ts` line ~590

**Add this case AFTER the `case 'medical':` section:**

```typescript
case 'medical': {
  const medicalJob = (c as any).medicalJob;
  if (!medicalJob) {
    // Try to find new medical work
    const newJob = medicalSystem.findMedicalWork(c, game.colonists, game);
    if (newJob) {
      medicalSystem.assignMedicalJob(c, newJob);
      (c as any).medicalJob = newJob;
    } else {
      changeState('seekTask', 'no medical work found');
      break;
    }
  }

  const patient = game.colonists.find((col: any) => 
    medicalSystem.getColonistId ? medicalSystem.getColonistId(col) === medicalJob.patientId : false
  );
  
  if (!patient || !patient.health) {
    changeState('seekTask', 'patient not found or healthy');
    (c as any).medicalJob = null;
    medicalSystem.completeMedicalJob(medicalJob.id);
    break;
  }

  // Move to patient
  const distance = Math.hypot(c.x - patient.x, c.y - patient.y);
  if (distance > 40) {
    game.moveAlongPath(c, dt, { x: patient.x, y: patient.y }, 40);
  } else {
    // Close enough to perform treatment
    if (!medicalJob.startTime) {
      medicalJob.startTime = c.t;
    }
    
    const elapsed = c.t - medicalJob.startTime;
    if (elapsed >= medicalJob.estimatedDuration) {
      // Perform the treatment
      const result = medicalSystem.performTreatment(c, patient, medicalJob, game);
      const treatmentName = medicalJob.treatment.name;
      
      if (result.success) {
        game.msg(`${c.profile?.name || 'Doctor'} successfully treated ${patient.profile?.name || 'Patient'} (quality: ${(result.quality * 100).toFixed(0)}%)`, 'good');
      } else {
        game.msg(`${c.profile?.name || 'Doctor'} failed to treat ${patient.profile?.name || 'Patient'}`, 'warn');
      }
      
      medicalSystem.completeMedicalJob(medicalJob.id);
      (c as any).medicalJob = null;
      changeState('seekTask', 'treatment completed');
    }
  }
  break;
}
```

### Problem 4: Context menu actions don't work
**Issue:** Medical context menu actions reference non-existent treatment IDs

**Fix Location:** `src/game/Game.ts` lines ~2387-2405

**Replace these cases:**

```typescript
case 'medical_bandage':
case 'medical_treat_infection':
case 'medical_surgery':
case 'medical_pain_relief':
case 'medical_treat_all':
```

**With:**

```typescript
case 'medical_bandage':
  // Simple bandage - works without medicine
  if (colonist.health) {
    const bleedingInjuries = colonist.health.injuries.filter(inj => inj.bleeding > 0.05 && !inj.bandaged);
    if (bleedingInjuries.length > 0) {
      for (const inj of bleedingInjuries) {
        inj.bandaged = true;
        inj.bleeding *= 0.3;
        inj.infectionChance *= 0.5;
      }
      this.msg(`Bandaged ${bleedingInjuries.length} wound(s)`, 'good');
    } else {
      this.msg('No bleeding wounds to bandage', 'info');
    }
  }
  break;

case 'medical_treat_infection':
  // Requires medicine
  if (colonist.health) {
    const infected = colonist.health.injuries.filter(inj => inj.infected);
    if (infected.length > 0 && this.RES.medicine && this.RES.medicine > 0) {
      for (const inj of infected) {
        inj.infected = false;
        inj.infectionChance = 0;
      }
      this.RES.medicine -= 1;
      this.msg(`Treated ${infected.length} infection(s)`, 'good');
    } else if (infected.length === 0) {
      this.msg('No infections to treat', 'info');
    } else {
      this.msg('No medicine available', 'warn');
    }
  }
  break;

case 'medical_surgery':
  // Requires medicine, treats gunshots and fractures
  if (colonist.health) {
    const surgical = colonist.health.injuries.filter(inj => 
      (inj.type === 'gunshot' || inj.type === 'fracture') && inj.severity > 0.4
    );
    if (surgical.length > 0 && this.RES.medicine && this.RES.medicine > 0) {
      for (const inj of surgical) {
        inj.severity *= 0.5; // Significantly reduce severity
        inj.pain *= 0.6;
        inj.healRate *= 2.5;
        inj.bandaged = true;
      }
      this.RES.medicine -= 1;
      this.msg(`Performed surgery on ${surgical.length} injury(s)`, 'good');
    } else if (surgical.length === 0) {
      this.msg('No injuries requiring surgery', 'info');
    } else {
      this.msg('No medicine available for surgery', 'warn');
    }
  }
  break;

case 'medical_pain_relief':
  // Reduce pain temporarily
  if (colonist.health && colonist.health.totalPain > 0.2) {
    colonist.health.totalPain *= 0.4;
    for (const inj of colonist.health.injuries) {
      inj.pain *= 0.4;
    }
    this.msg('Administered pain relief', 'good');
  } else {
    this.msg('Not experiencing significant pain', 'info');
  }
  break;

case 'medical_treat_all':
  // Assign comprehensive medical job
  if (colonist.health && colonist.health.injuries.length > 0) {
    // Find best doctor
    const doctor = this.findBestDoctor(colonist);
    if (doctor) {
      (doctor as any).assignedMedicalPatientId = (colonist as any).id || `colonist_${Date.now()}`;
      this.msg(`${doctor.profile?.name || 'Doctor'} assigned to treat ${colonist.profile?.name || 'patient'}`, 'info');
    } else {
      this.msg('No available doctor', 'warn');
    }
  }
  break;
```

### Problem 5: Colonists get "downed" state but it's not handled
**Issue:** Colonists can be set to "downed" but there's no FSM handler

**Fix Location:** `src/game/colonist_systems/colonistFSM.ts` - Add after line ~800

```typescript
case 'downed': {
  // Colonist is incapacitated - can't move
  c.speed = 0;
  
  // Slowly lose health if bleeding
  if (c.health && c.health.injuries.some(inj => inj.bleeding > 0.1)) {
    c.hp = Math.max(0, c.hp - 0.5 * dt);
  }
  
  // Can recover if health improves
  if (c.health && c.health.consciousness > 0.4 && c.health.totalPain < 0.5) {
    c.speed = 24; // Restore normal speed
    changeState('resting', 'regained consciousness');
  }
  
  // Death check
  if (c.hp <= 0) {
    c.alive = false;
    game.msg(`${c.profile?.name || 'Colonist'} has died`, 'bad');
  }
  break;
}
```

### Problem 6: No automatic "downed" state trigger
**Issue:** Colonists never enter downed state automatically

**Fix Location:** `src/game/health/healthSystem.ts` - Add to `updateHealthStats()` function (line ~103)

```typescript
// After updating consciousness
if (health.consciousness < 0.3 || health.totalPain > 0.8 || health.bloodLevel < 0.4) {
  // Colonist should be downed
  (colonist as any).shouldBeDown = true;
} else {
  (colonist as any).shouldBeDown = false;
}
```

Then in `src/game/Game.ts` in the main update loop (around line ~1100), add:

```typescript
// Check for downed colonists
for (const colonist of this.colonists) {
  if (colonist.alive && (colonist as any).shouldBeDown && colonist.state !== 'downed') {
    colonist.state = 'downed';
    this.msg(`${colonist.profile?.name || 'Colonist'} has collapsed!`, 'warn');
  }
}
```

## Adding Medicine Resources

**Fix Location:** `src/game/Game.ts` - constructor (line ~100)

```typescript
this.RES = { 
  wood: 100, 
  stone: 50, 
  food: 20,
  medicine: 5,  // Add this
  herbal: 3     // Add this
};
```

**Fix Location:** `src/game/types.ts` - Resources type (line ~5)

```typescript
export type Resources = { 
  wood: number; 
  stone: number; 
  food: number; 
  medicine: number;  // Add this
  herbal: number;    // Add this
};
```

## Testing Steps

1. **Test Basic Medical Work:**
   - Hurt a colonist (attack with enemy)
   - Another colonist should automatically move to treat them
   - Treatment should complete after duration
   - Injury should improve

2. **Test Downed State:**
   - Severely injure a colonist (multiple gunshots)
   - Colonist should collapse when consciousness/blood too low
   - Other colonist should be able to rescue via context menu
   - Patient should rest in bed

3. **Test Medicine:**
   - Set medicine count in resources
   - Treat infections or perform surgery
   - Medicine count should decrease

4. **Test Context Menu:**
   - Right-click injured colonist
   - All medical options should work
   - No errors in console

## Future Improvements (From MEDICAL_SYSTEM_REVAMP.md)

- Proper rescue/hauling with carrying mechanics
- Automatic rescue job creation for downed colonists
- Treatment quality display in UI
- Medical skill affects treatment speed
- Better triage system
- Medical room quality bonuses

## Common Issues

### "medicalSystem.getColonistId is not a function"
Make the `getColonistId` method public in medicalSystem.ts:
Change `private getColonistId` to `public getColonistId`

### Colonists ignore medical work
Check that you added the medical work check in `evaluateIntent()` function

### Context menu doesn't show medical options
Verify colonist has health data: `colonist.health` exists

### Medicine not consumed
Check that `this.RES.medicine` exists and is > 0

---

**Start with these fixes, test each one, then move to full rescue system implementation!**
