import { T } from "../game/constants";
import type { TerrainGrid } from "../game/terrain";
import { calculateMovementCost, isTerrainPassable } from "../game/terrain";

export interface Grid {
  cols: number;
  rows: number;
  solid: Uint8Array;
  cost: Float32Array;
  minCost: number;
  // Sectioning for dynamic updates
  sectionSize: number;
  sectionCols: number;
  sectionRows: number;
  dirtyFlags: Uint8Array; // Track which sections need rebuilding
  // NEW: Optional terrain grid for biome-based movement costs
  terrainGrid?: TerrainGrid;
}

function h(ax: number, ay: number, bx: number, by: number) {
  // Manhattan; scaled later by g.minCost for admissibility
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

export function makeGrid(): Grid {
  const cols = Math.ceil(7680 / T); // WORLD.w / T
  const rows = Math.ceil(7680 / T); // WORLD.h / T
  const size = cols * rows;

  // Section configuration - adjust this to balance update speed vs granularity
  const sectionSize = 32; // Each section is 32x32 tiles
  const sectionCols = Math.ceil(cols / sectionSize);
  const sectionRows = Math.ceil(rows / sectionSize);
  const numSections = sectionCols * sectionRows;

  return {
    cols,
    rows,
    solid: new Uint8Array(size),
    cost: new Float32Array(size).fill(1.0),
    minCost: 1.0, // start at 1.0 (grass). markRectCost will lower this when you paint roads.
    sectionSize,
    sectionCols,
    sectionRows,
    dirtyFlags: new Uint8Array(numSections), // Initially all clean
  };
}

export function clearGrid(grid: Grid): void {
  grid.solid.fill(0);
  grid.cost.fill(1.0);
  grid.minCost = 1.0;
  grid.dirtyFlags.fill(1); // Mark all sections as dirty after clear
}

/**
 * Clear only a specific area of the grid (for partial rebuilds)
 * Much faster than clearing the entire grid
 */
export function clearGridArea(grid: Grid, startX: number, startY: number, width: number, height: number): void {
  // Use partial terrain sync instead of inline logic
  if (grid.terrainGrid) {
    syncTerrainToGridPartial(grid, startX, startY, width, height);
  } else {
    // Fallback: clear to default passable state
    const endX = Math.min(grid.cols, startX + width);
    const endY = Math.min(grid.rows, startY + height);
    
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const idx = y * grid.cols + x;
        grid.solid[idx] = 0;
        grid.cost[idx] = 1.0;
      }
    }
    
    // Mark affected sections as dirty
    const startSectionX = Math.floor(startX / grid.sectionSize);
    const startSectionY = Math.floor(startY / grid.sectionSize);
    const endSectionX = Math.min(grid.sectionCols - 1, Math.floor((endX - 1) / grid.sectionSize));
    const endSectionY = Math.min(grid.sectionRows - 1, Math.floor((endY - 1) / grid.sectionSize));
    
    for (let sy = startSectionY; sy <= endSectionY; sy++) {
      for (let sx = startSectionX; sx <= endSectionX; sx++) {
        const sectionIdx = sy * grid.sectionCols + sx;
        grid.dirtyFlags[sectionIdx] = 1;
      }
    }
  }
}

/**
 * Sync terrain grid costs to pathfinding grid (FULL - all cells)
 * Call this after modifying terrain or floors to update pathfinding
 * WARNING: Slow! Processes all 57,600 cells. Use syncTerrainToGridPartial when possible.
 */
export function syncTerrainToGrid(grid: Grid): void {
  if (!grid.terrainGrid) return;
  
  const { cols, rows, terrainGrid } = grid;
  let minCost = Infinity;
  
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x;
      
      // Calculate cost from terrain + floor layers
      const cost = calculateMovementCost(terrainGrid, x, y);
      grid.cost[idx] = cost;
      
      // Track minimum cost for A* heuristic admissibility
      if (cost < minCost && cost > 0) {
        minCost = cost;
      }
      
      // Mark impassable terrain as solid, passable terrain as clear
      if (!isTerrainPassable(terrainGrid, x, y)) {
        grid.solid[idx] = 1;
      } else {
        grid.solid[idx] = 0;
      }
    }
  }
  
  grid.minCost = minCost;
  grid.dirtyFlags.fill(1); // Mark all sections dirty
}

/**
 * Sync terrain grid costs for a specific area only (FAST)
 * Much faster than full sync - only processes affected cells
 */
