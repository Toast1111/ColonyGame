import type { Particle } from '../../game/types';
import type { Bullet } from '../../game/types';

/**
 * Enhanced projectile trail with vapor trail and heat distortion effect
 */
export function createProjectileTrail(bullet: Bullet): Particle[] {
  const particles: Particle[] = [];
  const dx = bullet.tx - bullet.x;
  const dy = bullet.ty - bullet.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  const numParticles = Math.floor(length / 10) + 3;
  
  for (let i = 0; i < numParticles; i++) {
    const t = i / (numParticles - 1);
    const x = bullet.x + dx * t;
    const y = bullet.y + dy * t;
    
    // Perpendicular angle for spread
    const perpAngle = angle + Math.PI / 2;
    const spread = (Math.random() - 0.5) * 2;
    
    // Mix of smoke trail and vapor
    const isVapor = Math.random() > 0.5;
    
    if (isVapor) {
      // Vapor/heat shimmer (lighter, faster fade)
      const vaporColors = ['#e0e0e0', '#d0d0d0', '#c8c8c8', '#b8b8b8'];
      const color = vaporColors[Math.floor(Math.random() * vaporColors.length)];
      
      particles.push({
        x: x + Math.cos(perpAngle) * spread,
        y: y + Math.sin(perpAngle) * spread,
        vx: Math.cos(angle) * 8 + (Math.random() - 0.5) * 12,
        vy: Math.sin(angle) * 8 + (Math.random() - 0.5) * 12,
        life: 0.12 + Math.random() * 0.08,
        maxLife: 0.12 + Math.random() * 0.08,
        size: 0.6 + Math.random() * 0.6,
        color: color,
        alpha: 0.5,
        type: 'smoke',
        gravity: 0.1,
        drag: 0.96
      });
    } else {
      // Darker smoke trail (gunpowder residue)
      const smokeColors = ['#808080', '#909090', '#787878', '#606060'];
      const color = smokeColors[Math.floor(Math.random() * smokeColors.length)];
      
      particles.push({
        x: x + Math.cos(perpAngle) * spread,
        y: y + Math.sin(perpAngle) * spread,
        vx: Math.cos(angle) * 4 + (Math.random() - 0.5) * 10,
        vy: Math.sin(angle) * 4 + (Math.random() - 0.5) * 10,
        life: 0.18 + Math.random() * 0.12,
        maxLife: 0.18 + Math.random() * 0.12,
        size: 0.9 + Math.random() * 0.7,
        color: color,
        alpha: 0.65,
        type: 'smoke',
        gravity: 0.2,
        drag: 0.95
      });
    }
  }
  
  // Add occasional spark tracer
  if (Math.random() > 0.7) {
    const sparkX = bullet.x + dx * 0.3;
    const sparkY = bullet.y + dy * 0.3;
    
    particles.push({
      x: sparkX,
      y: sparkY,
      vx: Math.cos(angle) * 20 + (Math.random() - 0.5) * 15,
      vy: Math.sin(angle) * 20 + (Math.random() - 0.5) * 15,
      life: 0.08 + Math.random() * 0.05,
      maxLife: 0.08 + Math.random() * 0.05,
      size: 1.2 + Math.random() * 0.8,
      color: '#ffeb3b',
      alpha: 0.9,
      type: 'spark',
      gravity: 0.3,
      glowIntensity: 0.8
    });
  }
  
  return particles;
}
