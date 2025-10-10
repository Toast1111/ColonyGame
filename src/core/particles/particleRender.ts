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

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  ctx.save();
  
  if (useParticleSprites) {
    // OPTIMIZED: Use pre-rendered sprite blits instead of arc() calls
    for (const p of particles) {
      const sprite = particleSpriteCache.getSprite(p.color, p.size, p.alpha);
      const halfSize = sprite.width / 2;
      
      // Apply alpha through globalAlpha only once per unique alpha value
      if (p.alpha < 1) {
        ctx.globalAlpha = p.alpha;
      }
      
      ctx.drawImage(sprite, p.x - halfSize, p.y - halfSize);
      
      if (p.alpha < 1) {
        ctx.globalAlpha = 1;
      }
    }
  } else {
    // LEGACY: Use arc() drawing (slower but original implementation)
    for (const p of particles) {
      // Use rgba() in fillStyle instead of globalAlpha for better performance
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
      };
      
      const rgb = hexToRgb(p.color);
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      
      if (p.alpha > 0.2) {
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${p.alpha * 0.25})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      
      if (p.life / p.maxLife > 0.7) {
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  
  ctx.restore();
}
