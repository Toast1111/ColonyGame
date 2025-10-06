/**
 * RimWorld-Style Combat Manager
 * 
 * Centralizes combat decision-making and tactical AI for colonists.
 * Replaces scattered FSM combat logic with intelligent threat assessment,
 * positioning, and coordinated responses.
 * 
 * Key Features:
 * - Threat assessment and priority targeting
 * - Cover-seeking behavior
 * - Tactical positioning and flanking
 * - Coordinated focus fire
 * - Smart retreat and defensive positioning
 * - Combat role assignment (frontline, ranged, medic)
 */

import type { Game } from "../Game";
import type { Colonist, Enemy, Building } from "../types";
import { skillLevel } from "../skills/skills";
import { itemDatabase } from "../../data/itemDatabase";

export interface ThreatAssessment {
  enemy: Enemy;
  distance: number;
  threatLevel: number; // 0-100, higher = more dangerous
  lineOfSight: boolean;
  canReach: boolean;
  estimatedTimeToReach: number; // seconds
}

export interface CombatPosition {
  x: number;
  y: number;
  coverValue: number; // 0-1, higher = better cover
  distanceToThreat: number;
  safetyScore: number; // Combined metric for position quality
  building?: Building; // If position uses building for cover
}

export interface CombatAssignment {
  colonist: Colonist;
  role: 'engage' | 'retreat' | 'coverSeek' | 'fallback' | 'flank' | 'support';
  target?: Enemy;
  position?: CombatPosition;
  priority: number; // 0-100
  reason: string;
}

export interface CombatSituation {
  threats: ThreatAssessment[];
  totalThreatLevel: number;
  nearestThreat?: ThreatAssessment;
  mostDangerous?: ThreatAssessment;
  inCombat: boolean;
  shouldRetreat: boolean;
  defensivePositions: CombatPosition[];
}

export class CombatManager {
  private game: Game;
  private situationCache: Map<string, { situation: CombatSituation; timestamp: number }> = new Map();
  private cacheTimeout = 0.5; // Update situation every 0.5 seconds
  private focusFireTargets: Map<string, Enemy> = new Map(); // Colonist ID -> Target

  constructor(game: Game) {
    this.game = game;
  }

  /**
   * Main entry point - evaluate combat situation for a colonist
   */
  public evaluateCombatSituation(colonist: Colonist): CombatSituation {
    const colonistId = this.getColonistId(colonist);
    const cached = this.situationCache.get(colonistId);
    
    if (cached && (colonist.t - cached.timestamp) < this.cacheTimeout) {
      return cached.situation;
    }

    const situation = this.calculateSituation(colonist);
    this.situationCache.set(colonistId, { situation, timestamp: colonist.t });
    return situation;
  }

  /**
   * Get combat assignment for a colonist
   */
  public getCombatAssignment(colonist: Colonist): CombatAssignment | null {
    const situation = this.evaluateCombatSituation(colonist);
    
    if (!situation.inCombat) return null;

    // Critically injured colonists should always retreat
    if (this.isCriticallyInjured(colonist)) {
      return this.createRetreatAssignment(colonist, situation, 'critically injured');
    }

    // Colonists without weapons should seek safety
    if (!this.hasRangedWeapon(colonist)) {
      return this.createRetreatAssignment(colonist, situation, 'no weapon');
    }

    // If situation is overwhelming, coordinate retreat
    if (situation.shouldRetreat) {
      return this.createRetreatAssignment(colonist, situation, 'overwhelming threat');
    }

    // Assign combat role based on situation and colonist capabilities
    return this.assignCombatRole(colonist, situation);
  }

