/**
 * Help Panel - Game instructions and controls
 * 
 * Shows keyboard shortcuts, mobile controls, and game mechanics.
 * Toggled with 'H' key or help button.
 */

export class HelpPanel {
  private element: HTMLDivElement;

  constructor() {
    this.element = this.createElement();
    this.element.innerHTML = this.getHelpContent();
    document.body.appendChild(this.element);
  }

  private createElement(): HTMLDivElement {
    const help = document.createElement('div');
    help.id = 'help';
    help.hidden = true;
    // Styles come from style.css
    return help;
  }

  private getHelpContent(): string {
    return `
      <h2>How to play</h2>
      <div><b>Goal:</b> Gather wood & stone, build farms for food, add houses for pop cap; survive nightly raids with turrets/walls.</div>
      
      <div style="margin-top: 12px;"><b>📚 Tutorial:</b></div>
      <div style="margin-left: 16px;">
        <button id="btnReplayTutorial" style="padding: 8px 16px; margin: 4px 0; cursor: pointer; background: #4a5568; color: white; border: none; border-radius: 4px;">
          Replay Tutorial
        </button>
      </div>
      
      <div style="margin-top: 12px;"><b>🎮 Controls:</b></div>
      <div style="margin-left: 16px;">
        • <b>B</b> - Build tab | <b>P</b> - Work tab | <b>H</b> - Help (this panel)<br>
        • <b>ESC</b> - Close menus/Cancel action<br>
        • <b>Space</b> - Pause/Resume | <b>F</b> - Fast forward<br>
        • <b>WASD</b> - Pan camera | <b>+/-</b> - Zoom<br>
        • <b>LMB</b> - Select/Place | <b>RMB</b> - Context menu/Cancel<br>
        • <b>~</b> - Debug console
      </div>
      
      <div style="margin-top: 12px;"><b>📱 Mobile:</b></div>
      <div style="margin-left: 16px;">
        • Touch controls appear at bottom<br>
        • Long-press colonist for context menu<br>
        • Pinch to zoom, drag to pan
      </div>
      
      <div style="margin-top: 12px;"><b>🔧 Debug:</b></div>
      <div style="margin-left: 16px;">
        • <b>M</b> - Performance HUD | <b>G</b> - Nav grid<br>
        • <b>J</b> - Colonist info | <b>R</b> - Regions | <b>T</b> - Terrain
      </div>
    `;
  }

  /**
   * Attach event listeners for tutorial button
   */
  private attachEventListeners(): void {
    const btnReplayTutorial = document.getElementById('btnReplayTutorial');
    if (btnReplayTutorial) {
      btnReplayTutorial.addEventListener('click', () => {
        const game = (window as any).game;
        if (game && game.tutorialSystem) {
          this.hide(); // Close help panel
          game.tutorialSystem.start();
        }
      });
    }
  }

  /**
   * Toggle help panel visibility
   */
  toggle(): void {
    this.element.hidden = !this.element.hidden;
    
    // Attach event listeners when showing
    if (!this.element.hidden) {
      // Need to wait for DOM update
      setTimeout(() => this.attachEventListeners(), 0);
    }
    
    try { (window as any).game?.audioManager?.play(this.element.hidden ? 'ui.panel.close' : 'ui.panel.open'); } catch {}
  }

  /**
   * Show help panel
   */
  show(): void {
    this.element.hidden = false;
    setTimeout(() => this.attachEventListeners(), 0);
    try { (window as any).game?.audioManager?.play('ui.panel.open'); } catch {}
  }

  /**
   * Hide help panel
   */
  hide(): void {
    this.element.hidden = true;
    try { (window as any).game?.audioManager?.play('ui.panel.close'); } catch {}
  }

  /**
   * Get the help element (for external access)
   */
  getElement(): HTMLDivElement {
    return this.element;
  }
}
