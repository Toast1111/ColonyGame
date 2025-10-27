/**
 * TutorialSystem - Interactive intro cinematic and tutorial for new players
 * 
 * REDESIGNED for clarity and proper UX:
 * - Visual arrows and highlights show exactly where to click
 * - Blocks all non-tutorial UI interactions
 * - Clear, action-focused instructions
 * - Glowing indicators on interactive elements
 * - Step-by-step with visual feedback
 */

import type { Game } from '../Game';
import { HQ_POS } from '../constants';

interface TutorialStep {
  id: string;
  title: string;
  instruction: string; // Single, clear action instruction
  description?: string[]; // Optional additional context
  highlightElement?: string; // CSS selector for UI element to highlight with glow
  arrowTo?: { x: number; y: number } | 'element'; // Arrow pointing to location or highlighted element
  blockAllClicks?: boolean; // Block all clicks except highlighted element
  waitForCondition?: (game: Game) => boolean; // Wait for player action
  duration?: number; // Auto-advance after seconds (if no condition)
  onEnter?: (game: Game) => void; // Called when step starts
  onExit?: (game: Game) => void; // Called when step ends
  allowedKeys?: string[]; // Keys that are allowed during this step
}

export class TutorialSystem {
  private game: Game;
  private active: boolean = false;
  private skipped: boolean = false;
  private currentStepIndex: number = 0;
  private stepStartTime: number = 0;
  private introPhase: 'fade-in' | 'title' | 'fade-out' | 'complete' = 'fade-in';
  private introTimer: number = 0;
  private fadeOpacity: number = 0;
  
  // Intro timing (seconds)
  private readonly INTRO_FADE_IN = 2.0;
  private readonly INTRO_TITLE_DURATION = 4.0;
  private readonly INTRO_FADE_OUT = 1.5;
  
