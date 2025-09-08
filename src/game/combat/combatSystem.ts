import type { Game } from "../Game";
import type { Building, Bullet, Enemy } from "../types";
import { createMuzzleFlash, createProjectileTrail, createImpactEffect, createSparks, createDebris, createSmokeCloud, updateParticles } from "../../core/particles";
import { hasLineOfFire as hasLoF, lineIntersectsRect } from "./utils";
import { dist2 } from "../../core/utils";
import { applyDamageToEnemy } from "./damage";
import { T, COLORS } from "../constants";

// Intersection helpers provided by utils

// hasLineOfFire now comes from utils

function pickTarget(game: Game, origin: { x: number; y: number }, range: number): Enemy | null {
  let best: Enemy | null = null, bestD = Infinity;
  for (const e of game.enemies) {
    const d = Math.hypot(e.x - origin.x, e.y - origin.y);
    if (d <= range && d < bestD) {
      // Prefer line of sight targets
  if (hasLoF(game, origin, e)) {
        best = e; bestD = d;
      }
    }
  }
  return best;
}

export function updateTurret(game: Game, b: Building, dt: number) {
  if (!('range' in b) || !(b as any).range) return;
  (b as any).cooldown = Math.max(0, ((b as any).cooldown || 0) - dt);
  (b as any).warmup = Math.max(0, ((b as any).warmup || 0) - dt);

  // Update flash timer
  if ('flashTimer' in b) {
    (b as any).flashTimer = Math.max(0, ((b as any).flashTimer || 0) - dt);
  }

  const bc = game.centerOf(b);
  const range = (b as any).range || 160;
  const fireRate = (b as any).fireRate || 0.6;
  const dps = (b as any).dps || 12;

  // Target persistence to reduce thrashing
  let target: Enemy | null = (b as any).target || null;
  if (!target || target.hp <= 0 || Math.hypot(target.x - bc.x, target.y - bc.y) > range || !hasLoF(game, bc, target)) {
    target = pickTarget(game, bc, range);
    (b as any).target = target || null;
    if (target) {
      (b as any).warmup = (b as any).warmupTime ?? 0.4;
      (b as any).warmupTotal = (b as any).warmup;
    }
  }
  if (!target) return;

  // Track facing angle towards target for rendering
  (b as any).angle = Math.atan2(target.y - bc.y, target.x - bc.x);

  // Wait for warmup before firing
  if (((b as any).warmup || 0) > 0) return;

  if (((b as any).cooldown || 0) <= 0) {
    // Accuracy model: closer = more accurate; base 75% at mid-range
    const dist = Math.hypot(target.x - bc.x, target.y - bc.y);
    const accuracy = Math.max(0.35, Math.min(0.95, 0.85 - (dist / range) * 0.3));
    // Aim point with inaccuracy
    const ang = Math.atan2(target.y - bc.y, target.x - bc.x);
    const spread = (1 - accuracy) * 18; // degrees
    const spreadRad = (spread * Math.PI) / 180;
    const jitter = (Math.random() - 0.5) * spreadRad;
    const aimAng = ang + jitter;
    const aimDist = dist; // aim at current target pos
    const ax = bc.x + Math.cos(aimAng) * aimDist;
    const ay = bc.y + Math.sin(aimAng) * aimDist;

    // Create a fast projectile
    const bullet: Bullet & { kind?: string } = {
      x: bc.x, y: bc.y,
      tx: ax, ty: ay,
      t: 0.12,
      speed: 700,
      dmg: dps, // apply per shot (approximate RimWorld burst by fireRate)
      life: 0,
      maxLife: Math.max(0.12, dist / 700 + 0.1),
      owner: 'turret',
      kind: 'turret'
    };
    // Compute velocity toward aim
    const dx = ax - bc.x, dy = ay - bc.y; const L = Math.hypot(dx, dy) || 1;
    bullet.vx = (dx / L) * (bullet.speed as number);
    bullet.vy = (dy / L) * (bullet.speed as number);
  (bullet as any).particles = createProjectileTrail(bullet as any);
    game.bullets.push(bullet);

    // Muzzle flash
  const muzzleFlash = createMuzzleFlash(bc.x, bc.y, ang, 'turret');
    game.particles.push(...muzzleFlash);
  (b as any).flashTimer = 0.08;
  (b as any).cooldown = fireRate;
  (b as any).cooldownTotal = fireRate;
  }
}

function debrisColorForBuilding(b: Building): string {
  switch (b.kind) {
    case 'wall': return COLORS.wall;
    case 'house': return COLORS.wood;
    case 'turret': return COLORS.metal;
    case 'warehouse': return COLORS.metal;
    case 'stock': return COLORS.metal;
    case 'path': return '#475569';
    case 'farm': return COLORS.ground;
    case 'infirmary': return b.color || COLORS.bld;
    case 'tent': return b.color || COLORS.tent;
    case 'hq': return b.color || COLORS.bld;
    default: return b.color || '#8d8d8d';
  }
}

function destroyBuildingIfDead(game: Game, b: Building) {
  if (b.hp > 0) return;
  if (b.kind === 'hq') { game.lose(); return; }
  // Evict and remove
  (game as any).evictColonistsFrom && (game as any).evictColonistsFrom(b);
  const idx = (game.buildings as Building[]).indexOf(b);
  if (idx >= 0) (game.buildings as Building[]).splice(idx, 1);
  game.msg(((b as any).name || b.kind) + ' destroyed', 'warn');
  // Rebuild navigation as the obstruction changed
  (game as any).rebuildNavGrid && (game as any).rebuildNavGrid();
}

