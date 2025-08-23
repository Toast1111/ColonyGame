import { T } from "../game/constants";

export interface Grid {
  cols: number;
  rows: number;
  solid: Uint8Array;
  cost: Float32Array;
  minCost: number;
}

function h(ax: number, ay: number, bx: number, by: number) {
  // Manhattan; scaled later by g.minCost for admissibility
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

export function makeGrid(): Grid {
  const cols = Math.ceil(7680 / T); // WORLD.w / T
  const rows = Math.ceil(7680 / T); // WORLD.h / T
  const size = cols * rows;

  return {
    cols,
    rows,
    solid: new Uint8Array(size),
    cost: new Float32Array(size).fill(1.0),
    minCost: 1.0, // start at 1.0 (grass). markRectCost will lower this when you paint roads.
  };
}

export function clearGrid(grid: Grid): void {
  grid.solid.fill(0);
  grid.cost.fill(1.0);
  grid.minCost = 1.0;
}

export function markRectSolid(grid: Grid, x: number, y: number, w: number, h: number): void {
  const startX = Math.floor(x / T);
  const startY = Math.floor(y / T);
  const endX = Math.floor((x + w) / T);
  const endY = Math.floor((y + h) / T);

  for (let gy = startY; gy <= endY; gy++) {
    for (let gx = startX; gx <= endX; gx++) {
      if (gx >= 0 && gy >= 0 && gx < grid.cols && gy < grid.rows) {
        const idx = gy * grid.cols + gx;
        grid.solid[idx] = 1;
      }
    }
  }
}

export function markCircleSolid(grid: Grid, cx: number, cy: number, radius: number): void {
  const startX = Math.floor((cx - radius) / T);
  const startY = Math.floor((cy - radius) / T);
  const endX = Math.floor((cx + radius) / T);
  const endY = Math.floor((cy + radius) / T);

  for (let gy = startY; gy <= endY; gy++) {
    for (let gx = startX; gx <= endX; gx++) {
      if (gx >= 0 && gy >= 0 && gx < grid.cols && gy < grid.rows) {
        // Check if tile center is within circle
        const tileCenterX = gx * T + T / 2;
        const tileCenterY = gy * T + T / 2;
        const dx = tileCenterX - cx;
        const dy = tileCenterY - cy;
        if (dx * dx + dy * dy <= radius * radius) {
          const idx = gy * grid.cols + gx;
          grid.solid[idx] = 1;
        }
      }
    }
  }
}

export function markRectCost(grid: Grid, x: number, y: number, w: number, h: number, cost: number): void {
  const startX = Math.floor(x / T);
  const startY = Math.floor(y / T);
  const endX = Math.floor((x + w) / T);
  const endY = Math.floor((y + h) / T);
  
  for (let gy = startY; gy <= endY; gy++) {
    for (let gx = startX; gx <= endX; gx++) {
      if (gx >= 0 && gy >= 0 && gx < grid.cols && gy < grid.rows) {
        const idx = gy * grid.cols + gx;
        grid.cost[idx] = cost;
        if (cost < grid.minCost) grid.minCost = cost; // keep heuristic admissible
      }
    }
  }
}/* ---------- helpers for road-centerline adherence ---------- */

const ROAD_THRESHOLD = 0.7; // tiles with cost <= this are considered "road/path"

// Road cost constants - ensures all roads stay within optimal range
export const ROAD_COSTS = {
  BASIC_PATH: 0.6,      // Standard path cost
  FAST_ROAD: 0.5,       // Premium road for high traffic
  SLOW_PATH: 0.7,       // Rough path, still faster than grass
  GRASS: 1.0,           // Default terrain cost
  ROUGH_TERRAIN: 1.5    // Slower terrain
} as const;

function isRoadIdx(g: Grid, i: number) {
  return g.cost[i] <= ROAD_THRESHOLD;
}
function isRoad(g: Grid, x: number, y: number) {
  const gx = Math.floor(x / T), gy = Math.floor(y / T);
  if (gx < 0 || gy < 0 || gx >= g.cols || gy >= g.rows) return false;
  return isRoadIdx(g, gy * g.cols + gx);
}

// Helper function to mark roads with proper cost validation
export function markRoadPath(grid: Grid, x: number, y: number, w: number, h: number, roadType: keyof typeof ROAD_COSTS = 'BASIC_PATH'): void {
  // Ensure road costs stay within the optimal range of 0.5-0.7
  const cost = ROAD_COSTS[roadType];
  const clampedCost = Math.max(0.5, Math.min(0.7, cost));
  markRectCost(grid, x, y, w, h, clampedCost);
}
function tileOf(x: number, y: number) {
  return { gx: Math.floor(x / T), gy: Math.floor(y / T) };
}
function snapRoadCenters(g: Grid, path: { x: number; y: number }[]) {
  for (let k = 0; k < path.length; k++) {
    const gx = Math.floor(path[k].x / T), gy = Math.floor(path[k].y / T);
    if (gx >= 0 && gy >= 0 && gx < g.cols && gy < g.rows) {
      const id = gy * g.cols + gx;
      if (isRoadIdx(g, id)) {
        path[k].x = gx * T + T / 2;
        path[k].y = gy * T + T / 2;
      }
    }
  }
}
function makesRightAngleCorner(g: Grid, a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) {
  const A = tileOf(a.x, a.y), B = tileOf(b.x, b.y), C = tileOf(c.x, c.y);
  const dx1 = Math.sign(B.gx - A.gx), dy1 = Math.sign(B.gy - A.gy);
  const dx2 = Math.sign(C.gx - B.gx), dy2 = Math.sign(C.gy - B.gy);
  const corner = (dx1 !== 0 && dy2 !== 0) || (dy1 !== 0 && dx2 !== 0);
  const bIdx = B.gy * g.cols + B.gx;
  return corner && bIdx >= 0 && bIdx < g.cost.length && isRoadIdx(g, bIdx);
}

export function aStar(
  g: Grid, sx: number, sy: number, tx: number, ty: number
): { x: number; y: number }[] | null {
  const cols = g.cols, rows = g.rows;
  const start = { x: Math.floor(sx / T), y: Math.floor(sy / T) };
  const goal = { x: Math.floor(tx / T), y: Math.floor(ty / T) };
  const idx = (x: number, y: number) => y * cols + x;

  if (start.x === goal.x && start.y === goal.y) return [{ x: tx, y: ty }];

  const sId = idx(start.x, start.y);
  const gId = idx(goal.x, goal.y);

  const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < cols && y < rows;
  const passable = (x: number, y: number) => {
    if (!inBounds(x, y)) return false;
    const id = idx(x, y);
    if (id === sId || id === gId) return true; // allow start/goal even if inside solids
    return g.solid[id] === 0;
  };

  // Use floats for scores since we’re doing real costs
  const came = new Int32Array(cols * rows).fill(-1);
  const gScore = new Float32Array(cols * rows).fill(Infinity);
  const fScore = new Float32Array(cols * rows).fill(Infinity);
  const closed = new Uint8Array(cols * rows); // 0/1

  // Open set as a simple array of ids; allow duplicates; skip closed on pop
  const open: number[] = [];
  const push = (id: number) => { open.push(id); };
  const popBest = () => {
    let bi = -1, bv = Infinity;
    for (let i = 0; i < open.length; i++) {
      const id = open[i];
      if (closed[id]) continue; // don't consider already-closed
      const v = fScore[id];
      if (v < bv) { bv = v; bi = i; }
    }
    if (bi === -1) return -1; // no valid nodes
    const id = open.splice(bi, 1)[0];
    return id;
  };

  // Heuristic scale: ensure admissible with min step cost (<= 1 if you have faster tiles)
  const hScale = Math.max(0.0001, g.minCost); // never 0
  gScore[sId] = 0;
  fScore[sId] = h(start.x, start.y, goal.x, goal.y) * hScale;
  push(sId);

  const neigh = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

  while (open.length) {
    const cur = popBest();
    if (cur === -1) break;  // exhausted
    if (closed[cur]) continue;
    closed[cur] = 1;

    const cx = cur % cols;
    const cy = (cur / cols) | 0;

    if (cur === gId) {
      // Reconstruct path (tile centers)
      let path: { x: number; y: number }[] = [];
      let id = cur;
      while (id !== -1) {
        const x = id % cols, y = (id / cols) | 0;
        path.push({ x: x * T + T / 2, y: y * T + T / 2 });
        id = came[id];
      }
      path.reverse();
      // ensure exact target
      path[path.length - 1] = { x: tx, y: ty };

      // Densify: only when needed; skip straight road segments so line stays centered
      const dense: { x: number; y: number }[] = [];
      for (let k = 0; k < path.length - 1; k++) {
        const a = path[k], b = path[k + 1];
        dense.push(a);

        const agx = Math.floor(a.x / T), agy = Math.floor(a.y / T);
        const bgx = Math.floor(b.x / T), bgy = Math.floor(b.y / T);
        const aIdx = agy * cols + agx, bIdx = bgy * cols + bgx;

        const bothRoad = isRoadIdx(g, aIdx) && isRoadIdx(g, bIdx);
        const sameRow = agy === bgy, sameCol = agx === bgx;

        if (bothRoad && (sameRow || sameCol)) {
          // Perfectly aligned along road centerline: no midpoints needed
        } else if (bothRoad) {
          // Diagonal-ish (rare with 4-neighbors) — keep your interpolation, we’ll snap later
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);
          const nMid = Math.floor(dist / 18);
          for (let j = 1; j <= nMid; j++) {
            const t = j / (nMid + 1);
            dense.push({ x: a.x + dx * t, y: a.y + dy * t });
          }
        } else {
          // off-road or mixed: optional interpolation
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);
          const nMid = Math.floor(dist / 24);
          for (let j = 1; j <= nMid; j++) {
            const t = j / (nMid + 1);
            dense.push({ x: a.x + dx * t, y: a.y + dy * t });
          }
        }
      }
      dense.push(path[path.length - 1]);
      path = dense;

      // Smoothing: keep inside passable; if both ends are on-road, require majority of samples also be on-road.
      const clearLine = (ax: number, ay: number, bx: number, by: number) => {
        const dx = bx - ax, dy = by - ay;
        const len = Math.hypot(dx, dy) || 1;
        const step = Math.max(6, T * 0.33);
        const n = Math.ceil(len / step);
        let roadHits = 0, total = 0;

        for (let i = 1; i < n; i++) {
          const t = i / n;
          const x = ax + dx * t, y = ay + dy * t;
          const gx = Math.floor(x / T), gy = Math.floor(y / T);
          if (gx < 0 || gy < 0 || gx >= g.cols || gy >= g.rows) return false;
          const id = gy * g.cols + gx;
          if (g.solid[id]) return false;
          if (g.cost[id] <= ROAD_THRESHOLD) roadHits++;
          total++;
        }
        const aRoad = isRoad(g, ax, ay);
        const bRoad = isRoad(g, bx, by);
        if (aRoad && bRoad && total > 0) return (roadHits / total) >= 0.6; // keep inside corridor
        return true;
      };

      const smooth: { x: number; y: number }[] = [];
      let i = 0;
      while (i < path.length) {
        smooth.push(path[i]);
        let j = i + 2, lastGood = i + 1;
        while (j < path.length) {
          // DO NOT skip a right-angle road corner at i+1
          if (makesRightAngleCorner(g, path[i], path[i + 1], path[j])) break;

          if (clearLine(path[i].x, path[i].y, path[j].x, path[j].y)) { lastGood = j; j++; }
          else break;
        }
        i = lastGood;
      }
      path = smooth.length >= 2 ? smooth : path;

      // Final snap so the drawn polyline sits exactly on road centers
      snapRoadCenters(g, path);

      return path;
    }

    for (const [dx, dy] of neigh) {
      const nx = cx + dx, ny = cy + dy;
      if (!passable(nx, ny)) continue;
      const ni = ny * cols + nx;

      const stepCost = g.cost[ni] || 1; // true per-tile traversal time
      const tentative = gScore[cur] + stepCost;

      if (tentative < gScore[ni]) {
        came[ni] = cur;
        gScore[ni] = tentative;

        // Small tie-break bias toward straight-ish approaches
        const heuristic = h(nx, ny, goal.x, goal.y) * Math.max(0.0001, g.minCost) * 0.9999;
        fScore[ni] = tentative + heuristic;

        // Always push; duplicates are fine (closed[] will cull)
        push(ni);
      }
    }
  }
  return null;
}
