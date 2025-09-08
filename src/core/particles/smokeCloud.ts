import type { Particle } from '../../game/types';

export function createSmokeCloud(x: number, y: number, radius = 18, density = 18): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < density; i++) {
    const ang = Math.random() * Math.PI * 2;
    const r = Math.random() * radius;
    const px = x + Math.cos(ang) * r;
    const py = y + Math.sin(ang) * r;
    const outward = Math.random() * 40 + 20;
    const vx = Math.cos(ang) * outward * 0.6;
    const vy = Math.sin(ang) * outward * 0.6;
    const shades = ['#eeeeee', '#e0e0e0', '#cccccc', '#bbbbbb'];
    const color = shades[Math.floor(Math.random() * shades.length)];
    const life = 0.6 + Math.random() * 0.8;
    particles.push({ x: px, y: py, vx, vy, life, maxLife: life, size: 2.2 + Math.random() * 2.8, color, alpha: 0.5 });
  }
  return particles;
}
