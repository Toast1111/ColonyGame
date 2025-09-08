import type { Particle } from '../../game/types';

export function createSparks(x: number, y: number, angle: number, count = 10, speed = 160): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const spread = 1.4;
    const ang = angle + (Math.random() - 0.5) * spread;
    const spd = speed + Math.random() * speed * 0.6;
    const colors = ['#ffd54f', '#ffeb3b', '#fff59d', '#ffffff'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles.push({
      x: x + (Math.random() - 0.5) * 4,
      y: y + (Math.random() - 0.5) * 4,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 0.18 + Math.random() * 0.12,
      maxLife: 0.18 + Math.random() * 0.12,
      size: 0.9 + Math.random() * 0.6,
      color, alpha: 0.95
    });
  }
  return particles;
}