  // Tutorial steps - completely redesigned for clarity
  private readonly steps: TutorialStep[] = [
    {
      id: 'welcome',
      title: 'Welcome, Commander',
      instruction: 'Press SPACE to begin',
      description: [
        'If you wish to survive through the night',
        'then you must learn the essentials.',
        'Luckily, I am here to guide you.'
      ],
      blockAllClicks: true,
      allowedKeys: [' ', 'escape']
    },
    {
      id: 'camera-movement',
      title: 'Step 1: Camera Movement',
      instruction: 'Use W/A/S/D keys to move the camera',
      description: [
        'Move around to explore'
      ],
      waitForCondition: (game) => {
        const moved = Math.abs(game.camera.x - HQ_POS.x) > 150 || 
                     Math.abs(game.camera.y - HQ_POS.y) > 150;
        return moved;
      },
      onEnter: (game) => {
        game.cameraSystem.centerOn(HQ_POS.x, HQ_POS.y);
        game.camera.zoom = 1.0;
      },
      blockAllClicks: true,
      allowedKeys: ['w', 'a', 's', 'd', 'escape']
    },
    {
      id: 'camera-zoom',
      title: 'Step 2: Camera Zoom',
      instruction: 'Scroll your mouse wheel UP to zoom in',
      description: [
        'Scroll DOWN to zoom out',
        'Or use + and - keys'
      ],
      arrowTo: { x: 0.5, y: 0.3 }, // Arrow pointing near center
      waitForCondition: (game) => {
        return Math.abs(game.camera.zoom - 1.0) > 0.2;
      },
      blockAllClicks: true,
      allowedKeys: ['escape', '+', '-']
    },
    {
      id: 'open-build-menu',
      title: 'Step 3: Build Menu',
      instruction: 'Click the "Build" button (or press B)',
      arrowTo: { x: 0.08, y: 0.96 }, // Points to Build tab (first tab, bottom-left)
      waitForCondition: (game) => {
        return game.uiManager.activeHotbarTab === 'build';
      },
      onEnter: (game) => {
        // Close any open tabs
        game.uiManager.setHotbarTab(null);
      },
      blockAllClicks: false, // Allow clicking the build button
      allowedKeys: ['b', 'escape']
    },
    {
      id: 'select-house',
      title: 'Step 4: Select House',
      instruction: 'Click on the "House" building in the menu',
      description: [
        'Look for the housing tab in the build panel.',
        'Then click on "house" to select it.'
      ],
      onEnter: (game) => {
        // Ensure build menu is open
        if (game.uiManager.activeHotbarTab !== 'build') {
          game.uiManager.setHotbarTab('build');
        }
      },
      waitForCondition: (game) => {
        return game.selectedBuild === 'house';
      },
      blockAllClicks: false,
      allowedKeys: ['escape']
    },
    {
      id: 'place-house',
      title: 'Step 5: Place House',
      instruction: 'Left click near your HQ to place it',
      description: [
        'Green = valid, Red = blocked'
      ],
      arrowTo: { x: 0.5, y: 0.5 },
      waitForCondition: (game) => {
        // Check if a house has been placed
        return game.state.buildings.filter(b => b.kind === 'house').length > 0;
      },
      onEnter: (game) => {
        // Ensure house is selected
        if (!game.selectedBuild) {
          game.selectedBuild = 'house';
        }
        // Center camera on HQ
        game.cameraSystem.centerOn(HQ_POS.x, HQ_POS.y);
      },
      blockAllClicks: false,
      allowedKeys: ['escape']
    },
    {
      id: 'work-tab',
      title: 'Step 6: Work Priorities',
      instruction: 'Click "Work" at the bottom of your screen (or press P)',
      description: [
        'Opens the work priority panel'
      ],
      arrowTo: { x: 0.24, y: 0.96 }, // Points to Work tab (second tab)
      waitForCondition: (game) => {
        return game.uiManager.activeHotbarTab === 'work';
      },
      onEnter: (game) => {
        // Close build menu, close work panel if open
        game.selectedBuild = null;
        game.uiManager.setHotbarTab(null);
      },
      blockAllClicks: false,
      allowedKeys: ['p', 'escape']
    },
    {
      id: 'understand-priorities',
      title: 'Step 7: Priority Numbers',
      instruction: '1 = highest priority, 4 = lowest',
      description: [
        'Blank = colonist skips that job',
        'Press SPACE to continue'
      ],
      blockAllClicks: true,
      allowedKeys: ['escape', ' ']
    },
    {
      id: 'colonist-context',
      title: 'Step 8: Colonist Commands',
      instruction: 'Right-click on a colonist (small figure near HQ)',
      description: [
        'Opens a menu with colonist info and commands',
        'Try drafting them or checking their health'
      ],
      arrowTo: { x: 0.5, y: 0.5 }, // Will be updated in onEnter to point at colonist
      waitForCondition: (game) => {
        return game.contextMenu !== null;
      },
      onEnter: (game) => {
        // Close work panel
        game.uiManager.setHotbarTab(null);
        // Center on first colonist and zoom in
        if (game.state.colonists.length > 0) {
          const c = game.state.colonists[0];
          game.cameraSystem.centerOn(c.x, c.y);
          game.camera.zoom = 1.5;
        }
      },
      onExit: (game) => {
        // Close context menu
        game.contextMenu = null;
        // Reset zoom
        game.camera.zoom = 1.0;
      },
      blockAllClicks: false,
      allowedKeys: ['escape']
    },
    {
      id: 'stockpiles',
      title: 'Step 9: Stockpile Zones',
      instruction: 'Open Build menu and select Stockpile',
      description: [
        'Stockpiles store items on the ground',
        'Colonists will haul items automatically'
      ],
      arrowTo: { x: 0.08, y: 0.96 }, // Points to Build tab
      waitForCondition: (game) => {
        return game.selectedBuild === 'stock';
      },
      onEnter: (game) => {
        // Close any open tabs
        game.uiManager.setHotbarTab(null);
        game.selectedBuild = null;
      },
      blockAllClicks: false,
      allowedKeys: ['b', 'escape']
    },
    {
      id: 'time-controls',
      title: 'Step 10: Time Controls',
      instruction: 'Try using the "F" key for fast forward',
      description: [
        '1 = Pause, 2 = Normal, 3 = Fast, 4 = Faster',
        'SPACE also pauses/unpauses',
        'Press SPACE when ready to continue'
      ],
      onEnter: (game) => {
        // Close build menu
        game.uiManager.setHotbarTab(null);
        game.selectedBuild = null;
      },
      blockAllClicks: true,
      allowedKeys: ['escape', ' ', '1', '2', '3', '4', 'f']
    },
    {
      id: 'debug-console',
      title: 'Step 11: Debug Console',
      instruction: 'Press ` (backtick) opens the debug console',
      description: [
        'Type "help" to see all commands',
        'Examples: "heal all", "give wood 100"',
        'Press SPACE to continue'
      ],
      blockAllClicks: true,
      allowedKeys: ['escape', ' ', '`']
    },
    {
      id: 'win-lose',
      title: 'Step 12: Win & Lose',
      instruction: 'Your goal: Survive to Day 20',
      description: [
        'If your HQ is destroyed, you LOSE',
        'Enemies attack every night',
        'Press SPACE to continue'
      ],
      blockAllClicks: true,
      allowedKeys: ['escape', ' ']
    },
    {
      id: 'complete',
      title: 'Tutorial Complete!',
      instruction: 'Press SPACE to begin',
      description: [
        'You now know the basics',
        'Build farms for food before nightfall',
        'Press H anytime for help'
      ],
      onEnter: (game) => {
        this.markCompleted();
      },
      blockAllClicks: true,
      allowedKeys: [' ', 'escape']
    }
  ];
  
