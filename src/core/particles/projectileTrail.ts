import type { Particle } from '../../game/types';
import type { Bullet } from '../../game/types';

type FxKind = 'pistol' | 'smg' | 'rifle' | 'shotgun' | 'sniper' | 'minigun' | 'rocket' | 'bow' | 'turret';

export function createProjectileTrail(bullet: Bullet & { kind?: FxKind }): Particle[] {
  const particles: Particle[] = [];
  const dx = bullet.tx - bullet.x;
  const dy = bullet.ty - bullet.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  const densityByKind: Record<FxKind, number> = {
    pistol: 10, smg: 11, rifle: 10, shotgun: 8, sniper: 8, minigun: 9, rocket: 12, bow: 6, turret: 10
  };
  const numParticles = Math.floor(length / (densityByKind[bullet.kind || 'rifle'])) + 2;
  
  for (let i = 0; i < numParticles; i++) {
    const t = i / (numParticles - 1);
    const x = bullet.x + dx * t;
    const y = bullet.y + dy * t;
    
  // Trail colors per kind
  const colors = (bullet.kind === 'rocket') ? ['#f2f2f2', '#e0e0e0', '#d0d0d0', '#c0c0c0'] :
           (bullet.kind === 'bow') ? ['#a3824b', '#7b5a2a'] :
           ['#c0c0c0', '#a8a8a8', '#909090', '#787878', '#606060'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    // Much tighter spread for realistic bullet trail
    const perpAngle = angle + Math.PI / 2;
  const spread = (Math.random() - 0.5) * (bullet.kind === 'sniper' ? 1.0 : bullet.kind === 'shotgun' ? 2.0 : 1.5);
    
    particles.push({
      x: x + Math.cos(perpAngle) * spread,
      y: y + Math.sin(perpAngle) * spread,
      // Minimal velocity for a more linear trail
      vx: Math.cos(angle) * 5 + (Math.random() - 0.5) * 8,
      vy: Math.sin(angle) * 5 + (Math.random() - 0.5) * 8,
  life: (bullet.kind === 'rocket' ? 0.25 : 0.15) + Math.random() * 0.1,
  maxLife: (bullet.kind === 'rocket' ? 0.25 : 0.15) + Math.random() * 0.1,
  size: (bullet.kind === 'rocket' ? 1.2 : 0.8) + Math.random() * 0.4,
  color: color,
  alpha: bullet.kind === 'bow' ? 0.5 : 0.7
    });
  }
  return particles;
}