function explodeAt(game: Game, x: number, y: number, baseDamage: number, radiusTiles = 2.0) {
  const radius = radiusTiles * T;
  // Particles: core smoke handled by caller if desired; here we can add extra debris from nearby structures
  // Damage enemies with falloff and small knockback
  for (const e of game.enemies) {
    const dx = e.x - x, dy = e.y - y; const d = Math.hypot(dx, dy);
    if (d > radius) continue;
    const falloff = 1 - (d / radius);
    const dmg = Math.max(1, Math.round(baseDamage * (0.4 + 0.6 * falloff)));
    applyDamageToEnemy(e, dmg);
    // Knockback
    if (d > 1) {
      const kb = 18 * falloff; // pixels
      const nx = dx / d, ny = dy / d;
      e.x += nx * kb; e.y += ny * kb;
    }
  }

  // Damage colonists (friendly fire) with armor consideration and knockback
  for (const c of game.colonists) {
    if (!c.alive) continue;
    const dx = c.x - x, dy = c.y - y; const d = Math.hypot(dx, dy);
    if (d > radius) continue;
    const falloff = 1 - (d / radius);
    const dmg = Math.max(1, Math.round(baseDamage * 0.35 * (0.4 + 0.6 * falloff)));
    // Use game's armor-aware function
    (game as any).applyDamageToColonist ? (game as any).applyDamageToColonist(c, dmg) : (c.hp = Math.max(0, c.hp - dmg));
    if (d > 1) {
      const kb = 16 * falloff;
      const nx = dx / d, ny = dy / d;
      c.x += nx * kb; c.y += ny * kb;
    }
  }

  // Damage buildings (reduced vs. pawns); walls take near-full
  for (const b of game.buildings.slice()) {
    if (!b.done) continue;
    // Ignore low-impact structures like paths and farms for HP damage
    if (b.kind === 'path' || b.kind === 'farm') continue;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const dx = cx - x, dy = cy - y; const d = Math.hypot(dx, dy);
    if (d > radius + Math.max(b.w, b.h) * 0.5) continue;
    const nearest = Math.max(0, d - Math.min(b.w, b.h) * 0.5); // distance to rect approx
    if (nearest > radius) continue;
    const falloff = 1 - (nearest / radius);
    const factor = (b.kind === 'wall') ? 0.95 : 0.6;
    const dmg = Math.max(1, Math.round(baseDamage * factor * (0.4 + 0.6 * falloff)));
    b.hp -= dmg;
    destroyBuildingIfDead(game, b);
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
      let hitBlocked = false; let hitBuilding: Building | null = null;
      for (const bl of game.buildings) {
        if (bl.kind === 'hq' || bl.kind === 'path' || bl.kind === 'house' || bl.kind === 'farm' || !bl.done) continue;
        // If projectile originates inside this building (e.g., fired from a turret), ignore this building for this step
        const prevInside = prevX >= bl.x && prevX <= bl.x + bl.w && prevY >= bl.y && prevY <= bl.y + bl.h;
        if (prevInside) continue;
        if (lineIntersectsRect(prevX, prevY, b.x, b.y, bl)) { hitBlocked = true; hitBuilding = bl; break; }
      }

      // Collision with enemies
      let hitEnemy: Enemy | null = null;
      if (!hitBlocked) {
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
      }

      if (hitEnemy) {
        const dmg = Math.max(1, Math.round((b.dmg || 10)));
        const kind = ((b as any).kind || 'rifle') as any;
        if (kind === 'rocket') {
          // Rocket: explode instead of single-target damage
          const power = Math.max(dmg, 60);
          game.particles.push(...createImpactEffect(hitEnemy.x, hitEnemy.y, kind, Math.min(2, power / 60)));
          game.particles.push(...createSmokeCloud(hitEnemy.x, hitEnemy.y, 32, 30));
          explodeAt(game, hitEnemy.x, hitEnemy.y, power, 2.2);
        } else {
          applyDamageToEnemy(hitEnemy, dmg);
          const impact = createImpactEffect(hitEnemy.x, hitEnemy.y, kind, Math.min(2, (b.dmg || 10) / 20));
          game.particles.push(...impact);
          // Extra sparks for high rate-of-fire weapons
          if (kind === 'minigun') {
            game.particles.push(...createSparks(hitEnemy.x, hitEnemy.y, Math.atan2((b as any).vy || 0, (b as any).vx || 1), 12, 200));
          }
        }
        game.bullets.splice(i, 1);
        continue;
      }

      if (hitBlocked || (b.maxLife != null && (b.life as number) >= b.maxLife)) {
        const kind = ((b as any).kind || 'rifle') as any;
        if (kind === 'rocket') {
          const power = Math.max((b.dmg || 60), 60);
          game.particles.push(...createImpactEffect(b.x, b.y, kind, Math.min(2, power / 60)));
          game.particles.push(...createSmokeCloud(b.x, b.y, 32, 30));
          if (hitBuilding) {
            game.particles.push(...createDebris(b.x, b.y, 22, debrisColorForBuilding(hitBuilding)));
          }
          explodeAt(game, b.x, b.y, power, 2.2);
        } else {
          const impact = createImpactEffect(b.x, b.y, kind, Math.min(2, (b.dmg || 10) / 20));
          game.particles.push(...impact);
          // Debris when hitting walls/structures
          if (hitBuilding) {
            game.particles.push(...createDebris(b.x, b.y, 10, debrisColorForBuilding(hitBuilding)));
          }
        }
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