  constructor(game: Game) {
    this.game = game;
  }
  
  /**
   * Check if tutorial has been completed before
   */
  hasCompletedBefore(): boolean {
    try {
      return localStorage.getItem('colony_tutorial_completed') === 'true';
    } catch {
      return false;
    }
  }
  
  /**
   * Mark tutorial as completed
   */
  private markCompleted(): void {
    try {
      localStorage.setItem('colony_tutorial_completed', 'true');
    } catch {
      // Ignore localStorage errors
    }
  }
  
  /**
   * Start the tutorial/intro sequence
   */
  start(): void {
    this.active = true;
    this.skipped = false;
    this.currentStepIndex = 0;
    this.stepStartTime = performance.now() / 1000;
    this.introPhase = 'fade-in';
    this.introTimer = 0;
    this.fadeOpacity = 0;
    
    // Pause the game
    this.game.paused = true;
    
    // Play ambient intro music (optional)
    // this.game.audioManager.play('music.intro', { volume: 0.3, loop: false });
  }
  
  /**
   * Skip the entire tutorial
   */
  skip(): void {
    this.skipped = true;
    this.active = false;
    this.game.paused = false;
    this.markCompleted();
    this.game.toast('Tutorial skipped');
    
    // Play a confirmation sound
    void this.game.audioManager.play('ui.panel.close').catch(() => {});
  }
  
  /**
   * Check if tutorial should start for a new game
   */
  shouldAutoStart(): boolean {
    return !this.hasCompletedBefore();
  }
  
  /**
   * Update tutorial state
   */
  update(dt: number): void {
    if (!this.active) return;
    
    const now = performance.now() / 1000;
    const elapsed = now - this.stepStartTime;
    
    // Intro cinematic phase
    if (this.introPhase !== 'complete') {
      this.updateIntro(dt);
      return;
    }
    
    // Tutorial steps phase
    const step = this.steps[this.currentStepIndex];
    
    // Check for manual skip input
    if (this.game.keyPressed('escape')) {
      this.skip();
      return;
    }
    
    // Check step completion condition
    let shouldAdvance = false;
    
    if (step.waitForCondition) {
      shouldAdvance = step.waitForCondition(this.game);
    } else if (step.duration !== undefined) {
      shouldAdvance = elapsed >= step.duration;
    } else {
      // Default: advance on spacebar
      shouldAdvance = this.game.keyPressed(' ');
    }
    
    if (shouldAdvance) {
      this.advanceStep();
    }
  }
  
  /**
   * Update intro cinematic
   */
  private updateIntro(dt: number): void {
    this.introTimer += dt;
    
    switch (this.introPhase) {
      case 'fade-in':
        this.fadeOpacity = Math.min(1.0, this.introTimer / this.INTRO_FADE_IN);
        if (this.introTimer >= this.INTRO_FADE_IN) {
          this.introPhase = 'title';
          this.introTimer = 0;
        }
        break;
        
      case 'title':
        this.fadeOpacity = 1.0;
        // Allow skip during title
        if (this.game.keyPressed(' ') || this.game.keyPressed('escape')) {
          this.introPhase = 'fade-out';
          this.introTimer = 0;
        } else if (this.introTimer >= this.INTRO_TITLE_DURATION) {
          this.introPhase = 'fade-out';
          this.introTimer = 0;
        }
        break;
        
      case 'fade-out':
        this.fadeOpacity = Math.max(0.0, 1.0 - (this.introTimer / this.INTRO_FADE_OUT));
        if (this.introTimer >= this.INTRO_FADE_OUT) {
          this.introPhase = 'complete';
          this.stepStartTime = performance.now() / 1000; // Reset step timer
        }
        break;
    }
  }
  
