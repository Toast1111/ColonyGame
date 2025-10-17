# Combat System Audit - Unused Code & Missing Integration

## Executive Summary

**CRITICAL FINDING:** The game has a fully-implemented, sophisticated **CombatManager** system (~942 lines) that provides RimWorld-style tactical AI, but it's **COMPLETELY UNUSED**. The system was created but never integrated with the game.

---

## ✅ What IS Working

### 1. Cover System (ACTIVE) ✅
**File:** `src/game/combat/pawnCombat.ts`

The cover penalty system **IS** being used in ranged combat:

```typescript
// Line 639 in pawnCombat.ts - ACTIVE
const cover = coverPenalty(game, c, target);
const acc = Math.max(0.1, baseAcc * (1 - cover));
```

**Features Working:**
- ✅ Directional cover (0-15° = 100%, >65° = 0%)
- ✅ Distance-based reduction (33% at point-blank, 100% at 2+ tiles)
- ✅ High cover (walls: 75%) vs Low cover (trees/rocks: 30-50%)
- ✅ Multiple cover sources can stack
- ✅ Cover reduces accuracy in combat calculations

**Colonists DO benefit from cover**, but only passively when enemies shoot at them. They **DON'T actively seek cover**.

---

## ❌ What IS NOT Working

### 1. CombatManager System (UNUSED) ❌
**File:** `src/game/combat/combatManager.ts` (942 lines)

**Status:** Fully implemented, extensively documented, but **NEVER INTEGRATED**.

#### The Missing Integration

**NOT in Game.ts:**
```typescript
// MISSING: No import
import { CombatManager } from './combat/combatManager';

// MISSING: No instance
combatManager = new CombatManager(this);

// MISSING: No cleanup call
this.combatManager.cleanup(this.t);
```

**NOT in colonistFSM.ts:**
```typescript
// MISSING: No combat manager usage
// Should be calling:
// - game.combatManager.shouldFlee(c)
// - game.combatManager.findCoverPosition(c, threat)
// - game.combatManager.getBestTarget(c, range)
// - game.combatManager.getCombatAssignment(c)
```

#### What CombatManager SHOULD Provide (But Doesn't)

**Tactical AI Features (All Unused):**
1. **Threat Assessment** - Prioritize dangerous enemies
2. **Cover Seeking** - Actively move to cover positions
3. **Tactical Positioning** - Position around walls/turrets
4. **Focus Fire** - Coordinate colonists to target same enemy
5. **Smart Retreat** - Flee to defensive positions, not random buildings
6. **Combat Roles** - Assign roles based on skills/health (engage/support/retreat)
7. **Hysteresis** - Prevent state flipping (flee → not flee → flee)

**Complete API (All Unused):**
```typescript
evaluateCombatSituation(colonist): CombatSituation
getCombatAssignment(colonist): CombatAssignment | null
shouldFlee(colonist): { flee: boolean; target?; building? }
getBestTarget(colonist, maxRange): Enemy | null
findCoverPosition(colonist, threat): CombatPosition | null
shouldTakeCover(colonist): boolean
getDangerState(colonist): { inDanger: boolean; threat?; distance }
cleanup(currentTime): void
```

---

## 📊 Current vs Intended Behavior

### Current Colonist Combat (What Happens Now)
```
1. Drafted colonist sees enemy
2. Colonist shoots at enemy
3. Cover penalty applied to incoming shots (passive)
4. Colonist stands still or follows drafted position
5. No active cover seeking
6. No tactical positioning
7. No coordinated targeting
```

### Intended Colonist Combat (With CombatManager)
```
1. Drafted colonist sees enemy
2. CombatManager assesses threats (distance, HP, weapon range)
3. CombatManager assigns role (engage/coverSeek/retreat/support)
4. CombatManager finds best cover position near walls/rocks
5. Colonist moves to cover position
6. CombatManager coordinates focus fire on dangerous enemy
7. Cover penalty applied to both incoming/outgoing shots
8. Colonist tactically repositions as needed
```

### Current Flee Behavior (What Happens Now)
**File:** `src/game/colonist_systems/colonistFSM.ts` (case 'flee')

```typescript
// Current flee logic - simple distance check
const danger = game.nearestCircle(c, game.enemies);
if (!danger || Math.hypot(c.x - danger.x, c.y - danger.y) > 140) {
  changeState('seekTask', 'danger passed');
  break;
}

// Run to nearest building (any building)
const hq = game.buildings.find((b: any) => b.kind === 'hq');
if (hq) {
  game.moveAlongPath(c, dt, hq, 20);
}
```

