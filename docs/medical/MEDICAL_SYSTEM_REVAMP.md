# Medical System Revamp - Implementation Plan

## Current Problems

1. **No rescue/hauling system** - Downed colonists can't be carried to beds
2. **Medical work is broken** - Only "doctors" can treat, but no colonists are designated as doctors
3. **Low mobility trap** - Injured colonists sit with low mobility forever without treatment
4. **Context menu is clunky** - Medical options are confusing and don't work properly
5. **No medicine integration** - Treatments don't use medicine items properly
6. **Skill system not utilized** - Medical skill doesn't affect treatment quality or speed

## New Design (RimWorld-Inspired)

### Core Principles

1. **Anyone can treat** - All colonists can perform medical work
2. **Skill affects quality** - Higher medical skill = better treatment quality, faster treatment, less complications
3. **Medicine improves outcomes** - Using medicine significantly improves treatment quality and prevents infections
4. **Rescue mechanics** - Healthy colonists can rescue and haul downed colonists to beds
5. **Automated job assignment** - Medical jobs are automatically assigned based on priority

### Treatment Quality System

**Treatment Quality = Base Quality + Skill Bonus + Medicine Bonus**

- **No Medicine**: 30% base quality, high complication risk
- **Herbal Medicine**: 50% base quality, moderate complication risk  
- **Medicine**: 75% base quality, low complication risk
- **Skill Bonus**: +3% quality per skill level (max +60% at level 20)

**Effects of Quality:**
- Higher quality = better pain reduction
- Higher quality = faster healing
- Higher quality = better infection prevention
- Higher quality = reduced bleeding

### Medicine Types

1. **None** - Basic wound care, low quality (30%)
2. **Herbal** - Traditional remedies, decent quality (50%)
3. **Medicine** - Professional medical supplies, high quality (75%)
4. **Advanced** - Future: Glitterworld medicine (90%+)

### Medical Job Priority System

1. **CRITICAL** - Downed colonists, severe bleeding (>60% severity + bleeding)
2. **URGENT** - Infections (especially head), moderate bleeding (>40% severity)
3. **NORMAL** - High pain (>40%), severe injuries
4. **ROUTINE** - Minor wounds, preventive care

### Rescue System

**Downed State Triggers:**
- Consciousness < 0.2 (from blood loss, pain, head injury)
- Total pain > 0.8
- Blood level < 0.3

**Rescue Process:**
1. Colonist detects downed ally
2. Creates rescue job (high priority)
3. Healthy colonist picks up job
4. Carries patient to nearest available bed
5. Patient rests in bed while receiving treatment

### Treatment Types

1. **Tend Wounds (No Medicine)** - 20s base, low quality, anyone can do
2. **Tend Wounds (Herbal)** - 25s base, decent quality, uses herbal medicine  
3. **Tend Wounds (Medicine)** - 30s base, high quality, uses medicine
4. **Surgery** - 120s base, removes bullets/sets bones, requires medicine
5. **Treat Infection** - 45s base, cures infections, requires medicine

### FSM State Changes

**New States:**
- `rescue` - Carrying a downed colonist to safety
- `rescuing` - In process of picking up patient
- `treating` - Actively performing medical treatment
- `downed` - Colonist is incapacitated and needs rescue

**Medical State Flow:**
```
seekTask -> medical (if has medical work available)
medical -> treating (when reaches patient)
treating -> seekTask (when treatment complete)
idle -> rescue (if downed colonist detected)
rescue -> carrying patient -> delivering to bed -> seekTask
```

### Context Menu Improvements

**Medical Submenu (Dynamic based on colonist state):**

**If Downed:**
- 🚑 Rescue to Bed [Initiates rescue job]

**If Injured:**
- 🩹 Tend Wounds [Auto-selects best available medicine]
- 💊 Treat Infection [If infected]
- ⚕️ Surgery [If has bullets/fractures]
- 🛌 Bed Rest [Forces colonist to rest]

**Priority Assignment:**
- 🩺 Prioritize Treating [Patient] [When doctor selected + patient right-clicked]

### Implementation Steps

#### Phase 1: Core Medical System (DONE)
- [x] New treatment types with medicine integration
- [x] Quality calculation based on skill + medicine
- [x] Treatment duration modified by skill
- [x] Medicine consumption system

#### Phase 2: Downed State & Rescue
- [ ] Add "downed" state trigger based on health
- [ ] Implement rescue job system
- [ ] Add "rescue" and "carrying" FSM states
- [ ] Carrying mechanics (patient follows rescuer position)
- [ ] Deliver to bed functionality

#### Phase 3: Medical Job Assignment
- [ ] Update FSM to check for medical work
- [ ] Auto-assign medical jobs based on priority
- [ ] Treatment progress tracking
- [ ] Complete treatment application

#### Phase 4: Context Menu Overhaul
- [ ] Simplified medical options
- [ ] Dynamic menu based on injury state
- [ ] Clear rescue option for downed colonists
- [ ] Doctor-patient priority assignment

#### Phase 5: UI Improvements
- [ ] Treatment quality indicator
- [ ] Medicine stock display
- [ ] Active medical jobs list
- [ ] Injury summary improvements

## Technical Details

### New Types Needed

```typescript
// Add to types.ts
export type ColonistState = '...' | 'rescue' | 'rescuing' | 'treating' | 'downed';

// Add to Colonist type
carrying?: Colonist; // Patient being carried
beingCarried?: boolean; // Is this colonist being carried
```

### Game.ts Changes

```typescript
// Add medicine resources
this.RES = { 
  wood: 100, 
  stone: 50, 
  food: 20,
  medicine: 10,  // NEW
  herbal: 5      // NEW
};

// Check for downed colonists each frame
updateColonistDownedState(colonist) {
  if (colonist.health.consciousness < 0.2 || 
      colonist.health.totalPain > 0.8 || 
      colonist.health.bloodLevel < 0.3) {
    colonist.state = 'downed';
    colonist.speed = 0; // Can't move
  }
}
```

