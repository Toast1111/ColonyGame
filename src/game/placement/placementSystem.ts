import { BUILD_TYPES, hasCost, makeBuilding, payCost } from "../buildings";
import { T, WORLD } from "../constants";
import { clamp } from "../../core/utils";
import { setFloorRect, FloorType, getFloorTypeId, getFloorTypeFromId } from "../terrain";
import { syncTerrainToGrid } from "../../core/pathfinding";
import type { Building } from "../types";
import type { Game } from "../Game";

// Placement validation
export function canPlace(game: Game, def: Building, x: number, y: number) {
  const w = (def as any).w ?? def.size.w * T;
  const h = (def as any).h ?? def.size.h * T;
  const rect = { x, y, w, h };
  if (rect.x < 0 || rect.y < 0 || rect.x + rect.w > WORLD.w || rect.y + rect.h > WORLD.h) return false;
  for (const b of game.buildings) {
    if (!(rect.x + rect.w <= b.x || rect.x >= b.x + b.w || rect.y + rect.h <= b.y || rect.y >= b.y + b.h)) return false;
  }
  const circleRectOverlap = (c: { x: number; y: number; r: number }, r: { x: number; y: number; w: number; h: number }) => {
    const cx = Math.max(r.x, Math.min(c.x, r.x + r.w));
    const cy = Math.max(r.y, Math.min(c.y, r.y + r.h));
    const dx = c.x - cx, dy = c.y - cy; return (dx * dx + dy * dy) <= (c.r * c.r);
  };
  for (const t of game.trees) { if (circleRectOverlap(t, rect)) return false; }
  for (const r of game.rocks) { if (circleRectOverlap(r, rect)) return false; }
  return true;
}

// Immediate placement (desktop or confirmed touch)
export function tryPlaceNow(game: Game, t: keyof typeof BUILD_TYPES, wx: number, wy: number, rot?: 0|90|180|270) {
  const def = BUILD_TYPES[t]; if (!def) return;
  
  // Check if this is a floor type (terrain system)
  if (def.isFloor && def.floorType) {
    const gx = Math.floor(wx / T);
    const gy = Math.floor(wy / T);
    
    // Check bounds
    if (gx < 0 || gy < 0 || gx >= game.grid.cols || gy >= game.grid.rows) {
      game.toast("Can't place here");
      return;
    }
    
    // Check if floor already exists
    const idx = gy * game.grid.cols + gx;
    const currentFloor = getFloorTypeFromId(game.terrainGrid.floors[idx]);
    if (currentFloor !== FloorType.NONE) {
      game.toast("Floor already exists here");
      return;
    }
    
    // Check if overlaps non-floor building
    const wx_tile = gx * T;
    const wy_tile = gy * T;
    const overlapsBuilding = game.buildings.some(b => {
      const overlap = !(wx_tile + T <= b.x || wx_tile >= b.x + b.w || wy_tile + T <= b.y || wy_tile >= b.y + b.h);
      return overlap;
    });
    
    if (overlapsBuilding) {
      game.toast("Can't place floor under building");
      return;
    }
    
    // Check cost (don't pay yet - pay when colonist starts building)
    if (!hasCost(game.RES, def.cost)) { 
      game.toast('Not enough resources'); 
      return; 
    }
    
    // Pay cost immediately (resources are reserved for construction)
    payCost(game.RES, def.cost);
    
    // Create a construction marker building
    // This will be built by colonists, then converted to a floor
    const floorBuilding = makeBuilding(t, wx_tile + 1, wy_tile + 1);
    (floorBuilding as any).isFloorConstruction = true; // Flag to identify floor constructions
    (floorBuilding as any).floorType = def.floorType;
    
    game.buildings.push(floorBuilding);
    game.rebuildNavGrid();
    game.toast(`Placed ${def.name} blueprint`);
    game.playAudio('buildings.placement.confirm');
    return;
  }
  
  // Regular building placement
  const b = makeBuilding(t, wx, wy);
  if (rot) { (b as any).rot = rot; if (rot === 90 || rot === 270) { const tmp = b.w; b.w = b.h; b.h = tmp; } }
  if (!canPlace(game, b as any, b.x, b.y)) { game.toast("Can't place here"); return; }
  if (!hasCost(game.RES, def.cost)) { game.toast('Not enough resources'); return; }
  payCost(game.RES, def.cost);
  if (b.kind !== 'path') {
    for (let i = game.buildings.length - 1; i >= 0; i--) {
      const pb = game.buildings[i];
      if (pb.kind === 'path') {
        const overlap = !(b.x + b.w <= pb.x || b.x >= pb.x + pb.w || b.y + b.h <= pb.y || b.y >= pb.y + pb.h);
        if (overlap) game.buildings.splice(i, 1);
      }
    }
  }
  game.buildings.push(b);
  game.rebuildNavGrid();
  game.playAudio('buildings.placement.confirm');
}

