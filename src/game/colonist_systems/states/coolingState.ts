import type { Colonist, ColonistState, Building } from '../../types';
import type { Game } from '../../Game';
import { skillWorkSpeedMultiplier, grantSkillXP } from '../../skills/skills';
import type { ItemType } from '../../types/items';

/**
 * Update colonist in 'cooling' state
 * - Pick up hot ingot from floor
 * - Move to cooling rack
 * - Place ingot on rack and wait for cooling
 * - Drop cooled (regular) ingot
 */
export function updateCoolingState(
  c: Colonist,
  game: Game,
  dt: number,
  changeState: (newState: ColonistState, reason?: string) => void
): void {
  // If colonist doesn't have a hot ingot, pick one up
  if (!c.carryingHotIngot || c.carryingHotIngot === 0) {
    handleHotIngotPickup(c, game, changeState);
    return;
  }

  // Find the cooling rack (should be stored in task data)
  const rack = game.state.buildings.find((b: Building) => 
    b.kind === 'cooling_rack' && 
    b.done && 
    (!b.coolingColonist || b.coolingColonist === c.id)
  );

  if (!rack) {
    abandonCooling(c, game, changeState, 'no available cooling rack');
    return;
  }

  // If not at the rack yet, move to it
  const rackCenter = { x: rack.x + rack.w / 2, y: rack.y + rack.h / 2 };
  const dx = c.x - rackCenter.x;
  const dy = c.y - rackCenter.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > 40) {
    // Not at rack yet, pathfind to it
    game.moveAlongPath(c, dt, rackCenter, 40);
    return;
  }

  // At the rack, perform cooling
  handleCooling(c, game, dt, rack, changeState);
}

/**
 * Pick up a hot ingot from the floor
 */
function handleHotIngotPickup(
  c: Colonist,
  game: Game,
  changeState: (newState: ColonistState, reason?: string) => void
): void {
  const rim = game.itemManager;
  if (!rim) {
    abandonCooling(c, game, changeState, 'no item manager');
    return;
  }
  
  const hotIngotTypes = ['hot_steel_ingot', 'hot_copper_ingot', 'hot_silver_ingot', 'hot_gold_ingot'];
  
  // Find closest hot ingot
  const allFloorItems = rim.floorItems.getAllItems();
  const hotIngots = allFloorItems.filter((item: any) => 
    hotIngotTypes.includes(item.type) && item.quantity > 0
  );

  if (hotIngots.length === 0) {
    abandonCooling(c, game, changeState, 'no hot ingots available');
    return;
  }

  // Sort by distance - find closest
  const closestIngot = hotIngots.reduce((closest: any, item: any) => {
    const d = Math.hypot(c.x - item.position.x, c.y - item.position.y);
    const closestD = Math.hypot(c.x - closest.position.x, c.y - closest.position.y);
    return d < closestD ? item : closest;
  });

  const ingotDist = Math.hypot(c.x - closestIngot.position.x, c.y - closestIngot.position.y);

  // If not at ingot, move to it
  if (ingotDist > 10) {
    const ingotPos = { x: closestIngot.position.x, y: closestIngot.position.y };
    game.moveAlongPath(c, 0, ingotPos, 10);
    return;
  }
  
  // Pick up hot ingot (grab 1 at a time)
  const pickupResult = rim.pickupItems(closestIngot.id, 1);
  const picked = typeof pickupResult === 'number' ? pickupResult : pickupResult.taken;
  if (picked > 0) {
    c.carryingHotIngot = 1;
    c.carryingHotIngotType = closestIngot.type;
  } else {
    abandonCooling(c, game, changeState, 'failed to pickup hot ingot');
  }
}

/**
 * Handle the cooling process at the cooling rack
 */
