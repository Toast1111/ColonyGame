/**
 * HealthManager - Manages health calculations and injury systems
 * 
 * This manager was created during the Great Paste-Eating Intervention of 2025.
 * Previously, Game.ts was egregiously consuming all health-related paste instead 
 * of properly delegating to specialized managers. Now it just passes the paste 
 * like a responsible orchestrator! 🎨✨
 * 
 * Extracted from Game.ts lines 483-578 (RIP paste-eating behavior)
 */

import type { Colonist } from '../types';

export class HealthManager {
  /**
   * Calculate pain level from damage
   * 
   * Different damage types cause varying levels of pain:
   * - Fractures hurt the most (0.6 base)
   * - Gunshots are extremely painful (0.5 base)
   * - Burns are very painful (0.4 base)
   * - Bites hurt significantly (0.35 base)
   * - Cuts are moderately painful (0.3 base)
   * - Bruises hurt the least (0.1 base)
   * 
   * @param damageType - Type of damage inflicted
   * @param severity - Severity multiplier (0-1)
   * @returns Pain value (0-1), capped at 1.0
   */
  calculatePainFromDamage(damageType: string, severity: number): number {
    const basePain: Record<string, number> = {
      'cut': 0.3,
      'bruise': 0.1,
      'burn': 0.4,
      'bite': 0.35,
      'gunshot': 0.5,
      'fracture': 0.6
    };
    return Math.min(1.0, (basePain[damageType] || 0.2) * severity);
  }

  /**
   * Calculate bleeding rate from damage
   * 
   * Bleeding mechanics:
   * - Gunshots bleed the most (0.5 base)
   * - Cuts bleed significantly (0.4 base)
   * - Bites bleed moderately (0.3 base)
   * - Fractures bleed slightly (0.2 base)
   * - Burns bleed minimally (0.1 base)
   * - Bruises don't bleed (0.0 base)
   * 
   * @param damageType - Type of damage inflicted
   * @param severity - Severity multiplier (0-1)
   * @returns Bleeding rate (0-1), capped at 1.0
   */
  calculateBleedingFromDamage(damageType: string, severity: number): number {
    const baseBleed: Record<string, number> = {
      'cut': 0.4,
      'bruise': 0.0,
      'burn': 0.1,
      'bite': 0.3,
      'gunshot': 0.5,
      'fracture': 0.2
    };
    return Math.min(1.0, (baseBleed[damageType] || 0.1) * severity);
  }

  /**
   * Calculate natural healing rate for an injury
   * 
   * Healing speed varies by injury type:
   * - Bruises heal fastest (1.2x base - faster than normal)
   * - Cuts heal quickly (0.8x base)
   * - Bites heal moderately (0.7x base)
   * - Burns heal slowly (0.6x base)
   * - Gunshots heal very slowly (0.4x base)
   * - Fractures heal slowest (0.3x base)
   * 
   * More severe injuries heal proportionally slower.
   * 
   * @param damageType - Type of injury
   * @param severity - Injury severity (0-1)
   * @returns Heal rate multiplier (reduced by severity)
   */
  calculateHealRate(damageType: string, severity: number): number {
    const baseHealRate: Record<string, number> = {
      'cut': 0.8,
      'bruise': 1.2,
      'burn': 0.6,
      'bite': 0.7,
      'gunshot': 0.4,
      'fracture': 0.3
    };
    return (baseHealRate[damageType] || 0.8) * (1.0 - severity * 0.5);
  }

  /**
   * Calculate infection chance for an injury
   * 
   * Infection risk by damage type:
   * - Bites have highest infection risk (0.4 base - 40%)
   * - Burns have high infection risk (0.25 base - 25%)
   * - Gunshots have moderate-high risk (0.3 base - 30%)
   * - Cuts have moderate risk (0.15 base - 15%)
   * - Fractures have low risk (0.1 base - 10%)
   * - Bruises don't get infected (0.0 base)
   * 
   * More severe injuries are more likely to get infected.
   * 
   * @param damageType - Type of injury
   * @param severity - Injury severity (0-1)
   * @returns Infection probability (0-0.8), capped at 80%
   */
  calculateInfectionChance(damageType: string, severity: number): number {
    const baseInfection: Record<string, number> = {
      'cut': 0.15,
      'bruise': 0.0,
      'burn': 0.25,
      'bite': 0.4,
      'gunshot': 0.3,
      'fracture': 0.1
    };
    return Math.min(0.8, (baseInfection[damageType] || 0.1) * severity);
  }

