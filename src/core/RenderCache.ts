/**
 * Advanced Render Caching System
 * 
 * Implements the optimized rendering pipeline:
 * 1. World background cached as single bitmap
 * 2. Colonist sprite composition caching
 * 3. Particle sprite caching
 * 4. Night overlay cached bitmap
 * 5. UI panel caching
 */

import { WORLD, T, COLORS } from '../game/constants';
import type { Camera, Colonist } from '../game/types';
import type { TerrainGrid } from '../game/terrain';
import { getFloorTypeFromId, FloorType, FLOOR_VISUALS, getTerrainTypeFromId, TerrainType } from '../game/terrain';

/**
 * World background cache - renders static world tiles to a canvas once
 */
export class WorldBackgroundCache {
  private canvas: HTMLCanvasElement | null = null;
  private dirty = true;

  /**
   * Get or render the world background
   */
  public getCanvas(ctx: CanvasRenderingContext2D, terrainGrid: TerrainGrid): HTMLCanvasElement {
    if (!this.canvas || this.dirty) {
      this.render(ctx, terrainGrid);
      this.dirty = false;
    }
    return this.canvas!;
  }

  /**
   * Mark cache as dirty (needs re-render)
   */
  public markDirty(): void {
    this.dirty = true;
  }

  /**
   * Render world background to cache
   */
  private render(ctx: CanvasRenderingContext2D, terrainGrid: TerrainGrid): void {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = WORLD.w;
      this.canvas.height = WORLD.h;
    }

    const cacheCtx = this.canvas.getContext('2d')!;
    
    // Draw ground and floors tile-by-tile, skipping mountains
    if (terrainGrid) {
      for (let gy = 0; gy < terrainGrid.rows; gy++) {
        for (let gx = 0; gx < terrainGrid.cols; gx++) {
          const idx = gy * terrainGrid.cols + gx;
          const terrainType = getTerrainTypeFromId(terrainGrid.terrain[idx]);
          const wx = gx * T;
          const wy = gy * T;
          
          // Skip mountain tiles - they'll be drawn dynamically with ores
          if (terrainType === TerrainType.MOUNTAIN) continue;
          
          // Draw ground tile
          cacheCtx.fillStyle = COLORS.ground;
          cacheCtx.fillRect(wx, wy, T, T);
          
          // Draw floor if present
          const floorId = terrainGrid.floors[idx];
          if (floorId !== 0) {
            const floorType = getFloorTypeFromId(floorId);
            if (floorType !== FloorType.NONE) {
              const visual = FLOOR_VISUALS[floorType];
              if (visual) {
                cacheCtx.fillStyle = visual.color;
                cacheCtx.fillRect(wx, wy, T, T);

                // Add pattern if applicable
                if (visual.pattern === 'stripes' && visual.secondaryColor) {
                  cacheCtx.fillStyle = visual.secondaryColor;
                  cacheCtx.fillRect(wx, wy, T, T / 4);
                  cacheCtx.fillRect(wx, wy + T / 2, T, T / 4);
                } else if (visual.pattern === 'dots' && visual.secondaryColor) {
                  cacheCtx.fillStyle = visual.secondaryColor;
                  cacheCtx.fillRect(wx + T / 4, wy + T / 4, T / 2, T / 2);
                }
              }
            }
          }
        }
      }
    } else {
      // Fallback: draw entire ground
      cacheCtx.fillStyle = COLORS.ground;
      cacheCtx.fillRect(0, 0, WORLD.w, WORLD.h);
    }

    // Grid lines
    cacheCtx.strokeStyle = 'rgba(30, 41, 59, 0.5)';
    cacheCtx.lineWidth = 0.75;
    cacheCtx.beginPath();
    for (let x = 0; x <= WORLD.w; x += T) {
      cacheCtx.moveTo(x, 0);
      cacheCtx.lineTo(x, WORLD.h);
    }
    for (let y = 0; y <= WORLD.h; y += T) {
      cacheCtx.moveTo(0, y);
      cacheCtx.lineTo(WORLD.w, y);
    }
    cacheCtx.stroke();
  }
}

/**
 * Colonist sprite composition cache
 * Caches fully composed colonist sprites to avoid expensive per-frame tinting
 */
export class ColonistSpriteCache {
  private cache = new Map<string, HTMLCanvasElement>();
  private spriteWidth = 32;
  private spriteHeight = 48; // Match the actual sprite height used in render.ts

  /**
   * Get cache key for colonist sprite composition
   */
  private getCacheKey(
    colonist: Colonist,
    direction: string
  ): string {
    const profile = colonist.profile;
    if (!profile) return '';
    
    const sprites = profile.avatar.sprites;
    return `${sprites.bodyType}-${profile.avatar.skinTone}-${sprites.apparelType}-${profile.avatar.clothing}-${sprites.headType}-${sprites.hairStyle}-${profile.avatar.hairColor}-${direction}`;
  }

