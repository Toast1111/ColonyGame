import type { WorkGiver, WorkGiverContext, WorkCandidate } from './types';
import type { Building, Colonist } from '../types';

export const ConstructionWorkGiver: WorkGiver = {
  getCandidates(ctx: WorkGiverContext): WorkCandidate[] {
    const { game, colonist, getWorkPriority, canDoWork } = ctx;
    const out: WorkCandidate[] = [];
    if (!canDoWork('Construction')) return out;

    for (const b of game.buildings) {
      if (b.done) continue;
      
      // Check if building already has max crew working on it
      const maxCrew = game.reservationManager.getMaxCrew(b);
      const occupiedBy = game.colonists.filter((c: Colonist) => 
        c.alive && 
        c.state === 'build' && 
        c.target === b
      ).length;
      
      if (occupiedBy >= maxCrew) continue;

      const distance = Math.hypot(colonist.x - (b.x + b.w / 2), colonist.y - (b.y + b.h / 2));
      out.push({
        workType: 'Construction',
        task: 'build',
        target: b,
        distance,
        priority: getWorkPriority('Construction')
      });
    }

    return out;
  }
};