### FSM Changes (colonistFSM.ts)

```typescript
case 'downed': {
  // Colonist is incapacitated
  // Slowly recover consciousness if not bleeding
  if (c.health.bloodLevel > 0.5 && c.health.totalPain < 0.5) {
    c.health.consciousness = Math.min(1.0, c.health.consciousness + 0.01 * dt);
    if (c.health.consciousness > 0.3) {
      changeState('resting', 'regained consciousness');
    }
  }
  break;
}

case 'rescue': {
  const rescueJob = (c as any).rescueJob;
  if (!rescueJob || !rescueJob.patient) {
    changeState('seekTask', 'no rescue job');
    break;
  }
  
  const patient = rescueJob.patient;
  const bed = rescueJob.targetBed;
  
  if (!c.carrying) {
    // Move to patient
    const dist = Math.hypot(c.x - patient.x, c.y - patient.y);
    if (dist < 30) {
      // Pick up patient
      c.carrying = patient;
      patient.beingCarried = true;
      changeState('carrying', 'picked up patient');
    } else {
      game.moveAlongPath(c, dt, patient, 30);
    }
  }
  break;
}

case 'carrying': {
  const patient = c.carrying;
  if (!patient) {
    changeState('seekTask', 'lost patient');
    break;
  }
  
  // Patient follows rescuer
  patient.x = c.x;
  patient.y = c.y;
  
  // Move to bed
  const bed = (c as any).rescueJob?.targetBed;
  if (!bed) {
    changeState('seekTask', 'no bed for patient');
    break;
  }
  
  const bedCenter = { x: bed.x + bed.w/2, y: bed.y + bed.h/2 };
  const dist = Math.hypot(c.x - bedCenter.x, c.y - bedCenter.y);
  
  if (dist < 40) {
    // Deliver patient to bed
    patient.x = bedCenter.x;
    patient.y = bedCenter.y;
    patient.inside = bed;
    patient.state = 'resting';
    patient.beingCarried = false;
    c.carrying = undefined;
    
    medicalSystem.completeRescueJob((c as any).rescueJob.id);
    (c as any).rescueJob = undefined;
    
    changeState('seekTask', 'delivered patient');
  } else {
    game.moveAlongPath(c, dt, bedCenter, 40);
  }
  break;
}

case 'treating': {
  const medicalJob = (c as any).medicalJob;
  if (!medicalJob) {
    changeState('seekTask', 'no medical job');
    break;
  }
  
  const patient = game.colonists.find(col => 
    medicalSystem.getColonistId(col) === medicalJob.patientId
  );
  
  if (!patient) {
    changeState('seekTask', 'patient not found');
    break;
  }
  
  // Move to patient
  const dist = Math.hypot(c.x - patient.x, c.y - patient.y);
  if (dist > 40) {
    game.moveAlongPath(c, dt, patient, 40);
  } else {
    // Perform treatment over time
    if (!medicalJob.startTime) {
      medicalJob.startTime = c.t;
    }
    
    const elapsed = c.t - medicalJob.startTime;
    if (elapsed >= medicalJob.estimatedDuration) {
      // Treatment complete
      const result = medicalSystem.performTreatment(c, patient, medicalJob, game);
      
      if (result.success) {
        game.msg(`${c.profile?.name} successfully treated ${patient.profile?.name} (${(result.quality*100).toFixed(0)}% quality)`, 'good');
      } else {
        game.msg(`${c.profile?.name} botched treatment on ${patient.profile?.name}`, 'warn');
      }
      
      medicalSystem.completeMedicalJob(medicalJob.id);
      (c as any).medicalJob = undefined;
      changeState('seekTask', 'treatment complete');
    }
  }
  break;
}
```

## Testing Checklist

- [ ] Colonist gets injured -> becomes downed
- [ ] Healthy colonist automatically rescues downed colonist
- [ ] Patient is carried to bed
- [ ] Medical treatment is automatically assigned
- [ ] Treatment quality varies with skill level
- [ ] Medicine improves treatment outcomes
- [ ] No medicine = basic treatment still works
- [ ] Infections are treated and cured
- [ ] Bleeding is stopped
- [ ] Context menu shows appropriate options
- [ ] Multiple colonists can be treated simultaneously
- [ ] Rescue jobs are prioritized over other work

## Future Enhancements

1. **Medical Room Quality** - Better treatment in dedicated medical rooms
2. **Hospital Beds** - Special beds that improve treatment quality
3. **Surgery Success Rate** - Complex surgeries can fail based on skill
4. **Medicine Crafting** - Colonists can craft herbal medicine
5. **Medical Training** - Practice on corpses/prisoners to gain skill
6. **Triage System** - Multiple patients prioritized by severity
7. **Disease System** - Plagues, infections spread, quarantine
8. **Prosthetics** - Replace lost limbs with prosthetics
9. **Drug System** - Painkillers, antibiotics, stimulants

## Code Files to Modify

1. ✅ `src/game/health/medicalSystem.ts` - Core medical logic
2. ⏳ `src/game/colonist_systems/colonistFSM.ts` - Add rescue/treating states
3. ⏳ `src/game/types.ts` - Add new states and properties
4. ⏳ `src/game/ui/contextMenu.ts` - Simplify medical menu
5. ⏳ `src/game/Game.ts` - Add medicine resources, downed state checking
6. ⏳ `src/game/health/healthSystem.ts` - Add downed state trigger

---

**Status:** Phase 1 Complete - Core medical system with skill + medicine integration
**Next:** Implement downed state and rescue system
