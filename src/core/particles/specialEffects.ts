import type { Particle } from '../../game/types';

/**
 * Blood splatter effect for combat hits
 * Creates a visceral spray pattern with droplets
 */
export function createBloodSplatter(x: number, y: number, angle: number, intensity: number = 1.0): Particle[] {
  const particles: Particle[] = [];
  
  const dropletCount = Math.floor(8 + Math.random() * 12) * intensity;
  const spreadAngle = 2.0;
  
  for (let i = 0; i < dropletCount; i++) {
    const particleAngle = angle + (Math.random() - 0.5) * spreadAngle;
    const speed = (40 + Math.random() * 60) * intensity;
    
    // Blood colors (dark red spectrum)
    const bloodColors = ['#8b0000', '#a52a2a', '#b22222', '#dc143c', '#8b1a1a'];
    const color = bloodColors[Math.floor(Math.random() * bloodColors.length)];
    
    // Mix of large splatters and fine mist
    const isLargeSplatter = Math.random() > 0.6;
    
    particles.push({
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      vx: Math.cos(particleAngle) * speed,
      vy: Math.sin(particleAngle) * speed,
      life: isLargeSplatter ? 0.5 + Math.random() * 0.3 : 0.3 + Math.random() * 0.2,
      maxLife: isLargeSplatter ? 0.5 + Math.random() * 0.3 : 0.3 + Math.random() * 0.2,
      size: isLargeSplatter ? 2 + Math.random() * 2.5 : 0.8 + Math.random() * 1.2,
      color: color,
      alpha: isLargeSplatter ? 0.95 : 0.85,
      type: 'blood',
      gravity: isLargeSplatter ? 1.8 : 1.0,
      drag: 0.96
    });
  }
  
  return particles;
}

/**
 * Wood chip debris from tree chopping or wooden structure destruction
 */
export function createWoodDebris(x: number, y: number, amount: number = 1.0): Particle[] {
  const particles: Particle[] = [];
  
  const debrisCount = Math.floor(10 + Math.random() * 15) * amount;
  
  for (let i = 0; i < debrisCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 50;
    
    // Wood colors (browns and tans)
    const woodColors = ['#8b4513', '#a0522d', '#cd853f', '#daa520', '#d2691e', '#b8860b'];
    const color = woodColors[Math.floor(Math.random() * woodColors.length)];
    
    const isChip = Math.random() > 0.5;
    
    particles.push({
      x: x + (Math.random() - 0.5) * 12,
      y: y + (Math.random() - 0.5) * 12,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40, // Pop upward
      life: 0.6 + Math.random() * 0.4,
      maxLife: 0.6 + Math.random() * 0.4,
      size: isChip ? 2 + Math.random() * 2 : 1 + Math.random() * 1.5,
      color: color,
      alpha: 0.9,
      type: 'debris',
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 15,
      gravity: 1.5,
      drag: 0.97
    });
  }
  
  // Add sawdust cloud
  const dustCount = Math.floor(8 + Math.random() * 8);
  for (let i = 0; i < dustCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 15 + Math.random() * 25;
    
    particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 15,
      life: 0.4 + Math.random() * 0.3,
      maxLife: 0.4 + Math.random() * 0.3,
      size: 1.5 + Math.random() * 2,
      color: '#d3a068',
      alpha: 0.5,
      type: 'dust',
      gravity: 0.3,
      drag: 0.95
    });
  }
  
  return particles;
}

/**
 * Stone fragments from mining or rock destruction
 */
export function createStoneDebris(x: number, y: number, amount: number = 1.0): Particle[] {
  const particles: Particle[] = [];
  
  const fragmentCount = Math.floor(12 + Math.random() * 12) * amount;
  
  for (let i = 0; i < fragmentCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 35 + Math.random() * 55;
    
    // Stone colors (grays and dark tones)
    const stoneColors = ['#696969', '#808080', '#a9a9a9', '#778899', '#708090', '#556b2f'];
    const color = stoneColors[Math.floor(Math.random() * stoneColors.length)];
    
    const isLargeFragment = Math.random() > 0.6;
    
    particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 35,
      life: 0.7 + Math.random() * 0.5,
      maxLife: 0.7 + Math.random() * 0.5,
      size: isLargeFragment ? 2.5 + Math.random() * 2 : 1.2 + Math.random() * 1.5,
      color: color,
      alpha: 0.95,
      type: 'debris',
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 18,
      gravity: 2.0, // Heavy stone
      drag: 0.98
    });
  }
  
  // Stone dust cloud
  const dustCount = Math.floor(12 + Math.random() * 10);
  for (let i = 0; i < dustCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 20 + Math.random() * 30;
    
    particles.push({
      x: x + (Math.random() - 0.5) * 12,
      y: y + (Math.random() - 0.5) * 12,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 20,
      life: 0.5 + Math.random() * 0.4,
      maxLife: 0.5 + Math.random() * 0.4,
      size: 2 + Math.random() * 2.5,
      color: '#909090',
      alpha: 0.6,
      type: 'dust',
      gravity: 0.5,
      drag: 0.94
    });
  }
  
  return particles;
}

