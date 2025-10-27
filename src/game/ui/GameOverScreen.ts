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
import { drawColonistAvatar } from '../render/sprites/colonistRenderer';

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
    
    // Play sad music
    this.game.audioManager.play('music.gameover.sad', { volume: 0.4, loop: true });
    
    // Pause the game
    this.game.paused = true;
  }
  
  /**
   * Update the game over screen state
   * @param dt Delta time in seconds
   */
  update(dt: number) {
    if (!this.active) return;
    
    const elapsed = (performance.now() / 1000) - this.startTime;
    const h = this.game.canvas.height;
    
    // Fade in black overlay
    if (elapsed < this.FADE_DURATION) {
      this.fadeOpacity = Math.min(1.0, elapsed / this.FADE_DURATION);
    } else {
      this.fadeOpacity = 1.0;
    }
    
    // After guilt phase, scroll credits
    if (elapsed > this.TOTAL_BEFORE_CREDITS) {
      this.creditsScrollY += (this.CREDITS_SCROLL_SPEED_PERCENT * h) * dt;
    }
  }
  
  /**
   * Render the game over screen
   * @param ctx Canvas 2D context
   * @param canvas Canvas element
   */
  render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    if (!this.active) return;
    
    const elapsed = (performance.now() / 1000) - this.startTime;
    const w = canvas.width;
    const h = canvas.height;
    
    // Black overlay with fade
    ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeOpacity})`;
    ctx.fillRect(0, 0, w, h);
    
    // Only show text after fade completes
    if (elapsed < this.FADE_DURATION) return;
    
    const timeSinceFade = elapsed - this.FADE_DURATION;
    
    // Guilt-trip messages phase
    if (timeSinceFade < this.GUILT_PHASE_DURATION) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Calculate vertical positions for stacking messages (percentage-based)
      // Moved higher up on screen to give memorial more room
      const centerY = h * 0.35; // Was h / 2, now 35% down the screen
      const lineSpacing = h * 0.09; // 9% of screen height between lines
      
      // Show messages based on timing - they stack vertically
      let currentLine = 0;
      for (const msg of this.messages) {
        if (timeSinceFade >= msg.delay) {
          const msgElapsed = timeSinceFade - msg.delay;
          
          // Once a message appears, it stays visible (no fade out during guilt phase)
          const isVisible = msgElapsed >= 0;
          
          if (isVisible) {
            // Dramatic fade in with easing
            const fadeInDuration = 0.5;
            const fadeIn = Math.min(1.0, msgElapsed / fadeInDuration);
            
            // Apply easing curve for more cinematic feel
            const easedOpacity = fadeIn < 0.5 
              ? 2 * fadeIn * fadeIn 
              : 1 - Math.pow(-2 * fadeIn + 2, 2) / 2;
            
            ctx.save();
            ctx.globalAlpha = easedOpacity;
            
            // Calculate Y position - stack messages from top to bottom
            const yOffset = (currentLine - 1.5) * lineSpacing; // Center the stack
            const yPos = centerY + yOffset;
            
            // Different styling for each message (percentage-based font sizes)
            if (msg.text === 'EVERYONE' || msg.text === 'IS DEAD') {
              // All caps messages - huge, bold, impact font style (7% of screen height)
              const fontSize = Math.max(32, h * 0.07);
              ctx.font = `bold ${fontSize}px Arial, sans-serif`;
              ctx.fillStyle = '#ff0000'; // Stark red
              
              // Add text shadow for more drama (percentage-based)
              ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
              ctx.shadowBlur = h * 0.02;
              ctx.shadowOffsetX = w * 0.003;
              ctx.shadowOffsetY = h * 0.004;
              
              ctx.fillText(msg.text, w / 2, yPos);
            } else if (msg.text === 'YOU FAILED THEM') {
              // Accusatory message - medium impact (5.5% of screen height)
              const fontSize = Math.max(28, h * 0.055);
              ctx.font = `bold ${fontSize}px Arial, sans-serif`;
              ctx.fillStyle = '#ffffff';
              
              ctx.shadowColor = 'rgba(255, 0, 0, 0.6)';
              ctx.shadowBlur = h * 0.015;
              ctx.shadowOffsetX = w * 0.002;
              ctx.shadowOffsetY = h * 0.003;
              
              ctx.fillText(msg.text, w / 2, yPos);
            } else {
              // Final message - softer, guilt-inducing (4% of screen height)
              const fontSize = Math.max(20, h * 0.04);
              ctx.font = `italic ${fontSize}px Georgia, serif`;
              ctx.fillStyle = '#cccccc';
              
              ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
              ctx.shadowBlur = h * 0.01;
              ctx.shadowOffsetX = w * 0.001;
              ctx.shadowOffsetY = h * 0.002;
              
              ctx.fillText(msg.text, w / 2, yPos);
            }
            
            ctx.restore();
            currentLine++;
          }
        }
      }
      
      // Memorial photos of fallen colonists - fade in after final message
      if (timeSinceFade >= this.MEMORIAL_START) {
        this.drawMemorialPhotos(ctx, canvas, timeSinceFade - this.MEMORIAL_START);
      }
    }
    // Credits phase
    else {
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      
      // Start credits from bottom of screen
      const creditLineHeight = h * this.CREDIT_LINE_HEIGHT_PERCENT;
      const startY = h - this.creditsScrollY + h * 0.2;
      
      // Draw each credit entry
      for (let i = 0; i < this.credits.length; i++) {
        const credit = this.credits[i];
        const y = startY + i * creditLineHeight;
        
        // Only draw if visible (percentage-based culling)
        const cullMargin = h * 0.15;
        if (y > -cullMargin && y < h + cullMargin) {
          // Title (role) - smaller gray text (2.8% of screen height)
          const titleFontSize = Math.max(14, h * 0.028);
          ctx.font = `${titleFontSize}px "Press Start 2P", monospace`;
          ctx.fillStyle = '#888888';
          ctx.fillText(credit.title, w / 2, y);
          
          // Name (HUGE CINEMATIC! 6.4% of screen height)
          const nameFontSize = Math.max(32, h * 0.064);
          ctx.font = `bold ${nameFontSize}px "Press Start 2P", monospace`;
          ctx.fillStyle = '#ffffff';
          
          // Add subtle glow for cinematic effect
          ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
          ctx.shadowBlur = h * 0.008;
          
          ctx.fillText(credit.name, w / 2, y + h * 0.05);
          
          // Reset shadow
          ctx.shadowBlur = 0;
          
          // Draw subtle dividing line below each entry (30% of screen width)
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          const lineWidth = w * 0.3;
          ctx.moveTo(w / 2 - lineWidth, y + h * 0.11);
          ctx.lineTo(w / 2 + lineWidth, y + h * 0.11);
          ctx.stroke();
        }
      }
      
      // Check if credits finished scrolling
      const totalCreditsHeight = this.credits.length * creditLineHeight;
      if (this.creditsScrollY > totalCreditsHeight + h) {
        // Credits finished - could add a "Press any key to restart" message
        const endFontSize = Math.max(12, h * 0.02);
        ctx.font = `${endFontSize}px "Press Start 2P", monospace`;
        ctx.fillStyle = '#ffff00';
        ctx.fillText('Press R to restart (if that was implemented)', w / 2, h / 2);
      }
    }
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
    this.game.audioManager.stop('music.gameover.sad');
  }
  
  /**
   * Draw memorial photos of fallen colonists in black and white
   */
  private drawMemorialPhotos(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, elapsed: number) {
    const w = canvas.width;
    const h = canvas.height;
    
    // Fade in duration
    const fadeInDuration = 2.0;
    const opacity = Math.min(1.0, elapsed / fadeInDuration);
    
    // Get all dead colonists from the dedicated dead colonists array
    const deadColonists = this.game.deadColonists;
    
    // Debug: log colonist count
    console.log('[GameOver] Total colonists:', this.game.colonists.length, 'Dead:', deadColonists.length);
    
    if (deadColonists.length === 0) {
      // No dead colonists - show message in development
      ctx.save();
      ctx.globalAlpha = opacity;
      const noColonistsFontSize = Math.max(12, h * 0.02);
      ctx.font = `${noColonistsFontSize}px "Press Start 2P", monospace`;
      ctx.fillStyle = '#888888';
      ctx.textAlign = 'center';
      ctx.fillText('(No fallen colonists to remember)', w / 2, h * 0.65);
      ctx.restore();
      return;
    }
    
    // Calculate grid layout for photos (percentage-based)
    // Scaled up by 25% from 8% to 10% of screen height
    const photoSize = Math.min(100, h * 0.10); // 10% of screen height, max 100px
    const spacing = photoSize * 0.25; // Proportional spacing (25% of photo size)
    const photosPerRow = Math.min(8, deadColonists.length); // More photos per row since they're smaller
    const totalRows = Math.ceil(deadColonists.length / photosPerRow);
    
    // Calculate starting position to center the grid
    const gridWidth = photosPerRow * (photoSize + spacing) - spacing;
    const gridHeight = totalRows * (photoSize + spacing) - spacing;
    const startX = (w - gridWidth) / 2;
    const startY = h * 0.65; // Position in lower portion of screen
    
    ctx.save();
    ctx.globalAlpha = opacity;
    
    // Draw each colonist photo
    for (let i = 0; i < deadColonists.length; i++) {
      const colonist = deadColonists[i];
      const row = Math.floor(i / photosPerRow);
      const col = i % photosPerRow;
      
      const x = startX + col * (photoSize + spacing);
      const y = startY + row * (photoSize + spacing);
      
      // Draw photo frame (dark border) - proportional to photo size
      const borderWidth = photoSize * 0.033;
      ctx.fillStyle = '#222222';
      ctx.fillRect(x - borderWidth, y - borderWidth, photoSize + borderWidth * 2, photoSize + borderWidth * 2);
      
      // Draw photo background
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(x, y, photoSize, photoSize);
      
      // Create a temporary canvas for black and white conversion
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = photoSize;
      tempCanvas.height = photoSize;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (tempCtx && colonist.profile) {
        // Draw colonist avatar centered and scaled
        tempCtx.save();
        
        // Draw the actual colonist avatar at larger size (80% of photo size)
        // drawColonistAvatar signature: (ctx, x, y, colonist, size, isSelected)
        const avatarSize = photoSize * 0.8;
        drawColonistAvatar(tempCtx, photoSize / 2, photoSize / 2, colonist, avatarSize, false);
        
        tempCtx.restore();
        
        // Apply grayscale filter
        const imageData = tempCtx.getImageData(0, 0, photoSize, photoSize);
        const pixels = imageData.data;
        for (let j = 0; j < pixels.length; j += 4) {
          const gray = pixels[j] * 0.3 + pixels[j + 1] * 0.59 + pixels[j + 2] * 0.11;
          pixels[j] = gray;     // Red
          pixels[j + 1] = gray; // Green
          pixels[j + 2] = gray; // Blue
        }
        tempCtx.putImageData(imageData, 0, 0);
        
        // Draw the black and white image
        ctx.drawImage(tempCanvas, x, y);
      }
      
      // Draw colonist name below photo (proportional font size)
      const nameFontSize = Math.max(8, photoSize * 0.1);
      ctx.font = `${nameFontSize}px "Press Start 2P", monospace`;
      ctx.fillStyle = '#cccccc';
      ctx.textAlign = 'center';
      ctx.fillText(colonist.profile?.name || 'Unknown', x + photoSize / 2, y + photoSize + photoSize * 0.133);
      
      // Draw subtle vignette around photo
      const gradient = ctx.createRadialGradient(
        x + photoSize / 2, y + photoSize / 2, photoSize * 0.3,
        x + photoSize / 2, y + photoSize / 2, photoSize * 0.6
      );
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, photoSize, photoSize);
    }
    
    ctx.restore();
  }
}