// Entry point from click/tap
export function placeAtMouse(game: Game) {
  const t = game.selectedBuild; if (!t) return; const def = BUILD_TYPES[t]; if (!def) return;
  if (!game.debug.forceDesktopMode && game.isActuallyTouchDevice && game.lastInputWasTouch) {
    const gx = Math.floor(game.mouse.wx / T) * T;
    const gy = Math.floor(game.mouse.wy / T) * T;
    game.pendingPlacement = { key: t, x: gx, y: gy, rot: 0 };
    return;
  }
  tryPlaceNow(game, t, game.mouse.wx, game.mouse.wy);
}

export function nudgePending(game: Game, dx: number, dy: number) {
  if (!game.pendingPlacement) return;
  const def = BUILD_TYPES[game.pendingPlacement.key];
  const nx = game.pendingPlacement.x + dx * T;
  const ny = game.pendingPlacement.y + dy * T;
  const rot = game.pendingPlacement.rot || 0; const rotated = (rot === 90 || rot === 270);
  const w = (rotated ? def.size.h : def.size.w) * T, h = (rotated ? def.size.w : def.size.h) * T;
  game.pendingPlacement.x = clamp(nx, 0, WORLD.w - w);
  game.pendingPlacement.y = clamp(ny, 0, WORLD.h - h);
}

export function rotatePending(game: Game, delta: -90 | 90) {
  if (!game.pendingPlacement) return;
  const def = BUILD_TYPES[game.pendingPlacement.key];
  const next = (((game.pendingPlacement.rot || 0) + delta + 360) % 360) as 0 | 90 | 180 | 270;
  game.pendingPlacement.rot = next;
  const rotated = (next === 90 || next === 270);
  const w = (rotated ? def.size.h : def.size.w) * T, h = (rotated ? def.size.w : def.size.h) * T;
  game.pendingPlacement.x = clamp(game.pendingPlacement.x, 0, WORLD.w - w);
  game.pendingPlacement.y = clamp(game.pendingPlacement.y, 0, WORLD.h - h);
}

export function confirmPending(game: Game) {
  if (!game.pendingPlacement) return;
  const { key, x, y, rot } = game.pendingPlacement;
  const def = BUILD_TYPES[key];
  const b = makeBuilding(key, x + 1, y + 1);
  if (rot) { (b as any).rot = rot; if (rot === 90 || rot === 270) { const tmp = b.w; b.w = b.h; b.h = tmp; } }
  const valid = canPlace(game, b as any, b.x, b.y) && hasCost(game.RES, def.cost);
  if (!valid) { game.toast("Can't place here"); return; }
  game.pendingPlacement = null;
  game.placeUIRects = []; // Clean up placement UI
  tryPlaceNow(game, key, x + 1, y + 1, rot);
}

export function cancelPending(game: Game) { 
  game.pendingPlacement = null; 
  game.placeUIRects = []; // Clean up placement UI
  game.selectedBuild = null; // Clear selected build to fully cancel
}

