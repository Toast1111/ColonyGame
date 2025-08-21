import { clamp, dist2, rand, randi } from "../core/utils";
import { aStar, clearGrid, makeGrid, markRectSolid, markRectCost } from "../core/pathfinding";
import { COLORS, HQ_POS, NIGHT_SPAN, T, WORLD } from "./constants";
import type { Building, Bullet, Camera, Colonist, Enemy, Message } from "./types";
import { BUILD_TYPES, hasCost, makeBuilding, payCost, groupByCategory } from "./buildings";
import { applyWorldTransform, clear, drawBuilding, drawBullets, drawCircle, drawGround, drawHUD, drawPoly, drawPersonIcon, drawShieldIcon } from "./render";
import { updateColonistFSM } from "../ai/colonistFSM";
import { updateEnemyFSM } from "../ai/enemyFSM";

export class Game {
  canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D;
  DPR = 1;
  camera: Camera = { x: 0, y: 0, zoom: 1 };

  RES = { wood: 0, stone: 0, food: 0 };
  day = 1; tDay = 0; dayLength = 180; fastForward = 1; paused = false;
  prevIsNight = false;

  colonists: Colonist[] = [];
  enemies: Enemy[] = [];
  trees: Array<{ x: number; y: number; r: number; hp: number; type: 'tree' }> = [];
  rocks: Array<{ x: number; y: number; r: number; hp: number; type: 'rock' }> = [];
  buildings: Building[] = [];
  bullets: Bullet[] = [];
  messages: Message[] = [];

  selectedBuild: keyof typeof BUILD_TYPES | null = 'house';
  hotbar: Array<keyof typeof BUILD_TYPES> = ['house', 'farm', 'turret', 'wall', 'stock', 'tent', 'warehouse', 'well', 'infirmary'];
  showBuildMenu = false;
  debug = { nav: false, paths: true };
  // selection & camera follow
  selColonist: Colonist | null = null;
  follow = false;

