/**
 * Research Work Giver
 * 
 * Assigns colonists to work at research benches
 */

import type { WorkGiver, WorkGiverContext, WorkCandidate } from './types';
import type { Building } from '../types';

export const ResearchWorkGiver: WorkGiver = {
  getCandidates(ctx: WorkGiverContext): WorkCandidate[] {
    const { game, colonist, getWorkPriority, canDoWork } = ctx;
    
    // Check if research work is enabled for this colonist
    if (!canDoWork('Research')) return [];
    
    // Check if there's active research
    if (!game.researchManager?.getCurrentResearch()) return [];
    
    const candidates: WorkCandidate[] = [];
    
    // Find all available research benches
    const benches = game.buildings.filter((b: Building) => 
      b.kind === 'research_bench' && 
      b.done &&
      !game.reservationManager.getInsideCount(b) // Not occupied
    );
    
    for (const bench of benches) {
      const centerX = bench.x + bench.w / 2;
      const centerY = bench.y + bench.h / 2;
      const distance = Math.hypot(colonist.x - centerX, colonist.y - centerY);
      
      candidates.push({
        task: 'research' as any, // Will be handled in seekTask
        target: bench,
        distance,
        priority: getWorkPriority('Research'),
        workType: 'Research'
      });
    }
    
    return candidates;
  }
};