export function paintPathAtMouse(game: Game, force = false) {
  const gx = Math.floor(game.mouse.wx / T); 
  const gy = Math.floor(game.mouse.wy / T);
  
  if (!force && game.lastPaintCell && game.lastPaintCell.gx === gx && game.lastPaintCell.gy === gy) return;
  
  // Determine floor type from selected build
  const selectedDef = game.selectedBuild ? BUILD_TYPES[game.selectedBuild] : null;
  let floorType = FloorType.BASIC_PATH; // Default
  let buildType = game.selectedBuild || 'floor_path';
  
  if (selectedDef?.isFloor && selectedDef.floorType) {
    const floorTypeMap: Record<string, FloorType> = {
      'BASIC_PATH': FloorType.BASIC_PATH,
      'STONE_ROAD': FloorType.STONE_ROAD,
      'WOODEN_FLOOR': FloorType.WOODEN_FLOOR,
      'CONCRETE': FloorType.CONCRETE,
      'METAL_FLOOR': FloorType.METAL_FLOOR,
      'CARPET': FloorType.CARPET
    };
    floorType = floorTypeMap[selectedDef.floorType] || FloorType.BASIC_PATH;
  }
  
  const tryPlace = (x: number, y: number) => {
    // Check if within world bounds
    if (x < 0 || y < 0 || x >= game.grid.cols || y >= game.grid.rows) return;
    
    // Check if there's already a floor here
    const idx = y * game.grid.cols + x;
    const existingFloor = getFloorTypeFromId(game.terrainGrid.floors[idx]);
    if (existingFloor !== FloorType.NONE) return; // Already has a floor
    
    // Check if overlaps a building or floor construction
    const wx = x * T;
    const wy = y * T;
    const overlapsBuilding = game.buildings.some(b => {
      const overlap = !(wx + T <= b.x || wx >= b.x + b.w || wy + T <= b.y || wy >= b.y + b.h);
      return overlap;
    });
    
    if (overlapsBuilding) return;
    
    // Check cost (use selected building's cost or default)
    const cost = selectedDef?.cost || { wood: 0 };
    if (!hasCost(game.RES, cost)) return;
    
    // Pay cost immediately (resources are reserved for construction)
    payCost(game.RES, cost);
    
    // Create construction marker
    const floorBuilding = makeBuilding(buildType as any, wx + 1, wy + 1);
    (floorBuilding as any).isFloorConstruction = true;
    (floorBuilding as any).floorType = selectedDef?.floorType || 'BASIC_PATH';
    
    game.buildings.push(floorBuilding);
  };
  
  if (game.lastPaintCell == null) {
    tryPlace(gx, gy);
    game.lastPaintCell = { gx, gy };
    game.rebuildNavGrid();
    return;
  }
  
  // Bresenham between last cell and current
  let x0 = game.lastPaintCell.gx, y0 = game.lastPaintCell.gy, x1 = gx, y1 = gy;
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1; 
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  
  while (true) {
    tryPlace(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err; 
    if (e2 > -dy) { err -= dy; x0 += sx; } 
    if (e2 < dx) { err += dx; y0 += sy; }
  }
  
  game.lastPaintCell = { gx, gy };
  game.rebuildNavGrid();
}

export function paintWallAtMouse(game: Game, force = false) {
  const gx = Math.floor(game.mouse.wx / T); const gy = Math.floor(game.mouse.wy / T);
  if (!force && game.lastPaintCell && game.lastPaintCell.gx === gx && game.lastPaintCell.gy === gy) return;
  const tryPlace = (x: number, y: number) => {
    const wx = x * T + 1, wy = y * T + 1;
    const b = makeBuilding('wall' as any, wx, wy);
    const exists = game.buildings.some(pb => pb.kind === 'wall' && pb.x === b.x && pb.y === b.y);
    if (exists) return;
    if (!hasCost(game.RES, BUILD_TYPES['wall'].cost)) return;
    if (!canPlace(game, b as any, b.x, b.y)) return;
    payCost(game.RES, BUILD_TYPES['wall'].cost);
    game.buildings.push(b);
  };
  if (game.lastPaintCell == null) {
    tryPlace(gx, gy); game.lastPaintCell = { gx, gy }; game.rebuildNavGrid(); return;
  }
  let x0 = game.lastPaintCell.gx, y0 = game.lastPaintCell.gy, x1 = gx, y1 = gy;
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1; const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  while (true) {
    tryPlace(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err; if (e2 > -dy) { err -= dy; x0 += sx; } if (e2 < dx) { err += dx; y0 += sy; }
  }
  game.lastPaintCell = { gx, gy }; game.rebuildNavGrid();
}

export function eraseInRect(game: Game, rect: { x: number; y: number; w: number; h: number }) {
  const before = game.buildings.length;
  for (let i = game.buildings.length - 1; i >= 0; i--) {
    const b = game.buildings[i]; if (b.kind === 'hq') continue;
    const overlap = !(rect.x + rect.w <= b.x || rect.x >= b.x + b.w || rect.y + rect.h <= b.y || rect.y >= b.y + b.h);
    if (overlap) { evictColonistsFrom(game, b); game.buildings.splice(i, 1); game.buildReservations.delete(b); game.insideCounts.delete(b); }
  }
  const removed = before - game.buildings.length;
  if (removed > 0) { game.msg(`Removed ${removed} structure(s)`); game.rebuildNavGrid(); }
}

export function cancelOrErase(game: Game) {
  const pos = { x: game.mouse.wx, y: game.mouse.wy };
  for (let i = game.buildings.length - 1; i >= 0; i--) {
    const b = game.buildings[i]; if (b.kind === 'hq') continue;
    if (pos.x >= b.x && pos.x <= b.x + b.w && pos.y >= b.y && pos.y <= b.y + b.h) {
      evictColonistsFrom(game, b);
      game.buildings.splice(i, 1);
      game.msg('Building removed');
      game.rebuildNavGrid();
      return;
    }
  }
  game.selectedBuild = null; game.toast('Build canceled');
}

export function evictColonistsFrom(game: Game, b: Building) {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  for (const c of game.colonists) {
    if (c.inside === b) {
      game.leaveBuilding(c);
      (c as any).safeTarget = null; (c as any).safeTimer = 0;
      const angle = Math.random() * Math.PI * 2;
      const rx = (b.w / 2 + 10) * Math.cos(angle);
      const ry = (b.h / 2 + 10) * Math.sin(angle);
      c.x = clamp(cx + rx, 0, WORLD.w);
      c.y = clamp(cy + ry, 0, WORLD.h);
    }
    if (c.reservedSleepFor === b) {
      game.releaseSleepReservation(c);
      (c as any).sleepTarget = undefined;
      (c as any).sleepTargetLockUntil = 0;
    }
  }
}
