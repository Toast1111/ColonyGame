# Combat Manager System - Complete Implementation Guide

## Overview

The new **CombatManager** replaces scattered FSM combat logic with a centralized, intelligent tactical AI system inspired by RimWorld's combat mechanics.

### The Problem

**Before:**
- ❌ Combat logic scattered across colonistFSM.ts (flee state) and pawnCombat.ts
- ❌ Simple "run to nearest building" flee behavior
- ❌ No tactical positioning or cover-seeking
- ❌ No threat assessment or priority targeting
- ❌ Colonists have "survival instincts of a squirrel in the middle of a road"
- ❌ No coordination between colonists (focus fire, flanking)
- ❌ No differentiation between critical/minor threats

**After:**
- ✅ Centralized combat decision-making in CombatManager
- ✅ Intelligent threat assessment and priority targeting
- ✅ Cover-seeking and tactical positioning
- ✅ Coordinated focus fire on dangerous enemies
- ✅ Smart retreat with defensive positions
- ✅ Combat role assignment based on skills/health
- ✅ Hysteresis-based danger detection (no state flipping)

---

## Architecture

### Core Components

```
CombatManager (new)
├── Threat Assessment
│   ├── ThreatAssessment (per enemy)
│   ├── Distance + LoS calculation
│   └── Threat level scoring (0-100)
├── Tactical Positioning
│   ├── Cover position calculation
│   ├── Safety score evaluation
│   └── Defensive position selection
├── Combat Assignment
│   ├── Role assignment (engage/retreat/cover/flank)
│   ├── Target selection (focus fire)
│   └── Priority calculation
└── Decision Making
    ├── Should flee? (hysteresis)
    ├── Should take cover?
    └── Best target selection
```

---

## Key Features

### 1. Threat Assessment

**ThreatAssessment Interface:**
```typescript
{
  enemy: Enemy;
  distance: number;
  threatLevel: number; // 0-100, higher = more dangerous
  lineOfSight: boolean;
  canReach: boolean;
  estimatedTimeToReach: number;
}
```

**Threat Level Calculation:**
- Base threat: 50
- Distance factor: +30 for close enemies (inverse)
- Health factor: +10 for healthy enemies
- Line of sight: +10
- Very close (<80px): +20 (critical)
- **Result:** Prioritizes close, healthy enemies with LoS

### 2. Cover System

**CombatPosition Interface:**
```typescript
{
  x: number;
  y: number;
  coverValue: number; // 0-1, higher = better
  distanceToThreat: number;
  safetyScore: number; // Combined metric
  building?: Building;
}
```

**Cover Sources:**
- **Walls:** 75% cover when directly blocking LoS
- **Buildings (houses/HQ):** 100% cover (full protection)
- **Turrets:** 50% cover (defensive structures)
- **Nearby walls:** 30% cover (even if not directly blocking)

**Safety Score Formula:**
```
safetyScore = coverValue * 0.7 + distanceFromThreat * 0.3
```

### 3. Focus Fire Coordination

**How It Works:**
1. Each colonist tracks their target in `focusFireTargets` map
2. When selecting targets, bonus for 1-2 colonists already shooting same enemy (+25 score)
3. Penalty if 3+ colonists on same target (-15 score) - spread out
4. Result: Coordinated takedowns without overkill

### 4. Retreat Decision Logic

**Retreat Triggers:**
- **Critical injury:** HP < 25% OR bloodLevel < 40% OR consciousness < 30%
- **No weapon:** Unarmed colonists always retreat
- **Overwhelmed:** 3+ enemies within 120px
- **High threat:** Total threat level > 200
- **Low health + close enemy:** HP < 30% AND enemy within 100px

### 5. Combat Role Assignment

**Roles:**
- **`engage`**: Aggressive engagement (high skill, good health)
- **`retreat`**: Fall back to safety (critical injury, no weapon)
- **`coverSeek`**: Take cover and engage (standard combat)
- **`support`**: Rear support fire (low health, <50%)
- **`flank`**: Tactical positioning (future)
- **`fallback`**: Controlled retreat (future)

**Assignment Logic:**
```typescript
if (health < 0.5) → support (rear position)
else if (shootingSkill >= 8) → engage (aggressive)
else → coverSeek (standard)
```

