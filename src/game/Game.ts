
import { clamp, dist2, rand, randi } from "../core/utils";
import { makeGrid } from "../core/pathfinding";
import { rebuildNavGrid as rebuildNavGridNav, computePath as computePathNav, computePathWithDangerAvoidance as computePathWithDangerAvoidanceNav, cellIndexAt as cellIndexAtNav, isBlocked as isBlockedNav } from "./navigation/navGrid";
import { COLORS, HQ_POS, NIGHT_SPAN, T, WORLD } from "./constants";
import type { Building, Bullet, Camera, Colonist, Enemy, Message, Resources, Particle } from "./types";
import { BUILD_TYPES, hasCost } from "./buildings";
import { applyWorldTransform, clear, drawBuilding, drawBullets, drawCircle, drawGround, drawHUD, drawPoly, drawPersonIcon, drawShieldIcon, drawColonistAvatar } from "./render";
import { updateColonistFSM } from "./colonist_systems/colonistFSM";
import { updateEnemyFSM } from "../ai/enemyFSM";
import { drawBuildMenu as drawBuildMenuUI, handleBuildMenuClick as handleBuildMenuClickUI } from "./ui/buildMenu";
import { drawColonistProfile as drawColonistProfileUI } from "./ui/colonistProfile";
import { drawContextMenu as drawContextMenuUI, showContextMenu as showContextMenuUI, hideContextMenu as hideContextMenuUI } from "./ui/contextMenu";
import { drawPlacementUI as drawPlacementUIUI } from "./ui/placement";
import { canPlace as canPlacePlacement, tryPlaceNow as tryPlaceNowPlacement, placeAtMouse as placeAtMousePlacement, nudgePending as nudgePendingPlacement, rotatePending as rotatePendingPlacement, confirmPending as confirmPendingPlacement, cancelPending as cancelPendingPlacement, paintPathAtMouse as paintPathAtMousePlacement, paintWallAtMouse as paintWallAtMousePlacement, eraseInRect as eraseInRectPlacement, cancelOrErase as cancelOrErasePlacement, evictColonistsFrom as evictColonistsFromPlacement } from "./placement/placementSystem";
import { generateColonistProfile, getColonistDescription } from "./colonist_systems/colonistGenerator";
import { drawParticles } from "../core/particles";
import { updateTurret as updateTurretCombat, updateProjectiles as updateProjectilesCombat } from "./combat/combatSystem";
import { updateColonistHealth, tendColonist as tendColonistHealth } from "./health/healthSystem";
import { updateColonistCombat } from "./combat/pawnCombat";
import { itemDatabase } from '../data/itemDatabase';
import { initDebugConsole, toggleDebugConsole, handleDebugConsoleKey, drawDebugConsole } from './ui/debugConsole';

export class Game {
  canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D;
  DPR = 1;
  camera: Camera = { x: 0, y: 0, zoom: 1 };
  
  // UI Scaling system
  uiScale = 1;
  baseFontSize = 14;
  // Touch capability flag for responsive UI sizing
  isTouch = false;
  // Actual touch usage detection (vs just capability)
  isActuallyTouchDevice = false;
  lastInputWasTouch = false;
  
  RES = { wood: 0, stone: 0, food: 0 };
  BASE_STORAGE = 200; // Base storage capacity
  storageFullWarned = false; // Prevent spam warnings

  getStorageCapacity(): number {
    let total = this.BASE_STORAGE;
    for (const b of this.buildings) {
      if (b.done && (b as any).storageBonus) {
        total += (b as any).storageBonus;
      }
    }
    return total;
  }

  getPopulationCap(): number {
    return (this.buildings.find(b => b.kind === 'hq') ? 3 : 0) + 
           this.buildings.filter(b => b.kind === 'house' && b.done)
                        .reduce((a, b) => a + ((b as any).popCap || 0), 0);
  }

  addResource(type: keyof Resources, amount: number): number {
    const currentTotal = this.RES.wood + this.RES.stone + this.RES.food;
    const storageLimit = this.getStorageCapacity();
    const availableSpace = Math.max(0, storageLimit - currentTotal);
    const actualAmount = Math.min(Math.floor(amount), availableSpace); // Floor to avoid decimals
    
    if (actualAmount > 0) {
      (this.RES as any)[type] += actualAmount;
    }
    
    // Only warn once when storage is completely full and we're trying to add more
    if (actualAmount === 0 && amount > 0 && !this.storageFullWarned) {
      this.msg(`Storage full! Cannot store more ${String(type)}`, 'warn');
      this.storageFullWarned = true;
    } else if (actualAmount > 0) {
      this.storageFullWarned = false; // Reset warning when we can store again
    }
    
    return actualAmount;
  }
  day = 1; tDay = 0; dayLength = 180; fastForward = 1; paused = false;
  prevIsNight = false;

  colonists: Colonist[] = [];
  enemies: Enemy[] = [];
  trees: Array<{ x: number; y: number; r: number; hp: number; type: 'tree' }> = [];
  rocks: Array<{ x: number; y: number; r: number; hp: number; type: 'rock' }> = [];
  buildings: Building[] = [];
  bullets: Bullet[] = [];
  particles: Particle[] = [];
  messages: Message[] = [];

  selectedBuild: keyof typeof BUILD_TYPES | null = 'house';
  hotbar: Array<keyof typeof BUILD_TYPES> = ['house', 'farm', 'turret', 'wall', 'stock', 'tent', 'warehouse', 'well', 'infirmary'];
  showBuildMenu = false;
  debug = { nav: false, paths: true, colonists: false, forceDesktopMode: false };
  // selection & camera follow
  selColonist: Colonist | null = null;
  follow = false;
  // Touch gesture state
  private touchLastPan: { x: number; y: number } | null = null;
  private touchLastDist: number | null = null;

  keyState: Record<string, boolean> = {};
  once = new Set<string>();
  mouse = { x: 0, y: 0, wx: 0, wy: 0, down: false, rdown: false };
  lastPaintCell: { gx: number; gy: number } | null = null;
  eraseDragStart: { x: number; y: number } | null = null;
  menuRects: Array<{ key: keyof typeof BUILD_TYPES; x: number; y: number; w: number; h: number }> = [];
  hotbarRects: Array<{ index: number; x: number; y: number; w: number; h: number }> = [];
  // Precise placement (touch): pending building location to adjust before confirm
  pendingPlacement: { key: keyof typeof BUILD_TYPES; x: number; y: number; rot?: 0|90|180|270 } | null = null;
  placeUIRects: Array<{ id: 'up'|'down'|'left'|'right'|'ok'|'cancel'|'rotL'|'rotR'; x: number; y: number; w: number; h: number }> = [];
  // Dragging support for precise placement
  private pendingDragging = false;
  // UI hit regions for colonist panel
  colonistPanelRect: { x: number; y: number; w: number; h: number } | null = null;
  colonistPanelCloseRect: { x: number; y: number; w: number; h: number } | null = null;
  colonistProfileTab: 'bio' | 'health' | 'gear' | 'social' | 'stats' | 'log' = 'bio';
  colonistTabRects: Array<{ tab: string; x: number; y: number; w: number; h: number }> = [];
  // Health tab action rects (set by UI draw)
  colonistHealthActions: { tend: { x: number; y: number; w: number; h: number }; rescue: { x: number; y: number; w: number; h: number } } | null = null;
  
  // Context menu system
  contextMenu: {
    visible: boolean;
    x: number;
    y: number;
    target: Colonist | null;
    items: Array<{
      id: string;
      label: string;
      icon: string;
      enabled: boolean;
      submenu?: Array<{ id: string; label: string; icon: string; enabled: boolean }>;
    }>;
    openSubmenu?: string; // Track which submenu is currently open
  } | null = null;
  contextMenuRects: Array<{ id: string; x: number; y: number; w: number; h: number; isSubmenu?: boolean; parentId?: string }> = [];
  
  // Long press support for mobile context menus
  longPressTimer: number | null = null;
  longPressStartPos: { x: number; y: number } | null = null;
  longPressStartTime: number | null = null;
  longPressTarget: Colonist | null = null;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('no ctx');
    this.canvas = canvas; this.ctx = ctx;
    this.DPR = Math.max(1, Math.min(2, (window as any).devicePixelRatio || 1));
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
    this.bindInput();
    this.newGame();
    this.rebuildNavGrid(); 
    this.RES.wood = 50; this.RES.stone = 30; this.RES.food = 20; this.day = 1; this.tDay = 0; this.fastForward = 1; this.camera.zoom = 1; 
    const viewW = this.canvas.width / this.DPR / this.camera.zoom; 
    const viewH = this.canvas.height / this.DPR / this.camera.zoom; 
    this.camera.x = HQ_POS.x - viewW / 2; 
    this.camera.y = HQ_POS.y - viewH / 2; 
    this.clampCameraToWorld();
    
    // Initialize item database
    itemDatabase.loadItems();
  // Init debug console
  initDebugConsole(this);
    