**Problems:**
- ❌ No threat assessment (all enemies treated equal)
- ❌ Simple distance threshold (no hysteresis → state flipping)
- ❌ Runs to HQ only (not safest position)
- ❌ No cover consideration
- ❌ No coordination with other colonists

### Intended Flee Behavior (With CombatManager)
```typescript
// Should use combat manager
const fleeDecision = game.combatManager.shouldFlee(c);

if (fleeDecision.flee) {
  if (fleeDecision.building) {
    // Flee to safest building (turret, defensive position)
    game.moveAlongPath(c, dt, fleeDecision.building, 20);
  } else if (fleeDecision.target) {
    // Flee to tactical position
    game.moveAlongPath(c, dt, fleeDecision.target, 10);
  }
} else {
  // Hysteresis prevents re-entering flee
  changeState('seekTask', 'threat level acceptable');
}
```

**Benefits:**
- ✅ Threat level calculation (HP, distance, weapon range)
- ✅ Hysteresis (enter at 140px, exit at 200px) → no flipping
- ✅ Smart destination (turret range, defensive walls)
- ✅ Cover value scoring
- ✅ Coordinated retreat paths

---

## 📁 Unused Code Inventory

### Fully Implemented But Unused

#### 1. **CombatManager Class** (`src/game/combat/combatManager.ts`)
- **Lines:** 942
- **Status:** Complete, tested, documented
- **Usage:** 0 references in codebase
- **Interfaces:** ThreatAssessment, CombatPosition, CombatAssignment, CombatSituation

#### 2. **Documentation** (Comprehensive but orphaned)
- `docs/combat/COMBAT_MANAGER_COMPLETE.md` - 330 lines
- `docs/combat/COMBAT_MANAGER_GUIDE.md` - 540 lines
- Test scenarios, API docs, integration checklists

#### 3. **Helper Methods in CombatManager** (All unused)
```typescript
assessThreats(colonist)                 // Threat priority calculation
calculateRetreatDecision()              // Smart flee logic
calculateCoverPositions()               // Find walls/rocks for cover
getPositionsAroundWall()                // Tactical wall positions
getCoverValueAtPosition()               // Refined cover calculation
findSafePosition()                      // Safest retreat target
assignCombatRole()                      // Role-based tactics
createRetreatAssignment()               // Structured retreat
getDirectionalCoverMultiplier()         // Angle-based cover (duplicate of pawnCombat)
getDistanceCoverMultiplier()            // Distance-based cover (duplicate of pawnCombat)
```

---

## 🔧 What Needs To Happen

### Integration Checklist (From Docs)

**File: `src/game/Game.ts`**
- [ ] Import CombatManager
- [ ] Initialize `this.combatManager = new CombatManager(this)` in constructor
- [ ] Add `this.combatManager.cleanup(this.t)` to update loop

**File: `src/game/colonist_systems/colonistFSM.ts`**
- [ ] Import combat manager types
- [ ] Replace danger detection in `evaluateIntent()` with `getDangerState()`
- [ ] Rewrite `case 'flee':` to use `shouldFlee()` decision
- [ ] Add cover-seeking to drafted colonist logic
- [ ] Use `getBestTarget()` for target prioritization
- [ ] (Optional) Add `case 'combat':` state for active engagement
- [ ] Remove old manual danger detection
- [ ] Remove `lastDanger` and manual hysteresis variables

