import type { WorkGiver, WorkGiverContext, WorkCandidate } from '../workGivers/types';
import { WORK_GIVERS } from '../workGivers';

/**
 * WorkGiverManager
 * - Aggregates WorkGivers
 * - Provides a single entry point to obtain job candidates for a colonist
 * - Extension points: caching, throttling, per-frame budgets, reservations
 */
export class WorkGiverManager {
  private givers: WorkGiver[];

  // Basic hooks for future optimizations
  private lastQueryTick: number = 0;
  private cacheTTL: number = 0; // ms; 0 disables caching

  constructor(givers: WorkGiver[] = WORK_GIVERS) {
    this.givers = givers;
  }

  /** Replace the current giver list (e.g., for modding or testing) */
  public setGivers(givers: WorkGiver[]): void { this.givers = givers; }

  /** Get a copy of the current giver list */
  public getGivers(): WorkGiver[] { return [...this.givers]; }

  /**
   * Collect candidates from all registered work givers
   * Note: intentionally simple; add caching/budgeting once needed.
   */
  public getCandidates(ctx: WorkGiverContext): WorkCandidate[] {
    const results: WorkCandidate[] = [];
    for (const wg of this.givers) {
      try {
        const produced = wg.getCandidates(ctx) || [];
        if (produced && produced.length) results.push(...produced);
      } catch (e) {
        // Isolate failures of individual givers
        // Optionally: log in debug mode
      }
    }
    return results;
  }
}
