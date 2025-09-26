import type { Game } from "../Game";
import type { Colonist, Enemy } from "../types";
import { itemDatabase } from "../../data/itemDatabase";
import { createMuzzleFlash, createProjectileTrail } from "../../core/particles";

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
    if (b.kind === 'hq' || b.kind === 'path' || b.kind === 'house' || b.kind === 'farm' || !b.done) continue;
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

function coverPenalty(game: Game, from: { x: number; y: number }, to: { x: number; y: number }): number {
  // Approximate RimWorld cover: if a wall is near the target along the line, reduce hit chance
  let penalty = 0;
  for (const b of game.buildings) {
    if (!b.done || b.kind !== 'wall') continue;
    // If the segment passes within ~14px of a wall near the target, apply penalty
    // Compute distance from wall center to the line segment
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const vx = to.x - from.x, vy = to.y - from.y;
    const wx = cx - from.x, wy = cy - from.y;
    const vv = vx*vx + vy*vy || 1;
    const t = Math.max(0, Math.min(1, (wx*vx + wy*vy) / vv));
    const px = from.x + t * vx, py = from.y + t * vy;
    const dist = Math.hypot(px - cx, py - cy);
    // Only consider cover within last 25% of the shot path (near the target)
    if (t > 0.75 && dist < Math.max(12, Math.min(b.w, b.h) * 0.6)) {
      penalty += 0.25; // 25% cover per wall (stacking, capped below)
    }
  }
  return Math.min(0.6, penalty); // cap total cover penalty at 60%
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
  const accuracy = def.accuracy ?? 0.7;
  const burst = def.defName === 'Rifle' ? 3 : 1;
  const warmup = def.defName === 'Rifle' ? 0.6 : 0.4;
  const betweenShots = 0.1; // time between burst shots
  const cooldown = def.defName === 'Rifle' ? 0.7 : 0.5;
  const speed = 680;
  const minRangePx = 1.25 * T; // too close -> bad for ranged
  const isMelee = (def.range || 0) <= 2;
  return { rangePx, damage, accuracy, burst, warmup, betweenShots, cooldown, speed, minRangePx, isMelee };
}

function pickTarget(game: Game, c: Colonist, range: number): Enemy | null {
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
 */
export function updateColonistCombat(game: Game, c: Colonist, dt: number) {
  if (!c.alive || c.inside) return;
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
    for (const e of game.enemies) {
      const d = Math.hypot(e.x - c.x, e.y - c.y);
      if (d < bestD) { bestD = d; target = e; }
    }
    if (target && bestD <= reach) {
      // Require being mostly stationary to land a melee blow (aligning with RimWorld style stop & swing)
      if (movedThisTick) return;
      // Simple melee cooldown on colonist
      (c as any).meleeCd = Math.max(0, ((c as any).meleeCd || 0) - dt);
      if (((c as any).meleeCd || 0) <= 0) {
        const dmg = stats?.damage || 10;
        
        // Check if hitting a colonist (friendly fire in melee)
        const isColonist = (game.colonists as any[]).includes(target);
        if (isColonist) {
          const meleeType = stats?.isMelee ? 'cut' : 'bruise';
          (game as any).applyDamageToColonist(target, dmg, meleeType);
        } else {
          // Regular enemy damage
          target.hp -= dmg;
        }
        
        (c as any).meleeCd = 0.8; // attack every 0.8s
      }
    }
    return;
  }

  // Ranged combat (requires being stationary to progress warmup or fire)
  (c as any).fireCooldown = Math.max(0, ((c as any).fireCooldown || 0) - dt);
  (c as any).betweenShots = Math.max(0, ((c as any).betweenShots || 0) - dt);
  (c as any).warmup = Math.max(0, ((c as any).warmup || 0) - dt);

  let target: Enemy | null = (c as any).combatTarget || null;
  if (!target || target.hp <= 0) {
    target = pickTarget(game, c, stats.rangePx);
    (c as any).combatTarget = target;
    // Start warmup if we acquired a new target
    if (target) (c as any).warmup = stats.warmup;
  }
  if (!target) return;

  const dist = Math.hypot(target.x - c.x, target.y - c.y);
  if (dist > stats.rangePx * 1.1) { (c as any).combatTarget = null; return; }

  // Too close for ranged? Switch to a quick melee strike
  if (dist <= stats.minRangePx) {
    (c as any).meleeCd = Math.max(0, ((c as any).meleeCd || 0) - dt);
    if (((c as any).meleeCd || 0) <= 0) {
      const meleeDmg = Math.max(8, Math.round(stats.damage * 0.6));
      
      // Check if hitting a colonist (friendly fire)
      const isColonist = (game.colonists as any[]).includes(target);
      if (isColonist) {
        (game as any).applyDamageToColonist(target, meleeDmg, 'bruise');
      } else {
        // Regular enemy damage
        target.hp -= meleeDmg;
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
  // Accuracy reduced by distance and cover near target
  const baseAcc = stats.accuracy;
  const distFactor = Math.max(0.5, 1 - (dist / stats.rangePx) * 0.5); // 50% reduction at max range
  const cover = coverPenalty(game, c, target);
  const acc = Math.max(0.1, baseAcc * distFactor * (1 - cover));
  const ang = Math.atan2(target.y - c.y, target.x - c.x);
  const maxSpread = (1 - acc) * 20 * (Math.PI / 180);
  const aimAng = ang + (Math.random() - 0.5) * maxSpread;
  const ax = c.x + Math.cos(aimAng) * dist;
  const ay = c.y + Math.sin(aimAng) * dist;

  // Simple friendly-fire avoidance: skip shot if a colonist is in the line
  if (willHitFriendly(game, c, { x: ax, y: ay }, c)) {
    (c as any).betweenShots = Math.max((c as any).betweenShots || 0, 0.15);
    return;
  }

  const bullet: any = {
    x: c.x, y: c.y, tx: ax, ty: ay,
    t: 0.12,
    speed: stats.speed,
    dmg: stats.damage,
    life: 0,
    maxLife: Math.max(0.12, dist / stats.speed + 0.12),
    owner: 'colonist'
  };
  const dx = ax - c.x, dy = ay - c.y; const L = Math.hypot(dx, dy) || 1;
  bullet.vx = (dx / L) * stats.speed;
  bullet.vy = (dy / L) * stats.speed;
  bullet.particles = createProjectileTrail(bullet);
  game.bullets.push(bullet);
  const muzzle = createMuzzleFlash(c.x, c.y, ang);
  game.particles.push(...muzzle);

  (c as any).burstLeft -= 1;
  (c as any).betweenShots = stats.betweenShots;
  if ((c as any).burstLeft <= 0) {
    (c as any).fireCooldown = stats.cooldown;
    (c as any).combatTarget = null; // reacquire to allow target swapping
  }
}
