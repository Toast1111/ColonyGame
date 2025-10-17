import { clamp, dist2, rand, randi } from "../core/utils";
import { makeGrid } from "../core/pathfinding";
import { makeTerrainGrid, type TerrainGrid } from "./terrain";
import { COLORS, HQ_POS, NIGHT_SPAN, T, WORLD } from "./constants";
import type { Building, Bullet, Camera, Colonist, ColonistCommandIntent, Enemy, Message, Resources, Particle } from "./types";
import type { ContextMenuDescriptor, ContextMenuItem } from "./ui/contextMenus/types";
import { BUILD_TYPES, hasCost } from "./buildings";
import { applyWorldTransform, clear, drawBuilding, drawBullets, drawCircle, drawGround, drawFloors, drawHUD, drawPoly, drawPersonIcon, drawShieldIcon, drawColonistAvatar } from "./render";
import { WorkGiverManager } from './systems/workGiverManager';
import { drawTerrainDebug } from "./render/debug/terrainDebugRender";
import { updateColonistFSM } from "./colonist_systems/colonistFSM";
import { updateEnemyFSM } from "../ai/enemyFSM";
import { drawBuildMenu as drawBuildMenuUI, handleBuildMenuClick as handleBuildMenuClickUI } from "./ui/buildMenu";
import { handleHotbarClick } from "./ui/hud/modernHotbar";
import { handleBuildMenuClick as handleModernBuildMenuClick } from "./ui/hud/modernBuildMenu";
import { drawColonistProfile as drawColonistProfileUI } from "./ui/panels/colonistProfile";
import { drawContextMenu as drawContextMenuUI, hideContextMenu as hideContextMenuUI } from "./ui/contextMenu";
import { showColonistContextMenu } from "./ui/contextMenus/colonistMenu";
import { showBuildingContextMenu } from "./ui/contextMenus/buildings";
import { drawPlacementUI as drawPlacementUIUI } from "./ui/placement";
import { handleMobilePlacementClick, isClickOnGhost } from "./ui/mobilePlacement";
import { canPlace as canPlacePlacement, tryPlaceNow as tryPlaceNowPlacement, placeAtMouse as placeAtMousePlacement, nudgePending as nudgePendingPlacement, rotatePending as rotatePendingPlacement, confirmPending as confirmPendingPlacement, cancelPending as cancelPendingPlacement, paintPathAtMouse as paintPathAtMousePlacement, paintWallAtMouse as paintWallAtMousePlacement, eraseInRect as eraseInRectPlacement, cancelOrErase as cancelOrErasePlacement, evictColonistsFrom as evictColonistsFromPlacement } from "./placement/placementSystem";
import { generateColonistProfile, getColonistDescription } from "./colonist_systems/colonistGenerator";
import { initializeColonistHealth } from "./health/healthSystem";
import { medicalSystem, MEDICAL_TREATMENTS } from "./health/medicalSystem";
import { medicalWorkGiver } from "./health/medicalWorkGiver";
import { applyDamageToColonist, getInjurySummary, basicFieldTreatment, calculateOverallHealth } from './health/healthSystem';
import { drawParticles } from "../core/particles";
import { updateTurret as updateTurretCombat, updateProjectiles as updateProjectilesCombat } from "./combat/combatSystem";
import { updateColonistCombat } from "./combat/pawnCombat";
import { CombatManager } from "./combat/combatManager";
import { itemDatabase } from '../data/itemDatabase';
import { initializeWorkPriorities, DEFAULT_WORK_PRIORITIES, getWorkTypeForTask } from './systems/workPriority';
import { AdaptiveTickRateManager } from '../core/AdaptiveTickRate';
import { drawWorkPriorityPanel, handleWorkPriorityPanelClick, handleWorkPriorityPanelScroll, handleWorkPriorityPanelHover, toggleWorkPriorityPanel, isWorkPriorityPanelOpen, isMouseOverWorkPanel } from './ui/panels/workPriorityPanel';
import { handleBuildingInventoryPanelClick, isBuildingInventoryPanelOpen } from './ui/panels/buildingInventoryPanel';
// import { getInventoryItemCount } from './systems/buildingInventory';
import { initDebugConsole, toggleDebugConsole, handleDebugConsoleKey, drawDebugConsole } from './ui/debugConsole';
import { updateDoor, initializeDoor, findBlockingDoor, requestDoorOpen, isDoorBlocking, releaseDoorQueue } from './systems/doorSystem';
import { GameState } from './core/GameState';
import { TimeSystem } from './systems/TimeSystem';
import { CameraSystem } from './systems/CameraSystem';
import { ResourceSystem } from './systems/ResourceSystem';
import { InputManager } from './managers/InputManager';
import { UIManager } from './managers/UIManager';
import { RenderManager } from './managers/RenderManager';
import { NavigationManager } from './managers/NavigationManager';
import { PerformanceMetrics } from '../core/PerformanceMetrics';
import { SimulationClock } from '../core/SimulationClock';
import { BudgetedExecutionManager } from '../core/BudgetedExecution';
import { initPerformanceHUD, drawPerformanceHUD, togglePerformanceHUD } from './ui/panels/performanceHUD';
import { DirtyRectTracker } from '../core/DirtyRectTracker';
import { colonistSpriteCache } from '../core/RenderCache';
import { AudioManager, type AudioKey, type PlayAudioOptions } from './audio/AudioManager';
import { RimWorldSystemManager, type RimWorldSystemConfig } from './rimworld-systems';
import type { MobileControls } from './ui/dom/mobileControls';

export class Game {
  canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D;
  DPR = 1;
  
  // Dirty rect tracking for optimized rendering
  dirtyRectTracker!: DirtyRectTracker;
  
  // Core systems
  state = new GameState();
  timeSystem = new TimeSystem();
  cameraSystem = new CameraSystem();
  resourceSystem = new ResourceSystem();
  
  // Managers
  inputManager = new InputManager();
  uiManager = new UIManager();
  renderManager = new RenderManager(this);
  navigationManager = new NavigationManager(this);
  combatManager = new CombatManager(this);
  audioManager = AudioManager.getInstance();
  
  // Performance systems
  performanceMetrics = PerformanceMetrics.getInstance();
  simulationClock = SimulationClock.getInstance({ simulationHz: 30 });
  budgetManager = BudgetedExecutionManager.getInstance();
  adaptiveTickRate = new AdaptiveTickRateManager();
  
  deferredRebuildSystem = new (class DeferredRebuildSystem {
    private game: Game;
    private rebuildQueued: boolean = false;
    private fullRebuildQueued: boolean = false;
    
    constructor(game: Game) {
      this.game = game;
    }
    
    requestFullRebuild(): void {
      this.fullRebuildQueued = true;
      this.rebuildQueued = true;
    }
    
    processQueue(): void {
      if (!this.rebuildQueued) return;
      if (this.fullRebuildQueued) {
        // Rebuild navigation grid
        this.game.navigationManager.rebuildNavGrid();
        this.fullRebuildQueued = false;
      }
      this.rebuildQueued = false;
    }
    
    hasQueuedRebuilds(): boolean {
      return this.rebuildQueued;
    }
  })(this);
  
  // Camera reference - now returns cameraSystem's camera for backward compatibility
  get camera(): Camera { return this.cameraSystem.getCameraRef(); }
  
  // UI Scaling system
  uiScale = 1;
  baseFontSize = 14;
  // Touch capability flag for responsive UI sizing
  isTouch = false;
  // Actual touch usage detection (vs just capability)
  isActuallyTouchDevice = false;
  private touchUIEnabledInternal = false;
  private touchUIManualOverride: boolean | null = null;
  private touchZoneDragActive = false;
  private touchZoneLastPos: { x: number; y: number } | null = null;
  private defaultStockpileSize = 64;
  // lastInputWasTouch moved to inputManager (see getter/setter below)

  getStorageCapacity(): number {
    const warehouses = this.state.buildings.filter(b => b.done && b.kind === 'warehouse').length;
    const tents = this.state.buildings.filter(b => b.done && b.kind === 'tent').length;
    return this.resourceSystem.getStorageCapacity(warehouses, tents);
  }

  getPopulationCap(): number {
    const base = this.buildings.find(b => b.kind === 'hq') ? 3 : 0;
    const lodging = this.buildings
      .filter(b => b.done && typeof b.popCap === 'number')
      .reduce((sum, b) => sum + (b.popCap || 0), 0);
    return base + lodging;
  }

  addResource(type: keyof Resources, amount: number): number {
    const capacity = this.getStorageCapacity();
    const actualAmount = this.resourceSystem.addResource(type, amount, capacity);
    
    // Warn if storage full
    if (actualAmount === 0 && amount > 0) {
      this.msg(`Storage full! Cannot store more ${String(type)}`, 'warn');
    }
    
    return actualAmount;
  }

  // Removed old properties - now using systems via getters
  // Access state via this.state, time via this.timeSystem, camera via this.cameraSystem, resources via this.resourceSystem
  
  // Getter properties for backward compatibility during refactor
  get colonists(): Colonist[] { return this.state.colonists; }
  set colonists(value: Colonist[]) { this.state.colonists = value; }
  
  get enemies(): Enemy[] { return this.state.enemies; }
  set enemies(value: Enemy[]) { this.state.enemies = value; }
  
  get buildings(): Building[] { return this.state.buildings; }
  set buildings(value: Building[]) { this.state.buildings = value; }
  
  get trees() { return this.state.trees; }
  set trees(value) { this.state.trees = value; }
  
  get rocks() { return this.state.rocks; }
  set rocks(value) { this.state.rocks = value; }
  
  get bullets(): Bullet[] { return this.state.bullets; }
  set bullets(value: Bullet[]) { this.state.bullets = value; }
  
  get particles(): Particle[] { return this.state.particles; }
  set particles(value: Particle[]) { this.state.particles = value; }
  
  get messages(): Message[] { return this.state.messages; }
  set messages(value: Message[]) { this.state.messages = value; }
  
  get RES(): Resources { return this.resourceSystem.getResourcesRef(); }
  
  get day(): number { return this.timeSystem.getDay(); }
  set day(value: number) { this.timeSystem.setDay(value); }
  
  get tDay(): number { return this.timeSystem.getTimeOfDay(); }
  set tDay(value: number) { this.timeSystem.setTimeOfDay(value); }
  
  get dayLength(): number { return this.timeSystem.getDayLength(); }
  
  get fastForward(): number { return this.timeSystem.getFastForward(); }
  set fastForward(value: number) {
    const prev = this.timeSystem.getFastForward();
    this.timeSystem.setFastForward(value);
    if (prev !== value) {
      this.syncMobileControls();
    }
  }
  
  get paused(): boolean { return this.timeSystem.isPaused(); }
  set paused(value: boolean) {
    const prev = this.timeSystem.isPaused();
    this.timeSystem.setPaused(value);
    if (prev !== value) {
      this.syncMobileControls();
    }
  }

  // === UI Manager Property Redirects ===
  get selectedBuild() { return this.uiManager.selectedBuild; }
  set selectedBuild(value) { this.uiManager.selectedBuild = value; }
  
  get hotbar() { return this.uiManager.hotbar; }
  set hotbar(value) { this.uiManager.hotbar = value; }
  
  get showBuildMenu() { return this.uiManager.showBuildMenu; }
  set showBuildMenu(value) { this.uiManager.showBuildMenu = value; }
  
  get eraseMode() { return this.uiManager.eraseMode; }
  set eraseMode(value) {
    const prev = this.uiManager.eraseMode;
    this.uiManager.eraseMode = value;
    if (prev !== value) {
      this.syncMobileControls();
    }
  }
  
  get selColonist() { return this.uiManager.selColonist; }
  set selColonist(value) { this.uiManager.selColonist = value; }
  
  get follow() { return this.uiManager.follow; }
  set follow(value) { this.uiManager.follow = value; }
  
  get pendingPlacement() { return this.uiManager.pendingPlacement; }
  set pendingPlacement(value) { this.uiManager.pendingPlacement = value; }
  
  get menuRects() { return this.uiManager.menuRects; }
  set menuRects(value) { this.uiManager.menuRects = value; }
  
  get hotbarRects() { return this.uiManager.hotbarRects; }
  set hotbarRects(value) { this.uiManager.hotbarRects = value; }
  
  get placeUIRects() { return this.uiManager.placeUIRects; }
  set placeUIRects(value) { this.uiManager.placeUIRects = value; }
  
  get colonistPanelRect() { return this.uiManager.colonistPanelRect; }
  set colonistPanelRect(value) { this.uiManager.colonistPanelRect = value; }
  
  get colonistPanelCloseRect() { return this.uiManager.colonistPanelCloseRect; }
  set colonistPanelCloseRect(value) { this.uiManager.colonistPanelCloseRect = value; }
  
  get colonistProfileTab() { return this.uiManager.colonistProfileTab; }
  set colonistProfileTab(value) { 
    this.uiManager.colonistProfileTab = value;
    this.uiManager.lastProfileTab = value; // Remember last active tab
  }
  
  get colonistTabRects() { return this.uiManager.colonistTabRects; }
  set colonistTabRects(value) { this.uiManager.colonistTabRects = value; }
  
  get contextMenu() { return this.uiManager.contextMenu; }
  set contextMenu(value) { this.uiManager.contextMenu = value; }
  
  get contextMenuRects() { return this.uiManager.contextMenuRects; }
  set contextMenuRects(value) { this.uiManager.contextMenuRects = value; }
  
  get longPressTimer() { return this.uiManager.longPressTimer; }
  set longPressTimer(value) { this.uiManager.longPressTimer = value; }
  
  get longPressStartPos() { return this.uiManager.longPressStartPos; }
  set longPressStartPos(value) { this.uiManager.longPressStartPos = value; }
  
  get longPressStartTime() { return this.uiManager.longPressStartTime; }
  set longPressStartTime(value) { this.uiManager.longPressStartTime = value; }
  
  get longPressTarget() { return this.uiManager.longPressTarget; }
  set longPressTarget(value) { this.uiManager.longPressTarget = value; }
  
  get longPressTargetType() { return this.uiManager.longPressTargetType; }
  set longPressTargetType(value) { this.uiManager.longPressTargetType = value; }
  
