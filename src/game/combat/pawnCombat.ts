import type { Game } from "../Game";
import type { Colonist, Enemy } from "../types";
import { grantSkillXP, skillLevel } from "../skills/skills";
import { itemDatabase } from "../../data/itemDatabase";
import { createMuzzleFlash, createProjectileTrail } from "../../core/particles";
import { getWeaponAudioByDefName } from "../audio/weaponAudioMap";

// Reuse utility from turret combat via a local copy (keeps decoupled)
function lineIntersectsRect(x1: number, y1: number, x2: number, y2: number, r: { x: number; y: number; w: number; h: number }): boolean {
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

function hasLineOfFire(game: Game, from: { x: number; y: number }, to: { x: number; y: number }): boolean {
  for (const b of game.buildings) {
  if (b.kind === 'hq' || b.kind === 'path' || b.kind === 'house' || b.kind === 'farm' || b.kind === 'bed' || !b.done) continue;
    const fromInside = from.x >= b.x && from.x <= b.x + b.w && from.y >= b.y && from.y <= b.y + b.h;
    if (fromInside) continue;
    if (lineIntersectsRect(from.x, from.y, to.x, to.y, b)) return false;
  }
  return true;
}

function segmentIntersectsCircle(x1: number, y1: number, x2: number, y2: number, cx: number, cy: number, r: number): boolean {
  const dx = x2 - x1, dy = y2 - y1;
  const fx = x1 - cx, fy = y1 - cy;
  const a = dx*dx + dy*dy;
  const b = 2 * (fx*dx + fy*dy);
  const c = fx*fx + fy*fy - r*r;
  let disc = b*b - 4*a*c;
  if (disc < 0) return false;
  disc = Math.sqrt(disc);
  const t1 = (-b - disc) / (2*a);
  const t2 = (-b + disc) / (2*a);
  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
}

function willHitFriendly(game: Game, from: { x: number; y: number }, to: { x: number; y: number }, self: Colonist): boolean {
  for (const f of game.colonists) {
    if (f === self || !f.alive || f.inside) continue;
    const r = (f.r || 8) + 6; // small safety margin
    if (segmentIntersectsCircle(from.x, from.y, to.x, to.y, f.x, f.y, r)) return true;
  }
  return false;
}

/**
 * Calculate directional cover effectiveness based on attack angle
 * a < 15° = 100% effectiveness
 * 15° < a < 27° = 80% effectiveness
 * 27° < a < 40° = 60% effectiveness
 * 40° < a < 52° = 40% effectiveness
 * 52° < a < 65° = 20% effectiveness
 * a > 65° = 0% effectiveness
 */
function getDirectionalCoverMultiplier(attackAngleDeg: number): number {
  const a = Math.abs(attackAngleDeg);
  if (a < 15) return 1.0;
  if (a < 27) return 0.8;
  if (a < 40) return 0.6;
  if (a < 52) return 0.4;
  if (a < 65) return 0.2;
  return 0;
}

/**
 * Interpolate weapon accuracy based on distance
 * Uses linear interpolation between defined range breakpoints:
 * - Touch: 3 tiles
 * - Short: 12 tiles
 * - Medium: 25 tiles
 * - Long: 40 tiles
 */
function interpolateAccuracy(def: any, distanceInTiles: number): number {
  const touch = def.accuracyTouch ?? 0.9;
  const short = def.accuracyShort ?? 0.75;
  const medium = def.accuracyMedium ?? 0.6;
  const long = def.accuracyLong ?? 0.4;
  
  if (distanceInTiles <= 3) {
    // At or below touch range
    return touch;
  } else if (distanceInTiles <= 12) {
    // Between touch and short: interpolate
    const t = (distanceInTiles - 3) / (12 - 3);
    return touch + t * (short - touch);
  } else if (distanceInTiles <= 25) {
    // Between short and medium: interpolate
    const t = (distanceInTiles - 12) / (25 - 12);
    return short + t * (medium - short);
  } else if (distanceInTiles <= 40) {
    // Between medium and long: interpolate
    const t = (distanceInTiles - 25) / (40 - 25);
    return medium + t * (long - medium);
  } else {
    // Beyond long range
    return long;
  }
}

/**
 * Calculate distance-based cover reduction
 * - Cover is only 33.33% effective at point-blank range (directly in front)
 * - Cover is 66.666% effective at 1 tile away
 * - Cover is 100% effective at 2+ tiles away
 */
function getDistanceCoverMultiplier(distanceToCover: number): number {
  const T = 32; // tile size
  if (distanceToCover < T * 0.5) {
    // Point-blank range (directly in front of cover)
    return 0.3333;
  } else if (distanceToCover < T * 1.5) {
    // 1 tile away - interpolate between 33.33% and 66.666%
    const t = (distanceToCover - T * 0.5) / T;
    return 0.3333 + t * (0.6666 - 0.3333);
  } else if (distanceToCover < T * 2.5) {
    // 1-2 tiles away - interpolate between 66.666% and 100%
    const t = (distanceToCover - T * 1.5) / T;
    return 0.6666 + t * (1.0 - 0.6666);
  }
  return 1.0; // Full effectiveness at 2+ tiles
}

/**
 * Calculate cover penalty for a shot from `from` to `to`
 * 
 * Cover Types:
 * - High Cover (Walls): 75% base cover, blocks line of sight completely, must lean out to fire
 * - Low Cover (Sandbags, Rocks, Trees): 30-50% base cover, can shoot over
 * 
 * Directional effectiveness: Cover works best when attack comes straight at it (0-15° = 100%),
 * decreasing effectiveness at angles (>65° = 0%)
 * 
 * Distance reduction: Cover is less effective at point-blank (33.33%) and 1 tile away (66.666%)
 * 
 * Multiple sources: Low cover pieces can stack when shot comes from diagonal angles
 */
function coverPenalty(game: Game, from: { x: number; y: number }, to: { x: number; y: number }): number {
  const T = 32; // tile size
  
  // Track all cover sources that could affect this shot
  interface CoverSource {
    value: number; // base cover value (0.3 for trees, 0.5 for rocks, 0.75 for walls)
    isHighCover: boolean; // true for walls
    angle: number; // angle in degrees relative to shot direction
    distanceToShooter: number; // distance from shooter to cover
    effectiveValue: number; // final cover value after modifiers
  }
  
  const coverSources: CoverSource[] = [];
  
  // Shot direction vector (from shooter to target)
  const shotVx = to.x - from.x;
  const shotVy = to.y - from.y;
  const shotAngle = Math.atan2(shotVy, shotVx);
  const shotDistance = Math.hypot(shotVx, shotVy) || 1;
  
  // Check walls (75% high cover - blocks line of sight)
  for (const b of game.buildings) {
    if (!b.done || b.kind !== 'wall') continue;
    
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const wx = cx - from.x, wy = cy - from.y;
    const t = Math.max(0, Math.min(1, (wx * shotVx + wy * shotVy) / (shotDistance * shotDistance)));
    const px = from.x + t * shotVx, py = from.y + t * shotVy;
    const distToCover = Math.hypot(px - cx, py - cy);
    
    // Only consider cover within last 25% of the shot path (near the target)
    if (t > 0.75 && distToCover < Math.max(12, Math.min(b.w, b.h) * 0.6)) {
      // Calculate angle between shot direction and wall normal
      // For walls, we approximate the normal based on wall orientation
      const wallIsVertical = b.h > b.w;
      const wallNormalAngle = wallIsVertical ? 0 : Math.PI / 2; // 0° for vertical, 90° for horizontal
      
      let angleDiff = Math.abs((shotAngle - wallNormalAngle) * 180 / Math.PI);
      // Normalize to 0-90 range
      while (angleDiff > 90) angleDiff = Math.abs(angleDiff - 180);
      if (angleDiff > 90) angleDiff = 180 - angleDiff;
      
      const directionalMult = getDirectionalCoverMultiplier(angleDiff);
      const distanceFromCover = Math.hypot(from.x - cx, from.y - cy);
      const distanceMult = getDistanceCoverMultiplier(distanceFromCover);
      
      const effectiveValue = 0.75 * directionalMult * distanceMult;
      
      if (effectiveValue > 0) {
        coverSources.push({
          value: 0.75,
          isHighCover: true,
          angle: angleDiff,
          distanceToShooter: distanceFromCover,
          effectiveValue
        });
      }
    }
  }
  
  // Check stone chunks/rocks (50% low cover)
  for (const rock of game.rocks) {
    const cx = rock.x, cy = rock.y;
    const wx = cx - from.x, wy = cy - from.y;
    const t = Math.max(0, Math.min(1, (wx * shotVx + wy * shotVy) / (shotDistance * shotDistance)));
    const px = from.x + t * shotVx, py = from.y + t * shotVy;
    const distToCover = Math.hypot(px - cx, py - cy);
    
    if (t > 0.75 && distToCover < rock.r + 8) {
      // Calculate angle between shot direction and target-to-cover direction
      const targetToCoverAngle = Math.atan2(cy - to.y, cx - to.x);
      let angleDiff = Math.abs((shotAngle - targetToCoverAngle) * 180 / Math.PI);
      // Normalize to 0-180 range
      if (angleDiff > 180) angleDiff = 360 - angleDiff;
      if (angleDiff > 90) angleDiff = 180 - angleDiff;
      
      const directionalMult = getDirectionalCoverMultiplier(angleDiff);
      const distanceFromCover = Math.hypot(from.x - cx, from.y - cy);
      const distanceMult = getDistanceCoverMultiplier(distanceFromCover);
      
      const effectiveValue = 0.5 * directionalMult * distanceMult;
      
      if (effectiveValue > 0) {
        coverSources.push({
          value: 0.5,
          isHighCover: false,
          angle: angleDiff,
          distanceToShooter: distanceFromCover,
          effectiveValue
        });
      }
    }
  }
  
  // Check trees (30% low cover)
  for (const tree of game.trees) {
    const cx = tree.x, cy = tree.y;
    const wx = cx - from.x, wy = cy - from.y;
    const t = Math.max(0, Math.min(1, (wx * shotVx + wy * shotVy) / (shotDistance * shotDistance)));
    const px = from.x + t * shotVx, py = from.y + t * shotVy;
    const distToCover = Math.hypot(px - cx, py - cy);
    
    if (t > 0.75 && distToCover < tree.r + 6) {
      // Calculate angle between shot direction and target-to-cover direction
      const targetToCoverAngle = Math.atan2(cy - to.y, cx - to.x);
      let angleDiff = Math.abs((shotAngle - targetToCoverAngle) * 180 / Math.PI);
      if (angleDiff > 180) angleDiff = 360 - angleDiff;
      if (angleDiff > 90) angleDiff = 180 - angleDiff;
      
      const directionalMult = getDirectionalCoverMultiplier(angleDiff);
      const distanceFromCover = Math.hypot(from.x - cx, from.y - cy);
      const distanceMult = getDistanceCoverMultiplier(distanceFromCover);
      
      const effectiveValue = 0.3 * directionalMult * distanceMult;
      
      if (effectiveValue > 0) {
        coverSources.push({
          value: 0.3,
          isHighCover: false,
          angle: angleDiff,
          distanceToShooter: distanceFromCover,
          effectiveValue
        });
      }
    }
  }
  
  // Calculate final cover penalty
  if (coverSources.length === 0) return 0;
  
  // High cover always takes precedence (blocks line of sight)
  const highCover = coverSources.find(c => c.isHighCover);
  if (highCover) {
    return highCover.effectiveValue;
  }
  
  // For low cover, multiple sources can combine (e.g., diagonal shots through multiple pieces)
  // Take the highest individual cover value, but add 20% of any additional low cover sources
  coverSources.sort((a, b) => b.effectiveValue - a.effectiveValue);
  let totalCover = coverSources[0].effectiveValue;
  
  // Add partial benefit from additional low cover sources (max 2 additional sources)
  for (let i = 1; i < Math.min(3, coverSources.length); i++) {
    totalCover += coverSources[i].effectiveValue * 0.2;
  }
  
  // Cap total cover at 0.9 (90%) to ensure some shots can get through
  return Math.min(0.9, totalCover);
}

function getWeaponStats(c: Colonist) {
  const eq: any = c.inventory?.equipment || {};
  const w = eq.weapon;
  if (!w || !w.defName) return null;
  const def = itemDatabase.getItemDef(w.defName);
  if (!def) return null;
  const T = 32;
  const rangePx = (def.range || 10) * T;
  const damage = def.damage || 12;
  
  // Use new accuracy system with range-based interpolation
  const accuracyFn = (distPx: number) => {
    const distTiles = distPx / T;
    return interpolateAccuracy(def, distTiles);
  };
  
  // Use new weapon stats if available, otherwise use legacy values
  const burst = def.burstCount ?? (def.defName === 'AssaultRifle' ? 3 : 1);
  const warmup = def.aimTime ?? (def.defName === 'AssaultRifle' ? 0.6 : 0.4);
  const betweenShots = 0.1; // time between burst shots (fixed)
  const cooldown = def.cooldownTime ?? (def.defName === 'AssaultRifle' ? 0.7 : 0.5);
  const speed = 680; // bullet speed in px/s
  const minRangePx = 1.25 * T; // too close -> bad for ranged
  const isMelee = (def.range || 0) <= 2;
  
  // New stats
  const armorPenetration = def.armorPenetration ?? 0;
  const stoppingPower = def.stoppingPower ?? 0;
  
  return { 
    rangePx, 
    damage, 
    accuracyFn, // Function to get accuracy at specific distance
    burst, 
    warmup, 
    betweenShots, 
    cooldown, 
    speed, 
    minRangePx, 
    isMelee,
    armorPenetration,
    stoppingPower
  };
}

function pickTarget(game: Game, c: Colonist, range: number): Enemy | null {
  // Use CombatManager for intelligent threat prioritization
  const bestTarget = game.combatManager.getBestTarget(c, range);
  
  // Verify line of fire (CombatManager doesn't check this)
  if (bestTarget && hasLineOfFire(game, c, bestTarget)) {
    return bestTarget;
  }
  
  // Fallback to old simple distance-based selection if no threat-based target
  let best: Enemy | null = null; let bestD = Infinity;
  for (const e of game.enemies) {
    const d = Math.hypot(e.x - c.x, e.y - c.y);
    if (d <= range && d < bestD) {
      if (hasLineOfFire(game, c, e)) { best = e; bestD = d; }
    }
  }
  return best;
}

/**
 * Colonist combat update
 * Implements RimWorld-like behavior:
 *  - Ranged: colonist must remain stationary to progress warmup and fire. Any movement resets warmup/burst.
 *  - Melee: discrete swings gated by meleeCd; requires being stationary on that tick to connect.
 *  - Drafted colonists will auto-engage enemies in range
 */
export function updateColonistCombat(game: Game, c: Colonist, dt: number) {
  if (!c.alive || c.inside) return;
  
  // Only engage in combat if drafted or inCombat flag is set
  const shouldEngage = c.isDrafted || (c as any).inCombat;
  if (!shouldEngage) {
    // Clear aim data when not in combat
    c.aimTarget = null;
    c.aimAngle = undefined;
    c.isAiming = false;
    return;
  }
  
  // Set isAiming flag for drafted colonists (even without target, they're ready to shoot)
  if (c.isDrafted) {
    c.isAiming = true;
  }
  
  const stats = getWeaponStats(c);

  // Track last position for stationary fire requirement (RimWorld style: must stand still to shoot)
  const movedDist = (() => {
    const lp = (c as any)._lastPos || { x: c.x, y: c.y };
    const d = Math.hypot(c.x - lp.x, c.y - lp.y);
    (c as any)._lastPos = { x: c.x, y: c.y };
    return d;
  })();
  const movedThisTick = movedDist > 0.5; // small threshold to ignore tiny jitter

  // Melee fallback when no weapon or melee weapon (still requires cooldown; movement does not block melee like ranged)
  if (!stats || stats.isMelee) {
    // Find nearest enemy within melee reach
    const T = 32;
    const reach = 1.3 * T + c.r;
    let target: Enemy | null = null; let bestD = Infinity;
    
    // If drafted with specific target, prefer that target
    if (c.isDrafted && c.draftedTarget) {
      const dTarget = c.draftedTarget as any;
      if (dTarget.hp > 0 && dTarget.alive !== false) {
        const d = Math.hypot(dTarget.x - c.x, dTarget.y - c.y);
        if (d <= reach) {
          target = dTarget;
          bestD = d;
        }
      }
    }
    
    // Otherwise find nearest enemy
    if (!target) {
      for (const e of game.enemies) {
        const d = Math.hypot(e.x - c.x, e.y - c.y);
        if (d < bestD) { bestD = d; target = e; }
      }
    }
    
    if (target && bestD <= reach) {
      // Set aim data for weapon rotation and sprite facing
      c.aimTarget = { x: target.x, y: target.y };
      c.aimAngle = Math.atan2(target.y - c.y, target.x - c.x);
      c.isAiming = true;
      
      // Check if another colonist is already in melee range of this target (prevent stacking)
      const otherColonistInMelee = game.colonists.some((other: Colonist) => {
        if (other === c || !other.alive || other.inside) return false;
        const otherDist = Math.hypot(target!.x - other.x, target!.y - other.y);
        const otherReach = 1.3 * T + other.r;
        return otherDist <= otherReach;
      });
      
      if (otherColonistInMelee) {
        // Another colonist is already engaging this target, don't stack
        return;
      }
      
      // Require being mostly stationary to land a melee blow (aligning with RimWorld style stop & swing)
      if (movedThisTick) return;
      // Simple melee cooldown on colonist
      (c as any).meleeCd = Math.max(0, ((c as any).meleeCd || 0) - dt);
      if (((c as any).meleeCd || 0) <= 0) {
        const meleeLvl = c.skills ? skillLevel(c, 'Melee') : 0;
        const weaponDef = stats ? itemDatabase.getItemDef((c.inventory?.equipment?.weapon as any)?.defName) : null;
        
        // Determine animation type based on weapon
        const weaponDefName = c.inventory?.equipment?.weapon?.defName;
        if (weaponDefName === 'Knife') {
          c.meleeAttackType = 'stab';
        } else {
          c.meleeAttackType = 'swing'; // Club and other weapons use swing
        }
        c.meleeAttackProgress = 0; // Start animation
        
        // Calculate hit chance based on weapon and skill
        const baseHitChance = weaponDef?.meleeHitChance ?? 0.75; // Default 75% if not specified
        const skillBonus = meleeLvl * 0.02; // 2% per skill level
        const hitChance = Math.min(0.98, baseHitChance + skillBonus);
        
        // Check if hit lands
        if (Math.random() > hitChance) {
          // Miss!
          (c as any).meleeCd = 0.8; // attack every 0.8s
          return;
        }
        
        const dmg = Math.round((stats?.damage || 10) * (1 + meleeLvl * 0.03));
        
        // Determine damage type from weapon
        const damageType = weaponDef?.damageType === 'blunt' ? 'bruise' : 'cut';
        
        // Check if hitting a colonist (friendly fire in melee)
        const isColonist = (game.colonists as any[]).includes(target);
        if (isColonist) {
          const meleeType = stats?.isMelee ? damageType : 'bruise';
          (game as any).applyDamageToColonist(target, dmg, meleeType);
        } else {
          // Regular enemy damage
          target.hp -= dmg;
          
          // Check for stun on blunt damage
          if (damageType === 'bruise' && weaponDef?.stunChance) {
            if (Math.random() < weaponDef.stunChance) {
              // Stun the enemy for 1.5 seconds (reduce speed to near zero)
              (target as any).stunnedUntil = performance.now() / 1000 + 1.5;
            }
          }
        }
        
        // Play melee impact sound
        const impactAudioKey = getWeaponAudioByDefName(itemDatabase, weaponDefName, false);
        if (impactAudioKey) {
          game.playAudio(impactAudioKey, { 
            volume: 0.85, 
            rng: Math.random,
            position: { x: c.x, y: c.y },
            listenerPosition: { x: game.camera.x + game.canvas.width / (2 * game.camera.zoom), y: game.camera.y + game.canvas.height / (2 * game.camera.zoom) }
          });
        }
        
        // XP for landing a melee hit
        if (c.skills) grantSkillXP(c, 'Melee', 18, (c as any).t || 0);
        (c as any).meleeCd = 0.8; // attack every 0.8s
      }
    } else {
      // No target in melee range - clear aim data unless drafted
      if (!c.isDrafted) {
        c.aimTarget = null;
        c.aimAngle = undefined;
        c.isAiming = false;
      }
    }
    return;
  }

  // Ranged combat (requires being stationary to progress warmup or fire)
  (c as any).fireCooldown = Math.max(0, ((c as any).fireCooldown || 0) - dt);
  (c as any).betweenShots = Math.max(0, ((c as any).betweenShots || 0) - dt);
  (c as any).warmup = Math.max(0, ((c as any).warmup || 0) - dt);

  let target: Enemy | null = (c as any).combatTarget || null;
  
  // If drafted with specific target, use that
  if (c.isDrafted && c.draftedTarget) {
    const dTarget = c.draftedTarget as any;
    if (dTarget.hp > 0 && dTarget.alive !== false) {
      target = dTarget;
      (c as any).combatTarget = target;
      // Start warmup if we acquired a new target
      if (target && target !== (c as any).combatTarget) {
        (c as any).warmup = stats.warmup;
      }
    } else {
      // Assigned target is dead, clear it
      c.draftedTarget = null;
      target = null;
    }
  }
  
  // Otherwise auto-acquire target
  if (!target || target.hp <= 0) {
    target = pickTarget(game, c, stats.rangePx);
    (c as any).combatTarget = target;
    // Start warmup if we acquired a new target
    if (target) (c as any).warmup = stats.warmup;
  }
  
  // Update aim tracking for weapon rendering
  if (target) {
    c.aimTarget = { x: target.x, y: target.y };
    c.aimAngle = Math.atan2(target.y - c.y, target.x - c.x);
    c.isAiming = true;
  } else {
    // Clear aim target when no enemy, but keep isAiming true if drafted
    // This ensures drafted colonists still display their weapons
    c.aimTarget = null;
    c.aimAngle = undefined;
    if (!c.isDrafted) {
      c.isAiming = false;
    }
    // If drafted, isAiming stays true (set earlier at line 380)
  }
  
  if (!target) return;

  const dist = Math.hypot(target.x - c.x, target.y - c.y);
  if (dist > stats.rangePx * 1.1) { (c as any).combatTarget = null; return; }

  // Too close for ranged? Switch to a quick melee strike
  if (dist <= stats.minRangePx) {
    (c as any).meleeCd = Math.max(0, ((c as any).meleeCd || 0) - dt);
    if (((c as any).meleeCd || 0) <= 0) {
      // Trigger melee animation for gun bash (always swing)
      c.meleeAttackType = 'swing';
      c.meleeAttackProgress = 0;
      
      const meleeDmg = Math.max(8, Math.round(stats.damage * 0.6));
      
      // Calculate hit chance for gun bash (lower than melee weapon)
      const meleeLvl = c.skills ? skillLevel(c, 'Melee') : 0;
      const baseHitChance = 0.65; // Gun bash is less accurate
      const skillBonus = meleeLvl * 0.02;
      const hitChance = Math.min(0.95, baseHitChance + skillBonus);
      
      // Check if hit lands
      if (Math.random() > hitChance) {
        // Miss!
        (c as any).meleeCd = 0.9;
        return;
      }
      
      // Check if hitting a colonist (friendly fire)
      const isColonist = (game.colonists as any[]).includes(target);
      if (isColonist) {
        (game as any).applyDamageToColonist(target, meleeDmg, 'bruise');
      } else {
        // Regular enemy damage
        target.hp -= meleeDmg;
      }
      
      // Play gun-bash impact sound (blunt impact)
      const bashAudioKey = getWeaponAudioByDefName(itemDatabase, undefined, false);
      if (bashAudioKey) {
        game.playAudio(bashAudioKey, { 
          volume: 0.8, 
          rng: Math.random,
          position: { x: c.x, y: c.y },
          listenerPosition: { x: game.camera.x + game.canvas.width / (2 * game.camera.zoom), y: game.camera.y + game.canvas.height / (2 * game.camera.zoom) }
        });
      }
      
      (c as any).meleeCd = 0.9;
      // Small cooldown before resuming ranged
      (c as any).fireCooldown = Math.max((c as any).fireCooldown || 0, 0.3);
    }
    return;
  }

  // If the pawn moved, reset warmup & burst (simulates needing to stop to aim)
  if (movedThisTick) {
    // Cancel current burst and reset warmup so the colonist must aim again when stopping
    (c as any).burstLeft = 0;
    // Only reset warmup if we were already warming up or readying; give a small penalty
    (c as any).warmup = Math.max((c as any).warmup || 0, stats.warmup * 0.6);
    return;
  }

  // Wait for warmup (only counts down if stationary which we already enforced above)
  if (((c as any).warmup || 0) > 0) return;

  // Handle bursts
  if ((c as any).burstLeft == null || (c as any).burstLeft <= 0) {
    // Can we start a new burst?
    if (((c as any).fireCooldown || 0) > 0) return;
    (c as any).burstLeft = stats.burst;
  }

  if (((c as any).betweenShots || 0) > 0) return;

  // Fire one shot in burst
  // Use distance-based accuracy interpolation
  // Shooting skill influences accuracy
  const shootLvl = c.skills ? skillLevel(c, 'Shooting') : 0;
  const weaponAcc = stats.accuracyFn(dist); // Get accuracy at current distance
  const baseAcc = Math.min(0.98, weaponAcc * (1 + shootLvl * 0.02));
  const cover = coverPenalty(game, c, target);
  const acc = Math.max(0.1, baseAcc * (1 - cover));
  
  // Roll for hit/miss - if miss, the shot goes wild
  const hitRoll = Math.random();
  const ang = Math.atan2(target.y - c.y, target.x - c.x);
  let ax: number, ay: number;
  
  if (hitRoll <= acc) {
    // Hit! Aim directly at target with minor spread
    const minorSpread = (1 - acc) * 5 * (Math.PI / 180); // Small spread even on hits
    const aimAng = ang + (Math.random() - 0.5) * minorSpread;
    ax = c.x + Math.cos(aimAng) * dist;
    ay = c.y + Math.sin(aimAng) * dist;
  } else {
    // Miss! Shot goes wide
    const missSpread = 35 * (Math.PI / 180); // 35 degree cone for misses
    const aimAng = ang + (Math.random() - 0.5) * missSpread;
    // Miss shots travel past the target
    const missDist = dist * (1.2 + Math.random() * 0.8); // 120-200% of target distance
    ax = c.x + Math.cos(aimAng) * missDist;
    ay = c.y + Math.sin(aimAng) * missDist;
  }

  // Simple friendly-fire avoidance: skip shot if a colonist is in the line
  if (willHitFriendly(game, c, { x: ax, y: ay }, c)) {
    (c as any).betweenShots = Math.max((c as any).betweenShots || 0, 0.15);
    return;
  }

  const bullet: any = {
    x: c.x, y: c.y, tx: ax, ty: ay,
    t: 0.12,
    speed: stats.speed,
    dmg: Math.round(stats.damage * (1 + shootLvl * 0.02)),
    life: 0,
    maxLife: Math.max(0.12, dist / stats.speed + 0.12),
    owner: 'colonist',
    shooterId: (c as any).id || ((c as any).id = `colonist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`),
    armorPenetration: stats.armorPenetration || 0,
    stoppingPower: stats.stoppingPower || 0
  };
  const dx = ax - c.x, dy = ay - c.y; const L = Math.hypot(dx, dy) || 1;
  bullet.vx = (dx / L) * stats.speed;
  bullet.vy = (dy / L) * stats.speed;
  bullet.particles = createProjectileTrail(bullet);
  game.bullets.push(bullet);
  const muzzle = createMuzzleFlash(c.x, c.y, ang);
  game.particles.push(...muzzle);

  // Play weapon fire sound
  const weaponDefName = c.inventory?.equipment?.weapon?.defName;
  const fireAudioKey = getWeaponAudioByDefName(itemDatabase, weaponDefName, true);
  if (fireAudioKey) {
    game.playAudio(fireAudioKey, { 
      volume: 0.9, 
      rng: Math.random,
      position: { x: c.x, y: c.y },
      listenerPosition: { x: game.camera.x + game.canvas.width / (2 * game.camera.zoom), y: game.camera.y + game.canvas.height / (2 * game.camera.zoom) }
    });
  }

  (c as any).burstLeft -= 1;
  (c as any).betweenShots = stats.betweenShots;
  if ((c as any).burstLeft <= 0) {
    (c as any).fireCooldown = stats.cooldown;
    (c as any).combatTarget = null; // reacquire to allow target swapping
  }

  // Small XP per shot fired (reward practice even on miss)
  if (c.skills) grantSkillXP(c, 'Shooting', 2.5, (c as any).t || 0);
}