export function syncTerrainToGridPartial(
  grid: Grid,
  startX: number,
  startY: number,
  width: number,
  height: number
): void {
  if (!grid.terrainGrid) return;
  
  const { cols, rows, terrainGrid } = grid;
  const endX = Math.min(cols, startX + width);
  const endY = Math.min(rows, startY + height);
  
  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const idx = y * cols + x;
      
      // Calculate cost from terrain + floor layers
      const cost = calculateMovementCost(terrainGrid, x, y);
      grid.cost[idx] = cost;
      
      // Mark impassable terrain as solid, passable terrain as clear
      if (!isTerrainPassable(terrainGrid, x, y)) {
        grid.solid[idx] = 1;
      } else {
        grid.solid[idx] = 0;
      }
    }
  }
  
  // Don't update minCost for partial sync - it's rarely needed and expensive to recalculate
  // Mark affected sections as dirty
  const startSectionX = Math.floor(startX / grid.sectionSize);
  const startSectionY = Math.floor(startY / grid.sectionSize);
  const endSectionX = Math.min(grid.sectionCols - 1, Math.floor((endX - 1) / grid.sectionSize));
  const endSectionY = Math.min(grid.sectionRows - 1, Math.floor((endY - 1) / grid.sectionSize));
  
  for (let sy = startSectionY; sy <= endSectionY; sy++) {
    for (let sx = startSectionX; sx <= endSectionX; sx++) {
      const sectionIdx = sy * grid.sectionCols + sx;
      grid.dirtyFlags[sectionIdx] = 1;
    }
  }
}

// Helper function to mark sections as dirty based on world coordinates
function markSectionsDirty(grid: Grid, x: number, y: number, w: number, h: number): void {
  const startSectionX = Math.floor(Math.floor(x / T) / grid.sectionSize);
  const startSectionY = Math.floor(Math.floor(y / T) / grid.sectionSize);
  const endSectionX = Math.floor(Math.floor((x + w - 1) / T) / grid.sectionSize);
  const endSectionY = Math.floor(Math.floor((y + h - 1) / T) / grid.sectionSize);

  for (let sy = Math.max(0, startSectionY); sy <= Math.min(grid.sectionRows - 1, endSectionY); sy++) {
    for (let sx = Math.max(0, startSectionX); sx <= Math.min(grid.sectionCols - 1, endSectionX); sx++) {
      const sectionIdx = sy * grid.sectionCols + sx;
      grid.dirtyFlags[sectionIdx] = 1;
    }
  }
}

// Helper function to mark sections as dirty based on grid coordinates  
function markSectionsDirtyByGridCoords(grid: Grid, gx: number, gy: number, gw: number, gh: number): void {
  const startSectionX = Math.floor(gx / grid.sectionSize);
  const startSectionY = Math.floor(gy / grid.sectionSize);
  const endSectionX = Math.floor((gx + gw - 1) / grid.sectionSize);
  const endSectionY = Math.floor((gy + gh - 1) / grid.sectionSize);

  for (let sy = Math.max(0, startSectionY); sy <= Math.min(grid.sectionRows - 1, endSectionY); sy++) {
    for (let sx = Math.max(0, startSectionX); sx <= Math.min(grid.sectionCols - 1, endSectionX); sx++) {
      const sectionIdx = sy * grid.sectionCols + sx;
      grid.dirtyFlags[sectionIdx] = 1;
    }
  }
}

export function markRectSolid(grid: Grid, x: number, y: number, w: number, h: number): void {
  const startX = Math.floor(x / T);
  const startY = Math.floor(y / T);
  const endX = Math.floor((x + w - 1) / T);  // Subtract 1 to avoid extra tile
  const endY = Math.floor((y + h - 1) / T);  // Subtract 1 to avoid extra tile

  for (let gy = startY; gy <= endY; gy++) {
    for (let gx = startX; gx <= endX; gx++) {
      if (gx >= 0 && gy >= 0 && gx < grid.cols && gy < grid.rows) {
        const idx = gy * grid.cols + gx;
        grid.solid[idx] = 1;
      }
    }
  }

  // Mark affected sections as dirty
  markSectionsDirty(grid, x, y, w, h);
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

  // Mark affected sections as dirty
  markSectionsDirty(grid, cx - radius, cy - radius, radius * 2, radius * 2);
}

