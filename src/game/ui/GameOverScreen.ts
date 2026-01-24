/**
 * GameOverScreen - Dramatic game over sequence with fade, guilt-trip text, and comedic credits
 * 
 * Sequence:
 * 1. Dramatic fade to black (2 seconds)
 * 2. Guilt-trip messages appear one by one (5 seconds total)
 * 3. Memorial photos of fallen colonists
 * 4. Transition to comedic credits scroll with absurd names/titles
 * 5. Sad music plays throughout
 */

import type { Game } from '../Game';
import { playGameOverMusic, stopGameOverMusic } from '../audio/helpers/musicAudio';
import { resetGameOverOverlayState, setGameOverOverlayState } from '../../react';

interface Message {
  text: string;
  delay: number; // Seconds after fade completes
  duration: number; // How long it stays visible
}

interface CreditEntry {
  title: string;
  name: string;
}

export class GameOverScreen {
  private game: Game;
  private startTime: number = 0;
  private active: boolean = false;
  private fadeOpacity: number = 0;
  
  // Timing constants (in seconds)
  private readonly FADE_DURATION = 2.5;
  private readonly GUILT_PHASE_DURATION = 11.0; // Extended for memorial photos
  private readonly MEMORIAL_START = 8.0; // When memorial photos start fading in
  private readonly TOTAL_BEFORE_CREDITS = this.FADE_DURATION + this.GUILT_PHASE_DURATION;
  
  // Guilt-trip messages with more dramatic timing
  private readonly messages: Message[] = [
    { text: 'EVERYONE', delay: 0.8, duration: 1.8 },
    { text: 'IS DEAD', delay: 2.8, duration: 2.0 },
    { text: 'YOU FAILED THEM', delay: 5.2, duration: 1.8 },
    { text: 'They counted on you...', delay: 7.2, duration: 4.0 },
  ];
  
  // Comedic credits - all the same person doing everything
  private readonly credits: CreditEntry[] = [
    { title: 'Executive Producer', name: 'JT Pressley' },
    { title: 'Senior Executive Producer', name: 'JT Pressley' },
    { title: 'Associate Executive Producer', name: 'JT Pressley' },
    { title: 'Director', name: 'JT Pressley' },
    { title: 'Assistant Director', name: 'JT Pressley' },
    { title: 'Second Unit Director', name: 'JT Pressley' },
    { title: 'Director of Photography', name: 'JT Pressley' },
    { title: 'Cinematographer', name: 'JT Pressley' },
    { title: 'Lead Programmer', name: 'JT Pressley' },
    { title: 'Senior Programmer', name: 'JT Pressley' },
    { title: 'Junior Programmer', name: 'JT Pressley' },
    { title: 'Intern Programmer', name: 'JT Pressley' },
    { title: 'Art Director', name: 'JT Pressley' },
    { title: 'Lead Artist', name: 'JT Pressley' },
    { title: 'Character Artist', name: 'JT Pressley' },
    { title: 'Environment Artist', name: 'JT Pressley' },
    { title: 'Texture Artist', name: 'JT Pressley' },
    { title: 'Concept Artist', name: 'JT Pressley' },
    { title: 'Storyboard Artist', name: 'JT Pressley' },
    { title: 'Sound Designer', name: 'JT Pressley' },
    { title: 'Music Composer', name: 'JT Pressley' },
    { title: 'Audio Engineer', name: 'JT Pressley' },
    { title: 'Foley Artist', name: 'JT Pressley' },
    { title: 'Voice Actor #1', name: 'JT Pressley' },
    { title: 'Voice Actor #2', name: 'JT Pressley' },
    { title: 'Voice Actor #3', name: 'JT Pressley' },
    { title: 'Narrator', name: 'JT Pressley' },
    { title: 'Game Designer', name: 'JT Pressley' },
    { title: 'Level Designer', name: 'JT Pressley' },
    { title: 'Systems Designer', name: 'JT Pressley' },
    { title: 'Combat Designer', name: 'JT Pressley' },
    { title: 'UI/UX Designer', name: 'JT Pressley' },
    { title: 'Technical Writer', name: 'JT Pressley' },
    { title: 'QA Lead', name: 'JT Pressley' },
    { title: 'QA Tester #1', name: 'JT Pressley' },
    { title: 'QA Tester #2', name: 'JT Pressley' },
    { title: 'QA Tester #3', name: 'JT Pressley' },
    { title: 'Community Manager', name: 'JT Pressley' },
    { title: 'Marketing Director', name: 'JT Pressley' },
    { title: 'Social Media Manager', name: 'JT Pressley' },
    { title: 'PR Representative', name: 'JT Pressley' },
    { title: 'Legal Counsel', name: 'JT Pressley' },
    { title: 'Accountant', name: 'JT Pressley' },
    { title: 'HR Manager', name: 'JT Pressley' },
    { title: 'Office Manager', name: 'JT Pressley' },
    { title: 'Janitor', name: 'JT Pressley' },
    { title: 'Coffee Maker', name: 'JT Pressley' },
    { title: 'Motivational Speaker', name: 'JT Pressley' },
    { title: 'Team Therapist', name: 'JT Pressley' },
    { title: 'Scrum Master', name: 'JT Pressley' },
    { title: 'Product Owner', name: 'JT Pressley' },
    { title: 'Chief Technology Officer', name: 'JT Pressley' },
    { title: 'Chief Executive Officer', name: 'JT Pressley' },
    { title: 'Chairman of the Board', name: 'JT Pressley' },
    { title: 'Shareholder', name: 'JT Pressley' },
    { title: 'Investor', name: 'JT Pressley' },
    { title: 'JT\'s Mom', name: 'JT Pressley' },
    { title: 'JT\'s Dad', name: 'JT Pressley' },
    { title: 'JT\'s Cat', name: 'Mr. Whiskers (JT Pressley in a cat costume)' },
    { title: 'Special Thanks', name: 'JT Pressley' },
    { title: 'Extra Special Thanks', name: 'Also JT Pressley' },
    { title: 'No Really, Thank You', name: 'Still JT Pressley' },
    { title: 'You, The Player (for trying)', name: 'Not JT Pressley (finally)' },
  ];
  