function handleCooling(
  c: Colonist,
  game: Game,
  dt: number,
  rack: Building,
  changeState: (newState: ColonistState, reason?: string) => void
): void {
  // Check if rack is occupied by another colonist
  if (rack.coolingColonist && rack.coolingColonist !== c.id) {
    abandonCooling(c, game, changeState, 'rack occupied');
    return;
  }
  
  // Claim the rack and set ingot type
  rack.coolingColonist = c.id;
  if (!rack.coolingIngotType && c.carryingHotIngotType) {
    rack.coolingIngotType = c.carryingHotIngotType;
  }
  
  // Initialize progress
  if (rack.coolingProgress === undefined || rack.coolingProgress === 0) {
    rack.coolingProgress = 0;
  }
  
  // Apply skill-based work speed (use any available skill property)
  const craftingSkill = (c.skills as any)?.Crafting || 0;
  const skillMult = skillWorkSpeedMultiplier(craftingSkill);
  const baseSpeed = 0.08; // Base cooling speed (slower than cutting, ~12-15 seconds)
  const speed = baseSpeed * skillMult;
  
  // Progress cooling
  rack.coolingProgress += speed * dt;
  
  // Grant XP while working
  if (c.skills) {
    grantSkillXP(c, 'Crafting', 0.5 * dt, c.t || 0);
  }
  
  // Check if cooling is complete
  if (rack.coolingProgress >= 1.0) {
    completeCooling(c, game, rack, changeState);
  }
}

/**
 * Complete the cooling process - convert hot ingot to regular ingot
 */
function completeCooling(
  c: Colonist,
  game: Game,
  rack: Building,
  changeState: (newState: ColonistState, reason?: string) => void
): void {
  const hotIngotType = c.carryingHotIngotType;
  if (!hotIngotType) {
    abandonCooling(c, game, changeState, 'no hot ingot type');
    return;
  }
  
  // Map hot ingot type to cooled ingot type
  const hotToCooled: Record<string, ItemType> = {
    hot_copper_ingot: 'copper_ingot',
    hot_steel_ingot: 'steel_ingot',
    hot_silver_ingot: 'silver_ingot',
    hot_gold_ingot: 'gold_ingot'
  };
  
  const cooledIngotType = hotToCooled[hotIngotType] || hotIngotType;
  const ingotsProduced = 1; // 1 hot ingot → 1 cooled ingot
  
  // Consume the hot ingot
  c.carryingHotIngot = 0;
  c.carryingHotIngotType = undefined;
  
  // Drop cooled ingot on the floor next to rack
  const dropPos = { x: rack.x + rack.w / 2, y: rack.y + rack.h + 8 };
  game.itemManager.dropItems(cooledIngotType, ingotsProduced, dropPos);
  
  // Reset rack state
  rack.coolingProgress = 0;
  rack.coolingColonist = undefined;
  rack.coolingIngotType = undefined;
  
  game.msg(`${c.profile?.name || 'Colonist'} cooled ${ingotsProduced} ${cooledIngotType.replace('_', ' ')}!`, 'good');
  if (c.skills) {
    grantSkillXP(c, 'Crafting', 15, c.t || 0); // Bonus XP for completion
  }
  
  // Return to seeking tasks
  changeState('seekTask', 'cooling complete');
}

/**
 * Abandon the cooling task and clean up state
 */
function abandonCooling(
  c: Colonist,
  game: Game,
  changeState: (newState: ColonistState, reason?: string) => void,
  reason: string
): void {
  // Drop hot ingot if carrying one
  if (c.carryingHotIngot && c.carryingHotIngot > 0 && c.carryingHotIngotType) {
    game.itemManager.dropItems(c.carryingHotIngotType as ItemType, c.carryingHotIngot, { x: c.x, y: c.y });
    c.carryingHotIngot = 0;
    c.carryingHotIngotType = undefined;
  }
  
  // Find and reset any rack we were using
  const myRack = game.state.buildings.find((b: Building) => b.coolingColonist === c.id);
  if (myRack) {
    myRack.coolingProgress = 0;
    myRack.coolingColonist = undefined;
    myRack.coolingIngotType = undefined;
  }
  
  changeState('seekTask', `cooling abandoned: ${reason}`);
}
