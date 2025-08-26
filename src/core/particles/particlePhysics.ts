import type { Particle } from '../../game/types';

export function updateParticles(particles: Particle[], dt: number): Particle[] {
  return particles.filter(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 30 * dt;
    p.vx *= 0.98;
    p.vy *= 0.98;
    p.life -= dt;
    p.alpha = Math.max(0, (p.life / p.maxLife) * 0.8);
    p.size *= 0.995;
    return p.life > 0;
  });
}