  get lastPaintCell() { return this.uiManager.lastPaintCell; }
  set lastPaintCell(value) { this.uiManager.lastPaintCell = value; }
  
  get eraseDragStart() { return this.uiManager.eraseDragStart; }
  set eraseDragStart(value) { this.uiManager.eraseDragStart = value; }
  
  private get pendingDragging() { return this.uiManager.pendingDragging; }
  private set pendingDragging(value) { this.uiManager.pendingDragging = value; }
  
  // === Input Manager Property Redirects ===
  get mouse() { return this.inputManager.getMouseRef(); }
  
  get keyState() { return this.inputManager.getKeyStateRef(); }
  
  get once() { 
    // once is a Set used internally by inputManager, expose for backward compat
    // but ideally code should use inputManager.keyPressed() instead
    return new Set<string>(); // Return empty set, actual logic in inputManager
  }
  
  private get touchLastPan() { return this.inputManager.getTouchPan(); }
  private set touchLastPan(value) { this.inputManager.setTouchPan(value); }
  
  private get touchLastDist() { return this.inputManager.getTouchDist(); }
  private set touchLastDist(value) { this.inputManager.setTouchDist(value); }
  
  get lastInputWasTouch(): boolean { return this.inputManager.wasLastInputTouch(); }
  set lastInputWasTouch(value: boolean) { this.inputManager.setLastInputWasTouch(value); }

  get touchUIEnabled(): boolean { return this.touchUIEnabledInternal; }
  
  // Debug flags (keep as is - not part of managers)
  debug = { nav: false, paths: true, colonists: false, forceDesktopMode: false, terrain: false, performanceHUD: false };
  // Systems
  private workGiverManager = new WorkGiverManager();
  public rimWorld: RimWorldSystemManager;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('no ctx');
    this.canvas = canvas; this.ctx = ctx;
    this.DPR = Math.max(1, Math.min(2, (window as any).devicePixelRatio || 1));
  this.handleResize();
    
    // Initialize dirty rect tracker with canvas dimensions
    this.dirtyRectTracker = new DirtyRectTracker(canvas.width, canvas.height);
    
    window.addEventListener('resize', () => this.handleResize());
    this.bindInput();
    this.newGame();
    
    // Link terrain grid to pathfinding grid
    this.grid.terrainGrid = this.terrainGrid;
    
    // Sync terrain costs to pathfinding grid (all grass initially)
    this.syncTerrainToGrid();
    
    this.rebuildNavGridImmediate(); // Use immediate rebuild during initialization
    
    // Initialize systems with starting resources and time
    this.resourceSystem.reset(); // Sets starting resources
    this.timeSystem.reset(); // Sets day 1, tDay 0
    
    // Initialize camera system
    this.cameraSystem.setCanvasDimensions(this.canvas.width, this.canvas.height, this.DPR);
    this.cameraSystem.setZoom(1);
  this.cameraSystem.centerOn(HQ_POS.x, HQ_POS.y);
    
    this.clampCameraToWorld();
    
    // Initialize item database
    itemDatabase.loadItems();
    
    // Initialize RimWorld-style floor item + stockpile system (rendered between world and UI)
    this.rimWorld = new RimWorldSystemManager({
      canvas: this.canvas,
      enableAutoHauling: false, // We'll drive hauling via our WorkGiver so it fits FSM
      defaultStockpileSize: this.defaultStockpileSize,
      useEnhancedLogistics: false
    } as RimWorldSystemConfig);
  // Init debug console
  initDebugConsole(this);
    // Init performance HUD
    initPerformanceHUD({ visible: false, position: 'top-right' });
    
    // Expose damage API for external modules (combat, scripts)
    (this as any).applyDamageToColonist = (colonist: any, dmg: number, type: any = 'cut') => {
      applyDamageToColonist(this, colonist, dmg, type);
    };

  // Preload common UI and feedback sounds
  void this.audioManager.preload('ui.click.primary');
  void this.audioManager.preload('ui.panel.open');
  void this.audioManager.preload('ui.panel.close');
  void this.audioManager.preload('ui.hover');
  // Hotbar-specific UI sounds (single-variant)
  void this.audioManager.preload('ui.hotbar.open');
  void this.audioManager.preload('ui.hotbar.hover');
  void this.audioManager.preload('ui.hotbar.close');
  void this.audioManager.preload('ui.drag.start');
  void this.audioManager.preload('ui.drag.end');
  void this.audioManager.preload('buildings.placement.confirm');
    
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
    
    // Apply health-based penalties
    const manipulationMultiplier = (c as any).manipulationMultiplier || 1.0;
    const consciousnessMultiplier = (c as any).consciousnessMultiplier || 1.0;
    
    return (1 + bonus) * manipulationMultiplier * consciousnessMultiplier;
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

  // Enhanced combat damage system with armor reduction wrapper
  // This is a convenience method that applies armor before delegating to the health system
  applyDamageToColonist(colonist: Colonist, damage: number, damageType: 'cut' | 'bruise' | 'burn' | 'bite' | 'gunshot' | 'fracture' = 'bruise'): void {
    // Initialize health system if not present
    if (!colonist.health) {
      initializeColonistHealth(colonist);
    }

    // Apply armor reduction first
    let armorReduction = this.getArmorReduction(colonist);
    
    // Blunt damage (bruise) ignores most armor - reduce armor effectiveness to 30%
    if (damageType === 'bruise') {
      armorReduction = armorReduction * 0.3;
    }
    
    const effectiveDamage = damage * (1 - armorReduction);

    // Delegate to the health system's damage function (imported from healthSystem.ts)
    // This handles body part selection, injury creation, and all health system logic
    const result = applyDamageToColonist(this, colonist, effectiveDamage, damageType, {
      source: 'combat',
      damageMultiplier: 1.0 // Armor already applied above
    });

    // Show appropriate damage message based on result
    if (result.died) {
      this.msg(`${colonist.profile?.name || 'Colonist'} died from ${result.cause || 'injuries'}!`, 'bad');
    } else if (result.bodyPart) {
      const severityText = result.fatal ? 'critically' : 'severely';
      this.msg(`${colonist.profile?.name || 'Colonist'} ${severityText} injured in ${result.bodyPart} (${damageType})`, 'warn');
    }
  }

  // Helper methods for injury calculation
  private calculatePainFromDamage(damageType: string, severity: number): number {
    const basePain = {
      'cut': 0.3,
      'bruise': 0.1,
      'burn': 0.4,
      'bite': 0.35,
      'gunshot': 0.5,
      'fracture': 0.6
    };
    return Math.min(1.0, (basePain[damageType as keyof typeof basePain] || 0.2) * severity);
  }

  private calculateBleedingFromDamage(damageType: string, severity: number): number {
    const baseBleed = {
      'cut': 0.4,
      'bruise': 0.0,
      'burn': 0.1,
      'bite': 0.3,
      'gunshot': 0.5,
      'fracture': 0.2
    };
    return Math.min(1.0, (baseBleed[damageType as keyof typeof baseBleed] || 0.1) * severity);
  }

  private calculateHealRate(damageType: string, severity: number): number {
    const baseHealRate = {
      'cut': 0.8,
      'bruise': 1.2,
      'burn': 0.6,
      'bite': 0.7,
      'gunshot': 0.4,
      'fracture': 0.3
    };
    return (baseHealRate[damageType as keyof typeof baseHealRate] || 0.8) * (1.0 - severity * 0.5);
  }

  private calculateInfectionChance(damageType: string, severity: number): number {
    const baseInfection = {
      'cut': 0.15,
      'bruise': 0.0,
      'burn': 0.25,
      'bite': 0.4,
      'gunshot': 0.3,
      'fracture': 0.1
    };
    return Math.min(0.8, (baseInfection[damageType as keyof typeof baseInfection] || 0.1) * severity);
  }

  private generateInjuryDescription(damageType: string, bodyPart: string, severity: number): string {
    const severityDesc = severity < 0.2 ? 'minor' : severity < 0.5 ? 'moderate' : severity < 0.8 ? 'severe' : 'critical';
    const descriptions = {
      'cut': `${severityDesc} laceration on ${bodyPart}`,
      'bruise': `${severityDesc} bruising on ${bodyPart}`,
      'burn': `${severityDesc} burn on ${bodyPart}`,
      'bite': `${severityDesc} bite wound on ${bodyPart}`,
      'gunshot': `${severityDesc} gunshot wound in ${bodyPart}`,
      'fracture': `${severityDesc} fracture in ${bodyPart}`
    };
    return descriptions[damageType as keyof typeof descriptions] || `${severityDesc} injury to ${bodyPart}`;
  }

  private recalculateColonistHealth(colonist: Colonist): void {
    if (!colonist.health) return;

    // Calculate total pain from all injuries
    let totalPain = 0;
    let totalBleeding = 0;
    
    for (const injury of colonist.health.injuries) {
      totalPain += injury.pain;
      totalBleeding += injury.bleeding;
    }

    colonist.health.totalPain = Math.min(1.0, totalPain);
    colonist.health.bloodLevel = Math.max(0.0, 1.0 - totalBleeding);
    
    // Calculate consciousness (affected by pain and blood loss)
    colonist.health.consciousness = Math.max(0.1, 1.0 - (totalPain * 0.3) - ((1.0 - colonist.health.bloodLevel) * 0.5));
    
    // Calculate mobility (movement speed)
    const legInjuries = colonist.health.injuries.filter(i => i.bodyPart === 'left_leg' || i.bodyPart === 'right_leg');
    let mobilityPenalty = 0;
    for (const injury of legInjuries) {
      mobilityPenalty += injury.severity * 0.3;
    }
    colonist.health.mobility = Math.max(0.2, 1.0 - mobilityPenalty - totalPain * 0.2);
    
    // Calculate manipulation (work speed)
    const armInjuries = colonist.health.injuries.filter(i => i.bodyPart === 'left_arm' || i.bodyPart === 'right_arm');
    let manipulationPenalty = 0;
    for (const injury of armInjuries) {
      manipulationPenalty += injury.severity * 0.4;
    }
    colonist.health.manipulation = Math.max(0.1, 1.0 - manipulationPenalty - totalPain * 0.3);
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
    
    // Update camera system with new canvas dimensions
    this.cameraSystem.setCanvasDimensions(this.canvas.width, this.canvas.height, this.DPR);
    
    // Update dirty rect tracker with new canvas dimensions
    if (this.dirtyRectTracker) {
      this.dirtyRectTracker.resize(this.canvas.width, this.canvas.height);
    }
    
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

    this.setTouchUIEnabled(this.isActuallyTouchDevice);

    this.uiScale = scale;
    console.log(`UI Scale calculated: ${scale.toFixed(2)} for ${currentWidth}x${currentHeight}`);
  }

  private getMobileControlsInstance(): MobileControls | null {
    const mc = (this as any).mobileControls as MobileControls | undefined;
    return mc ?? null;
  }

  syncMobileControls(): void {
    const mc = this.getMobileControlsInstance();
    if (!mc) return;
    mc.setPauseState(this.paused);
    mc.setFastForwardState(this.fastForward > 1);
    mc.setEraseState(this.eraseMode);
  }

