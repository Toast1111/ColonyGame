import type { Particle } from '../../game/types';
import type { Bullet } from '../../game/types';

export function createProjectileTrail(bullet: Bullet): Particle[] {
  const particles: Particle[] = [];
  const dx = bullet.tx - bullet.x;
  const dy = bullet.ty - bullet.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  const numParticles = Math.floor(length / 8) + 2;
  
  for (let i = 0; i < numParticles; i++) {
    const t = i / (numParticles - 1);
    const x = bullet.x + dx * t;
    const y = bullet.y + dy * t;
    
    // More realistic bullet trail colors (metallic/smoke)
    const colors = ['#c0c0c0', '#a8a8a8', '#909090', '#787878', '#606060'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    // Much tighter spread for realistic bullet trail
    const perpAngle = angle + Math.PI / 2;
    const spread = (Math.random() - 0.5) * 1.5;
    
    particles.push({
      x: x + Math.cos(perpAngle) * spread,
      y: y + Math.sin(perpAngle) * spread,
      // Minimal velocity for a more linear trail
      vx: Math.cos(angle) * 5 + (Math.random() - 0.5) * 8,
      vy: Math.sin(angle) * 5 + (Math.random() - 0.5) * 8,
      life: 0.15 + Math.random() * 0.1,
      maxLife: 0.15 + Math.random() * 0.1,
      size: 0.8 + Math.random() * 0.4,
      color: color,
      alpha: 0.7
    });
  }
  return particles;
}
