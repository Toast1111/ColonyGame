import { T, WORLD } from '../../constants';
import type { Game } from '../../Game';
import type { Building, Colonist } from '../../types';

export class SandStormSystem {
  private game: Game;
  private active = false;
  private timeLeft = 0;
  private visionRadius = 8 * T;

  constructor(game: Game) {
    this.game = game;
  }

  isActive(): boolean {
    return this.active;
  }

  getVisionRadius(): number {
    return this.visionRadius;
  }

  start(durationSeconds: number): void {
    const clampedDuration = Math.max(1, durationSeconds);
    const wasActive = this.active;
    this.active = true;
    this.timeLeft = Math.max(this.timeLeft, clampedDuration);
    if (!wasActive) {
      this.game.msg('A sand storm rolls in. Visibility is reduced.', 'warn');
    }
  }

  update(dt: number): void {
    if (!this.active) return;
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.active = false;
      this.timeLeft = 0;
      this.game.msg('The sand storm clears.', 'info');
    }
  }

  getVisionSources(): Colonist[] {
    return this.game.colonists.filter((c) => {
      if (!c.alive) return false;
      const hiddenInside = c.inside && (c.inside as any).kind !== 'bed';
      return !hiddenInside;
    });
  }

  isPointVisible(x: number, y: number, sources: Colonist[]): boolean {
    const radius = this.visionRadius;
    const radiusSq = radius * radius;
    for (const source of sources) {
      const dx = x - source.x;
      const dy = y - source.y;
      if (dx * dx + dy * dy > radiusSq) continue;
      if (this.hasLineOfSight(source, { x, y })) return true;
    }
    return false;
  }

  renderFog(ctx: CanvasRenderingContext2D, sources: Colonist[]): void {
    const radius = this.visionRadius;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 13, 10, 0.72)';
    ctx.fillRect(0, 0, WORLD.w, WORLD.h);

    ctx.globalCompositeOperation = 'destination-out';
    for (const source of sources) {
      const gradient = ctx.createRadialGradient(
        source.x,
        source.y,
        radius * 0.2,
        source.x,
        source.y,
        radius
      );
      gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
      gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.85)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(source.x, source.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private hasLineOfSight(from: { x: number; y: number }, to: { x: number; y: number }): boolean {
    for (const b of this.game.buildings) {
      if (b.kind === 'hq' || b.kind === 'path' || b.kind === 'house' || b.kind === 'farm' || b.kind === 'bed' || !b.done) {
        continue;
      }

      if (this.lineIntersectsRect(from.x, from.y, to.x, to.y, b)) {
        return false;
      }
    }
    return true;
  }

  private lineIntersectsRect(x1: number, y1: number, x2: number, y2: number, r: Building): boolean {
    const xMin = r.x;
    const xMax = r.x + r.w;
    const yMin = r.y;
    const yMax = r.y + r.h;
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    if (maxX < xMin || minX > xMax || maxY < yMin || minY > yMax) return false;

    const intersectsEdge = (
      ax1: number,
      ay1: number,
      ax2: number,
      ay2: number,
      bx1: number,
      by1: number,
      bx2: number,
      by2: number
    ) => {
      const denom = (ax1 - ax2) * (by1 - by2) - (ay1 - ay2) * (bx1 - bx2);
      if (denom === 0) return false;
      const t = ((ax1 - bx1) * (by1 - by2) - (ay1 - by1) * (bx1 - bx2)) / denom;
      const u = ((ax1 - bx1) * (ay1 - ay2) - (ay1 - by1) * (ax1 - ax2)) / denom;
      return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    };

    if (intersectsEdge(x1, y1, x2, y2, xMin, yMin, xMax, yMin)) return true;
    if (intersectsEdge(x1, y1, x2, y2, xMax, yMin, xMax, yMax)) return true;
    if (intersectsEdge(x1, y1, x2, y2, xMax, yMax, xMin, yMax)) return true;
    if (intersectsEdge(x1, y1, x2, y2, xMin, yMax, xMin, yMin)) return true;
    return false;
  }
}
