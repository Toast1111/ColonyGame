import type { Particle } from '../../game/types';
import type { Bullet } from '../../game/types';

export function createProjectileTrail(bullet: Bullet): Particle[] {
  const particles: Particle[] = [];
  const dx = bullet.tx - bullet.x;
  const dy = bullet.ty - bullet.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const numParticles = Math.floor(length / 6) + 3;
  for (let i = 0; i < numParticles; i++) {
    const t = i / (numParticles - 1);
    const x = bullet.x + dx * t;
    const y = bullet.y + dy * t;
    const colors = ['#64b5f6', '#42a5f5', '#29b6f6', '#26c6da', '#80deea'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles.push({
      x: x + (Math.random() - 0.5) * 4,
      y: y + (Math.random() - 0.5) * 4,
      vx: (Math.random() - 0.5) * 30,
      vy: (Math.random() - 0.5) * 30,
      life: 0.4 + Math.random() * 0.3,
      maxLife: 0.4 + Math.random() * 0.3,
      size: 1.0 + Math.random() * 0.6,
      color: color,
      alpha: 0.8
    });
  }
  return particles;
}
