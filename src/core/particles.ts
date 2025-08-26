import type { Particle, Bullet } from '../game/types';

export function createMuzzleFlash(x: number, y: number, angle: number): Particle[] {
  const particles: Particle[] = [];
  const numParticles = 12 + Math.floor(Math.random() * 6);
  
  for (let i = 0; i < numParticles; i++) {
    const spread = 1.2; // angle spread in radians
    const particleAngle = angle + (Math.random() - 0.5) * spread;
    const speed = 100 + Math.random() * 80;
    
    // Mix of yellow/orange colors for muzzle flash
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
    
    // Mix of blue/cyan colors for projectile trail
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

export function createImpactEffect(x: number, y: number): Particle[] {
  const particles: Particle[] = [];
  const numParticles = 8 + Math.floor(Math.random() * 8);
  
  for (let i = 0; i < numParticles; i++) {
    const angle = (Math.PI * 2 * i) / numParticles + (Math.random() - 0.5) * 0.8;
    const speed = 50 + Math.random() * 60;
    
    // Mix of red/orange colors for impact
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

export function updateParticles(particles: Particle[], dt: number): Particle[] {
  return particles.filter(p => {
    // Update position
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    
    // Apply slight gravity and air resistance
    p.vy += 30 * dt; // gravity
    p.vx *= 0.98; // air resistance
    p.vy *= 0.98;
    
    // Update life
    p.life -= dt;
    
    // Update alpha based on remaining life
    p.alpha = Math.max(0, (p.life / p.maxLife) * 0.8);
    
    // Update size (shrink over time)
    p.size *= 0.995;
    
    return p.life > 0;
  });
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  ctx.save();
  
  for (const p of particles) {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    
    // Draw particle as a circle
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Add a subtle outer glow
    if (p.alpha > 0.2) {
      ctx.globalAlpha = p.alpha * 0.25;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Add a bright inner core for fresh particles
    if (p.life / p.maxLife > 0.7) {
      ctx.globalAlpha = p.alpha * 0.8;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  ctx.restore();
}
