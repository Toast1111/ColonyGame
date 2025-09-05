import type { Game } from "../Game";
import type { Building, Bullet, Enemy } from "../types";
import { createMuzzleFlash, createProjectileTrail, createImpactEffect, updateParticles } from "../../core/particles";
import { dist2 } from "../../core/utils";

export function updateTurret(game: Game, b: Building, dt: number) {
  if (!('range' in b) || !(b as any).range) return;
  (b as any).cooldown = Math.max(0, ((b as any).cooldown || 0) - dt);

  // Update flash timer
  if ('flashTimer' in b) {
    (b as any).flashTimer = Math.max(0, ((b as any).flashTimer || 0) - dt);
  }

  let best: Enemy | null = null, bestD = 1e9;
  const bc = game.centerOf(b);
  for (const e of game.enemies) {
    const d = dist2(e as any, bc as any);
    if (d < (b as any).range * (b as any).range && d < bestD) {
      bestD = d; best = e;
    }
  }
  if (best && (((b as any).cooldown || 0) <= 0)) {
    best.hp -= ((b as any).dps || 0);

    // Create bullet with particle trail
    const bullet: Bullet = { x: bc.x, y: bc.y, tx: best.x, ty: best.y, t: .12 } as Bullet;
    (bullet as any).particles = createProjectileTrail(bullet);
    game.bullets.push(bullet);

    // Create muzzle flash particles
    const angle = Math.atan2(best.y - bc.y, best.x - bc.x);
    const muzzleFlash = createMuzzleFlash(bc.x, bc.y, angle);
    game.particles.push(...muzzleFlash);

    // Add flash effect to turret
    (b as any).flashTimer = 0.08;

    (b as any).cooldown = (b as any).fireRate || 0.6;
  }
}

export function updateProjectiles(game: Game, dt: number) {
  // Update bullets and create impact particles when they expire
  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const b = game.bullets[i];
    (b as any).t -= dt;

    // Update bullet's own particles
    if ((b as any).particles) {
      (b as any).particles = updateParticles((b as any).particles, dt);
      if ((b as any).particles && (b as any).particles.length === 0) {
        delete (b as any).particles;
      }
    }

    if ((b as any).t <= 0) {
      const impact = createImpactEffect((b as any).tx, (b as any).ty);
      game.particles.push(...impact);
      game.bullets.splice(i, 1);
    }
  }

  // Update global particles
  game.particles = updateParticles(game.particles, dt);
}