  private applyTouchUIState(): void {
    const enabled = this.touchUIEnabledInternal;
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.toggle('touch-ui', enabled);
    }
    const mc = this.getMobileControlsInstance();
    if (mc) {
      if (enabled) {
        mc.show();
      } else {
        mc.hide();
      }
    }
    this.syncMobileControls();
  }

  setTouchUIEnabled(enabled: boolean, manual = false): void {
    if (manual) {
      this.touchUIManualOverride = enabled;
    } else if (this.touchUIManualOverride !== null) {
      return;
    }
    this.touchUIEnabledInternal = enabled;
    this.isTouch = this.touchUIManualOverride ?? this.touchUIEnabledInternal;
    this.applyTouchUIState();
  }

  refreshTouchUIState(): void {
    this.applyTouchUIState();
  }

  // Helper function to get scaled font size
  getScaledFont(baseSize: number, weight = '500', family = 'system-ui,Segoe UI,Roboto') {
    return `${weight} ${Math.round(baseSize * this.uiScale)}px ${family}`;
  }
  
  // Helper function to scale values
  scale(value: number): number {
    return Math.round(value * this.uiScale);
  }

  screenToWorld = (sx: number, sy: number) => this.cameraSystem.screenToWorld(sx, sy);

  private computeStockpileRect(start: { x: number; y: number } | null, end: { x: number; y: number } | null, allowTapShortcut: boolean): { x: number; y: number; width: number; height: number } | null {
    if (!start || !end) { return null; }

    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    const dragDistance = Math.hypot(dx, dy);

    const defaultTiles = Math.max(1, Math.round(this.defaultStockpileSize / T));
    const defaultWidth = Math.min(WORLD.w, defaultTiles * T);
    const defaultHeight = Math.min(WORLD.h, defaultTiles * T);

    if (allowTapShortcut && dragDistance < T * 0.75) {
      const baseX = Math.floor(start.x / T) * T;
      const baseY = Math.floor(start.y / T) * T;
      const clampedX = clamp(baseX, 0, Math.max(0, WORLD.w - defaultWidth));
      const clampedY = clamp(baseY, 0, Math.max(0, WORLD.h - defaultHeight));
      return { x: clampedX, y: clampedY, width: defaultWidth, height: defaultHeight };
    }

    if (!allowTapShortcut && dragDistance < T * 0.5) {
      return null;
    }

    const x0 = Math.min(start.x, end.x);
    const y0 = Math.min(start.y, end.y);
    const x1 = Math.max(start.x, end.x);
    const y1 = Math.max(start.y, end.y);

    let width = Math.ceil(Math.max(x1 - x0, T) / T) * T;
    let height = Math.ceil(Math.max(y1 - y0, T) / T) * T;
    width = Math.min(Math.max(T, width), WORLD.w);
    height = Math.min(Math.max(T, height), WORLD.h);

    const gx = Math.floor(x0 / T) * T;
    const gy = Math.floor(y0 / T) * T;
    const clampedX = clamp(gx, 0, Math.max(0, WORLD.w - width));
    const clampedY = clamp(gy, 0, Math.max(0, WORLD.h - height));

    return { x: clampedX, y: clampedY, width, height };
  }

  private finalizeStockpileDrag(start: { x: number; y: number } | null, end: { x: number; y: number } | null, allowTapShortcut = false): boolean {
    if (!this.rimWorld) { return false; }
    const rect = this.computeStockpileRect(start, end, allowTapShortcut);
    if (!rect) { return false; }

    this.rimWorld.createStockpileZone(rect.x, rect.y, rect.width, rect.height, 'Stockpile');
    this.msg('Stockpile created', 'good');
    return true;
  }

  getZoneDragPreviewRect(): { x: number; y: number; width: number; height: number } | null {
    if (!this.uiManager.zoneDragStart) { return null; }
    const dragging = this.mouse.rdown || this.touchZoneDragActive;
    if (!dragging) { return null; }
    const current = this.touchZoneDragActive && this.touchZoneLastPos
      ? this.touchZoneLastPos
      : { x: this.mouse.wx, y: this.mouse.wy };
    return this.computeStockpileRect(this.uiManager.zoneDragStart, current, this.touchZoneDragActive);
  }

  bindInput() {
    const c = this.canvas;
    c.addEventListener('mousemove', (e) => {
      const rect = c.getBoundingClientRect();
      this.mouse.x = (e.clientX - rect.left);
      this.mouse.y = (e.clientY - rect.top);
      const wpt = this.screenToWorld(this.mouse.x, this.mouse.y);
      this.mouse.wx = wpt.x; this.mouse.wy = wpt.y;
      
      // PRIORITY PANEL IS MODAL - Block world interactions when open, but allow hover for tooltips
      if (isWorkPriorityPanelOpen()) {
        handleWorkPriorityPanelHover(this.mouse.x * this.DPR, this.mouse.y * this.DPR, this.colonists, this.canvas.width, this.canvas.height);
        return;
      }
      
      // Hotbar hover SFX (play when entering a new tab)
      const hotbarRects = (this as any).modernHotbarRects || [];
      if (hotbarRects.length) {
        const mx = this.mouse.x * this.DPR; const my = this.mouse.y * this.DPR;
        let hoveredTab: any = null;
        for (const r of hotbarRects) {
          if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) { hoveredTab = r.tab; break; }
        }
        if (hoveredTab !== (this.uiManager as any).lastHoveredHotbarTab) {
          (this.uiManager as any).lastHoveredHotbarTab = hoveredTab;
          if (hoveredTab) {
            void this.audioManager.play('ui.hotbar.hover').catch(() => {});
          }
        }
      }

      // Build menu hover SFX (categories and building items)
      if (this.uiManager.activeHotbarTab === 'build') {
        const buildMenuRects = (this as any).modernBuildMenuRects;
        if (buildMenuRects) {
          const mx = this.mouse.x * this.DPR; const my = this.mouse.y * this.DPR;
          // Category hover
          let hoveredCategory: string | null = null;
          for (const r of buildMenuRects.categories) {
            if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) { hoveredCategory = r.category; break; }
          }
          if (hoveredCategory !== (this.uiManager as any).lastHoveredBuildCategory) {
            (this.uiManager as any).lastHoveredBuildCategory = hoveredCategory;
            if (hoveredCategory) { void this.audioManager.play('ui.hover').catch(() => {}); }
          }
          // Building item hover
          let hoveredBuilding: any = null;
          for (const r of buildMenuRects.buildings) {
            if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) { hoveredBuilding = r.buildingKey; break; }
          }
          if (hoveredBuilding !== (this.uiManager as any).lastHoveredBuildingKey) {
            (this.uiManager as any).lastHoveredBuildingKey = hoveredBuilding;
            if (hoveredBuilding) { void this.audioManager.play('ui.hover').catch(() => {}); }
          }
        }
      }

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
      // Drag-to-paint paths/floors
      if (this.mouse.down) {
        const def = this.selectedBuild ? BUILD_TYPES[this.selectedBuild] : null;
        if (def?.isFloor) this.paintPathAtMouse(); // Use paint mode for all floor types
        else if (this.selectedBuild === 'wall') this.paintWallAtMouse();
      }
    });
    c.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.lastInputWasTouch = false; // Track that mouse is being used
      // Only disable touch UI if the user hasn't manually enabled it
      if (this.touchUIManualOverride !== true) {
        this.setTouchUIEnabled(false);
      }
      if (this.touchUIManualOverride === null) {
        this.isActuallyTouchDevice = false;
      }

      // PRIORITY PANEL IS MODAL - Check first and block all other interactions
      if (isWorkPriorityPanelOpen()) {
        if (handleWorkPriorityPanelClick(e.offsetX * this.DPR, e.offsetY * this.DPR, this.colonists, this.canvas.width, this.canvas.height)) {
          return; // Panel handled the click (including closing via X or outside click)
        }
        // If panel is open but click wasn't handled, still block everything else
        return;
      }
      
      // BUILDING INVENTORY PANEL IS MODAL - Check second and block other interactions
      if (isBuildingInventoryPanelOpen()) {
        if (handleBuildingInventoryPanelClick(e.offsetX * this.DPR, e.offsetY * this.DPR, this.canvas.width, this.canvas.height)) {
          return; // Panel handled the click
        }
        // If panel is open but click wasn't handled, still block everything else
        return;
      }
      
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
          }
        }
        // If precise placement UI active, handle mouse clicks like taps/drag
        if (this.pendingPlacement) {
          const mx = this.mouse.x * this.DPR; const my = this.mouse.y * this.DPR;
          
          // Check for button clicks first (using new mobile placement handler)
          if (handleMobilePlacementClick(this, mx, my)) {
            return;
          }
          
          // Ghost hit = start drag/confirm; else move ghost to clicked tile
          const p = this.pendingPlacement; const def = BUILD_TYPES[p.key];
          const toScreen = (wx: number, wy: number) => ({ x: (wx - this.camera.x) * this.camera.zoom, y: (wy - this.camera.y) * this.camera.zoom });
          const g = toScreen(p.x, p.y);
          const gw = def.size.w * T * this.camera.zoom; const gh = def.size.h * T * this.camera.zoom;
          if (mx >= g.x && mx <= g.x + gw && my >= g.y && my <= g.y + gh) { 
            // Begin dragging the ghost instead of instant-confirm; double-click not needed
            this.pendingDragging = true; 
            // UI drag start SFX
            void this.audioManager.play('ui.drag.start').catch(() => {});
            return; 
          }
          const rot = p.rot || 0; const rotated = (rot === 90 || rot === 270);
          const gx = Math.floor(this.mouse.wx / T) * T; const gy = Math.floor(this.mouse.wy / T) * T;
          const w = (rotated ? def.size.h : def.size.w) * T, h = (rotated ? def.size.w : def.size.h) * T;
          p.x = clamp(gx, 0, WORLD.w - w); p.y = clamp(gy, 0, WORLD.h - h);
          return;
        }
        // Detect modern hotbar tab click first
        const mx = this.mouse.x * this.DPR; const my = this.mouse.y * this.DPR;
        const modernHotbarRects = (this as any).modernHotbarRects || [];
        const clickedTab = handleHotbarClick(mx, my, modernHotbarRects);
        if (clickedTab) {
          // Toggle tab or switch to new tab
          this.uiManager.setHotbarTab(clickedTab);
          return;
        }
        
        // Check for modern build menu clicks
        if (this.uiManager.activeHotbarTab === 'build') {
          const buildMenuRects = (this as any).modernBuildMenuRects;
          if (buildMenuRects) {
            const clickResult = handleModernBuildMenuClick(mx, my, buildMenuRects);
            if (clickResult) {
              if (clickResult.type === 'category') {
                // Category clicked - select it
                this.uiManager.setSelectedBuildCategory(clickResult.value);
                void this.audioManager.play('ui.click.primary').catch(() => {});
              } else if (clickResult.type === 'building') {
                // Building clicked - select it and close menus
                this.selectedBuild = clickResult.value;
                void this.audioManager.play('ui.click.primary').catch(() => {});
                this.uiManager.setHotbarTab(null); // Close the build menu
                this.toast('Selected: ' + BUILD_TYPES[clickResult.value].name);
              }
              return;
            }
          }
        }
        
        // Check for context menu click
        if (this.contextMenu) {
          const mx = this.mouse.x * this.DPR; const my = this.mouse.y * this.DPR;
          let clickedOnMenu = false;
          const menu = this.contextMenu;

          for (const rect of this.contextMenuRects) {
            if (mx >= rect.x && mx <= rect.x + rect.w && my >= rect.y && my <= rect.y + rect.h) {
              const item = rect.item;
              if (!item) continue;
              const enabled = item.enabled !== false;

              if (!rect.isSubmenu && item.submenu && item.submenu.length) {
                if (enabled) {
                  menu.openSubmenu = menu.openSubmenu === item.id ? undefined : item.id;
                  if (menu.openSubmenu) { void this.audioManager.play('ui.panel.open').catch(() => {}); }
                }
                clickedOnMenu = true;
                return;
              }

              if (enabled) {
                if (item.action) {
                  item.action({ game: this, target: menu.target, item });
                } else if (menu.onSelect) {
                  menu.onSelect({ game: this, target: menu.target, item });
                }
                void this.audioManager.play('ui.click.primary').catch(() => {});
              }

              hideContextMenuUI(this);
              clickedOnMenu = true;
              return;
            }
          }

          if (!clickedOnMenu) {
            hideContextMenuUI(this);
          }
        }
        
  if (this.showBuildMenu) { handleBuildMenuClickUI(this); return; }
        
        // Check for erase mode (toggled by mobile erase button)
        if (this.eraseMode) {
          this.cancelOrErase();
          return;
        }
        
        const def = this.selectedBuild ? BUILD_TYPES[this.selectedBuild] : null;
        if (def?.isFloor) { this.paintPathAtMouse(true); } // Floor types use paint mode
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
        
        // Check if we have a drafted colonist selected
        if (this.selColonist && this.selColonist.isDrafted) {
          // Right-click on enemy to assign target
          const clickedEnemy = this.findEnemyAt(this.mouse.wx, this.mouse.wy);
          if (clickedEnemy) {
            this.selColonist.draftedTarget = clickedEnemy;
            this.selColonist.draftedPosition = null; // Clear position order
            this.msg(`${this.selColonist.profile?.name || 'Colonist'} targeting enemy`, 'info');
            return;
          }
          
          // Right-click on ground to move there (snap to grid center for precise control)
          const T = 32; // Tile size
          const gridX = Math.floor(this.mouse.wx / T) * T + T / 2;
          const gridY = Math.floor(this.mouse.wy / T) * T + T / 2;
          this.selColonist.draftedPosition = { x: gridX, y: gridY };
          this.selColonist.draftedTarget = null; // Clear target order
          this.msg(`${this.selColonist.profile?.name || 'Colonist'} moving to position`, 'info');
          return;
        }
        
        // Check for colonist context menu
        const clickedColonist = this.findColonistAt(this.mouse.wx, this.mouse.wy);
        if (clickedColonist) {
          showColonistContextMenu(this, clickedColonist, this.mouse.x, this.mouse.y);
          return;
        }

        const clickedBuilding = this.findBuildingAt(this.mouse.wx, this.mouse.wy);
        if (clickedBuilding && showBuildingContextMenu(this, clickedBuilding, this.mouse.x, this.mouse.y)) {
          return;
        }

        // If stockpile designator selected, start a zone drag
        if (this.selectedBuild === 'stock') {
          this.uiManager.zoneDragStart = { x: this.mouse.wx, y: this.mouse.wy };
        } else {
          this.eraseDragStart = { x: this.mouse.wx, y: this.mouse.wy };
        }
      }
    });
  c.addEventListener('mouseup', (e) => {
      e.preventDefault();
      if ((e as MouseEvent).button === 0) { 
        this.mouse.down = false; this.lastPaintCell = null; 
        if (this.pendingDragging) {
          // UI drag end SFX
          void this.audioManager.play('ui.drag.end').catch(() => {});
        }
        this.pendingDragging = false;
      }
      if ((e as MouseEvent).button === 2) {
        if (this.uiManager.zoneDragStart && this.selectedBuild === 'stock') {
          this.finalizeStockpileDrag(this.uiManager.zoneDragStart, { x: this.mouse.wx, y: this.mouse.wy });
        } else if (this.eraseDragStart) {
          const x0 = Math.min(this.eraseDragStart.x, this.mouse.wx);
          const y0 = Math.min(this.eraseDragStart.y, this.mouse.wy);
          const x1 = Math.max(this.eraseDragStart.x, this.mouse.wx);
          const y1 = Math.max(this.eraseDragStart.y, this.mouse.wy);
          const area = (x1 - x0) * (y1 - y0);
          if (area < 12 * 12) this.cancelOrErase(); else this.eraseInRect({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
        }
        this.mouse.rdown = false; this.eraseDragStart = null; this.uiManager.zoneDragStart = null;
      }
    });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      // Get mouse position for hover detection
      const rect = c.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      
      // If work priority panel is open and mouse is over it, scroll the panel (and prevent zoom)
      if (isWorkPriorityPanelOpen() && isMouseOverWorkPanel(cx, cy, this.colonists, c.width, c.height)) {
        handleWorkPriorityPanelScroll(e.deltaY, this.colonists, c.width, c.height);
        return; // Don't zoom when scrolling the panel
      }
      
      // Otherwise, zoom around cursor position
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const worldBefore = this.screenToWorld(cx, cy);
      const newZoom = Math.max(0.6, Math.min(2.2, this.camera.zoom * zoomFactor));
      this.camera.zoom = newZoom;
      const worldAfter = this.screenToWorld(cx, cy);
      this.camera.x += worldBefore.x - worldAfter.x;
      this.camera.y += worldBefore.y - worldAfter.y;
      this.clampCameraToWorld();
    });
    
    // Bind keyboard events through InputManager
    this.inputManager.bindKeyboardEvents(() => {
      const dc = (this as any).debugConsole;
      return dc && dc.open; // Block input if debug console is open
    });
    
    // Debug console toggle (separate from game input)
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
      this.setTouchUIEnabled(true);
      if (e.touches.length === 1) {
        const rect = c.getBoundingClientRect();
        const sx = e.touches[0].clientX - rect.left;
        const sy = e.touches[0].clientY - rect.top;
        const wpt = this.screenToWorld(sx, sy);
        this.mouse.x = sx; this.mouse.y = sy; this.mouse.wx = wpt.x; this.mouse.wy = wpt.y;

        if (this.selectedBuild === 'stock') {
          this.touchZoneDragActive = true;
          this.touchZoneLastPos = { x: wpt.x, y: wpt.y };
          this.uiManager.zoneDragStart = { x: wpt.x, y: wpt.y };
          this.mouse.rdown = true;
          this.touchLastPan = null;
          if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
          }
          this.longPressStartPos = null;
          this.longPressStartTime = null;
          this.longPressTarget = null;
          this.longPressTargetType = null;
          return;
        }

        this.touchZoneDragActive = false;
        this.touchZoneLastPos = null;
        this.uiManager.zoneDragStart = null;
        this.mouse.rdown = false;

        this.touchLastPan = { x: e.touches[0].clientX, y: e.touches[0].clientY };

        const clickedColonist = this.findColonistAt(wpt.x, wpt.y);

        if (clickedColonist) {
          this.longPressStartPos = { x: sx, y: sy };
          this.longPressStartTime = performance.now();
          this.longPressTarget = clickedColonist;
          this.longPressTargetType = 'colonist';

          this.longPressTimer = window.setTimeout(() => {
            showColonistContextMenu(this, clickedColonist, sx, sy);
            if (navigator.vibrate) {
              navigator.vibrate(50);
            }
            this.longPressStartTime = null;
            this.longPressTarget = null;
            this.longPressTargetType = null;
          }, 500); // 500ms long press
        } else {
          const clickedBuilding = this.findBuildingAt(wpt.x, wpt.y);
          if (clickedBuilding) {
            this.longPressStartPos = { x: sx, y: sy };
            this.longPressStartTime = performance.now();
            this.longPressTarget = clickedBuilding;
            this.longPressTargetType = 'building';

            this.longPressTimer = window.setTimeout(() => {
              showBuildingContextMenu(this, clickedBuilding, sx, sy);
              if (navigator.vibrate) {
                navigator.vibrate(50);
              }
              this.longPressStartTime = null;
              this.longPressTarget = null;
              this.longPressTargetType = null;
            }, 500);
          }
        }

      } else if (e.touches.length === 2) {
        // Cancel long press timer when multi-touch
        if (this.longPressTimer) {
          clearTimeout(this.longPressTimer);
          this.longPressTimer = null;
        }
        this.longPressStartTime = null;
        this.longPressTarget = null;
        this.longPressTargetType = null;
        this.touchZoneDragActive = false;
        this.touchZoneLastPos = null;
        this.uiManager.zoneDragStart = null;
        this.mouse.rdown = false;
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
          this.longPressTargetType = null;
        }
      }
      
      if (this.touchZoneDragActive && e.touches.length === 1) {
        const rect = c.getBoundingClientRect();
        const sx = e.touches[0].clientX - rect.left;
        const sy = e.touches[0].clientY - rect.top;
        const wpt = this.screenToWorld(sx, sy);
        this.mouse.x = sx; this.mouse.y = sy; this.mouse.wx = wpt.x; this.mouse.wy = wpt.y;
        this.touchZoneLastPos = { x: wpt.x, y: wpt.y };
        return;
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
  this.longPressTargetType = null;

      if (this.touchZoneDragActive && this.uiManager.zoneDragStart) {
        const rect = c.getBoundingClientRect();
        const changed = e.changedTouches[0];
        let endWorld: { x: number; y: number } | null = null;
        if (changed) {
          const sx = changed.clientX - rect.left;
          const sy = changed.clientY - rect.top;
          endWorld = this.screenToWorld(sx, sy);
        } else if (this.touchZoneLastPos) {
          endWorld = this.touchZoneLastPos;
        } else {
          endWorld = { x: this.mouse.wx, y: this.mouse.wy };
        }

        const created = this.finalizeStockpileDrag(this.uiManager.zoneDragStart, endWorld, true);
        this.touchZoneDragActive = false;
        this.touchZoneLastPos = null;
        this.uiManager.zoneDragStart = null;
        this.mouse.rdown = false;
        if (created) {
          if (navigator.vibrate) { navigator.vibrate(30); }
          if (this.lastInputWasTouch) {
            this.selectedBuild = null;
            this.syncMobileControls();
          }
          this.touchLastPan = null;
          this.touchLastDist = null;
          return;
        }
      }

      // Treat single-finger touchend as a tap/click if not panning
      if (e.changedTouches.length === 1 && e.touches.length === 0) {
        const rect = c.getBoundingClientRect();
        const sx = e.changedTouches[0].clientX - rect.left;
        const sy = e.changedTouches[0].clientY - rect.top;
        this.handleTapOrClickAtScreen(sx, sy);
      }
      if (e.touches.length === 0) { this.touchLastPan = null; this.touchLastDist = null; }
    }, { passive: false } as any);

    c.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      this.lastInputWasTouch = true;
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
      this.longPressStartPos = null;
      this.longPressStartTime = null;
      this.longPressTarget = null;
      this.longPressTargetType = null;
      this.touchZoneDragActive = false;
      this.touchZoneLastPos = null;
      this.uiManager.zoneDragStart = null;
      this.mouse.rdown = false;
      if (this.lastInputWasTouch && this.selectedBuild === 'stock') {
        this.selectedBuild = null;
        this.syncMobileControls();
      }
      this.touchLastPan = null;
      this.touchLastDist = null;
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

    // PRIORITY PANEL IS MODAL - Check first and block all other interactions
    if (isWorkPriorityPanelOpen()) {
      if (handleWorkPriorityPanelClick(sx * this.DPR, sy * this.DPR, this.colonists, this.canvas.width, this.canvas.height)) {
        return; // Panel handled the click (including closing via X or outside click)
      }
      // If panel is open but click wasn't handled, still block everything else
      return;
    }

    // BUILDING INVENTORY PANEL IS MODAL - Check second and block other interactions
    if (isBuildingInventoryPanelOpen()) {
      if (handleBuildingInventoryPanelClick(sx * this.DPR, sy * this.DPR, this.canvas.width, this.canvas.height)) {
        return; // Panel handled the click
      }
      // If panel is open but click wasn't handled, still block everything else
      return;
    }

    // If precise placement UI is active, handle its buttons or move/confirm by tapping
    if (this.pendingPlacement) {
      const mx = this.mouse.x * this.DPR; const my = this.mouse.y * this.DPR;
      
      // 1) Check for button clicks (using new mobile placement handler)
      if (handleMobilePlacementClick(this, mx, my)) {
        return;
      }
      
      // 2) Tap on ghost = confirm, tap elsewhere = move ghost to tapped tile
      if (isClickOnGhost(this, mx, my)) {
        this.confirmPending();
        return;
      }
      
      // Move pending to tapped world position (snap to grid)
      const p = this.pendingPlacement; const def = BUILD_TYPES[p.key];
      const gx = Math.floor(this.mouse.wx / T) * T; const gy = Math.floor(this.mouse.wy / T) * T;
      const w = def.size.w * T, h = def.size.h * T;
      p.x = clamp(gx, 0, WORLD.w - w); p.y = clamp(gy, 0, WORLD.h - h);
      return;
    }

    // If colonist panel shown, allow closing via X button or interacting with tabs (mobile UX)
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
        if (!inside) {
          const keepSelection = this.lastInputWasTouch && this.selColonist?.isDrafted;
          if (!keepSelection) { this.selColonist = null; this.follow = false; return; }
        }
      }
    }

    const mx = this.mouse.x * this.DPR; const my = this.mouse.y * this.DPR;

    // Modern hotbar tabs (touch)
    const modernHotbarRects = (this as any).modernHotbarRects || [];
    const touchedTab = handleHotbarClick(mx, my, modernHotbarRects);
    if (touchedTab) {
      this.uiManager.setHotbarTab(touchedTab);
      return;
    }

    // Legacy hotbar fallback (desktop-only UI still available in some screens)
    for (const r of this.hotbarRects) {
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        const key = this.hotbar[r.index];
        if (key) { this.selectedBuild = key; this.toast('Selected: ' + BUILD_TYPES[key].name); }
        return;
      }
    }

    // Modern build menu (build tab)
    if (this.uiManager.activeHotbarTab === 'build') {
      const buildMenuRects = (this as any).modernBuildMenuRects;
      if (buildMenuRects) {
        const clickResult = handleModernBuildMenuClick(mx, my, buildMenuRects);
        if (clickResult) {
          if (clickResult.type === 'category') {
            this.uiManager.setSelectedBuildCategory(clickResult.value);
            void this.audioManager.play('ui.click.primary').catch(() => {});
          } else if (clickResult.type === 'building') {
            this.selectedBuild = clickResult.value;
            void this.audioManager.play('ui.click.primary').catch(() => {});
            this.uiManager.setHotbarTab(null);
            this.toast('Selected: ' + BUILD_TYPES[clickResult.value].name);
          }
          return;
        }
      }
    }

    // Check for context menu click
    if (this.contextMenu) {
      const mxMenu = this.mouse.x * this.DPR; const myMenu = this.mouse.y * this.DPR;
      let clickedOnMenu = false;
      const menu = this.contextMenu;

      for (const rect of this.contextMenuRects) {
        if (mxMenu >= rect.x && mxMenu <= rect.x + rect.w && myMenu >= rect.y && myMenu <= rect.y + rect.h) {
          const item = rect.item;
          if (!item) continue;
          const enabled = item.enabled !== false;

          if (!rect.isSubmenu && item.submenu && item.submenu.length) {
            if (enabled) {
              menu.openSubmenu = menu.openSubmenu === item.id ? undefined : item.id;
            }
            clickedOnMenu = true;
            return;
          }

          if (enabled) {
            if (item.action) {
              item.action({ game: this, target: menu.target, item });
            } else if (menu.onSelect) {
              menu.onSelect({ game: this, target: menu.target, item });
            }
          }

          hideContextMenuUI(this);
          clickedOnMenu = true;
          return;
        }
      }

      if (!clickedOnMenu) {
        hideContextMenuUI(this);
      }
    }

    // Build menu click
  if (this.showBuildMenu) { handleBuildMenuClickUI(this); return; }

    // Check for erase mode (toggled by mobile erase button)
    if (this.eraseMode) {
      this.cancelOrErase();
      return;
    }

    // Building/selection logic
    const def = this.selectedBuild ? BUILD_TYPES[this.selectedBuild] : null;
    if (def?.isFloor) { this.paintPathAtMouse(true); return; } // Floor types use paint mode
    if (this.selectedBuild === 'wall') { this.paintWallAtMouse(true); return; }

  // Start precise placement on touch if nothing active (unless forced desktop mode)
  if (!this.debug.forceDesktopMode && this.isActuallyTouchDevice && this.lastInputWasTouch && this.selectedBuild) { this.placeAtMouse(); return; }

    const colonistUnderPointer = this.findColonistAt(this.mouse.wx, this.mouse.wy);
    const enemyUnderPointer = this.selColonist?.isDrafted ? this.findEnemyAt(this.mouse.wx, this.mouse.wy) : null;

    const canDirectCommand = Boolean(this.selColonist && this.selColonist.isDrafted && this.lastInputWasTouch && !this.pendingPlacement && !this.selectedBuild && !this.contextMenu && !this.showBuildMenu && !this.eraseMode);
    if (canDirectCommand) {
      if (enemyUnderPointer) {
        this.selColonist!.draftedTarget = enemyUnderPointer;
        this.selColonist!.draftedPosition = null;
        this.msg(`${this.selColonist!.profile?.name || 'Colonist'} targeting enemy`, 'info');
        if (navigator.vibrate) { try { navigator.vibrate(25); } catch {} }
        return;
      }
      if (!colonistUnderPointer) {
        const gridX = Math.floor(this.mouse.wx / T) * T + T / 2;
        const gridY = Math.floor(this.mouse.wy / T) * T + T / 2;
        this.selColonist!.draftedPosition = { x: gridX, y: gridY };
        this.selColonist!.draftedTarget = null;
        this.msg(`${this.selColonist!.profile?.name || 'Colonist'} moving to position`, 'info');
        if (navigator.vibrate) { try { navigator.vibrate(18); } catch {} }
        return;
      }
    }

    const col = colonistUnderPointer;
    if (col) { this.selColonist = col; this.follow = true; return; }

    const building = this.findBuildingAt(this.mouse.wx, this.mouse.wy);
    if (building && showBuildingContextMenu(this, building, this.mouse.x, this.mouse.y)) {
      return;
    }

    this.placeAtMouse();
  }

  findColonistAt(x: number, y: number): Colonist | null {
    for (let i = this.colonists.length - 1; i >= 0; i--) {
      const c = this.colonists[i];
      const hiddenInside = c.inside && c.inside.kind !== 'bed';
      if (!c.alive || hiddenInside) continue;
      const d2 = (c.x - x) * (c.x - x) + (c.y - y) * (c.y - y);
      if (d2 <= (c.r + 2) * (c.r + 2)) return c;
    }
    return null;
  }
  
  findEnemyAt(x: number, y: number): Enemy | null {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.hp <= 0) continue;
      const d2 = (e.x - x) * (e.x - x) + (e.y - y) * (e.y - y);
      if (d2 <= (e.r + 4) * (e.r + 4)) return e;
    }
    return null;
  }

  findBuildingAt(x: number, y: number, opts?: { includeUnderConstruction?: boolean }): Building | null {
    const includeUnderConstruction = opts?.includeUnderConstruction ?? false;
    for (let i = this.buildings.length - 1; i >= 0; i--) {
      const b = this.buildings[i];
      if (!includeUnderConstruction && !b.done) continue;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        return b;
      }
    }
    return null;
  }

  msg(text: string, kind: Message["kind"] = 'info') { 
    this.messages.push({ text, t: 4, kind }); 
    this.toast(text, 1600); 
  }
  
  toast(msg: string, ms = 1400) {
    // Use the new ToastManager if available (injected by UI bootstrap)
    const toastManager = (this as any).toastManager;
    if (toastManager && typeof toastManager.show === 'function') {
      toastManager.show(msg, ms);
    } else {
      // Fallback to old method if ToastManager not yet initialized
      const el = document.getElementById('toast') as HTMLDivElement | null;
      if (!el) return;
      el.textContent = msg;
      el.style.opacity = '1';
      clearTimeout((el as any)._t);
      (el as any)._t = setTimeout(() => el.style.opacity = '0', ms);
    }
  }

  playAudio(key: AudioKey, options?: PlayAudioOptions) {
  const resolvedOptions: PlayAudioOptions = options ? { ...options } : {};
    if (resolvedOptions.position) {
      resolvedOptions.listenerPosition = resolvedOptions.listenerPosition ?? this.audioManager.getListenerPosition();
      if (resolvedOptions.listenerZoom === undefined) {
        resolvedOptions.listenerZoom = this.audioManager.getListenerZoom();
      }
    }

    this.audioManager.play(key, resolvedOptions).catch((err) => {
      console.warn('[Game] Failed to play audio:', key, err);
    });
  }

  stopAudio(key: AudioKey) {
    this.audioManager.stop(key);
  }

  // World setup
  scatter() {
    for (let i = 0; i < 220; i++) { const p = { x: rand(80, WORLD.w - 80), y: rand(80, WORLD.h - 80) }; if (Math.hypot(p.x - HQ_POS.x, p.y - HQ_POS.y) < 220) continue; this.trees.push({ x: p.x, y: p.y, r: 12, hp: 40, type: 'tree' }); }
    for (let i = 0; i < 140; i++) { const p = { x: rand(80, WORLD.w - 80), y: rand(80, WORLD.h - 80) }; if (Math.hypot(p.x - HQ_POS.x, p.y - HQ_POS.y) < 200) continue; this.rocks.push({ x: p.x, y: p.y, r: 12, hp: 50, type: 'rock' }); }
    // Rebuild navigation grid after scattering resources
    this.rebuildNavGridImmediate(); // Use immediate rebuild during game init
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
          // Use partial rebuild for new resource (only affects small area around spawn point)
          this.navigationManager.rebuildNavGridPartial(p.x, p.y, 12 + 32);
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
  this.rebuildNavGridImmediate(); // Use immediate rebuild during game init
  }
  newGame() {
  this.colonists.length = this.enemies.length = this.trees.length = this.rocks.length = this.buildings.length = this.bullets.length = this.messages.length = 0;
  this.buildReservations.clear();
  this.insideCounts.clear();
  this.sleepReservations.clear();
  
  // Clear colonist sprite cache on new game to ensure fresh sprite composition
  colonistSpriteCache.clear();
  
  this.RES.wood = 50; this.RES.stone = 30; this.RES.food = 20; this.day = 1; this.tDay = 0; this.fastForward = 1; this.camera.zoom = 1; this.camera.x = HQ_POS.x - (this.canvas.width / this.DPR) / (2 * this.camera.zoom); this.camera.y = HQ_POS.y - (this.canvas.height / this.DPR) / (2 * this.camera.zoom);
    this.buildHQ();
    this.scatter();
  for (let i = 0; i < 3; i++) { const a = rand(0, Math.PI * 2); const r = 80 + rand(-10, 10); this.spawnColonist({ x: HQ_POS.x + Math.cos(a) * r, y: HQ_POS.y + Math.sin(a) * r }); }
    
    // Fix up any colonists with old body type naming (migration)
    let migratedCount = 0;
    for (const c of this.colonists) {
      if (c.profile?.avatar?.sprites?.bodyType === 'Male_Average_Normal') {
        c.profile.avatar.sprites.bodyType = 'naked_male';
        migratedCount++;
      }
    }
    
    // Clear sprite cache if we migrated any colonists to force re-compositing with correct sprites
    if (migratedCount > 0) {
      console.log(`Migrated ${migratedCount} colonist(s) to new body type, clearing sprite cache`);
      colonistSpriteCache.clear();
    }
    
    // Post-process: ensure at least one starting colonist has a ranged weapon
    const hasAnyRanged = this.colonists.some(c => c.inventory?.equipment?.weapon && (c.inventory!.equipment!.weapon!.defName === 'Autopistol' || c.inventory!.equipment!.weapon!.defName === 'AssaultRifle'));
    if (!hasAnyRanged && this.colonists.length) {
      const c = this.colonists[0];
      const pistol = itemDatabase.createItem('Autopistol', 1, 'normal');
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

    // Attach skills from profile.initialSkills if present
    if ((profile as any).initialSkills) {
      c.skills = (profile as any).initialSkills;
    }
    
    // Initialize the detailed health system
    initializeColonistHealth(c);
    
    // Initialize work priorities (skill-based)
    initializeWorkPriorities(c);
    
    // Enable async pathfinding by default
    (c as any).useAsyncPathfinding = true;
    
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
  // Hold pending sleep assignments so colonists don't steal beds mid-walk
  sleepReservations = new Map<Building, Set<Colonist>>();
  buildingCapacity(b: Building): number {
    if (b.kind === 'hq') return 8; // generous lobby
    if (b.kind === 'house') return 3; // requested: 3 slots per house
    if (typeof b.popCap === 'number') return b.popCap;
    return 1;
  }
  private getReservedSleepCount(b: Building, ignoreColonist?: Colonist): number {
    const reservations = this.sleepReservations.get(b);
    if (!reservations || reservations.size === 0) return 0;
    if (ignoreColonist && reservations.has(ignoreColonist)) {
      return Math.max(0, reservations.size - 1);
    }
    return reservations.size;
  }
  buildingHasSpace(b: Building, ignoreColonist?: Colonist): boolean {
    const cap = this.buildingCapacity(b);
    const cur = this.insideCounts.get(b) || 0;
    const reserved = this.getReservedSleepCount(b, ignoreColonist);
    return cur + reserved < cap;
  }
  reserveSleepSpot(c: Colonist, b: Building): boolean {
    if (!b.done) return false;
    if (c.reservedSleepFor === b) return true;
    if (c.reservedSleepFor && c.reservedSleepFor !== b) {
      this.releaseSleepReservation(c);
    }
    const cap = this.buildingCapacity(b);
    const inside = this.insideCounts.get(b) || 0;
    const reservations = this.sleepReservations.get(b) || new Set<Colonist>();
    if (inside + reservations.size >= cap) {
      return false;
    }
    reservations.add(c);
    this.sleepReservations.set(b, reservations);
    c.reservedSleepFor = b;
    return true;
  }
  releaseSleepReservation(c: Colonist) {
    const b = c.reservedSleepFor;
    if (!b) return;
    const reservations = this.sleepReservations.get(b);
    if (reservations) {
      reservations.delete(c);
      if (reservations.size === 0) this.sleepReservations.delete(b);
    }
    c.reservedSleepFor = null;
  }
  tryEnterBuilding(c: Colonist, b: Building): boolean {
    if (!b.done) return false;
    if (!this.buildingHasSpace(b, c)) return false;
    this.insideCounts.set(b, (this.insideCounts.get(b) || 0) + 1);
    this.releaseSleepReservation(c);
    c.inside = b; c.hideTimer = 0;
    if (b.kind === 'bed') {
      const center = this.centerOf(b);
      c.x = center.x;
      c.y = center.y;
      c.restingOn = b;
      // Align sprite to a horizontal pose while sleeping
      (c as any).sleepFacing = Math.PI / 2;
    } else {
      c.restingOn = null;
    }
    return true;
  }
  leaveBuilding(c: Colonist) {
    const b = c.inside;
    if (b) {
      const cur = (this.insideCounts.get(b) || 1) - 1;
      if (cur <= 0) this.insideCounts.delete(b); else this.insideCounts.set(b, cur);
    }
    if (b && b.kind === 'bed') {
      c.restingOn = null;
      (c as any).sleepFacing = undefined;
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
  setTask(c: Colonist, task: string, target: any, options?: { isPlayerCommand?: boolean; extraData?: any }) {
    const isPlayerCommand = options?.isPlayerCommand ?? false;
    const extraData = options?.extraData;

    // Normalize high level commands into concrete tasks
    if (task === 'work') {
      if (target && typeof target === 'object' && 'buildLeft' in target && typeof (target as any).buildLeft === 'number' && !(target as Building).done) {
        task = 'build';
      } else {
        task = 'goto';
      }
    }

    let commandIntent: ColonistCommandIntent | null = null;
    switch (task) {
      case 'goto':
      case 'rest':
      case 'medical':
      case 'seekMedical':
      case 'guard':
        commandIntent = task;
        break;
      default:
        commandIntent = null;
        break;
    }

    // release old reserved target
    if (c.target && (c.target as any).type && this.assignedTargets.has(c.target)) this.assignedTargets.delete(c.target);
    // release old build reservation if changing away from that building
    if (c.reservedBuildFor && c.reservedBuildFor !== target) this.releaseBuildReservation(c);
    c.task = task;
    c.target = target;
    c.taskData = extraData ?? null;
    this.clearPath(c);

    // Reset any lingering door interactions when task changes
    const releaseDoorIfQueued = (door: any) => {
      if (!door || door.kind !== 'door' || !c.id) return;
      releaseDoorQueue(door, c.id);
    };
    if (c.waitingForDoor) {
      releaseDoorIfQueued(c.waitingForDoor);
    }
    if (c.doorPassingThrough && c.doorPassingThrough !== c.waitingForDoor) {
      releaseDoorIfQueued(c.doorPassingThrough);
    }
    c.waitingForDoor = null;
    c.doorPassingThrough = null;
    c.doorApproachVector = null;
    c.doorWaitStart = undefined;

    // Track direct-command metadata
    if (commandIntent) {
      c.commandIntent = commandIntent;
      c.commandData = extraData ?? null;
      if (commandIntent === 'guard') {
        if (target && typeof target === 'object' && 'x' in target && 'y' in target && !('w' in target)) {
          c.guardAnchor = { x: target.x, y: target.y };
        } else if (target && typeof target === 'object' && 'x' in target && 'y' in target && 'w' in target && 'h' in target) {
          c.guardAnchor = { x: (target as Building).x + (target as Building).w / 2, y: (target as Building).y + (target as Building).h / 2 };
        } else {
          c.guardAnchor = null;
        }
      } else {
        c.guardAnchor = null;
      }
    } else {
      c.commandIntent = null;
      c.commandData = null;
      c.guardAnchor = null;
    }
    
    // Mark player-issued commands with a timestamp and expiration
    if (isPlayerCommand) {
      c.playerCommand = {
        issued: true,
        timestamp: c.t || 0,
        task: task,
        expires: (c.t || 0) + 300 // Commands expire after 5 minutes (300 seconds) of game time
      };
    }
    
    // reserve resources so only one colonist picks the same tree/rock
    if (target && (target as any).type && ((target as any).type === 'tree' || (target as any).type === 'rock')) this.assignedTargets.add(target);
    // reserve a build slot
    if (task === 'build' && target && (target as Building).w != null && !c.reservedBuildFor) {
      const b = target as Building; const cur = this.buildReservations.get(b) || 0; const maxCrew = this.getMaxCrew(b);
      if (cur < maxCrew) { this.buildReservations.set(b, cur + 1); c.reservedBuildFor = b; }
    }
  }
  pickTask(c: Colonist) {
    // Ensure colonist has work priorities initialized
    if (!(c as any).workPriorities) {
      initializeWorkPriorities(c);
    }
    
    // During night time, don't assign new tasks - colonists should be sleeping
    if (this.isNight()) {
      this.setTask(c, 'idle', { x: c.x, y: c.y }); // Stay in place, FSM will handle sleep transition
      return;
    }
    
    // Build a list of available work with priorities
    const candidates: any[] = [];
    
    // Helper to get work priority
    const getWorkPriority = (workType: string): number => {
      const priorities = (c as any).workPriorities;
      if (!priorities || !priorities[workType]) return 3; // Default priority
      const p = priorities[workType];
      return p === 0 ? 999 : p; // 0 = disabled
    };
    
    // Helper to check if colonist can do work
    const canDoWork = (workType: string): boolean => {
      const priorities = (c as any).workPriorities;
      if (!priorities) return true;
      const p = priorities[workType];
      return p !== 0; // Can do if not disabled
    };
    
    // Gather candidates from Work Givers (Construction, Growing, WaterCollection, PlantCutting, Mining, Cooking, Hauling, ...)
    const produced = this.workGiverManager.getCandidates({
      game: this,
      colonist: c,
      getWorkPriority,
      canDoWork
    });
    if (produced && produced.length) candidates.push(...produced);
    
    // Sort candidates by priority (lower = better), then by same work type preference, then distance
    // Get current work type if colonist has an active task
    const currentWorkType = getWorkTypeForTask(c.task);
    
    candidates.sort((a, b) => {
      // First: Sort by priority (lower number = higher priority)
      if (a.priority !== b.priority) return a.priority - b.priority;
      
      // Second: Prefer continuing the same work type (work type affinity)
      // This ensures colonists finish similar tasks before switching to different work
      if (currentWorkType) {
        const aIsSameType = a.workType === currentWorkType ? 1 : 0;
        const bIsSameType = b.workType === currentWorkType ? 1 : 0;
        if (aIsSameType !== bIsSameType) return bIsSameType - aIsSameType; // Prefer same type
      }
      
      // Third: Sort by distance (closer is better)
      return a.distance - b.distance;
    });
    
    if (candidates.length > 0) {
      // Reachability-gated assignment: ensure we can reach the target before assigning
      const MAX_REACH_CHECKS = 5; // Budget path checks per assignment
      let assigned = false;
      for (let i = 0, checks = 0; i < candidates.length && checks < MAX_REACH_CHECKS; i++) {
        const cand = candidates[i];
        
        // Construction can be built from adjacent tiles; center may be blocked. Skip reachability check for build tasks.
        const skipCheck = cand.task === 'build';
        let reachable = true;
        if (!skipCheck) {
          // Identify a reasonable approach point (center for most targets)
          let tx: number | null = null, ty: number | null = null;
          const tgt: any = cand.target;
          if (tgt && typeof tgt.x === 'number' && typeof tgt.y === 'number') {
            if (typeof tgt.w === 'number' && typeof tgt.h === 'number') {
              tx = tgt.x + tgt.w / 2; ty = tgt.y + tgt.h / 2;
            } else {
              tx = tgt.x; ty = tgt.y;
            }
          }
          if (tx != null && ty != null) {
            checks++;
            try {
              const path = this.navigationManager.computePathWithDangerAvoidance(c, c.x, c.y, tx, ty);
              reachable = !!(path && path.length);
            } catch {
              reachable = false;
            }
          }
        }
        if (reachable) {
          this.setTask(c, cand.task, cand.target, { extraData: cand.extraData });
          assigned = true;
          // Debug logging
          if (Math.random() < 0.1) {
            console.log(`Colonist ${c.profile?.name || 'Unknown'} assigned ${cand.workType} (priority ${cand.priority}): ${cand.task}`);
          }
          break;
        }
      }
      if (!assigned) {
        // Fallback: if none validated within budget, assign the top candidate (legacy behavior)
        const bestWork = candidates[0];
        this.setTask(c, bestWork.task, bestWork.target, { extraData: bestWork.extraData });
        if (Math.random() < 0.05) {
          console.log(`Assigned without reachability validation due to budget: ${bestWork.task}`);
        }
      }
    } else {
      // No work available - idle
      this.setTask(c, 'idle', { x: c.x + rand(-80, 80), y: c.y + rand(-80, 80) });
      if (Math.random() < 0.05) {
        console.log(`Colonist ${c.profile?.name || 'Unknown'} has no available work (idling)`);
      }
    }
  }
  nearestCircle<T extends { x: number; y: number }>(p: { x: number; y: number }, arr: T[]): T | null {
    let best: T | null = null, bestD = 1e9; for (const o of arr) { const d = dist2(p as any, o as any); if (d < bestD) { bestD = d; best = o; } } return best;
  }
  
  nearestSafeCircle<T extends { x: number; y: number }>(c: Colonist, p: { x: number; y: number }, arr: T[]): T | null {
    // Danger memory system removed - just use nearest circle
    return this.nearestCircle(p, arr);
  }
  moveAlongPath(c: Colonist, dt: number, target?: { x: number; y: number }, arrive = 10) {
    // Check if colonist is using async pathfinding mode
    const useAsync = (c as any).useAsyncPathfinding === true;
    
    // periodic re-pathing but only if goal changed or timer elapsed - REPATH TIMER TEMPORARILY DISABLED
    // c.repath = (c.repath || 0) - dt; // TEMPORARILY DISABLED
    const goalChanged = target && (!c.pathGoal || Math.hypot(c.pathGoal.x - target.x, c.pathGoal.y - target.y) > 24);
    if (target && (goalChanged || !c.path || c.pathIndex == null)) {
      // Compute path immediately
      const p = this.computePathWithDangerAvoidance(c, c.x, c.y, target.x, target.y);
      if (p && p.length) { 
        c.path = p; 
        c.pathIndex = 0;
        c.pathGoal = { x: target.x, y: target.y };
      }
    }
    
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

    // Handle door interactions before movement so colonists don't clip through
    if (c.waitingForDoor) {
      const door = c.waitingForDoor;
      const doorValid = door && door.kind === 'door' && door.done;
      if (!doorValid) {
        if (door && door.doorQueue && c.id) {
          releaseDoorQueue(door, c.id);
        }
        c.waitingForDoor = null;
        c.doorWaitStart = undefined;
        c.doorPassingThrough = null;
        c.doorApproachVector = null;
      } else if (isDoorBlocking(door)) {
        requestDoorOpen(door, c, 'colonist');
        if (!c.doorWaitStart) {
          c.doorWaitStart = c.t || 0;
        }
        return false;
      } else {
        // Door is now passable; waitingAtDoor state will clear flags this frame
        return false;
      }
    }

    if (!c.waitingForDoor && L > 1e-3) {
      const blockingDoor = findBlockingDoor(this, c);
      if (blockingDoor && isDoorBlocking(blockingDoor)) {
        const doorCenterX = blockingDoor.x + blockingDoor.w / 2;
        const doorCenterY = blockingDoor.y + blockingDoor.h / 2;
        const toDoorX = doorCenterX - c.x;
        const toDoorY = doorCenterY - c.y;
        const doorAheadDot = dx * toDoorX + dy * toDoorY;
        if (doorAheadDot > 0) {
          const doorDist = Math.hypot(toDoorX, toDoorY);
          // Require the door to be reasonably close to the current waypoint direction
          const dirMag = L || 1;
          const angleCos = doorDist > 0 ? doorAheadDot / (dirMag * doorDist) : 1;
          if (doorDist <= L + Math.max(blockingDoor.w, blockingDoor.h) && angleCos >= 0.4) {
            requestDoorOpen(blockingDoor, c, 'colonist');
            c.waitingForDoor = blockingDoor;
            c.doorWaitStart = c.t || 0;
            c.doorPassingThrough = null;
            const approachX = c.x - doorCenterX;
            const approachY = c.y - doorCenterY;
            c.doorApproachVector = { x: approachX, y: approachY };
            return false;
          }
        }
      }
    }

    // Hysteresis to avoid oscillation around a node
    const arriveNode = 15; // base arrival radius for nodes (increased from 10 to be more forgiving)
    const hysteresis = 6; // extra slack once we've been near a node (increased from 4)
    
    // Movement speed with terrain/floor modifiers
    let baseSpeed = c.speed * ((c as any).fatigueSlow || 1) * this.getMoveSpeedMultiplier(c);
    let speed = baseSpeed;
    let onPath = false;
    
    // Apply floor speed bonus based on terrain cost
    {
      const gx = Math.floor(c.x / T), gy = Math.floor(c.y / T);
      const inBounds = gx >= 0 && gy >= 0 && gx < this.grid.cols && gy < this.grid.rows;
      if (inBounds) {
        const idx = gy * this.grid.cols + gx;
        const tileCost = this.grid.cost[idx];
        
        // Speed is inversely proportional to cost
        // Cost of 1.0 (grass) = base speed
        // Cost of 0.5 (stone road) = 2x speed
        // Cost of 0.6 (dirt path) = 1.67x speed
        // Cost of 2.5 (mud) = 0.4x speed
        if (tileCost > 0 && tileCost < 1.0) {
          // On a fast surface (floor) - speed boost!
          speed = baseSpeed / tileCost;
          onPath = true;
        } else if (tileCost > 1.0) {
          // On slow terrain (mud, etc.) - speed penalty
          speed = baseSpeed / tileCost;
        }
        
        if (onPath && Math.random() < 0.01) { // 1% chance to log
          console.log(`Colonist at (${c.x.toFixed(1)}, ${c.y.toFixed(1)}) on floor - cost: ${tileCost.toFixed(2)}, speed: ${speed.toFixed(1)} (base: ${baseSpeed.toFixed(1)})`);
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

    if (c.doorPassingThrough) {
      const door = c.doorPassingThrough;
      const doorValid = door && door.kind === 'door' && door.done;
      if (!doorValid) {
        if (door && c.id) {
          releaseDoorQueue(door, c.id);
        }
        c.doorPassingThrough = null;
        c.doorApproachVector = null;
      } else {
        const centerX = door.x + door.w / 2;
        const centerY = door.y + door.h / 2;
        const relX = c.x - centerX;
        const relY = c.y - centerY;
        const relDist = Math.hypot(relX, relY);
        const approach = c.doorApproachVector;
        const clearance = Math.max(door.w, door.h) * 0.5;
        const farThreshold = clearance * 4;
        let shouldRelease = false;

        if (approach) {
          const approachMag = Math.hypot(approach.x, approach.y);
          if (approachMag > 1e-3) {
            const dot = relX * approach.x + relY * approach.y;
            const denom = approachMag * Math.max(relDist, 1e-3);
            const normalizedDot = dot / denom;
            const crossedPlane = normalizedDot <= -0.15;
            const overshoot = relDist > approachMag + clearance * 0.6;
            shouldRelease = (crossedPlane && relDist >= clearance * 0.6) || overshoot || relDist >= farThreshold;
          } else {
            shouldRelease = relDist >= clearance;
          }
        } else {
          shouldRelease = relDist >= clearance;
        }

        if (shouldRelease) {
          if (door && c.id) {
            releaseDoorQueue(door, c.id);
          }
          c.doorPassingThrough = null;
          c.doorApproachVector = null;
        }
      }
    }
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
  isNight() { return this.timeSystem.isNight(); }
  spawnWave() { const n = 4 + Math.floor(this.day * 1.3); for (let i = 0; i < n; i++) this.spawnEnemy(); this.msg(`Night ${this.day}: Enemies incoming!`, 'warn'); }
  nextDay() {
    // Day already incremented by TimeSystem
    (this as any).waveSpawnedForDay = false;
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
  const cap = this.getPopulationCap();
    if (tent && this.colonists.length < cap && this.RES.food >= 15) { this.RES.food -= 15; this.spawnColonist({ x: HQ_POS.x + rand(-20, 20), y: HQ_POS.y + rand(-20, 20) }); this.msg('A new colonist joined! (-15 food)', 'info'); }
    if (this.day > 20) { this.win(); }
  }

  // Update loop
  dayTick(dt: number) {
    const prevDay = this.timeSystem.getDay();
    this.timeSystem.update(dt);
    const newDay = this.timeSystem.getDay();
    
    // Day changed - handle day transition logic
    if (newDay > prevDay) {
      this.nextDay();
    }
    
    // Night started - spawn wave
    if (this.timeSystem.didNightJustStart()) { 
      // Check if enemy spawning is disabled via console command
      if (!(this as any).disableEnemySpawns) {
        this.spawnWave(); 
      }
    }

    // Daily-time continuous effects for colonists
    for (let i = this.colonists.length - 1; i >= 0; i--) {
      const c = this.colonists[i];
      if (!c.alive) {
        this.releaseSleepReservation(c);
        if (c.inside) this.leaveBuilding(c);
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
  keyPressed(k: string): boolean { 
    return this.inputManager.keyPressed(k);
  }
  update(dt: number) {
    // If debug console is open, ignore gameplay hotkeys (space, etc.)
    const dc = (this as any).debugConsole;
    const consoleOpen = !!(dc && dc.open);
    
    // Note: Work priority panel is now non-modal (like build menu), so it doesn't block input
    
    // Handle toggles even when paused
    if (!consoleOpen && this.keyPressed(' ')) { this.paused = !this.paused; const btn = document.getElementById('btnPause'); if (btn) btn.textContent = this.paused ? 'Resume' : 'Pause'; }
    if (!consoleOpen && this.keyPressed('h')) { const help = document.getElementById('help'); if (help) help.hidden = !help.hidden; }
  if (!consoleOpen && this.keyPressed('b')) { 
    // Toggle build tab
    this.uiManager.setHotbarTab(this.uiManager.activeHotbarTab === 'build' ? null : 'build');
  }
  if (!consoleOpen && this.keyPressed('p')) { 
    // Toggle work tab - this will automatically sync with the work priority panel
    this.uiManager.setHotbarTab(this.uiManager.activeHotbarTab === 'work' ? null : 'work');
  }
    if (!consoleOpen && this.keyPressed('g')) { this.debug.nav = !this.debug.nav; this.toast(this.debug.nav ? 'Debug: nav ON' : 'Debug: nav OFF'); }
    if (!consoleOpen && this.keyPressed('j')) { this.debug.colonists = !this.debug.colonists; this.toast(this.debug.colonists ? 'Debug: colonists ON' : 'Debug: colonists OFF'); }
    if (!consoleOpen && this.keyPressed('t')) { this.debug.terrain = !this.debug.terrain; this.toast(this.debug.terrain ? 'Debug: terrain ON' : 'Debug: terrain OFF'); }
    if (!consoleOpen && this.keyPressed('k')) { 
      this.debug.forceDesktopMode = !this.debug.forceDesktopMode; 
      this.toast(this.debug.forceDesktopMode ? 'Debug: Force Desktop Mode ON' : 'Debug: Force Desktop Mode OFF'); 
    }
    if (!consoleOpen && this.keyPressed('m')) {
      this.debug.performanceHUD = !this.debug.performanceHUD;
      togglePerformanceHUD();
      this.toast(this.debug.performanceHUD ? 'Performance HUD ON' : 'Performance HUD OFF');
    }
    
    // Render optimization toggles (for testing performance)
    if (!consoleOpen && this.keyPressed('1')) {
      this.renderManager.toggleWorldCache(!this.renderManager.useWorldCache);
      this.toast(this.renderManager.useWorldCache ? 'World Cache: ON (optimized)' : 'World Cache: OFF (legacy)');
    }
    if (!consoleOpen && this.keyPressed('2')) {
      this.renderManager.toggleColonistCache(!this.renderManager.useColonistCache);
      this.toast(this.renderManager.useColonistCache ? 'Colonist Cache: ON (optimized)' : 'Colonist Cache: OFF (legacy)');
    }
    if (!consoleOpen && this.keyPressed('3')) {
      this.renderManager.toggleParticleCache(!this.renderManager.useParticleSprites);
      this.toast(this.renderManager.useParticleSprites ? 'Particle Sprites: ON (optimized)' : 'Particle Sprites: OFF (legacy)');
    }
    
  if (!consoleOpen && this.keyPressed('escape')) { 
    // Close any open tabs/menus
    if (this.uiManager.activeHotbarTab) {
      this.uiManager.setHotbarTab(null); // This will also close the work priority panel if open
    } else if (this.selectedBuild) {
      this.selectedBuild = null; 
      this.toast('Build canceled');
    } else {
      this.selColonist = null; 
      this.follow = false;
    }
  }
    if (!consoleOpen && this.keyPressed('f')) { this.fastForward = (this.fastForward === 1 ? 6 : 1); this.toast(this.fastForward > 1 ? 'Fast-forward ON' : 'Fast-forward OFF'); }
    
    // Camera movement (works even when paused)
    const camSpd = 360 * dt / this.camera.zoom;
    if (this.keyState['w']) this.camera.y -= camSpd;
    if (this.keyState['s']) this.camera.y += camSpd;
    if (this.keyState['a']) this.camera.x -= camSpd;
    if (this.keyState['d']) this.camera.x += camSpd;
    if (this.keyState['+'] || this.keyState['=']) this.camera.zoom = Math.max(0.6, Math.min(2.2, this.camera.zoom * 1.02));
    if (this.keyState['-'] || this.keyState['_']) this.camera.zoom = Math.max(0.6, Math.min(2.2, this.camera.zoom / 1.02));
    
    // Update audio listener position for spatial audio (camera center)
    const vw = this.canvas.width / this.camera.zoom;
    const vh = this.canvas.height / this.camera.zoom;
    this.audioManager.setListenerPosition(
      this.camera.x + vw / 2,
      this.camera.y + vh / 2,
      this.camera.zoom
    );
    
    if (this.paused) return;
    
    // camera follow selected colonist
    if (this.follow && this.selColonist) {
      const c = this.selColonist; const vw = this.canvas.width / this.camera.zoom; const vh = this.canvas.height / this.camera.zoom;
      this.camera.x = clamp(c.x - vw / 2, 0, Math.max(0, WORLD.w - vw));
      this.camera.y = clamp(c.y - vh / 2, 0, Math.max(0, WORLD.h - vh));
    }
    this.dayTick(dt);
    
  // AI updates - track performance
  this.performanceMetrics.startTiming('ai');
  
  // Begin frame for adaptive tick rate system (use performance.now() for high-resolution timing)
  this.adaptiveTickRate.beginFrame(performance.now() / 1000);
  
  // Combat manager cleanup - remove dead references and expired cache
  this.combatManager.cleanup(performance.now() / 1000);
  
  // Colonist AI with adaptive tick rates
  for (const c of this.colonists) { 
    if (c.alive) {
      // Initialize health system for existing colonists (backward compatibility)
      if (!c.health) {
        initializeColonistHealth(c);
      }
      
      // Calculate importance based on multiple factors
      const importance = this.adaptiveTickRate.calculateImportance({
        entityX: c.x,
        entityY: c.y,
        cameraX: this.camera.x,
        cameraY: this.camera.y,
        cameraWidth: this.canvas.width / this.DPR,
        cameraHeight: this.canvas.height / this.DPR,
        cameraZoom: this.camera.zoom,
        isInCombat: (c as any).inCombat || (c.state as any) === 'fight',
        isSleeping: c.state === 'sleep',
        isStasis: false, // Could add stasis state later
        task: c.task || undefined,
        health: c.hp,
        maxHealth: 100 // Default max health
      });
      
      // Generate unique ID for colonist (use profile name + index for stability)
      const colonistId = `colonist_${c.profile?.name || 'unknown'}_${this.colonists.indexOf(c)}`;
      
      // IMPORTANT: Always update combat and movement for smooth visuals
      // Only throttle AI decision-making (FSM state changes, task selection, pathfinding)
      updateColonistCombat(this, c, dt * this.fastForward);
      
      // Update melee attack animation progress (always update for smooth animation)
      if (c.meleeAttackProgress !== undefined && c.meleeAttackProgress < 1) {
        c.meleeAttackProgress += (dt * this.fastForward) * 4; // Complete animation in ~0.25 seconds
        if (c.meleeAttackProgress >= 1) {
          c.meleeAttackProgress = undefined; // Clear when complete
          c.meleeAttackType = null;
        }
      }
      
      // Check if this colonist should do full AI update this frame
      if (this.adaptiveTickRate.shouldUpdate(colonistId, importance)) {
        // Full AI update: decision making, state transitions, task selection
        updateColonistFSM(this, c, dt * this.fastForward);
      } else {
        // Partial update: Skip AI decision-making, but still update:
        // - Health/needs progression
        // - Movement along existing path
        // - Animation/direction
        // This keeps colonists moving smoothly even when AI is throttled
        
        // Update time tracker
        if (!c.t) c.t = 0;
        c.t += dt * this.fastForward;
        
        // Continue movement if colonist has a path
        if (c.path && c.path.length > 0) {
          // Use the existing moveAlongPath function to continue movement
          this.moveAlongPath(c, dt * this.fastForward);
        }
      }
    } 
  }
  
  // Enemy AI with adaptive tick rates
  for (let i = this.enemies.length - 1; i >= 0; i--) { 
    const e = this.enemies[i];
    
    // Calculate importance for enemy
    const importance = this.adaptiveTickRate.calculateImportance({
      entityX: e.x,
      entityY: e.y,
      cameraX: this.camera.x,
      cameraY: this.camera.y,
      cameraWidth: this.canvas.width / this.DPR,
      cameraHeight: this.canvas.height / this.DPR,
      cameraZoom: this.camera.zoom,
      isInCombat: true, // Enemies are always considered in combat
      isSleeping: false,
      isStasis: false,
      health: e.hp,
      maxHealth: 100 // Default enemy max health
    });
    
    const enemyId = `enemy_${i}`;
    
    // Always update enemy FSM for now (enemies are typically in combat/visible)
    // Enemy movement is simpler and handled within their FSM
    if (this.adaptiveTickRate.shouldUpdate(enemyId, importance)) {
      updateEnemyFSM(this, e, dt * this.fastForward);
    }
    
    // Clean up dead enemies
    if (e.hp <= 0) { 
      this.enemies.splice(i, 1); 
      if (Math.random() < .5) this.RES.food += 1;
      this.adaptiveTickRate.removeEntity(enemyId);
    }
  }
  
  this.performanceMetrics.endTiming('colonist & enemy AI');
  
    for (const b of this.buildings) {
      if (b.kind === 'turret' && b.done) this.updateTurret(b, dt * this.fastForward);
      
      // Door updates
      if (b.kind === 'door' && b.done) {
        updateDoor(b, dt * this.fastForward, this.tDay);
      }
      
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
    
    // Update RimWorld floor item/stockpile systems
    if (this.rimWorld) this.rimWorld.update();

    // Process queued navmesh rebuilds at END of frame (deferred rebuild system)
    this.deferredRebuildSystem.processQueue();
  }

  /**
   * Main render loop - delegates to RenderManager
   */
  draw() {
    // Mark dirty regions for all moving/changing entities before rendering
    this.markDirtyRegions();
    this.renderManager.render();
  }
  
  /**
   * Mark dirty regions for entities that have moved or changed
   * This allows selective rendering of only changed areas
   */
  private markDirtyRegions(): void {
    const { dirtyRectTracker, camera } = this;
    const camZoom = camera.zoom;
    
    // Convert world coordinates to screen coordinates
    const worldToScreen = (wx: number, wy: number) => {
      return {
        sx: (wx - camera.x) * camZoom,
        sy: (wy - camera.y) * camZoom
      };
    };
    
    // Mark colonists as dirty (they move frequently)
    for (const c of this.colonists) {
      if (!c.alive) continue;
      const { sx, sy } = worldToScreen(c.x, c.y);
      // Mark a larger area for colonist + mood indicator + debug info
      const padding = 60; // Account for sprite size and UI elements
      dirtyRectTracker.markDirty(sx - padding, sy - padding, padding * 2, padding * 2);
    }
    
    // Mark enemies as dirty (they move frequently)
    for (const e of this.enemies) {
      const { sx, sy } = worldToScreen(e.x, e.y);
      const padding = 40;
      dirtyRectTracker.markDirty(sx - padding, sy - padding, padding * 2, padding * 2);
    }
    
    // Mark bullets as dirty (they move every frame)
    for (const b of this.bullets) {
      const { sx, sy } = worldToScreen(b.x, b.y);
      dirtyRectTracker.markDirty(sx - 10, sy - 10, 20, 20);
    }
    
    // Mark particles as dirty (they animate every frame)
    for (const p of this.particles) {
      const { sx, sy } = worldToScreen(p.x, p.y);
      const size = p.size || 5;
      dirtyRectTracker.markDirty(sx - size, sy - size, size * 2, size * 2);
    }
    
    // Mark buildings under construction as dirty (progress bar changes)
    for (const b of this.buildings) {
      if (!b.done || (b.hp < 100)) {
        const { sx, sy } = worldToScreen(b.x, b.y);
        const w = b.w * camZoom;
        const h = b.h * camZoom;
        dirtyRectTracker.markDirty(sx - 5, sy - 10, w + 10, h + 20);
      }
    }
    
    // For first few frames or when camera moves significantly, mark full redraw
    // This handles cases like camera pan, zoom, or initial render
    if (!this.lastCameraX || !this.lastCameraY || !this.lastCameraZoom ||
        Math.abs(camera.x - this.lastCameraX) > 5 ||
        Math.abs(camera.y - this.lastCameraY) > 5 ||
        Math.abs(camera.zoom - this.lastCameraZoom) > 0.01) {
      dirtyRectTracker.markFullRedraw();
    }
    
    // Store camera position for next frame
    this.lastCameraX = camera.x;
    this.lastCameraY = camera.y;
    this.lastCameraZoom = camera.zoom;
  }
  
  // Track last camera position to detect movement
  private lastCameraX?: number;
  private lastCameraY?: number;
  private lastCameraZoom?: number;

  costText(c: Partial<typeof this.RES>) { const parts: string[] = []; if (c.wood) parts.push(`${c.wood}w`); if (c.stone) parts.push(`${c.stone}s`); if (c.food) parts.push(`${c.food}f`); return parts.join(' '); }

  // Performance logging interval
  private lastPerfLog = 0;
  private readonly PERF_LOG_INTERVAL = 5000; // 5 seconds

  // Loop - Fixed timestep simulation with interpolated rendering
  last = performance.now();
  frame = (now: number) => {
    const frameStart = performance.now();
    
    // Determine how many simulation steps to run
    const steps = this.simulationClock.tick(now);
    
    // Run simulation steps (fixed timestep)
    for (let i = 0; i < steps; i++) {
      this.performanceMetrics.startTiming('other');
      this.simulationClock.runSimulationStep((dt) => {
        this.update(dt);
      });
      this.performanceMetrics.endTiming();
    }
    
    // Always render (interpolated)
    this.performanceMetrics.startTiming('render');
    this.draw();
    this.performanceMetrics.endTiming();
    
    // Track frame completion
    const frameTime = performance.now() - frameStart;
    this.performanceMetrics.endFrame(frameTime);
    this.simulationClock.recordRenderFrame();
    
    // Periodic performance logging
    if (now - this.lastPerfLog >= this.PERF_LOG_INTERVAL) {
      console.log(this.performanceMetrics.getSummary());
      this.lastPerfLog = now;
    }
    
    requestAnimationFrame(this.frame);
  };

  // Win/Lose
  win() { this.paused = true; this.msg('You survived! Day 20 reached.', 'good'); alert('You survived to Day 20 — victory!'); }
  lose() { this.paused = true; this.msg('HQ destroyed. Colony fell.', 'bad'); alert('Your HQ was destroyed. Game over.'); }

  // Pathfinding grid and helpers
  grid = makeGrid();
  terrainGrid: TerrainGrid = makeTerrainGrid(this.grid.cols, this.grid.rows);
  
  // Navigation delegation to NavigationManager
  rebuildNavGrid() { 
    // Queue rebuild instead of doing it immediately
    this.deferredRebuildSystem.requestFullRebuild();
  }
  rebuildNavGridImmediate() {
    // For cases that need immediate rebuild (rare)
    this.navigationManager.rebuildNavGrid();
  }
  syncTerrainToGrid() { this.navigationManager.syncTerrainToGrid(); }
  
  /**
   * Synchronous pathfinding - direct computation
   */
  computePath(sx: number, sy: number, tx: number, ty: number) { 
    this.performanceMetrics.startTiming('pathfinding');
    const result = this.navigationManager.computePath(sx, sy, tx, ty);
    this.performanceMetrics.endTiming('pathfinding');
    return result;
  }
  
  computePathWithDangerAvoidance(c: Colonist, sx: number, sy: number, tx: number, ty: number) { 
    this.performanceMetrics.startTiming('pathfinding');
    const result = this.navigationManager.computePathWithDangerAvoidance(c, sx, sy, tx, ty);
    this.performanceMetrics.endTiming('danger-avoid path');
    return result;
  }
  
  
  
  // Navigation delegation helpers
  private cellIndexAt(x: number, y: number) { return this.navigationManager.cellIndexAt(x, y); }
  isBlocked(x: number, y: number) { return this.navigationManager.isBlocked(x, y); }
  isWithinInteractionRange(x: number, y: number, circle: { x: number; y: number; r: number }, interactDistance: number) { return this.navigationManager.isWithinInteractionRange(x, y, circle, interactDistance); }
  bestApproachToCircle(c: Colonist, circle: { x: number; y: number; r: number }, interact: number) { return this.navigationManager.bestApproachToCircle(c, circle, interact); }  // UI: colonist profile panel moved to src/game/ui/colonistProfile.ts


  // Context menu rendering moved to src/game/ui/contextMenu.ts

  handleContextMenuAction(actionId: string, colonist: Colonist) {
    console.log(`Context menu action: ${actionId} for colonist:`, colonist.profile?.name);
    
    switch (actionId) {
      // Draft/Undraft
      case 'draft':
        if (colonist.isDrafted) {
          // Undraft
          colonist.isDrafted = false;
          colonist.draftedTarget = null;
          colonist.draftedPosition = null;
          this.msg(`${colonist.profile?.name || 'Colonist'} undrafted`, 'info');
        } else {
          // Draft
          colonist.isDrafted = true;
          colonist.draftedTarget = null;
          colonist.draftedPosition = null;
          
          // Force clear any existing tasks/paths to allow immediate control
          colonist.task = null;
          colonist.target = null;
          colonist.path = undefined;
          colonist.pathIndex = undefined;
          colonist.pathGoal = undefined;
          
          // Force state change to drafted (will be picked up by FSM)
          colonist.state = 'drafted';
          colonist.stateSince = 0;
          
          this.msg(`${colonist.profile?.name || 'Colonist'} drafted for combat`, 'info');
        }
        break;
        
      // Prioritize actions
      case 'prioritize_medical':
        // Set high priority for medical work
        this.setColonistMedicalPriority(colonist, true);
        this.msg(`${colonist.profile?.name || 'Colonist'} prioritizing medical work`, 'info');
        break;
      case 'prioritize_work':
        this.setTask(colonist, 'work', this.findNearestWorkTarget(colonist), { isPlayerCommand: true });
        this.msg(`${colonist.profile?.name || 'Colonist'} prioritizing work tasks`, 'info');
        break;
      case 'prioritize_build':
        this.setTask(colonist, 'build', this.findNearestBuildTarget(colonist), { isPlayerCommand: true });
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
        this.forceColonistToRest(colonist, true);
        break;
      case 'force_eat':
        this.forceColonistToEat(colonist, true);
        break;
      case 'force_work':
        this.setTask(colonist, 'work', this.findNearestWorkTarget(colonist), { isPlayerCommand: true });
        this.msg(`${colonist.profile?.name || 'Colonist'} forced to work`, 'info');
        break;
      case 'force_guard':
        this.setTask(colonist, 'guard', { x: colonist.x, y: colonist.y }, { isPlayerCommand: true });
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
      case 'medical_bandage': // keep existing single bandage behavior fallback
        this.assignMedicalTreatment(colonist, 'bandage_wound');
        break;
      case 'medical_treat_infection':
        this.assignMedicalTreatment(colonist, 'treat_infection');
        break;
      case 'medical_surgery':
        this.assignMedicalTreatment(colonist, 'remove_bullet');
        break;
      case 'medical_pain_relief':
        this.assignMedicalTreatment(colonist, 'pain_management');
        break;
      case 'medical_treat_all':
        this.assignComprehensiveMedicalCare(colonist);
        break;
      case 'medical_treat':
        this.treatColonist(colonist);
        break;
      case 'medical_rest':
        this.forceColonistToRest(colonist);
        this.msg(`${colonist.profile?.name || 'Colonist'} ordered to bed rest`, 'info');
        break;
      case 'medical_injury_summary':
        if (colonist.health) {
          const summary = getInjurySummary(colonist.health);
          this.msg(`${colonist.profile?.name || 'Colonist'}: ${summary}`, 'info');
        } else {
          this.msg('No health data', 'warn');
        }
        break;
      case 'medical_bandage_all_bleeding':
        if (colonist.health) {
          let count = 0;
            for (const inj of colonist.health.injuries) {
              if (inj.bleeding > 0 && !inj.bandaged) { inj.bandaged = true; inj.bleeding *= 0.2; inj.infectionChance *= 0.5; count++; }
            }
          this.msg(count ? `Applied bandages to ${count} wound${count>1?'s':''}` : 'No bleeding wounds', count? 'good':'info');
        }
        break;
      case 'prioritize_treat_patient': {
        // Active selection is doctor; colonist param is patient
        const doctor = this.selColonist;
        if (doctor && doctor !== colonist) {
          // Ensure doctor has some medical capability (placeholder skill check)
            (doctor as any).assignedMedicalPatientId = (colonist as any).id || ((colonist as any).id = `colonist_${Date.now()}_${Math.random().toString(36).slice(2,9)}`);
            (doctor as any).medicalPriorityUntil = doctor.t + 60; // expires in ~60s game time
            this.msg(`${doctor.profile?.name || 'Doctor'} will prioritize treating ${colonist.profile?.name || 'Patient'}`, 'info');
        }
        break; }
      case 'clear_prioritize_treat': {
        const doctor = this.selColonist;
        if (doctor && (doctor as any).assignedMedicalPatientId) {
          (doctor as any).assignedMedicalPatientId = undefined;
          (doctor as any).medicalPriorityUntil = undefined;
          this.msg(`${doctor.profile?.name || 'Doctor'} cleared treatment priority`, 'info');
        }
        break; }
      case 'medical_rescue':
        // Find best doctor or nearest healthy colonist to rescue
        const rescuer = this.findBestDoctor(colonist) || this.colonists.find(c=>c!==colonist && c.alive && c.state!=='downed');
        if (rescuer) {
          // Placeholder: just move colonist to nearest bed instantly for now
          const bed = this.findBestRestBuilding(colonist, { preferMedical: true, allowShelterFallback: true });
          if (bed) {
            colonist.x = bed.x + bed.w/2;
            colonist.y = bed.y + bed.h/2;
            const bedLabel = bed.kind === 'bed' ? (bed.isMedicalBed ? 'medical bed' : 'bed') : bed.name || 'shelter';
            this.msg(`${colonist.profile?.name || 'Colonist'} rescued to ${bedLabel}`, bed.isMedicalBed ? 'good' : 'info');
          } else {
            this.msg('No bed available for rescue', 'warn');
          }
        } else {
          this.msg('No rescuer available', 'warn');
        }
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

  colonistNeedsMedicalBed(colonist: Colonist): boolean {
    if (colonist.state === 'downed') return true;
    if (colonist.hp < 60) return true;
    const injuries = colonist.health?.injuries ?? [];
    return injuries.some((inj) => inj.bleeding > 0 || inj.severity > 0.25 || inj.infected);
  }

  findBestRestBuilding(colonist: Colonist, opts?: { requireMedical?: boolean; preferMedical?: boolean; allowShelterFallback?: boolean }): Building | null {
    const { requireMedical = false, preferMedical = false, allowShelterFallback = true } = opts || {};
    const beds = this.buildings.filter((b) => b.kind === 'bed' && b.done && this.buildingHasSpace(b, colonist));
    const medicalBeds = beds.filter((b) => b.isMedicalBed);
    const standardBeds = beds.filter((b) => !b.isMedicalBed);

    const orderedBeds: Building[] = [];
    if (requireMedical) {
      orderedBeds.push(...medicalBeds);
    } else if (preferMedical && medicalBeds.length > 0) {
      orderedBeds.push(...medicalBeds, ...standardBeds);
    } else {
      orderedBeds.push(...standardBeds, ...medicalBeds);
    }

    const nearestFrom = (list: Building[]): Building | null => {
      let best: Building | null = null;
      let bestDist = Infinity;
      for (const b of list) {
        const c = this.centerOf(b);
        const d = Math.hypot(c.x - colonist.x, c.y - colonist.y);
        if (d < bestDist) {
          bestDist = d;
          best = b;
        }
      }
      return best;
    };

    const bed = nearestFrom(orderedBeds);
    if (bed) return bed;

    if (!allowShelterFallback) return null;

    const shelters = this.buildings.filter((b) =>
      (b.kind === 'house' || b.kind === 'tent' || b.kind === 'hq' || b.kind === 'infirmary') &&
      b.done &&
      this.buildingHasSpace(b, colonist)
    );

    return nearestFrom(shelters);
  }

  forceColonistToRest(colonist: Colonist, isPlayerCommand = false) {
    const needsMedical = this.colonistNeedsMedicalBed(colonist);
    const restBuilding = this.findBestRestBuilding(colonist, { preferMedical: needsMedical, allowShelterFallback: true });
    
    if (restBuilding) {
      this.setTask(colonist, 'rest', restBuilding, { isPlayerCommand });
      const targetLabel = restBuilding.kind === 'bed' ? (restBuilding.isMedicalBed ? 'medical bed' : 'bed') : restBuilding.name || restBuilding.kind;
      this.msg(`${colonist.profile?.name || 'Colonist'} going to ${targetLabel}`, needsMedical ? 'info' : 'info');
    } else {
      this.msg('No available sleeping quarters', 'warn');
    }
  }

  forceColonistToEat(colonist: Colonist, isPlayerCommand = false) {
    if (this.RES.food > 0) {
      // Mark as player command if forced by player
      if (isPlayerCommand) {
        colonist.playerCommand = {
          issued: true,
          timestamp: colonist.t || 0,
          task: 'eat',
          expires: (colonist.t || 0) + 60 // Eating command expires after 1 minute
        };
      }
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
    const preferMedical = this.colonistNeedsMedicalBed(colonist);
    const bed = this.findBestRestBuilding(colonist, { preferMedical, allowShelterFallback: true });

    if (bed) {
      this.setTask(colonist, 'rest', bed);
      const label = bed.kind === 'bed' ? (bed.isMedicalBed ? 'medical bed' : 'bed') : 'shelter';
      this.msg(`${colonist.profile?.name || 'Colonist'} going to ${label}`, 'info');
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
      if (colonist.health) {
        const result = basicFieldTreatment(colonist.health);
        colonist.hp = Math.min(100, calculateOverallHealth(colonist.health));
        this.msg(`${colonist.profile?.name || 'Colonist'} field-treated (${result.bandaged} bandaged, pain -${result.painReduced.toFixed(2)})`, 'good');
      } else {
        colonist.hp = Math.min(100, colonist.hp + 10);
        this.msg(`${colonist.profile?.name || 'Colonist'} received crude aid`, 'info');
      }
    }
  }

  // Set colonist medical priority
  setColonistMedicalPriority(colonist: Colonist, highPriority: boolean) {
    (colonist as any).medicalPriority = highPriority;
    if (highPriority) {
      // Clear current task to seek medical work
      this.setTask(colonist, 'seekMedical', null);
    }
  }

  // Assign specific medical treatment
  assignMedicalTreatment(patient: Colonist, treatmentId: string) {
    // Find a suitable doctor
    const doctor = this.findBestDoctor(patient);
    if (!doctor) {
      this.msg(`No available doctor for treatment`, 'warn');
      return;
    }
    
    const job = medicalWorkGiver.createForcedJob(doctor, patient, treatmentId);
    if (job) {
      // Reserve the job and assign it to the doctor
      medicalWorkGiver.reserveJob(job, doctor);
      (doctor as any).medicalJob = job;
      
      // Force the doctor into doctoring state immediately
      // Clear their current task and path
      doctor.task = null;
      doctor.target = null;
      this.clearPath(doctor);
      
      // The FSM will pick up the medicalJob on next update and enter doctoring state
      this.msg(`${doctor.profile?.name || 'Doctor'} treating ${patient.profile?.name || 'patient'} with ${job.treatment?.name || 'treatment'}`, 'info');
    } else {
      this.msg(`Cannot apply ${treatmentId} treatment`, 'warn');
    }
  }

  // Assign comprehensive medical care
  assignComprehensiveMedicalCare(patient: Colonist) {
    if (!patient.health?.injuries?.length) {
      this.msg(`${patient.profile?.name || 'Colonist'} has no injuries to treat`, 'info');
      return;
    }

    // Find most urgent injury and create a forced job for it
    const doctor = this.findBestDoctor(patient);
    if (!doctor) {
      this.msg('No available doctor for comprehensive care', 'warn');
      return;
    }

    // Prioritize most severe/urgent injury first
    const sortedInjuries = [...patient.health.injuries].sort((a, b) => {
      // Bleeding + severity combo
      const urgencyA = (a.bleeding || 0) * 2 + (a.severity || 0);
      const urgencyB = (b.bleeding || 0) * 2 + (b.severity || 0);
      return urgencyB - urgencyA;
    });

    const mostUrgentInjury = sortedInjuries[0];
    
    // Determine best treatment for this injury
    let treatmentId = 'bandage_wound';
    if (mostUrgentInjury.infected) {
      treatmentId = 'treat_infection';
    } else if (mostUrgentInjury.type === 'gunshot') {
      treatmentId = 'surgical_repair';
    } else if (mostUrgentInjury.bleeding > 0) {
      treatmentId = 'bandage_wound';
    } else if (mostUrgentInjury.severity > 0.6) {
      treatmentId = 'advanced_treatment';
    }

    // Create forced job for the most urgent injury
    const job = medicalWorkGiver.createForcedJob(doctor, patient, treatmentId);
    if (job) {
      medicalWorkGiver.reserveJob(job, doctor);
      (doctor as any).medicalJob = job;
      
      // Clear doctor's current task
      doctor.task = null;
      doctor.target = null;
      this.clearPath(doctor);
      
      this.msg(`${doctor.profile?.name || 'Doctor'} providing comprehensive care to ${patient.profile?.name || 'patient'}`, 'info');
    } else {
      this.msg('Failed to create medical job', 'warn');
    }
  }

  // Find the best available doctor
  findBestDoctor(patient: Colonist): Colonist | null {
    const availableDoctors = this.colonists.filter(c => {
      if (c === patient) return false; // Can't treat self
      if (!c.alive) return false;
      if (c.task && c.task !== 'idle' && c.task !== 'seekTask') return false; // Must be available
      return true;
    });

    if (availableDoctors.length === 0) return null;

    // Sort by medical skill (prioritize medics and those with First Aid)
    availableDoctors.sort((a, b) => {
      const skillA = this.getColonistMedicalSkill(a);
      const skillB = this.getColonistMedicalSkill(b);
      return skillB - skillA;
    });

    return availableDoctors[0];
  }

  // Get colonist's medical skill level
  getColonistMedicalSkill(colonist: Colonist): number {
    const firstAidSkill = colonist.profile?.detailedInfo.skills.includes('First Aid');
    const medicBackground = colonist.profile?.background === 'Medic';
    
    let skill = 0;
    if (firstAidSkill) skill += 3;
    if (medicBackground) skill += 5;
    
    return skill;
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
    const target = this.longPressTarget;
    const isBuildingTarget = this.longPressTargetType === 'building';
    const worldPos = isBuildingTarget && target
      ? this.centerOf(target as Building)
      : { x: (target as Colonist).x, y: (target as Colonist).y };

    const screenX = (worldPos.x - this.camera.x) * this.camera.zoom;
    const screenY = (worldPos.y - this.camera.y) * this.camera.zoom;
    
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
    // Push the bar further right: use measured label width + padding, but keep a sensible minimum
    const measured = ctx.measureText(label).width; 
    const labelWidth = Math.max(this.scale(86), measured + this.scale(14));
    
    ctx.fillStyle = '#0f172a'; 
    ctx.fillRect(x + labelWidth, y - this.scale(8), w, h); 
    ctx.strokeStyle = '#1e293b'; 
    ctx.strokeRect(x + labelWidth + .5, y - this.scale(8) + .5, w - 1, h - 1);
    ctx.fillStyle = color; 
    ctx.fillRect(x + labelWidth + this.scale(2), y - this.scale(6), Math.max(0, Math.min(w - this.scale(4), (val / 100) * (w - this.scale(4)))), h - this.scale(4));
  }

  // Build and placement UI moved to src/game/ui
}
