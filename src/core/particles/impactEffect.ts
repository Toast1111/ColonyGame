import type { Particle } from '../../game/types';

type FxKind = 'pistol' | 'smg' | 'rifle' | 'shotgun' | 'sniper' | 'minigun' | 'rocket' | 'bow' | 'turret';

export function createImpactEffect(x: number, y: number, kind: FxKind = 'rifle', power = 1): Particle[] {
  const particles: Particle[] = [];
  const scale = Math.max(0.6, power);
  const count = {
    pistol: 10, smg: 12, rifle: 14, shotgun: 18, sniper: 10, minigun: 12, rocket: 28, bow: 6, turret: 14
  }[kind] * scale;
  const numParticles = Math.floor(count) + Math.floor(Math.random() * 6);
  const baseSpeed = {
    pistol: 60, smg: 70, rifle: 75, shotgun: 90, sniper: 80, minigun: 70, rocket: 120, bow: 40, turret: 75
  }[kind] * scale;
  const palette = kind === 'rocket'
    ? ['#ff9e3d', '#ffb74d', '#ffd54f', '#fff176']
    : kind === 'bow'
      ? ['#a3824b', '#7b5a2a', '#c6a168']
      : ['#ff5722', '#ff7043', '#ffab40', '#ffa726', '#ff8a65'];

  for (let i = 0; i < numParticles; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = baseSpeed + Math.random() * (baseSpeed * 0.6);
    const color = palette[Math.floor(Math.random() * palette.length)];
    particles.push({
      x: x + (Math.random() - 0.5) * (kind === 'rocket' ? 12 : 8),
      y: y + (Math.random() - 0.5) * (kind === 'rocket' ? 12 : 8),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: (kind === 'rocket' ? 0.35 : 0.25) + Math.random() * 0.2,
      maxLife: (kind === 'rocket' ? 0.35 : 0.25) + Math.random() * 0.2,
      size: (kind === 'rocket' ? 1.8 : kind === 'shotgun' ? 1.5 : 1.2) + Math.random() * 1.2,
      color: color,
      alpha: 0.9
    });
  }
  return particles;
}