**File: `src/game/combat/pawnCombat.ts`**
- [ ] Use `game.combatManager.getBestTarget()` for target selection
- [ ] (Optional) Remove duplicate cover calculation functions (use CombatManager's)

---

## 🎯 Code Duplication Issues

### Cover Calculation (Duplicated)

**Exists in both files:**
1. `src/game/combat/pawnCombat.ts`
   - `getDirectionalCoverMultiplier(attackAngleDeg)`
   - `getDistanceCoverMultiplier(distanceToCover)`
   - `coverPenalty(game, from, to)`

2. `src/game/combat/combatManager.ts`
   - `getDirectionalCoverMultiplier(attackAngleDeg)` (DUPLICATE)
   - `getDistanceCoverMultiplier(distanceToCover)` (DUPLICATE)
   - `getCoverValueAtPosition(x, y, threat?)` (Enhanced version)

**Recommendation:** Extract to shared utility module or keep pawnCombat version (it's being used).

---

## 🚨 Impact Assessment

### Current State (Without CombatManager)
- ❌ Colonists have "survival instincts of a squirrel in the road" (quote from docs)
- ❌ No tactical positioning
- ❌ No cover seeking (only passive cover benefits)
- ❌ No coordinated combat
- ❌ Flee state flips constantly (no hysteresis)
- ❌ Poor target prioritization

### If Integrated (With CombatManager)
- ✅ RimWorld-style tactical AI
- ✅ Smart cover seeking and positioning
- ✅ Coordinated focus fire
- ✅ Intelligent retreat behavior
- ✅ Combat role assignment
- ✅ Stable threat detection (hysteresis)
- ✅ Dramatically improved combat effectiveness

---

## 📝 Recommendations

### Priority 1: Integrate CombatManager (HIGH IMPACT)
**Effort:** 2-3 hours  
**Impact:** Transforms combat from basic to RimWorld-quality

**Steps:**
1. Add CombatManager to Game.ts (5 minutes)
2. Update flee state in colonistFSM.ts (30 minutes)
3. Add cover-seeking to drafted state (30 minutes)
4. Test with debug scenarios (1 hour)
5. Tune threat thresholds and cover values (30 minutes)

### Priority 2: Add Active Cover Seeking (MEDIUM IMPACT)
**Effort:** 1 hour  
**Impact:** Colonists actively position behind walls/rocks

**Implementation:**
```typescript
case 'drafted': {
  // Check if should seek cover
  if (game.combatManager.shouldTakeCover(c)) {
    const nearestThreat = game.enemies[0]; // Or use getBestTarget
    const coverPos = game.combatManager.findCoverPosition(c, nearestThreat);
    if (coverPos) {
      c.draftedPosition = { x: coverPos.x, y: coverPos.y };
    }
  }
  // ... existing drafted logic
}
```

### Priority 3: Clean Up Duplicates (LOW PRIORITY)
**Effort:** 30 minutes  
**Impact:** Code cleanliness

**Options:**
- Extract cover functions to `src/game/combat/coverUtils.ts`
- Or remove duplicates from CombatManager (use pawnCombat versions)

---

## 🧪 Testing Strategy

### Test Scenarios (From COMBAT_MANAGER_GUIDE.md)

1. **Basic Retreat**
   - Spawn colonist + nearby enemy (<140px)
   - Verify: Colonist flees to safe building, no state flipping

2. **Cover Seeking**
   - Place walls, spawn colonist + distant enemy
   - Verify: Colonist moves behind wall, cover value calculated

3. **Focus Fire**
   - Spawn 3 colonists + 1 dangerous enemy
   - Verify: All target same enemy

4. **Tactical Retreat**
   - Spawn injured colonist + enemy
   - Verify: Flees to turret range, not random building

5. **Combat Roles**
   - Spawn colonists with different skills/health
   - Verify: High skill engages, low health supports

---

## 📚 Related Files

### Active Code
- ✅ `src/game/combat/pawnCombat.ts` - Ranged/melee combat (USING cover)
- ✅ `src/game/combat/combatSystem.ts` - Turret combat, projectiles
- ✅ `src/ai/enemyFSM.ts` - Enemy combat AI

### Unused Code
- ❌ `src/game/combat/combatManager.ts` - Tactical AI (NOT INTEGRATED)

### Documentation
- `docs/combat/COMBAT_MANAGER_COMPLETE.md` - Implementation summary
- `docs/combat/COMBAT_MANAGER_GUIDE.md` - Complete API & integration guide
- `docs/COVER_MECHANICS.md` - Cover system documentation
- `docs/COVER_TEST_SCENARIOS.md` - Test cases
- `docs/COVER_VISUAL_GUIDE.md` - Visual explanations

---

## 🎬 Conclusion

The **cover system works** (enemies hitting colonists in cover get accuracy penalties), but colonists **don't actively seek cover** because the **CombatManager is not integrated**.

**3 Major Issues:**
1. **CombatManager system exists but is completely unused** (~942 lines of dead code)
2. **Colonists don't seek cover** (only benefit from passive cover)
3. **Flee behavior is primitive** (no threat assessment, no hysteresis, poor positioning)

**Quick Win:** Integrating CombatManager would dramatically improve combat quality with minimal effort (it's already written and documented).

---

## 📋 Action Items

### Immediate (Required for Basic Functionality)
- [ ] Add CombatManager to Game.ts
- [ ] Update flee state to use shouldFlee()
- [ ] Add cleanup() call to game loop

### Short-term (Improve Combat Quality)
- [ ] Implement cover-seeking in drafted state
- [ ] Use getBestTarget() for target prioritization
- [ ] Test all 5 scenarios

### Long-term (Polish & Optimization)
- [ ] Add combat state (optional enhancement)
- [ ] Extract cover utilities to shared module
- [ ] Remove unused danger detection code
- [ ] Add combat debug visualization

---

**TL;DR:** Cover works, but colonists don't seek it. A complete tactical AI system exists but is completely disconnected from the game. Integration would be a massive quality-of-life improvement.
