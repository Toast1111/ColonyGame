import type { Particle } from '../../game/types';

/**
 * Enhanced particle physics with dynamic behaviors
 */
export function updateParticles(particles: Particle[], dt: number): Particle[] {
  return particles.filter(p => {
    // Position update
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    
    // Apply gravity (customizable per particle)
    const gravityMultiplier = p.gravity ?? 1.0;
    p.vy += 30 * dt * gravityMultiplier;
    
    // Apply drag (air resistance)
    const drag = p.drag ?? 0.98;
    p.vx *= drag;
    p.vy *= drag;
    
    // Rotation animation
    if (p.rotation !== undefined && p.rotationSpeed !== undefined) {
      p.rotation += p.rotationSpeed * dt;
    }
    
    // Scale animation
    if (p.scale !== undefined && p.scaleSpeed !== undefined) {
      p.scale += p.scaleSpeed * dt;
      p.scale = Math.max(0, p.scale); // Don't go negative
    } else if (p.scale === undefined) {
      p.scale = 1.0;
    }
    
    // Type-specific behaviors
    switch (p.type) {
      case 'spark':
        // Sparks fade quickly and shrink rapidly
        p.size *= 0.985;
        // Sparks have erratic motion
        p.vx += (Math.random() - 0.5) * 40 * dt;
        p.vy += (Math.random() - 0.5) * 40 * dt;
        break;
        
      case 'smoke':
        // Smoke rises and expands
        p.vy -= 15 * dt; // Float upward
        p.size *= 1.015; // Expand
        p.vx += (Math.random() - 0.5) * 10 * dt; // Drift
        break;
        
      case 'debris':
        // Debris has strong rotation
        if (p.rotationSpeed !== undefined) {
          p.rotationSpeed *= 0.96; // Slow down rotation over time
        }
        break;
        
      case 'glow':
        // Glow particles pulsate
        if (p.glowIntensity !== undefined) {
          p.glowIntensity *= 0.95;
        }
        break;
        
      case 'blood':
        // Blood spatters stick to ground (no bounce)
        p.size *= 0.992;
        break;
        
      case 'dust':
        // Dust settles slowly
        p.size *= 0.998;
        p.vy *= 0.95; // Settle faster than normal drag
        break;
        
      default:
        // Default behavior
        p.size *= 0.995;
    }
    
    // Life and alpha update
    p.life -= dt;
    
    // Different fade patterns based on type
    if (p.type === 'spark') {
      // Sparks fade exponentially at the end
      const lifeRatio = p.life / p.maxLife;
      p.alpha = Math.max(0, lifeRatio > 0.3 ? 0.95 : lifeRatio * 3);
    } else if (p.type === 'smoke') {
      // Smoke fades linearly
      p.alpha = Math.max(0, (p.life / p.maxLife) * 0.6);
    } else {
      // Default fade
      p.alpha = Math.max(0, (p.life / p.maxLife) * 0.8);
    }
    
    return p.life > 0 && p.size > 0.1;
  });
}
