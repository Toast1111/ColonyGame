import type { Particle } from '../../game/types';

export function createMuzzleFlash(x: number, y: number, angle: number): Particle[] {
  const particles: Particle[] = [];
  const numParticles = 12 + Math.floor(Math.random() * 6);
  for (let i = 0; i < numParticles; i++) {
    const spread = 1.2;
    const particleAngle = angle + (Math.random() - 0.5) * spread;
    const speed = 100 + Math.random() * 80;
    const colors = ['#ffeb3b', '#ffc107', '#ff9800', '#ff5722', '#fff59d'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles.push({
      x: x + (Math.random() - 0.5) * 6,
      y: y + (Math.random() - 0.5) * 6,
      vx: Math.cos(particleAngle) * speed,
      vy: Math.sin(particleAngle) * speed,
      life: 0.12 + Math.random() * 0.08,
      maxLife: 0.12 + Math.random() * 0.08,
      size: 1.8 + Math.random() * 2,
      color: color,
      alpha: 0.95
    });
  }
  return particles;
}