  /**
   * Advance to next tutorial step
   */
  private advanceStep(): void {
    const currentStep = this.steps[this.currentStepIndex];
    
    // Clean up highlight from previous step
    if (currentStep.highlightElement) {
      this.cleanupHighlight(currentStep.highlightElement);
    }
    
    // Call exit callback
    if (currentStep.onExit) {
      currentStep.onExit(this.game);
    }
    
    // Play step complete sound
    void this.game.audioManager.play('ui.click.primary').catch(() => {});
    
    // Move to next step
    this.currentStepIndex++;
    this.stepStartTime = performance.now() / 1000;
    
    // Check if tutorial is complete
    if (this.currentStepIndex >= this.steps.length) {
      this.complete();
      return;
    }
    
    // Call enter callback for new step
    const nextStep = this.steps[this.currentStepIndex];
    if (nextStep.onEnter) {
      nextStep.onEnter(this.game);
    }
  }
  
  /**
   * Complete the tutorial
   */
  private complete(): void {
    // Clean up any remaining highlights
    const lastStep = this.steps[this.steps.length - 1];
    if (lastStep.highlightElement) {
      this.cleanupHighlight(lastStep.highlightElement);
    }
    
    this.active = false;
    this.game.paused = false;
    this.game.toast('Good luck, Commander!');
    
    // Play success sound
    void this.game.audioManager.play('ui.panel.open').catch(() => {});
  }
  
  /**
   * Render the tutorial overlay
   */
  render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    if (!this.active) return;
    
    const w = canvas.width;
    const h = canvas.height;
    
    // Render intro cinematic
    if (this.introPhase !== 'complete') {
      this.renderIntro(ctx, w, h);
      return;
    }
    
