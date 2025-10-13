/**
 * Mobile Controls Overlay
 * 
 * Touch-friendly control buttons for mobile devices.
 * Auto-hidden on desktop via CSS media queries.
 */

export interface MobileControlsCallbacks {
  onErase: () => void;
  onPause: () => void;
  onFastForward: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export class MobileControls {
  private container: HTMLDivElement;
  private buttons: {
    erase: HTMLButtonElement;
    pause: HTMLButtonElement;
    fastForward: HTMLButtonElement;
    zoomIn: HTMLButtonElement;
    zoomOut: HTMLButtonElement;
  };

  constructor(callbacks: MobileControlsCallbacks) {
    this.container = this.createContainer();
    this.buttons = this.createButtons(callbacks);
    
    // Add main control buttons to container
    this.container.appendChild(this.buttons.erase);
    this.container.appendChild(this.buttons.pause);
    this.container.appendChild(this.buttons.fastForward);
    
    // Zoom controls in separate container
    const zoomContainer = this.createZoomContainer();
    zoomContainer.appendChild(this.buttons.zoomIn);
    zoomContainer.appendChild(this.buttons.zoomOut);
    this.container.appendChild(zoomContainer);
    
    document.body.appendChild(this.container);
  }

  private createContainer(): HTMLDivElement {
    const div = document.createElement('div');
    div.id = 'mobileControls';
    // Styles come from style.css
    // Will be hidden on desktop via media queries
    return div;
  }

  private createZoomContainer(): HTMLDivElement {
    const div = document.createElement('div');
    div.className = 'zoom';
    return div;
  }

  private createButton(id: string, emoji: string, title: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.id = id;
    btn.textContent = emoji;
    btn.title = title;
    btn.onclick = onClick;
    return btn;
  }

  private createButtons(callbacks: MobileControlsCallbacks) {
    return {
      erase: this.createButton('mc-erase', '🗑️', 'Erase Mode', callbacks.onErase),
      pause: this.createButton('mc-pause', '⏸️', 'Pause', callbacks.onPause),
      fastForward: this.createButton('mc-ff', '⏩', 'Fast Forward', callbacks.onFastForward),
      zoomIn: this.createButton('mc-zoom-in', '＋', 'Zoom In', callbacks.onZoomIn),
      zoomOut: this.createButton('mc-zoom-out', '－', 'Zoom Out', callbacks.onZoomOut),
    };
  }

  /**
   * Show mobile controls
   */
  show(): void {
    this.container.hidden = false;
  }

  /**
   * Hide mobile controls
   */
  hide(): void {
    this.container.hidden = true;
  }

  /**
   * Get the container element
   */
  getElement(): HTMLDivElement {
    return this.container;
  }

  /**
   * Update pause button icon based on game state
   */
  setPauseState(paused: boolean): void {
    this.buttons.pause.textContent = paused ? '▶️' : '⏸️';
    this.buttons.pause.title = paused ? 'Resume' : 'Pause';
    this.buttons.pause.classList.toggle('active', paused);
  }

  /**
   * Update fast forward button appearance
   */
  setFastForwardState(active: boolean): void {
    this.buttons.fastForward.classList.toggle('active', active);
  }
  
  /**
   * Update erase button appearance for toggle state
   */
  setEraseState(active: boolean): void {
    this.buttons.erase.classList.toggle('active', active);
  }
}