/**
 * Explosive blast effect with shockwave ring and fire
 */
export function createExplosion(x: number, y: number, size: number = 1.0): Particle[] {
  const particles: Particle[] = [];
  
  // Shockwave ring
  const ringCount = 20;
  for (let i = 0; i < ringCount; i++) {
    const angle = (Math.PI * 2 * i) / ringCount;
    const speed = (120 + Math.random() * 40) * size;
    
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.12 + Math.random() * 0.06,
      maxLife: 0.12 + Math.random() * 0.06,
      size: 3 * size + Math.random() * 2,
      color: '#ffffff',
      alpha: 1.0,
      type: 'glow',
      gravity: 0,
      drag: 0.88,
      glowIntensity: 1.5,
      scaleSpeed: 3 * size
    });
  }
  
  // Fire burst
  const fireCount = Math.floor(30 + Math.random() * 20) * size;
  for (let i = 0; i < fireCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (60 + Math.random() * 100) * size;
    
    const fireColors = ['#ff4500', '#ff6347', '#ffa500', '#ffff00', '#ff8c00', '#ff1493'];
    const color = fireColors[Math.floor(Math.random() * fireColors.length)];
    
    particles.push({
      x: x + (Math.random() - 0.5) * 10 * size,
      y: y + (Math.random() - 0.5) * 10 * size,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.2 + Math.random() * 0.25,
      maxLife: 0.2 + Math.random() * 0.25,
      size: 2 * size + Math.random() * 3,
      color: color,
      alpha: 0.95,
      type: 'spark',
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 20,
      gravity: 0.8,
      glowIntensity: 1.0
    });
  }
  
  // Smoke plume
  const smokeCount = Math.floor(15 + Math.random() * 15) * size;
  for (let i = 0; i < smokeCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (30 + Math.random() * 40) * size;
    
    const smokeColors = ['#404040', '#505050', '#606060', '#808080'];
    const color = smokeColors[Math.floor(Math.random() * smokeColors.length)];
    
    particles.push({
      x: x + (Math.random() - 0.5) * 15 * size,
      y: y + (Math.random() - 0.5) * 15 * size,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 20,
      life: 0.6 + Math.random() * 0.5,
      maxLife: 0.6 + Math.random() * 0.5,
      size: 3 * size + Math.random() * 4,
      color: color,
      alpha: 0.7,
      type: 'smoke',
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 4,
      gravity: -0.5
    });
  }
  
  return particles;
}

/**
 * Healing sparkle effect for medical treatment
 */
export function createHealingSparkles(x: number, y: number): Particle[] {
  const particles: Particle[] = [];
  
  const sparkleCount = 12 + Math.floor(Math.random() * 8);
  
  for (let i = 0; i < sparkleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 15 + Math.random() * 25;
    
    // Healing colors (green-cyan-white)
    const healColors = ['#00ff00', '#00ff7f', '#7fffd4', '#98fb98', '#90ee90', '#ffffff'];
    const color = healColors[Math.floor(Math.random() * healColors.length)];
    
    particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30, // Rise upward
      life: 0.6 + Math.random() * 0.4,
      maxLife: 0.6 + Math.random() * 0.4,
      size: 1.5 + Math.random() * 1.5,
      color: color,
      alpha: 0.8,
      type: 'glow',
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 8,
      gravity: -0.8, // Float up
      drag: 0.96,
      glowIntensity: 1.0
    });
  }
  
  return particles;
}

/**
 * Research/crafting completion sparkle burst
 */
export function createCraftingSparkles(x: number, y: number): Particle[] {
  const particles: Particle[] = [];
  
  const sparkleCount = 16 + Math.floor(Math.random() * 12);
  
  for (let i = 0; i < sparkleCount; i++) {
    const angle = (Math.PI * 2 * i) / sparkleCount + (Math.random() - 0.5) * 0.5;
    const speed = 40 + Math.random() * 30;
    
    // Magical colors (blue-purple-golden)
    const magicColors = ['#4169e1', '#9370db', '#ffd700', '#87ceeb', '#dda0dd', '#ffff00'];
    const color = magicColors[Math.floor(Math.random() * magicColors.length)];
    
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      life: 0.7 + Math.random() * 0.4,
      maxLife: 0.7 + Math.random() * 0.4,
      size: 2 + Math.random() * 2,
      color: color,
      alpha: 0.9,
      type: 'glow',
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 10,
      gravity: -0.5,
      drag: 0.95,
      glowIntensity: 1.2
    });
  }
  
  return particles;
}