    // Render tutorial steps
    this.renderTutorialStep(ctx, w, h);
  }
  
  /**
   * Render intro cinematic
   */
  private renderIntro(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    // Black background
    ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeOpacity * 0.95})`;
    ctx.fillRect(0, 0, w, h);
    
    if (this.fadeOpacity < 0.3) return; // Don't show text during fade transitions
    
    ctx.save();
    ctx.globalAlpha = this.fadeOpacity;
    
    // Title
    const titleSize = Math.max(32, h * 0.06);
    ctx.font = `bold ${titleSize}px Arial, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('COLONY SURVIVAL', w / 2, h * 0.35);
    
    // Subtitle
    const subtitleSize = Math.max(16, h * 0.025);
    ctx.font = `italic ${subtitleSize}px Georgia, serif`;
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('Survive the Night. Build Your Future.', w / 2, h * 0.45);
    
    // Skip prompt
    const skipSize = Math.max(12, h * 0.02);
    ctx.font = `${skipSize}px Arial, sans-serif`;
    ctx.fillStyle = '#888888';
    // Blinking effect
    const blink = Math.sin(this.introTimer * 3) > 0;
    if (blink) {
      ctx.fillText('Press SPACE or ESC to skip', w / 2, h * 0.85);
    }
    
    ctx.restore();
  }
  
  /**
   * Render tutorial step overlay with improved visuals
   */
  private renderTutorialStep(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const step = this.steps[this.currentStepIndex];
    const elapsed = (performance.now() / 1000) - this.stepStartTime;
    
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, w, h);
    
    // Special highlights for hotbar buttons (canvas elements)
    if (step.id === 'open-build-menu') {
      this.highlightHotbarTab(ctx, w, h, elapsed, 0); // Build is tab 0
    } else if (step.id === 'work-tab') {
      this.highlightHotbarTab(ctx, w, h, elapsed, 1); // Work is tab 1
    } else if (step.id === 'stockpiles') {
      this.highlightHotbarTab(ctx, w, h, elapsed, 0); // Build tab for stockpiles
    }
    
    // Highlight UI element if specified (DOM elements)
    if (step.highlightElement) {
      this.highlightElement(step.highlightElement, elapsed);
    }
    
    // Draw arrow if specified
    if (step.arrowTo) {
      this.drawArrow(ctx, w, h, step, elapsed);
    }
    
    // Text box at TOP-LEFT (doesn't cover hotbar at bottom)
    const boxWidth = Math.min(520, w * 0.50); // Wider box
    const boxX = 20;
    const boxY = 20;
    const boxPadding = 20;
    const maxWidth = boxWidth - boxPadding * 2;
    
    ctx.save();
    ctx.textAlign = 'left';
    
    // Measure content height first
    let currentY = boxY + boxPadding;
    
    // Step counter (top-right of box)
    const counterSize = 14;
    ctx.font = `bold ${counterSize}px Arial`;
    const counterHeight = counterSize + 10;
    
    // Title
    const titleSize = 18;
    ctx.font = `bold ${titleSize}px Arial, sans-serif`;
    const titleHeight = titleSize + 15;
    
    // Instruction
    const instrSize = 15;
    ctx.font = `bold ${instrSize}px Arial, sans-serif`;
    const instrLines = this.measureWrappedText(ctx, step.instruction, maxWidth, instrSize * 1.3);
    const instrHeight = instrLines * instrSize * 1.3 + 10;
    
    // Description
    let descHeight = 0;
    if (step.description) {
      const descSize = 13;
      ctx.font = `${descSize}px Arial, sans-serif`;
      const lineHeight = descSize * 1.5;
      for (const line of step.description) {
        const lines = this.measureWrappedText(ctx, line, maxWidth, lineHeight);
        descHeight += lines * lineHeight;
      }
      descHeight += 5; // Extra spacing
    }
    
    // Skip button
    const skipHeight = 25;
    
    // Calculate total box height
    const boxHeight = counterHeight + titleHeight + instrHeight + descHeight + skipHeight + boxPadding * 2;
    
    // Draw box background with border
    ctx.fillStyle = 'rgba(10, 14, 20, 0.98)';
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    ctx.strokeStyle = '#4a90e2';
    ctx.lineWidth = 3;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
    
    // Now render content with proper spacing
    currentY = boxY + boxPadding;
    
    // Step counter
    ctx.font = `bold ${counterSize}px Arial`;
    ctx.fillStyle = '#64b5f6';
    ctx.textAlign = 'right';
    ctx.fillText(`Step ${this.currentStepIndex + 1} of ${this.steps.length}`, boxX + boxWidth - boxPadding, currentY + counterSize);
    currentY += counterHeight;
    
    // Title
    ctx.font = `bold ${titleSize}px Arial, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(step.title, boxX + boxPadding, currentY);
    currentY += titleHeight;
    
    // Main instruction
    ctx.font = `bold ${instrSize}px Arial, sans-serif`;
    ctx.fillStyle = '#ffeb3b';
    currentY = this.wrapTextWithTracking(ctx, step.instruction, boxX + boxPadding, currentY, maxWidth, instrSize * 1.3);
    currentY += 10;
    
    // Description
    if (step.description) {
      const descSize = 13;
      ctx.font = `${descSize}px Arial, sans-serif`;
      ctx.fillStyle = '#cccccc';
      const lineHeight = descSize * 1.5;
      
      for (const line of step.description) {
        currentY = this.wrapTextWithTracking(ctx, line, boxX + boxPadding, currentY, maxWidth, lineHeight);
      }
      currentY += 5;
    }
    
    // Skip button at bottom of box
    const skipSize = 12;
    ctx.font = `bold ${skipSize}px Arial, sans-serif`;
    ctx.fillStyle = '#ff5252';
    ctx.textAlign = 'center';
    
    const skipBlink = Math.sin(elapsed * 2) > -0.5;
    if (skipBlink) {
      ctx.fillText('[ESC] Skip Tutorial', boxX + boxWidth / 2, boxY + boxHeight - boxPadding + 5);
    }
    
    ctx.restore();
  }
  
  /**
   * Highlight a hotbar tab button (canvas-rendered element)
   * @param tabIndex - 0=Build, 1=Work, 2=Schedule, 3=Research, 4=Animals, 5=Quests
   */
  private highlightHotbarTab(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number, tabIndex: number): void {
    // Calculate hotbar dimensions (matches modernHotbar.ts layout)
    const hotbarHeight = h * 0.06; // 6% of canvas height
    const hotbarY = h - hotbarHeight;
    const tabPadding = w * 0.005;
    const tabsCount = 6;
    const totalPadding = tabPadding * (tabsCount + 1);
    const tabWidth = (w - totalPadding) / tabsCount;
    
    // Calculate this tab's position
    const tabX = tabPadding + (tabWidth + tabPadding) * tabIndex;
    const tabY = hotbarY + hotbarHeight * 0.15;
    const tabW = tabWidth;
    const tabH = hotbarHeight * 0.7;
    
    // Pulsing glow effect
    const glow = 8 + Math.sin(elapsed * 4) * 4;
    
    ctx.save();
    ctx.strokeStyle = '#ffeb3b';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#ffeb3b';
    ctx.shadowBlur = glow * 2;
    
    // Draw glowing rectangle around tab button
    ctx.strokeRect(tabX - 5, tabY - 5, tabW + 10, tabH + 10);
    
    // Additional outer glow
    ctx.strokeStyle = 'rgba(255, 235, 59, 0.3)';
    ctx.lineWidth = 8;
    ctx.strokeRect(tabX - 10, tabY - 10, tabW + 20, tabH + 20);
    
    ctx.restore();
  }
  
  /**
   * Highlight a DOM element with glowing border
   */
  private highlightElement(selector: string, elapsed: number): void {
    const element = document.querySelector(selector) as HTMLElement;
    if (!element) return;
    
    const rect = element.getBoundingClientRect();
    const glow = 5 + Math.sin(elapsed * 4) * 3; // Pulsing glow
    
    // Add visual highlight via style
    element.style.boxShadow = `0 0 ${glow}px ${glow * 2}px rgba(255, 235, 59, 0.8)`;
    element.style.outline = `3px solid #ffeb3b`;
    element.style.outlineOffset = '2px';
    element.style.zIndex = '10000';
    element.style.position = 'relative';
    
    // Remove highlight when tutorial ends (cleanup in onExit)
  }
  
  /**
   * Draw an animated arrow pointing to a location
   */
  private drawArrow(ctx: CanvasRenderingContext2D, w: number, h: number, step: TutorialStep, elapsed: number): void {
    if (!step.arrowTo) return;
    
    let targetX: number, targetY: number;
    
    if (step.arrowTo === 'element' && step.highlightElement) {
      // Point to highlighted element
      const element = document.querySelector(step.highlightElement) as HTMLElement;
      if (element) {
        const rect = element.getBoundingClientRect();
        targetX = rect.left + rect.width / 2;
        targetY = rect.top + rect.height / 2;
      } else {
        return; // Can't draw arrow if element not found
      }
    } else if (typeof step.arrowTo !== 'string') {
      // Point to specific coordinate (percentage of screen)
      targetX = step.arrowTo.x * w;
      targetY = step.arrowTo.y * h;
    } else {
      return;
    }
    
    // Bounce animation
    const bounce = Math.sin(elapsed * 3) * 15;
    
    // Arrow starting point (offset from target)
    const arrowStartX = targetX;
    const arrowStartY = targetY - 80 + bounce;
    
    ctx.save();
    
    // Draw arrow shaft
    ctx.strokeStyle = '#ffeb3b';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(arrowStartX, arrowStartY);
    ctx.lineTo(targetX, targetY - 10);
    ctx.stroke();
    
    // Draw arrowhead
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.moveTo(targetX, targetY);
    ctx.lineTo(targetX - 10, targetY - 20);
    ctx.lineTo(targetX + 10, targetY - 20);
    ctx.closePath();
    ctx.fill();
    
    // Add glow
    ctx.shadowColor = '#ffeb3b';
    ctx.shadowBlur = 15;
    ctx.fill();
    
    // Special indicator for zoom step - draw mouse wheel icon
    const currentStep = this.steps[this.currentStepIndex];
    if (currentStep.id === 'camera-zoom') {
      this.drawMouseWheelIcon(ctx, targetX, targetY + 40, elapsed);
    }
    
    ctx.restore();
  }
  
  /**
   * Draw a mouse wheel icon with scroll animation
   */
  private drawMouseWheelIcon(ctx: CanvasRenderingContext2D, x: number, y: number, elapsed: number): void {
    ctx.save();
    
    // Mouse body
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 3;
    
    const mouseWidth = 50;
    const mouseHeight = 70;
    const cornerRadius = 25;
    
    // Draw mouse outline (rounded rectangle)
    ctx.beginPath();
    ctx.moveTo(x - mouseWidth/2 + cornerRadius, y - mouseHeight/2);
    ctx.lineTo(x + mouseWidth/2 - cornerRadius, y - mouseHeight/2);
    ctx.quadraticCurveTo(x + mouseWidth/2, y - mouseHeight/2, x + mouseWidth/2, y - mouseHeight/2 + cornerRadius);
    ctx.lineTo(x + mouseWidth/2, y + mouseHeight/2 - cornerRadius);
    ctx.quadraticCurveTo(x + mouseWidth/2, y + mouseHeight/2, x + mouseWidth/2 - cornerRadius, y + mouseHeight/2);
    ctx.lineTo(x - mouseWidth/2 + cornerRadius, y + mouseHeight/2);
    ctx.quadraticCurveTo(x - mouseWidth/2, y + mouseHeight/2, x - mouseWidth/2, y + mouseHeight/2 - cornerRadius);
    ctx.lineTo(x - mouseWidth/2, y - mouseHeight/2 + cornerRadius);
    ctx.quadraticCurveTo(x - mouseWidth/2, y - mouseHeight/2, x - mouseWidth/2 + cornerRadius, y - mouseHeight/2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Scroll wheel with animation
    const scrollOffset = Math.sin(elapsed * 3) * 8; // Up and down motion
    ctx.fillStyle = '#ffeb3b';
    ctx.fillRect(x - 8, y - 15 + scrollOffset, 16, 20);
    
    // Up arrow above mouse
    ctx.fillStyle = '#4a90e2';
    ctx.beginPath();
    ctx.moveTo(x, y - mouseHeight/2 - 20);
    ctx.lineTo(x - 10, y - mouseHeight/2 - 10);
    ctx.lineTo(x + 10, y - mouseHeight/2 - 10);
    ctx.closePath();
    ctx.fill();
    
    // "SCROLL UP" text
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('SCROLL UP', x, y + mouseHeight/2 + 25);
    
    ctx.restore();
  }
  
  /**
   * Measure how many lines wrapped text will take
   */
  private measureWrappedText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, lineHeight: number): number {
    const words = text.split(' ');
    let line = '';
    let lineCount = 0;
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && i > 0) {
        lineCount++;
        line = words[i] + ' ';
      } else {
        line = testLine;
      }
    }
    lineCount++; // Last line
    
    return lineCount;
  }
  
  /**
   * Wrap text and return the Y position after rendering
   */
  private wrapTextWithTracking(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line, x, currentY);
        line = words[i] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
    currentY += lineHeight;
    
    return currentY;
  }
  
  /**
   * Wrap text to fit within a max width (legacy - kept for compatibility)
   */
  private wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line, x, currentY);
        line = words[i] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  }
  
  /**
   * Clean up element highlighting
   */
  private cleanupHighlight(selector?: string): void {
    if (!selector) return;
    
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.style.boxShadow = '';
      element.style.outline = '';
      element.style.outlineOffset = '';
      element.style.zIndex = '';
    }
  }
  
  /**
   * Check if tutorial is active
   */
  isActive(): boolean {
    return this.active;
  }
  
  /**
   * Check if tutorial was skipped
   */
  wasSkipped(): boolean {
    return this.skipped;
  }
  
  /**
   * Block unwanted clicks during tutorial
   */
  shouldBlockClick(event: MouseEvent): boolean {
    if (!this.active || this.introPhase !== 'complete') return false;
    
    const step = this.steps[this.currentStepIndex];
    if (!step.blockAllClicks) return false;
    
    // If there's a highlighted element, only allow clicking on it
    if (step.highlightElement) {
      const element = document.querySelector(step.highlightElement);
      if (element && element.contains(event.target as Node)) {
        return false; // Allow this click
      }
    }
    
    return true; // Block all other clicks
  }
}
