/**
 * Smithing State Handler
 * 
 * Handles the complete smithing workflow:
 * 1. Collect required materials (steel_ingot) from floor
 * 2. Move to smithing bench
 * 3. Craft weapons (Gladius, Mace, or Knife) based on demand
 * 4. Drop crafted weapon on floor next to bench
 */

import type { Colonist, ColonistState } from '../../types';
import type { Game } from '../../Game';
import type { Building } from '../../types';
import type { ItemType } from '../../types/items';
import { skillLevel, skillWorkSpeedMultiplier, grantSkillXP } from '../../skills/skills';

// Smithing recipes - each recipe defines materials needed and result
interface SmithingRecipe {
  result: ItemType;
  materials: { type: ItemType; quantity: number }[];
  craftTime: number; // Base craft time in seconds
  skillXP: number;
}

const SMITHING_RECIPES: Record<string, SmithingRecipe> = {
  gladius: {
    result: 'gladius',
    materials: [{ type: 'steel_ingot', quantity: 2 }],
    craftTime: 12, // 12 seconds base
    skillXP: 25
  },
  mace: {
    result: 'mace', 
    materials: [{ type: 'steel_ingot', quantity: 3 }],
    craftTime: 15, // 15 seconds base
    skillXP: 30
  },
  knife: {
    result: 'knife',
    materials: [{ type: 'steel_ingot', quantity: 1 }],
    craftTime: 8, // 8 seconds base
    skillXP: 15
  }
};

export function updateSmithingState(
  c: Colonist,
  game: Game,
  dt: number,
  changeState: (newState: ColonistState, reason?: string) => void
): void {
  const smithingBench = c.target as Building;
  
  // Validate smithing bench still exists and is usable
  if (!smithingBench || smithingBench.kind !== 'smithing_bench' || !smithingBench.done) {
    abandonSmithing(c, game, changeState, 'smithing bench no longer available');
    return;
  }
  
  // Timeout check - if stuck for too long, abandon smithing
  if ((c.stateSince ?? 0) > 60) {
    console.log(`Smithing timeout after ${(c.stateSince ?? 0).toFixed(1)}s, abandoning`);
    abandonSmithing(c, game, changeState, 'smithing timeout');
    if (smithingBench.smithingColonist === c.id) {
      smithingBench.smithingColonist = undefined;
      smithingBench.smithingProgress = 0;
      smithingBench.smithingRecipe = undefined;
    }
    return;
  }
  
  const pt = { x: smithingBench.x + smithingBench.w / 2, y: smithingBench.y + smithingBench.h / 2 };
  const distance = Math.hypot(c.x - pt.x, c.y - pt.y);
  
  // Phase 1: Determine what to craft if not already decided
  if (!smithingBench.smithingRecipe) {
    const recipeToMake = determineRecipeToCraft(game);
    if (!recipeToMake) {
      abandonSmithing(c, game, changeState, 'no recipe to craft');
      return;
    }
    smithingBench.smithingRecipe = recipeToMake;
  }
  
  const recipe = SMITHING_RECIPES[smithingBench.smithingRecipe];
  if (!recipe) {
    abandonSmithing(c, game, changeState, 'invalid recipe');
    return;
  }
  
  // Phase 2: Collect materials if we don't have them
  if (!hasRequiredMaterials(c, recipe)) {
    handleMaterialCollection(c, game, dt, recipe, changeState);
    return;
  }
  
  // Phase 3: Move to smithing bench with materials
  if (distance > 20) {
    game.moveAlongPath(c, dt, pt, 20);
    return;
  }
  
  // Phase 4: Craft weapon at the smithing bench
  handleSmithing(c, game, dt, smithingBench, recipe, changeState);
}

/**
 * Determine which recipe to craft based on current weapon demand
 */
function determineRecipeToCraft(game: Game): string | null {
  const rim = game.itemManager;
  if (!rim) return null;
  
  // Count existing weapons on floor
  const allFloorItems = rim.floorItems.getAllItems();
  const weaponCounts = {
    gladius: allFloorItems.filter((item: any) => item.type === 'gladius').reduce((sum: number, item: any) => sum + item.quantity, 0),
    mace: allFloorItems.filter((item: any) => item.type === 'mace').reduce((sum: number, item: any) => sum + item.quantity, 0),
    knife: allFloorItems.filter((item: any) => item.type === 'knife').reduce((sum: number, item: any) => sum + item.quantity, 0)
  };
  
  // Count colonists (demand roughly equals colonist count)
  const colonistCount = game.state.colonists.length;
  
  // Priority: Gladius > Mace > Knife (based on combat effectiveness)
  // But craft what's most needed first
  if (weaponCounts.gladius < Math.ceil(colonistCount * 0.6)) {
    return 'gladius'; // Primary weapon
  }
  if (weaponCounts.mace < Math.ceil(colonistCount * 0.3)) {
    return 'mace'; // Heavy weapon for tough enemies
  }
  if (weaponCounts.knife < Math.ceil(colonistCount * 0.8)) {
    return 'knife'; // Backup/utility weapon
  }
  
  // Default to gladius if all needs are met
  return 'gladius';
}

/**
 * Check if colonist has required materials for recipe
 */
function hasRequiredMaterials(c: Colonist, recipe: SmithingRecipe): boolean {
  for (const material of recipe.materials) {
    if (material.type === 'steel_ingot') {
      if ((c.carryingSteel || 0) < material.quantity) {
        return false;
      }
    }
    // Add other material types here as needed
  }
  return true;
}

/**
 * Handle collecting required materials from the floor
 */
