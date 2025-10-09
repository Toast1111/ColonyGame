/**
 * Optimized 2D Rendering Utilities
 * 
 * Provides fast alternatives to expensive Canvas 2D operations:
 * - Avoids shadowBlur (extremely slow)
 * - Minimizes globalAlpha changes
 * - Reduces save/restore calls
 * - Pre-computes gradients and patterns
 * - Uses fillStyle with rgba() instead of globalAlpha when possible
 * 
 * PERFORMANCE TIPS:
 * - shadowBlur: 10-50ms per frame (NEVER USE)
 * - globalAlpha: 0.1-0.5ms per change (minimize)
 * - save/restore: 0.01-0.1ms per call (batch when possible)
 * - gradients: 0.1-1ms per creation (cache them)
 */

/**
 * Cached rendering context for expensive operations
 * Use this to isolate expensive effects to offscreen canvases
 */
export class RenderCache {
  private caches = new Map<string, HTMLCanvasElement>();

  /**
   * Get or create a cached canvas
   */
  public getCanvas(key: string, width: number, height: number): HTMLCanvasElement {
    let canvas = this.caches.get(key);
    
    if (!canvas || canvas.width !== width || canvas.height !== height) {
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      this.caches.set(key, canvas);
    }
    
    return canvas;
  }

  /**
   * Clear a cached canvas
   */
  public clear(key: string): void {
    this.caches.delete(key);
  }

  /**
   * Clear all caches
   */
  public clearAll(): void {
    this.caches.clear();
  }
}

/**
 * Fast alpha blending using fillStyle instead of globalAlpha
 * Much faster since it doesn't change canvas state
 */
export function fillRectAlpha(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
  alpha: number
): void {
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
  ctx.fillRect(x, y, width, height);
}

/**
 * Fast stroke with alpha using strokeStyle instead of globalAlpha
 */
export function strokeRectAlpha(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
  alpha: number,
  lineWidth: number = 1
): void {
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(x, y, width, height);
}

/**
 * Batch save/restore operations
 * Instead of save/restore for each operation, batch them
 */
export class RenderBatch {
  private ctx: CanvasRenderingContext2D;
  private operations: Array<() => void> = [];

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /**
   * Add an operation to the batch
   */
  public add(operation: () => void): void {
    this.operations.push(operation);
  }

  /**
   * Execute all operations with a single save/restore
   */
  public execute(): void {
    if (this.operations.length === 0) return;

    this.ctx.save();
    for (const op of this.operations) {
      op();
    }
    this.ctx.restore();
    
    this.operations = [];
  }
}

/**
 * Gradient cache to avoid recreating gradients every frame
 */
export class GradientCache {
  private gradients = new Map<string, CanvasGradient>();

  /**
   * Get or create a linear gradient
   */
  public getLinearGradient(
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    stops: Array<{ offset: number; color: string }>
  ): CanvasGradient {
    const key = `linear:${x0},${y0},${x1},${y1}:${stops.map(s => `${s.offset}:${s.color}`).join(';')}`;
    
    let gradient = this.gradients.get(key);
    if (!gradient) {
      gradient = ctx.createLinearGradient(x0, y0, x1, y1);
      for (const stop of stops) {
        gradient.addColorStop(stop.offset, stop.color);
      }
      this.gradients.set(key, gradient);
    }
    
    return gradient;
  }

  /**
   * Get or create a radial gradient
   */
  public getRadialGradient(
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number,
    stops: Array<{ offset: number; color: string }>
  ): CanvasGradient {
    const key = `radial:${x0},${y0},${r0},${x1},${y1},${r1}:${stops.map(s => `${s.offset}:${s.color}`).join(';')}`;
    
    let gradient = this.gradients.get(key);
    if (!gradient) {
      gradient = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
      for (const stop of stops) {
        gradient.addColorStop(stop.offset, stop.color);
      }
      this.gradients.set(key, gradient);
    }
    
    return gradient;
  }

  /**
   * Clear all cached gradients
   */
  public clear(): void {
    this.gradients.clear();
  }
}

/**
 * Fast shadow alternative using offset rectangles
 * Much faster than shadowBlur
 */
export function drawFastShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  offsetX: number,
  offsetY: number,
  shadowColor: string = 'rgba(0, 0, 0, 0.3)'
): void {
  // Draw shadow as offset rectangle
  ctx.fillStyle = shadowColor;
  ctx.fillRect(x + offsetX, y + offsetY, width, height);
}

/**
 * State tracker to minimize redundant state changes
 * Canvas state changes are expensive, this tracks and skips redundant ones
 */
export class CanvasStateTracker {
  private ctx: CanvasRenderingContext2D;
  private currentFillStyle: string | CanvasGradient | CanvasPattern = '';
  private currentStrokeStyle: string | CanvasGradient | CanvasPattern = '';
  private currentLineWidth = 1;
  private currentGlobalAlpha = 1;
  private currentFont = '';

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /**
   * Set fill style only if different
   */
  public setFillStyle(style: string | CanvasGradient | CanvasPattern): void {
    if (this.currentFillStyle !== style) {
      this.ctx.fillStyle = style;
      this.currentFillStyle = style;
    }
  }

  /**
   * Set stroke style only if different
   */
  public setStrokeStyle(style: string | CanvasGradient | CanvasPattern): void {
    if (this.currentStrokeStyle !== style) {
      this.ctx.strokeStyle = style;
      this.currentStrokeStyle = style;
    }
  }

  /**
   * Set line width only if different
   */
  public setLineWidth(width: number): void {
    if (this.currentLineWidth !== width) {
      this.ctx.lineWidth = width;
      this.currentLineWidth = width;
    }
  }

  /**
   * Set global alpha only if different (use sparingly!)
   */
  public setGlobalAlpha(alpha: number): void {
    if (this.currentGlobalAlpha !== alpha) {
      this.ctx.globalAlpha = alpha;
      this.currentGlobalAlpha = alpha;
    }
  }

  /**
   * Set font only if different
   */
  public setFont(font: string): void {
    if (this.currentFont !== font) {
      this.ctx.font = font;
      this.currentFont = font;
    }
  }

  /**
   * Reset tracking on save/restore
   */
  public invalidate(): void {
    this.currentFillStyle = '';
    this.currentStrokeStyle = '';
    this.currentLineWidth = -1;
    this.currentGlobalAlpha = -1;
    this.currentFont = '';
  }
}

/**
 * Global instances for common use
 */
export const renderCache = new RenderCache();
export const gradientCache = new GradientCache();
