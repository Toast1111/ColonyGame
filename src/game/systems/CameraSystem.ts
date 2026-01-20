/**
 * CameraSystem - Manages camera position, zoom, and coordinate transformations
 * 
 * Responsibilities:
 * - Camera position (pan)
 * - Zoom level
 * - Screen-to-world coordinate conversion
 * - World-to-screen coordinate conversion
 * - Camera bounds/limits
 */

export interface Camera {
  x: number; // World x position of top-left of viewport
  y: number; // World y position of top-left of viewport
  zoom: number; // Zoom level (1 = normal, 2 = 2x zoomed in)
}

export class CameraSystem {
  private camera: Camera = {
    x: 0,
    y: 0,
    zoom: 1
  };
  
  private canvasWidth = 0;
  private canvasHeight = 0;
  private DPR = 1; // Device Pixel Ratio
  
  // Camera constraints
  private minZoom = 0.5;
  private maxZoom = 2.5;
  private panSpeed = 500; // pixels per second at zoom=1
  
  /**
   * Update canvas dimensions (call on resize)
   */
  setCanvasDimensions(width: number, height: number, dpr: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.DPR = dpr;
  }
  
  /**
   * Pan camera by delta pixels (in screen space)
   */
  pan(dx: number, dy: number): void {
    // Convert screen delta to world delta (accounting for zoom)
    this.camera.x += (dx * this.DPR) / this.camera.zoom;
    this.camera.y += (dy * this.DPR) / this.camera.zoom;
  }
  
  /**
   * Pan camera with delta time (for keyboard movement)
   */
  panWithSpeed(dx: number, dy: number, dt: number): void {
    const speed = this.panSpeed * dt / this.camera.zoom;
    this.camera.x += dx * speed;
    this.camera.y += dy * speed;
  }
  
  /**
   * Set camera position (world coordinates)
   */
  setPosition(x: number, y: number): void {
    this.camera.x = x;
    this.camera.y = y;
  }
  
  /**
   * Center camera on world position
   */
  centerOn(worldX: number, worldY: number): void {
    const viewportWidth = (this.canvasWidth / this.DPR) / this.camera.zoom;
    const viewportHeight = (this.canvasHeight / this.DPR) / this.camera.zoom;
    
    this.camera.x = worldX - viewportWidth / 2;
    this.camera.y = worldY - viewportHeight / 2;
  }
  
  /**
   * Zoom in/out by delta
   */
  zoom(delta: number): void {
    const oldZoom = this.camera.zoom;
    this.camera.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.camera.zoom + delta));
    
    // Adjust camera position to zoom toward center of screen
    if (oldZoom !== this.camera.zoom) {
      const centerX = this.camera.x + (this.canvasWidth / this.DPR) / (2 * oldZoom);
      const centerY = this.camera.y + (this.canvasHeight / this.DPR) / (2 * oldZoom);
      
      this.camera.x = centerX - (this.canvasWidth / this.DPR) / (2 * this.camera.zoom);
      this.camera.y = centerY - (this.canvasHeight / this.DPR) / (2 * this.camera.zoom);
    }
  }
  
  /**
   * Set zoom level directly
   */
  setZoom(zoom: number): void {
    this.camera.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
  }
  
  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX * this.DPR) / this.camera.zoom + this.camera.x,
      y: (screenY * this.DPR) / this.camera.zoom + this.camera.y
    };
  }
  
  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: ((worldX - this.camera.x) * this.camera.zoom) / this.DPR,
      y: ((worldY - this.camera.y) * this.camera.zoom) / this.DPR
    };
  }
  
  /**
   * Check if a world rectangle is visible in the viewport
   */
  isVisible(worldX: number, worldY: number, width: number, height: number): boolean {
    const viewportWidth = (this.canvasWidth / this.DPR) / this.camera.zoom;
    const viewportHeight = (this.canvasHeight / this.DPR) / this.camera.zoom;
    
    return !(
      worldX + width < this.camera.x ||
      worldX > this.camera.x + viewportWidth ||
      worldY + height < this.camera.y ||
      worldY > this.camera.y + viewportHeight
    );
  }
  
  // Getters
  getCamera(): Camera { return { ...this.camera }; }
  getX(): number { return this.camera.x; }
  getY(): number { return this.camera.y; }
  getZoom(): number { return this.camera.zoom; }
  
  // Direct camera access (for rendering transforms)
  getCameraRef(): Camera { return this.camera; }
  
  /**
   * Reset to initial position/zoom
   */
  reset(): void {
    this.camera.x = 0;
    this.camera.y = 0;
    this.camera.zoom = 1;
  }
  
  /**
   * Clamp camera position to stay within world bounds
   * Prevents camera from showing areas outside the game world
   */
  clampToWorld(worldWidth: number, worldHeight: number): void {
    const viewW = (this.canvasWidth / this.DPR) / this.camera.zoom;
    const viewH = (this.canvasHeight / this.DPR) / this.camera.zoom;
    const maxX = Math.max(0, worldWidth - viewW);
    const maxY = Math.max(0, worldHeight - viewH);
    
    // Fix NaN values
    if (!Number.isFinite(this.camera.x)) this.camera.x = 0;
    if (!Number.isFinite(this.camera.y)) this.camera.y = 0;
    
    // Clamp to bounds
    this.camera.x = Math.max(0, Math.min(maxX, this.camera.x));
    this.camera.y = Math.max(0, Math.min(maxY, this.camera.y));
  }
}
