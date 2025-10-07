/**
 * TimeSystem - Manages game time, day/night cycle, and speed control
 * 
 * Responsibilities:
 * - Day/night cycle
 * - Game speed (normal/fast-forward)
 * - Pause/resume
 * - Time-based calculations
 */

export class TimeSystem {
  private day = 1;
  private tDay = 0; // Time of day (0-1, where 0.5 is noon/transition to night)
  private dayLength = 180; // seconds per full day/night cycle
  private fastForward = 1; // Speed multiplier: 1 (normal) or 6 (fast)
  private paused = false;
  private prevIsNight = false;
  
  /**
   * Update time progression
   */
  update(dt: number): void {
    if (this.paused) return;
    
    const effectiveDt = dt * this.fastForward;
    this.tDay += effectiveDt / this.dayLength;
    
    // Advance to next day
    if (this.tDay >= 1) {
      this.tDay -= 1;
      this.day++;
    }
  }
  
  /**
   * Check if it's currently night time
   */
  isNight(): boolean {
    return this.tDay > 0.5;
  }
  
  /**
   * Check if night just started this frame
   */
  didNightJustStart(): boolean {
    const nightNow = this.isNight();
    const justStarted = nightNow && !this.prevIsNight;
    this.prevIsNight = nightNow;
    return justStarted;
  }
  
  /**
   * Toggle fast-forward mode
   */
  toggleFastForward(): void {
    this.fastForward = this.fastForward === 1 ? 6 : 1;
  }
  
  /**
   * Toggle pause
   */
  togglePause(): void {
    this.paused = !this.paused;
  }
  
  /**
   * Set pause state
   */
  setPaused(paused: boolean): void {
    this.paused = paused;
  }
  
  /**
   * Get effective delta time (accounting for fast-forward and pause)
   */
  getEffectiveDt(dt: number): number {
    if (this.paused) return 0;
    return dt * this.fastForward;
  }
  
  // Getters
  getDay(): number { return this.day; }
  getTimeOfDay(): number { return this.tDay; }
  getDayLength(): number { return this.dayLength; }
  getFastForward(): number { return this.fastForward; }
  isPaused(): boolean { return this.paused; }
  
  // Setters (for save/load)
  setDay(day: number): void { this.day = day; }
  setTimeOfDay(tDay: number): void { this.tDay = tDay; }
  setFastForward(speed: number): void { this.fastForward = speed; }
  
  /**
   * Reset to initial state
   */
  reset(): void {
    this.day = 1;
    this.tDay = 0;
    this.fastForward = 1;
    this.paused = false;
    this.prevIsNight = false;
  }
  
  /**
   * Get current hour (0-23) for display
   */
  getCurrentHour(): number {
    return Math.floor(this.tDay * 24);
  }
}
