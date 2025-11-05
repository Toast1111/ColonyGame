# Colonist Base Stats and Configuration

## Overview

Colonist base stats are defined in multiple locations throughout the codebase. This document provides a comprehensive reference for all colonist statistics including movement speed, hunger rates, fatigue rates, and other core attributes.

## Time System

The game uses a **tick-based time system** similar to RimWorld:

| In-Game Time | Ticks | Real Time |
|--------------|-------|-----------|
| 1 Second | 30 | 1 s |
| 1 Hour | 1,250 | ≈ 21 s |
| 1 Day (24 Hours) | 30,000 | ≈ 8 m 20 s |
| 1 Quadrum (15 Days) | 450,000 | ≈ 2 h 5 m |
| 1 Year (4 Quadrums) | 1,800,000 | ≈ 8 h 20 m |

**Conversion Formula**: 1 tick = 1/30 second (30 ticks per second)

## Movement Speed System

### Base Movement Speed
**Location**: `src/game/Game.ts` (lines ~2175, ~2420)

```typescript
// Base colonist speed when spawned
speed: 50 * profile.stats.workSpeed  // Apply work speed modifier from personality
```

**Base Speed**: 50 pixels per second = **1,500 pixels per tick** (50 × 30 ticks)
**In Tiles**: ~1.56 tiles per second = **46.9 tiles per tick** (since T = 32 pixels per tile)

**Formula**: `Final Speed = 1,500 × workSpeed × fatigue × equipment × terrain (pixels per tick)`

### Speed Calculation Chain
**Location**: `src/game/managers/ColonistNavigationManager.ts` (line ~359)

```typescript
let baseSpeed = c.speed * ((c as any).fatigueSlow || 1) * this.getMoveSpeedMultiplier(c);
let speed = baseSpeed;

// Apply terrain/floor modifiers
speed = baseSpeed / tileCost;  // Inversely proportional to terrain cost
```

### Terrain Speed Modifiers
- **Grass/Normal**: 1.0 cost = 1.0× speed (1,500 pixels per tick)
- **Stone Floor**: 0.5 cost = 2.0× speed (3,000 pixels per tick)
- **Dirt Path**: 0.6 cost = 1.67× speed (2,500 pixels per tick)
- **Mud/Difficult**: 2.5 cost = 0.4× speed (600 pixels per tick)

### Fatigue Speed Penalties
**Location**: `src/game/colonist_systems/colonistFSM.ts` (line ~273)

```typescript
const baseFatigueSlow = (c.fatigue || 0) > 66 ? 0.8 : (c.fatigue || 0) > 33 ? 0.9 : 1.0;
```

- **0-33% fatigue**: No speed penalty (1.0×)
- **34-66% fatigue**: Minor speed penalty (0.9×) 
- **67-100% fatigue**: Major speed penalty (0.8×)

### Equipment Speed Modifiers
**Location**: `src/game/managers/InventoryManager.ts`
- Heavy armor can reduce movement speed
- Equipment bonuses are additive but capped at +80%
- Calculated via `getMoveSpeedMultiplier(colonist)`

## Hunger System

### Base Hunger Rates
**Location**: `src/game/colonist_systems/colonistFSM.ts` (line ~318)

```typescript
const hungerRate = (working ? 0.25 : c.inside ? 0.1 : 0.15) * hungerMultiplier;
```

**Base Rates (per tick)**:
- **Working**: 0.0083 × personality multiplier (0.25 ÷ 30 ticks)
- **Inside building**: 0.0033 × personality multiplier (0.1 ÷ 30 ticks)
- **Idle/Normal**: 0.005 × personality multiplier (0.15 ÷ 30 ticks)

**Time to Starvation**:
- Working continuously: ~12,000 ticks (≈ 6.7 in-game minutes)
- Idle: ~20,000 ticks (≈ 11.1 in-game minutes)  
- Inside building: ~30,000 ticks (≈ 16.7 in-game minutes)

### Hunger Damage
**Location**: `src/game/colonist_systems/colonistFSM.ts` (line ~332)

```typescript
// Starvation damage if very hungry
if ((c.hunger || 0) >= 95) { 
  const damage = 2 * dt;  // 2 HP per second
  c.hp = Math.max(0, c.hp - damage); 
}
```

- **Starvation threshold**: 95% hunger
- **Damage rate**: 0.067 HP per tick (2 ÷ 30 ticks)
- **Time to death**: ~1,500 ticks (≈ 50 in-game seconds) after reaching 95% hunger

### Food Consumption
**Location**: `src/game/colonist_systems/colonistFSM.ts` (lines ~847, ~800)

```typescript
// Regular food
c.hunger = Math.max(0, (c.hunger || 0) - 60);
c.hp = Math.min(100, c.hp + 2.5);

// Bread (more nutritious)
c.hunger = Math.max(0, (c.hunger || 0) - 80);
c.hp = Math.min(100, c.hp + 5);
```

- **Regular food**: -60 hunger points, +2.5 HP (instant)
- **Bread**: -80 hunger points, +5 HP (instant)

## Fatigue System

### Base Fatigue Rates
**Location**: `src/game/colonist_systems/colonistFSM.ts` (line ~322)

```typescript
const fatigueRise = (working ? 0.8 : 0.3) * fatigueMultiplier;
```

**Base Rates (per tick)**:
- **Working**: 0.027 × personality multiplier (0.8 ÷ 30 ticks)
- **Idle/Normal**: 0.01 × personality multiplier (0.3 ÷ 30 ticks)

**Recovery Rate**:
- **Inside/Resting**: -0.267 per tick (-8.0 ÷ 30 ticks)

