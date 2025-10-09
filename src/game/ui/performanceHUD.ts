/**
 * Performance HUD
 * 
 * On-screen dev overlay showing real-time performance metrics:
 * - FPS and frame time
 * - Subsystem timings and budget utilization
 * - Top performance offenders
 * - Simulation stats
 */

import { PerformanceMetrics } from '../../core/PerformanceMetrics';
import { SimulationClock } from '../../core/SimulationClock';
import { BudgetedExecutionManager } from '../../core/BudgetedExecution';
import type { Game } from '../Game';

export interface PerformanceHUDConfig {
  /** Show the HUD */
  visible: boolean;
  /** Position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' */
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Opacity (0-1) */
  opacity: number;
  /** Show detailed subsystem breakdown */
  showDetails: boolean;
  /** Show budget queue stats */
  showQueues: boolean;
}

export class PerformanceHUD {
  private config: PerformanceHUDConfig = {
    visible: false,
    position: 'top-right',
    opacity: 0.85,
    showDetails: true,
    showQueues: true,
  };

  private metrics = PerformanceMetrics.getInstance();
  private simClock = SimulationClock.getInstance();
  private budgetManager = BudgetedExecutionManager.getInstance();

  constructor(config?: Partial<PerformanceHUDConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Toggle HUD visibility
   */
  public toggle(): void {
    this.config.visible = !this.config.visible;
  }

  /**
   * Set HUD visibility
   */
  public setVisible(visible: boolean): void {
    this.config.visible = visible;
  }

  /**
   * Update HUD configuration
   */
  public configure(config: Partial<PerformanceHUDConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Draw the performance HUD
   */
  public draw(game: Game): void {
    if (!this.config.visible) return;

    const ctx = game.ctx;
    const scale = (v: number) => v * game.DPR * game.uiScale;
    
    ctx.save();

    // Calculate position
    const padding = scale(10);
    const width = scale(320);
    const lineHeight = scale(16);
    let x = padding;
    let y = padding;

    if (this.config.position === 'top-right') {
      x = game.canvas.width - width - padding;
    } else if (this.config.position === 'bottom-left') {
      y = game.canvas.height - padding;
    } else if (this.config.position === 'bottom-right') {
      x = game.canvas.width - width - padding;
      y = game.canvas.height - padding;
    }

    // Build content
    const lines = this.buildHUDContent();
    const height = lines.length * lineHeight + scale(20);

    // Adjust y for bottom positions
    if (this.config.position.startsWith('bottom')) {
      y -= height;
    }

    // Draw background
    ctx.fillStyle = `rgba(0, 0, 0, ${this.config.opacity})`;
    ctx.fillRect(x, y, width, height);

    // Draw border
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
    ctx.lineWidth = scale(2);
    ctx.strokeRect(x, y, width, height);

    // Draw title bar
    ctx.fillStyle = 'rgba(100, 200, 255, 0.3)';
    ctx.fillRect(x, y, width, lineHeight + scale(4));

    // Draw text
    ctx.fillStyle = '#ffffff';
    ctx.font = `${scale(12)}px monospace`;
    ctx.textBaseline = 'top';

    let currentY = y + scale(4);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Color code based on content
      if (line.startsWith('⚠') || line.includes('WARN')) {
        ctx.fillStyle = '#fbbf24';
      } else if (line.startsWith('✓') || line.includes('OK')) {
        ctx.fillStyle = '#4ade80';
      } else if (line.includes('OVER')) {
        ctx.fillStyle = '#f87171';
      } else if (i === 0) {
        ctx.fillStyle = '#60a5fa'; // Title
      } else {
        ctx.fillStyle = '#e5e7eb'; // Default
      }

      ctx.fillText(line, x + scale(6), currentY);
      currentY += lineHeight;
    }

    ctx.restore();
  }

  /**
   * Build HUD content lines
   */
  private buildHUDContent(): string[] {
    const lines: string[] = [];
    const avg = this.metrics.getAverageMetrics();
    const fps = avg.totalFrameMs > 0 ? 1000 / avg.totalFrameMs : 0;
    const simStats = this.simClock.getStats();
    const budgetUtil = this.metrics.getBudgetUtilization();

    // Title
    lines.push('📊 PERFORMANCE MONITOR');

    // FPS and frame time
    const fpsColor = fps >= 55 ? '✓' : fps >= 30 ? '⚠' : '✗';
    lines.push(`${fpsColor} FPS: ${fps.toFixed(1)} | Frame: ${avg.totalFrameMs.toFixed(1)}ms`);

    // Simulation stats
    lines.push(`⏱ Sim: ${simStats.simulationHz}Hz | α: ${simStats.alpha.toFixed(2)}`);

    if (this.config.showDetails) {
      lines.push(''); // Blank line
      lines.push('SUBSYSTEMS:');

      // Helper to format budget line
      const budgetLine = (name: string, ms: number, budget: number) => {
        const pct = (ms / budget) * 100;
        const status = pct > 100 ? 'OVER' : pct > 80 ? 'WARN' : 'OK';
        const bar = this.createBar(Math.min(pct, 100), 15);
        return `  ${name.padEnd(12)} ${ms.toFixed(2)}ms ${bar} ${pct.toFixed(0)}%`;
      };

      const budget = this.metrics.BUDGET_MS;
      lines.push(budgetLine('Pathfinding', avg.pathfindingMs, budget));
      lines.push(budgetLine('Lighting', avg.lightingMs, budget));
      lines.push(budgetLine('AI', avg.aiMs, budget));
      lines.push(budgetLine('Render', avg.renderMs, budget));
      lines.push(budgetLine('Other', avg.otherMs, budget));
    }

    // Queue stats
    if (this.config.showQueues) {
      const queueStats = this.budgetManager.getAllStats();
      if (queueStats.size > 0) {
        lines.push(''); // Blank line
        lines.push('QUEUES:');
        for (const [subsystem, stats] of queueStats) {
          if (stats.queueSize > 0) {
            lines.push(`  ${subsystem}: ${stats.queueSize} tasks`);
          }
        }
      }
    }

    // Top offenders
    const topOffenders = this.metrics.getTopOffenders(3);
    if (topOffenders.length > 0) {
      lines.push(''); // Blank line
      lines.push('TOP OFFENDERS:');
      for (const task of topOffenders) {
        const detail = task.details ? ` (${task.details})` : '';
        lines.push(`  ${task.subsystem}: ${task.duration.toFixed(1)}ms${detail}`);
      }
    }

    return lines;
  }

  /**
   * Create a simple text-based progress bar
   */
  private createBar(percent: number, width: number): string {
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
  }

  /**
   * Get current configuration
   */
  public getConfig(): PerformanceHUDConfig {
    return { ...this.config };
  }
}

// Singleton instance
let hudInstance: PerformanceHUD | null = null;

/**
 * Initialize the performance HUD
 */
export function initPerformanceHUD(config?: Partial<PerformanceHUDConfig>): PerformanceHUD {
  if (!hudInstance) {
    hudInstance = new PerformanceHUD(config);
  } else if (config) {
    hudInstance.configure(config);
  }
  return hudInstance;
}

/**
 * Get the performance HUD instance
 */
export function getPerformanceHUD(): PerformanceHUD | null {
  return hudInstance;
}

/**
 * Toggle performance HUD visibility
 */
export function togglePerformanceHUD(): void {
  if (hudInstance) {
    hudInstance.toggle();
  }
}

/**
 * Draw the performance HUD
 */
export function drawPerformanceHUD(game: Game): void {
  if (hudInstance) {
    hudInstance.draw(game);
  }
}
