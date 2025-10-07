/**
 * InputManager - Handles all user input (mouse, keyboard, touch)
 * 
 * Responsibilities:
 * - Track mouse/touch position and state
 * - Track keyboard state
 * - Handle touch gestures (pan, pinch-zoom)
 * - Convert screen coordinates to world coordinates
 * - Provide input state query API
 */

export interface MouseState {
  x: number;  // Screen x
  y: number;  // Screen y
  wx: number; // World x
  wy: number; // World y
  down: boolean;  // Left mouse button down
  rdown: boolean; // Right mouse button down
}

export class InputManager {
  // Mouse state
  private mouse: MouseState = {
    x: 0,
    y: 0,
    wx: 0,
    wy: 0,
    down: false,
    rdown: false
  };
  
  // Keyboard state
  private keyState: Record<string, boolean> = {};
  private once = new Set<string>(); // For one-time key press detection
  
  // Touch gesture state
  private touchLastPan: { x: number; y: number } | null = null;
  private touchLastDist: number | null = null;
  
  // Input type detection
  private lastInputWasTouch = false;
  
  /**
   * Update mouse world coordinates
   * Call this when camera moves or mouse moves
   */
  updateMouseWorldCoords(screenToWorld: (sx: number, sy: number) => { x: number; y: number }): void {
    const world = screenToWorld(this.mouse.x, this.mouse.y);
    this.mouse.wx = world.x;
    this.mouse.wy = world.y;
  }
  
  /**
   * Set mouse screen position
   */
  setMousePosition(x: number, y: number): void {
    this.mouse.x = x;
    this.mouse.y = y;
  }
  
  /**
   * Set mouse button state
   */
  setMouseDown(down: boolean): void {
    this.mouse.down = down;
  }
  
  setMouseRightDown(rdown: boolean): void {
    this.mouse.rdown = rdown;
  }
  
  /**
   * Get mouse state (read-only reference)
   */
  getMouse(): Readonly<MouseState> {
    return this.mouse;
  }
  
  /**
   * Get mutable mouse reference (for backward compatibility)
   */
  getMouseRef(): MouseState {
    return this.mouse;
  }
  
  // === Keyboard Input ===
  
  /**
   * Set key state
   */
  setKeyState(key: string, pressed: boolean): void {
    this.keyState[key] = pressed;
    if (!pressed) {
      this.once.delete(key); // Reset one-time press when key released
    }
  }
  
  /**
   * Check if key is currently pressed
   */
  isKeyPressed(key: string): boolean {
    return !!this.keyState[key];
  }
  
  /**
   * Check if key was just pressed (one-time trigger)
   */
  keyPressed(key: string): boolean {
    if (this.keyState[key] && !this.once.has(key)) {
      this.once.add(key);
      return true;
    }
    return false;
  }
  
  /**
   * Get keyboard state reference (for direct access)
   */
  getKeyStateRef(): Record<string, boolean> {
    return this.keyState;
  }
  
  // === Touch Gesture Support ===
  
  /**
   * Set touch pan state
   */
  setTouchPan(pos: { x: number; y: number } | null): void {
    this.touchLastPan = pos;
  }
  
  getTouchPan(): { x: number; y: number } | null {
    return this.touchLastPan;
  }
  
  /**
   * Set touch pinch distance
   */
  setTouchDist(dist: number | null): void {
    this.touchLastDist = dist;
  }
  
  getTouchDist(): number | null {
    return this.touchLastDist;
  }
  
  // === Input Type Detection ===
  
  setLastInputWasTouch(wasTouch: boolean): void {
    this.lastInputWasTouch = wasTouch;
  }
  
  wasLastInputTouch(): boolean {
    return this.lastInputWasTouch;
  }
  
  /**
   * Reset all input state
   */
  reset(): void {
    this.mouse = { x: 0, y: 0, wx: 0, wy: 0, down: false, rdown: false };
    this.keyState = {};
    this.once = new Set<string>();
    this.touchLastPan = null;
    this.touchLastDist = null;
    this.lastInputWasTouch = false;
  }
}
