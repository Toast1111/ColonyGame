/**
 * Performance Metrics System
 * 
 * Micro-profiler for tracking subsystem performance with:
 * - Per-frame timing for pathfinding, lighting, AI, and other systems
 * - Long task detection (tasks exceeding budget)
 * - Rolling averages for stable metrics
 * - Top offender tracking
 */

export interface SubsystemMetrics {
  pathfindingMs: number;
  lightingMs: number;
  aiMs: number;
  renderMs: number;
  otherMs: number;
  totalFrameMs: number;
}

export interface LongTask {
  subsystem: string;
  duration: number;
  timestamp: number;
  details?: string;
}

export class PerformanceMetrics {
  private static instance: PerformanceMetrics;

  // Current frame metrics
  public currentFrame: SubsystemMetrics = {
    pathfindingMs: 0,
    lightingMs: 0,
    aiMs: 0,
    renderMs: 0,
    otherMs: 0,
    totalFrameMs: 0,
  };

  // Rolling averages (last 60 frames)
  private readonly HISTORY_SIZE = 60;
  private history: SubsystemMetrics[] = [];
  
  // Long task tracking
  public longTasks: LongTask[] = [];
  private readonly MAX_LONG_TASKS = 100; // Keep last 100 long tasks
  public readonly BUDGET_MS = 2.0; // Default budget per subsystem

  // Performance counters
  public frameCount = 0;
  public droppedFrames = 0; // Frames that exceeded 16.67ms (60 FPS target)
  
  // Timing stack for nested measurements
  private timingStack: { subsystem: string; start: number }[] = [];
  
  // Last reset time for periodic logging
  public lastLogTime = performance.now();

  private constructor() {}

  public static getInstance(): PerformanceMetrics {
    if (!PerformanceMetrics.instance) {
      PerformanceMetrics.instance = new PerformanceMetrics();
    }
    return PerformanceMetrics.instance;
  }

  /**
   * Start timing a subsystem
   */
  public startTiming(subsystem: 'pathfinding' | 'lighting' | 'ai' | 'render' | 'other'): void {
    this.timingStack.push({ subsystem, start: performance.now() });
  }

  /**
   * End timing a subsystem and record the duration
   */
  public endTiming(details?: string): void {
    if (this.timingStack.length === 0) {
      console.warn('PerformanceMetrics: endTiming called without matching startTiming');
      return;
    }

    const { subsystem, start } = this.timingStack.pop()!;
    const duration = performance.now() - start;

    // Record in current frame
    switch (subsystem) {
      case 'pathfinding':
        this.currentFrame.pathfindingMs += duration;
        break;
      case 'lighting':
        this.currentFrame.lightingMs += duration;
        break;
      case 'ai':
        this.currentFrame.aiMs += duration;
        break;
      case 'render':
        this.currentFrame.renderMs += duration;
        break;
      case 'other':
        this.currentFrame.otherMs += duration;
        break;
    }

    // Track long tasks (exceeding budget)
    if (duration > this.BUDGET_MS) {
      this.recordLongTask(subsystem, duration, details);
    }
  }

  /**
   * Record a long task
   */
  private recordLongTask(subsystem: string, duration: number, details?: string): void {
    this.longTasks.push({
      subsystem,
      duration,
      timestamp: performance.now(),
      details,
    });

    // Keep only recent long tasks
    if (this.longTasks.length > this.MAX_LONG_TASKS) {
      this.longTasks.shift();
    }
  }

  /**
   * End the current frame and update metrics
   */
  public endFrame(totalFrameMs: number): void {
    this.currentFrame.totalFrameMs = totalFrameMs;
    
    // Track dropped frames (>16.67ms = below 60 FPS)
    if (totalFrameMs > 16.67) {
      this.droppedFrames++;
    }

    // Add to history
    this.history.push({ ...this.currentFrame });
    if (this.history.length > this.HISTORY_SIZE) {
      this.history.shift();
    }

    this.frameCount++;

    // Reset for next frame
    this.currentFrame = {
      pathfindingMs: 0,
      lightingMs: 0,
      aiMs: 0,
      renderMs: 0,
      otherMs: 0,
      totalFrameMs: 0,
    };
  }

