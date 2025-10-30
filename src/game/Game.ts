//Game.ts is really just the kid who eats paste, this script just keeps accumulating more and more code instead of putting things in the right place. 
// Lots of stuff should be moved to appropriate managers/systems UGHHHHHHHHHH!!!!
// UPDATE 2025: The Great Paste-Eating Intervention has begun! Health calculations extracted to HealthManager! 🎨✨
import { clamp, dist2, rand, randi } from "../core/utils";
import { makeGrid } from "../core/pathfinding";
import { makeTerrainGrid, type TerrainGrid, generateMountains, getTerrainTypeId, getTerrainTypeFromId, TerrainType, isMountainTile, mineMountainTile, type OreType, ORE_PROPERTIES } from "./terrain";
import { COLORS, HQ_POS, NIGHT_SPAN, T, WORLD } from "./constants";
import type { Building, Bullet, Camera, Colonist, ColonistCommandIntent, Enemy, Message, Resources, Particle, MiningZone } from "./types";
import type { ContextMenuDescriptor, ContextMenuItem } from "./ui/contextMenus/types";
import { BUILD_TYPES, hasCost } from "./buildings";
import { getZoneDef } from "./zones";
import { HealthManager } from "./managers/HealthManager";
import { InventoryManager } from "./managers/InventoryManager";
import { ResearchManager } from "./research/ResearchManager";
import { ResearchUI } from "./ui/dom/ResearchUI";
import { applyWorldTransform, clear, drawBuilding, drawBullets, drawCircle, drawGround, drawFloors, drawHUD, drawPoly, drawPersonIcon, drawShieldIcon, drawColonistAvatar } from "./render";
import { WorkGiverManager } from './systems/workGiverManager';
import { ReservationManager } from './managers/ReservationManager';
import { TaskManager } from './managers/TaskManager';
import { MedicalManager } from './managers/MedicalManager';
import { BuildingManager } from './managers/BuildingManager';
import { ColonistActionManager } from './managers/ColonistActionManager';
import { ColonistNavigationManager } from './managers/ColonistNavigationManager';
import { createEnemyWithProfile } from './enemy_systems/enemyGenerator';
import { drawTerrainDebug } from "./render/debug/terrainDebugRender";
import { updateColonistFSM } from "./colonist_systems/colonistFSM";
import { updateEnemyFSM } from "../ai/enemyFSM";
import { drawBuildMenu as drawBuildMenuUI, handleBuildMenuClick as handleBuildMenuClickUI } from "./ui/buildMenu";
import { handleHotbarClick } from "./ui/hud/modernHotbar";
import { handleBuildMenuClick as handleModernBuildMenuClick } from "./ui/hud/modernBuildMenu";
import { handleControlPanelClick } from "./ui/hud/controlPanel";
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
import { GameOverScreen } from './ui/GameOverScreen';
import { TutorialSystem } from './ui/TutorialSystem';
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
import { ItemManager, type ItemManagerConfig } from './managers/ItemManager';
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
  
  // Game over screen
  gameOverScreen = new GameOverScreen(this);
  
  // Tutorial system
  tutorialSystem = new TutorialSystem(this);
  
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
  private skipNextTapAfterLongPress = false;
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
  
  get deadColonists(): Colonist[] { return this.state.deadColonists; }
  
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
  
  // Mining zones for designating areas to mine
  miningZones: MiningZone[] = [];
  
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
  public workGiverManager = new WorkGiverManager();
  public reservationManager = new ReservationManager();
  public taskManager!: TaskManager; // Initialized in constructor after this is fully constructed
  public itemManager: ItemManager;
  public healthManager = new HealthManager(); // Stop eating health paste! Delegate properly! 🎨
  public inventoryManager = new InventoryManager(); // Equipment and item management - no more paste-eating! 🍝
  public researchManager!: ResearchManager; // Research system - technology progression
  public researchUI!: ResearchUI; // Research UI panel
  
  // New manager architecture refactor managers
  public medicalManager!: MedicalManager; // Medical care and treatment coordination
  public buildingManager!: BuildingManager; // Building queries and operations
  public colonistActionManager!: ColonistActionManager; // Colonist actions and commands
  public colonistNavigationManager!: ColonistNavigationManager; // Colonist movement and navigation

  // UI Click Regions (populated during render)
  public modernHotbarRects?: import('./ui/hud/modernHotbar').HotbarTabRect[];
  public controlPanelRects?: import('./ui/hud/controlPanel').ControlPanelRect[];
  public modernBuildMenuRects?: any; // TODO: Add proper type for build menu rects

  // Zoom Overlay System (for highlighting entities when fully zoomed out)
  public zoomOverlayActive = false;
  public zoomOverlayTimer: number | null = null;
  private static readonly ZOOM_OVERLAY_DELAY = 1000; // 1 second delay
  private static readonly MIN_ZOOM_FOR_OVERLAY = 0.65; // Slightly above minimum zoom to trigger

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('no ctx');
    this.canvas = canvas; this.ctx = ctx;
    this.DPR = Math.max(1, Math.min(2, (window as any).devicePixelRatio || 1));
  this.handleResize();
    
    // Initialize dirty rect tracker with canvas dimensions
    this.dirtyRectTracker = new DirtyRectTracker(canvas.width, canvas.height);
    
    // Initialize task manager (requires reservationManager to be constructed)
    this.taskManager = new TaskManager(this, this.reservationManager);
    
    window.addEventListener('resize', () => this.handleResize());
    this.bindInput();
    
    // Initialize item database BEFORE newGame() (needed for stockpile creation)
    itemDatabase.loadItems();
    
    // Initialize floor item + stockpile system BEFORE newGame() (needed for initial stockpiles)
    this.itemManager = new ItemManager({
      canvas: this.canvas,
      enableAutoHauling: false, // We'll drive hauling via our WorkGiver so it fits FSM
      defaultStockpileSize: this.defaultStockpileSize
    } as ItemManagerConfig);
    
    // Now call newGame() - it will create initial stockpile zones
    this.newGame();
    
    // Link terrain grid to pathfinding grid
    this.grid.terrainGrid = this.terrainGrid;
    
    // Sync terrain costs to pathfinding grid (all grass initially)
    this.syncTerrainToGrid();
    
    this.rebuildNavGridImmediate(); // Use immediate rebuild during initialization
    
    // Initialize systems with starting resources and time
    this.resourceSystem.reset(); // Sets starting resources
    this.timeSystem.reset(); // Sets day 1, tDay 0
    
    // Initialize research system
    this.researchManager = new ResearchManager();
    this.researchUI = new ResearchUI(this.researchManager, this);
    
    // Initialize new managers (refactor)
    this.medicalManager = new MedicalManager(this);
    this.buildingManager = new BuildingManager(this);
    this.colonistActionManager = new ColonistActionManager(this);
    this.colonistNavigationManager = new ColonistNavigationManager(this);
    
    // Initialize camera system
    this.cameraSystem.setCanvasDimensions(this.canvas.width, this.canvas.height, this.DPR);
    this.cameraSystem.setZoom(1);
  this.cameraSystem.centerOn(HQ_POS.x, HQ_POS.y);
    
    this.clampCameraToWorld();
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

  // ===== Inventory & Equipment System - NOW PROPERLY DELEGATED! =====
  // Previously more paste-eating behavior (Game.ts lines 395-555).
  // Now we delegate to InventoryManager - no more eating inventory paste! 🍝✨
  
  /** Get equipped items - DELEGATED to InventoryManager so all this needs to be refactored and then moved*/
  private getEquippedItems(c: Colonist) {
    return this.inventoryManager.getEquippedItems(c);
  }

  /** Movement speed multiplier from equipment - DELEGATED to InventoryManager */
  getMoveSpeedMultiplier(c: Colonist): number {
    return this.inventoryManager.getMoveSpeedMultiplier(c);
  }

  /** Work speed multiplier from tools/equipment - DELEGATED to InventoryManager */
  getWorkSpeedMultiplier(c: Colonist, workType: 'Construction' | 'Woodcutting' | 'Mining' | 'Farming' | 'Harvest' | string): number {
    return this.inventoryManager.getWorkSpeedMultiplier(c, workType);
  }

  /** Armor damage reduction - DELEGATED to InventoryManager */
  getArmorReduction(c: Colonist): number {
    return this.inventoryManager.getArmorReduction(c);
  }

  /** Try to consume food from inventory - DELEGATED to InventoryManager */
  tryConsumeInventoryFood(c: Colonist): boolean {
    return this.inventoryManager.tryConsumeInventoryFood(c, this.msg.bind(this));
  }

  /** Recalculate inventory weight - DELEGATED to InventoryManager */
  recalcInventoryWeight(c: Colonist) {
    this.inventoryManager.recalculateInventoryWeight(c);
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

  // ===== Health System - NOW PROPERLY DELEGATED! =====
  // Previously this was egregious paste-eating behavior (Game.ts lines 483-578).
  // Now we properly pass the paste to HealthManager like responsible adults! 🎨✨
  
  /** Calculate pain from damage - DELEGATED to HealthManager */
  private calculatePainFromDamage(damageType: string, severity: number): number {
    return this.healthManager.calculatePainFromDamage(damageType, severity);
  }

  /** Calculate bleeding from damage - DELEGATED to HealthManager */
  private calculateBleedingFromDamage(damageType: string, severity: number): number {
    return this.healthManager.calculateBleedingFromDamage(damageType, severity);
  }

  /** Calculate heal rate - DELEGATED to HealthManager */
  private calculateHealRate(damageType: string, severity: number): number {
    return this.healthManager.calculateHealRate(damageType, severity);
  }

  /** Calculate infection chance - DELEGATED to HealthManager */
  private calculateInfectionChance(damageType: string, severity: number): number {
    return this.healthManager.calculateInfectionChance(damageType, severity);
  }

  /** Generate injury description - DELEGATED to HealthManager */
  private generateInjuryDescription(damageType: string, bodyPart: string, severity: number): string {
    return this.healthManager.generateInjuryDescription(damageType, bodyPart, severity);
  }

  /** Recalculate colonist health stats - DELEGATED to HealthManager */
  private recalculateColonistHealth(colonist: Colonist): void {
    this.healthManager.recalculateColonistHealth(colonist);
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
    
    // Validate input coordinates
    if (typeof start.x !== 'number' || typeof start.y !== 'number' ||
        typeof end.x !== 'number' || typeof end.y !== 'number') {
      console.error('Invalid coordinates in computeStockpileRect:', { start, end });
      return null;
    }

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
    if (!this.itemManager) { return false; }
    const rect = this.computeStockpileRect(start, end, allowTapShortcut);
    if (!rect) { return false; }

    this.itemManager.createStockpileZone(rect.x, rect.y, rect.width, rect.height, 'Stockpile');
    this.msg('Stockpile created', 'good');
    return true;
  }

  private finalizeMiningZoneDrag(start: { x: number; y: number } | null, end: { x: number; y: number } | null, allowTapShortcut = false): boolean {
    try {
      const rect = this.computeStockpileRect(start, end, allowTapShortcut);
      if (!rect) { return false; }

      // Validate rect properties
      if (typeof rect.x !== 'number' || typeof rect.y !== 'number' || 
          typeof rect.width !== 'number' || typeof rect.height !== 'number') {
        console.error('Invalid rect properties in finalizeMiningZoneDrag:', rect);
        return false;
      }

      // Create a new mining zone
      const miningZone: MiningZone = {
        id: `mine_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        x: rect.x,
        y: rect.y,
        w: rect.width,
        h: rect.height,
        color: '#f59e0b' // Orange color
      };
      
      if (!this.miningZones) {
        this.miningZones = [];
      }
      
      this.miningZones.push(miningZone);
      this.msg('Mining zone created', 'good');
      return true;
    } catch (error) {
      console.error('Error in finalizeMiningZoneDrag:', error);
      return false;
    }
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

  private updateZoomOverlay(): void {
    const isFullyZoomedOut = this.camera.zoom <= Game.MIN_ZOOM_FOR_OVERLAY;
    
    if (isFullyZoomedOut && !this.zoomOverlayActive && !this.zoomOverlayTimer) {
      // Start timer to show overlay after delay
      this.zoomOverlayTimer = window.setTimeout(() => {
        this.zoomOverlayActive = true;
        this.zoomOverlayTimer = null;
      }, Game.ZOOM_OVERLAY_DELAY);
    } else if (!isFullyZoomedOut) {
      // Hide overlay immediately when zooming in
      this.zoomOverlayActive = false;
      if (this.zoomOverlayTimer) {
        clearTimeout(this.zoomOverlayTimer);
        this.zoomOverlayTimer = null;
      }
    }
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
        handleWorkPriorityPanelHover(
          this.mouse.x * this.DPR,
          this.mouse.y * this.DPR,
          this.colonists,
          this.canvas,
          this
        );
        return;
      }
      
      // Hotbar hover SFX (play when entering a new tab)
      if (this.modernHotbarRects && Array.isArray(this.modernHotbarRects) && this.modernHotbarRects.length) {
        const mx = this.mouse.x * this.DPR; const my = this.mouse.y * this.DPR;
        let hoveredTab: any = null;
        for (const r of this.modernHotbarRects) {
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
        if (buildMenuRects && Array.isArray(buildMenuRects.categories) && Array.isArray(buildMenuRects.buildings)) {
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
      this.setTouchUIEnabled(false);
      if (this.touchUIManualOverride === null) {
        this.isActuallyTouchDevice = false;
      }

      // TUTORIAL - Check for Continue button click first
      if (this.tutorialSystem.isActive()) {
        if (this.tutorialSystem.handleClick(e.offsetX * this.DPR, e.offsetY * this.DPR)) {
          return; // Tutorial Continue button was clicked
        }
        if (this.tutorialSystem.shouldBlockClick(e)) {
          return; // Tutorial is blocking this click
        }
      }

      // PRIORITY PANEL IS MODAL - Check first and block all other interactions
      if (isWorkPriorityPanelOpen()) {
        if (handleWorkPriorityPanelClick(
          e.offsetX * this.DPR,
          e.offsetY * this.DPR,
          this.colonists,
          this.canvas,
          this
        )) {
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
          if (this.colonistTabRects && Array.isArray(this.colonistTabRects)) {
            for (const tabRect of this.colonistTabRects) {
              if (tabRect && typeof tabRect.x === 'number' && typeof tabRect.y === 'number' && 
                  typeof tabRect.w === 'number' && typeof tabRect.h === 'number') {
                if (mx0 >= tabRect.x && mx0 <= tabRect.x + tabRect.w && my0 >= tabRect.y && my0 <= tabRect.y + tabRect.h) {
                  this.colonistProfileTab = tabRect.tab as any;
                  return;
                }
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
        if (this.modernHotbarRects && Array.isArray(this.modernHotbarRects)) {
          const clickedTab = handleHotbarClick(mx, my, this.modernHotbarRects);
          if (clickedTab) {
            // Toggle tab or switch to new tab
            this.uiManager.setHotbarTab(clickedTab);
            return;
          }
        }
        
        // Check for control panel clicks (speed, pause, zoom, delete)
        if (this.controlPanelRects && Array.isArray(this.controlPanelRects)) {
          if (handleControlPanelClick(mx, my, this.controlPanelRects, this)) {
            return; // Click was handled by control panel
          }
        }
        
        // Check for modern build menu clicks
        if (this.uiManager.activeHotbarTab === 'build') {
          const buildMenuRects = (this as any).modernBuildMenuRects;
          if (buildMenuRects && Array.isArray(buildMenuRects.categories) && Array.isArray(buildMenuRects.buildings)) {
            const clickResult = handleModernBuildMenuClick(mx, my, buildMenuRects);
            if (clickResult) {
              if (clickResult.type === 'category') {
                // Category clicked - select it
                this.uiManager.setSelectedBuildCategory(clickResult.value);
                void this.audioManager.play('ui.click.primary').catch(() => {});
              } else if (clickResult.type === 'building') {
                // Building or zone clicked - select it and close menus
                this.selectedBuild = clickResult.value;
                void this.audioManager.play('ui.click.primary').catch(() => {});
                this.uiManager.setHotbarTab(null); // Close the build menu
                
                // Get name from either BUILD_TYPES or ZONE_TYPES
                const def = BUILD_TYPES[clickResult.value] || getZoneDef(clickResult.value);
                if (def) {
                  this.toast('Selected: ' + def.name);
                }
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

          if (this.contextMenuRects && Array.isArray(this.contextMenuRects)) {
            for (const rect of this.contextMenuRects) {
              if (rect && typeof rect.x === 'number' && typeof rect.y === 'number' && 
                  typeof rect.w === 'number' && typeof rect.h === 'number') {
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
        if (this.pendingPlacement) {
          this.cancelPending();
          void this.audioManager.play('ui.click.secondary').catch(() => {});
          return;
        }
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

        // If stockpile or mining zone designator selected, start a zone drag
        if (this.selectedBuild === 'stock' || this.selectedBuild === 'mine') {
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
        if (this.uiManager.zoneDragStart && (this.selectedBuild === 'stock' || this.selectedBuild === 'mine')) {
          if (this.selectedBuild === 'stock') {
            this.finalizeStockpileDrag(this.uiManager.zoneDragStart, { x: this.mouse.wx, y: this.mouse.wy });
          } else if (this.selectedBuild === 'mine') {
            this.finalizeMiningZoneDrag(this.uiManager.zoneDragStart, { x: this.mouse.wx, y: this.mouse.wy });
          }
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
      if (isWorkPriorityPanelOpen() && isMouseOverWorkPanel(cx, cy, this.colonists, this.canvas, this)) {
        handleWorkPriorityPanelScroll(e.deltaY, this.colonists, this.canvas, this);
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
        this.skipNextTapAfterLongPress = false;
        if (!c) return; // Safety check for canvas element
        const rect = c.getBoundingClientRect();
        const sx = e.touches[0].clientX - rect.left;
        const sy = e.touches[0].clientY - rect.top;
        const wpt = this.screenToWorld(sx, sy);
        this.mouse.x = sx; this.mouse.y = sy; this.mouse.wx = wpt.x; this.mouse.wy = wpt.y;

        if (this.selectedBuild === 'stock' || this.selectedBuild === 'mine') {
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
        
        // Reset pending drag state on touch start
        this.pendingDragging = false;

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
            this.skipNextTapAfterLongPress = true;
            this.longPressStartTime = null;
            this.longPressTarget = null;
            this.longPressTargetType = null;
            this.longPressTimer = null;
          }, 500); // 500ms long press
        } else {
          const clickedBuilding = this.findBuildingAt(wpt.x, wpt.y);
          if (clickedBuilding) {
            this.longPressStartPos = { x: sx, y: sy };
            this.longPressStartTime = performance.now();
            this.longPressTarget = clickedBuilding;
            this.longPressTargetType = 'building';

            this.longPressTimer = window.setTimeout(() => {
              if (showBuildingContextMenu(this, clickedBuilding, sx, sy)) {
                if (navigator.vibrate) {
                  navigator.vibrate(50);
                }
                this.skipNextTapAfterLongPress = true;
              }
              this.longPressStartTime = null;
              this.longPressTarget = null;
              this.longPressTargetType = null;
              this.longPressTimer = null;
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
        if (!c) return; // Safety check for canvas element
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
          if (!c) return; // Safety check for canvas element
          const rect = c.getBoundingClientRect();
          const sx = e.touches[0].clientX - rect.left;
          const sy = e.touches[0].clientY - rect.top;
          const wpt = this.screenToWorld(sx, sy);
          this.mouse.x = sx; this.mouse.y = sy; this.mouse.wx = wpt.x; this.mouse.wy = wpt.y;
          
          // Set dragging flag to prevent auto-confirm on touch end
          if (!this.pendingDragging) {
            this.pendingDragging = true;
            // UI drag start SFX (only play once per drag session)
            void this.audioManager.play('ui.drag.start').catch(() => {});
          }
          
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
          if (!c) return; // Safety check for canvas element
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

      const suppressTap = this.skipNextTapAfterLongPress;
      if (suppressTap) {
        this.skipNextTapAfterLongPress = false;
      }

      if (this.touchZoneDragActive && this.uiManager.zoneDragStart) {
        if (!c) return; // Safety check for canvas element
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

        let created = false;
        if (this.selectedBuild === 'stock') {
          created = this.finalizeStockpileDrag(this.uiManager.zoneDragStart, endWorld, true);
        } else if (this.selectedBuild === 'mine') {
          created = this.finalizeMiningZoneDrag(this.uiManager.zoneDragStart, endWorld, true);
        }
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

      // Treat single-finger touchend as a tap/click if not panning or suppressed by long press
      if (!suppressTap && e.changedTouches.length === 1 && e.touches.length === 0) {
        if (!c) return; // Safety check for canvas element
        const rect = c.getBoundingClientRect();
        const sx = e.changedTouches[0].clientX - rect.left;
        const sy = e.changedTouches[0].clientY - rect.top;
        this.handleTapOrClickAtScreen(sx, sy);
      }
      if (e.touches.length === 0) { this.touchLastPan = null; this.touchLastDist = null; }
      if (suppressTap) { return; }
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
      this.skipNextTapAfterLongPress = false;
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
    if (!c) return; // Safety check for canvas element
    const rect = c.getBoundingClientRect();
    this.mouse.x = sx;
    this.mouse.y = sy;
    const wpt = this.screenToWorld(this.mouse.x, this.mouse.y);
    this.mouse.wx = wpt.x; this.mouse.wy = wpt.y;

    // PRIORITY PANEL IS MODAL - Check first and block all other interactions
    if (isWorkPriorityPanelOpen()) {
      if (
        handleWorkPriorityPanelClick(
          sx * this.DPR,
          sy * this.DPR,
          this.colonists,
          this.canvas,
          this
        )
      ) {
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
      
      // 2) Tap on ghost = confirm, UNLESS we just finished dragging
      // If we were dragging, don't auto-confirm on release
      if (isClickOnGhost(this, mx, my)) {
        // Only confirm if this wasn't a drag operation
        if (!this.pendingDragging) {
          this.confirmPending();
        } else {
          // Play drag end sound for touch dragging
          void this.audioManager.play('ui.drag.end').catch(() => {});
        }
        // Clear drag state regardless
        this.pendingDragging = false;
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
      if (this.colonistTabRects && Array.isArray(this.colonistTabRects)) {
        for (const tabRect of this.colonistTabRects) {
          if (tabRect && typeof tabRect.x === 'number' && typeof tabRect.y === 'number' && 
              typeof tabRect.w === 'number' && typeof tabRect.h === 'number') {
            if (mx0 >= tabRect.x && mx0 <= tabRect.x + tabRect.w && my0 >= tabRect.y && my0 <= tabRect.y + tabRect.h) {
              this.colonistProfileTab = tabRect.tab as any;
              return;
            }
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

    // Modern hotbar tabs (touch) - ensure array is valid before calling handleHotbarClick
    if (this.modernHotbarRects && Array.isArray(this.modernHotbarRects)) {
      const touchedTab = handleHotbarClick(mx, my, this.modernHotbarRects);
      if (touchedTab) {
        this.uiManager.setHotbarTab(touchedTab);
        return;
      }
    }

    // Control panel (speed, pause, zoom, delete) - touch events
    if (this.controlPanelRects && Array.isArray(this.controlPanelRects)) {
      if (handleControlPanelClick(mx, my, this.controlPanelRects, this)) {
        return; // Click was handled by control panel
      }
    }

    // Legacy hotbar fallback (desktop-only UI still available in some screens)
    if (this.hotbarRects && Array.isArray(this.hotbarRects)) {
      for (const r of this.hotbarRects) {
        if (r && typeof r.x === 'number' && typeof r.y === 'number' && 
            typeof r.w === 'number' && typeof r.h === 'number') {
          if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
            const key = this.hotbar[r.index];
            if (key) { this.selectedBuild = key; this.toast('Selected: ' + BUILD_TYPES[key].name); }
            return;
          }
        }
      }
    }

    // Modern build menu (build tab)
    if (this.uiManager.activeHotbarTab === 'build') {
      const buildMenuRects = (this as any).modernBuildMenuRects;
      if (buildMenuRects && Array.isArray(buildMenuRects.categories) && Array.isArray(buildMenuRects.buildings)) {
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

      if (this.contextMenuRects && Array.isArray(this.contextMenuRects)) {
        for (const rect of this.contextMenuRects) {
          if (rect && typeof rect.x === 'number' && typeof rect.y === 'number' && 
              typeof rect.w === 'number' && typeof rect.h === 'number') {
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
        const T = 32;
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
    // Beta feedback: Resources spawn closer to HQ for more convenient early game (120px = ~4 tiles)
    // Check if position is on a mountain before spawning
    const isMountainPos = (x: number, y: number): boolean => {
      const gx = Math.floor(x / T);
      const gy = Math.floor(y / T);
      const terrainTypeId = this.terrainGrid.terrain[gy * this.terrainGrid.cols + gx];
      return getTerrainTypeFromId(terrainTypeId) === TerrainType.MOUNTAIN;
    };

    for (let i = 0; i < 220; i++) { 
      const p = { x: rand(80, WORLD.w - 80), y: rand(80, WORLD.h - 80) }; 
      if (Math.hypot(p.x - HQ_POS.x, p.y - HQ_POS.y) < 120) continue;
      if (isMountainPos(p.x, p.y)) continue; // Don't spawn on mountains
      this.trees.push({ x: p.x, y: p.y, r: 12, hp: 40, type: 'tree' }); 
    }
    for (let i = 0; i < 140; i++) { 
      const p = { x: rand(80, WORLD.w - 80), y: rand(80, WORLD.h - 80) }; 
      if (Math.hypot(p.x - HQ_POS.x, p.y - HQ_POS.y) < 120) continue;
      if (isMountainPos(p.x, p.y)) continue; // Don't spawn on mountains
      this.rocks.push({ x: p.x, y: p.y, r: 12, hp: 50, type: 'rock' }); 
    }
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
          // Beta feedback: Resources respawn closer to HQ (150px = ~5 tiles)
          if (Math.hypot(p.x - HQ_POS.x, p.y - HQ_POS.y) < 150) continue;
          // avoid too close to buildings
          let ok = true;
          for (const b of this.buildings) { if (p.x > b.x-24 && p.x < b.x+b.w+24 && p.y > b.y-24 && p.y < b.y+b.h+24) { ok=false; break; } }
          if (!ok) continue;
          // Don't spawn on mountains
          const gx = Math.floor(p.x / T);
          const gy = Math.floor(p.y / T);
          const terrainTypeId = this.terrainGrid.terrain[gy * this.terrainGrid.cols + gx];
          if (getTerrainTypeFromId(terrainTypeId) === TerrainType.MOUNTAIN) continue;
          
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
  this.miningZones.length = 0; // Clear mining zones
  this.reservationManager.clearAll(); // Clear all reservations via manager
  
  // Clear colonist sprite cache on new game to ensure fresh sprite composition
  colonistSpriteCache.clear();
  
  this.RES.wood = 50; this.RES.stone = 30; this.RES.food = 20; 
  // Initialize ore resources
  this.RES.coal = 0; this.RES.copper = 0; this.RES.steel = 0; this.RES.silver = 0; this.RES.gold = 0;
  
  this.day = 1; this.tDay = 0; this.fastForward = 1; this.camera.zoom = 1; this.camera.x = HQ_POS.x - (this.canvas.width / this.DPR) / (2 * this.camera.zoom); this.camera.y = HQ_POS.y - (this.canvas.height / this.DPR) / (2 * this.camera.zoom);
    
    // Generate procedural mountains BEFORE building HQ and scattering resources
    const hqGridX = Math.floor(HQ_POS.x / T);
    const hqGridY = Math.floor(HQ_POS.y / T);
    generateMountains(this.terrainGrid, hqGridX, hqGridY, 15);
    
    // Mark world cache dirty so mountains render properly
    this.renderManager?.invalidateWorldCache();
    
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

    // Create initial stockpile zones for resource hauling
    // Without these, colonists won't haul chopped/mined resources!
    const hqX = HQ_POS.x;
    const hqY = HQ_POS.y;
    
    // General storage near HQ (accepts all items)
    const generalZone = this.itemManager.createStockpileZone(
      hqX - 160, // 5 tiles left of HQ
      hqY - 160, // 5 tiles above HQ
      128,       // 4x4 tiles
      128,
      'General Storage'
    );
    // Allow all items by default
    generalZone.settings.allowAll = true;
    
    // Materials storage (wood, stone) - closer to HQ for construction
    const materialsZone = this.itemManager.createStockpileZone(
      hqX + 96,  // 3 tiles right of HQ  
      hqY - 96,  // 3 tiles above HQ
      96,        // 3x3 tiles
      96,
      'Materials'
    );
    this.itemManager.updateStockpileItems(materialsZone.id, ['wood', 'stone']);
    
    // Food storage - separate zone for organization
    const foodZone = this.itemManager.createStockpileZone(
      hqX - 96,  // 3 tiles left of HQ
      hqY + 96,  // 3 tiles below HQ
      64,        // 2x2 tiles
      64,
      'Food Storage'
    );
    this.itemManager.updateStockpileItems(foodZone.id, ['food', 'wheat', 'bread']);
    this.msg("Welcome! Build farms before night, then turrets.");
    
    // Start tutorial for first-time players
    if (this.tutorialSystem.shouldAutoStart()) {
      // Small delay before starting tutorial to let world render
      setTimeout(() => {
        if (this.tutorialSystem && !this.paused) {
          this.tutorialSystem.start();
        }
      }, 500);
    }
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
    // Try multiple times to find a valid spawn position on the outskirts
    const MAX_ATTEMPTS = 30;
    let x = 0, y = 0;
    let validSpawn = false;
    
    const HQ_X = HQ_POS.x;
    const HQ_Y = HQ_POS.y;
    const MIN_DISTANCE_FROM_HQ = 400; // Minimum distance from HQ (pixels)
    const EDGE_MARGIN = 100; // Distance from world edge (pixels)
    
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      // Pick a random edge - spawn INSIDE world bounds, not outside
      const edge = randi(0, 4);
      if (edge === 0) { 
        // Top edge
        x = rand(EDGE_MARGIN, WORLD.w - EDGE_MARGIN); 
        y = EDGE_MARGIN; 
      } else if (edge === 1) { 
        // Bottom edge
        x = rand(EDGE_MARGIN, WORLD.w - EDGE_MARGIN); 
        y = WORLD.h - EDGE_MARGIN; 
      } else if (edge === 2) { 
        // Left edge
        x = EDGE_MARGIN; 
        y = rand(EDGE_MARGIN, WORLD.h - EDGE_MARGIN); 
      } else { 
        // Right edge
        x = WORLD.w - EDGE_MARGIN; 
        y = rand(EDGE_MARGIN, WORLD.h - EDGE_MARGIN); 
      }
      
      // Check if far enough from HQ
      const distFromHQ = Math.hypot(x - HQ_X, y - HQ_Y);
      if (distFromHQ < MIN_DISTANCE_FROM_HQ) {
        continue; // Too close to HQ
      }
      
      // Check if this position is on a mountain tile
      const gx = Math.floor(x / T);
      const gy = Math.floor(y / T);
      if (isMountainTile(this.terrainGrid, gx, gy)) {
        continue; // Skip mountain tiles
      }
      
      // Check if spawn tile is passable
      if (gx >= 0 && gy >= 0 && gx < this.grid.cols && gy < this.grid.rows) {
        const idx = gy * this.grid.cols + gx;
        if (!this.grid.solid[idx]) {
          // Check if there's a path to HQ (simple reachability check)
          // We could use A* here, but for performance, just check if not completely blocked
          // The enemy FSM will handle pathfinding to HQ
          validSpawn = true;
          break;
        }
      }
    }
    
    // If we couldn't find a valid spawn after MAX_ATTEMPTS, try positions around HQ
    // but still keep minimum distance
    if (!validSpawn) {
      this.msg('Could not find valid edge spawn, spawning near HQ perimeter', 'warn');
      const angle = rand(0, Math.PI * 2);
      const distance = MIN_DISTANCE_FROM_HQ + 100; // A bit farther than minimum
      x = HQ_X + Math.cos(angle) * distance;
      y = HQ_Y + Math.sin(angle) * distance;
      
      // Clamp to world bounds
      x = Math.max(EDGE_MARGIN, Math.min(x, WORLD.w - EDGE_MARGIN));
      y = Math.max(EDGE_MARGIN, Math.min(y, WORLD.h - EDGE_MARGIN));
      
      // Try to avoid mountains
      let gx = Math.floor(x / T);
      let gy = Math.floor(y / T);
      for (let i = 0; i < 10; i++) {
        if (!isMountainTile(this.terrainGrid, gx, gy)) break;
        // Try nearby position
        const offset = 50;
        x += (Math.random() - 0.5) * offset * 2;
        y += (Math.random() - 0.5) * offset * 2;
        x = Math.max(EDGE_MARGIN, Math.min(x, WORLD.w - EDGE_MARGIN));
        y = Math.max(EDGE_MARGIN, Math.min(y, WORLD.h - EDGE_MARGIN));
        gx = Math.floor(x / T);
        gy = Math.floor(y / T);
      }
    }
    
    // Use enemy generator for visual variety and equipment
    // Threat level increases every 5 days
    const threatLevel = Math.floor(this.day / 5) + 1;
    const e = createEnemyWithProfile(x, y, threatLevel, this.day);
    
    this.enemies.push(e); 
    return e;
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

  // AI Methods - Delegated to managers (extracted from 500-line monolith!)
  buildingCapacity(b: Building): number { return this.reservationManager.getBuildingCapacity(b); }
  buildingHasSpace(b: Building, ignoreColonist?: Colonist): boolean { return this.reservationManager.buildingHasSpace(b, ignoreColonist); }
  reserveSleepSpot(c: Colonist, b: Building): boolean { return this.reservationManager.reserveSleepSpot(c, b); }
  releaseSleepReservation(c: Colonist) { this.reservationManager.releaseSleepReservation(c); }
  tryEnterBuilding(c: Colonist, b: Building): boolean { return this.reservationManager.enterBuilding(c, b, this.centerOf(b)); }
  leaveBuilding(c: Colonist) { this.reservationManager.leaveBuilding(c); }
  releaseBuildReservation(c: Colonist) { this.reservationManager.releaseBuildReservation(c); }
  clearPath(c: Colonist) { this.taskManager.clearPath(c); }
  setTask(c: Colonist, task: string, target: any, options?: { isPlayerCommand?: boolean; extraData?: any }) { this.taskManager.setTask(c, task, target, options); }
  pickTask(c: Colonist) { this.taskManager.pickTask(c); }
  nearestCircle<T extends { x: number; y: number }>(p: { x: number; y: number }, arr: T[]): T | null { return this.taskManager.nearestCircle(p, arr); }
  nearestSafeCircle<T extends { x: number; y: number }>(c: Colonist, p: { x: number; y: number }, arr: T[]): T | null { return this.taskManager.nearestSafeCircle(c, p, arr); }
  
  // Expose reservation state for work givers (backward compatibility)
  get assignedTargets(): WeakSet<object> { return this.reservationManager.getAssignedTargets(); }
  get assignedTiles(): Set<string> { return this.reservationManager.getAssignedTiles(); }
  
  // Movement delegation to ColonistNavigationManager
  moveAlongPath(c: Colonist, dt: number, target?: { x: number; y: number }, arrive = 10): boolean {
    return this.colonistNavigationManager.moveAlongPath(c, dt, target, arrive);
  }

  // Building methods moved to BuildingManager
  isProtectedByTurret(b: Building): boolean {
    return this.buildingManager.isProtectedByTurret(b);
  }

  centerOf(b: Building) {
    return this.buildingManager.centerOf(b);
  }
  pointInRect(p: { x: number; y: number }, r: { x: number; y: number; w: number; h: number }) { return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }
  updateTurret(b: Building, dt: number) { updateTurretCombat(this, b, dt); }

  // Day/Night & waves
  isNight() { return this.timeSystem.isNight(); }
  spawnWave() { const n = 4 + Math.floor(this.day * 1.3); for (let i = 0; i < n; i++) this.spawnEnemy(); this.msg(`Night ${this.day}: Enemies incoming!`, 'warn'); }
  nextDay() {
    // Day already incremented by TimeSystem
    (this as any).waveSpawnedForDay = false;
    let dead = 0; for (let i = 0; i < this.colonists.length; i++) { if (this.RES.food > 0) { this.RES.food -= 1; } else { dead++; if (this.colonists[i]) { (this.colonists[i] as any).alive = false; } } }
    if (dead > 0) { 
      // Track dead colonists for game over screen before removing them
      const deadColonists = this.colonists.filter(c => !c.alive);
      this.state.deadColonists.push(...deadColonists);
      this.colonists = this.colonists.filter(c => c.alive); 
      this.msg(`${dead} colonist(s) starved`, 'bad'); 
    }
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
        // Track dead colonists for game over screen before removing them
        this.state.deadColonists.push(c);
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
        // Will be removed on next update cycle (lines 2432-2439 above will catch them)
        // No duplicate risk: they'll be added to deadColonists once and removed immediately
      }
    }
  }
  keyPressed(k: string): boolean { 
    return this.inputManager.keyPressed(k);
  }
  update(dt: number) {
    // Update tutorial system if active
    if (this.tutorialSystem.isActive()) {
      this.tutorialSystem.update(dt);
      return; // Don't process any other game logic during tutorial
    }
    
    // Update game over screen if active
    if (this.gameOverScreen.isActive()) {
      this.gameOverScreen.update(dt);
      return; // Don't process any other game logic during game over
    }
    
    // If debug console is open, ignore gameplay hotkeys (space, etc.)
    const dc = (this as any).debugConsole;
    const consoleOpen = !!(dc && dc.open);
    
    // Note: Work priority panel is now non-modal (like build menu), so it doesn't block input
    
    // Update zoom overlay system
    this.updateZoomOverlay();
    
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
  if (!consoleOpen && this.keyPressed('r')) { 
    // Toggle research panel
    this.researchUI.toggle();
    void this.audioManager.play('ui.panel.open');
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
  
  // Update research system with current researcher count
  const researcherCount = this.colonists.filter(c => c.alive && c.state === 'research').length;
  this.researchManager.updateResearcherCount(researcherCount);
  
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
      
      // Passive cooling rack system - 180 ticks = 6 seconds at 30Hz
      if (b.kind === 'cooling_rack' && b.done && b.coolingColonist === 'PASSIVE' && b.coolingIngotType) {
        // Cooling takes 180 simulation ticks = 180/30 = 6 seconds
        const coolingSpeed = 1.0 / 6.0; // Complete in 6 seconds
        b.coolingProgress = (b.coolingProgress || 0) + coolingSpeed * dt * this.fastForward;
        
        if (b.coolingProgress >= 1.0) {
          // Cooling complete - convert hot ingot to regular ingot
          const hotIngotType = b.coolingIngotType;
          const cooledIngotMap: Record<string, string> = {
            hot_copper_ingot: 'copper_ingot',
            hot_steel_ingot: 'steel_ingot',
            hot_silver_ingot: 'silver_ingot',
            hot_gold_ingot: 'gold_ingot'
          };
          
          const cooledType = cooledIngotMap[hotIngotType];
          if (cooledType) {
            // Drop cooled ingot next to rack
            const dropPos = { x: b.x + b.w / 2, y: b.y + b.h + 8 };
            this.itemManager.dropItems(cooledType as any, 1, dropPos);
            this.msg(`${cooledType.replace('_', ' ')} cooled and ready!`, 'good');
          }
          
          // Reset rack
          b.coolingProgress = 0;
          b.coolingColonist = undefined;
          b.coolingIngotType = undefined;
        }
      }
    }
  // resource respawn
    this.tryRespawn(dt);
    
  updateProjectilesCombat(this, dt);
    
    for (let i = this.messages.length - 1; i >= 0; i--) { const m = this.messages[i]; m.t -= dt; if (m.t <= 0) this.messages.splice(i, 1); }
    
    // Update floor item/stockpile systems
    if (this.itemManager) this.itemManager.update();

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
  lose() { 
    this.paused = true; 
    this.msg('HQ destroyed. Colony fell.', 'bad'); 
    // Start dramatic game over sequence instead of alert
    this.gameOverScreen.start();
  }

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
    // Delegate to the new ColonistActionManager
    this.colonistActionManager.handleContextMenuAction(actionId, colonist);
  }

  // Helper functions for context menu actions - moved to ColonistActionManager

  // Medical methods moved to MedicalManager
  colonistNeedsMedicalBed(colonist: Colonist): boolean {
    return this.medicalManager.colonistNeedsMedicalBed(colonist);
  }

  // Building methods moved to BuildingManager
  findBestRestBuilding(colonist: Colonist, opts?: { requireMedical?: boolean; preferMedical?: boolean; allowShelterFallback?: boolean }): Building | null {
    return this.buildingManager.findBestRestBuilding(colonist, opts);
  }

  // Colonist navigation methods moved to ColonistNavigationManager
  forceColonistToRest(colonist: Colonist, isPlayerCommand = false) {
    this.colonistNavigationManager.forceColonistToRest(colonist, isPlayerCommand);
  }

  forceColonistToEat(colonist: Colonist, isPlayerCommand = false) {
    this.colonistNavigationManager.forceColonistToEat(colonist, isPlayerCommand);
  }

  sendColonistToHQ(colonist: Colonist) {
    this.colonistNavigationManager.sendColonistToHQ(colonist);
  }

  sendColonistToSafety(colonist: Colonist) {
    this.colonistNavigationManager.sendColonistToSafety(colonist);
  }

  sendColonistToBed(colonist: Colonist) {
    this.colonistNavigationManager.sendColonistToBed(colonist);
  }

  sendColonistToFood(colonist: Colonist) {
    this.colonistNavigationManager.sendColonistToFood(colonist);
  }

  // Medical methods moved to MedicalManager
  treatColonist(colonist: Colonist) {
    this.medicalManager.treatColonist(colonist);
  }

  setColonistMedicalPriority(colonist: Colonist, highPriority: boolean) {
    this.medicalManager.setColonistMedicalPriority(colonist, highPriority);
  }

  assignMedicalTreatment(patient: Colonist, treatmentId: string) {
    this.medicalManager.assignMedicalTreatment(patient, treatmentId);
  }

  assignComprehensiveMedicalCare(patient: Colonist) {
    this.medicalManager.assignComprehensiveMedicalCare(patient);
  }

  findBestDoctor(patient: Colonist): Colonist | null {
    return this.medicalManager.findBestDoctor(patient);
  }

  getColonistMedicalSkill(colonist: Colonist): number {
    return this.medicalManager.getColonistMedicalSkill(colonist);
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
