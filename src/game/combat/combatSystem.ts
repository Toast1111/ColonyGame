import type { Game } from "../Game";
import type { Building, Bullet, Enemy } from "../types";
import { grantSkillXP } from "../skills/skills";
import { createMuzzleFlash, createProjectileTrail, createImpactEffect, updateParticles } from "../../core/particles";
import { dist2 } from "../../core/utils";
import { getWeaponAudioByDefName } from "../audio/weaponAudioMap";
import { itemDatabase } from "../../data/itemDatabase";

// Simple line-rectangle intersection for cover/obstruction checks
function lineIntersectsRect(x1: number, y1: number, x2: number, y2: number, r: { x: number; y: number; w: number; h: number }): boolean {
  const xMin = r.x, xMax = r.x + r.w;
  const yMin = r.y, yMax = r.y + r.h;
  // Cohen–Sutherland-like trivial accept/reject via segment-box test
  const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
  if (maxX < xMin || minX > xMax || maxY < yMin || minY > yMax) return false;
  // Parametric intersection test with 4 edges
  const intersectsEdge = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) => {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denom === 0) return false;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = ((x1 - x3) * (y1 - y2) - (y1 - y3) * (x1 - x2)) / denom;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  };
  // Check against rectangle edges
  if (intersectsEdge(x1, y1, x2, y2, xMin, yMin, xMax, yMin)) return true;
  if (intersectsEdge(x1, y1, x2, y2, xMax, yMin, xMax, yMax)) return true;
  if (intersectsEdge(x1, y1, x2, y2, xMax, yMax, xMin, yMax)) return true;
  if (intersectsEdge(x1, y1, x2, y2, xMin, yMax, xMin, yMin)) return true;
  return false;
}

function hasLineOfFire(game: Game, from: { x: number; y: number }, to: { x: number; y: number }): boolean {
  for (const b of game.buildings) {
    // Allow shooting through HQ, paths, houses, and farms (soft cover only); block by walls and finished solids
  if (b.kind === 'hq' || b.kind === 'path' || b.kind === 'house' || b.kind === 'farm' || b.kind === 'bed' || !b.done) continue;
    // If the shooter is inside this building (e.g., a turret), ignore this rectangle for LoS
    const fromInside = from.x >= b.x && from.x <= b.x + b.w && from.y >= b.y && from.y <= b.y + b.h;
    if (fromInside) continue;
    if (lineIntersectsRect(from.x, from.y, to.x, to.y, b)) return false;
  }
  return true;
}

function pickTarget(game: Game, origin: { x: number; y: number }, range: number): Enemy | null {
  let best: Enemy | null = null, bestD = Infinity;
  for (const e of game.enemies) {
    const d = Math.hypot(e.x - origin.x, e.y - origin.y);
    if (d <= range && d < bestD) {
      // Prefer line of sight targets
      if (hasLineOfFire(game, origin, e)) {
        best = e; bestD = d;
      }
    }
  }
  return best;
}

