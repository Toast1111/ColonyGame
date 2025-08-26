import type { Particle } from '../../game/types';

export function createImpactEffect(x: number, y: number): Particle[] {
  const particles: Particle[] = [];
  const numParticles = 8 + Math.floor(Math.random() * 8);
  for (let i = 0; i < numParticles; i++) {
    const angle = (Math.PI * 2 * i) / numParticles + (Math.random() - 0.5) * 0.8;
    const speed = 50 + Math.random() * 60;
    const colors = ['#ff5722', '#ff7043', '#ffab40', '#ffa726', '#ff8a65'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles.push({
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.25 + Math.random() * 0.2,
      maxLife: 0.25 + Math.random() * 0.2,
      size: 1.2 + Math.random() * 1.2,
      color: color,
      alpha: 0.9
    });
  }
  return particles;
}