  /**
   * Should this colonist flee?
   */
  public shouldFlee(colonist: Colonist): { flee: boolean; target?: { x: number; y: number }; building?: Building } {
    const situation = this.evaluateCombatSituation(colonist);
    
    // No threats = no flee
    if (!situation.inCombat) {
      return { flee: false };
    }

    // Critical conditions = always flee
    if (this.isCriticallyInjured(colonist) || !this.hasRangedWeapon(colonist)) {
      const safePos = this.findSafePosition(colonist, situation);
      return { 
        flee: true, 
        target: safePos ? { x: safePos.x, y: safePos.y } : undefined,
        building: safePos?.building 
      };
    }

    // Should retreat if situation is bad
    if (situation.shouldRetreat) {
      const safePos = this.findSafePosition(colonist, situation);
      return { 
        flee: true, 
        target: safePos ? { x: safePos.x, y: safePos.y } : undefined,
        building: safePos?.building 
      };
    }

    return { flee: false };
  }

  /**
   * Get best target for a colonist to engage
   */
  public getBestTarget(colonist: Colonist, maxRange: number): Enemy | null {
    const situation = this.evaluateCombatSituation(colonist);
    
    if (!situation.threats.length) return null;

    // Check if we already have a focus fire target that's still valid
    const focusTarget = this.focusFireTargets.get(this.getColonistId(colonist));
    if (focusTarget && focusTarget.hp > 0) {
      const threat = situation.threats.find(t => t.enemy === focusTarget);
      if (threat && threat.distance <= maxRange && threat.lineOfSight) {
        return focusTarget;
      }
    }

    // Find best target based on:
    // 1. Threat level (prioritize dangerous enemies)
    // 2. Distance (prefer closer enemies)
    // 3. Line of sight (must be able to shoot)
    // 4. Focus fire (coordinate with other colonists)
    
    const validTargets = situation.threats.filter(t => 
      t.distance <= maxRange && 
      t.lineOfSight &&
      t.enemy.hp > 0
    );

    if (!validTargets.length) return null;

    // Check if other colonists are focusing on a target
    const focusFireCounts = new Map<Enemy, number>();
    for (const target of this.focusFireTargets.values()) {
      const count = focusFireCounts.get(target) || 0;
      focusFireCounts.set(target, count + 1);
    }

    // Score each target
    const scored = validTargets.map(threat => {
      let score = threat.threatLevel * 2; // Prioritize dangerous enemies
      score += (maxRange - threat.distance) / maxRange * 30; // Prefer closer
      
      // Focus fire bonus: if 1-2 colonists already targeting, add bonus (coordinated)
      const focusCount = focusFireCounts.get(threat.enemy) || 0;
      if (focusCount >= 1 && focusCount <= 2) {
        score += 25; // Coordinate with others
      } else if (focusCount > 3) {
        score -= 15; // Too many on this target, spread out
      }
      
      return { threat, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0].threat.enemy;
    
    // Remember this target for focus fire
    this.focusFireTargets.set(this.getColonistId(colonist), best);
    
    return best;
  }

  /**
   * Find a good cover position near the colonist
   */
  public findCoverPosition(colonist: Colonist, threat: Enemy): CombatPosition | null {
    const situation = this.evaluateCombatSituation(colonist);
    const positions = this.calculateCoverPositions(colonist, situation);
    
    if (!positions.length) return null;
    
    // Filter to positions that maintain engagement range (not too far from threat)
    const weaponRange = this.getWeaponRange(colonist);
    const goodPositions = positions.filter(p => {
      const distToThreat = Math.hypot(p.x - threat.x, p.y - threat.y);
      return distToThreat <= weaponRange * 0.8; // Within 80% of max range
    });
    
    if (!goodPositions.length) return positions[0]; // Fall back to any cover
    
    // Best cover with good engagement distance
    return goodPositions.sort((a, b) => b.safetyScore - a.safetyScore)[0];
  }

  /**
   * Should colonist take cover? (vs continue current action)
   */
  public shouldTakeCover(colonist: Colonist): boolean {
    const situation = this.evaluateCombatSituation(colonist);
    
    if (!situation.inCombat) return false;
    
    // Check if colonist is already in cover
    const currentCover = this.getCoverValueAtPosition(colonist.x, colonist.y, situation.nearestThreat?.enemy);
    
    // If already in good cover (>50%), stay put
    if (currentCover > 0.5) return false;
    
    // If under immediate threat and no cover, seek it
    if (situation.nearestThreat && situation.nearestThreat.distance < 100 && currentCover < 0.3) {
      return true;
    }
    
    return false;
  }

  /**
   * Get hysteresis-based danger threshold (different enter/exit distances)
   */
  public getDangerState(colonist: Colonist): { inDanger: boolean; threat?: Enemy; distance: number } {
    const enterDistance = 140;
    const exitDistance = 180;
    
    const nearestEnemy = this.findNearestEnemy(colonist);
    
    if (!nearestEnemy) {
      return { inDanger: false, distance: Infinity };
    }
    
    const distance = Math.hypot(nearestEnemy.x - colonist.x, nearestEnemy.y - colonist.y);
    const currentlyFleeing = colonist.state === 'flee';
    
    // Hysteresis: once fleeing, need to get farther away to stop
    const threshold = currentlyFleeing ? exitDistance : enterDistance;
    
    return {
      inDanger: distance < threshold,
      threat: nearestEnemy,
      distance
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private calculateSituation(colonist: Colonist): CombatSituation {
    const threats = this.assessThreats(colonist);
    const totalThreatLevel = threats.reduce((sum, t) => sum + t.threatLevel, 0);
    
    const nearestThreat = threats.length > 0 
      ? threats.reduce((nearest, t) => t.distance < nearest.distance ? t : nearest)
      : undefined;
    
    const mostDangerous = threats.length > 0
      ? threats.reduce((max, t) => t.threatLevel > max.threatLevel ? t : max)
      : undefined;
    
    const inCombat = threats.length > 0 && nearestThreat!.distance < 140;
    
    // Decide if should retreat based on multiple factors
    const shouldRetreat = this.calculateRetreatDecision(colonist, threats, totalThreatLevel);
    
    const defensivePositions = this.calculateCoverPositions(colonist, { 
      threats, 
      totalThreatLevel, 
      nearestThreat, 
      mostDangerous, 
      inCombat, 
      shouldRetreat,
      defensivePositions: [] 
    });
    
    return {
      threats,
      totalThreatLevel,
      nearestThreat,
      mostDangerous,
      inCombat,
      shouldRetreat,
      defensivePositions
    };
  }

  private assessThreats(colonist: Colonist): ThreatAssessment[] {
    const threats: ThreatAssessment[] = [];
    
    for (const enemy of this.game.enemies) {
      if (enemy.hp <= 0) continue;
      
      const distance = Math.hypot(enemy.x - colonist.x, enemy.y - colonist.y);
      
      // Only consider enemies within awareness range
      if (distance > 300) continue;
      
      const lineOfSight = this.hasLineOfSight(colonist, enemy);
      const canReach = distance < 500; // Arbitrary "can this enemy reach me" threshold
      const estimatedTimeToReach = distance / ((enemy as any).speed || 40);
      
      // Calculate threat level based on:
      // - Distance (closer = more dangerous)
      // - Enemy health (healthier = more dangerous)
      // - Enemy damage capability
      // - Whether they have line of sight to us
      
      let threatLevel = 50; // Base threat
      
      // Distance factor (inverse)
      const distanceFactor = Math.max(0, 1 - (distance / 200));
      threatLevel += distanceFactor * 30;
      
      // Health factor
      const healthFactor = (enemy.hp || 50) / 50;
      threatLevel += healthFactor * 10;
      
      // Line of sight increases threat
      if (lineOfSight) threatLevel += 10;
      
      // Very close enemies are critical threats
      if (distance < 80) threatLevel += 20;
      
      threats.push({
        enemy,
        distance,
        threatLevel: Math.min(100, threatLevel),
        lineOfSight,
        canReach,
        estimatedTimeToReach
      });
    }
    
    return threats.sort((a, b) => b.threatLevel - a.threatLevel);
  }

  private calculateRetreatDecision(colonist: Colonist, threats: ThreatAssessment[], totalThreat: number): boolean {
    // No threats = no retreat
    if (threats.length === 0) return false;
    
    // Critical injury = always retreat
    if (this.isCriticallyInjured(colonist)) return true;
    
    // No weapon = always retreat
    if (!this.hasRangedWeapon(colonist)) return true;
    
    // Overwhelmed by numbers (3+ enemies close)
    const closeThreats = threats.filter(t => t.distance < 120);
    if (closeThreats.length >= 3) return true;
    
    // Very high total threat
    if (totalThreat > 200) return true;
    
    // Low ammo/health combination
    const healthPercent = (colonist.hp || 100) / 100;
    if (healthPercent < 0.3 && threats.some(t => t.distance < 100)) return true;
    
    return false;
  }

  private calculateCoverPositions(colonist: Colonist, situation: CombatSituation): CombatPosition[] {
    const positions: CombatPosition[] = [];
    const searchRadius = 120;
    
    // Find walls that can provide cover
    const walls = this.game.buildings.filter(b => 
      b.kind === 'wall' && 
      b.done &&
      Math.hypot((b.x + b.w/2) - colonist.x, (b.y + b.h/2) - colonist.y) < searchRadius
    );
    
    // For each wall, calculate positions around it
    for (const wall of walls) {
      const positions_around = this.getPositionsAroundWall(wall);
      
      for (const pos of positions_around) {
        const coverValue = this.getCoverValueAtPosition(pos.x, pos.y, situation.nearestThreat?.enemy);
        const distanceToThreat = situation.nearestThreat 
          ? Math.hypot(pos.x - situation.nearestThreat.enemy.x, pos.y - situation.nearestThreat.enemy.y)
          : Infinity;
        
        // Safety score combines cover and distance from threat
        const distanceScore = Math.min(1, distanceToThreat / 200);
        const safetyScore = coverValue * 0.7 + distanceScore * 0.3;
        
        positions.push({
          x: pos.x,
          y: pos.y,
          coverValue,
          distanceToThreat,
          safetyScore,
          building: wall
        });
      }
    }
    
    // Also consider defensive buildings (turrets, fortifications)
    const defensiveBuildings = this.game.buildings.filter(b =>
      (b.kind === 'turret' || b.kind === 'wall') &&
      b.done &&
      Math.hypot((b.x + b.w/2) - colonist.x, (b.y + b.h/2) - colonist.y) < searchRadius
    );
    
    for (const building of defensiveBuildings) {
      const center = this.game.centerOf(building);
      const coverValue = 0.6; // Defensive buildings provide good cover
      const distanceToThreat = situation.nearestThreat
        ? Math.hypot(center.x - situation.nearestThreat.enemy.x, center.y - situation.nearestThreat.enemy.y)
        : Infinity;
      
      positions.push({
        x: center.x,
        y: center.y,
        coverValue,
        distanceToThreat,
        safetyScore: coverValue * 0.7 + Math.min(1, distanceToThreat / 200) * 0.3,
        building
      });
    }
    
    return positions.sort((a, b) => b.safetyScore - a.safetyScore);
  }

  private getPositionsAroundWall(wall: Building): { x: number; y: number }[] {
    const T = 32; // Tile size
    const positions: { x: number; y: number }[] = [];
    
    // Positions on each side of the wall
    const cx = wall.x + wall.w / 2;
    const cy = wall.y + wall.h / 2;
    
    // North, South, East, West positions
    positions.push(
      { x: cx, y: wall.y - T },           // North
      { x: cx, y: wall.y + wall.h + T },  // South
      { x: wall.x - T, y: cy },           // West
      { x: wall.x + wall.w + T, y: cy }   // East
    );
    
    return positions;
  }

  private getCoverValueAtPosition(x: number, y: number, threat?: Enemy): number {
    if (!threat) return 0;
    
    // Check if there's a wall between position and threat
    let coverValue = 0;
    
    for (const wall of this.game.buildings) {
      if (wall.kind !== 'wall' || !wall.done) continue;
      
      // Check if wall is between position and threat
      const wallCenter = this.game.centerOf(wall);
      const distToWall = Math.hypot(wallCenter.x - x, wallCenter.y - y);
      
      // Wall must be close to position
      if (distToWall > 40) continue;
      
      // Check if wall blocks line to threat
      if (this.lineIntersectsRect(x, y, threat.x, threat.y, wall)) {
        coverValue = Math.max(coverValue, 0.75); // 75% cover from wall
      }
      
      // Even if not directly blocking, nearby walls provide some cover
      if (distToWall < 20) {
        coverValue = Math.max(coverValue, 0.3);
      }
    }
    
    return coverValue;
  }

  private findSafePosition(colonist: Colonist, situation: CombatSituation): CombatPosition | null {
    // Priority 1: Defensive positions with cover
    if (situation.defensivePositions.length > 0) {
      return situation.defensivePositions[0];
    }
    
    // Priority 2: Indoor buildings (houses, HQ)
    const safeBuildings = this.game.buildings.filter(b =>
      (b.kind === 'house' || b.kind === 'hq') &&
      b.done &&
      this.game.buildingHasSpace(b, colonist)
    );
    
    if (safeBuildings.length > 0) {
      // Pick closest safe building
      const sorted = safeBuildings.sort((a, b) => {
        const distA = Math.hypot((a.x + a.w/2) - colonist.x, (a.y + a.h/2) - colonist.y);
        const distB = Math.hypot((b.x + b.w/2) - colonist.x, (b.y + b.h/2) - colonist.y);
        return distA - distB;
      });
      
      const building = sorted[0];
      const center = this.game.centerOf(building);
      return {
        x: center.x,
        y: center.y,
        coverValue: 1.0, // Buildings provide full cover
        distanceToThreat: situation.nearestThreat 
          ? Math.hypot(center.x - situation.nearestThreat.enemy.x, center.y - situation.nearestThreat.enemy.y)
          : Infinity,
        safetyScore: 1.0,
        building
      };
    }
    
    // Priority 3: Near friendly turrets
    const turret = this.game.buildings.find(b => b.kind === 'turret' && b.done);
    if (turret) {
      const center = this.game.centerOf(turret);
      return {
        x: center.x,
        y: center.y,
        coverValue: 0.5,
        distanceToThreat: situation.nearestThreat
          ? Math.hypot(center.x - situation.nearestThreat.enemy.x, center.y - situation.nearestThreat.enemy.y)
          : Infinity,
        safetyScore: 0.7,
        building: turret
      };
    }
    
    return null;
  }

  private assignCombatRole(colonist: Colonist, situation: CombatSituation): CombatAssignment {
    const shootingSkill = colonist.skills ? skillLevel(colonist, 'Shooting') : 0;
    const health = (colonist.hp || 100) / 100;
    
    // Low health colonists support from rear
    if (health < 0.5) {
      const coverPos = situation.defensivePositions[0];
      return {
        colonist,
        role: 'support',
        position: coverPos,
        priority: 60,
        reason: 'low health, providing support fire'
      };
    }
    
    // High skill colonists engage aggressively
    if (shootingSkill >= 8) {
      return {
        colonist,
        role: 'engage',
        target: situation.mostDangerous?.enemy,
        priority: 90,
        reason: 'skilled shooter, engaging threat'
      };
    }
    
    // Default: seek cover and engage
    return {
      colonist,
      role: 'coverSeek',
      target: situation.nearestThreat?.enemy,
      position: situation.defensivePositions[0],
      priority: 70,
      reason: 'standard combat engagement'
    };
  }

  private createRetreatAssignment(colonist: Colonist, situation: CombatSituation, reason: string): CombatAssignment {
    const safePos = this.findSafePosition(colonist, situation);
    
    return {
      colonist,
      role: 'retreat',
      position: safePos || undefined,
      priority: 100,
      reason
    };
  }

  private isCriticallyInjured(colonist: Colonist): boolean {
    const health = (colonist.hp || 100) / 100;
    const bloodLevel = colonist.health?.bloodLevel || 1.0;
    const consciousness = colonist.health?.consciousness || 1.0;
    
    return health < 0.25 || bloodLevel < 0.4 || consciousness < 0.3;
  }

  private hasRangedWeapon(colonist: Colonist): boolean {
    const weapon = colonist.inventory?.equipment?.weapon;
    if (!weapon || !weapon.defName) return false;
    
    const itemDef = itemDatabase.getItemDef(weapon.defName);
    return !!(itemDef && (itemDef.range || 0) > 2);
  }

  private getWeaponRange(colonist: Colonist): number {
    const weapon = colonist.inventory?.equipment?.weapon;
    if (!weapon || !weapon.defName) return 0;
    
    const itemDef = itemDatabase.getItemDef(weapon.defName);
    const T = 32;
    return itemDef ? (itemDef.range || 10) * T : 160;
  }

  private hasLineOfSight(from: { x: number; y: number }, to: { x: number; y: number }): boolean {
    for (const b of this.game.buildings) {
      if (b.kind === 'hq' || b.kind === 'path' || b.kind === 'house' || 
          b.kind === 'farm' || b.kind === 'bed' || !b.done) continue;
      
      if (this.lineIntersectsRect(from.x, from.y, to.x, to.y, b)) {
        return false;
      }
    }
    return true;
  }

  private lineIntersectsRect(x1: number, y1: number, x2: number, y2: number, r: Building): boolean {
    const xMin = r.x, xMax = r.x + r.w;
    const yMin = r.y, yMax = r.y + r.h;
    const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
    if (maxX < xMin || minX > xMax || maxY < yMin || minY > yMax) return false;
    
    const intersectsEdge = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) => {
      const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
      if (denom === 0) return false;
      const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
      const u = ((x1 - x3) * (y1 - y2) - (y1 - y3) * (x1 - x2)) / denom;
      return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    };
    
    if (intersectsEdge(x1, y1, x2, y2, xMin, yMin, xMax, yMin)) return true;
    if (intersectsEdge(x1, y1, x2, y2, xMax, yMin, xMax, yMax)) return true;
    if (intersectsEdge(x1, y1, x2, y2, xMax, yMax, xMin, yMax)) return true;
    if (intersectsEdge(x1, y1, x2, y2, xMin, yMax, xMin, yMin)) return true;
    return false;
  }

  private findNearestEnemy(colonist: Colonist): Enemy | null {
    let nearest: Enemy | null = null;
    let minDist = Infinity;
    
    for (const enemy of this.game.enemies) {
      if (enemy.hp <= 0) continue;
      
      const dist = Math.hypot(enemy.x - colonist.x, enemy.y - colonist.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = enemy;
      }
    }
    
    return nearest;
  }

  private getColonistId(colonist: Colonist): string {
    if (!(colonist as any).id) {
      (colonist as any).id = `colonist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return (colonist as any).id;
  }

  /**
   * Clean up expired cache entries and focus fire targets
   */
  public cleanup(currentTime: number): void {
    // Clean up stale situation cache
    for (const [id, cached] of this.situationCache.entries()) {
      if (currentTime - cached.timestamp > this.cacheTimeout * 3) {
        this.situationCache.delete(id);
      }
    }
    
    // Clean up focus fire targets for dead enemies
    for (const [colonistId, target] of this.focusFireTargets.entries()) {
      if (target.hp <= 0) {
        this.focusFireTargets.delete(colonistId);
      }
    }
  }
}
