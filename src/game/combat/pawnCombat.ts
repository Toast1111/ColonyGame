import type { Game } from "../Game";
import type { Colonist, Enemy } from "../types";
import { itemDatabase } from "../../data/itemDatabase";
import { createMuzzleFlash, createProjectileTrail } from "../../core/particles";
import { hasLineOfFire as hasLoF, segmentIntersectsCircle, coverPenalty } from "./utils";
import { applyDamageToEnemy } from "./damage";

// local shims now replaced by shared utils

function willHitFriendly(game: Game, from: { x: number; y: number }, to: { x: number; y: number }, self: Colonist): boolean {
  for (const f of game.colonists) {
    if (f === self || !f.alive || f.inside) continue;
    const r = (f.r || 8) + 6; // small safety margin
    if (segmentIntersectsCircle(from.x, from.y, to.x, to.y, f.x, f.y, r)) return true;
  }
  return false;
}

// coverPenalty imported

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
  const burst = (def as any).burstCount ?? (def.defName === 'Rifle' ? 3 : 1);
  const warmup = (def as any).warmup ?? (def.defName === 'Rifle' ? 0.6 : 0.4);
  const betweenShots = (def as any).burstSpacing ?? 0.1; // time between burst shots
  const cooldown = (def as any).cooldown ?? (def.defName === 'Rifle' ? 0.7 : 0.5);
  const speed = (def as any).projectileSpeed ?? 680;
  const minRangePx = ((def as any).minRange ?? 1.25) * T; // too close -> bad for ranged
  const isMelee = (def.range || 0) <= 2;
  return { rangePx, damage, accuracy, burst, warmup, betweenShots, cooldown, speed, minRangePx, isMelee };
}

function pickTarget(game: Game, c: Colonist, range: number): Enemy | null {
  let best: Enemy | null = null; let bestD = Infinity;
  for (const e of game.enemies) {
    const d = Math.hypot(e.x - c.x, e.y - c.y);
    if (d <= range && d < bestD) {
  if (hasLoF(game, c, e)) { best = e; bestD = d; }
    }
  }
  return best;
}

export function updateColonistCombat(game: Game, c: Colonist, dt: number) {
  if (!c.alive || c.inside) return;
  const stats = getWeaponStats(c);

  // Melee fallback when no weapon or melee weapon
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
      // Simple melee cooldown on colonist
      (c as any).meleeCd = Math.max(0, ((c as any).meleeCd || 0) - dt);
      if (((c as any).meleeCd || 0) <= 0) {
  const dmg = stats?.damage || 10;
  applyDamageToEnemy(target, dmg);
        (c as any).meleeCd = 0.8; // attack every 0.8s
      }
    }
    return;
  }

  // Ranged combat
  (c as any).fireCooldown = Math.max(0, ((c as any).fireCooldown || 0) - dt);
  (c as any).betweenShots = Math.max(0, ((c as any).betweenShots || 0) - dt);
  (c as any).warmup = Math.max(0, ((c as any).warmup || 0) - dt);

  let target: Enemy | null = (c as any).combatTarget || null;
  if (!target || target.hp <= 0) {
    target = pickTarget(game, c, stats.rangePx);
    (c as any).combatTarget = target;
    // Start warmup if we acquired a new target
    if (target) {
      (c as any).warmup = stats.warmup;
      (c as any).warmupTotal = stats.warmup;
    }
  }
  if (!target) return;

  const dist = Math.hypot(target.x - c.x, target.y - c.y);
  if (dist > stats.rangePx * 1.1) { (c as any).combatTarget = null; return; }

  // Too close for ranged? Switch to a quick melee strike
  if (dist <= stats.minRangePx) {
    (c as any).meleeCd = Math.max(0, ((c as any).meleeCd || 0) - dt);
    if (((c as any).meleeCd || 0) <= 0) {
      const meleeDmg = Math.max(8, Math.round(stats.damage * 0.6));
      target.hp -= meleeDmg;
      (c as any).meleeCd = 0.9;
      // Small cooldown before resuming ranged
      (c as any).fireCooldown = Math.max((c as any).fireCooldown || 0, 0.3);
    }
    return;
  }

  // Face target while aiming or firing
  const faceAng = Math.atan2(target.y - c.y, target.x - c.x);
  (c as any).direction = faceAng;

  // Wait for warmup
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
  // Occupied cover: give target extra cover if a wall is adjacent on shooter-facing side
  let cover = coverPenalty(game, c, target);
  {
    const tx = target.x, ty = target.y;
    const angToShooter = Math.atan2(c.y - ty, c.x - tx);
    const coverRadius = 20;
    for (const b of game.buildings) {
      if (!b.done || b.kind !== 'wall') continue;
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      const d = Math.hypot(cx - tx, cy - ty);
      if (d < coverRadius) {
        const angToWall = Math.atan2(cy - ty, cx - tx);
        const diff = Math.abs(Math.atan2(Math.sin(angToShooter - angToWall), Math.cos(angToShooter - angToWall)));
        if (diff < Math.PI / 3) { cover = Math.min(0.7, cover + 0.2); break; }
      }
    }
  }
  // Movement penalty: harder to shoot while moving
  const moving = (c as any).path && (c as any).pathIndex != null && (c as any).pathIndex < ((c as any).path.length || 0);
  const moveFactor = moving ? 0.75 : 1;
  const acc = Math.max(0.1, baseAcc * distFactor * moveFactor * (1 - cover));
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
  (c as any).cooldownTotal = stats.cooldown;
    (c as any).combatTarget = null; // reacquire to allow target swapping
  }
}
