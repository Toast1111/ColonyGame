import type { Particle } from '../../game/types';

export function createDebris(x: number, y: number, count = 12, color = '#8d8d8d'): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 80 + Math.random() * 120;
    particles.push({
      x: x + (Math.random() - 0.5) * 6,
      y: y + (Math.random() - 0.5) * 6,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 0.5 + Math.random() * 0.4,
      maxLife: 0.5 + Math.random() * 0.4,
      size: 1.2 + Math.random() * 1.3,
      color,
      alpha: 0.85
    });
  }
  return particles;
}