  private creditsScrollY: number = 0;
  private readonly CREDITS_SCROLL_SPEED_PERCENT = 0.05; // % of screen height per second
  private readonly CREDIT_LINE_HEIGHT_PERCENT = 0.15; // % of screen height per credit line
  
  constructor(game: Game) {
    this.game = game;
  }
  
  /**
   * Start the game over sequence
   */
  start() {
    this.active = true;
    this.startTime = performance.now() / 1000; // Convert to seconds
    this.fadeOpacity = 0;
    this.creditsScrollY = 0;
    resetGameOverOverlayState();
    
    // Play sad music
    playGameOverMusic(this.game.audioManager);
    
    // Pause the game
    this.game.paused = true;
  }
  
  /**
   * Update the game over screen state
   * @param dt Delta time in seconds
   */
  update(dt: number) {
    if (!this.active) {
      resetGameOverOverlayState();
      return;
    }
    
    const elapsed = (performance.now() / 1000) - this.startTime;
    const h = this.game.canvas.height;
    
    // Fade in black overlay
    if (elapsed < this.FADE_DURATION) {
      this.fadeOpacity = Math.min(1.0, elapsed / this.FADE_DURATION);
    } else {
      this.fadeOpacity = 1.0;
    }
    
    const timeSinceFade = elapsed - this.FADE_DURATION;
    const phase = elapsed < this.FADE_DURATION
      ? 'fade'
      : (elapsed < this.TOTAL_BEFORE_CREDITS ? 'guilt' : 'credits');

    // After guilt phase, scroll credits
    if (phase === 'credits') {
      this.creditsScrollY += (this.CREDITS_SCROLL_SPEED_PERCENT * h) * dt;
    } else {
      this.creditsScrollY = 0;
    }

    const memorialElapsed = timeSinceFade - this.MEMORIAL_START;
    const showMemorial = phase === 'guilt' && memorialElapsed >= 0;
    const memorialOpacity = showMemorial ? Math.min(1.0, memorialElapsed / 2.0) : 0;
    const creditLineHeight = h * this.CREDIT_LINE_HEIGHT_PERCENT;
    const totalCreditsHeight = this.credits.length * creditLineHeight;

    setGameOverOverlayState({
      active: true,
      phase,
      fadeOpacity: this.fadeOpacity,
      elapsed,
      timeSinceFade,
      messages: this.messages,
      credits: this.credits,
      scrollY: this.creditsScrollY,
      canvasWidth: this.game.canvas.width,
      canvasHeight: this.game.canvas.height,
      showEndMessage: phase === 'credits' && this.creditsScrollY > totalCreditsHeight + h,
      showMemorial,
      memorialOpacity,
      deadColonists: this.game.deadColonists
    });
  }
  
  /**
   * Render the game over screen
   * @param ctx Canvas 2D context
   * @param canvas Canvas element
   */
  render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    void ctx;
    void canvas;
    if (!this.active) return;
    // Rendered via React overlay.
  }
  
  /**
   * Check if the game over screen is currently active
   */
  isActive(): boolean {
    return this.active;
  }
  
  /**
   * Stop the game over screen
   */
  stop() {
    this.active = false;
    // Stop music if playing
    stopGameOverMusic(this.game.audioManager);
    resetGameOverOverlayState();
  }
}