export function updateTurret(game: Game, b: Building, dt: number) {
  if (!('range' in b) || !(b as any).range) return;
  
  // Initialize turret state
  if (!(b as any).turretState) {
    (b as any).turretState = {
      cooldown: 0,
      flashTimer: 0,
      target: null,
      currentBurst: 0,
      burstDelay: 0,
      rotation: 0  // Angle in radians toward target
    };
  }
  
  const state = (b as any).turretState;
  const bc = game.centerOf(b);
  
  // Get turret weapon stats from itemDatabase
  const weaponDefName = (b as any).weaponDefName || 'TurretGun';
  const weaponDef = itemDatabase.getItemDef(weaponDefName);
  
  if (!weaponDef) {
    console.warn(`Turret weapon "${weaponDefName}" not found in itemDatabase`);
    return;
  }
  
  const range = (b as any).range || 924.8; // 28.9 tiles
  const burstCount = weaponDef.burstCount || 2;
  const cooldownSeconds = weaponDef.cooldownTicks ? (weaponDef.cooldownTicks / 30) : 4.8; // Convert RimWorld ticks to game seconds
  const damage = weaponDef.damage || 30;
  const armorPenetration = weaponDef.armorPenetration || 0.20;
  const stoppingPower = weaponDef.stoppingPower || 1.0;
  const burstDelaySeconds = 0.1; // 0.1 second between burst shots
  
  // Update timers
  state.cooldown = Math.max(0, state.cooldown - dt);
  state.flashTimer = Math.max(0, state.flashTimer - dt);
  state.burstDelay = Math.max(0, state.burstDelay - dt);
  
  // Target acquisition
  let target: Enemy | null = state.target;
  if (!target || target.hp <= 0 || Math.hypot(target.x - bc.x, target.y - bc.y) > range || !hasLineOfFire(game, bc, target)) {
    target = pickTarget(game, bc, range);
    state.target = target || null;
  }
  if (!target) return;
  
  // Update rotation to face target
  state.rotation = Math.atan2(target.y - bc.y, target.x - bc.x);
  
  // Handle burst firing
  if (state.currentBurst > 0) {
    // Still firing burst
    if (state.burstDelay <= 0) {
      fireTurretShot(game, b, bc, target, state, weaponDef, damage, armorPenetration, stoppingPower, range);
      state.currentBurst--;
      state.burstDelay = burstDelaySeconds;
      
      if (state.currentBurst === 0) {
        // Burst complete, start cooldown
        state.cooldown = cooldownSeconds;
      }
    }
  } else if (state.cooldown <= 0) {
    // Ready to start new burst
    state.currentBurst = burstCount;
    state.burstDelay = 0; // Fire first shot immediately
  }
}

function fireTurretShot(
  game: Game, 
  b: Building, 
  bc: { x: number; y: number }, 
  target: Enemy, 
  state: any,
  weaponDef: any,
  damage: number,
  armorPenetration: number,
  stoppingPower: number,
  range: number
) {
  const dist = Math.hypot(target.x - bc.x, target.y - bc.y);
  const distTiles = dist / 32; // Convert pixels to tiles
  
  // Calculate accuracy based on distance
  // Interpolate between accuracy ranges
  let baseAccuracy = 0.96; // Default
  if (distTiles <= 3) {
    baseAccuracy = weaponDef.accuracyTouch || 0.96;
  } else if (distTiles <= 12) {
    // Interpolate between touch and short
    const t = (distTiles - 3) / (12 - 3);
    const accTouch = weaponDef.accuracyTouch || 0.96;
    const accShort = weaponDef.accuracyShort || 0.96;
    baseAccuracy = accTouch + (accShort - accTouch) * t;
  } else if (distTiles <= 25) {
    // Interpolate between short and medium
    const t = (distTiles - 12) / (25 - 12);
    const accShort = weaponDef.accuracyShort || 0.96;
    const accMedium = weaponDef.accuracyMedium || 0.96;
    baseAccuracy = accShort + (accMedium - accShort) * t;
  } else if (distTiles <= 40) {
    // Interpolate between medium and long
    const t = (distTiles - 25) / (40 - 25);
    const accMedium = weaponDef.accuracyMedium || 0.96;
    const accLong = weaponDef.accuracyLong || 0.96;
    baseAccuracy = accMedium + (accLong - accMedium) * t;
  } else {
    baseAccuracy = weaponDef.accuracyLong || 0.96;
  }
  
  // Per-tile accuracy penalty (shooting skill 8 equivalent already in base accuracy)
  const finalAccuracy = Math.max(0.1, Math.min(0.99, baseAccuracy));
  
  // Roll for hit/miss
  const hitRoll = Math.random();
  const ang = state.rotation;
  let ax: number, ay: number;
  let targetPawn: Enemy | undefined = undefined;
  
  if (hitRoll <= finalAccuracy) {
    // Hit! Aim at target with minor spread
    const minorSpread = (1 - finalAccuracy) * 5; // degrees
    const spreadRad = (minorSpread * Math.PI) / 180;
    const jitter = (Math.random() - 0.5) * spreadRad;
    const aimAng = ang + jitter;
    ax = target.x + (Math.random() - 0.5) * 10; // Small spread on target
    ay = target.y + (Math.random() - 0.5) * 10;
    targetPawn = target; // Mark for damage application
  } else {
    // Miss! Shot goes wide
    const missSpread = 35; // degrees
    const spreadRad = (missSpread * Math.PI) / 180;
    const jitter = (Math.random() - 0.5) * spreadRad;
    const aimAng = ang + jitter;
    const missDist = dist * (1.2 + Math.random() * 0.8); // 120-200% of target distance
    ax = bc.x + Math.cos(aimAng) * missDist;
    ay = bc.y + Math.sin(aimAng) * missDist;
  }
  
  // Create projectile
  const bullet: Bullet = {
    x: bc.x, y: bc.y,
    tx: ax, ty: ay,
    t: 0.08,
    speed: 850, // Fast turret rounds
    dmg: damage,
    life: 0,
    maxLife: Math.max(0.08, dist / 850 + 0.15),
    owner: 'turret',
    armorPenetration: armorPenetration,
    stoppingPower: stoppingPower,
    targetPawn: targetPawn // For friendly fire tracking
  };
  
  // Compute velocity
  const dx = ax - bc.x, dy = ay - bc.y;
  const L = Math.hypot(dx, dy) || 1;
  bullet.vx = (dx / L) * (bullet.speed as number);
  bullet.vy = (dy / L) * (bullet.speed as number);
  (bullet as any).particles = createProjectileTrail(bullet);
  game.bullets.push(bullet);
  
  // Muzzle flash
  const muzzleFlash = createMuzzleFlash(bc.x, bc.y, ang);
  game.particles.push(...muzzleFlash);
  state.flashTimer = 0.15; // Longer flash for visibility
  
  // Play turret fire sound
  const turretAudioKey = getWeaponAudioByDefName(itemDatabase, weaponDef.defName, true);
  if (turretAudioKey) {
    game.playAudio(turretAudioKey, { 
      volume: 0.75, 
      rng: Math.random,
      position: { x: b.x + b.w / 2, y: b.y + b.h / 2 },
      listenerPosition: game.audioManager.getListenerPosition()
    });
  }
}

