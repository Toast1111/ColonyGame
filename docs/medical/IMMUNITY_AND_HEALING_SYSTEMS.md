# Immunity and Healing Rate Systems

## Overview

This document describes the RimWorld-inspired immunity generation and wound healing rate systems implemented in the Colony Game. These systems provide deep, realistic medical gameplay where colonist conditions, implants, traits, and care quality all affect recovery outcomes.

## Immunity Generation System

### Base Mechanics

Each colonist has a base immunity generation rate of 100% (multiplier = 1.0). This rate is modified by various factors to create emergent medical gameplay.

### Immunity Gain Rate Calculation

The immunity gain rate is calculated using the `calculateImmunityGainRate(colonist)` function in `src/game/health/healthSystem.ts`.

#### Factors Affecting Immunity Gain

1. **Hunger Status**
   - **Normal (0-65% hunger)**: No penalty
   - **Hungry (65-85% hunger)**: -10% immunity gain (0.9x multiplier)
   - **Starving (85%+ hunger)**: -30% immunity gain (0.7x multiplier)

2. **Fatigue/Sleep Status**
   - **Rested (0-60% fatigue)**: No penalty
   - **Tired (60-75% fatigue)**: -4% immunity gain (0.96x multiplier)
   - **Exhausted (75-90% fatigue)**: -8% immunity gain (0.92x multiplier)
   - **Extreme Fatigue (90%+ fatigue)**: -20% immunity gain (0.8x multiplier)

3. **Age**
   - **Under 54 years**: No penalty
   - **54+ years**: -1% per year, up to maximum 50% penalty
   - **Example**: Age 70 = -16% penalty, Age 104+ = -50% (max penalty)

4. **Bed Status**
   - **Standing/Walking**: No bonus
   - **Lying in bed**: +10% base bonus (1.1x multiplier)

5. **Bed Type** (additional to lying bonus)
   - **Floor/Ground**: +0% 
   - **Basic Bed**: +5% (1.05x multiplier)
   - **Tent/Sleeping Bag**: +7% (1.07x multiplier)
   - **Medical Bed**: +11% (1.11x multiplier)

6. **Implants**
   - **Immunizer Implant**: +8% per implant (max 2 = +16%)
   - **Filtering Kidneys**: +2.5% per implant (max 2 = +5%)

7. **Organ Health**
   - Kidney and liver health have **strong effect** on immunity
   - Formula: `(kidneyHealth + liverHealth) / 2`
   - Example: 50% organ health = 50% immunity multiplier
   - Example: 100% organ health = 100% immunity multiplier

8. **Traits/Genes**
   - **Weak Immunity**: -10% (0.9x multiplier)
   - **Good Immunity**: +10% (1.1x multiplier)
   - **Hardy**: +30% (1.3x multiplier)
   - **Super-Immune**: +50% (1.5x multiplier)

### Immunity Progression

- Base immunity builds at rate: reaches 1.0 (full immunity) in 10 game hours at 1.0x rate
- Actual rate = base rate × immunity gain multiplier
- Immunity counters infection progression (see infection system)

### Example Scenarios

#### Example 1: Optimal Care
- Young colonist (age 30)
- Well-fed, well-rested
- In medical bed
- Has 2 immunizer implants
- Super-immune trait

**Calculation:**
- Base: 1.0
- Medical bed: 1.1 × 1.11 = 1.221
- Immunizers: 1.0 + (2 × 0.08) = 1.16
- Trait: 1.5
- **Total: 1.0 × 1.221 × 1.16 × 1.5 = 2.12x (212% immunity gain!)**

#### Example 2: Poor Conditions
- Old colonist (age 70)
- Starving (90% hunger)
- Extremely fatigued (95%)
- Damaged organs (50% health)

**Calculation:**
- Base: 1.0
- Hunger: 0.7
- Fatigue: 0.8
- Age penalty: 0.84 (70-54 = 16%)
- Organs: 0.5
- **Total: 1.0 × 0.7 × 0.8 × 0.84 × 0.5 = 0.235x (23.5% immunity gain)**

## Wound Healing Rate System

### Base Mechanics

The healing system uses "healing points per day" to determine how quickly injuries heal. Base rate is 8 healing points per day.

### Healing Points Calculation

The healing rate is calculated using the `calculateHealingPointsPerDay(colonist, injury?)` function in `src/game/health/healthSystem.ts`.

#### Factors Affecting Healing Points

1. **Base Healing Points**
   - All colonists start with 8 healing points/day

2. **Treatment Quality** (if injury was treated)
   - Base treatment: +4 points
   - Quality bonus: +(0.08 × quality × 100) points
   - Example: 50% quality treatment = +4 + 4 = 8 additional points
   - Example: 100% quality treatment = +4 + 8 = 12 additional points

