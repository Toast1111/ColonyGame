/**
 * Toast Notification System
 * 
 * Shows temporary notification messages at the bottom of the screen.
 * Styled via style.css (#toast selector).
 */

export class ToastManager {
  private element: HTMLDivElement;
  private hideTimeout: number | null = null;

  constructor() {
    this.element = this.createElement();
    document.body.appendChild(this.element);
  }

  private createElement(): HTMLDivElement {
    const toast = document.createElement('div');
    toast.id = 'toast';
    // Styles come from style.css
    return toast;
  }

  /**
   * Show a toast notification
   * @param message The message to display
   * @param duration How long to show the message (ms), default 3000
   */
  show(message: string, duration: number = 3000): void {
    // Clear any existing timeout
    if (this.hideTimeout !== null) {
      clearTimeout(this.hideTimeout);
    }

    // Update content and show
    this.element.textContent = message;
    this.element.style.opacity = '1';
    this.element.style.pointerEvents = 'auto';

    // Auto-hide after duration
    this.hideTimeout = window.setTimeout(() => {
      this.hide();
    }, duration);
  }

  /**
   * Hide the toast immediately
   */
  hide(): void {
    this.element.style.opacity = '0';
    this.element.style.pointerEvents = 'none';
    
    if (this.hideTimeout !== null) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  /**
   * Get the toast element (for testing or manual manipulation)
   */
  getElement(): HTMLDivElement {
    return this.element;
  }
}