  /**
   * Get average metrics over the history window
   */
  public getAverageMetrics(): SubsystemMetrics {
    if (this.history.length === 0) {
      return { ...this.currentFrame };
    }

    const sum: SubsystemMetrics = {
      pathfindingMs: 0,
      lightingMs: 0,
      aiMs: 0,
      renderMs: 0,
      otherMs: 0,
      totalFrameMs: 0,
    };

    for (const frame of this.history) {
      sum.pathfindingMs += frame.pathfindingMs;
      sum.lightingMs += frame.lightingMs;
      sum.aiMs += frame.aiMs;
      sum.renderMs += frame.renderMs;
      sum.otherMs += frame.otherMs;
      sum.totalFrameMs += frame.totalFrameMs;
    }

    const count = this.history.length;
    return {
      pathfindingMs: sum.pathfindingMs / count,
      lightingMs: sum.lightingMs / count,
      aiMs: sum.aiMs / count,
      renderMs: sum.renderMs / count,
      otherMs: sum.otherMs / count,
      totalFrameMs: sum.totalFrameMs / count,
    };
  }

  /**
   * Get the top N offenders from recent long tasks
   */
  public getTopOffenders(n: number = 5): LongTask[] {
    const sorted = [...this.longTasks].sort((a, b) => b.duration - a.duration);
    return sorted.slice(0, n);
  }

  /**
   * Get budget utilization percentage for each subsystem
   */
  public getBudgetUtilization(): Record<string, number> {
    const avg = this.getAverageMetrics();
    return {
      pathfinding: (avg.pathfindingMs / this.BUDGET_MS) * 100,
      lighting: (avg.lightingMs / this.BUDGET_MS) * 100,
      ai: (avg.aiMs / this.BUDGET_MS) * 100,
      render: (avg.renderMs / this.BUDGET_MS) * 100,
      other: (avg.otherMs / this.BUDGET_MS) * 100,
    };
  }

  /**
   * Get summary statistics for logging
   */
  public getSummary(): string {
    const avg = this.getAverageMetrics();
    const fps = this.history.length > 0 ? 1000 / avg.totalFrameMs : 0;
    const dropRate = this.frameCount > 0 ? (this.droppedFrames / this.frameCount) * 100 : 0;

    const lines: string[] = [
      '=== Performance Summary ===',
      `FPS: ${fps.toFixed(1)} | Frame: ${avg.totalFrameMs.toFixed(2)}ms | Dropped: ${dropRate.toFixed(1)}%`,
      `Subsystems (avg):`,
      `  Pathfinding: ${avg.pathfindingMs.toFixed(2)}ms (${((avg.pathfindingMs / this.BUDGET_MS) * 100).toFixed(0)}% budget)`,
      `  Lighting:    ${avg.lightingMs.toFixed(2)}ms (${((avg.lightingMs / this.BUDGET_MS) * 100).toFixed(0)}% budget)`,
      `  AI:          ${avg.aiMs.toFixed(2)}ms (${((avg.aiMs / this.BUDGET_MS) * 100).toFixed(0)}% budget)`,
      `  Render:      ${avg.renderMs.toFixed(2)}ms (${((avg.renderMs / this.BUDGET_MS) * 100).toFixed(0)}% budget)`,
      `  Other:       ${avg.otherMs.toFixed(2)}ms (${((avg.otherMs / this.BUDGET_MS) * 100).toFixed(0)}% budget)`,
    ];

    const topOffenders = this.getTopOffenders(3);
    if (topOffenders.length > 0) {
      lines.push('Top Offenders (last 100 tasks):');
      for (const task of topOffenders) {
        const detail = task.details ? ` (${task.details})` : '';
        lines.push(`  ${task.subsystem}: ${task.duration.toFixed(2)}ms${detail}`);
      }
    }

    lines.push('========================');
    return lines.join('\n');
  }

  /**
   * Reset all metrics
   */
  public reset(): void {
    this.currentFrame = {
      pathfindingMs: 0,
      lightingMs: 0,
      aiMs: 0,
      renderMs: 0,
      otherMs: 0,
      totalFrameMs: 0,
    };
    this.history = [];
    this.longTasks = [];
    this.frameCount = 0;
    this.droppedFrames = 0;
    this.lastLogTime = performance.now();
  }
}