### 6. Hysteresis System

**Problem:** Rapid state flipping (flee → not flee → flee)  
**Solution:** Different enter/exit thresholds

```
Enemy at 140px → Enter danger (start fleeing)
Flee until enemy at 180px → Exit danger (stop fleeing)
```

**Prevents:** Oscillation, indecision, erratic movement

---

## API Reference

### Main Methods

#### `evaluateCombatSituation(colonist: Colonist): CombatSituation`
**Purpose:** Get complete combat situation for a colonist  
**Returns:** Threats, total threat level, retreat decision, defensive positions  
**Caching:** 0.5s cache to avoid excessive recalculation

**Example:**
```typescript
const situation = combatManager.evaluateCombatSituation(colonist);
if (situation.shouldRetreat) {
  // Initiate retreat
}
```

#### `getCombatAssignment(colonist: Colonist): CombatAssignment | null`
**Purpose:** Get tactical assignment for colonist  
**Returns:** Role, target, position, priority, reason  
**Use Case:** FSM combat state execution

**Example:**
```typescript
const assignment = combatManager.getCombatAssignment(colonist);
if (assignment.role === 'retreat') {
  // Move to assignment.position
} else if (assignment.role === 'engage') {
  // Attack assignment.target
}
```

#### `shouldFlee(colonist: Colonist): { flee: boolean; target?; building? }`
**Purpose:** Determine if colonist should flee (with hysteresis)  
**Returns:** Flee decision + safe destination  
**Use Case:** Replace FSM danger detection logic

**Example:**
```typescript
const fleeDecision = combatManager.shouldFlee(colonist);
if (fleeDecision.flee && fleeDecision.building) {
  // Flee to building
  game.tryEnterBuilding(colonist, fleeDecision.building);
}
```

#### `getBestTarget(colonist: Colonist, maxRange: number): Enemy | null`
**Purpose:** Select best enemy target (with focus fire)  
**Returns:** Optimal enemy to engage  
**Use Case:** Combat targeting in FSM

**Example:**
```typescript
const target = combatManager.getBestTarget(colonist, weaponRange);
if (target) {
  // Shoot at target
  shootAt(colonist, target);
}
```

#### `findCoverPosition(colonist: Colonist, threat: Enemy): CombatPosition | null`
**Purpose:** Find good cover near colonist  
**Returns:** Position with best safety score  
**Use Case:** Cover-seeking behavior

**Example:**
```typescript
const coverPos = combatManager.findCoverPosition(colonist, nearestEnemy);
if (coverPos) {
  // Move to cover position
  game.moveAlongPath(colonist, dt, coverPos, 10);
}
```

#### `shouldTakeCover(colonist: Colonist): boolean`
**Purpose:** Decide if should interrupt current action for cover  
**Returns:** True if should seek cover immediately  
**Use Case:** Interrupt work to take cover

**Example:**
```typescript
if (combatManager.shouldTakeCover(colonist)) {
  changeState('coverSeek', 'taking cover from threat');
}
```

#### `cleanup(currentTime: number): void`
**Purpose:** Clean up expired cache and dead enemy references  
**When:** Call periodically from Game update loop  

---

## Integration Guide

### Step 1: Initialize CombatManager

**In `Game.ts`:**
```typescript
import { CombatManager } from "./combat/combatManager";

export class Game {
  public combatManager: CombatManager;
  
  constructor() {
    // ... existing code ...
    this.combatManager = new CombatManager(this);
  }
  
  update(dt: number) {
    // ... existing code ...
    
    // Clean up combat manager cache periodically
    this.combatManager.cleanup(this.t);
  }
}
```

### Step 2: Replace FSM Danger Detection

**In `colonistFSM.ts`, replace:**
```typescript
// OLD:
const dangerEnterDistance = 140 * 140;
const dangerExitDistance = 180 * 180;
const currentDanger = game.enemies.find(e => dist2(e, c) < dangerEnterDistance);
const fleeingFromDanger = c.state === 'flee' && (c as any).lastDanger && ...
const danger = currentDanger || (fleeingFromDanger ? (c as any).lastDanger : null);
```

