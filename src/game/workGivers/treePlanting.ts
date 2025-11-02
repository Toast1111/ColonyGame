import type { WorkGiver, WorkGiverContext, WorkCandidate } from './types';

export const TreePlantingWorkGiver: WorkGiver = {
  getCandidates(ctx: WorkGiverContext): WorkCandidate[] {
    const { game, colonist, getWorkPriority, canDoWork } = ctx;
    const out: WorkCandidate[] = [];
    
    if (!canDoWork('Growing')) return out;

    // Check if tree sowing research is completed
    const researchManager = (game as any).researchManager;
    if (!researchManager || !researchManager.isCompleted('tree_sowing')) return out;

    // Get tree growing manager
    const treeManager = (game as any).treeManager;
    if (!treeManager) return out;

    // Find empty spots that need planting
    const emptySpot = treeManager.findClosestEmptySpot({ x: colonist.x, y: colonist.y });
    if (emptySpot) {
      out.push({
        workType: 'Growing',
        task: 'plantTree',
        target: {
          zoneId: emptySpot.zone.id,
          spotIndex: emptySpot.spotIndex,
          x: emptySpot.spot.x,
          y: emptySpot.spot.y
        },
        distance: emptySpot.distance,
        priority: getWorkPriority('Growing')
      });
    }

    // Also look for mature trees ready for harvest (if wood is needed)
    const needsWood = game.RES.wood < Math.max(10, game.colonists.length * 5);
    if (needsWood) {
      const harvestSpot = treeManager.findClosestHarvestableSpot({ x: colonist.x, y: colonist.y });
      if (harvestSpot) {
        out.push({
          workType: 'Growing',
          task: 'harvestPlantedTree',
          target: {
            zoneId: harvestSpot.zone.id,
            spotIndex: harvestSpot.spotIndex,
            x: harvestSpot.spot.x,
            y: harvestSpot.spot.y
          },
          distance: harvestSpot.distance,
          priority: getWorkPriority('Growing')
        });
      }
    }

    return out;
  }
};