import type { Particle } from '../../game/types';

/**
 * Enhanced impact effect with multi-layered visual feedback:
 * - Radial spark burst
 * - Dust cloud expansion
 * - Debris chunks
 * - Impact ring flash
 */
export function createImpactEffect(x: number, y: number): Particle[] {
  const particles: Particle[] = [];
  
  // LAYER 1: Radial spark burst (main impact visual)
  const sparkCount = 12 + Math.floor(Math.random() * 10);
  for (let i = 0; i < sparkCount; i++) {
    const angle = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 1.0;
    const speed = 60 + Math.random() * 80;
    
    // Bright impact colors (yellow-orange-red spectrum)
    const impactColors = ['#fff9e6', '#ffeb3b', '#ff9800', '#ff5722', '#ff7043'];
    const color = impactColors[Math.floor(Math.random() * impactColors.length)];
    
    particles.push({
      x: x + (Math.random() - 0.5) * 6,
      y: y + (Math.random() - 0.5) * 6,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.15 + Math.random() * 0.15,
      maxLife: 0.15 + Math.random() * 0.15,
      size: 1.2 + Math.random() * 1.8,
      color: color,
      alpha: 0.95,
      type: 'spark',
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 12,
      gravity: 1.2, // Sparks arc down
      glowIntensity: 0.8
    });
  }
  
  // LAYER 2: Expanding dust cloud
  const dustCount = 10 + Math.floor(Math.random() * 6);
  for (let i = 0; i < dustCount; i++) {
    const angle = (Math.PI * 2 * i) / dustCount + (Math.random() - 0.5) * 0.6;
    const speed = 25 + Math.random() * 35;
    
    // Dust/smoke colors
    const dustColors = ['#b0b0b0', '#c0c0c0', '#a8a8a8', '#909090', '#d0d0d0'];
    const color = dustColors[Math.floor(Math.random() * dustColors.length)];
    
    particles.push({
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.3 + Math.random() * 0.25,
      maxLife: 0.3 + Math.random() * 0.25,
      size: 2 + Math.random() * 3,
      color: color,
      alpha: 0.6,
      type: 'dust',
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 4,
      gravity: 0.4,
      drag: 0.96
    });
  }
  
  // LAYER 3: Debris chunks (heavier, spinning pieces)
  const debrisCount = 6 + Math.floor(Math.random() * 4);
  for (let i = 0; i < debrisCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 50;
    
    // Darker debris colors
    const debrisColors = ['#8b4513', '#654321', '#5c4033', '#3e2723', '#a0826d'];
    const color = debrisColors[Math.floor(Math.random() * debrisColors.length)];
    
    particles.push({
      x: x + (Math.random() - 0.5) * 5,
      y: y + (Math.random() - 0.5) * 5,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 20, // Initial upward velocity
      life: 0.4 + Math.random() * 0.3,
      maxLife: 0.4 + Math.random() * 0.3,
      size: 1.5 + Math.random() * 2.5,
      color: color,
      alpha: 0.9,
      type: 'debris',
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 20, // Fast spinning
      gravity: 1.5, // Heavy fall
      drag: 0.97
    });
  }
  
  // LAYER 4: Impact ring flash (brief bright expanding ring)
  const ringCount = 8;
  for (let i = 0; i < ringCount; i++) {
    const angle = (Math.PI * 2 * i) / ringCount;
    const speed = 80 + Math.random() * 30;
    
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.08 + Math.random() * 0.04,
      maxLife: 0.08 + Math.random() * 0.04,
      size: 2 + Math.random() * 1.5,
      color: '#ffffff',
      alpha: 1.0,
      type: 'glow',
      gravity: 0,
      drag: 0.85,
      glowIntensity: 1.2,
      scaleSpeed: 2 // Expand quickly
    });
  }
  
  // LAYER 5: Secondary sparks (finer detail)
  const fineSparkCount = 8;
  for (let i = 0; i < fineSparkCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 90 + Math.random() * 60;
    
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.1 + Math.random() * 0.08,
      maxLife: 0.1 + Math.random() * 0.08,
      size: 0.8 + Math.random() * 1,
      color: '#ffeb3b',
      alpha: 0.9,
      type: 'spark',
      gravity: 0.5,
      glowIntensity: 0.7
    });
  }
  
  return particles;
}