**With NEW:**
```typescript
const dangerState = game.combatManager.getDangerState(c);
const danger = dangerState.inDanger ? dangerState.threat : null;
```

### Step 3: Replace evaluateIntent Danger Logic

**In `evaluateIntent()`, replace:**
```typescript
// OLD:
if (!c.inside && danger) set('flee', 100, 'danger detected');
```

**With NEW:**
```typescript
if (!c.inside && danger) {
  const fleeDecision = game.combatManager.shouldFlee(c);
  if (fleeDecision.flee) {
    set('flee', 100, 'danger detected - retreating');
  }
}
```

### Step 4: Update Flee State

**In `case 'flee':`, replace manual flee logic with:**
```typescript
case 'flee': {
  const fleeDecision = game.combatManager.shouldFlee(c);
  
  if (!fleeDecision.flee) {
    changeState('seekTask', 'no longer in danger');
    break;
  }
  
  // Use combat manager's safe position
  if (fleeDecision.building && game.buildingHasSpace(fleeDecision.building, c)) {
    const dist = Math.hypot(fleeDecision.target.x - c.x, fleeDecision.target.y - c.y);
    
    if (dist <= 20 || nearBuilding(c, fleeDecision.building)) {
      if (game.tryEnterBuilding(c, fleeDecision.building)) {
        c.hideTimer = 3;
        changeState('resting', 'hid from danger');
      }
    } else {
      game.moveAlongPath(c, dt, fleeDecision.target, 20);
    }
  } else if (fleeDecision.target) {
    // Move to safe position
    game.moveAlongPath(c, dt, fleeDecision.target, 20);
  } else {
    // Fallback: run away from threat
    const dangerState = game.combatManager.getDangerState(c);
    if (dangerState.threat) {
      const awayDir = {
        x: c.x - dangerState.threat.x,
        y: c.y - dangerState.threat.y
      };
      const mag = Math.hypot(awayDir.x, awayDir.y) || 1;
      c.x += (awayDir.x / mag) * (c.speed + 90) * dt;
      c.y += (awayDir.y / mag) * (c.speed + 90) * dt;
    }
  }
  break;
}
```

### Step 5: Add Combat State (Optional)

**New state for active combat engagement:**
```typescript
case 'combat': {
  const assignment = game.combatManager.getCombatAssignment(c);
  
  if (!assignment) {
    changeState('seekTask', 'no combat assignment');
    break;
  }
  
  switch (assignment.role) {
    case 'engage':
    case 'coverSeek':
      if (assignment.target) {
        // Use pawnCombat to engage target
        const weapon = getWeaponStats(c);
        if (weapon && canShootAt(c, assignment.target, weapon.rangePx)) {
          shootAtTarget(game, c, assignment.target, weapon, dt);
        } else if (assignment.position) {
          // Move to better position
          game.moveAlongPath(c, dt, assignment.position, 10);
        }
      }
      break;
      
    case 'retreat':
    case 'fallback':
      if (assignment.position) {
        game.moveAlongPath(c, dt, assignment.position, 20);
      }
      break;
      
    case 'support':
      // Stay in cover, provide support fire
      if (assignment.target && assignment.position) {
        const atPosition = Math.hypot(c.x - assignment.position.x, c.y - assignment.position.y) < 15;
        if (atPosition) {
          const weapon = getWeaponStats(c);
          if (weapon) shootAtTarget(game, c, assignment.target, weapon, dt);
        } else {
          game.moveAlongPath(c, dt, assignment.position, 15);
        }
      }
      break;
  }
  break;
}
```

---

## Testing Scenarios

### 🧪 Scenario 1: Basic Retreat
```
1. Spawn colonist with weapon
2. Spawn enemy nearby (<140px)
3. Verify:
   ✅ Colonist detects danger
   ✅ shouldFlee() returns true
   ✅ Colonist runs to safe building
   ✅ No state flipping (hysteresis works)
```

### 🧪 Scenario 2: Cover Seeking
```
1. Place walls in map
2. Spawn colonist + enemy at distance
3. Verify:
   ✅ findCoverPosition() finds wall positions
   ✅ Colonist moves to cover
   ✅ Cover value calculated correctly (75% behind wall)
```