**Time Calculations**:
- Working to exhaustion: ~3,750 ticks (≈ 2.1 in-game minutes)
- Idle to tired: ~10,000 ticks (≈ 5.6 in-game minutes)
- Recovery time: ~375 ticks (≈ 12.5 in-game seconds) when resting

### Fatigue Thresholds
**Location**: `src/game/colonist_systems/colonistFSM.ts` (line ~461)

```typescript
const fatigueEnterThreshold = 60; // Start preferring sleep
const fatigueExitThreshold = 20;  // Can leave bed (hysteresis)
```

- **Sleep preference**: 60%+ fatigue
- **Exit threshold**: 20% fatigue (40-point gap prevents oscillation)

## Health and Recovery

### Passive Health Recovery
**Location**: `src/game/colonist_systems/colonistFSM.ts` (line ~342)

```typescript
// Passive heal if not hungry and not working
if ((c.hunger || 0) < 30 && !working && !c.inside) { 
  c.hp = Math.min(100, c.hp + 0.8 * dt); 
}
```

- **Conditions**: <30% hunger, not working, not inside
- **Rate**: 0.027 HP per tick (0.8 ÷ 30 ticks)
- **Time to full heal**: ~3,750 ticks (≈ 125 in-game seconds) from 0 HP

### Resting Recovery
**Location**: `src/game/colonist_systems/colonistFSM.ts` (line ~587)

```typescript
// Rest recovers fatigue quickly and heals slowly
c.hp = Math.min(100, c.hp + 1.2 * dt);
```

- **Rate**: 0.04 HP per tick (1.2 ÷ 30 ticks) when resting
- **Time to full heal**: ~2,500 ticks (≈ 83 in-game seconds) from 0 HP

## Personality Stat Modifiers

### Stats Definition
**Location**: `src/game/colonist_systems/colonistGenerator.ts` (line ~137)

```typescript
function generateStats(): ColonistProfile['stats'] {
  const baseVariation = () => 0.9 + Math.random() * 0.2; // 0.9 to 1.1
  
  return {
    workSpeed: Math.round(baseVariation() * 100) / 100,      // 0.9 - 1.1
    socialBonus: Math.round(baseVariation() * 100) / 100,    // 0.9 - 1.1  
    hungerRate: Math.round(baseVariation() * 100) / 100,     // 0.9 - 1.1
    fatigueRate: Math.round(baseVariation() * 100) / 100     // 0.9 - 1.1
  };
}
```

**Stat Ranges**: All personality stats range from 0.9 to 1.1 (±10% variation)

### Stat Applications
- **workSpeed**: Affects base movement speed and work completion speed
- **hungerRate**: Multiplies hunger accumulation rate  
- **fatigueRate**: Multiplies fatigue accumulation rate
- **socialBonus**: Used for social interactions and mood calculations

## Work and Combat Stats

### Work Speed Multipliers
**Location**: Various work calculations in FSM

```typescript
// Example from chopping
const equipMult = game.getWorkSpeedMultiplier(c, 'Woodcutting') || 1;
const plantsLvl = c.skills ? skillLevel(c, 'Plants') : 0;
const skillMult = skillWorkSpeedMultiplier(plantsLvl);
const workMult = equipMult * skillMult;

t.hp -= 18 * dt * workMult;  // Base 18 damage per second
```

**Base Work Rates**:
- **Chopping**: 18 damage per second
- **Mining**: 16 damage per second  
- **Building**: Varies by structure complexity

### Skill System Integration
- Skills provide work speed bonuses
- Higher skill levels = faster work completion
- Experience gained during work: typically 4 XP per second

## Summary Table (Tick-Based)

| Attribute | Base Value (per tick) | Conditions | Notes |
|-----------|----------------------|------------|-------|
| **Movement Speed** | 1,500 pixels/tick | Base × workSpeed × fatigue × equipment × terrain | Modified by many factors |
| **Hunger Rate (Working)** | 0.0083/tick | When actively working | ~12,000 ticks to starvation |
| **Hunger Rate (Idle)** | 0.005/tick | Normal activity | ~20,000 ticks to starvation |
| **Hunger Rate (Inside)** | 0.0033/tick | Inside buildings | ~30,000 ticks to starvation |
| **Fatigue Rate (Working)** | 0.027/tick | When actively working | ~3,750 ticks to exhaustion |
| **Fatigue Rate (Idle)** | 0.01/tick | Normal activity | ~10,000 ticks to tired |
| **Fatigue Recovery** | -0.267/tick | When inside/resting | ~375 ticks full recovery |
| **Health Recovery (Passive)** | 0.027/tick | <30% hunger, not working | ~3,750 ticks to full heal |
| **Health Recovery (Resting)** | 0.04/tick | When resting in bed | ~2,500 ticks to full heal |
| **Starvation Damage** | 0.067/tick | At 95%+ hunger | ~1,500 ticks to death |

## Configuration Locations

For modifying these values:

1. **Movement Speed**: `Game.ts` line ~2175 (base speed: 50)
2. **Hunger Rates**: `colonistFSM.ts` line ~318 (0.25, 0.15, 0.1)
3. **Fatigue Rates**: `colonistFSM.ts` line ~322 (0.8, 0.3, -8.0)
4. **Health Recovery**: `colonistFSM.ts` lines ~342, ~587 (0.8, 1.2)
5. **Starvation**: `colonistFSM.ts` line ~332 (2.0 damage/sec at 95% hunger)
6. **Personality Variation**: `colonistGenerator.ts` line ~137 (0.9-1.1 range)

All rates are **per tick** based on the game's 30 ticks per second system. Use the time conversion table above to convert between ticks and real-world time.