  /**
   * Get or create composed colonist sprite
   */
  public getComposedSprite(
    colonist: Colonist,
    direction: string,
    imageAssets: any,
    createTintedSprite: (sprite: HTMLImageElement, color: string) => HTMLCanvasElement
  ): HTMLCanvasElement | null {
    const key = this.getCacheKey(colonist, direction);
    if (!key) return null;

    let cached = this.cache.get(key);
    if (cached) return cached;

    // Create new composed sprite
    const canvas = document.createElement('canvas');
    canvas.width = this.spriteWidth;
    canvas.height = this.spriteHeight;
    const ctx = canvas.getContext('2d')!;

    const profile = colonist.profile;
    if (!profile) return null;
    
    const sprites = profile.avatar.sprites;

    // Compose layers
    const bodySprite = imageAssets.getColonistSprite('body', sprites.bodyType, direction);
    if (bodySprite) {
      const tintedBody = createTintedSprite(bodySprite, profile.avatar.skinTone);
      ctx.drawImage(tintedBody, 0, 0);
    } else if (Math.random() < 0.05) {
      console.warn(`[Cache] Body sprite not found: body_${sprites.bodyType}_${direction}`);
    }

    const apparelSprite = imageAssets.getColonistSprite('apparel', sprites.apparelType, direction);
    if (apparelSprite) {
      const tintedApparel = createTintedSprite(apparelSprite, profile.avatar.clothing);
      ctx.drawImage(tintedApparel, 0, 0);
    } else if (Math.random() < 0.05) {
      console.warn(`[Cache] Apparel sprite not found: apparel_${sprites.apparelType}_${direction}`);
    }

    const headSprite = imageAssets.getColonistSprite('head', sprites.headType, direction);
    if (headSprite) {
      const tintedHead = createTintedSprite(headSprite, profile.avatar.skinTone);
      ctx.drawImage(tintedHead, 0, 0);
    }

    const hairSprite = imageAssets.getColonistSprite('hair', sprites.hairStyle, direction);
    if (hairSprite) {
      const tintedHair = createTintedSprite(hairSprite, profile.avatar.hairColor);
      ctx.drawImage(tintedHair, 0, 0);
    }

    // Log successful composition for debugging (sample 1%)
    if (Math.random() < 0.01) {
      console.log(`[Cache] Composed sprite: body=${sprites.bodyType}, apparel=${sprites.apparelType}, head=${sprites.headType}, hair=${sprites.hairStyle}, dir=${direction}`);
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  /**
   * Clear all cached sprites
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size for debugging
   */
  public size(): number {
    return this.cache.size;
  }
}

/**
 * Night overlay cache - pre-rendered vignette effect
 */
export class NightOverlayCache {
  private canvas: HTMLCanvasElement | null = null;

  /**
   * Get or create night overlay
   */
  public getCanvas(): HTMLCanvasElement {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = WORLD.w;
      this.canvas.height = WORLD.h;
      
      const ctx = this.canvas.getContext('2d')!;
      
      // Simple dark overlay
      ctx.fillStyle = 'rgba(6, 10, 18, 0.58)';
      ctx.fillRect(0, 0, WORLD.w, WORLD.h);
    }
    return this.canvas;
  }

  /**
   * Clear cache
   */
  public clear(): void {
    this.canvas = null;
  }
}

/**
 * UI Panel cache - cache rendered UI panels to avoid redrawing text/shapes each frame
 */
export class UIPanelCache {
  private cache = new Map<string, { canvas: HTMLCanvasElement; timestamp: number }>();
  private maxAge = 100; // milliseconds - refresh every 100ms

  /**
   * Get or create cached panel
   */
  public getPanel(
    key: string,
    width: number,
    height: number,
    renderFn: (ctx: CanvasRenderingContext2D) => void,
    forceRefresh = false
  ): HTMLCanvasElement {
    const now = Date.now();
    const cached = this.cache.get(key);

    if (!forceRefresh && cached && now - cached.timestamp < this.maxAge) {
      return cached.canvas;
    }

    // Create or update cache
    const canvas = cached?.canvas || document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, width, height);
    renderFn(ctx);

    this.cache.set(key, { canvas, timestamp: now });
    return canvas;
  }

  /**
   * Clear cache
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Clear specific panel
   */
  public clearPanel(key: string): void {
    this.cache.delete(key);
  }
}

/**
 * Particle sprite cache - pre-rendered particle sprites for different types
 */
export class ParticleSpriteCache {
  private cache = new Map<string, HTMLCanvasElement>();

  /**
   * Get cache key for particle
   */
  private getCacheKey(color: string, size: number, type: string = 'circle'): string {
    return `${type}-${color}-${size}`;
  }

  /**
   * Get or create particle sprite
   */
  public getSprite(color: string, size: number, alpha: number = 1): HTMLCanvasElement {
    const baseKey = this.getCacheKey(color, Math.ceil(size));
    let cached = this.cache.get(baseKey);

    if (!cached) {
      // Create new particle sprite
      const canvas = document.createElement('canvas');
      const renderSize = Math.ceil(size) * 3; // Extra space for glow
      canvas.width = renderSize;
      canvas.height = renderSize;
      const ctx = canvas.getContext('2d')!;

      const center = renderSize / 2;

      // Parse color
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
      };

      const rgb = hexToRgb(color);

      // Outer glow
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`;
      ctx.beginPath();
      ctx.arc(center, center, size * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Main particle
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`;
      ctx.beginPath();
      ctx.arc(center, center, size, 0, Math.PI * 2);
      ctx.fill();

      // White core (if bright enough)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(center, center, size * 0.4, 0, Math.PI * 2);
      ctx.fill();

      this.cache.set(baseKey, canvas);
      cached = canvas;
    }

    return cached;
  }

  /**
   * Clear cache
   */
  public clear(): void {
    this.cache.clear();
  }
}

/**
 * Global cache instances
 */
export const worldBackgroundCache = new WorldBackgroundCache();
export const colonistSpriteCache = new ColonistSpriteCache();
export const nightOverlayCache = new NightOverlayCache();
export const uiPanelCache = new UIPanelCache();
export const particleSpriteCache = new ParticleSpriteCache();
