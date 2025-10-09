/**
 * Simulation Clock System
 * 
 * Implements fixed timestep simulation with interpolated rendering:
 * - Simulation runs at fixed 20-30 Hz (configurable)
 * - Rendering runs at monitor refresh rate
 * - Provides interpolation alpha for smooth visual updates
 * 
 * This decouples simulation determinism from rendering performance.
 */

export interface SimulationClockConfig {
  /** Target simulation rate in Hz (default: 30) */
  simulationHz: number;
  /** Maximum frame time to prevent spiral of death (default: 0.25s) */
  maxFrameTime: number;
}

export class SimulationClock {
  private static instance: SimulationClock;

  // Configuration
  private config: SimulationClockConfig;
  
  // Timing state
  private lastFrameTime: number = performance.now();
  private accumulator: number = 0;
  
  // Derived values
  private fixedDeltaTime: number; // Fixed timestep in seconds
  private fixedDeltaTimeMs: number; // Fixed timestep in milliseconds
  
  // Interpolation
  private alpha: number = 0; // 0-1 value for interpolation between simulation states
  
  // Statistics
  public simulationSteps = 0;
  public renderFrames = 0;
  public lastSimulationTime = 0; // Last simulation step duration

  private constructor(config?: Partial<SimulationClockConfig>) {
    this.config = {
      simulationHz: config?.simulationHz ?? 30,
      maxFrameTime: config?.maxFrameTime ?? 0.25,
    };

    this.fixedDeltaTime = 1.0 / this.config.simulationHz;
    this.fixedDeltaTimeMs = this.fixedDeltaTime * 1000;
  }

  public static getInstance(config?: Partial<SimulationClockConfig>): SimulationClock {
    if (!SimulationClock.instance) {
      SimulationClock.instance = new SimulationClock(config);
    }
    return SimulationClock.instance;
  }

  /**
   * Update the clock and determine how many simulation steps to run
   * Returns the number of simulation steps that should be executed this frame
   */
  public tick(currentTime: number): number {
    const frameTime = Math.min(
      (currentTime - this.lastFrameTime) / 1000,
      this.config.maxFrameTime
    );
    
    this.lastFrameTime = currentTime;
    this.accumulator += frameTime;

    // Count how many simulation steps we need to run
    let steps = 0;
    while (this.accumulator >= this.fixedDeltaTime) {
      this.accumulator -= this.fixedDeltaTime;
      steps++;
    }

    // Calculate interpolation alpha for rendering
    this.alpha = this.accumulator / this.fixedDeltaTime;

    return steps;
  }

  /**
   * Run a simulation step callback
   * Should be called once per simulation step determined by tick()
   */
  public runSimulationStep(callback: (dt: number) => void): void {
    const start = performance.now();
    callback(this.fixedDeltaTime);
    this.lastSimulationTime = performance.now() - start;
    this.simulationSteps++;
  }

  /**
   * Get interpolation alpha for smooth rendering
   * Value between 0 and 1 indicating position between simulation steps
   */
  public getAlpha(): number {
    return this.alpha;
  }

  /**
   * Get fixed simulation timestep in seconds
   */
  public getFixedDeltaTime(): number {
    return this.fixedDeltaTime;
  }

  /**
   * Get fixed simulation timestep in milliseconds
   */
  public getFixedDeltaTimeMs(): number {
    return this.fixedDeltaTimeMs;
  }

  /**
   * Get target simulation rate in Hz
   */
  public getSimulationHz(): number {
    return this.config.simulationHz;
  }

  /**
   * Update simulation rate (e.g., for game speed changes)
   */
  public setSimulationHz(hz: number): void {
    this.config.simulationHz = hz;
    this.fixedDeltaTime = 1.0 / hz;
    this.fixedDeltaTimeMs = this.fixedDeltaTime * 1000;
  }

  /**
   * Increment render frame counter
   */
  public recordRenderFrame(): void {
    this.renderFrames++;
  }

  /**
   * Get statistics
   */
  public getStats(): {
    simulationHz: number;
    actualSimRate: number;
    actualRenderRate: number;
    alpha: number;
    lastSimMs: number;
  } {
    // These would need to be calculated over a time window for accuracy
    // For now, return simple values
    return {
      simulationHz: this.config.simulationHz,
      actualSimRate: this.config.simulationHz, // Would need time window tracking
      actualRenderRate: 60, // Would need time window tracking
      alpha: this.alpha,
      lastSimMs: this.lastSimulationTime,
    };
  }

  /**
   * Reset the clock (useful for pause/unpause)
   */
  public reset(): void {
    this.lastFrameTime = performance.now();
    this.accumulator = 0;
    this.alpha = 0;
  }
}

/**
 * Helper class for interpolating entity positions between simulation steps
 */
export class PositionInterpolator {
  /**
   * Interpolate between two positions using alpha
   */
  public static interpolate(
    prevX: number,
    prevY: number,
    currentX: number,
    currentY: number,
    alpha: number
  ): { x: number; y: number } {
    return {
      x: prevX + (currentX - prevX) * alpha,
      y: prevY + (currentY - prevY) * alpha,
    };
  }

  /**
   * Interpolate a single value
   */
  public static interpolateValue(prev: number, current: number, alpha: number): number {
    return prev + (current - prev) * alpha;
  }

  /**
   * Interpolate rotation (handles wrapping at 2π)
   */
  public static interpolateRotation(prevRad: number, currentRad: number, alpha: number): number {
    // Normalize angles to [0, 2π]
    const normalize = (angle: number) => {
      while (angle < 0) angle += Math.PI * 2;
      while (angle >= Math.PI * 2) angle -= Math.PI * 2;
      return angle;
    };

    const prev = normalize(prevRad);
    const current = normalize(currentRad);

    // Find shortest path
    let diff = current - prev;
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;

    return normalize(prev + diff * alpha);
  }
}