  keyState: Record<string, boolean> = {};
  once = new Set<string>();
  mouse = { x: 0, y: 0, wx: 0, wy: 0, down: false, rdown: false };
  lastPaintCell: { gx: number; gy: number } | null = null;
  eraseDragStart: { x: number; y: number } | null = null;
  menuRects: Array<{ key: keyof typeof BUILD_TYPES; x: number; y: number; w: number; h: number }> = [];

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('no ctx');
    this.canvas = canvas; this.ctx = ctx;
    this.DPR = Math.max(1, Math.min(2, (window as any).devicePixelRatio || 1));
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
    this.bindInput();
    this.newGame();
  this.rebuildNavGrid();
    requestAnimationFrame(this.frame);
  }

  handleResize = () => {
    const w = window.innerWidth, h = window.innerHeight - 48;
    this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    this.canvas.width = Math.floor(w * this.DPR); this.canvas.height = Math.floor(h * this.DPR);
  };

  screenToWorld = (sx: number, sy: number) => ({ x: (sx * this.DPR) / this.camera.zoom + this.camera.x, y: (sy * this.DPR) / this.camera.zoom + this.camera.y });

  bindInput() {
    const c = this.canvas;
    c.addEventListener('mousemove', (e) => {
      const rect = c.getBoundingClientRect();
      this.mouse.x = (e.clientX - rect.left);
      this.mouse.y = (e.clientY - rect.top);
      const wpt = this.screenToWorld(this.mouse.x, this.mouse.y);
      this.mouse.wx = wpt.x; this.mouse.wy = wpt.y;
      // Drag-to-paint paths
      if (this.mouse.down) {
        if (this.selectedBuild === 'path') this.paintPathAtMouse();
        else if (this.selectedBuild === 'wall') this.paintWallAtMouse();
      }
    });
    c.addEventListener('mousedown', (e) => {
      if ((e as MouseEvent).button === 0) {
        this.mouse.down = true;
        if (this.showBuildMenu) { this.handleBuildMenuClick(); return; }
        if (this.selectedBuild === 'path') { this.paintPathAtMouse(true); }
        else if (this.selectedBuild === 'wall') { this.paintWallAtMouse(true); }
        else {
          // Try to select a colonist; if none under cursor, place building
          const col = this.findColonistAt(this.mouse.wx, this.mouse.wy);
          if (col) { this.selColonist = col; this.follow = true; }
          else { this.placeAtMouse(); }
        }
      }
      if ((e as MouseEvent).button === 2) {
        this.mouse.rdown = true;
        if (this.showBuildMenu) { this.showBuildMenu = false; return; }
        this.eraseDragStart = { x: this.mouse.wx, y: this.mouse.wy };
      }
    });
    c.addEventListener('mouseup', (e) => {
      if ((e as MouseEvent).button === 0) { this.mouse.down = false; this.lastPaintCell = null; }
      if ((e as MouseEvent).button === 2) {
        if (this.eraseDragStart) {
          const x0 = Math.min(this.eraseDragStart.x, this.mouse.wx);
          const y0 = Math.min(this.eraseDragStart.y, this.mouse.wy);
          const x1 = Math.max(this.eraseDragStart.x, this.mouse.wx);
          const y1 = Math.max(this.eraseDragStart.y, this.mouse.wy);
          const area = (x1 - x0) * (y1 - y0);
          if (area < 12 * 12) this.cancelOrErase(); else this.eraseInRect({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
        }
        this.mouse.rdown = false; this.eraseDragStart = null;
      }
    });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('keydown', (e) => { const k = (e as KeyboardEvent).key.toLowerCase(); this.keyState[k] = true; if (!this.once.has(k)) this.once.add(k); });
    window.addEventListener('keyup', (e) => { this.keyState[(e as KeyboardEvent).key.toLowerCase()] = false; });
  }

  findColonistAt(x: number, y: number): Colonist | null {
    for (let i = this.colonists.length - 1; i >= 0; i--) {
      const c = this.colonists[i]; if (!c.alive || c.inside) continue;
      const d2 = (c.x - x) * (c.x - x) + (c.y - y) * (c.y - y);
      if (d2 <= (c.r + 2) * (c.r + 2)) return c;
    }
    return null;
  }

  msg(text: string, kind: Message["kind"] = 'info') { this.messages.push({ text, t: 4, kind }); this.toast(text, 1600); }
  toast(msg: string, ms = 1400) {
    const el = document.getElementById('toast') as HTMLDivElement | null; if (!el) return;
    el.textContent = msg; el.style.opacity = '1';
    clearTimeout((el as any)._t); (el as any)._t = setTimeout(() => el.style.opacity = '0', ms);
  }

  // World setup
  scatter() {
    for (let i = 0; i < 220; i++) { const p = { x: rand(80, WORLD.w - 80), y: rand(80, WORLD.h - 80) }; if (Math.hypot(p.x - HQ_POS.x, p.y - HQ_POS.y) < 220) continue; this.trees.push({ x: p.x, y: p.y, r: 12, hp: 40, type: 'tree' }); }
    for (let i = 0; i < 140; i++) { const p = { x: rand(80, WORLD.w - 80), y: rand(80, WORLD.h - 80) }; if (Math.hypot(p.x - HQ_POS.x, p.y - HQ_POS.y) < 200) continue; this.rocks.push({ x: p.x, y: p.y, r: 12, hp: 50, type: 'rock' }); }
  }
  respawnTimer = 0; // seconds accumulator for resource respawn
  tryRespawn(dt: number) {
    this.respawnTimer += dt * this.fastForward;
    // attempt every ~4 seconds
    if (this.respawnTimer >= 4) {
      this.respawnTimer = 0;
      // small random chance to spawn a tree or rock away from HQ and buildings
      const tryOne = (kind: 'tree'|'rock') => {
        for (let k=0;k<6;k++) { // few tries
          const p = { x: rand(60, WORLD.w - 60), y: rand(60, WORLD.h - 60) };
          if (Math.hypot(p.x - HQ_POS.x, p.y - HQ_POS.y) < 200) continue;
          // avoid too close to buildings
          let ok = true;
          for (const b of this.buildings) { if (p.x > b.x-24 && p.x < b.x+b.w+24 && p.y > b.y-24 && p.y < b.y+b.h+24) { ok=false; break; } }
          if (!ok) continue;
          if (kind==='tree') this.trees.push({ x:p.x, y:p.y, r:12, hp:40, type:'tree' }); else this.rocks.push({ x:p.x, y:p.y, r:12, hp:50, type:'rock' });
          break;
        }
      };
      if (Math.random() < 0.5 && this.trees.length < 260) tryOne('tree');
      if (Math.random() < 0.35 && this.rocks.length < 180) tryOne('rock');
    }
  }
  buildHQ() {
    const def = { w: 3 * T, h: 3 * T };
    const HQ: Building = { kind: 'hq', name: 'HQ', x: HQ_POS.x - def.w / 2, y: HQ_POS.y - def.h / 2, w: def.w, h: def.h, hp: 600, done: true, color: COLORS.bld, size: { w: 3, h: 3 }, build: 0, buildLeft: 0 } as any;
    this.buildings.push(HQ);
  this.rebuildNavGrid();
  }
  newGame() {
  this.colonists.length = this.enemies.length = this.trees.length = this.rocks.length = this.buildings.length = this.bullets.length = this.messages.length = 0;
  this.buildReservations.clear();
  this.insideCounts.clear();
    this.RES.wood = 50; this.RES.stone = 30; this.RES.food = 20; this.day = 1; this.tDay = 0; this.fastForward = 1; this.camera.zoom = 1; this.camera.x = HQ_POS.x - this.canvas.width / (2 * this.camera.zoom); this.camera.y = HQ_POS.y - this.canvas.height / (2 * this.camera.zoom);
    this.buildHQ();
    this.scatter();
  for (let i = 0; i < 3; i++) { const a = rand(0, Math.PI * 2); const r = 80 + rand(-10, 10); this.spawnColonist({ x: HQ_POS.x + Math.cos(a) * r, y: HQ_POS.y + Math.sin(a) * r }); }
    this.msg("Welcome! Build farms before night, then turrets.");
  }

  spawnColonist(pos: { x: number; y: number }) {
    const c: Colonist = { x: pos.x, y: pos.y, r: 8, hp: 100, speed: 50, task: null, target: null, carrying: null, hunger: 0, alive: true, color: COLORS.colonist, t: rand(0, 1) };
    this.colonists.push(c); return c;
  }
  spawnEnemy() {
    const edge = randi(0, 4); let x, y; if (edge === 0) { x = rand(0, WORLD.w); y = -80; } else if (edge === 1) { x = rand(0, WORLD.w); y = WORLD.h + 80; } else if (edge === 2) { x = -80; y = rand(0, WORLD.h); } else { x = WORLD.w + 80; y = rand(0, WORLD.h); }
    const e: Enemy = { x, y, r: 9, hp: 60 + this.day * 6, speed: 48 + this.day * 2, dmg: 8 + this.day, target: null, color: COLORS.enemy };
    this.enemies.push(e); return e;
  }

  // Placement
  canPlace(def: Building, x: number, y: number) {
    const rect = { x, y, w: def.size.w * T, h: def.size.h * T };
    if (rect.x < 0 || rect.y < 0 || rect.x + rect.w > WORLD.w || rect.y + rect.h > WORLD.h) return false;
    for (const b of this.buildings) { if (!(rect.x + rect.w <= b.x || rect.x >= b.x + b.w || rect.y + rect.h <= b.y || rect.y >= b.y + b.h)) return false; }
    const circleRectOverlap = (c: { x: number; y: number; r: number }, r: { x: number; y: number; w: number; h: number }) => {
      const cx = Math.max(r.x, Math.min(c.x, r.x + r.w)); const cy = Math.max(r.y, Math.min(c.y, r.y + r.h)); const dx = c.x - cx, dy = c.y - cy; return (dx * dx + dy * dy) <= (c.r * c.r);
    };
    for (const t of this.trees) { if (circleRectOverlap(t, rect)) return false; }
    for (const r of this.rocks) { if (circleRectOverlap(r, rect)) return false; }
    return true;
  }
  placeAtMouse() {
    if (this.paused) return; const t = this.selectedBuild; if (!t) return; const def = BUILD_TYPES[t]; if (!def) return;
    const b = makeBuilding(t, this.mouse.wx, this.mouse.wy);
    if (!this.canPlace(b as any, b.x, b.y)) { this.toast("Can't place here"); return; }
    if (!hasCost(this.RES, def.cost)) { this.toast('Not enough resources'); return; }
    payCost(this.RES, def.cost);
    // If placing a non-path building, remove paths overlapped by its footprint first
    if (b.kind !== 'path') {
      for (let i = this.buildings.length - 1; i >= 0; i--) {
        const pb = this.buildings[i];
        if (pb.kind === 'path') {
          const overlap = !(b.x + b.w <= pb.x || b.x >= pb.x + pb.w || b.y + b.h <= pb.y || b.y >= pb.y + pb.h);
          if (overlap) this.buildings.splice(i, 1);
        }
      }
    }
    this.buildings.push(b);
  this.rebuildNavGrid();
  }

  paintPathAtMouse(force = false) {
    const gx = Math.floor(this.mouse.wx / T); const gy = Math.floor(this.mouse.wy / T);
    if (!force && this.lastPaintCell && this.lastPaintCell.gx === gx && this.lastPaintCell.gy === gy) return;
    const cellToWorld = (x: number, y: number) => ({ x: x * T, y: y * T });
    const tryPlace = (x: number, y: number) => {
      const wx = x * T + 1, wy = y * T + 1; // slight offset to choose the cell
      const b = makeBuilding('path' as any, wx, wy);
      // Avoid duplicates on same tile
      const exists = this.buildings.some(pb => pb.kind === 'path' && pb.x === b.x && pb.y === b.y);
      if (!exists && hasCost(this.RES, BUILD_TYPES['path'].cost)) { payCost(this.RES, BUILD_TYPES['path'].cost); this.buildings.push(b); }
    };
    if (this.lastPaintCell == null) {
      tryPlace(gx, gy);
      this.lastPaintCell = { gx, gy };
      this.rebuildNavGrid();
      return;
    }
    // Bresenham between last cell and current
    let x0 = this.lastPaintCell.gx, y0 = this.lastPaintCell.gy, x1 = gx, y1 = gy;
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1; const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
      tryPlace(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err; if (e2 > -dy) { err -= dy; x0 += sx; } if (e2 < dx) { err += dx; y0 += sy; }
    }
    this.lastPaintCell = { gx, gy };
    this.rebuildNavGrid();
  }

  paintWallAtMouse(force = false) {
    const gx = Math.floor(this.mouse.wx / T); const gy = Math.floor(this.mouse.wy / T);
    if (!force && this.lastPaintCell && this.lastPaintCell.gx === gx && this.lastPaintCell.gy === gy) return;
    const tryPlace = (x: number, y: number) => {
      const wx = x * T + 1, wy = y * T + 1;
      const b = makeBuilding('wall' as any, wx, wy);
      // avoid duplicates on same tile
      const exists = this.buildings.some(pb => pb.kind === 'wall' && pb.x === b.x && pb.y === b.y);
      if (exists) return;
      if (!hasCost(this.RES, BUILD_TYPES['wall'].cost)) return;
      if (!this.canPlace(b as any, b.x, b.y)) return;
      payCost(this.RES, BUILD_TYPES['wall'].cost);
      this.buildings.push(b);
    };
    if (this.lastPaintCell == null) {
      tryPlace(gx, gy); this.lastPaintCell = { gx, gy }; this.rebuildNavGrid(); return;
    }
    let x0 = this.lastPaintCell.gx, y0 = this.lastPaintCell.gy, x1 = gx, y1 = gy;
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1; const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
      tryPlace(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err; if (e2 > -dy) { err -= dy; x0 += sx; } if (e2 < dx) { err += dx; y0 += sy; }
    }
    this.lastPaintCell = { gx, gy }; this.rebuildNavGrid();
  }

  eraseInRect(rect: { x: number; y: number; w: number; h: number }) {
    const before = this.buildings.length;
    for (let i = this.buildings.length - 1; i >= 0; i--) {
      const b = this.buildings[i]; if (b.kind === 'hq') continue;
      const overlap = !(rect.x + rect.w <= b.x || rect.x >= b.x + b.w || rect.y + rect.h <= b.y || rect.y >= b.y + b.h);
  if (overlap) { this.evictColonistsFrom(b); this.buildings.splice(i, 1); this.buildReservations.delete(b); this.insideCounts.delete(b); }
    }
    const removed = before - this.buildings.length;
    if (removed > 0) { this.msg(`Removed ${removed} structure(s)`); this.rebuildNavGrid(); }
  }
  cancelOrErase() {
    const pos = { x: this.mouse.wx, y: this.mouse.wy };
  for (let i = this.buildings.length - 1; i >= 0; i--) { const b = this.buildings[i]; if (b.kind === 'hq') continue; if (pos.x >= b.x && pos.x <= b.x + b.w && pos.y >= b.y && pos.y <= b.y + b.h) { this.evictColonistsFrom(b); this.buildings.splice(i, 1); this.msg('Building removed'); this.rebuildNavGrid(); return; } }
    this.selectedBuild = null; this.toast('Build canceled');
  }

  evictColonistsFrom(b: Building) {
    // Move any colonists hiding inside to just outside the footprint
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    for (const c of this.colonists) {
      if (c.inside === b) {
  this.leaveBuilding(c);
  c.safeTarget = null; c.safeTimer = 0;
        // place them near the building edge
        const angle = Math.random() * Math.PI * 2;
        const rx = (b.w / 2 + 10) * Math.cos(angle);
        const ry = (b.h / 2 + 10) * Math.sin(angle);
        c.x = clamp(cx + rx, 0, WORLD.w);
        c.y = clamp(cy + ry, 0, WORLD.h);
      }
    }
  }

  // AI
  assignedTargets = new WeakSet<object>();
  // Limit how many colonists work on one build site concurrently
  buildReservations = new Map<Building, number>();
  // Track how many colonists are inside a building (for capacity)
  insideCounts = new Map<Building, number>();
  buildingCapacity(b: Building): number {
    if (b.kind === 'hq') return 8; // generous lobby
    if (b.kind === 'house') return 3; // requested: 3 slots per house
    return 1;
  }
  buildingHasSpace(b: Building): boolean {
    const cap = this.buildingCapacity(b);
    const cur = this.insideCounts.get(b) || 0;
    return cur < cap;
  }
  tryEnterBuilding(c: Colonist, b: Building): boolean {
    if (!b.done) return false;
    if (!this.buildingHasSpace(b)) return false;
    this.insideCounts.set(b, (this.insideCounts.get(b) || 0) + 1);
    c.inside = b; c.hideTimer = 0; return true;
  }
  leaveBuilding(c: Colonist) {
    const b = c.inside;
    if (b) {
      const cur = (this.insideCounts.get(b) || 1) - 1;
      if (cur <= 0) this.insideCounts.delete(b); else this.insideCounts.set(b, cur);
    }
    c.inside = null; c.hideTimer = 0;
  }
  private getMaxCrew(b: Building): number {
    // Simple heuristic: small builds 1, medium 2, large 3
    const areaTiles = (b.w / T) * (b.h / T);
    if (areaTiles <= 1) return 1;
    if (areaTiles <= 4) return 2;
    return 3;
  }
  releaseBuildReservation(c: Colonist) {
    if (!c.reservedBuildFor) return;
    const b = c.reservedBuildFor; const cur = (this.buildReservations.get(b) || 1) - 1;
    if (cur <= 0) this.buildReservations.delete(b); else this.buildReservations.set(b, cur);
    c.reservedBuildFor = null;
  }
  clearPath(c: Colonist) { c.path = undefined; c.pathIndex = undefined; c.repath = 0; }
  setTask(c: Colonist, task: string, target: any) {
    // release old reserved target
    if (c.target && (c.target as any).type && this.assignedTargets.has(c.target)) this.assignedTargets.delete(c.target);
    // release old build reservation if changing away from that building
    if (c.reservedBuildFor && c.reservedBuildFor !== target) this.releaseBuildReservation(c);
    c.task = task; c.target = target; this.clearPath(c);
    // reserve resources so only one colonist picks the same tree/rock
    if (target && (target as any).type && ((target as any).type === 'tree' || (target as any).type === 'rock')) this.assignedTargets.add(target);
    // reserve a build slot
    if (task === 'build' && target && (target as Building).w != null && !c.reservedBuildFor) {
      const b = target as Building; const cur = this.buildReservations.get(b) || 0; const maxCrew = this.getMaxCrew(b);
      if (cur < maxCrew) { this.buildReservations.set(b, cur + 1); c.reservedBuildFor = b; }
    }
  }
  pickTask(c: Colonist) {
    // Prefer an unfinished building with available crew slots
    let site: Building | null = null; let bestD = Infinity;
    for (const b of this.buildings) {
      if (b.done) continue;
      const cur = this.buildReservations.get(b) || 0;
      if (cur >= this.getMaxCrew(b)) continue;
      const d = dist2({ x: c.x, y: c.y } as any, this.centerOf(b) as any);
      if (d < bestD) { bestD = d; site = b; }
    }
    if (site) { this.setTask(c, 'build', site); return; }
    const readyFarm = this.buildings.find(b => b.kind === 'farm' && b.done && b.ready);
    if (readyFarm) { this.setTask(c, 'harvestFarm', readyFarm); return; }
    if (this.RES.food < Math.max(4, this.colonists.length * 2)) {
      const nearTree = this.nearestCircle({ x: c.x, y: c.y }, this.trees.filter(t => !this.assignedTargets.has(t)) as any);
      if (nearTree) { this.setTask(c, 'chop', nearTree); return; }
    }
    if (this.RES.wood < this.RES.stone) {
      const tr = this.nearestCircle({ x: c.x, y: c.y }, this.trees.filter(t => !this.assignedTargets.has(t)) as any); if (tr) { this.setTask(c, 'chop', tr); return; }
    } else {
      const rk = this.nearestCircle({ x: c.x, y: c.y }, this.rocks.filter(r => !this.assignedTargets.has(r)) as any); if (rk) { this.setTask(c, 'mine', rk); return; }
    }
    this.setTask(c, 'idle', { x: c.x + rand(-80, 80), y: c.y + rand(-80, 80) });
  }
  nearestCircle<T extends { x: number; y: number }>(p: { x: number; y: number }, arr: T[]): T | null {
    let best: T | null = null, bestD = 1e9; for (const o of arr) { const d = dist2(p as any, o as any); if (d < bestD) { bestD = d; best = o; } } return best;
  }
  moveAlongPath(c: Colonist, dt: number, target?: { x: number; y: number }, arrive = 10) {
    // periodic re-pathing but only if goal changed or timer elapsed
    c.repath = (c.repath || 0) - dt;
    const goalChanged = target && (!c.pathGoal || Math.hypot(c.pathGoal.x - target.x, c.pathGoal.y - target.y) > 12);
    if (target && (goalChanged || c.repath == null || c.repath <= 0 || !c.path || c.pathIndex == null)) {
      const p = this.computePath(c.x, c.y, target.x, target.y);
      if (p && p.length) { c.path = p; c.pathIndex = 0; c.pathGoal = { x: target.x, y: target.y }; }
      c.repath = 2.0; // seconds between recompute
    }
    if (!c.path || c.pathIndex == null || c.pathIndex >= c.path.length) {
      if (target) { const d = Math.hypot(c.x - target.x, c.y - target.y); return d <= arrive; }
      return false;
    }
    const node = c.path[c.pathIndex];
    const dx = node.x - c.x; const dy = node.y - c.y; const L = Math.hypot(dx, dy);
    if (L < 10) { c.pathIndex++; if (c.pathIndex >= c.path.length) { c.path = undefined; c.pathIndex = undefined; if (target) return Math.hypot(c.x - target.x, c.y - target.y) <= arrive; return true; } return false; }
    // Movement speed; boost if standing on a path tile
    let speed = c.speed;
    {
      const gx = Math.floor(c.x / T), gy = Math.floor(c.y / T);
      const inBounds = gx >= 0 && gy >= 0 && gx < this.grid.cols && gy < this.grid.rows;
      if (inBounds) {
        const idx = gy * this.grid.cols + gx;
        // If cost lowered significantly (<=0.7), treat as path tile and boost speed ~12.5%
        if (this.grid.cost[idx] <= 0.7) speed *= 1.125;
      }
    }
    c.x += (dx / (L || 1)) * speed * dt; c.y += (dy / (L || 1)) * speed * dt;
    c.x = Math.max(0, Math.min(c.x, WORLD.w)); c.y = Math.max(0, Math.min(c.y, WORLD.h));
    return false;
  }

  findSafeTurret(c: Colonist, danger: Enemy): Building | null {
    let best: Building | null = null; let bestScore = Infinity;
    for (const b of this.buildings) {
      if (b.kind !== 'turret' || !b.done) continue;
      const bc = this.centerOf(b);
      const dCol = Math.hypot(c.x - bc.x, c.y - bc.y);
      const dEn = Math.hypot(danger.x - bc.x, danger.y - bc.y);
      // Prefer closer turrets and those not too close to the enemy
      const range = (b as any).range || 160;
      const enemyBias = dEn < range ? 100 : 0; // discourage turrets already swarmed
      const score = dCol + enemyBias;
      if (score < bestScore) { bestScore = score; best = b; }
    }
    return best;
  }

  isProtectedByTurret(b: Building): boolean {
    const bc = this.centerOf(b);
    for (const t of this.buildings) {
      if (t.kind !== 'turret' || !t.done) continue;
      const range = (t as any).range || 120; const tc = this.centerOf(t);
      if (dist2(bc as any, tc as any) < range * range) return true;
    }
    return false;
  }

  // Enemies & combat
  centerOf(b: Building) { return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; }
  pointInRect(p: { x: number; y: number }, r: { x: number; y: number; w: number; h: number }) { return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }
  updateTurret(b: Building, dt: number) {
    if (!('range' in b) || !(b as any).range) return; b.cooldown = Math.max(0, (b.cooldown || 0) - dt);
    let best: Enemy | null = null, bestD = 1e9; const bc = this.centerOf(b);
    for (const e of this.enemies) { const d = dist2(e as any, bc as any); if (d < (b as any).range * (b as any).range && d < bestD) { bestD = d; best = e; } }
    if (best && (b.cooldown || 0) <= 0) { best.hp -= ((b as any).dps || 0); this.bullets.push({ x: bc.x, y: bc.y, tx: best.x, ty: best.y, t: .12 }); b.cooldown = (b as any).fireRate || 0.6; }
  }

  // Day/Night & waves
  isNight() { return (this.tDay >= NIGHT_SPAN.start || this.tDay <= NIGHT_SPAN.end); }
  spawnWave() { const n = 4 + Math.floor(this.day * 1.3); for (let i = 0; i < n; i++) this.spawnEnemy(); this.msg(`Night ${this.day}: Enemies incoming!`, 'warn'); }
  nextDay() {
    this.day++; (this as any).waveSpawnedForDay = false;
    let dead = 0; for (let i = 0; i < this.colonists.length; i++) { if (this.RES.food > 0) { this.RES.food -= 1; } else { dead++; if (this.colonists[i]) { (this.colonists[i] as any).alive = false; } } }
    if (dead > 0) { this.colonists = this.colonists.filter(c => c.alive); this.msg(`${dead} colonist(s) starved`, 'bad'); }
    for (const b of this.buildings) { if (b.kind === 'farm' && b.done) { b.growth = (b.growth || 0) + 1; if ((b.growth || 0) >= ((b as any).growTime || 0)) { b.ready = true; } } }
    const tent = this.buildings.find(b => b.kind === 'tent' && b.done);
    const cap = (this.buildings.find(b => b.kind === 'hq') ? 3 : 0) + this.buildings.filter(b => b.kind === 'house' && b.done).reduce((a, b) => a + ((b as any).popCap || 0), 0);
    if (tent && this.colonists.length < cap && this.RES.food >= 15) { this.RES.food -= 15; this.spawnColonist({ x: HQ_POS.x + rand(-20, 20), y: HQ_POS.y + rand(-20, 20) }); this.msg('A new colonist joined! (-15 food)', 'info'); }
    if (this.day > 8) { this.win(); }
  }

  // Update loop
  dayTick(dt: number) {
    const wasNight = this.isNight();
    this.tDay += (dt * this.fastForward) / this.dayLength;
    if (this.tDay >= 1) { this.tDay -= 1; this.nextDay(); }
    const nowNight = this.isNight();
    if (!wasNight && nowNight) { this.spawnWave(); }
    this.prevIsNight = nowNight;
  }
  keyPressed(k: string) { if (this.once.has(k)) { this.once.delete(k); return true; } return false; }
  update(dt: number) {
    // Handle toggles even when paused
    if (this.keyPressed(' ')) { this.paused = !this.paused; const btn = document.getElementById('btnPause'); if (btn) btn.textContent = this.paused ? 'Resume' : 'Pause'; }
    if (this.keyPressed('h')) { const help = document.getElementById('help'); if (help) help.hidden = !help.hidden; }
  if (this.keyPressed('b')) { this.showBuildMenu = !this.showBuildMenu; }
    if (this.keyPressed('g')) { this.debug.nav = !this.debug.nav; this.toast(this.debug.nav ? 'Debug: nav ON' : 'Debug: nav OFF'); }
  if (this.keyPressed('escape')) { if (this.showBuildMenu) this.showBuildMenu = false; else { this.selectedBuild = null; this.toast('Build canceled'); this.selColonist = null; this.follow = false; } }
    if (this.keyPressed('f')) { this.fastForward = (this.fastForward === 1 ? 6 : 1); this.toast(this.fastForward > 1 ? 'Fast-forward ON' : 'Fast-forward OFF'); }
    if (this.paused) return;
    const camSpd = 360 * dt / this.camera.zoom;
    if (this.keyState['w']) this.camera.y -= camSpd;
    if (this.keyState['s']) this.camera.y += camSpd;
    if (this.keyState['a']) this.camera.x -= camSpd;
    if (this.keyState['d']) this.camera.x += camSpd;
    if (this.keyState['+'] || this.keyState['=']) this.camera.zoom = Math.max(0.6, Math.min(2.2, this.camera.zoom * 1.02));
    if (this.keyState['-'] || this.keyState['_']) this.camera.zoom = Math.max(0.6, Math.min(2.2, this.camera.zoom / 1.02));
    for (const [i, key] of this.hotbar.entries()) { if (this.keyPressed(String(i + 1))) { this.selectedBuild = key; this.toast('Selected: ' + BUILD_TYPES[key].name); } }
    // camera follow selected colonist
    if (this.follow && this.selColonist) {
      const c = this.selColonist; const vw = this.canvas.width / this.camera.zoom; const vh = this.canvas.height / this.camera.zoom;
      this.camera.x = clamp(c.x - vw / 2, 0, Math.max(0, WORLD.w - vw));
      this.camera.y = clamp(c.y - vh / 2, 0, Math.max(0, WORLD.h - vh));
    }
    this.dayTick(dt);
  for (const c of this.colonists) updateColonistFSM(this, c, dt * this.fastForward);
  for (let i = this.enemies.length - 1; i >= 0; i--) { const e = this.enemies[i]; updateEnemyFSM(this, e, dt * this.fastForward); if (e.hp <= 0) { this.enemies.splice(i, 1); if (Math.random() < .5) this.RES.food += 1; } }
    for (const b of this.buildings) {
      if (b.kind === 'turret' && b.done) this.updateTurret(b, dt * this.fastForward);
      // passive production (well)
      if ((b as any).prodKind && b.done) {
        const rate = (b as any).prodRateSec || 0;
        const kind = (b as any).prodKind as keyof typeof this.RES;
        this.RES[kind] += rate * dt * this.fastForward;
      }
      // infirmary healing
      if ((b as any).healRate && b.done) {
        const hr = (b as any).healRate as number; const rng = (b as any).healRange || 120;
        const c = this.centerOf(b);
        for (const col of this.colonists) {
          const d2 = (col.x-c.x)*(col.x-c.x)+(col.y-c.y)*(col.y-c.y);
          if (d2 < rng*rng) col.hp = Math.min(100, col.hp + hr * dt * this.fastForward);
        }
      }
    }
    // resource respawn
    this.tryRespawn(dt);
    for (let i = this.bullets.length - 1; i >= 0; i--) { const b = this.bullets[i]; b.t -= dt; if (b.t <= 0) this.bullets.splice(i, 1); }
    for (let i = this.messages.length - 1; i >= 0; i--) { const m = this.messages[i]; m.t -= dt; if (m.t <= 0) this.messages.splice(i, 1); }
  }

  // Draw
  draw() {
    const { ctx } = this; clear(ctx, this.canvas);
    ctx.save(); applyWorldTransform(ctx, this.camera); drawGround(ctx);
    for (const t of this.trees) drawCircle(ctx, t.x, t.y, t.r, COLORS.tree);
    for (const r of this.rocks) drawCircle(ctx, r.x, r.y, r.r, COLORS.rock);
    for (const b of this.buildings) {
      drawBuilding(ctx, b);
      // Shield badge if protected by any turret
      if (b.kind === 'house' || b.kind === 'hq') {
        const protectedBy = this.buildings.some(t => t.kind === 'turret' && t.done && dist2(this.centerOf(b) as any, this.centerOf(t) as any) < (((t as any).range || 120) * ((t as any).range || 120)));
        if (protectedBy) { const c = this.centerOf(b); drawShieldIcon(ctx, c.x, b.y - 8, 12, '#60a5fa'); }
      }
    }
    // Draw person icons under buildings that have hidden colonists inside
    {
      const counts = new Map<Building, number>();
      for (const c of this.colonists) { if (c.inside) counts.set(c.inside, (counts.get(c.inside) || 0) + 1); }
      ctx.save();
      for (const [b, n] of counts) {
        if (!n) continue; const maxIcons = 8;
        const toDraw = Math.min(n, maxIcons);
        const w = 10, pad = 4; const total = toDraw * (w + pad) - pad;
        let sx = b.x + b.w / 2 - total / 2 + w / 2;
        const y = b.y + b.h + 8;
        // health-tinted glyphs: low hp -> red, mid -> yellow, high -> green
        // compute average health of those inside (approximate by sampling colonists list)
        const insideCols = this.colonists.filter(c => c.inside === b);
        for (let i = 0; i < toDraw; i++) {
          const sample = insideCols[i % insideCols.length];
          const hp = sample ? sample.hp : 100;
          const color = hp > 66 ? '#22c55e' : hp > 33 ? '#eab308' : '#ef4444';
          drawPersonIcon(ctx, sx + i * (w + pad), y, 10, color);
        }
        if (n > maxIcons) {
          const extra = n - maxIcons; const tx = sx + toDraw * (w + pad) + 6; ctx.fillStyle = '#dbeafe'; ctx.font = '600 11px system-ui,Segoe UI,Roboto'; ctx.fillText('+' + extra, tx, y + 4);
        }
      }
      ctx.restore();
    }
  for (const c of this.colonists) { if (!c.inside) drawCircle(ctx, c.x, c.y, c.r, (this.selColonist === c ? '#93c5fd' : COLORS.colonist)); }
    if (this.debug.nav) {
      // draw nav solids
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#ef4444';
      for (let y = 0; y < this.grid.rows; y++) {
        for (let x = 0; x < this.grid.cols; x++) {
          if (this.grid.solid[y * this.grid.cols + x]) ctx.fillRect(x * T, y * T, T, T);
        }
      }
      ctx.restore();
      // draw colonist paths
      ctx.save();
      ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2;
      for (const c of this.colonists) {
        if (!c.path || !c.path.length) continue;
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        for (let i = c.pathIndex ?? 0; i < c.path.length; i++) {
          const p = c.path[i];
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    for (const e of this.enemies) drawPoly(ctx, e.x, e.y, e.r + 2, 3, COLORS.enemy, -Math.PI / 2);
    drawBullets(ctx, this.bullets);
    if (this.isNight()) { ctx.fillStyle = `rgba(6,10,18, 0.58)`; ctx.fillRect(0, 0, WORLD.w, WORLD.h); }
    if (this.selectedBuild) {
      const def = BUILD_TYPES[this.selectedBuild];
      const gx = Math.floor(this.mouse.wx / T) * T; const gy = Math.floor(this.mouse.wy / T) * T;
      const can = this.canPlace({ ...def, size: def.size } as any, gx, gy) && hasCost(this.RES, def.cost);
      ctx.globalAlpha = .6; ctx.fillStyle = can ? COLORS.ghost : '#ff6b6b88'; ctx.fillRect(gx, gy, def.size.w * T, def.size.h * T); ctx.globalAlpha = 1;
    }
    // right-drag erase rectangle overlay
    if (this.mouse.rdown && this.eraseDragStart) {
      const x0 = Math.min(this.eraseDragStart.x, this.mouse.wx);
      const y0 = Math.min(this.eraseDragStart.y, this.mouse.wy);
      const w = Math.abs(this.mouse.wx - this.eraseDragStart.x);
      const h = Math.abs(this.mouse.wy - this.eraseDragStart.y);
      ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#ef4444'; ctx.fillRect(x0, y0, w, h); ctx.globalAlpha = 1; ctx.strokeStyle = '#ef4444'; ctx.setLineDash([6,4]); ctx.strokeRect(x0 + .5, y0 + .5, w - 1, h - 1); ctx.setLineDash([]); ctx.restore();
    }
    ctx.restore();
  const cap = (this.buildings.find(b => b.kind === 'hq') ? 3 : 0) + this.buildings.filter(b => b.kind === 'house' && b.done).reduce((a, b) => a + ((b as any).popCap || 0), 0);
  const hiding = this.colonists.filter(c => !!c.inside).length;
  const hotbar = this.hotbar.map(k => ({ key: String(k), name: BUILD_TYPES[k].name, cost: this.costText(BUILD_TYPES[k].cost || {}), selected: this.selectedBuild === k }));
  drawHUD(this.ctx, this.canvas, { res: this.RES, colonists: this.colonists.length, cap, hiding, day: this.day, tDay: this.tDay, isNight: this.isNight(), hotbar, messages: this.messages });
  if (this.selColonist) this.drawColonistProfile(this.selColonist);
  if (this.showBuildMenu) this.drawBuildMenu();
  }

  costText(c: Partial<typeof this.RES>) { const parts: string[] = []; if (c.wood) parts.push(`${c.wood}w`); if (c.stone) parts.push(`${c.stone}s`); if (c.food) parts.push(`${c.food}f`); return parts.join(' '); }

  // Loop
  last = performance.now();
  frame = (now: number) => {
    const dt = Math.min(0.033, (now - this.last) / 1000); this.last = now; this.update(dt); this.draw(); requestAnimationFrame(this.frame);
  };

  // Win/Lose
  win() { this.paused = true; this.msg('You survived! Day 8 reached.', 'good'); alert('You survived to Day 8 — victory!'); }
  lose() { this.paused = true; this.msg('HQ destroyed. Colony fell.', 'bad'); alert('Your HQ was destroyed. Game over.'); }

  // Pathfinding grid and helpers
  grid = makeGrid();
  rebuildNavGrid() {
    clearGrid(this.grid);
    // mark buildings as obstacles (allow walking inside unfinished sites? keep blocked to avoid overlap)
    for (const b of this.buildings) {
  // Block buildings except HQ and path (path is non-blocking)
  if (b.kind !== 'hq' && b.kind !== 'path') markRectSolid(this.grid, b.x, b.y, b.w, b.h);
  // Path tiles reduce traversal cost
  if (b.kind === 'path') markRectCost(this.grid, b.x, b.y, b.w, b.h, 0.6);
    }
  }
  computePath(sx: number, sy: number, tx: number, ty: number) {
    return aStar(this.grid, sx, sy, tx, ty);
  }

  // Navigation helpers for AI
  private cellIndexAt(x: number, y: number) {
    const gx = Math.floor(x / T), gy = Math.floor(y / T);
    if (gx < 0 || gy < 0 || gx >= this.grid.cols || gy >= this.grid.rows) return -1;
    return gy * this.grid.cols + gx;
  }
  isBlocked(x: number, y: number) {
    const idx = this.cellIndexAt(x, y);
    return idx < 0 ? true : !!this.grid.solid[idx];
  }
  bestApproachToCircle(c: Colonist, circle: { x: number; y: number; r: number }, interact: number) {
    // Sample multiple angles and pick the closest unblocked approach point
    let best: { x: number; y: number } | null = null;
    let bestD = Infinity;
    const samples = 16;
    for (let i = 0; i < samples; i++) {
      const ang = (i / samples) * Math.PI * 2;
      const px = circle.x - Math.cos(ang) * (interact - 6);
      const py = circle.y - Math.sin(ang) * (interact - 6);
      if (this.isBlocked(px, py)) continue;
      const d = (c.x - px) * (c.x - px) + (c.y - py) * (c.y - py);
      if (d < bestD) { bestD = d; best = { x: px, y: py }; }
    }
    if (best) return best;
    // Fallback toward current angle if all samples blocked
    const ang = Math.atan2(circle.y - c.y, circle.x - c.x);
    return { x: circle.x - Math.cos(ang) * (interact - 6), y: circle.y - Math.sin(ang) * (interact - 6) };
  }

  // UI: colonist profile panel
  drawColonistProfile(c: Colonist) {
    const ctx = this.ctx; const cw = this.canvas.width; const ch = this.canvas.height; const W = 280, H = 176; const X = cw - W - 12, Y = 54;
    ctx.save();
    ctx.fillStyle = '#0b1220cc'; ctx.fillRect(X, Y, W, H);
    ctx.strokeStyle = '#1e293b'; ctx.strokeRect(X + .5, Y + .5, W - 1, H - 1);
    // avatar box
    const ax = X + 18, ay = Y + 26; ctx.fillStyle = '#0f172a'; ctx.fillRect(ax, ay, 64, 64); ctx.strokeStyle = '#1e293b'; ctx.strokeRect(ax + .5, ay + .5, 64 - 1, 64 - 1);
    // avatar glyph
    ctx.save(); ctx.translate(ax + 32, ay + 36); ctx.scale(2, 2); drawPersonIcon(ctx as any, 0, 0, 10, '#93c5fd'); ctx.restore();
    // texts and bars
    ctx.fillStyle = '#dbeafe'; ctx.font = '600 14px system-ui,Segoe UI,Roboto'; ctx.fillText('Colonist', X + 96, Y + 22);
    ctx.font = '500 13px system-ui,Segoe UI,Roboto';
    const task = c.inside ? 'Resting' : (c.task ? c.task : 'Idle');
    const hp = Math.max(0, Math.min(100, c.hp | 0));
    const tired = Math.max(0, Math.min(100, (c.fatigue || 0) | 0));
    const hunger = Math.max(0, Math.min(100, (c.hunger || 0) | 0));
    this.barRow(X + 96, Y + 40, 'Health', hp, '#22c55e');
    this.barRow(X + 96, Y + 64, 'Tiredness', tired, '#eab308');
    this.barRow(X + 96, Y + 88, 'Hunger', hunger, '#f87171');
    ctx.fillStyle = '#9fb3c8';
    ctx.fillText(`Task: ${task}`, X + 96, Y + 112);
    ctx.fillText(`Pos: ${c.x | 0}, ${c.y | 0}`, X + 96, Y + 130);
    ctx.fillText(this.follow ? 'Camera: Following (Esc to stop)' : 'Camera: Click colonist to follow', X + 96, Y + 148);
    ctx.restore();
  }

  barRow(x: number, y: number, label: string, val: number, color: string) {
    const ctx = this.ctx; ctx.fillStyle = '#dbeafe'; ctx.fillText(label, x, y);
    const w = 150, h = 10; ctx.fillStyle = '#0f172a'; ctx.fillRect(x + 70, y - 8, w, h); ctx.strokeStyle = '#1e293b'; ctx.strokeRect(x + 70 + .5, y - 8 + .5, w - 1, h - 1);
    ctx.fillStyle = color; ctx.fillRect(x + 70 + 2, y - 8 + 2, Math.max(0, Math.min(w - 4, (val / 100) * (w - 4))), h - 4);
  }

  // Build menu UI
  drawBuildMenu() {
    const ctx = this.ctx; const cw = this.canvas.width; const ch = this.canvas.height;
    const W = Math.min(760, cw - 40); const H = Math.min(440, ch - 80); const X = (cw - W) / 2; const Y = (ch - H) / 2;
    ctx.save();
    ctx.fillStyle = '#0b1628dd'; ctx.fillRect(X, Y, W, H);
    ctx.strokeStyle = '#1e293b'; ctx.strokeRect(X + .5, Y + .5, W - 1, H - 1);
    ctx.fillStyle = '#dbeafe'; ctx.font = '600 16px system-ui,Segoe UI,Roboto'; ctx.fillText('Build Menu (B to close)', X + 14, Y + 24);
    const groups = groupByCategory(BUILD_TYPES);
    const cats = Object.keys(groups);
    const colW = Math.floor((W - 24) / Math.max(1, cats.length));
    this.menuRects = [];
    ctx.font = '600 13px system-ui,Segoe UI,Roboto';
    for (let i = 0; i < cats.length; i++) {
      const cx = X + 12 + i * colW; let cy = Y + 44;
      const cat = cats[i];
      ctx.fillStyle = '#93c5fd'; ctx.fillText(cat, cx, cy);
      cy += 8;
      const items = groups[cat];
      for (const [key, d] of items) {
        cy += 8;
        const rowH = 28; const rw = colW - 18; const rx = cx; const ry = cy;
        ctx.fillStyle = (this.selectedBuild === key) ? '#102034' : '#0f172a';
        ctx.fillRect(rx, ry, rw, rowH);
        ctx.strokeStyle = (this.selectedBuild === key) ? '#4b9fff' : '#1e293b';
        ctx.strokeRect(rx + .5, ry + .5, rw - 1, rowH - 1);
        ctx.fillStyle = '#dbeafe'; ctx.fillText(d.name, rx + 8, ry + 18);
        const cost = this.costText(d.cost || {});
        ctx.fillStyle = '#9fb3c8'; ctx.fillText(cost, rx + rw - Math.min(80, ctx.measureText(cost).width + 2), ry + 18);
        this.menuRects.push({ key: key as keyof typeof BUILD_TYPES, x: rx, y: ry, w: rw, h: rowH });
        cy += rowH;
        if (cy > Y + H - 34) break; // stop overflow
      }
    }
    ctx.restore();
  }

  handleBuildMenuClick() {
    const mx = this.mouse.x * this.DPR; const my = this.mouse.y * this.DPR;
    for (const r of this.menuRects) {
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        this.selectedBuild = r.key; this.showBuildMenu = false; this.toast('Selected: ' + BUILD_TYPES[r.key].name); return;
      }
    }
    // click outside: close
    this.showBuildMenu = false;
  }
}