    requestAnimationFrame(this.frame);
  }

  // ===== Inventory & Item Helpers =====
  // Aggregate equipped items
  private getEquippedItems(c: Colonist) {
    const eq = c.inventory?.equipment || {} as any;
    return [eq.helmet, eq.armor, eq.weapon, eq.tool, eq.accessory].filter(Boolean) as any[];
  }

  // Movement speed multiplier from equipment (armor penalties etc.)
  getMoveSpeedMultiplier(c: Colonist): number {
    let penalty = 0;
    for (const it of this.getEquippedItems(c)) {
      if (!it?.defName) continue;
      const def = itemDatabase.getItemDef(it.defName);
      if (def?.movementPenalty) penalty += def.movementPenalty;
    }
    // Clamp total penalty to 40% max
    penalty = Math.min(0.4, Math.max(0, penalty));
    const mult = 1 - penalty;
    return Math.max(0.6, mult); // never slower than 60%
  }

  // Work speed multiplier based on equipped tools/clothes for a given work type label
  getWorkSpeedMultiplier(c: Colonist, workType: 'Construction' | 'Woodcutting' | 'Mining' | 'Farming' | 'Harvest' | string): number {
    let bonus = 0;
    for (const it of this.getEquippedItems(c)) {
      if (!it?.defName) continue;
      const def = itemDatabase.getItemDef(it.defName);
      if (!def?.workSpeedBonus) continue;
      if (!def.workTypes || def.workTypes.includes(workType)) {
        bonus += def.workSpeedBonus; // additive bonuses
      }
    }
    // Modest cap to avoid extremes
    bonus = Math.min(0.8, Math.max(0, bonus));
    return 1 + bonus;
  }

  // Armor damage reduction from helmet/armor; returns fraction reduced (0..0.8)
  getArmorReduction(c: Colonist): number {
    let armor = 0;
    const eq = c.inventory?.equipment || {} as any;
    const pieces = [eq.helmet, eq.armor];
    for (const it of pieces) {
      if (!it?.defName) continue;
      const def = itemDatabase.getItemDef(it.defName);
      if (def?.armorRating) armor += def.armorRating;
    }
    return Math.min(0.8, Math.max(0, armor));
  }

  // Apply damage to a colonist, considering armor
  applyDamageToColonist(c: Colonist, rawDamage: number) {
    const red = this.getArmorReduction(c);
    const dmg = rawDamage * (1 - red);
    c.hp = Math.max(0, c.hp - dmg);
  }

  // Try to consume one Food item from inventory; returns true if eaten
  tryConsumeInventoryFood(c: Colonist): boolean {
    if (!c.inventory) return false;
    const items = c.inventory.items;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      // Prefer explicit category when present; fallback to def lookup
      const isFood = it.category === 'Food' || (!!it.defName && (itemDatabase.getItemDef(it.defName)?.category === 'Food'));
      if (!isFood || it.quantity <= 0) continue;
      // Determine nutrition -> hunger reduction (map roughly 1 nutrition = 3 hunger)
      const nutrition = it.defName ? (itemDatabase.getItemDef(it.defName)?.nutrition || 10) : 10;
      const hungerReduce = Math.max(20, Math.min(70, Math.round(nutrition * 3)));
      c.hunger = Math.max(0, (c.hunger || 0) - hungerReduce);
      // Small heal and mood bump via message
      c.hp = Math.min(100, c.hp + 1.5);
      this.msg(`${c.profile?.name || 'Colonist'} ate ${it.name}`, 'good');
      // Decrement stack and cleanup
      it.quantity -= 1;
      if (it.quantity <= 0) items.splice(i, 1);
      this.recalcInventoryWeight(c);
      return true;
    }
    return false;
  }

  recalcInventoryWeight(c: Colonist) {
    if (!c.inventory) return;
    let total = 0;
    for (const it of c.inventory.items) total += (it.weight || 0) * (it.quantity || 1);
    const eq: any = c.inventory.equipment || {};
    for (const slot of ['helmet','armor','weapon','tool','accessory']) {
      const it = eq[slot];
      if (it) total += it.weight || 0;
    }
    c.inventory.currentWeight = Math.round(total * 100) / 100;
  }
  
  // Ensure camera remains within world bounds based on current zoom and canvas size
  private clampCameraToWorld() {
    const viewW = this.canvas.width / this.DPR / this.camera.zoom;
    const viewH = this.canvas.height / this.DPR / this.camera.zoom;
    const maxX = Math.max(0, WORLD.w - viewW);
    const maxY = Math.max(0, WORLD.h - viewH);
    if (!Number.isFinite(this.camera.x)) this.camera.x = 0;
    if (!Number.isFinite(this.camera.y)) this.camera.y = 0;
    this.camera.x = clamp(this.camera.x, 0, maxX);
    this.camera.y = clamp(this.camera.y, 0, maxY);
  }

  handleResize = () => {
    // Use actual header height for accurate canvas sizing across responsive layouts
    const headerEl = document.querySelector('header') as HTMLElement | null;
    const headerH = headerEl ? Math.ceil(headerEl.getBoundingClientRect().height) : 48;
    const w = window.innerWidth, h = window.innerHeight - headerH;
    this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    this.canvas.width = Math.floor(w * this.DPR); this.canvas.height = Math.floor(h * this.DPR);
    
    // Calculate UI scale based on screen size and DPR
    this.calculateUIScale();
  // Keep camera in bounds after resize
  this.clampCameraToWorld();
  };
  
  calculateUIScale() {
    const baseWidth = 1920; // Reference width for scaling
    const baseHeight = 1080; // Reference height for scaling
    const currentWidth = this.canvas.width / this.DPR;
    const currentHeight = this.canvas.height / this.DPR;
    
    // Calculate scale factors
    const widthScale = currentWidth / baseWidth;
    const heightScale = currentHeight / baseHeight;
    
    // Use the smaller scale to ensure UI fits
    let scale = Math.min(widthScale, heightScale);

    // Heuristic boosts for touch devices and smaller screens
    const isTouch = (("ontouchstart" in window) || (navigator as any).maxTouchPoints > 0);
    this.isTouch = isTouch;
    // Be more conservative about assuming actual touch usage - start with false
    this.isActuallyTouchDevice = isTouch && (currentWidth < 900); // Only assume touch for smaller screens initially
    if (isTouch) {
      // Aggressive readability boosts for touch devices
      if (currentWidth < 600) {
        // Phones
        scale = Math.max(scale * 1.9, 1.6);
      } else if (currentWidth <= 900) {
        // Small tablets (e.g., iPad portrait 820px)
        scale = Math.max(scale * 1.7, 1.5);
      } else if (currentWidth <= 1200) {
        // Larger tablets / small laptops with touch
        scale = Math.max(scale * 1.5, 1.35);
      } else {
        // Large touch screens
        scale = Math.max(scale * 1.25, scale);
      }
    } else {
      // Non-touch small/medium displays
      if (currentWidth < 1200) scale *= 1.1;
    }

    // Apply final bounds (higher floor improves readability on tablets)
    scale = Math.max(1.1, Math.min(scale, 3.0));
    
    this.uiScale = scale;
    console.log(`UI Scale calculated: ${scale.toFixed(2)} for ${currentWidth}x${currentHeight}`);
  }
  
  // Helper function to get scaled font size
  getScaledFont(baseSize: number, weight = '500', family = 'system-ui,Segoe UI,Roboto') {
    return `${weight} ${Math.round(baseSize * this.uiScale)}px ${family}`;
  }
  
  // Helper function to scale values
  scale(value: number): number {
    return Math.round(value * this.uiScale);
  }

  screenToWorld = (sx: number, sy: number) => ({ x: (sx * this.DPR) / this.camera.zoom + this.camera.x, y: (sy * this.DPR) / this.camera.zoom + this.camera.y });

  bindInput() {
    const c = this.canvas;
    c.addEventListener('mousemove', (e) => {
      const rect = c.getBoundingClientRect();
      this.mouse.x = (e.clientX - rect.left);
      this.mouse.y = (e.clientY - rect.top);
      const wpt = this.screenToWorld(this.mouse.x, this.mouse.y);
      this.mouse.wx = wpt.x; this.mouse.wy = wpt.y;
      // While adjusting a pending placement, drag follows cursor (grid-snap)
      if (this.pendingPlacement && this.mouse.down) {
        const def = BUILD_TYPES[this.pendingPlacement.key];
        const rot = this.pendingPlacement.rot || 0; const rotated = (rot === 90 || rot === 270);
        const gx = Math.floor(this.mouse.wx / T) * T; const gy = Math.floor(this.mouse.wy / T) * T;
        const w = (rotated ? def.size.h : def.size.w) * T, h = (rotated ? def.size.w : def.size.h) * T;
        this.pendingPlacement.x = clamp(gx, 0, WORLD.w - w);
        this.pendingPlacement.y = clamp(gy, 0, WORLD.h - h);
        return;
      }
      // Drag-to-paint paths
      if (this.mouse.down) {
        if (this.selectedBuild === 'path') this.paintPathAtMouse();
        else if (this.selectedBuild === 'wall') this.paintWallAtMouse();
      }
    });
    c.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.lastInputWasTouch = false; // Track that mouse is being used
      if ((e as MouseEvent).button === 0) {
        this.mouse.down = true;
        // Desktop: close colonist panel via X or clicking outside panel
        if (this.selColonist) {
          const mx0 = this.mouse.x * this.DPR; const my0 = this.mouse.y * this.DPR;
          if (this.colonistPanelCloseRect) {
            const r = this.colonistPanelCloseRect;
            if (mx0 >= r.x && mx0 <= r.x + r.w && my0 >= r.y && my0 <= r.y + r.h) {
              this.selColonist = null; this.follow = false; return;
            }
          }
          // Check for tab clicks
          if (this.colonistTabRects) {
            for (const tabRect of this.colonistTabRects) {
              if (mx0 >= tabRect.x && mx0 <= tabRect.x + tabRect.w && my0 >= tabRect.y && my0 <= tabRect.y + tabRect.h) {
                this.colonistProfileTab = tabRect.tab as any;
                return;
              }
            }
          }
          if (this.colonistPanelRect) {
            const r = this.colonistPanelRect;
            const inside = mx0 >= r.x && mx0 <= r.x + r.w && my0 >= r.y && my0 <= r.y + r.h;
            // On desktop, only close when clicking outside if not over the panel
            if (!inside) { this.selColonist = null; this.follow = false; return; }
            // Inside panel: check health action buttons if on Health tab
            if (this.selColonist && this.colonistProfileTab === 'health' && this.colonistHealthActions) {
              const act = this.colonistHealthActions;
              const hit = (rr: any) => mx0 >= rr.x && mx0 <= rr.x + rr.w && my0 >= rr.y && my0 <= rr.y + rr.h;
              if (hit(act.tend)) {
                // Assign a colonist to tend the selected colonist (self-tend if no one else)
                const target = this.selColonist;
                const candidates = this.colonists.filter(c => c !== target && c.alive && !(c as any).health?.downed && !c.inside);
                let tender = candidates[0];
                if (candidates.length > 1) {
                  const dc = (p: any) => (p.x - target.x) * (p.x - target.x) + (p.y - target.y) * (p.y - target.y);
                  tender = candidates.sort((a,b) => dc(a) - dc(b))[0];
                }
                if (!tender && target && target.alive && !(target as any).health?.downed) tender = target; // self-tend
                if (tender) {
                  tender.task = null; tender.target = null; this.clearPath && this.clearPath(tender);
                  (tender as any).tendTarget = target;
                  (tender as any).state = 'tend'; (tender as any).stateSince = 0;
                  this.msg('Tend ordered', 'info');
                } else {
                  this.msg('No available tender', 'warn');
                }
                return;
              }
              if (hit(act.rescue)) {
                // Assign nearest healthy colonist to rescue selected colonist
                const target = this.selColonist;
                const rescuer = this.colonists.find(c => c !== target && c.alive && !(c as any).health?.downed && !c.inside);
                if (rescuer) {
                  rescuer.task = null; rescuer.target = null; this.clearPath && this.clearPath(rescuer);
                  (rescuer as any).rescueTarget = target; (rescuer as any).state = 'rescue'; (rescuer as any).stateSince = 0;
                  this.msg('Rescue ordered', 'info');
                }
                else this.msg('No available rescuer', 'warn');
                return;
              }
            }
          }
        }
        // If precise placement UI active, handle mouse clicks like taps/drag
        if (this.pendingPlacement) {
          const mx = this.mouse.x * this.DPR; const my = this.mouse.y * this.DPR;
          // Buttons first
          if (this.placeUIRects.length) {
            for (const r of this.placeUIRects) {
              if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
                if (r.id === 'up') this.nudgePending(0, -1);
                else if (r.id === 'down') this.nudgePending(0, 1);
                else if (r.id === 'left') this.nudgePending(-1, 0);
                else if (r.id === 'right') this.nudgePending(1, 0);
                else if (r.id === 'ok') this.confirmPending();
                else if (r.id === 'cancel') this.cancelPending();
                else if (r.id === 'rotL') this.rotatePending(-90);
                else if (r.id === 'rotR') this.rotatePending(90);
                return;
              }
            }
          }
          // Ghost hit = start drag/confirm; else move ghost to clicked tile
          const p = this.pendingPlacement; const def = BUILD_TYPES[p.key];
          const toScreen = (wx: number, wy: number) => ({ x: (wx - this.camera.x) * this.camera.zoom, y: (wy - this.camera.y) * this.camera.zoom });
          const g = toScreen(p.x, p.y);
          const gw = def.size.w * T * this.camera.zoom; const gh = def.size.h * T * this.camera.zoom;
          if (mx >= g.x && mx <= g.x + gw && my >= g.y && my <= g.y + gh) { 
            // Begin dragging the ghost instead of instant-confirm; double-click not needed
            this.pendingDragging = true; 
            return; 
          }
          const rot = p.rot || 0; const rotated = (rot === 90 || rot === 270);
          const gx = Math.floor(this.mouse.wx / T) * T; const gy = Math.floor(this.mouse.wy / T) * T;
          const w = (rotated ? def.size.h : def.size.w) * T, h = (rotated ? def.size.w : def.size.h) * T;
          p.x = clamp(gx, 0, WORLD.w - w); p.y = clamp(gy, 0, WORLD.h - h);
          return;
        }
        // Detect hotbar click before anything else
        const mx = this.mouse.x * this.DPR; const my = this.mouse.y * this.DPR;
        for (const r of this.hotbarRects) {
          if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
            const key = this.hotbar[r.index];
            if (key) { this.selectedBuild = key; this.toast('Selected: ' + BUILD_TYPES[key].name); }
            return;
          }
        }
        
        // Check for context menu click
        if (this.contextMenu) {
          const mx = this.mouse.x * this.DPR; const my = this.mouse.y * this.DPR;
          let clickedOnMenu = false;
          
          // Check if clicking on any context menu item
          for (const rect of this.contextMenuRects) {
            if (mx >= rect.x && mx <= rect.x + rect.w && my >= rect.y && my <= rect.y + rect.h) {
              if (this.contextMenu.target) {
                // Check if this is a parent item with submenu
                const parentItem = this.contextMenu.items.find(item => item.id === rect.id);
                if (parentItem && parentItem.submenu) {
                  // Toggle submenu visibility
                  if (this.contextMenu.openSubmenu === rect.id) {
                    this.contextMenu.openSubmenu = undefined; // Close submenu
                  } else {
                    this.contextMenu.openSubmenu = rect.id; // Open submenu
                  }
                  clickedOnMenu = true;
                  return;
                } else {
                  // Execute action for regular items or submenu items
                  this.handleContextMenuAction(rect.id, this.contextMenu.target);
                  this.contextMenu = null;
                  this.contextMenuRects = [];
                  clickedOnMenu = true;
                  return;
                }
              }
            }
          }
          
          if (!clickedOnMenu) {
            // Click outside context menu - close it
            this.contextMenu = null;
            this.contextMenuRects = [];
          }
        }
        
  if (this.showBuildMenu) { handleBuildMenuClickUI(this); return; }
        
        // Check for erase mode (set by mobile erase button)
        if ((window as any)._eraseOnce) {
          (window as any)._eraseOnce = false; // Consume the flag
          this.cancelOrErase();
          return;
        }
        
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
        
        // Check for colonist context menu
        const clickedColonist = this.findColonistAt(this.mouse.wx, this.mouse.wy);
        if (clickedColonist) {
          showContextMenuUI(this, clickedColonist, this.mouse.x, this.mouse.y);
          return;
        }
        
        this.eraseDragStart = { x: this.mouse.wx, y: this.mouse.wy };
      }
    });
    c.addEventListener('mouseup', (e) => {
      e.preventDefault();
      if ((e as MouseEvent).button === 0) { 
        this.mouse.down = false; this.lastPaintCell = null; 
        this.pendingDragging = false;
      }
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
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      // Zoom around cursor position
      const rect = c.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const worldBefore = this.screenToWorld(cx, cy);
      const newZoom = Math.max(0.6, Math.min(2.2, this.camera.zoom * zoomFactor));
      this.camera.zoom = newZoom;
      const worldAfter = this.screenToWorld(cx, cy);
      this.camera.x += worldBefore.x - worldAfter.x;
      this.camera.y += worldBefore.y - worldAfter.y;
      this.clampCameraToWorld();
    });
  window.addEventListener('keydown', (e) => { 
    // If debug console is open, don't process game keybinds here
    const dc = (this as any).debugConsole;
    if (dc && dc.open) return;
    const k = (e as KeyboardEvent).key.toLowerCase(); 
    this.keyState[k] = true; 
    if (!this.once.has(k)) this.once.add(k); 
    
    // Prevent default behavior for game shortcuts to avoid browser interference
    if (k === ' ' || k === 'h' || k === 'b' || k === 'f' || k === 'g' || k === 'j' || k === 'k' || k === 'escape' || /^[1-9]$/.test(k) || k === 'w' || k === 'a' || k === 's' || k === 'd' || k === '+' || k === '=' || k === '-' || k === '_') {
      e.preventDefault();
    }
  });
    window.addEventListener('keyup', (e) => { 
      const dc = (this as any).debugConsole; if (dc && dc.open) return;
      this.keyState[(e as KeyboardEvent).key.toLowerCase()] = false; 
    });
    window.addEventListener('keydown', (e) => {
      // Backquote toggles console; if open, route keys to console and stop propagation
      const ke = e as KeyboardEvent;
      if (ke.key === '`' || (ke.code === 'Backquote')) { e.preventDefault(); toggleDebugConsole(this); return; }
      const handled = handleDebugConsoleKey(this, e as KeyboardEvent);
      if (handled) { e.preventDefault(); e.stopPropagation(); }
    });
    
    // Unified touch input: pan, pinch-zoom, and tap/select/place
    c.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.lastInputWasTouch = true;
      this.isActuallyTouchDevice = true;
      if (e.touches.length === 1) {
        this.touchLastPan = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        
        // Start long press timer for context menu
        const rect = c.getBoundingClientRect();
        const sx = e.touches[0].clientX - rect.left;
        const sy = e.touches[0].clientY - rect.top;
        const wpt = this.screenToWorld(sx, sy);
        const clickedColonist = this.findColonistAt(wpt.x, wpt.y);
        
        if (clickedColonist) {
          this.longPressStartPos = { x: sx, y: sy };
          this.longPressStartTime = performance.now();
          this.longPressTarget = clickedColonist;
          
          this.longPressTimer = window.setTimeout(() => {
            showContextMenuUI(this, clickedColonist, sx, sy);
            // Provide haptic feedback if available
            if (navigator.vibrate) {
              navigator.vibrate(50);
            }
            // Clear long press state
            this.longPressStartTime = null;
            this.longPressTarget = null;
          }, 500); // 500ms long press
        }
        
      } else if (e.touches.length === 2) {
        // Cancel long press timer when multi-touch
        if (this.longPressTimer) {
          clearTimeout(this.longPressTimer);
          this.longPressTimer = null;
        }
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this.touchLastDist = Math.hypot(dx, dy);
      }
    }, { passive: false } as any);

    c.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.lastInputWasTouch = true;
      
      // Cancel long press timer if finger moves too much
      if (this.longPressTimer && this.longPressStartPos && e.touches.length === 1) {
        const rect = c.getBoundingClientRect();
        const sx = e.touches[0].clientX - rect.left;
        const sy = e.touches[0].clientY - rect.top;
        const distance = Math.hypot(sx - this.longPressStartPos.x, sy - this.longPressStartPos.y);
        if (distance > 20) { // Cancel if moved more than 20 pixels
          clearTimeout(this.longPressTimer);
          this.longPressTimer = null;
          this.longPressStartTime = null;
          this.longPressTarget = null;
        }
      }
      
      if (e.touches.length === 1 && this.touchLastPan) {
        // If adjusting a pending placement ghost, move it with the finger
        if (this.pendingPlacement) {
          const rect = c.getBoundingClientRect();
          const sx = e.touches[0].clientX - rect.left;
          const sy = e.touches[0].clientY - rect.top;
          const wpt = this.screenToWorld(sx, sy);
          this.mouse.x = sx; this.mouse.y = sy; this.mouse.wx = wpt.x; this.mouse.wy = wpt.y;
          const def = BUILD_TYPES[this.pendingPlacement.key];
          const rot = this.pendingPlacement.rot || 0; const rotated = (rot === 90 || rot === 270);
          const gx = Math.floor(this.mouse.wx / T) * T; const gy = Math.floor(this.mouse.wy / T) * T;
          const w = (rotated ? def.size.h : def.size.w) * T, h = (rotated ? def.size.w : def.size.h) * T;
          this.pendingPlacement.x = clamp(gx, 0, WORLD.w - w);
          this.pendingPlacement.y = clamp(gy, 0, WORLD.h - h);
          return;
        }
        // Pan camera in world units
        const nx = e.touches[0].clientX, ny = e.touches[0].clientY;
        const dx = nx - this.touchLastPan.x, dy = ny - this.touchLastPan.y;
        this.touchLastPan = { x: nx, y: ny };
        this.camera.x -= dx / this.camera.zoom;
        this.camera.y -= dy / this.camera.zoom;
        this.clampCameraToWorld();
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        if (this.touchLastDist != null && this.touchLastDist > 0) {
          const factor = dist / this.touchLastDist;
          // Zoom around midpoint between touches
          const rect = c.getBoundingClientRect();
          const cx = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left;
          const cy = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top;
          const worldBefore = this.screenToWorld(cx, cy);
          const newZoom = Math.max(0.6, Math.min(2.2, this.camera.zoom * factor));
          this.camera.zoom = newZoom;
          const worldAfter = this.screenToWorld(cx, cy);
          this.camera.x += worldBefore.x - worldAfter.x;
          this.camera.y += worldBefore.y - worldAfter.y;
          this.clampCameraToWorld();
        }
        this.touchLastDist = dist;
      }
    }, { passive: false } as any);

    c.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.lastInputWasTouch = true;
      
      // Cancel long press timer on touch end
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
      this.longPressStartPos = null;
      this.longPressStartTime = null;
      this.longPressTarget = null;
      
      // Treat single-finger touchend as a tap/click if not panning
      if (e.changedTouches.length === 1 && e.touches.length === 0) {
        const rect = c.getBoundingClientRect();
        const sx = e.changedTouches[0].clientX - rect.left;
        const sy = e.changedTouches[0].clientY - rect.top;
        this.handleTapOrClickAtScreen(sx, sy);
      }
      if (e.touches.length === 0) { this.touchLastPan = null; this.touchLastDist = null; }
    }, { passive: false } as any);
  }

  // Handle a tap/click at screen-space coordinates (sx, sy)
  // Mirrors the left mouse button logic to support touch taps.
  handleTapOrClickAtScreen(sx: number, sy: number) {
    const c = this.canvas;
    const rect = c.getBoundingClientRect();
    this.mouse.x = sx;
    this.mouse.y = sy;
    const wpt = this.screenToWorld(this.mouse.x, this.mouse.y);
    this.mouse.wx = wpt.x; this.mouse.wy = wpt.y;

    // If precise placement UI is active, handle its buttons or move/confirm by tapping
    if (this.pendingPlacement) {
      const mx = this.mouse.x * this.DPR; const my = this.mouse.y * this.DPR;
      // 1) Button hits (screen-space)
      if (this.placeUIRects.length) {
        for (const r of this.placeUIRects) {
          if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
            if (r.id === 'up') this.nudgePending(0, -1);
            else if (r.id === 'down') this.nudgePending(0, 1);
            else if (r.id === 'left') this.nudgePending(-1, 0);
            else if (r.id === 'right') this.nudgePending(1, 0);
            else if (r.id === 'ok') this.confirmPending();
            else if (r.id === 'cancel') this.cancelPending();
            else if (r.id === 'rotL') this.rotatePending(-90);
            else if (r.id === 'rotR') this.rotatePending(90);
            return;
          }
        }
      }
      // 2) Tap on ghost = confirm, tap elsewhere = move ghost to tapped tile
      const p = this.pendingPlacement; const def = BUILD_TYPES[p.key];
      // Compute ghost screen rect
      const toScreen = (wx: number, wy: number) => ({ x: (wx - this.camera.x) * this.camera.zoom, y: (wy - this.camera.y) * this.camera.zoom });
      const g = toScreen(p.x, p.y);
      const gw = def.size.w * T * this.camera.zoom; const gh = def.size.h * T * this.camera.zoom;
      if (mx >= g.x && mx <= g.x + gw && my >= g.y && my <= g.y + gh) { this.confirmPending(); return; }
      // Move pending to tapped world position (snap to grid)
      const gx = Math.floor(this.mouse.wx / T) * T; const gy = Math.floor(this.mouse.wy / T) * T;
      const w = def.size.w * T, h = def.size.h * T;
      p.x = clamp(gx, 0, WORLD.w - w); p.y = clamp(gy, 0, WORLD.h - h);
      return;
    }

    // If colonist panel shown, allow closing via X button or tapping outside (mobile UX)
    if (this.selColonist) {
      const mx0 = this.mouse.x * this.DPR; const my0 = this.mouse.y * this.DPR;
      if (this.colonistPanelCloseRect) {
        const r = this.colonistPanelCloseRect;
        if (mx0 >= r.x && mx0 <= r.x + r.w && my0 >= r.y && my0 <= r.y + r.h) {
          this.selColonist = null; this.follow = false; return;
        }
      }
      // Check for tab clicks
      if (this.colonistTabRects) {
        for (const tabRect of this.colonistTabRects) {
          if (mx0 >= tabRect.x && mx0 <= tabRect.x + tabRect.w && my0 >= tabRect.y && my0 <= tabRect.y + tabRect.h) {
            this.colonistProfileTab = tabRect.tab as any;
            return;
          }
        }
      }
      if (this.isTouch && this.colonistPanelRect) {
        const r = this.colonistPanelRect;
        const inside = mx0 >= r.x && mx0 <= r.x + r.w && my0 >= r.y && my0 <= r.y + r.h;
        if (!inside) { this.selColonist = null; this.follow = false; return; }
      }
    }

    // Hotbar selection
    const mx = this.mouse.x * this.DPR; const my = this.mouse.y * this.DPR;
    for (const r of this.hotbarRects) {
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        const key = this.hotbar[r.index];
        if (key) { this.selectedBuild = key; this.toast('Selected: ' + BUILD_TYPES[key].name); }
        return;
      }
    }
    
    // Check for context menu click
    if (this.contextMenu) {
      const mx = this.mouse.x * this.DPR; const my = this.mouse.y * this.DPR;
      let clickedOnMenu = false;
      
      // Check if clicking on any context menu item
      for (const rect of this.contextMenuRects) {
        if (mx >= rect.x && mx <= rect.x + rect.w && my >= rect.y && my <= rect.y + rect.h) {
          if (this.contextMenu.target) {
            // Check if this is a parent item with submenu
            const parentItem = this.contextMenu.items.find(item => item.id === rect.id);
            if (parentItem && parentItem.submenu) {
              // Toggle submenu visibility
              if (this.contextMenu.openSubmenu === rect.id) {
                this.contextMenu.openSubmenu = undefined; // Close submenu
              } else {
                this.contextMenu.openSubmenu = rect.id; // Open submenu
              }
              clickedOnMenu = true;
              return;
            } else {
              // Execute action for regular items or submenu items
              this.handleContextMenuAction(rect.id, this.contextMenu.target);
              this.contextMenu = null;
              this.contextMenuRects = [];
              clickedOnMenu = true;
              return;
            }
          }
        }
      }
      
      if (!clickedOnMenu) {
        // Click outside context menu - close it
        this.contextMenu = null;
        this.contextMenuRects = [];
      }
    }

    // Build menu click
  if (this.showBuildMenu) { handleBuildMenuClickUI(this); return; }

    // Check for erase mode (set by mobile erase button)
    if ((window as any)._eraseOnce) {
      (window as any)._eraseOnce = false; // Consume the flag
      this.cancelOrErase();
      return;
    }

    // Building/selection logic
  if (this.selectedBuild === 'path') { this.paintPathAtMouse(true); return; }
  if (this.selectedBuild === 'wall') { this.paintWallAtMouse(true); return; }

  // Start precise placement on touch if nothing active (unless forced desktop mode)
  if (!this.debug.forceDesktopMode && this.isActuallyTouchDevice && this.lastInputWasTouch && this.selectedBuild) { this.placeAtMouse(); return; }

    const col = this.findColonistAt(this.mouse.wx, this.mouse.wy);
    if (col) { this.selColonist = col; this.follow = true; return; }
    this.placeAtMouse();
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
    // Rebuild navigation grid after scattering resources
    this.rebuildNavGrid();
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
          // Rebuild navigation grid when new resource is added
          this.rebuildNavGrid();
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
  this.RES.wood = 50; this.RES.stone = 30; this.RES.food = 20; this.day = 1; this.tDay = 0; this.fastForward = 1; this.camera.zoom = 1; this.camera.x = HQ_POS.x - (this.canvas.width / this.DPR) / (2 * this.camera.zoom); this.camera.y = HQ_POS.y - (this.canvas.height / this.DPR) / (2 * this.camera.zoom);
    this.buildHQ();
    this.scatter();
  for (let i = 0; i < 3; i++) { const a = rand(0, Math.PI * 2); const r = 80 + rand(-10, 10); this.spawnColonist({ x: HQ_POS.x + Math.cos(a) * r, y: HQ_POS.y + Math.sin(a) * r }); }
    // Post-process: ensure at least one starting colonist has a ranged weapon
    const hasAnyRanged = this.colonists.some(c => c.inventory?.equipment?.weapon && (c.inventory!.equipment!.weapon!.defName === 'Pistol' || c.inventory!.equipment!.weapon!.defName === 'Rifle'));
    if (!hasAnyRanged && this.colonists.length) {
      const c = this.colonists[0];
      const pistol = itemDatabase.createItem('Pistol', 1, 'normal');
      if (pistol) {
        if (!c.inventory) c.inventory = { items: [], equipment: {}, carryCapacity: 50, currentWeight: 0 };
        c.inventory.equipment.weapon = pistol;
        this.recalcInventoryWeight(c);
        this.msg(`${c.profile?.name || 'Colonist'} starts with a pistol for defense.`, 'info');
      }
    }
    this.msg("Welcome! Build farms before night, then turrets.");
  }

  spawnColonist(pos: { x: number; y: number }) {
    const profile = generateColonistProfile();
    const c: Colonist = { 
      x: pos.x, y: pos.y, r: 8, hp: 100, 
      speed: 50 * profile.stats.workSpeed, // Apply work speed modifier
      task: null, target: null, carrying: null, 
      hunger: 0, alive: true, color: profile.avatar.clothing, 
      t: rand(0, 1),
      direction: 0, // Initialize facing direction (0 = facing right)
      profile: profile,
      inventory: JSON.parse(JSON.stringify(profile.startingInventory)) // Deep copy the starting inventory
    };
    this.colonists.push(c); 
    this.msg(`${getColonistDescription(profile)} has joined the colony!`, 'good');
    return c;
  }
  spawnEnemy() {
    const edge = randi(0, 4); let x, y; if (edge === 0) { x = rand(0, WORLD.w); y = -80; } else if (edge === 1) { x = rand(0, WORLD.w); y = WORLD.h + 80; } else if (edge === 2) { x = -80; y = rand(0, WORLD.h); } else { x = WORLD.w + 80; y = rand(0, WORLD.h); }
    const e: Enemy = { x, y, r: 9, hp: 60 + this.day * 6, speed: 48 + this.day * 2, dmg: 8 + this.day, target: null, color: COLORS.enemy };
    this.enemies.push(e); return e;
  }

  // Placement
  placeAtMouse() { placeAtMousePlacement(this); }

  private tryPlaceNow(t: keyof typeof BUILD_TYPES, wx: number, wy: number, rot?: 0|90|180|270) { tryPlaceNowPlacement(this, t, wx, wy, rot); }

  nudgePending(dx: number, dy: number) { nudgePendingPlacement(this, dx, dy); }

  rotatePending(delta: -90 | 90) { rotatePendingPlacement(this, delta); }

  confirmPending() { confirmPendingPlacement(this); }

  cancelPending() { cancelPendingPlacement(this); }

  paintPathAtMouse(force = false) { paintPathAtMousePlacement(this, force); }

  paintWallAtMouse(force = false) { paintWallAtMousePlacement(this, force); }

  eraseInRect(rect: { x: number; y: number; w: number; h: number }) { eraseInRectPlacement(this, rect); }
  cancelOrErase() { cancelOrErasePlacement(this); }

  evictColonistsFrom(b: Building) { evictColonistsFromPlacement(this, b); }

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
  clearPath(c: Colonist) { 
    c.path = undefined; 
    c.pathIndex = undefined; // RE-ENABLED
    // c.repath = 0; // REPATH TIMER STILL DISABLED
  }
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
    // During night time, don't assign new tasks - colonists should be sleeping
    if (this.isNight()) {
      this.setTask(c, 'idle', { x: c.x, y: c.y }); // Stay in place, FSM will handle sleep transition
      return;
    }
    
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
    
    // Check for ready farms to harvest
    const readyFarm = this.buildings.find(b => b.kind === 'farm' && b.done && b.ready);
    if (readyFarm) { this.setTask(c, 'harvestFarm', readyFarm); return; }
    
    // Check for wells to collect from (limit frequency to avoid spam)
    if (Math.random() < 0.1) { // 10% chance per frame to check wells
      const availableWell = this.buildings.find(b => b.kind === 'well' && b.done);
      if (availableWell) { this.setTask(c, 'harvestWell', availableWell); return; }
    }
    if (this.RES.food < Math.max(4, this.colonists.length * 2)) {
      const nearTree = this.nearestCircle({ x: c.x, y: c.y }, this.trees.filter(t => !this.assignedTargets.has(t)) as any);
      if (nearTree) { this.setTask(c, 'chop', nearTree); return; }
    }
    
    // Debug resource balancing logic
    const availableTrees = this.trees.filter(t => !this.assignedTargets.has(t));
    const availableRocks = this.rocks.filter(r => !this.assignedTargets.has(r));
    if (Math.random() < 0.05) {
      console.log(`Task assignment: wood=${this.RES.wood}, stone=${this.RES.stone}, trees=${availableTrees.length}, rocks=${availableRocks.length}`);
    }
    
    if (this.RES.wood < this.RES.stone) {
      const tr = this.nearestSafeCircle(c, { x: c.x, y: c.y }, availableTrees as any); 
      if (tr) { 
        if (Math.random() < 0.1) console.log('Assigning chop task');
        this.setTask(c, 'chop', tr); return; 
      } else {
        if (Math.random() < 0.1) console.log('No trees available for chopping');
      }
    } else {
      const rk = this.nearestSafeCircle(c, { x: c.x, y: c.y }, availableRocks as any); 
      if (rk) { 
        if (Math.random() < 0.1) console.log('Assigning mine task to rock at:', rk);
        this.setTask(c, 'mine', rk); return; 
      } else {
        if (Math.random() < 0.1) console.log('No rocks available for mining');
      }
    }
    if (Math.random() < 0.1) console.log('Assigning idle task');
    this.setTask(c, 'idle', { x: c.x + rand(-80, 80), y: c.y + rand(-80, 80) });
  }
  nearestCircle<T extends { x: number; y: number }>(p: { x: number; y: number }, arr: T[]): T | null {
    let best: T | null = null, bestD = 1e9; for (const o of arr) { const d = dist2(p as any, o as any); if (d < bestD) { bestD = d; best = o; } } return best;
  }
  
  nearestSafeCircle<T extends { x: number; y: number }>(c: Colonist, p: { x: number; y: number }, arr: T[]): T | null {
    // Filter out targets that are in dangerous areas based on colonist's danger memory
    const safeTargets = arr.filter(target => {
      const dangerMemory = (c as any).dangerMemory;
      if (!dangerMemory || !Array.isArray(dangerMemory)) return true;
      
      // Check if target is in any remembered dangerous area
      for (const mem of dangerMemory) {
        const distanceToTarget = Math.hypot(target.x - mem.x, target.y - mem.y);
        const timeSinceDanger = c.t - mem.time;
        
        // Gradually reduce danger radius over time (full avoidance for 5 seconds, then fade out over 15 more seconds)
        const currentRadius = timeSinceDanger < 5 ? mem.radius : 
                             timeSinceDanger < 20 ? mem.radius * (1 - (timeSinceDanger - 5) / 15) : 0;
        
        if (distanceToTarget < currentRadius) {
          if (Math.random() < 0.1) { // Log occasionally to avoid spam
            console.log(`Danger memory: Avoiding target at (${target.x.toFixed(0)}, ${target.y.toFixed(0)}) due to danger memory at (${mem.x.toFixed(0)}, ${mem.y.toFixed(0)}), distance=${distanceToTarget.toFixed(0)}, radius=${currentRadius.toFixed(0)}`);
          }
          return false; // Target is in dangerous area
        }
      }
      return true; // Target is safe
    });
    
    // Log when danger memory filters out targets
    if (safeTargets.length < arr.length && Math.random() < 0.2) {
      console.log(`Danger memory: Filtered ${arr.length - safeTargets.length} dangerous targets out of ${arr.length} total`);
    }
    
    // Use regular nearest selection on safe targets
    return this.nearestCircle(p, safeTargets);
  }
  moveAlongPath(c: Colonist, dt: number, target?: { x: number; y: number }, arrive = 10) {
    // periodic re-pathing but only if goal changed or timer elapsed - REPATH TIMER TEMPORARILY DISABLED
    // c.repath = (c.repath || 0) - dt; // TEMPORARILY DISABLED
    const goalChanged = target && (!c.pathGoal || Math.hypot(c.pathGoal.x - target.x, c.pathGoal.y - target.y) > 24); // Increased from 12 to 24
    // if (target && (goalChanged || c.repath == null || c.repath <= 0 || !c.path || c.pathIndex == null)) {
    if (target && (goalChanged || !c.path || c.pathIndex == null)) { // RE-ENABLED PATHINDEX CHECK, REPATH TIMER STILL DISABLED
      const p = this.computePathWithDangerAvoidance(c, c.x, c.y, target.x, target.y);
      if (p && p.length) { 
        c.path = p; 
        c.pathIndex = 0; // RE-ENABLED
        c.pathGoal = { x: target.x, y: target.y }; 
        // Debug: Log if path goes through low-cost areas
        if (Math.random() < 0.1) {
          let pathTiles = 0;
          for (const node of p) {
            const gx = Math.floor(node.x / T), gy = Math.floor(node.y / T);
            if (gx >= 0 && gy >= 0 && gx < this.grid.cols && gy < this.grid.rows) {
              const idx = gy * this.grid.cols + gx;
              if (this.grid.cost[idx] <= 0.7) pathTiles++;
            }
          }
          if (pathTiles > 0) {
            console.log(`Computed path with ${pathTiles}/${p.length} low-cost tiles`);
          }
        }
      } else {
        // Failed to compute path - log this issue
        if (Math.random() < 0.05) {
          console.log(`Failed to compute path from (${c.x.toFixed(1)}, ${c.y.toFixed(1)}) to (${target.x.toFixed(1)}, ${target.y.toFixed(1)})`);
        }
      }
      // c.repath = 5.0; // seconds between recompute - TEMPORARILY DISABLED
    }
    // PATHINDEX LOGIC RE-ENABLED
    if (!c.path || c.pathIndex == null || c.pathIndex >= c.path.length) {
      if (target) { const d = Math.hypot(c.x - target.x, c.y - target.y); return d <= arrive; }
      return false;
    }
    // Use pathIndex to get current node
    const node = c.path[c.pathIndex];
    if (!node || node.x == null || node.y == null) {
      // Invalid node - clear path and return failure
      console.log(`Invalid path node at index ${c.pathIndex}, clearing path`);
      this.clearPath(c);
      if (target) { const d = Math.hypot(c.x - target.x, c.y - target.y); return d <= arrive; }
      return false;
    }
    const dx = node.x - c.x; const dy = node.y - c.y; let L = Math.hypot(dx, dy);
    // Hysteresis to avoid oscillation around a node
    const arriveNode = 15; // base arrival radius for nodes (increased from 10 to be more forgiving)
    const hysteresis = 6; // extra slack once we've been near a node (increased from 4)
    // Movement speed; boost if standing on a path tile
  let speed = c.speed * ((c as any).fatigueSlow || 1) * this.getMoveSpeedMultiplier(c);
    let onPath = false;
    {
      const gx = Math.floor(c.x / T), gy = Math.floor(c.y / T);
      const inBounds = gx >= 0 && gy >= 0 && gx < this.grid.cols && gy < this.grid.rows;
      if (inBounds) {
        const idx = gy * this.grid.cols + gx;
        // If cost lowered significantly (<=0.7), treat as path tile and add +25 speed bonus
        if (this.grid.cost[idx] <= 0.7) {
          speed += 25;
          onPath = true;
          if (Math.random() < 0.01) { // 1% chance to log
            console.log(`Colonist at (${c.x.toFixed(1)}, ${c.y.toFixed(1)}) on path tile - cost: ${this.grid.cost[idx]}, speed: ${speed}`);
          }
        }
      }
    }
    // Prevent overshoot that causes ping-pong around node: snap to node if close or step would overshoot
    const step = speed * dt;
    if (L <= Math.max(arriveNode, step)) {
      // Snap to node and advance - PATHINDEX RE-ENABLED
      c.x = node.x; c.y = node.y;
      c.pathIndex++;
      // Don't shift the array, just use pathIndex to track position
      c.jitterScore = 0; c.jitterWindow = 0; c.lastDistToNode = undefined; (c as any).lastDistSign = undefined;
      if (c.pathIndex >= c.path.length) { c.path = undefined; c.pathIndex = undefined; if (target) return Math.hypot(c.x - target.x, c.y - target.y) <= arrive; return true; }
      return false;
    }

    // Jitter detection: only react to true oscillation (distance trend sign flip) when near the node
    c.jitterWindow = (c.jitterWindow || 0) + dt;
    if (c.lastDistToNode != null) {
      const delta = L - c.lastDistToNode;
      const sign = delta === 0 ? 0 : (delta > 0 ? 1 : -1);
      const prevSign = (c as any).lastDistSign ?? sign;
      // Count as jitter only if the distance trend flips while we're reasonably near the node
      if (sign !== 0 && prevSign !== 0 && sign !== prevSign && L < arriveNode + 15) { // Increased threshold from 10 to 15
        c.jitterScore = (c.jitterScore || 0) + 1;
      } else {
        c.jitterScore = Math.max(0, (c.jitterScore || 0) - 1);
      }
      (c as any).lastDistSign = sign;
    }
    c.lastDistToNode = L;
    if ((c.jitterScore || 0) >= 8 || (c.jitterWindow || 0) > 3.0) { // Increased thresholds to be less aggressive
      // If very close to node, just advance; otherwise, try a light replan once - PATHINDEX RE-ENABLED
      if (L < arriveNode + hysteresis) {
        c.pathIndex++;
        // Check bounds after increment to prevent accessing invalid nodes
        if (c.pathIndex >= c.path.length) {
          this.clearPath(c);
          if (target) return Math.hypot(c.x - target.x, c.y - target.y) <= arrive;
          return false;
        }
        // Don't shift array when using pathIndex
      } else if (target) {
        const p = this.computePath(c.x, c.y, target.x, target.y);
        if (p && p.length) { c.path = p; c.pathIndex = 0; } // PATHINDEX RE-ENABLED
      }
      c.jitterScore = 0; c.jitterWindow = 0; c.lastDistToNode = undefined; (c as any).lastDistSign = undefined;
      if (!c.path || c.pathIndex == null || c.pathIndex >= c.path.length) return false; // RE-ENABLED
    }

    // Simple movement toward the waypoint - let A* handle the smart routing
    // Update direction for sprite facing (only if moving significantly)
    if (L > 1) {
      c.direction = Math.atan2(dy, dx);
    }
    c.x = Math.max(0, Math.min(c.x + (dx / (L || 1)) * step, WORLD.w));
    c.y = Math.max(0, Math.min(c.y + (dy / (L || 1)) * step, WORLD.h));
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
  updateTurret(b: Building, dt: number) { updateTurretCombat(this, b, dt); }

  // Day/Night & waves
  isNight() { return (this.tDay >= NIGHT_SPAN.start || this.tDay <= NIGHT_SPAN.end); }
  spawnWave() { const n = 4 + Math.floor(this.day * 1.3); for (let i = 0; i < n; i++) this.spawnEnemy(); this.msg(`Night ${this.day}: Enemies incoming!`, 'warn'); }
  nextDay() {
    this.day++; (this as any).waveSpawnedForDay = false;
    let dead = 0; for (let i = 0; i < this.colonists.length; i++) { if (this.RES.food > 0) { this.RES.food -= 1; } else { dead++; if (this.colonists[i]) { (this.colonists[i] as any).alive = false; } } }
    if (dead > 0) { this.colonists = this.colonists.filter(c => c.alive); this.msg(`${dead} colonist(s) starved`, 'bad'); }
    // Farm growth (once per day)
    for (const b of this.buildings) { 
      if (b.kind === 'farm' && b.done) { 
        b.growth = (b.growth || 0) + 0.5; // Slower growth: 2 days to mature
        if ((b.growth || 0) >= ((b as any).growTime || 1)) { 
          b.ready = true; 
        } 
      } 
    }
    const tent = this.buildings.find(b => b.kind === 'tent' && b.done);
    const cap = (this.buildings.find(b => b.kind === 'hq') ? 3 : 0) + this.buildings.filter(b => b.kind === 'house' && b.done).reduce((a, b) => a + ((b as any).popCap || 0), 0);
    if (tent && this.colonists.length < cap && this.RES.food >= 15) { this.RES.food -= 15; this.spawnColonist({ x: HQ_POS.x + rand(-20, 20), y: HQ_POS.y + rand(-20, 20) }); this.msg('A new colonist joined! (-15 food)', 'info'); }
    if (this.day > 20) { this.win(); }
  }

  // Update loop
  dayTick(dt: number) {
    const wasNight = this.isNight();
    this.tDay += (dt * this.fastForward) / this.dayLength;
    if (this.tDay >= 1) { this.tDay -= 1; this.nextDay(); }
    const nowNight = this.isNight();
    if (!wasNight && nowNight) { this.spawnWave(); }
    this.prevIsNight = nowNight;

    // Daily-time continuous effects for colonists
    for (let i = this.colonists.length - 1; i >= 0; i--) {
      const c = this.colonists[i];
      if (!c.alive) {
        // Remove dead colonists from the array
        this.colonists.splice(i, 1);
        continue;
      }
      
      // Give profiles to existing colonists who don't have them (for backward compatibility)
      if (!c.profile) {
        c.profile = generateColonistProfile();
        c.color = c.profile.avatar.clothing; // Update color to match clothing
        // Apply stat modifiers
        c.speed = 50 * c.profile.stats.workSpeed;
      }
      
      // Starvation damage is handled in colonistFSM.ts - no additional damage here
      // If extremely fatigued, reduce work effectiveness slightly (handled via movement slow); no direct hp damage
      if (c.hp <= 0) { 
        c.alive = false; 
        // Will be removed on next update cycle
      }
    }
  }
  keyPressed(k: string) { if (this.once.has(k)) { this.once.delete(k); return true; } return false; }
  update(dt: number) {
    // If debug console is open, ignore gameplay hotkeys (space, etc.)
    const dc = (this as any).debugConsole;
    const consoleOpen = !!(dc && dc.open);
    // Handle toggles even when paused
    if (!consoleOpen && this.keyPressed(' ')) { this.paused = !this.paused; const btn = document.getElementById('btnPause'); if (btn) btn.textContent = this.paused ? 'Resume' : 'Pause'; }
    if (!consoleOpen && this.keyPressed('h')) { const help = document.getElementById('help'); if (help) help.hidden = !help.hidden; }
  if (!consoleOpen && this.keyPressed('b')) { this.showBuildMenu = !this.showBuildMenu; }
    if (!consoleOpen && this.keyPressed('g')) { this.debug.nav = !this.debug.nav; this.toast(this.debug.nav ? 'Debug: nav ON' : 'Debug: nav OFF'); }
    if (!consoleOpen && this.keyPressed('j')) { this.debug.colonists = !this.debug.colonists; this.toast(this.debug.colonists ? 'Debug: colonists ON' : 'Debug: colonists OFF'); }
    if (!consoleOpen && this.keyPressed('k')) { 
      this.debug.forceDesktopMode = !this.debug.forceDesktopMode; 
      this.toast(this.debug.forceDesktopMode ? 'Debug: Force Desktop Mode ON' : 'Debug: Force Desktop Mode OFF'); 
    }
  if (!consoleOpen && this.keyPressed('escape')) { if (this.showBuildMenu) this.showBuildMenu = false; else { this.selectedBuild = null; this.toast('Build canceled'); this.selColonist = null; this.follow = false; } }
    if (!consoleOpen && this.keyPressed('f')) { this.fastForward = (this.fastForward === 1 ? 6 : 1); this.toast(this.fastForward > 1 ? 'Fast-forward ON' : 'Fast-forward OFF'); }
    
    // Camera movement (works even when paused)
    const camSpd = 360 * dt / this.camera.zoom;
    if (this.keyState['w']) this.camera.y -= camSpd;
    if (this.keyState['s']) this.camera.y += camSpd;
    if (this.keyState['a']) this.camera.x -= camSpd;
    if (this.keyState['d']) this.camera.x += camSpd;
    if (this.keyState['+'] || this.keyState['=']) this.camera.zoom = Math.max(0.6, Math.min(2.2, this.camera.zoom * 1.02));
    if (this.keyState['-'] || this.keyState['_']) this.camera.zoom = Math.max(0.6, Math.min(2.2, this.camera.zoom / 1.02));
    
    if (this.paused) return;
    for (const [i, key] of this.hotbar.entries()) { if (this.keyPressed(String(i + 1))) { this.selectedBuild = key; this.toast('Selected: ' + BUILD_TYPES[key].name); } }
    // camera follow selected colonist
    if (this.follow && this.selColonist) {
      const c = this.selColonist; const vw = this.canvas.width / this.camera.zoom; const vh = this.canvas.height / this.camera.zoom;
      this.camera.x = clamp(c.x - vw / 2, 0, Math.max(0, WORLD.w - vw));
      this.camera.y = clamp(c.y - vh / 2, 0, Math.max(0, WORLD.h - vh));
    }
    this.dayTick(dt);
  for (const c of this.colonists) { if (c.alive) {
      // Health system tick (bleeding, infections, pain, downed)
      updateColonistHealth(this, c, dt * this.fastForward);
      // RimWorld-like pawn combat runs before FSM so states can react to being in combat
      updateColonistCombat(this, c, dt * this.fastForward);
      updateColonistFSM(this, c, dt * this.fastForward);
    } }
  for (let i = this.enemies.length - 1; i >= 0; i--) { const e = this.enemies[i]; updateEnemyFSM(this, e, dt * this.fastForward); if (e.hp <= 0) { this.enemies.splice(i, 1); if (Math.random() < .5) this.RES.food += 1; } }
    for (const b of this.buildings) {
      if (b.kind === 'turret' && b.done) this.updateTurret(b, dt * this.fastForward);
      
      // infirmary healing
      if ((b as any).healRate && b.done) {
        const hr = (b as any).healRate as number; const rng = (b as any).healRange || 120;
        const c = this.centerOf(b);
        for (const col of this.colonists) {
          if (!col.alive) continue;
          const d2 = (col.x-c.x)*(col.x-c.x)+(col.y-c.y)*(col.y-c.y);
          if (d2 < rng*rng) col.hp = Math.min(100, col.hp + hr * dt * this.fastForward);
        }
      }
      
      // recruit tent colonist spawning
      if (b.kind === 'tent' && b.done) {
        b.cooldown = (b.cooldown || 0) - dt * this.fastForward;
        if (b.cooldown <= 0 && this.RES.food >= 15) {
          const cap = this.getPopulationCap();
          
          // Smart recruitment: ensure we have enough food reserves for existing + new colonist
          const currentColonists = this.colonists.filter(c => c.alive).length;
          const foodReserveNeeded = Math.max(25, currentColonists * 8); // Reserve 8 food per existing colonist, minimum 25
          const recruitmentCost = 15;
          const totalFoodNeeded = foodReserveNeeded + recruitmentCost;
          
          if (this.colonists.length < cap && this.RES.food >= totalFoodNeeded) {
            this.RES.food -= 15;
            const spawnPos = this.centerOf(b);
            this.spawnColonist({ 
              x: spawnPos.x + (Math.random() - 0.5) * 40, 
              y: spawnPos.y + (Math.random() - 0.5) * 40 
            });
            this.msg('Recruit tent attracted a new colonist! (-15 food)', 'good');
            b.cooldown = 60; // 60 second cooldown
          } else if (this.RES.food < totalFoodNeeded && this.RES.food >= 15) {
            // Show message when recruitment is blocked due to low food reserves - DISABLED TO REDUCE SPAM
            // if (Math.random() < 0.02) { // Occasional message to avoid spam
            //   this.msg(`Recruitment halted: need ${totalFoodNeeded} food (${foodReserveNeeded} reserves + ${recruitmentCost} cost), have ${this.RES.food}`, 'warn');
            // }
          }
        }
      }
    }
    // resource respawn
    this.tryRespawn(dt);
    
  updateProjectilesCombat(this, dt);
    
    for (let i = this.messages.length - 1; i >= 0; i--) { const m = this.messages[i]; m.t -= dt; if (m.t <= 0) this.messages.splice(i, 1); }
  }

  // Draw
  draw() {
  const { ctx } = this; clear(ctx, this.canvas);
  // Clamp camera each frame (covers zoom changes and touch panning)
  this.clampCameraToWorld();
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
      for (const c of this.colonists) { if (c.inside && c.alive) counts.set(c.inside, (counts.get(c.inside) || 0) + 1); }
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
  for (const c of this.colonists) { if (!c.inside && c.alive) drawColonistAvatar(ctx, c.x, c.y, c, c.r, this.selColonist === c); }

  // Optional: combat debug visuals
  if ((this.debug as any).combat) {
    ctx.save();
    ctx.strokeStyle = '#fca5a5';
    ctx.globalAlpha = 0.6;
    for (const b of this.buildings) {
      if (b.kind !== 'turret' || !b.done) continue;
      const c = this.centerOf(b);
      ctx.beginPath();
      ctx.arc(c.x, c.y, (b as any).range || 160, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  
  // Draw long press progress circle
  this.drawLongPressProgress();
  
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
      
      // draw navigation costs (green = fast, yellow = normal, red = slow)
      ctx.save();
      ctx.globalAlpha = 0.12;
      for (let y = 0; y < this.grid.rows; y++) {
        for (let x = 0; x < this.grid.cols; x++) {
          const idx = y * this.grid.cols + x;
          if (!this.grid.solid[idx]) {
            const cost = this.grid.cost[idx];
            if (cost <= 0.7) {
              ctx.fillStyle = '#22c55e'; // fast (paths)
            } else if (cost <= 1.0) {
              ctx.fillStyle = '#eab308'; // normal
            } else {
              ctx.fillStyle = '#f97316'; // slow
            }
            ctx.fillRect(x * T, y * T, T, T);
          }
        }
      }
      ctx.restore();
      
      // draw colonist paths
      ctx.save();
      ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2;
      for (const c of this.colonists) {
        if (!c.alive || !c.path || !c.path.length) continue;
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        for (let i = c.pathIndex ?? 0; i < c.path.length; i++) { // PATHINDEX RE-ENABLED
          const p = c.path[i];
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        
        // draw current target
        if (c.pathIndex != null && c.pathIndex < c.path.length) {
          const target = c.path[c.pathIndex];
          ctx.save();
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(target.x, target.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      ctx.restore();
      
      // draw colonist states and targets
      ctx.save();
      ctx.font = '11px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      for (const c of this.colonists) {
        if (c.inside || !c.alive) continue;
        const stateText = `${c.task || c.state || 'idle'}`;
        const x = c.x - 20;
        const y = c.y - c.r - 8;
        ctx.strokeText(stateText, x, y);
        ctx.fillText(stateText, x, y);
        
        // draw line to target
        if (c.target && (c.target as any).x != null) {
          const target = c.target as any;
          ctx.save();
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(c.x, c.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
      }
      ctx.restore();
      
      // Draw danger memory visualization
      ctx.save();
      for (const c of this.colonists) {
        if (c.inside || !c.alive) continue;
        const dangerMemory = (c as any).dangerMemory;
        if (!dangerMemory || !Array.isArray(dangerMemory)) continue;
        
        for (const mem of dangerMemory) {
          const timeSinceDanger = c.t - mem.time;
          // Skip very old memories that have faded completely
          if (timeSinceDanger >= 20) continue;
          
          // Calculate current danger radius (same logic as in nearestSafeCircle)
          const currentRadius = timeSinceDanger < 5 ? mem.radius : 
                               timeSinceDanger < 20 ? mem.radius * (1 - (timeSinceDanger - 5) / 15) : 0;
          
          if (currentRadius <= 0) continue;
          
          // Color and opacity based on how recent/strong the memory is
          const alpha = timeSinceDanger < 5 ? 0.3 : 0.15 * (1 - (timeSinceDanger - 5) / 15);
          const hue = timeSinceDanger < 5 ? 0 : 30; // Red to orange as it fades
          
          ctx.globalAlpha = alpha;
          ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
          ctx.strokeStyle = `hsl(${hue}, 100%, 30%)`;
          ctx.lineWidth = 2;
          
          // Draw danger zone circle
          ctx.beginPath();
          ctx.arc(mem.x, mem.y, currentRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          // Draw small dot at danger center
          ctx.globalAlpha = alpha * 2;
          ctx.fillStyle = `hsl(${hue}, 100%, 20%)`;
          ctx.beginPath();
          ctx.arc(mem.x, mem.y, 4, 0, Math.PI * 2);
          ctx.fill();
          
          // Draw timer text
          ctx.globalAlpha = 0.8;
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.font = '10px monospace';
          const timeText = `${(20 - timeSinceDanger).toFixed(1)}s`;
          ctx.strokeText(timeText, mem.x - 10, mem.y - currentRadius - 5);
          ctx.fillText(timeText, mem.x - 10, mem.y - currentRadius - 5);
        }
      }
      ctx.restore();
    }

  // Draw debug console overlay last in screen space
  drawDebugConsole(this);
    // Detailed colonist debug information
    if (this.debug.colonists) {
      ctx.save();
      ctx.font = '10px monospace';
      ctx.lineWidth = 1;
      
      for (const c of this.colonists) {
        if (c.inside || !c.alive) continue;
        
        // Enhanced colonist state display
        const x = c.x - 35;
        let y = c.y - c.r - 45;
        const lineHeight = 12;
        
        // Background for text
        const textLines = [
          `State: ${(c as any).state || 'unknown'}`,
          `Task: ${c.task || 'none'}`,
          `HP: ${Math.floor(c.hp || 0)}`,
          `Pos: ${Math.floor(c.x)},${Math.floor(c.y)}`,
          `Speed: ${(() => {
            let speed = c.speed || 0;
            // Apply fatigue multiplier
            if (c.fatigueSlow) speed *= c.fatigueSlow;
            // Apply path speed bonus
            const gx = Math.floor(c.x / T);
            const gy = Math.floor(c.y / T);
            if (gx >= 0 && gy >= 0 && gx < this.grid.cols && gy < this.grid.rows) {
              const idx = gy * this.grid.cols + gx;
              if (this.grid.cost[idx] <= 0.7) speed += 25;
            }
            return speed.toFixed(1);
          })()}`,
          `Stuck: ${(c as any).stuckTimer ? (c as any).stuckTimer.toFixed(1) + 's' : 'no'}`,
          `Since: ${(c as any).stateSince ? (c as any).stateSince.toFixed(1) + 's' : '0s'}`,
          `PathIdx: ${c.pathIndex ?? 'none'}/${c.path?.length ?? 0}`,
          `Jitter: ${(c as any).jitterScore ?? 0}`,
          `Repath: ${(c as any).repath ? (c as any).repath.toFixed(1) + 's' : 'none'}`
        ];
        
        if (c.target) {
          const target = c.target as any;
          if (target.x != null) {
            textLines.push(`Target: ${Math.floor(target.x)},${Math.floor(target.y)}`);
            if (target.type) textLines.push(`Type: ${target.type}`);
            if (target.hp != null) textLines.push(`T.HP: ${Math.floor(target.hp)}`);
          }
        }
        
        // Draw background
        const bgWidth = 140;
        const bgHeight = textLines.length * lineHeight + 4;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(x - 2, y - lineHeight + 2, bgWidth, bgHeight);
        ctx.strokeStyle = '#444';
        ctx.strokeRect(x - 2, y - lineHeight + 2, bgWidth, bgHeight);
        
        // Draw text lines
        for (let i = 0; i < textLines.length; i++) {
          const line = textLines[i];
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.strokeText(line, x, y + i * lineHeight);
          ctx.fillText(line, x, y + i * lineHeight);
        }
        
        // Draw collision radius
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        
        // Show interaction range for current task
        if (c.target && c.task && (c.task === 'chop' || c.task === 'mine')) {
          const target = c.target as any;
          if (target.x != null && target.r != null) {
            const interactRange = target.r + c.r + 4 + 2.5; // Same as FSM logic
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.arc(target.x, target.y, interactRange, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
            
            // Distance to target
            const dist = Math.hypot(c.x - target.x, c.y - target.y);
            ctx.fillStyle = dist <= interactRange ? '#22c55e' : '#ff6b6b';
            ctx.font = '12px monospace';
            const midX = (c.x + target.x) / 2;
            const midY = (c.y + target.y) / 2;
            ctx.strokeText(`${dist.toFixed(1)}`, midX - 15, midY);
            ctx.fillText(`${dist.toFixed(1)}`, midX - 15, midY);
          }
        }
      }
      ctx.restore();
    }

    for (const e of this.enemies) drawPoly(ctx, e.x, e.y, e.r + 2, 3, COLORS.enemy, -Math.PI / 2);
    drawBullets(ctx, this.bullets);
    
    // Draw global particles (muzzle flash, impact effects)
    drawParticles(ctx, this.particles);
    
    if (this.isNight()) { ctx.fillStyle = `rgba(6,10,18, 0.58)`; ctx.fillRect(0, 0, WORLD.w, WORLD.h); }
  if (this.selectedBuild && !this.pendingPlacement) {
      const def = BUILD_TYPES[this.selectedBuild];
  const gx = Math.floor(this.mouse.wx / T) * T; const gy = Math.floor(this.mouse.wy / T) * T;
  const can = canPlacePlacement(this, { ...def, size: def.size } as any, gx, gy) && hasCost(this.RES, def.cost);
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
  const cap = this.getPopulationCap();
  const hiding = this.colonists.filter(c => !!c.inside).length;
  const storageUsed = this.RES.wood + this.RES.stone + this.RES.food;
  const storageMax = this.getStorageCapacity();
  const hotbar = this.hotbar.map(k => ({ key: String(k), name: BUILD_TYPES[k].name, cost: this.costText(BUILD_TYPES[k].cost || {}), selected: this.selectedBuild === k }));
  drawHUD(this.ctx, this.canvas, { 
    res: this.RES, 
    colonists: this.colonists.filter(c => c.alive).length, 
    cap, 
    hiding, 
    day: this.day, 
    tDay: this.tDay, 
    isNight: this.isNight(), 
    hotbar, 
    messages: this.messages,
    storage: { used: storageUsed, max: storageMax }
  }, this);
  if (this.selColonist) drawColonistProfileUI(this, this.selColonist);
  else { this.colonistPanelRect = this.colonistPanelCloseRect = null; }
  if (this.showBuildMenu) drawBuildMenuUI(this);
  if (this.pendingPlacement) drawPlacementUIUI(this);
  if (this.contextMenu) drawContextMenuUI(this);
  }

  costText(c: Partial<typeof this.RES>) { const parts: string[] = []; if (c.wood) parts.push(`${c.wood}w`); if (c.stone) parts.push(`${c.stone}s`); if (c.food) parts.push(`${c.food}f`); return parts.join(' '); }

  // Loop
  last = performance.now();
  frame = (now: number) => {
    const dt = Math.min(0.033, (now - this.last) / 1000); this.last = now; this.update(dt); this.draw(); requestAnimationFrame(this.frame);
  };

  // Win/Lose
  win() { this.paused = true; this.msg('You survived! Day 20 reached.', 'good'); alert('You survived to Day 20 — victory!'); }
  lose() { this.paused = true; this.msg('HQ destroyed. Colony fell.', 'bad'); alert('Your HQ was destroyed. Game over.'); }

  // Pathfinding grid and helpers
  grid = makeGrid();
  rebuildNavGrid() { rebuildNavGridNav(this); }
  computePath(sx: number, sy: number, tx: number, ty: number) { return computePathNav(this, sx, sy, tx, ty); }
  
  // Colonist-aware pathfinding that avoids dangerous areas from memory
  computePathWithDangerAvoidance(c: Colonist, sx: number, sy: number, tx: number, ty: number) { return computePathWithDangerAvoidanceNav(this, c, sx, sy, tx, ty); }

  // Navigation helpers for AI
  private cellIndexAt(x: number, y: number) { return cellIndexAtNav(this, x, y); }
  isBlocked(x: number, y: number) { return isBlockedNav(this, x, y); }
  
  // Check if position is within interaction range of a circle (for direct interaction checks)
  isWithinInteractionRange(x: number, y: number, circle: { x: number; y: number; r: number }, interactDistance: number): boolean {
    const dx = x - circle.x;
    const dy = y - circle.y;
    const dist = Math.hypot(dx, dy);
    return dist <= circle.r + interactDistance;
  }
  
  bestApproachToCircle(c: Colonist, circle: { x: number; y: number; r: number }, interact: number) {
    // Sample multiple angles around the circle, snap to tile centers, and dedupe
    const samples = 16;
    const candidateTiles = new Set<string>(); // Use string key for deduplication
    const candidates: { x: number; y: number; gx: number; gy: number }[] = [];
    
    // Nudge radius slightly inside to avoid solid edge issues
    const R = Math.max(6, circle.r + interact - 2); // small inward bias
    
    // Order sample angles to try the most promising side first (toward colonist)
    const baseAng = Math.atan2(circle.y - c.y, circle.x - c.x);
    const order: number[] = [];
    for (let k = 0; k < samples; k++) {
      const s = ((k % 2) ? +1 : -1) * Math.ceil(k / 2);
      order.push(((s / samples) * Math.PI * 2) + baseAng);
    }
    
    for (const ang of order) {
      // Place target using adjusted radius
      const px = circle.x + Math.cos(ang) * R;
      const py = circle.y + Math.sin(ang) * R;
      
      // Snap to tile center with bounds check
      const gx = Math.floor(px / T);
      const gy = Math.floor(py / T);
      
      // Bounds-check before isBlocked to avoid redundant cellIndexAt calls
      if (gx < 0 || gy < 0 || gx >= this.grid.cols || gy >= this.grid.rows) continue;
      
      const tileCenterX = gx * T + T / 2;
      const tileCenterY = gy * T + T / 2;
      
      // Dedupe by tile coordinates
      const tileKey = `${gx},${gy}`;
      if (candidateTiles.has(tileKey)) continue;
      candidateTiles.add(tileKey);
      
      // Skip if tile is blocked
      if (this.isBlocked(tileCenterX, tileCenterY)) continue;
      
      candidates.push({ x: tileCenterX, y: tileCenterY, gx, gy });
    }
    
    if (candidates.length === 0) {
      // Fallback: walk back along the ray from the resource toward the colonist
      const ang = Math.atan2(c.y - circle.y, c.x - circle.x);
      const startR = circle.r + interact;
      const step = Math.max(4, T * 0.33);

      for (let rr = startR; rr >= Math.max(circle.r + 2, startR - 6 * T); rr -= step) {
        const px = circle.x + Math.cos(ang) * rr;
        const py = circle.y + Math.sin(ang) * rr;

        // snap to center
        const gx = Math.floor(px / T), gy = Math.floor(py / T);
        if (gx < 0 || gy < 0 || gx >= this.grid.cols || gy >= this.grid.rows) continue;

        const cx = gx * T + T / 2, cy = gy * T + T / 2;
        if (this.isBlocked(cx, cy)) continue;

        const path = this.computePathWithDangerAvoidance(c, c.x, c.y, cx, cy);
        if (path) return { x: cx, y: cy };
      }

      // last resort: a point on the ring toward the colonist
      return {
        x: circle.x + Math.cos(ang) * startR,
        y: circle.y + Math.sin(ang) * startR
      };
    }
    
    // Sort candidates by path quality - prefer road tiles with meaningful tie-break
    let best: { x: number; y: number } | null = null;
    let bestPathLength = Infinity;
    let bestPathCost = Infinity;
    let evaluatedCandidates = 0;
    const maxEvaluations = 8; // Cap A* evaluations for performance
    
    for (const candidate of candidates) {
      // Performance cap: stop after evaluating enough candidates
      if (evaluatedCandidates >= maxEvaluations) break;
      
      // Use A* to evaluate the actual path
      const path = this.computePathWithDangerAvoidance(c, c.x, c.y, candidate.x, candidate.y);
      if (!path || path.length === 0) continue;
      
      evaluatedCandidates++;
      
      // Calculate path cost by summing grid costs along the path
      let pathCost = 0;
      for (const node of path) {
        const idx = this.cellIndexAt(node.x, node.y);
        if (idx < 0) { 
          pathCost = Infinity; 
          break; 
        }
        pathCost += this.grid.cost[idx] || 1;
      }
      
      if (pathCost === Infinity) continue;
      
      // Prefer if the approach tile is on road (feels like "approach via path")
      const lastIdx = this.cellIndexAt(candidate.x, candidate.y);
      if (lastIdx >= 0 && this.grid.cost[lastIdx] <= 0.7) {
        pathCost -= 0.05; // Meaningful road preference
      }
      
      // Early-out if we find a great path (short and cheap)
      if (path.length <= 3 && pathCost <= 2.0) {
        if (Math.random() < 0.02) {
          console.log(`Early-out: great path found with length ${path.length} and cost ${pathCost.toFixed(3)}`);
        }
        return candidate;
      }
      
      // Track best option
      if (pathCost < bestPathCost || (pathCost === bestPathCost && path.length < bestPathLength)) {
        bestPathCost = pathCost;
        bestPathLength = path.length;
        best = candidate;
      }
    }
    
    if (best) {
      // Debug logging
      if (Math.random() < 0.02) {
        console.log(`Best approach: (${best.x.toFixed(1)}, ${best.y.toFixed(1)}) with path cost ${bestPathCost.toFixed(3)} and length ${bestPathLength} (evaluated ${evaluatedCandidates} candidates)`);
      }
      return best;
    }
    
    // Should never reach here given our fallback above
    return candidates[0];
  }

  // UI: colonist profile panel moved to src/game/ui/colonistProfile.ts


  // Context menu rendering moved to src/game/ui/contextMenu.ts

  handleContextMenuAction(actionId: string, colonist: Colonist) {
    console.log(`Context menu action: ${actionId} for colonist:`, colonist.profile?.name);
    
    switch (actionId) {
      // Prioritize actions
      case 'prioritize_work':
        this.setTask(colonist, 'work', this.findNearestWorkTarget(colonist));
        this.msg(`${colonist.profile?.name || 'Colonist'} prioritizing work tasks`, 'info');
        break;
      case 'prioritize_build':
        this.setTask(colonist, 'build', this.findNearestBuildTarget(colonist));
        this.msg(`${colonist.profile?.name || 'Colonist'} prioritizing construction`, 'info');
        break;
      case 'prioritize_haul':
        // Future: implement hauling system
        this.msg(`${colonist.profile?.name || 'Colonist'} prioritizing hauling`, 'info');
        break;
      case 'prioritize_research':
        // Future: implement research system
        this.msg(`${colonist.profile?.name || 'Colonist'} prioritizing research`, 'info');
        break;
        
      // Force actions
      case 'force_rest':
        this.forceColonistToRest(colonist);
        break;
      case 'force_eat':
        this.forceColonistToEat(colonist);
        break;
      case 'force_work':
        this.setTask(colonist, 'work', this.findNearestWorkTarget(colonist));
        this.msg(`${colonist.profile?.name || 'Colonist'} forced to work`, 'info');
        break;
      case 'force_guard':
        this.setTask(colonist, 'guard', { x: colonist.x, y: colonist.y });
        this.msg(`${colonist.profile?.name || 'Colonist'} guarding area`, 'info');
        break;
        
      // Go to actions
      case 'goto_hq':
        this.sendColonistToHQ(colonist);
        break;
      case 'goto_safety':
        this.sendColonistToSafety(colonist);
        break;
      case 'goto_bed':
        this.sendColonistToBed(colonist);
        break;
      case 'goto_food':
        this.sendColonistToFood(colonist);
        break;
        
      // Medical actions
      case 'medical_treat': {
        // Assign nearest eligible colonist (or self) to tend this colonist
        const target = colonist;
        const candidates = this.colonists.filter(c => c !== target && c.alive && !(c as any).health?.downed && !c.inside);
        let tender = candidates[0];
        if (candidates.length > 1) {
          const dc = (p: any) => (p.x - target.x) * (p.x - target.x) + (p.y - target.y) * (p.y - target.y);
          tender = candidates.sort((a,b) => dc(a) - dc(b))[0];
        }
        if (!tender && target && target.alive && !(target as any).health?.downed) tender = target; // self-tend fallback
        if (tender) {
          tender.task = null; tender.target = null; this.clearPath && this.clearPath(tender);
          (tender as any).tendTarget = target; (tender as any).state = 'tend'; (tender as any).stateSince = 0;
          this.msg('Tend ordered', 'info');
        } else {
          this.msg('No available tender', 'warn');
        }
        break; }
      case 'medical_rescue': {
        // Assign nearest eligible colonist to rescue this (downed) colonist
        const target = colonist;
        const candidates = this.colonists.filter(c => c !== target && c.alive && !(c as any).health?.downed && !c.inside);
        let rescuer = candidates[0];
        if (candidates.length > 1) {
          const dc = (p: any) => (p.x - target.x) * (p.x - target.x) + (p.y - target.y) * (p.y - target.y);
          rescuer = candidates.sort((a,b) => dc(a) - dc(b))[0];
        }
        if (rescuer) {
          rescuer.task = null; rescuer.target = null; this.clearPath && this.clearPath(rescuer);
          (rescuer as any).rescueTarget = target; (rescuer as any).state = 'rescue'; (rescuer as any).stateSince = 0;
          this.msg('Rescue ordered', 'info');
        } else {
          this.msg('No available rescuer', 'warn');
        }
        break; }
      case 'medical_rest':
        this.forceColonistToRest(colonist);
        this.msg(`${colonist.profile?.name || 'Colonist'} ordered to bed rest`, 'info');
        break;
        
      // Basic actions
      case 'cancel':
        this.setTask(colonist, 'idle', { x: colonist.x, y: colonist.y });
        this.msg(`${colonist.profile?.name || 'Colonist'} task cancelled`, 'info');
        break;
      case 'follow':
        if (this.follow && this.selColonist === colonist) {
          this.follow = false;
          this.selColonist = null;
          this.msg('Stopped following', 'info');
        } else {
          this.selColonist = colonist;
          this.follow = true;
          this.msg(`Following ${colonist.profile?.name || 'colonist'}`, 'info');
        }
        break;
    }
    
  hideContextMenuUI(this);
  }

  // Helper functions for context menu actions
  findNearestWorkTarget(colonist: Colonist) {
    // Find nearest unfinished building
    let nearest = null;
    let minDist = Infinity;
    
    for (const building of this.buildings) {
      if (!building.done) {
        const dist = Math.hypot(colonist.x - (building.x + building.w/2), colonist.y - (building.y + building.h/2));
        if (dist < minDist) {
          minDist = dist;
          nearest = building;
        }
      }
    }
    
    return nearest || { x: colonist.x + rand(-50, 50), y: colonist.y + rand(-50, 50) };
  }

  findNearestBuildTarget(colonist: Colonist) {
    return this.findNearestWorkTarget(colonist);
  }

  forceColonistToRest(colonist: Colonist) {
    // Find nearest house or tent
    const restBuilding = this.buildings.find(b => 
      (b.kind === 'house' || b.kind === 'tent' || b.kind === 'hq') && 
      b.done && 
      this.buildingHasSpace(b)
    );
    
    if (restBuilding) {
      this.setTask(colonist, 'rest', restBuilding);
      this.msg(`${colonist.profile?.name || 'Colonist'} going to rest`, 'info');
    } else {
      this.msg('No available sleeping quarters', 'warn');
    }
  }

  forceColonistToEat(colonist: Colonist) {
    if (this.RES.food > 0) {
      // Simulate eating
      colonist.hunger = Math.max(0, (colonist.hunger || 0) - 30);
      this.RES.food = Math.max(0, this.RES.food - 1);
      this.msg(`${colonist.profile?.name || 'Colonist'} eating food`, 'good');
    } else {
      this.msg('No food available', 'warn');
    }
  }

  sendColonistToHQ(colonist: Colonist) {
    const hq = this.buildings.find(b => b.kind === 'hq');
    if (hq) {
      const target = { x: hq.x + hq.w/2, y: hq.y + hq.h/2 };
      this.setTask(colonist, 'goto', target);
      this.msg(`${colonist.profile?.name || 'Colonist'} going to HQ`, 'info');
    }
  }

  sendColonistToSafety(colonist: Colonist) {
    // Find a building protected by turrets
    for (const building of this.buildings) {
      if (building.done && this.isProtectedByTurret(building) && this.buildingHasSpace(building)) {
        this.setTask(colonist, 'goto', building);
        this.msg(`${colonist.profile?.name || 'Colonist'} going to safety`, 'info');
        return;
      }
    }
    this.sendColonistToHQ(colonist);
  }

  sendColonistToBed(colonist: Colonist) {
    const bed = this.buildings.find(b => 
      (b.kind === 'house' || b.kind === 'tent') && 
      b.done && 
      this.buildingHasSpace(b)
    );
    
    if (bed) {
      this.setTask(colonist, 'rest', bed);
      this.msg(`${colonist.profile?.name || 'Colonist'} going to bed`, 'info');
    } else {
      this.msg('No available beds', 'warn');
    }
  }

  sendColonistToFood(colonist: Colonist) {
    const storage = this.buildings.find(b => 
      (b.kind === 'warehouse' || b.kind === 'hq') && b.done
    );
    
    if (storage) {
      const target = { x: storage.x + storage.w/2, y: storage.y + storage.h/2 };
      this.setTask(colonist, 'goto', target);
      this.msg(`${colonist.profile?.name || 'Colonist'} going to food storage`, 'info');
    } else {
      this.sendColonistToHQ(colonist);
    }
  }

  treatColonist(colonist: Colonist) {
    const infirmary = this.buildings.find(b => b.kind === 'infirmary' && b.done);
    
    if (infirmary) {
      this.setTask(colonist, 'medical', infirmary);
      this.msg(`${colonist.profile?.name || 'Colonist'} going for medical treatment`, 'info');
    } else {
      // Basic field treatment
      colonist.hp = Math.min(100, colonist.hp + 15);
      this.msg(`${colonist.profile?.name || 'Colonist'} received basic treatment`, 'good');
    }
  }

  // Context menu drawing moved to src/game/ui/contextMenu.ts

  drawLongPressProgress() {
    if (!this.longPressStartTime || !this.longPressTarget || !this.longPressStartPos) return;
    
    const ctx = this.ctx;
    const currentTime = performance.now();
    const elapsed = currentTime - this.longPressStartTime;
    const progress = Math.min(elapsed / 500, 1); // 500ms total duration
    
    if (progress >= 1) return; // Don't draw when complete
    
    // Convert world position to screen position
    const screenX = (this.longPressTarget.x - this.camera.x) * this.camera.zoom;
    const screenY = (this.longPressTarget.y - this.camera.y) * this.camera.zoom;
    
    ctx.save();
    
    // Draw progress circle
    const radius = this.scale(20);
    const centerX = screenX;
    const centerY = screenY;
    
    // Background circle
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = this.scale(3);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Progress arc
    ctx.strokeStyle = '#60a5fa'; // Blue color
    ctx.lineWidth = this.scale(3);
    ctx.lineCap = 'round';
    ctx.beginPath();
    const startAngle = -Math.PI / 2; // Start at top
    const endAngle = startAngle + (progress * Math.PI * 2);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.stroke();
    
    // Inner pulse effect
    if (progress > 0.3) {
      const pulseAlpha = Math.sin((elapsed / 100) * Math.PI) * 0.3 + 0.1;
      ctx.fillStyle = `rgba(96, 165, 250, ${pulseAlpha})`;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Context menu icon hint
    if (progress > 0.5) {
      ctx.fillStyle = '#ffffff';
      ctx.font = this.getScaledFont(12, '600');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚙️', centerX, centerY);
    }
    
    ctx.restore();
  }


  barRow(x: number, y: number, label: string, val: number, color: string) {
    const ctx = this.ctx; 
    ctx.fillStyle = '#dbeafe'; 
    ctx.fillText(label, x, y);
    
    const w = this.scale(140); 
    const h = this.scale(10); 
    const labelWidth = this.scale(70);
    
    ctx.fillStyle = '#0f172a'; 
    ctx.fillRect(x + labelWidth, y - this.scale(8), w, h); 
    ctx.strokeStyle = '#1e293b'; 
    ctx.strokeRect(x + labelWidth + .5, y - this.scale(8) + .5, w - 1, h - 1);
    ctx.fillStyle = color; 
    ctx.fillRect(x + labelWidth + this.scale(2), y - this.scale(6), Math.max(0, Math.min(w - this.scale(4), (val / 100) * (w - this.scale(4)))), h - this.scale(4));
  }

  // Build and placement UI moved to src/game/ui
}