function handleMaterialCollection(
  c: Colonist,
  game: Game,
  dt: number,
  recipe: SmithingRecipe,
  changeState: (newState: ColonistState, reason?: string) => void
): void {
  const rim = game.itemManager;
  if (!rim) {
    abandonSmithing(c, game, changeState, 'no item manager');
    return;
  }
  
  // Find what materials we still need
  for (const material of recipe.materials) {
    if (material.type === 'steel_ingot') {
      const needed = material.quantity - (c.carryingSteel || 0);
      if (needed > 0) {
        collectMaterial(c, game, dt, 'steel_ingot', needed, changeState);
        return;
      }
    }
    // Add other material types here as needed
  }
}

/**
 * Collect a specific material from the floor
 */
function collectMaterial(
  c: Colonist,
  game: Game,
  dt: number,
  materialType: ItemType,
  needed: number,
  changeState: (newState: ColonistState, reason?: string) => void
): void {
  const rim = game.itemManager;
  if (!rim) return;
  
  // Look for material on the floor
  const allFloorItems = rim.floorItems.getAllItems();
  const materialItems = allFloorItems.filter((item: any) => 
    item.type === materialType && item.quantity > 0
  );
  
  if (materialItems.length === 0) {
    abandonSmithing(c, game, changeState, `no ${materialType} available`);
    return;
  }
  
  // Find closest material pile
  const closestMaterial = materialItems.reduce((closest: any, item: any) => {
    if (!closest) return item;
    const d = Math.hypot(c.x - item.position.x, c.y - item.position.y);
    const closestD = Math.hypot(c.x - closest.position.x, c.y - closest.position.y);
    return d < closestD ? item : closest;
  });
  
  const materialDist = Math.hypot(c.x - closestMaterial.position.x, c.y - closestMaterial.position.y);
  
  // Move to material if not close enough
  if (materialDist > 10) {
    const materialPos = { x: closestMaterial.position.x, y: closestMaterial.position.y };
    game.moveAlongPath(c, dt, materialPos, 10);
    return;
  }
  
  // Pick up material
  const pickupResult = rim.pickupItems(closestMaterial.id, needed);
  const picked = typeof pickupResult === 'number' ? pickupResult : pickupResult.taken;
  if (picked > 0) {
    if (materialType === 'steel_ingot') {
      c.carryingSteel = (c.carryingSteel || 0) + picked;
    }
    // Add other material types here as needed
  } else {
    // Failed to pick up, abandon
    abandonSmithing(c, game, changeState, `failed to pickup ${materialType}`);
  }
}

/**
 * Handle the smithing process at the smithing bench
 */
function handleSmithing(
  c: Colonist,
  game: Game,
  dt: number,
  smithingBench: Building,
  recipe: SmithingRecipe,
  changeState: (newState: ColonistState, reason?: string) => void
): void {
  // Check if smithing bench is occupied by another colonist
  if (smithingBench.smithingColonist && smithingBench.smithingColonist !== c.id) {
    abandonSmithing(c, game, changeState, 'smithing bench occupied');
    return;
  }
  
  // Claim the smithing bench
  smithingBench.smithingColonist = c.id;
  
  // Calculate smithing speed based on crafting skill
  const craftingLvl = c.skills ? skillLevel(c, 'Crafting') : 0;
  const skillMult = skillWorkSpeedMultiplier(craftingLvl);
  const traitMult = (c as any).traitModifiers?.workSpeed || 1.0; // Trait modifier from passive traits
  const smithingSpeed = (1.0 / recipe.craftTime) * skillMult * traitMult; // Progress per second
  
  smithingBench.smithingProgress = (smithingBench.smithingProgress || 0) + smithingSpeed * dt;
  
  // Grant crafting XP while smithing
  if (c.skills) {
    grantSkillXP(c, 'Crafting', 3 * dt, c.t || 0); // More XP than smelting due to complexity
  }
  
  // Check if smithing is complete
  if (smithingBench.smithingProgress >= 1.0) {
    completeSmithing(c, game, smithingBench, recipe, changeState);
  }
}

/**
 * Complete the smithing process and produce weapon
 */
function completeSmithing(
  c: Colonist,
  game: Game,
  smithingBench: Building,
  recipe: SmithingRecipe,
  changeState: (newState: ColonistState, reason?: string) => void
): void {
  // Consume materials
  for (const material of recipe.materials) {
    if (material.type === 'steel_ingot') {
      c.carryingSteel = Math.max(0, (c.carryingSteel || 0) - material.quantity);
    }
    // Add other material types here as needed
  }
  
  // Create the weapon
  const weaponsProduced = 1;
  const dropPos = { x: smithingBench.x + smithingBench.w / 2, y: smithingBench.y + smithingBench.h + 8 };
  game.itemManager.dropItems(recipe.result, weaponsProduced, dropPos);
  
  // Reset smithing bench state
  smithingBench.smithingProgress = 0;
  smithingBench.smithingColonist = undefined;
  smithingBench.smithingRecipe = undefined;
  
  game.msg(`${c.profile?.name || 'Colonist'} crafted a ${recipe.result}!`, 'good');
  
  if (c.skills) {
    grantSkillXP(c, 'Crafting', recipe.skillXP, c.t || 0); // Bonus XP for completion
  }
  
  // Smithing job done - colonist can seek new task
  c.task = null;
  c.target = null;
  game.clearPath(c);
  changeState('seekTask', 'finished smithing');
}

/**
 * Abandon smithing and clean up state
 */
function abandonSmithing(
  c: Colonist,
  game: Game,
  changeState: (newState: ColonistState, reason?: string) => void,
  reason: string
): void {
  c.task = null;
  c.target = null;
  c.carryingSteel = 0; // Drop carried materials
  game.clearPath(c);
  changeState('seekTask', reason);
}