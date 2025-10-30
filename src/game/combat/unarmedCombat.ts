/**
 * Unarmed Combat System
 * 
 * Implements RimWorld-style unarmed combat with multiple attack types:
 * - Left fist, Right fist, Head, Teeth
 * - Different damage, armor penetration, and chance factors
 * - Stun mechanics for fist attacks
 */

export interface UnarmedAttack {
  name: string;
  bodyPart: string;
  damage: number;
  damageType: 'blunt' | 'bite';
  armorPenetration: number; // 0-1 (e.g., 0.12 = 12% AP)
  cooldown: number; // seconds
  chanceFactor: number; // relative probability (1.0 = normal, 0.2 = rare)
  stunDuration?: number; // seconds, if applicable
  stunOnFirstStrike?: boolean;
}

// RimWorld unarmed attack definitions
export const UNARMED_ATTACKS: UnarmedAttack[] = [
  {
    name: 'Left fist',
    bodyPart: 'Fist',
    damage: 8.2,
    damageType: 'blunt',
    armorPenetration: 0.12, // 12% AP
    cooldown: 2.0,
    chanceFactor: 1.0,
    stunDuration: 4.67, // 280 ticks = 4.67 seconds
    stunOnFirstStrike: true
  },
  {
    name: 'Right fist',
    bodyPart: 'Fist', 
    damage: 8.2,
    damageType: 'blunt',
    armorPenetration: 0.12, // 12% AP
    cooldown: 2.0,
    chanceFactor: 1.0,
    stunDuration: 4.67, // 280 ticks = 4.67 seconds
    stunOnFirstStrike: true
  },
  {
    name: 'Head',
    bodyPart: 'Head',
    damage: 5.0,
    damageType: 'blunt',
    armorPenetration: 0.07, // 7% AP
    cooldown: 2.0,
    chanceFactor: 0.2, // Rare attack
    stunDuration: undefined,
    stunOnFirstStrike: false
  },
  {
    name: 'Teeth',
    bodyPart: 'Teeth',
    damage: 8.2,
    damageType: 'bite',
    armorPenetration: 0.12, // 12% AP
    cooldown: 2.0,
    chanceFactor: 0.07, // Very rare attack
    stunDuration: undefined,
    stunOnFirstStrike: false
  }
];

/**
 * Select a random unarmed attack based on chance factors
 */
export function selectUnarmedAttack(): UnarmedAttack {
  // Calculate total weight
  const totalWeight = UNARMED_ATTACKS.reduce((sum, attack) => sum + attack.chanceFactor, 0);
  
  // Random selection based on weights
  let random = Math.random() * totalWeight;
  
  for (const attack of UNARMED_ATTACKS) {
    random -= attack.chanceFactor;
    if (random <= 0) {
      return attack;
    }
  }
  
  // Fallback to first attack (left fist)
  return UNARMED_ATTACKS[0];
}

/**
 * Calculate unarmed combat damage with armor penetration
 */
export function calculateUnarmedDamage(
  attack: UnarmedAttack,
  targetArmorRating: number = 0
): {
  finalDamage: number;
  damageType: 'blunt' | 'bite';
  armorPenetration: number;
  shouldStun: boolean;
  stunDuration?: number;
} {
  // Apply armor penetration (AP directly reduces effective armor)
  const effectiveArmor = Math.max(0, targetArmorRating - attack.armorPenetration);
  const finalDamage = attack.damage * (1 - effectiveArmor);
  
  // Determine if stun should be applied
  const shouldStun = !!(attack.stunOnFirstStrike && attack.stunDuration !== undefined);
  
  return {
    finalDamage: Math.round(finalDamage * 10) / 10, // Round to 1 decimal
    damageType: attack.damageType,
    armorPenetration: attack.armorPenetration,
    shouldStun,
    stunDuration: attack.stunDuration
  };
}

/**
 * Get average DPS for unarmed combat (for display/balance purposes)
 */
export function getUnarmedAverageDPS(): number {
  // Calculate weighted average damage
  const totalWeight = UNARMED_ATTACKS.reduce((sum, attack) => sum + attack.chanceFactor, 0);
  const weightedDamage = UNARMED_ATTACKS.reduce((sum, attack) => 
    sum + (attack.damage * attack.chanceFactor), 0
  ) / totalWeight;
  
  // Assume 2 second cooldown for all attacks
  const averageCooldown = 2.0;
  
  return weightedDamage / averageCooldown; // Should be ~2.542 DPS as per RimWorld
}

/**
 * Check if an entity is unarmed (no weapon equipped)
 */
export function isUnarmed(entity: { inventory?: { equipment?: { weapon?: any } } }): boolean {
  return !entity.inventory?.equipment?.weapon?.defName;
}