3. **Bed Type**
   - **Floor/Ground**: +4 points
   - **Basic Bed / Sleeping Bag**: +8 points
   - **Medical Bed**: +14 points

4. **Healer Implant**
   - Multiplies total healing points by 1.5x

5. **Genes/Traits**
   - **Slow Healer**: 0.5x multiplier (half speed)
   - **Quick Healer**: 2.0x multiplier (double speed)
   - **Very Fast Healer**: 4.0x multiplier (quadruple speed)

6. **Starvation**
   - **Hunger > 90%**: 0 healing points (no healing when starving)

### Treatment Quality

Treatment quality is calculated when a doctor treats an injury:
- Base quality = 0.2 + (doctor_skill × 0.03)
- Medicine bonus (future): None +0%, Herbal +0.1, Medicine +0.2, Advanced +0.3
- Quality is capped at 1.0 (100%)

Example: Doctor with skill 10 = 0.2 + (10 × 0.03) = 0.5 (50% quality)

### Healing Point Values

The number of healing points indicates how much damage is healed in 24 game hours.

**Best possible healing in the game:**
- Base: 8
- Medical bed: +14
- Perfect treatment (100%): +4 + 8 = +12
- Subtotal: 34
- Healer implant: ×1.5 = 51
- Very Fast Healer trait: ×4.0 = **204 healing points/day**

This matches RimWorld's maximum healing rate documented in the problem statement.

### Example Scenarios

#### Example 1: Field Medicine
- Standing colonist
- No bed
- Untreated wound

**Calculation:**
- Base: 8
- Floor bonus: +4
- **Total: 12 points/day**

#### Example 2: Hospital Care
- Medical bed
- Treated with 70% quality
- Healer implant

**Calculation:**
- Base: 8
- Medical bed: +14
- Treatment: +4 + (0.08 × 70) = +9.6
- Subtotal: 31.6
- Healer implant: ×1.5
- **Total: 47.4 points/day**

#### Example 3: Best Case
- Medical bed
- Perfect 100% treatment
- Healer implant
- Very Fast Healer trait

**Calculation:**
- Base: 8
- Medical bed: +14
- Perfect treatment: +4 + 8 = +12
- Subtotal: 34
- Healer implant: ×1.5 = 51
- Very Fast Healer: ×4.0
- **Total: 204 points/day**

## Implementation Details

### Location in Codebase

- **Main functions**: `src/game/health/healthSystem.ts`
  - `calculateImmunityGainRate(colonist: Colonist): number`
  - `calculateHealingPointsPerDay(colonist: Colonist, injury?: Injury): number`
  - `tickInfections(colonist: Colonist, elapsedSeconds: number)` - uses immunity rate
  - `healInjuries(colonist: Colonist, deltaTime: number)` - uses healing points

- **Type definitions**: `src/game/types.ts`
  - `ColonistHealth` interface with implants and organ health
  - `HealthImplant` interface
  - `ImplantType` type

- **Traits**: `src/game/colonist_systems/traits/passiveTraits.ts`
  - Immunity traits: weak_immunity, good_immunity, hardy, super_immune
  - Healing traits: slow_healer, quick_healer, very_fast_healer

### Integration

The systems are integrated into the colonist FSM update loop:
1. Every frame, `updateHealthProgression()` is called
2. Every 4 seconds, `tickInfections()` builds immunity based on calculated rate
3. Every frame, `healInjuries()` heals wounds based on calculated healing points
4. Treatment quality is stored when a doctor treats an injury

## Balance Notes

### Immunity System Balance
- Young, healthy colonists in good conditions recover quickly from infections
- Old, malnourished colonists struggle to fight off disease
- Medical beds and implants provide significant advantages
- Organ damage has severe consequences for immunity

### Healing System Balance
- Untreated wounds heal slowly (12 points/day minimum)
- Quality medical care provides 2-4x improvement
- Traits can create 8x difference between slow and very fast healers
- Starvation completely halts healing (realistic penalty)

## Future Enhancements

1. **Medicine Types**
   - Implement herbal, standard, and advanced medicine
   - Add medicine quality bonuses to treatment quality calculation

2. **Disease-Specific Immunity**
   - Different diseases with different base immunity generation speeds
   - Currently using simplified single immunity value

3. **Organ Transplants**
   - Allow replacement of damaged kidneys/liver
   - Implement rejection mechanics

4. **Environmental Factors**
   - Room cleanliness affecting infection chance
   - Temperature effects on healing

5. **Doctor Skill Specializations**
   - Different doctors better at different treatment types
   - Specialist bonuses for surgery vs. general medicine