  /**
   * Generate a human-readable injury description
   * 
   * Creates descriptive injury text based on type, location, and severity.
   * 
   * Severity levels:
   * - < 0.2: minor
   * - 0.2-0.5: moderate
   * - 0.5-0.8: severe
   * - >= 0.8: critical
   * 
   * @param damageType - Type of injury
   * @param bodyPart - Affected body part
   * @param severity - Injury severity (0-1)
   * @returns Formatted injury description (e.g., "severe gunshot wound in torso")
   */
  generateInjuryDescription(damageType: string, bodyPart: string, severity: number): string {
    const severityDesc = severity < 0.2 ? 'minor' : severity < 0.5 ? 'moderate' : severity < 0.8 ? 'severe' : 'critical';
    const descriptions: Record<string, string> = {
      'cut': `${severityDesc} laceration on ${bodyPart}`,
      'bruise': `${severityDesc} bruising on ${bodyPart}`,
      'burn': `${severityDesc} burn on ${bodyPart}`,
      'bite': `${severityDesc} bite wound on ${bodyPart}`,
      'gunshot': `${severityDesc} gunshot wound in ${bodyPart}`,
      'fracture': `${severityDesc} fracture in ${bodyPart}`
    };
    return descriptions[damageType] || `${severityDesc} injury to ${bodyPart}`;
  }

  /**
   * Recalculate all health stats for a colonist based on their injuries
   * 
   * This updates:
   * - Total pain (sum of all injury pain)
   * - Blood level (reduced by bleeding)
   * - Consciousness (reduced by pain and blood loss)
   * - Mobility (reduced by leg injuries and pain)
   * - Manipulation (reduced by arm injuries and pain)
   * 
   * Call this after:
   * - Adding/removing injuries
   * - Updating injury severity
   * - Treating injuries
   * 
   * @param colonist - Colonist to recalculate health for
   */
  recalculateColonistHealth(colonist: Colonist): void {
    if (!colonist.health) return;

    // Calculate total pain from all injuries
    let totalPain = 0;
    let totalBleeding = 0;
    
    for (const injury of colonist.health.injuries) {
      totalPain += injury.pain;
      totalBleeding += injury.bleeding;
    }

    colonist.health.totalPain = Math.min(1.0, totalPain);
    colonist.health.bloodLevel = Math.max(0.0, 1.0 - totalBleeding);
    
    // Calculate consciousness (affected by pain and blood loss)
    // Pain reduces consciousness by 30%, blood loss by 50%
    colonist.health.consciousness = Math.max(0.1, 1.0 - (totalPain * 0.3) - ((1.0 - colonist.health.bloodLevel) * 0.5));
    
    // Calculate mobility (movement speed)
    // Leg injuries reduce mobility by 30% per severity point
    const legInjuries = colonist.health.injuries.filter(i => i.bodyPart === 'left_leg' || i.bodyPart === 'right_leg');
    let mobilityPenalty = 0;
    for (const injury of legInjuries) {
      mobilityPenalty += injury.severity * 0.3;
    }
    // Pain also reduces mobility by 20%
    colonist.health.mobility = Math.max(0.2, 1.0 - mobilityPenalty - totalPain * 0.2);
    
    // Calculate manipulation (work speed)
    // Arm injuries reduce manipulation by 40% per severity point
    const armInjuries = colonist.health.injuries.filter(i => i.bodyPart === 'left_arm' || i.bodyPart === 'right_arm');
    let manipulationPenalty = 0;
    for (const injury of armInjuries) {
      manipulationPenalty += injury.severity * 0.4;
    }
    // Pain also reduces manipulation by 30%
    colonist.health.manipulation = Math.max(0.1, 1.0 - manipulationPenalty - totalPain * 0.3);
  }

  /**
   * Get a summary of a colonist's overall health condition
   * 
   * @param colonist - Colonist to get health summary for
   * @returns Object with health status indicators
   */
  getHealthSummary(colonist: Colonist): {
    overall: 'healthy' | 'injured' | 'critical' | 'downed';
    consciousness: number;
    mobility: number;
    manipulation: number;
    bleeding: boolean;
    inPain: boolean;
  } {
    if (!colonist.health) {
      return {
        overall: 'healthy',
        consciousness: 1.0,
        mobility: 1.0,
        manipulation: 1.0,
        bleeding: false,
        inPain: false
      };
    }

    const { consciousness, mobility, manipulation, bloodLevel, totalPain } = colonist.health;
    const bleeding = bloodLevel < 1.0;
    const inPain = totalPain > 0.1;

    let overall: 'healthy' | 'injured' | 'critical' | 'downed';
    if (consciousness < 0.3 || bloodLevel < 0.3) {
      overall = 'downed';
    } else if (totalPain > 0.5 || bloodLevel < 0.6 || mobility < 0.5) {
      overall = 'critical';
    } else if (colonist.health.injuries.length > 0) {
      overall = 'injured';
    } else {
      overall = 'healthy';
    }

    return {
      overall,
      consciousness,
      mobility,
      manipulation,
      bleeding,
      inPain
    };
  }
}
