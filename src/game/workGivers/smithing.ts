import type { WorkGiver, WorkGiverContext, WorkCandidate } from './types';

// Helper function to determine what weapons can be crafted
function getCraftableWeapons(floorItems: any[], game: any): Array<{ type: string; materials: Record<string, number>; value: number }> {
  const weapons: Array<{ type: string; materials: Record<string, number>; value: number }> = [];
  
  // Define weapon recipes (materials needed)
  const recipes = {
    'Knife': { materials: { steel_ingot: 1 }, value: 30 },
    'Gladius': { materials: { steel_ingot: 2 }, value: 150 },
    'Mace': { materials: { steel_ingot: 3 }, value: 180 }
  };
  
  // Count available materials
  const availableMaterials: Record<string, number> = {};
  for (const item of floorItems) {
    if (item.type.endsWith('_ingot')) {
      availableMaterials[item.type] = (availableMaterials[item.type] || 0) + item.quantity;
    }
  }
  
  // Check each recipe to see if we have enough materials
  for (const [weaponType, recipe] of Object.entries(recipes)) {
    let canCraft = true;
    for (const [material, needed] of Object.entries(recipe.materials)) {
      if ((availableMaterials[material] || 0) < needed) {
        canCraft = false;
        break;
      }
    }
    
    if (canCraft) {
      // Also check if we don't already have too many of this weapon type
      const existingWeapons = countExistingWeapons(game, weaponType);
      const colonistCount = game.colonists.filter((c: any) => c.alive).length;
      
      // Don't craft more weapons than we have colonists + 2 spares
      if (existingWeapons < colonistCount + 2) {
        weapons.push({
          type: weaponType,
          materials: recipe.materials,
          value: recipe.value
        });
      }
    }
  }
  
  // Sort by value (craft more valuable weapons first)
  weapons.sort((a, b) => b.value - a.value);
  
  return weapons;
}

// Helper function to count existing weapons of a type
function countExistingWeapons(game: any, weaponType: string): number {
  let count = 0;
  
  // Count equipped weapons
  for (const colonist of game.colonists) {
    if (colonist.inventory?.equipped?.weapon?.defName === weaponType) {
      count++;
    }
  }
  
  // Count weapons on the floor
  const rim = (game as any).itemManager;
  if (rim) {
    const floorItems = rim.floorItems.getAllItems();
    for (const item of floorItems) {
      if (item.type === weaponType.toLowerCase()) {
        count += item.quantity;
      }
    }
  }
  
  // Count weapons in stockpiles
  // TODO: Add stockpile weapon counting when inventory system is expanded
  
  return count;
}

export const SmithingWorkGiver: WorkGiver = {
  getCandidates(ctx: WorkGiverContext): WorkCandidate[] {
    const { game, colonist, getWorkPriority, canDoWork } = ctx;
    const out: WorkCandidate[] = [];
    
    // Check if smithing research is completed
    const researchManager = (game as any).researchManager;
    if (!researchManager || !researchManager.isCompleted('smithing')) return out;
    
    // Check if colonist can do crafting work
    if (!canDoWork('Craft')) return out;

    // Check if there are metal ingots available on the floor for smithing
    const rim = (game as any).itemManager;
    if (!rim) return out;
    
    // Get all floor items and check for ingots needed for smithing
    const allFloorItems = rim.floorItems.getAllItems();
    
    // Count available metal ingots - weapons require different amounts
    const ingotTypes = ['copper_ingot', 'steel_ingot', 'silver_ingot', 'gold_ingot'];
    const totalIngots = allFloorItems
      .filter((item: any) => ingotTypes.includes(item.type) && item.quantity > 0)
      .reduce((sum: number, item: any) => sum + item.quantity, 0);
    
    if (totalIngots < 1) return out; // Need at least 1 ingot to craft basic weapons

    // Find available smithing benches
    const smithingBenches = game.buildings.filter((b: any) => 
      b.kind === 'smithing_bench' && 
      b.done &&
      (!b.smithingColonist || b.smithingColonist === colonist.id)
    );

    if (smithingBenches.length > 0) {
      // Find closest available smithing bench
      const availableBench = smithingBenches.reduce((closest: any, bench: any) => {
        if (!closest) return bench;
        const d1 = Math.hypot(colonist.x - (bench.x + bench.w / 2), colonist.y - (bench.y + bench.h / 2));
        const d2 = Math.hypot(colonist.x - (closest.x + closest.w / 2), colonist.y - (closest.y + closest.h / 2));
        return d1 < d2 ? bench : closest;
      }, null);
      
      if (availableBench) {
        // Check what weapons we can craft based on available materials and current inventory
        const craftableWeapons = getCraftableWeapons(allFloorItems, game);
        
        if (craftableWeapons.length > 0) {
          const distance = Math.hypot(
            colonist.x - (availableBench.x + availableBench.w / 2), 
            colonist.y - (availableBench.y + availableBench.h / 2)
          );
          
          // Pick the most valuable weapon to craft
          const weaponToCraft = craftableWeapons[0];
          
          // Store weapon crafting data in the building temporarily
          availableBench.pendingSmithing = {
            weaponType: weaponToCraft.type,
            materials: weaponToCraft.materials
          };
          
          out.push({
            workType: 'Craft',
            task: 'smithing',
            target: availableBench,
            distance,
            priority: getWorkPriority('Craft')
          });
        }
      }
    }

    return out;
  }
};