export function markRectCost(grid: Grid, x: number, y: number, w: number, h: number, cost: number): void {
  const startX = Math.floor(x / T);
  const startY = Math.floor(y / T);
  const endX = Math.floor((x + w - 1) / T);  // Subtract 1 to avoid extra tile
  const endY = Math.floor((y + h - 1) / T);  // Subtract 1 to avoid extra tile
  
  for (let gy = startY; gy <= endY; gy++) {
    for (let gx = startX; gx <= endX; gx++) {
      if (gx >= 0 && gy >= 0 && gx < grid.cols && gy < grid.rows) {
        const idx = gy * grid.cols + gx;
        grid.cost[idx] = cost;
        if (cost < grid.minCost) grid.minCost = cost; // keep heuristic admissible
      }
    }
  }

  // Mark affected sections as dirty
  markSectionsDirty(grid, x, y, w, h);
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

// Main function to update only dirty sections of the nav mesh
export function updateDirtySections(grid: Grid, buildings: any[], trees: any[], rocks: any[]): void {
  // Only process sections that are marked as dirty
  for (let sy = 0; sy < grid.sectionRows; sy++) {
    for (let sx = 0; sx < grid.sectionCols; sx++) {
      const sectionIdx = sy * grid.sectionCols + sx;
      
      if (!grid.dirtyFlags[sectionIdx]) continue; // Skip clean sections
      
      // Clear this section
      clearSection(grid, sx, sy);
      
      // Rebuild this section with all relevant objects
      rebuildSection(grid, sx, sy, buildings, trees, rocks);
      
      // Mark section as clean
      grid.dirtyFlags[sectionIdx] = 0;
    }
  }
}

// Clear a specific section of the grid
function clearSection(grid: Grid, sectionX: number, sectionY: number): void {
  const startX = sectionX * grid.sectionSize;
  const startY = sectionY * grid.sectionSize;
  const endX = Math.min(startX + grid.sectionSize, grid.cols);
  const endY = Math.min(startY + grid.sectionSize, grid.rows);

  for (let gy = startY; gy < endY; gy++) {
    for (let gx = startX; gx < endX; gx++) {
      const idx = gy * grid.cols + gx;
      
      // Restore terrain/floor costs from terrain grid, or default to 1.0
      if (grid.terrainGrid) {
        grid.cost[idx] = calculateMovementCost(grid.terrainGrid, gx, gy);
        // Also restore solid state based on terrain passability
        grid.solid[idx] = isTerrainPassable(grid.terrainGrid, gx, gy) ? 0 : 1;
      } else {
        grid.cost[idx] = 1.0; // Fallback to grass cost
        grid.solid[idx] = 0; // Assume passable if no terrain grid
      }
    }
  }
}

// Rebuild a specific section with all relevant game objects
function rebuildSection(grid: Grid, sectionX: number, sectionY: number, buildings: any[], trees: any[], rocks: any[]): void {
  const startWorldX = sectionX * grid.sectionSize * T;
  const startWorldY = sectionY * grid.sectionSize * T;
  const endWorldX = (sectionX + 1) * grid.sectionSize * T;
  const endWorldY = (sectionY + 1) * grid.sectionSize * T;

  // Check buildings that intersect with this section
  for (const b of buildings) {
    if (intersectsRect(b.x, b.y, b.w, b.h, startWorldX, startWorldY, endWorldX - startWorldX, endWorldY - startWorldY)) {
      // Block buildings except HQ, paths, houses, and farms
  if (b.kind !== 'hq' && b.kind !== 'path' && b.kind !== 'house' && b.kind !== 'farm' && b.kind !== 'bed') {
        markRectSolidNoUpdate(grid, b.x, b.y, b.w, b.h);
      }
      // Path tiles reduce traversal cost using proper road cost system
      if (b.kind === 'path') {
        markRoadPathNoUpdate(grid, b.x, b.y, b.w, b.h, 'BASIC_PATH');
      }
      // Add door tiles for houses to naturally guide approach points
      if (b.kind === 'house' && b.done) {
        // Place a fast road tile at the bottom-center of the house (the "door")
        const doorX = b.x + b.w / 2 - T / 2; // Center horizontally
        const doorY = b.y + b.h; // Bottom edge
        markRoadPathNoUpdate(grid, doorX, doorY, T, T, 'FAST_ROAD');
      }
    }
  }

  // OPTIMIZATION: Trees and rocks no longer block pathfinding
  // Colonists can walk through them to eliminate stuttering from constant region rebuilds
  // They still prevent building placement (checked in placementSystem.ts)
}

// Intersection helpers
function intersectsRect(x1: number, y1: number, w1: number, h1: number, x2: number, y2: number, w2: number, h2: number): boolean {
  return !(x1 + w1 <= x2 || x1 >= x2 + w2 || y1 + h1 <= y2 || y1 >= y2 + h2);
}

function intersectsCircle(cx: number, cy: number, radius: number, rectX: number, rectY: number, rectW: number, rectH: number): boolean {
  // Check if circle intersects with rectangle
  const closestX = Math.max(rectX, Math.min(cx, rectX + rectW));
  const closestY = Math.max(rectY, Math.min(cy, rectY + rectH));
  const distX = cx - closestX;
  const distY = cy - closestY;
  return (distX * distX + distY * distY) <= (radius * radius);
}

// Non-updating versions of marking functions (for internal section rebuilding)
function markRectSolidNoUpdate(grid: Grid, x: number, y: number, w: number, h: number): void {
  const startX = Math.floor(x / T);
  const startY = Math.floor(y / T);
  const endX = Math.floor((x + w - 1) / T);
  const endY = Math.floor((y + h - 1) / T);

  for (let gy = startY; gy <= endY; gy++) {
    for (let gx = startX; gx <= endX; gx++) {
      if (gx >= 0 && gy >= 0 && gx < grid.cols && gy < grid.rows) {
        const idx = gy * grid.cols + gx;
        grid.solid[idx] = 1;
      }
    }
  }
}

function markCircleSolidNoUpdate(grid: Grid, cx: number, cy: number, radius: number): void {
  const startX = Math.floor((cx - radius) / T);
  const startY = Math.floor((cy - radius) / T);
  const endX = Math.floor((cx + radius) / T);
  const endY = Math.floor((cy + radius) / T);

  for (let gy = startY; gy <= endY; gy++) {
    for (let gx = startX; gx <= endX; gx++) {
      if (gx >= 0 && gy >= 0 && gx < grid.cols && gy < grid.rows) {
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

function markRoadPathNoUpdate(grid: Grid, x: number, y: number, w: number, h: number, roadType: keyof typeof ROAD_COSTS = 'BASIC_PATH'): void {
  const cost = ROAD_COSTS[roadType];
  const clampedCost = Math.max(0.5, Math.min(0.7, cost));
  
  const startX = Math.floor(x / T);
  const startY = Math.floor(y / T);
  const endX = Math.floor((x + w - 1) / T);
  const endY = Math.floor((y + h - 1) / T);
  
  for (let gy = startY; gy <= endY; gy++) {
    for (let gx = startX; gx <= endX; gx++) {
      if (gx >= 0 && gy >= 0 && gx < grid.cols && gy < grid.rows) {
        const idx = gy * grid.cols + gx;
        grid.cost[idx] = clampedCost;
        if (clampedCost < grid.minCost) grid.minCost = clampedCost;
      }
    }
  }
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

/**
 * Grid-based pathfinding specifically for enemies.
 * Returns a path of tile centers that forces grid-aligned movement (zigzag pattern).
 * This prevents the "snap-back" issue when paths are recalculated during target movement.
 * 
 * Key differences from regular pathfinding:
 * - Always returns exact tile centers
 * - No smoothing or interpolation
 * - 8-directional movement for more natural diagonal paths
 * - No road optimization (enemies don't prefer roads)
 * - REGION-AWARE: Checks reachability before running A* (major optimization!)
 * 
 * @param g - Pathfinding grid
 * @param fx - Start X (world coordinates)
 * @param fy - Start Y (world coordinates)
 * @param tx - Target X (world coordinates)
 * @param ty - Target Y (world coordinates)
 * @param regionManager - Optional region manager for reachability check (highly recommended!)
 */
export function computeEnemyPath(
  g: Grid,
  fx: number,
  fy: number,
  tx: number,
  ty: number,
  regionManager?: any  // RegionManager type (avoiding circular dependency)
): { x: number; y: number }[] | null {
  const { cols, rows } = g;

  // Convert to grid coordinates
  const start = { x: Math.floor(fx / T), y: Math.floor(fy / T) };
  const goal = { x: Math.floor(tx / T), y: Math.floor(ty / T) };

  // Validate coordinates
  if (start.x < 0 || start.y < 0 || start.x >= cols || start.y >= rows) return null;
  if (goal.x < 0 || goal.y < 0 || goal.x >= cols || goal.y >= rows) return null;

  const sId = start.y * cols + start.x;
  const gId = goal.y * cols + goal.x;

  // If already at goal
  if (sId === gId) return null;

  // Check if start or goal is blocked
  if (g.solid[sId] || g.solid[gId]) return null;

  // OPTIMIZATION: Check region reachability BEFORE running expensive A*
  // This prevents wasting CPU on impossible paths (e.g., enemy in different region)
  if (regionManager && regionManager.isEnabled && regionManager.isEnabled()) {
    const reachable = regionManager.isReachable(fx, fy, tx, ty);
    if (!reachable) {
      // Target is in a different, unreachable region - no path exists
      return null;
    }
  }

  // A* data structures
  const gScore = new Float32Array(cols * rows).fill(Infinity);
  const fScore = new Float32Array(cols * rows).fill(Infinity);
  const came = new Int32Array(cols * rows).fill(-1);
  const closed = new Uint8Array(cols * rows);
  const open: number[] = [];

  gScore[sId] = 0;
  fScore[sId] = h(start.x, start.y, goal.x, goal.y);
  open.push(sId);

  // Binary heap helpers
  const push = (id: number) => {
    open.push(id);
    let i = open.length - 1;
    while (i > 0) {
      const p = ((i - 1) >> 1);
      if (fScore[open[p]] <= fScore[open[i]]) break;
      const tmp = open[p]; open[p] = open[i]; open[i] = tmp;
      i = p;
    }
  };

  const popBest = (): number => {
    if (!open.length) return -1;
    const best = open[0];
    const last = open.pop()!;
    if (open.length > 0) {
      open[0] = last;
      let i = 0;
      while (true) {
        const l = (i << 1) + 1;
        const r = (i << 1) + 2;
        let smallest = i;
        if (l < open.length && fScore[open[l]] < fScore[open[smallest]]) smallest = l;
        if (r < open.length && fScore[open[r]] < fScore[open[smallest]]) smallest = r;
        if (smallest === i) break;
        const tmp = open[i]; open[i] = open[smallest]; open[smallest] = tmp;
        i = smallest;
      }
    }
    return best;
  };

  const passable = (gx: number, gy: number): boolean => {
    if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) return false;
    return !g.solid[gy * cols + gx];
  };

  // 8-directional movement for more natural diagonal movement
  const neighbors = [
    [1, 0],   // East
    [-1, 0],  // West
    [0, 1],   // South
    [0, -1],  // North
    [1, 1],   // Southeast
    [1, -1],  // Northeast
    [-1, 1],  // Southwest
    [-1, -1]  // Northwest
  ] as const;

  while (open.length) {
    const cur = popBest();
    if (cur === -1) break;
    if (closed[cur]) continue;
    closed[cur] = 1;

    const cx = cur % cols;
    const cy = (cur / cols) | 0;

    if (cur === gId) {
      // Reconstruct path - return ONLY tile centers, no interpolation
      const path: { x: number; y: number }[] = [];
      let id = cur;
      while (id !== -1) {
        const gx = id % cols;
        const gy = (id / cols) | 0;
        path.push({ x: gx * T + T / 2, y: gy * T + T / 2 });
        id = came[id];
      }
      path.reverse();

      // Remove start point if enemy is already very close to it
      if (path.length > 1) {
        const firstDist = Math.hypot(path[0].x - fx, path[0].y - fy);
        if (firstDist < T * 0.3) {
          path.shift();
        }
      }

      return path.length > 0 ? path : null;
    }

    for (const [dx, dy] of neighbors) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!passable(nx, ny)) continue;

      // For diagonal movement, check if path is blocked by corners
      if (dx !== 0 && dy !== 0) {
        // Prevent cutting through diagonal walls
        if (!passable(cx + dx, cy) && !passable(cx, cy + dy)) continue;
      }

      const ni = ny * cols + nx;

      // Diagonal moves cost more (sqrt(2) ≈ 1.414)
      const isDiagonal = dx !== 0 && dy !== 0;
      const moveCost = isDiagonal ? 1.414 : 1.0;
      const stepCost = moveCost * (g.cost[ni] || 1.0);
      const tentative = gScore[cur] + stepCost;

      if (tentative < gScore[ni]) {
        came[ni] = cur;
        gScore[ni] = tentative;
        
        // Use octile distance for 8-directional heuristic
        const heuristic = h(nx, ny, goal.x, goal.y) * Math.max(0.0001, g.minCost) * 0.9999;
        fScore[ni] = tentative + heuristic;

        push(ni);
      }
    }
  }

  return null;
}