### 🧪 Scenario 3: Focus Fire
```
1. Spawn 3 colonists + 2 enemies
2. All colonists enter combat
3. Verify:
   ✅ Multiple colonists target same enemy (coordination)
   ✅ Not all on one target (spreading)
   ✅ Focus fire targets persist until enemy dead
```

### 🧪 Scenario 4: Threat Assessment
```
1. Spawn colonist
2. Spawn enemy at 200px (far)
3. Spawn enemy at 80px (close)
4. Verify:
   ✅ Close enemy has higher threat level
   ✅ evaluateCombatSituation() returns correct mostDangerous
   ✅ getBestTarget() prioritizes close enemy
```

### 🧪 Scenario 5: Overwhelmed Retreat
```
1. Spawn 1 colonist
2. Spawn 4 enemies surrounding colonist
3. Verify:
   ✅ shouldRetreat logic triggers (3+ close enemies)
   ✅ getCombatAssignment() returns retreat role
   ✅ Colonist falls back to safe position
```

---

## Performance Considerations

### Caching
- **Situation cache:** 0.5s TTL, cleaned up every update
- **Focus fire targets:** Cleaned when enemy dies
- **Avoid recalculation:** Check cache before computing

### Optimization Tips
1. **Distance checks:** Use squared distances where possible
2. **Line of sight:** Cache LoS results for multiple colonists
3. **Cover positions:** Limit search radius to 120px
4. **Cleanup:** Call `cleanup()` regularly to prevent memory leaks

---

## Comparison with RimWorld

### What We Implemented (RimWorld-Style)
✅ Threat assessment with priority levels  
✅ Cover system with safety scoring  
✅ Focus fire coordination  
✅ Retreat decision logic  
✅ Tactical positioning  
✅ Combat role assignment  

### RimWorld Features Not Yet Implemented
❌ Flanking maneuvers  
❌ Suppression fire  
❌ Morale system (panic, berserk)  
❌ Formation tactics  
❌ Fog of war / limited vision  
❌ Weapon range optimization (kiting)  

### Future Enhancements
- 🔮 **Flanking AI:** Colonists coordinate to attack from multiple angles
- 🔮 **Weapon specialization:** Sniper stays at long range, shotgun rushes
- 🔮 **Dynamic cover:** Colonists build cover during combat
- 🔮 **Commander mode:** Player can assign tactical orders
- 🔮 **Suppression:** Pin down enemies with sustained fire
- 🔮 **Medic role:** Dedicated colonist stays safe, treats wounded

---

## Migration Checklist

- [ ] Import CombatManager in Game.ts
- [ ] Initialize `this.combatManager = new CombatManager(this)` in constructor
- [ ] Add `this.combatManager.cleanup(this.t)` to update loop
- [ ] Replace danger detection in colonistFSM with `getDangerState()`
- [ ] Update `evaluateIntent()` danger logic to use `shouldFlee()`
- [ ] Rewrite `case 'flee':` to use `fleeDecision` from combat manager
- [ ] (Optional) Add `case 'combat':` state for active engagement
- [ ] Test all 5 scenarios above
- [ ] Remove old danger detection code from FSM
- [ ] Remove unused variables (`lastDanger`, manual hysteresis logic)

---

## Quick Reference

### Decision Tree
```
Enemy detected
  ├─ Critical injury? → RETREAT
  ├─ No weapon? → RETREAT
  ├─ 3+ enemies close? → RETREAT
  ├─ Total threat > 200? → RETREAT
  └─ Can fight
      ├─ Health < 50%? → SUPPORT (rear)
      ├─ Shooting skill ≥ 8? → ENGAGE (aggressive)
      └─ Default → COVER SEEK
```

### Key Formulas
```typescript
// Threat level
threatLevel = 50 + distanceFactor*30 + healthFactor*10 + loS*10 + veryClose*20

// Safety score
safetyScore = coverValue*0.7 + distanceScore*0.3

// Cover value
coverValue = 0.75 (wall blocking LoS)
           = 1.00 (inside building)
           = 0.50 (near turret)
           = 0.30 (near wall, not blocking)
```

---

**Implementation Complete!** 🎯  
*Colonists now have tactical intelligence and survival instincts worthy of a RimWorld colony.*
