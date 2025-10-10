# Cover Mechanics System

## Overview
The cover system implements RimWorld-style combat mechanics where colonists and enemies can use terrain and structures for protection during combat.

## Cover Values

### Walls (75% Cover - Best)
- Provide the highest level of protection
- Colonists "lean out" from walls to fire from the side
- Enemies can use defensive walls if they advance to them
- Cannot be fired through, but provide cover from adjacent positions

### Stone Chunks (50% Cover - Better)
- Rock entities scattered across the map
- More effective than trees
- Provide substantial protection when adjacent
- Enemies can use stone chunks for cover

### Trees (30% Cover - Basic)
- Natural vegetation provides basic cover
- Less effective than man-made or stone cover
- Still useful for reducing incoming fire accuracy

## How Cover Works

### For Shooters
When a colonist fires at a target:
1. The system checks if there are walls, rocks, or trees along the shot path
2. Cover objects within the last 25% of the shot path (near the target) are considered
3. The highest cover value is applied as a penalty to accuracy
4. Final accuracy = `baseAccuracy × distanceFactor × (1 - coverValue)`

Example:
- Shooting at an enemy behind a wall (75% cover) → 25% normal accuracy
- Shooting at an enemy behind a rock (50% cover) → 50% normal accuracy
- Shooting at an enemy behind a tree (30% cover) → 70% normal accuracy

### For Cover Seekers
Colonists automatically seek cover when in combat:
1. CombatManager evaluates nearby cover objects (walls, rocks, trees)
2. Positions around each cover object are calculated
3. Each position is scored based on:
   - Cover value (70% weight)
   - Distance from threat (30% weight)
4. Best position is selected and colonist moves there

### Enemy Usage
Enemies automatically benefit from cover:
- No special AI needed - cover is passive
- If enemies position themselves behind walls/rocks/trees, they become harder to hit
- Defensive lines can be used against you if enemies advance to them

## Implementation Details

### Files Modified
- `src/game/combat/pawnCombat.ts`: Cover penalty calculation for shooting
- `src/game/combat/combatManager.ts`: Cover position evaluation and seeking

### Key Functions
- `coverPenalty(game, from, to)`: Calculates cover penalty for a shot
- `getCoverValueAtPosition(x, y, threat)`: Evaluates cover at a specific position
- `calculateCoverPositions(colonist, situation)`: Finds available cover positions

## Future Enhancements
- Sandbags (mentioned in requirements, to be added)
- Directional cover (cover from specific angles)
- Cover degradation (cover objects taking damage)
- Half-cover vs full-cover mechanics
