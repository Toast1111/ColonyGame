import type { Game } from "../Game";

export function lineIntersectsRect(x1: number, y1: number, x2: number, y2: number, r: { x: number; y: number; w: number; h: number }): boolean {
  const xMin = r.x, xMax = r.x + r.w;
  const yMin = r.y, yMax = r.y + r.h;
  const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
  if (maxX < xMin || minX > xMax || maxY < yMin || minY > yMax) return false;
  const intersectsEdge = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) => {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denom === 0) return false;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = ((x1 - x3) * (y1 - y2) - (y1 - y3) * (x1 - x2)) / denom;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  };
  if (intersectsEdge(x1, y1, x2, y2, xMin, yMin, xMax, yMin)) return true;
  if (intersectsEdge(x1, y1, x2, y2, xMax, yMin, xMax, yMax)) return true;
  if (intersectsEdge(x1, y1, x2, y2, xMax, yMax, xMin, yMax)) return true;
  if (intersectsEdge(x1, y1, x2, y2, xMin, yMax, xMin, yMin)) return true;
  return false;
}

export function hasLineOfFire(game: Game, from: { x: number; y: number }, to: { x: number; y: number }): boolean {
  for (const b of game.buildings) {
    if (b.kind === 'hq' || b.kind === 'path' || b.kind === 'house' || b.kind === 'farm' || !b.done) continue;
    const fromInside = from.x >= b.x && from.x <= b.x + b.w && from.y >= b.y && from.y <= b.y + b.h;
    if (fromInside) continue;
    if (lineIntersectsRect(from.x, from.y, to.x, to.y, b)) return false;
  }
  return true;
}

export function segmentIntersectsCircle(x1: number, y1: number, x2: number, y2: number, cx: number, cy: number, r: number): boolean {
  const dx = x2 - x1, dy = y2 - y1;
  const fx = x1 - cx, fy = y1 - cy;
  const a = dx*dx + dy*dy;
  const b = 2 * (fx*dx + fy*dy);
  const c = fx*fx + fy*fy - r*r;
  let disc = b*b - 4*a*c;
  if (disc < 0) return false;
  disc = Math.sqrt(disc);
  const t1 = (-b - disc) / (2*a);
  const t2 = (-b + disc) / (2*a);
  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
}

// Approximate RimWorld cover: if a wall is near the target along the line, reduce hit chance
export function coverPenalty(game: Game, from: { x: number; y: number }, to: { x: number; y: number }): number {
  let penalty = 0;
  for (const b of game.buildings) {
    if (!b.done || b.kind !== 'wall') continue;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const vx = to.x - from.x, vy = to.y - from.y;
    const wx = cx - from.x, wy = cy - from.y;
    const vv = vx*vx + vy*vy || 1;
    const t = Math.max(0, Math.min(1, (wx*vx + wy*vy) / vv));
    const px = from.x + t * vx, py = from.y + t * vy;
    const dist = Math.hypot(px - cx, py - cy);
    if (t > 0.75 && dist < Math.max(12, Math.min(b.w, b.h) * 0.6)) {
      penalty += 0.25;
    }
  }
  return Math.min(0.6, penalty);
}
