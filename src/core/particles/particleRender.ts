import type { Particle } from '../../game/types';
import { particleSpriteCache } from '../RenderCache';

// Performance toggle - use sprite blitting vs arc() drawing
let useParticleSprites = true;

/**
 * Toggle particle rendering mode
 */
export function toggleParticleSprites(enabled: boolean): void {
  useParticleSprites = enabled;
}

/**
 * Get current particle rendering mode
 */
export function isUsingParticleSprites(): boolean {
  return useParticleSprites;
}

/**
 * Enhanced particle renderer with support for:
 * - Rotation and scaling
 * - Glow/bloom effects
 * - Additive blend mode for sparks/glows
 * - Optimized sprite rendering path
 */
export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  ctx.save();
  
  // Group particles by type for batch rendering with same blend mode
  const normalParticles: Particle[] = [];
  const glowParticles: Particle[] = [];
  
  for (const p of particles) {
    if (p.type === 'spark' || p.type === 'glow') {
      glowParticles.push(p);
    } else {
      normalParticles.push(p);
    }
  }
  
  // Render normal particles first (smoke, debris, blood, dust)
  ctx.globalCompositeOperation = 'source-over';
  renderParticleGroup(ctx, normalParticles, false);
  
  // Render glow particles with additive blending for bright effects
  ctx.globalCompositeOperation = 'lighter';
  renderParticleGroup(ctx, glowParticles, true);
  
  ctx.restore();
}

/**
 * Render a group of particles with consistent settings
 */
function renderParticleGroup(ctx: CanvasRenderingContext2D, particles: Particle[], isGlowGroup: boolean) {
  if (useParticleSprites && !particles.some(p => p.rotation !== undefined || p.scale !== undefined)) {
    // OPTIMIZED PATH: Use sprite blitting (only if no rotation/scaling needed)
    for (const p of particles) {
      const scale = p.scale ?? 1.0;
      const sprite = particleSpriteCache.getSprite(p.color, p.size * scale, p.alpha);
      const halfSize = sprite.width / 2;
      
      if (p.alpha < 1) {
        ctx.globalAlpha = p.alpha;
      }
      
      ctx.drawImage(sprite, p.x - halfSize, p.y - halfSize);
      
      if (p.alpha < 1) {
        ctx.globalAlpha = 1;
      }
    }
  } else {
    // FULL-FEATURED PATH: Support all particle properties
    for (const p of particles) {
      const scale = p.scale ?? 1.0;
      const size = p.size * scale;
      
      // Skip tiny particles
      if (size < 0.1) continue;
      
      ctx.save();
      
      // Apply rotation if present
      if (p.rotation !== undefined && p.rotation !== 0) {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.translate(-p.x, -p.y);
      }
      
      // Convert hex color to RGB for alpha blending
      const rgb = hexToRgb(p.color);
      
      // Main particle body
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
      
      // Add glow effects for applicable particles
      if (isGlowGroup && p.glowIntensity && p.glowIntensity > 0) {
        const glowAlpha = p.alpha * p.glowIntensity * 0.3;
        
        // Outer glow
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${glowAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Bright core
        if (p.life / p.maxLife > 0.5) {
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.6})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (!isGlowGroup && p.alpha > 0.3) {
        // Subtle soft edge for non-glow particles
        const edgeAlpha = p.alpha * 0.15;
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${edgeAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Add highlight for debris/solid particles
      if (p.type === 'debris' && p.life / p.maxLife > 0.6) {
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.4})`;
        ctx.beginPath();
        ctx.arc(p.x - size * 0.3, p.y - size * 0.3, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    }
  }
}

/**
 * Convert hex color to RGB components
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
}
