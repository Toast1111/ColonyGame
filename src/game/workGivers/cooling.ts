import type { WorkGiver, WorkGiverContext, WorkCandidate } from './types';

/**
 * CoolingWorkGiver - DEPRECATED
 * Cooling is now handled passively by the smelter placing ingots on racks.
 * This work giver returns no tasks.
 */
export const CoolingWorkGiver: WorkGiver = {
  getCandidates(ctx: WorkGiverContext): WorkCandidate[] {
    // Cooling is now passive - no manual work needed
    return [];
  }
};
