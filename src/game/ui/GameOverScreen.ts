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
  private readonly CREDITS_SCROLL_SPEED = 50; // pixels per second
  private readonly CREDIT_LINE_HEIGHT = 150; // Increased spacing for cinematic large text
  
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
    
    // Fade in black overlay
    if (elapsed < this.FADE_DURATION) {
      this.fadeOpacity = Math.min(1.0, elapsed / this.FADE_DURATION);
    } else {
      this.fadeOpacity = 1.0;
    }
    
    // After guilt phase, scroll credits
    if (elapsed > this.TOTAL_BEFORE_CREDITS) {
      this.creditsScrollY += this.CREDITS_SCROLL_SPEED * dt;
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
      
      // Calculate vertical positions for stacking messages
      const centerY = h / 2;
      const lineSpacing = 90; // Space between lines
      
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
            
            // Different styling for each message
            if (msg.text === 'EVERYONE' || msg.text === 'IS DEAD') {
              // All caps messages - huge, bold, impact font style
              ctx.font = 'bold 72px Arial, sans-serif'; // Use system font for impact
              ctx.fillStyle = '#ff0000'; // Stark red
              
              // Add text shadow for more drama
              ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
              ctx.shadowBlur = 20;
              ctx.shadowOffsetX = 4;
              ctx.shadowOffsetY = 4;
              
              ctx.fillText(msg.text, w / 2, yPos);
            } else if (msg.text === 'YOU FAILED THEM') {
              // Accusatory message - medium impact
              ctx.font = 'bold 56px Arial, sans-serif';
              ctx.fillStyle = '#ffffff';
              
              ctx.shadowColor = 'rgba(255, 0, 0, 0.6)';
              ctx.shadowBlur = 15;
              ctx.shadowOffsetX = 3;
              ctx.shadowOffsetY = 3;
              
              ctx.fillText(msg.text, w / 2, yPos);
            } else {
              // Final message - softer, guilt-inducing
              ctx.font = 'italic 40px Georgia, serif'; // Serif for emotion
              ctx.fillStyle = '#cccccc';
              
              ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
              ctx.shadowBlur = 10;
              ctx.shadowOffsetX = 2;
              ctx.shadowOffsetY = 2;
              
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
      const startY = h - this.creditsScrollY + h * 0.2;
      
      // Draw each credit entry
      for (let i = 0; i < this.credits.length; i++) {
        const credit = this.credits[i];
        const y = startY + i * this.CREDIT_LINE_HEIGHT;
        
        // Only draw if visible
        if (y > -150 && y < h + 150) {
          // Title (role) - smaller gray text
          ctx.font = '28px "Press Start 2P", monospace';
          ctx.fillStyle = '#888888';
          ctx.fillText(credit.title, w / 2, y);
          
          // Name (HUGE CINEMATIC!)
          ctx.font = 'bold 64px "Press Start 2P", monospace';
          ctx.fillStyle = '#ffffff';
          
          // Add subtle glow for cinematic effect
          ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
          ctx.shadowBlur = 8;
          
          ctx.fillText(credit.name, w / 2, y + 50);
          
          // Reset shadow
          ctx.shadowBlur = 0;
          
          // Draw subtle dividing line below each entry
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(w / 2 - 300, y + 110);
          ctx.lineTo(w / 2 + 300, y + 110);
          ctx.stroke();
        }
      }
      
      // Check if credits finished scrolling
      const totalCreditsHeight = this.credits.length * this.CREDIT_LINE_HEIGHT;
      if (this.creditsScrollY > totalCreditsHeight + h) {
        // Credits finished - could add a "Press any key to restart" message
        ctx.font = '20px "Press Start 2P", monospace';
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
      ctx.font = '20px "Press Start 2P", monospace';
      ctx.fillStyle = '#888888';
      ctx.textAlign = 'center';
      ctx.fillText('(No fallen colonists to remember)', w / 2, h * 0.65);
      ctx.restore();
      return;
    }
    
    // Calculate grid layout for photos
    const photoSize = 120;
    const spacing = 20;
    const photosPerRow = Math.min(5, deadColonists.length);
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
      
      // Draw photo frame (dark border)
      ctx.fillStyle = '#222222';
      ctx.fillRect(x - 4, y - 4, photoSize + 8, photoSize + 8);
      
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
        
        // Draw the actual colonist avatar at larger size
        // drawColonistAvatar signature: (ctx, x, y, colonist, size, isSelected)
        drawColonistAvatar(tempCtx, photoSize / 2, photoSize / 2, colonist, 32, false);
        
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
      
      // Draw colonist name below photo
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.fillStyle = '#cccccc';
      ctx.textAlign = 'center';
      ctx.fillText(colonist.profile?.name || 'Unknown', x + photoSize / 2, y + photoSize + 16);
      
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
