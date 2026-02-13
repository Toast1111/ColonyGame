import type { Particle } from '../../game/types';

/**
 * Enhanced muzzle flash with multi-stage effects:
 * - Bright directional sparks
 * - Expanding smoke ring
 * - Intense glow core
 * - Secondary embers
 */
export function createMuzzleFlash(x: number, y: number, angle: number): Particle[] {
  const particles: Particle[] = [];
  
  // STAGE 1: Bright directional sparks (main flash)
  const mainSparkCount = 15 + Math.floor(Math.random() * 8);
  const spreadAngle = 1.4; // Wider cone for more dramatic effect
  
  for (let i = 0; i < mainSparkCount; i++) {
    const particleAngle = angle + (Math.random() - 0.5) * spreadAngle;
    const speed = 120 + Math.random() * 100;
    
    // Bright yellow-white-orange colors for explosive look
    const heatColors = ['#fff9e6', '#ffeb3b', '#ffc107', '#ff9800', '#ff6f00'];
    const color = heatColors[Math.floor(Math.random() * heatColors.length)];
    
    particles.push({
      x: x + (Math.random() - 0.5) * 4,
      y: y + (Math.random() - 0.5) * 4,
      vx: Math.cos(particleAngle) * speed,
      vy: Math.sin(particleAngle) * speed,
      life: 0.08 + Math.random() * 0.08,
      maxLife: 0.08 + Math.random() * 0.08,
      size: 1.5 + Math.random() * 2.5,
      color: color,
      alpha: 0.98,
      type: 'spark',
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 15,
      gravity: 0.3, // Sparks don't fall much
      glowIntensity: 0.9
    });
  }
  
  // STAGE 2: Expanding smoke puffs
  const smokePuffCount = 8 + Math.floor(Math.random() * 4);
  for (let i = 0; i < smokePuffCount; i++) {
    const puffAngle = angle + (Math.random() - 0.5) * 2.0;
    const speed = 30 + Math.random() * 40;
    
    // Gray smoke colors
    const smokeColors = ['#808080', '#a0a0a0', '#909090', '#787878'];
    const color = smokeColors[Math.floor(Math.random() * smokeColors.length)];
    
    particles.push({
      x: x + Math.cos(angle) * 8 + (Math.random() - 0.5) * 6,
      y: y + Math.sin(angle) * 8 + (Math.random() - 0.5) * 6,
      vx: Math.cos(puffAngle) * speed,
      vy: Math.sin(puffAngle) * speed,
      life: 0.25 + Math.random() * 0.15,
      maxLife: 0.25 + Math.random() * 0.15,
      size: 2.5 + Math.random() * 2,
      color: color,
      alpha: 0.7,
      type: 'smoke',
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 3,
      gravity: -0.3 // Smoke rises
    });
  }
  
  // STAGE 3: Intense bright core (initial flash)
  const coreGlowCount = 5;
  for (let i = 0; i < coreGlowCount; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 3,
      y: y + (Math.random() - 0.5) * 3,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 20,
      life: 0.05 + Math.random() * 0.03,
      maxLife: 0.05 + Math.random() * 0.03,
      size: 4 + Math.random() * 3,
      color: '#ffffff',
      alpha: 1.0,
      type: 'glow',
      gravity: 0,
      drag: 0.90,
      glowIntensity: 1.5,
      scaleSpeed: -8 // Shrink quickly
    });
  }
  
  // STAGE 4: Secondary embers (trailing effects)
  const emberCount = 6 + Math.floor(Math.random() * 4);
  for (let i = 0; i < emberCount; i++) {
    const emberAngle = angle + (Math.random() - 0.5) * 1.8;
    const speed = 50 + Math.random() * 60;
    
    const emberColors = ['#ff6f00', '#ff5722', '#ff8a65', '#ffab40'];
    const color = emberColors[Math.floor(Math.random() * emberColors.length)];
    
    particles.push({
      x: x + (Math.random() - 0.5) * 5,
      y: y + (Math.random() - 0.5) * 5,
      vx: Math.cos(emberAngle) * speed,
      vy: Math.sin(emberAngle) * speed,
      life: 0.15 + Math.random() * 0.1,
      maxLife: 0.15 + Math.random() * 0.1,
      size: 1 + Math.random() * 1.5,
      color: color,
      alpha: 0.85,
      type: 'spark',
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 10,
      gravity: 0.8,
      glowIntensity: 0.6
    });
  }
  
  return particles;
}
