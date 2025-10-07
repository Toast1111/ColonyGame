# Medical System - Visual Implementation Guide

## 🎯 Quick Reference: Exact File Locations

### File 1: colonistFSM.ts - Medical Job Check

**Location:** `src/game/colonist_systems/colonistFSM.ts` around line 445

**Find this code:**
```typescript
function evaluateIntent(): { state: ColonistState; prio: number; reason: string } | null {
  let best: { state: ColonistState; prio: number; reason: string } | null = null;
  const set = (state: ColonistState, prio: number, reason: string) => {
    if (!best || prio > best.prio) best = { state, prio, reason };
  };
  // Highest first
  if (!c.inside && danger) set('flee', 100, 'danger detected');
  
  // Medical needs - check if colonist needs treatment or can provide it
  if (!c.inside && !danger && c.health && c.health.totalPain > 0.2) {
```

**Add THIS CODE right after the danger check and BEFORE the existing medical comment:**
```typescript
  // NEW CODE - Auto-assign medical work to any colonist
  if (!c.inside && !danger && c.health && c.health.totalPain < 0.6) {
    const medicalJob = medicalSystem.findMedicalWork(c, game.colonists, game);
    if (medicalJob) {
      set('medical', 95, 'medical work available');
    }
  }
  
  // (existing medical needs comment and code continues below)
```

---

### File 2: colonistFSM.ts - Medical State Handler

**Location:** `src/game/colonist_systems/colonistFSM.ts` around line 590

**Find this code:**
```typescript
case 'medical': {
  const medicalJob = (c as any).medicalJob;
  if (!medicalJob) {
    changeState('seekTask', 'no medical job assigned');
    break;
  }

  // Find the patient
  const patient = game.colonists.find((col: any) => 
    (col as any).id === medicalJob.patientId
  );
```

**REPLACE the entire `case 'medical':` block with:**
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
    medicalSystem.getColonistId(col) === medicalJob.patientId
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

---

### File 3: colonistFSM.ts - Downed State Handler

**Location:** `src/game/colonist_systems/colonistFSM.ts` around line 800

**Find the end of the switch statement (after all other cases), add NEW CASE:**
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

---

### File 4: Game.ts - Context Menu Medical Actions

**Location:** `src/game/Game.ts` around line 2387

**Find and REPLACE:**
```typescript
// Medical actions
case 'medical_bandage':
  this.assignMedicalTreatment(colonist, 'bandage_wound');
  break;
case 'medical_treat_infection':
  this.assignMedicalTreatment(colonist, 'treat_infection');
  break;
case 'medical_surgery':
  this.assignMedicalTreatment(colonist, 'remove_bullet');
  break;
case 'medical_pain_relief':
  this.assignMedicalTreatment(colonist, 'pain_management');
  break;
case 'medical_treat_all':
  this.assignComprehensiveMedicalCare(colonist);
  break;
```

**WITH:**
```typescript
// Medical actions
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
        inj.severity *= 0.5;
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
  if (colonist.health && colonist.health.injuries.length > 0) {
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

---

### File 5: Game.ts - Auto-Downed State Check

**Location:** `src/game/Game.ts` in the main update loop around line 1100

**Find the colonist update loop:**
```typescript
// Update colonists
for (const c of this.colonists) {
  if (!c.alive) continue;
  
  // ... other updates ...
```

**Add THIS CODE in the colonist loop AFTER health updates:**
```typescript
// Check for downed state (add after health system updates)
if (c.health && c.alive && c.state !== 'downed') {
  if (c.health.consciousness < 0.3 || c.health.totalPain > 0.8 || c.health.bloodLevel < 0.4) {
    c.state = 'downed';
    c.speed = 0;
    this.msg(`${c.profile?.name || 'Colonist'} has collapsed!`, 'warn');
  }
}
```

---

## 🧪 Testing Steps

### Test 1: Basic Medical Treatment

1. Start the game
2. Let an enemy attack a colonist (or damage them manually in console)
3. **Expected:** Another colonist should automatically move to the injured one
4. **Expected:** After ~30 seconds, you should see "X successfully treated Y" message
5. **Expected:** Injury should improve (check debug panel)

**If this doesn't work:** Check you added the code in File 1 & File 2

### Test 2: Context Menu Actions

1. Right-click an injured colonist
2. Click "Medical" submenu
3. Click "Bandage Wounds"
4. **Expected:** Message "Bandaged X wound(s)"
5. **Expected:** Bleeding reduced on injuries

**If this doesn't work:** Check you added the code in File 4

### Test 3: Downed State

1. Severely injure a colonist (multiple gunshots)
2. **Expected:** Message "X has collapsed!" when health too low
3. **Expected:** Colonist can't move (speed = 0)
4. **Expected:** Can right-click and select "Rescue to Bed"

**If this doesn't work:** Check you added the code in File 3 & File 5

---

## 🐛 Debugging

### Console Errors to Watch For

**Error:** `medicalSystem.getColonistId is not a function`
**Fix:** Already fixed in medicalSystem.ts (method is public)

**Error:** `Cannot read property 'findMedicalWork' of undefined`
**Fix:** Make sure to import medicalSystem at top of colonistFSM.ts:
```typescript
import { medicalSystem } from "../health/medicalSystem";
```

**Error:** State transition errors
**Fix:** Make sure the medical state handler is properly closed with `break;`

### Debug Commands (in browser console)

Check if medical system is loaded:
```javascript
window.game.medicalSystem
```

Check colonist health:
```javascript
window.game.colonists[0].health
```

Force create injury for testing:
```javascript
const c = window.game.colonists[0];
window.game.damageBodyPart(c.health, 'torso', 20, 'gunshot', Date.now());
```

---

## ✅ Implementation Checklist

- [ ] File 1: Added medical job check to evaluateIntent()
- [ ] File 2: Replaced medical state handler
- [ ] File 3: Added downed state handler
- [ ] File 4: Fixed context menu medical actions
- [ ] File 5: Added auto-downed state check
- [ ] Tested: Colonists auto-treat each other
- [ ] Tested: Context menu medical options work
- [ ] Tested: Colonists collapse when severely injured
- [ ] Tested: Medicine count decreases when used

---

## 📝 Notes

- These changes are **non-breaking** - existing functionality continues to work
- Medicine starts at 5 units - use wisely!
- Treatment quality depends on Medicine skill level (0-20)
- All colonists can treat, but higher skill = better outcomes
- See `MEDICAL_SYSTEM_REVAMP.md` for full design philosophy

**Total implementation time: ~30 minutes if you follow this guide!**
