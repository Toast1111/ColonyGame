import type { Particle } from '../../game/types';

type FxKind = 'pistol' | 'smg' | 'rifle' | 'shotgun' | 'sniper' | 'minigun' | 'rocket' | 'bow' | 'turret';

export function createMuzzleFlash(x: number, y: number, angle: number, kind: FxKind = 'rifle'): Particle[] {
  const particles: Particle[] = [];
  if (kind === 'bow') return particles; // no muzzle flash for bows

  const paletteBase = ['#ffeb3b', '#ffc107', '#ff9800', '#ff5722', '#fff59d'];
  const paletteSniper = ['#ffffff', '#fff8dc', '#ffe4b5'];
  const paletteRocket = ['#ff9800', '#ff5722', '#ffd54f', '#ffab00'];
  const colors = kind === 'sniper' ? paletteSniper : (kind === 'rocket' ? paletteRocket : paletteBase);

  const spreadByKind: Record<FxKind, number> = {
    pistol: 1.1, smg: 1.2, rifle: 1.0, shotgun: 1.4, sniper: 0.7, minigun: 1.3, rocket: 1.6, bow: 0, turret: 1.0
  };
  const speedByKind: Record<FxKind, [number, number]> = {
    pistol: [90, 70], smg: [110, 80], rifle: [120, 90], shotgun: [140, 100], sniper: [130, 80], minigun: [100, 90], rocket: [160, 120], bow: [0, 0], turret: [120, 90]
  };
  const sizeByKind: Record<FxKind, [number, number]> = {
    pistol: [1.6, 1.8], smg: [1.5, 2.0], rifle: [1.8, 2.2], shotgun: [2.2, 2.6], sniper: [1.4, 1.8], minigun: [1.2, 1.6], rocket: [2.6, 3.2], bow: [0, 0], turret: [1.8, 2.2]
  };
  const lifeByKind: Record<FxKind, [number, number]> = {
    pistol: [0.1, 0.08], smg: [0.1, 0.08], rifle: [0.12, 0.08], shotgun: [0.14, 0.1], sniper: [0.1, 0.06], minigun: [0.08, 0.06], rocket: [0.16, 0.12], bow: [0, 0], turret: [0.12, 0.08]
  };
  const countByKind: Record<FxKind, [number, number]> = {
    pistol: [8, 4], smg: [10, 6], rifle: [12, 6], shotgun: [14, 8], sniper: [8, 3], minigun: [6, 4], rocket: [16, 8], bow: [0, 0], turret: [12, 6]
  };

  const [baseCount, randCount] = countByKind[kind];
  const numParticles = baseCount + Math.floor(Math.random() * randCount);
  const spread = spreadByKind[kind];
  const [baseSpeed, randSpeed] = speedByKind[kind];
  const [baseSize, randSize] = sizeByKind[kind];
  const [baseLife, randLife] = lifeByKind[kind];

  for (let i = 0; i < numParticles; i++) {
    const particleAngle = angle + (Math.random() - 0.5) * spread;
    const speed = baseSpeed + Math.random() * randSpeed;
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles.push({
      x: x + (Math.random() - 0.5) * 6,
      y: y + (Math.random() - 0.5) * 6,
      vx: Math.cos(particleAngle) * speed,
      vy: Math.sin(particleAngle) * speed,
      life: baseLife + Math.random() * randLife,
      maxLife: baseLife + Math.random() * randLife,
      size: baseSize + Math.random() * randSize,
      color: color,
      alpha: 0.95
    });
  }
  return particles;
}
