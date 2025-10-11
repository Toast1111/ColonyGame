# Cover Mechanics System

## Overview
The cover system implements RimWorld-style combat mechanics where colonists and enemies can use terrain and structures for protection during combat. The system features directional effectiveness, distance-based reduction, and support for multiple cover sources.

## Cover Types

### High Cover vs Low Cover

**High Cover (Walls - 75% base value)**
- Blocks line of sight completely
- Must lean out to fire from the side
- Cannot be shot over or through
- Provides maximum protection when properly positioned
- Examples: Walls, constructed barriers

**Low Cover (Rocks/Trees - 30-50% base value)**
- Can be shot over from standing positions
- Provides partial protection
- Multiple low cover pieces can combine for better protection
- Examples: Stone chunks (50%), Trees (30%), Sandbags (planned)

### Natural vs Artificial Cover

**Natural Cover**
- Found on newly generated maps
- Trees, rocks, saguaro cacti (planned)
- Generally provides lower base protection values

**Artificial Cover**
- Player-built structures
- Walls, sandbags (planned)
- Can provide higher protection with strategic placement


## Directional Cover Effectiveness

Cover effectiveness varies based on the angle of attack. Cover works best when attacks come straight at it, but becomes less effective from the sides:

| Angle from Cover | Effectiveness | Description |
|-----------------|---------------|-------------|
| < 15° | 100% | Direct frontal attack - maximum protection |
| 15° - 27° | 80% | Slight angle - very good protection |
| 27° - 40° | 60% | Moderate angle - good protection |
| 40° - 52° | 40% | Wide angle - reduced protection |
| 52° - 65° | 20% | Flanking angle - minimal protection |
| > 65° | 0% | Complete flank - no protection |

### How Angles Are Calculated
- For walls: Angle between shot direction and wall normal (perpendicular)
- For low cover: Angle between shot direction and defender-to-cover direction
- The system automatically determines optimal cover facing based on threat position

## Distance-Based Cover Reduction

Cover is less effective at point-blank range where attackers can more easily aim around obstacles:

| Distance from Cover | Effectiveness | Description |
|-------------------|---------------|-------------|
| Point-blank (< 0.5 tiles) | 33.33% | Shooter directly in front of cover |
| 1 tile away | 66.666% | Close range - reduced effectiveness |
| 2+ tiles away | 100% | Normal range - full effectiveness |

This simulates how cover is most useful at medium to long range, but provides limited protection when enemies close the distance.

## Multiple Cover Sources

When multiple low cover pieces are positioned between shooter and target (common with diagonal shots), they can work together:

1. **Primary Cover**: Highest effective cover value is applied first
2. **Secondary Cover**: Additional low cover adds 20% of its effective value
3. **Tertiary Cover**: Third piece adds another 20% of its effective value
4. **Cap**: Total cover capped at 90% to ensure some shots can hit

**Example**: Diagonal shot through two rocks
- Primary rock: 50% base × 0.8 (angle) × 1.0 (distance) = 40% effective
- Secondary rock: 50% base × 0.6 (angle) × 1.0 (distance) = 30% × 0.2 = 6% bonus
- **Total**: 46% cover penalty

## How Cover Works

### For Shooters
When a colonist fires at a target:
1. The system checks if there are walls, rocks, or trees along the shot path
2. Cover objects within the last 25% of the shot path (near the target) are considered
3. For each cover piece:
   - Calculate directional effectiveness based on attack angle
   - Apply distance-based reduction based on shooter-to-cover distance
   - Compute effective cover value
4. High cover (walls) takes precedence over low cover
5. Multiple low cover sources can combine (primary + 20% of additional)
6. Final accuracy = `baseAccuracy × distanceFactor × (1 - effectiveCover)`

**Example Calculations**:

*Scenario 1: Wall cover at optimal angle*
- Base wall cover: 75%
- Attack angle: 10° (frontal) → 100% directional effectiveness
- Distance: 3 tiles → 100% distance effectiveness
- Effective cover: 75% × 1.0 × 1.0 = **75% penalty** → 25% accuracy

*Scenario 2: Wall cover from the side*
- Base wall cover: 75%
- Attack angle: 70° (flanking) → 0% directional effectiveness
- Effective cover: 75% × 0 × 1.0 = **0% penalty** → 100% accuracy

*Scenario 3: Rock cover at point-blank*
- Base rock cover: 50%
- Attack angle: 20° → 80% directional effectiveness
- Distance: 0.3 tiles → 33.33% distance effectiveness
- Effective cover: 50% × 0.8 × 0.3333 = **13.3% penalty** → 86.7% accuracy

### For Cover Seekers
Colonists automatically seek cover when in combat:
1. CombatManager evaluates nearby cover objects (walls, rocks, trees)
2. Positions around each cover object are calculated
3. Each position is scored based on:
   - Cover value with directional effectiveness (70% weight)
   - Distance from threat (30% weight)
4. System accounts for optimal facing angle to maximize protection
5. Best position is selected and colonist moves there

### Enemy Usage
Enemies automatically benefit from cover:
- No special AI needed - cover is passive
- If enemies position themselves behind walls/rocks/trees, they become harder to hit
- Cover effectiveness applies to enemies the same way as colonists
- Defensive lines can be used against you if enemies advance to them
- Flanking enemies from the side reduces their cover effectiveness

## Tactical Implications

### Offensive Tactics
1. **Flank for Success**: Attack from angles >65° to negate cover completely
2. **Close the Distance**: Point-blank attacks reduce cover to 33% effectiveness
3. **Focus Fire**: Concentrate fire on enemies with poor cover or bad positioning

### Defensive Tactics
1. **Face the Threat**: Position colonists so cover faces the enemy (0-15° optimal)
2. **Maintain Distance**: Keep 2+ tiles between cover and enemies for full effectiveness
3. **Layer Cover**: Use multiple low cover pieces for diagonal protection
4. **Use Walls Wisely**: Walls provide best protection but block line of sight - lean out to fire

## Implementation Details

### Files Modified
- `src/game/combat/pawnCombat.ts`: Cover penalty calculation for shooting with directional and distance modifiers
- `src/game/combat/combatManager.ts`: Cover position evaluation and seeking with refined mechanics

### Key Functions
- `coverPenalty(game, from, to)`: Calculates cover penalty with directional and distance modifiers
- `getDirectionalCoverMultiplier(angle)`: Returns effectiveness based on attack angle
- `getDistanceCoverMultiplier(distance)`: Returns effectiveness based on distance to cover
- `getCoverValueAtPosition(x, y, threat)`: Evaluates cover at a specific position with refined mechanics
- `calculateCoverPositions(colonist, situation)`: Finds available cover positions

## Cover Values Reference

| Cover Type | Base Value | Type | Can Shoot Over | Notes |
|-----------|-----------|------|----------------|-------|
| Walls | 75% | High | No | Blocks line of sight, must lean out |
| Stone Chunks | 50% | Low | Yes | Better than trees, natural cover |
| Trees | 30% | Low | Yes | Basic natural cover |
| Sandbags* | 45% | Low | Yes | Planned - artificial low cover |

*Planned feature

## Future Enhancements
- ✅ Directional cover (implemented)
- ✅ Distance-based reduction (implemented)
- ✅ Multiple cover sources (implemented)
- ⏳ Sandbags (planned - artificial low cover)
- ⏳ Cover degradation (cover objects taking damage)
- ⏳ Animals as cover (larger animals can provide cover)