export function updateProjectiles(game: Game, dt: number) {
  // Update bullets with ballistic movement, collision, and particles
  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const b = game.bullets[i] as Bullet & { vx?: number; vy?: number; life?: number; maxLife?: number; dmg?: number };

    // Integrate position
    if (b.vx != null && b.vy != null) {
      const prevX = b.x, prevY = b.y;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life = (b.life || 0) + dt;

      // Collision with blocking buildings (cover)
      let hitBlocked = false;
      for (const bl of game.buildings) {
        if (bl.kind === 'hq' || bl.kind === 'path' || bl.kind === 'house' || bl.kind === 'farm' || !bl.done) continue;
        // If projectile originates inside this building (e.g., fired from a turret), ignore this building for this step
        const prevInside = prevX >= bl.x && prevX <= bl.x + bl.w && prevY >= bl.y && prevY <= bl.y + bl.h;
        if (prevInside) continue;
        if (lineIntersectsRect(prevX, prevY, b.x, b.y, bl)) { hitBlocked = true; break; }
      }

      // Collision with enemies
      let hitEnemy: Enemy | null = null;
      let hitColonist: any | null = null;
      
      if (!hitBlocked) {
        // Check enemy collision
        for (const e of game.enemies) {
          // Segment-circle intersection
          const dx = b.x - prevX, dy = b.y - prevY;
          const fx = prevX - e.x, fy = prevY - e.y;
          const a = dx*dx + dy*dy;
          const b2 = 2 * (fx*dx + fy*dy);
          const c = fx*fx + fy*fy - (e.r * e.r);
          let disc = b2*b2 - 4*a*c;
          if (disc >= 0) {
            disc = Math.sqrt(disc);
            const t1 = (-b2 - disc) / (2*a);
            const t2 = (-b2 + disc) / (2*a);
            if ((t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1)) { hitEnemy = e; break; }
          }
        }
        
        // Check colonist collision (friendly fire from turrets)
        if (!hitEnemy && b.owner === 'turret') {
          for (const col of game.colonists) {
            const colRadius = (col as any).r || 12;
            const dx = b.x - prevX, dy = b.y - prevY;
            const fx = prevX - col.x, fy = prevY - col.y;
            const a = dx*dx + dy*dy;
            const b2 = 2 * (fx*dx + fy*dy);
            const c = fx*fx + fy*fy - (colRadius * colRadius);
            let disc = b2*b2 - 4*a*c;
            if (disc >= 0) {
              disc = Math.sqrt(disc);
              const t1 = (-b2 - disc) / (2*a);
              const t2 = (-b2 + disc) / (2*a);
              if ((t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1)) { hitColonist = col; break; }
            }
          }
        }
      }

      if (hitEnemy) {
        let dmg = Math.max(1, Math.round((b.dmg || 10)));
        
        // Apply armor penetration if armor exists
        const ap = (b as any).armorPenetration || 0;
        // Enemies don't have armor yet, but keep the system ready
        
        hitEnemy.hp -= dmg;
        
        // Apply stopping power to enemies
        const sp = (b as any).stoppingPower || 0;
        if (sp >= 1) {
          (hitEnemy as any).staggeredUntil = performance.now() / 1000 + 1.58;
        }
        
        // Shooting XP for the colonist who fired this bullet
        if (b.owner === 'colonist' && (b as any).shooterId) {
          const shooter = game.colonists.find(c => (c as any).id === (b as any).shooterId);
          if (shooter && shooter.skills) {
            grantSkillXP(shooter as any, 'Shooting', 8, (shooter as any).t || 0);
            if (hitEnemy.hp <= 0) {
              grantSkillXP(shooter as any, 'Shooting', 20, (shooter as any).t || 0);
            }
          }
        }
        
        const impact = createImpactEffect(hitEnemy.x, hitEnemy.y);
        game.particles.push(...impact);
        game.bullets.splice(i, 1);
        continue;
      }
      
      if (hitColonist) {
        // Friendly fire!
        let dmg = Math.max(1, Math.round((b.dmg || 10)));
        
        // Apply armor penetration
        const ap = (b as any).armorPenetration || 0;
        const colonist = hitColonist;
        const armorReduction = game.getArmorReduction(colonist);
        const effectiveArmor = Math.max(0, armorReduction - ap);
        dmg = Math.round(dmg * (1 - effectiveArmor));
        
        // Apply damage to colonist (gunshot type)
        game.applyDamageToColonist(colonist, dmg, 'gunshot');
        
        // Apply stopping power (stagger effect)
        const sp = (b as any).stoppingPower || 0;
        if (sp >= 1 && colonist.state !== 'downed') {
          colonist.staggeredUntil = (colonist.t || 0) + 1.58; // 95 ticks at 60fps = 1.58 seconds
        }
        
        // Warning message
        game.msg(`Turret hit ${colonist.profile?.name || 'Colonist'}! Friendly fire!`, 'warn');
        
        const impact = createImpactEffect(colonist.x, colonist.y);
        game.particles.push(...impact);
        game.bullets.splice(i, 1);
        continue;
      }

      if (hitBlocked || (b.maxLife != null && (b.life as number) >= b.maxLife)) {
        const impact = createImpactEffect(b.x, b.y);
        game.particles.push(...impact);
        game.bullets.splice(i, 1);
        continue;
      }
    } else {
      // Legacy timer-based bullet: fallback to old behavior
      (b as any).t -= dt;
      if ((b as any).t <= 0) {
        const impact = createImpactEffect((b as any).tx, (b as any).ty);
        game.particles.push(...impact);
        game.bullets.splice(i, 1);
        continue;
      }
    }

    // Update bullet's own particles
    if ((b as any).particles) {
      (b as any).particles = updateParticles((b as any).particles, dt);
      if ((b as any).particles && (b as any).particles.length === 0) {
        delete (b as any).particles;
      }
    }
  }

  // Update global particles
  game.particles = updateParticles(game.particles, dt);
}
