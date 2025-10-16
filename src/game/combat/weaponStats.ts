import type { ItemDef } from '../../data/itemDatabase';
import { GAME_TICKS_PER_SECOND } from '../constants';

/**
 * Calculate optimal DPS (damage per second) for a weapon
 * This assumes every shot hits an unarmored target
 */
export function calculateOptimalDPS(weaponDef: ItemDef): number {
  const damage = weaponDef.damage || 0;
  const burstCount = weaponDef.burstCount || 1;
  // Convert RimWorld ticks to game seconds
  const aimTime = weaponDef.aimTimeTicks ? (weaponDef.aimTimeTicks / GAME_TICKS_PER_SECOND) : 0.8;
  const cooldownTime = weaponDef.cooldownTicks ? (weaponDef.cooldownTicks / GAME_TICKS_PER_SECOND) : 1.0;
  const betweenShots = 0.1; // Fixed time between burst shots
  
  // Total damage per burst
  const burstDamage = damage * burstCount;
  
  // Total time for one complete attack cycle:
  // aimTime + (burstCount - 1) * betweenShots + cooldownTime
  const cycleTime = aimTime + (burstCount - 1) * betweenShots + cooldownTime;
  
  if (cycleTime <= 0) return 0;
  
  return burstDamage / cycleTime;
}

/**
 * Interpolate weapon accuracy based on distance in tiles
 * Uses linear interpolation between defined range breakpoints:
 * - Touch: 3 tiles
 * - Short: 12 tiles
 * - Medium: 25 tiles
 * - Long: 40 tiles
 */
export function getAccuracyAtRange(weaponDef: ItemDef, distanceInTiles: number): number {
  const touch = weaponDef.accuracyTouch ?? weaponDef.accuracy ?? 0.9;
  const short = weaponDef.accuracyShort ?? weaponDef.accuracy ?? 0.75;
  const medium = weaponDef.accuracyMedium ?? weaponDef.accuracy ?? 0.6;
  const long = weaponDef.accuracyLong ?? weaponDef.accuracy ?? 0.4;
  
  if (distanceInTiles <= 3) {
    return touch;
  } else if (distanceInTiles <= 12) {
    const t = (distanceInTiles - 3) / (12 - 3);
    return touch + t * (short - touch);
  } else if (distanceInTiles <= 25) {
    const t = (distanceInTiles - 12) / (25 - 12);
    return short + t * (medium - short);
  } else if (distanceInTiles <= 40) {
    const t = (distanceInTiles - 25) / (40 - 25);
    return medium + t * (long - medium);
  } else {
    return long;
  }
}

/**
 * Calculate DPS at a specific range
 * This factors in weapon accuracy at that range (before shooter's skill, armor, etc.)
 */
export function calculateDPSAtRange(weaponDef: ItemDef, distanceInTiles: number): number {
  const optimalDPS = calculateOptimalDPS(weaponDef);
  const accuracy = getAccuracyAtRange(weaponDef, distanceInTiles);
  
  // DPS is reduced by miss chance
  return optimalDPS * accuracy;
}

/**
 * Get a summary of weapon stats for display
 */
export function getWeaponStatsSummary(weaponDef: ItemDef): {
  optimalDPS: number;
  dpsTouch: number;
  dpsShort: number;
  dpsMedium: number;
  dpsLong: number;
} {
  return {
    optimalDPS: calculateOptimalDPS(weaponDef),
    dpsTouch: calculateDPSAtRange(weaponDef, 3),
    dpsShort: calculateDPSAtRange(weaponDef, 12),
    dpsMedium: calculateDPSAtRange(weaponDef, 25),
    dpsLong: calculateDPSAtRange(weaponDef, 40)
  };
}
