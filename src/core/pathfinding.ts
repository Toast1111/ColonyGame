import { T, WORLD } from "../game/constants";

export type Grid = { cols: number; rows: number; solid: Uint8Array; cost: Float32Array };

export function makeGrid(): Grid {
  const cols = Math.ceil(WORLD.w / T);
  const rows = Math.ceil(WORLD.h / T);
  return { cols, rows, solid: new Uint8Array(cols * rows), cost: new Float32Array(cols * rows).fill(1) };
}

export function clearGrid(g: Grid) { g.solid.fill(0); g.cost.fill(1); }

export function markRectSolid(g: Grid, x: number, y: number, w: number, h: number) {
  const gx = Math.floor(x / T), gy = Math.floor(y / T); const gw = Math.ceil(w / T), gh = Math.ceil(h / T);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const cx = gx + i, cy = gy + j; if (cx < 0 || cy < 0 || cx >= g.cols || cy >= g.rows) continue;
    g.solid[cy * g.cols + cx] = 1;
  }
}

export function markRectCost(g: Grid, x: number, y: number, w: number, h: number, value: number) {
  const gx = Math.floor(x / T), gy = Math.floor(y / T); const gw = Math.ceil(w / T), gh = Math.ceil(h / T);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const cx = gx + i, cy = gy + j; if (cx < 0 || cy < 0 || cx >= g.cols || cy >= g.rows) continue;
    const idx = cy * g.cols + cx;
    g.cost[idx] = Math.min(g.cost[idx], value);
  }
}

function h(ax: number, ay: number, bx: number, by: number) { return Math.abs(ax - bx) + Math.abs(ay - by); }

export function aStar(g: Grid, sx: number, sy: number, tx: number, ty: number): { x: number; y: number }[] | null {
  const cols = g.cols, rows = g.rows;
  const start = { x: Math.floor(sx / T), y: Math.floor(sy / T) };
  const goal = { x: Math.floor(tx / T), y: Math.floor(ty / T) };
  const idx = (x: number, y: number) => y * cols + x;
  if (start.x === goal.x && start.y === goal.y) return [{ x: tx, y: ty }];
  const open: number[] = []; const came = new Int32Array(cols * rows).fill(-1);
  const gScore = new Int32Array(cols * rows).fill(1e9);
  const fScore = new Int32Array(cols * rows).fill(1e9);
  const push = (x: number, y: number) => { const i = idx(x, y); open.push(i); };
  const popBest = () => {
    let bi = 0, bv = 1e9; for (let i = 0; i < open.length; i++) { const v = fScore[open[i]]; if (v < bv) { bv = v; bi = i; } }
    const id = open.splice(bi, 1)[0]; return id;
  };
  const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < cols && y < rows;
  const sId = idx(start.x, start.y);
  const gId = idx(goal.x, goal.y);
  const passable = (x: number, y: number) => {
    if (!inBounds(x, y)) return false;
    const id = idx(x, y);
    // Allow start/goal tiles even if marked solid (e.g., spawn inside HQ or target inside a structure)
    if (id === sId || id === gId) return true;
    return g.solid[id] === 0;
  };
  gScore[sId] = 0; fScore[sId] = h(start.x, start.y, goal.x, goal.y); push(start.x, start.y);
  const neigh = [[1,0],[-1,0],[0,1],[0,-1]] as const;
  while (open.length) {
    const cur = popBest(); const cx = cur % cols; const cy = (cur / cols) | 0;
    if (cx === goal.x && cy === goal.y) {
      let path: { x: number; y: number }[] = [];
      let id = cur;
      while (id !== -1) { const x = id % cols, y = (id / cols) | 0; path.push({ x: x * T + T / 2, y: y * T + T / 2 }); id = came[id]; }
      path.reverse(); path[path.length - 1] = { x: tx, y: ty }; // ensure final exact target
      // Smooth path by removing intermediate waypoints with line-of-sight
      const smooth: { x: number; y: number }[] = [];
      const clearLine = (ax: number, ay: number, bx: number, by: number) => {
        // sample along the segment at small steps and verify tiles are not solid
        const dx = bx - ax, dy = by - ay;
        const len = Math.hypot(dx, dy) || 1; const step = Math.max(6, T * 0.33);
        const n = Math.ceil(len / step);
        for (let i = 1; i < n; i++) {
          const t = i / n; const x = ax + dx * t; const y = ay + dy * t;
          const gx = Math.floor(x / T), gy = Math.floor(y / T);
          if (gx < 0 || gy < 0 || gx >= g.cols || gy >= g.rows) return false;
          if (g.solid[gy * g.cols + gx]) return false;
        }
        return true;
      };
      let i = 0; while (i < path.length) {
        smooth.push(path[i]);
        let j = i + 2; // try to skip at least one point
        let lastGood = i + 1;
        while (j < path.length) {
          if (clearLine(path[i].x, path[i].y, path[j].x, path[j].y)) { lastGood = j; j++; } else break;
        }
        i = lastGood;
      }
      if (smooth.length >= 2) path = smooth;
      return path;
    }
    for (const [dx, dy] of neigh) {
      const nx = cx + dx, ny = cy + dy; if (!passable(nx, ny)) continue;
      const ni = idx(nx, ny);
      
      // Calculate actual traversal time based on movement speed on this tile
      const tileCost = g.cost[ni] || 1;
      let traversalTime = 1; // base time to cross one tile
      
      // If this is a fast tile (path), reduce traversal time
      if (tileCost <= 0.7) {
        // Path tiles give +25 speed bonus (50 base -> 75 total = 1.5x speed = 0.67x time)
        traversalTime = 1 / 1.5; // ~0.67
      }
      
      const tentative = gScore[cur] + traversalTime;
      if (tentative < gScore[ni]) {
        came[ni] = cur; gScore[ni] = tentative; fScore[ni] = tentative + h(nx, ny, goal.x, goal.y);
        if (!open.includes(ni)) open.push(ni);
      }
    }
  }
  return null;
}
