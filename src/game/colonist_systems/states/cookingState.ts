/**
 * Cooking State Handler
 * 
 * Handles the complete cooking workflow:
 * 1. Pick up wheat from floor (need 5 wheat)
 * 2. Move to stove
 * 3. Cook wheat into bread (5 wheat → 3 bread)
 * 4. Drop bread on floor next to stove
 */

import type { Colonist, ColonistState } from '../../types';
import type { Game } from '../../Game';
import type { Building } from '../../types';
import { skillLevel, skillWorkSpeedMultiplier, grantSkillXP } from '../../skills/skills';

export function updateCookingState(
  c: Colonist,
  game: Game,
  dt: number,
  changeState: (newState: ColonistState, reason?: string) => void
): void {
  const stove = c.target as Building;
  
  // Validate stove still exists and is usable
  if (!stove || stove.kind !== 'stove' || !stove.done) {
    abandonCooking(c, game, changeState, 'stove no longer available');
    return;
  }
  
  // Timeout check - if stuck for too long, abandon cooking
  if ((c.stateSince ?? 0) > 45) {
    console.log(`Cooking timeout after ${(c.stateSince ?? 0).toFixed(1)}s, abandoning`);
    if (stove.cookingColonist === c.id) {
      stove.cookingColonist = undefined;
      stove.cookingProgress = 0;
    }
    abandonCooking(c, game, changeState, 'cooking timeout');
    return;
  }
  
  const stoveCenter = { x: stove.x + stove.w / 2, y: stove.y + stove.h / 2 };
  const distance = Math.hypot(c.x - stoveCenter.x, c.y - stoveCenter.y);
  
  // Phase 1: Pick up wheat if we don't have enough
  if (!c.carryingWheat || c.carryingWheat < 5) {
    handleWheatPickup(c, game, dt, changeState);
    return;
  }
  
  // Phase 2: Move to stove with wheat
  if (distance > 20) {
    game.moveAlongPath(c, dt, stoveCenter, 20);
    return;
  }
  
  // Phase 3: Cook at the stove
  handleCooking(c, game, dt, stove, changeState);
}

/**
 * Handle picking up wheat from the floor
 */
function handleWheatPickup(
  c: Colonist,
  game: Game,
  dt: number,
  changeState: (newState: ColonistState, reason?: string) => void
): void {
  const rim = game.itemManager;
  if (!rim) {
    abandonCooking(c, game, changeState, 'no item manager');
    return;
  }
  
  // Look for wheat on the floor
  const allFloorItems = rim.floorItems.getAllItems();
  const wheatItems = allFloorItems.filter((item: any) => 
    item.type === 'wheat' && item.quantity > 0
  );
  
  if (wheatItems.length === 0) {
    abandonCooking(c, game, changeState, 'no wheat available');
    return;
  }
  
  // Find closest wheat pile
  const closestWheat = wheatItems.reduce((closest: any, item: any) => {
    const d = Math.hypot(c.x - item.position.x, c.y - item.position.y);
    const closestD = Math.hypot(c.x - closest.position.x, c.y - closest.position.y);
    return d < closestD ? item : closest;
  });
  
  const wheatDist = Math.hypot(c.x - closestWheat.position.x, c.y - closestWheat.position.y);
  
  // Move to wheat if not close enough
  if (wheatDist > 10) {
    const wheatPos = { x: closestWheat.position.x, y: closestWheat.position.y };
    game.moveAlongPath(c, dt, wheatPos, 10);
    return;
  }
  
  // Pick up wheat (need 5 total for cooking)
  const needed = 5 - (c.carryingWheat || 0);
  const pickupResult = rim.pickupItems(closestWheat.id, Math.min(needed, closestWheat.quantity));
  const picked = typeof pickupResult === 'number' ? pickupResult : pickupResult.taken;
  c.carryingWheat = (c.carryingWheat || 0) + picked;
  
  // If we still need more wheat, the next update will continue searching
}

/**
 * Handle the cooking process at the stove
 */
function handleCooking(
  c: Colonist,
  game: Game,
  dt: number,
  stove: Building,
  changeState: (newState: ColonistState, reason?: string) => void
): void {
  // Check if stove is occupied by another colonist
  if (stove.cookingColonist && stove.cookingColonist !== c.id) {
    abandonCooking(c, game, changeState, 'stove occupied');
    return;
  }
  
  // Claim the stove
  stove.cookingColonist = c.id;
  
  // Calculate cooking speed based on skill
  const cookingLvl = c.skills ? skillLevel(c, 'Cooking') : 0;
  const skillMult = skillWorkSpeedMultiplier(cookingLvl);
  const cookSpeed = 0.1 * skillMult; // Base 10 seconds to cook
  
  stove.cookingProgress = (stove.cookingProgress || 0) + cookSpeed * dt;
  
  // Grant cooking XP while cooking
  if (c.skills) {
    grantSkillXP(c, 'Cooking', 3 * dt, c.t || 0);
  }
  
  // Check if cooking is complete
  if (stove.cookingProgress >= 1.0) {
    completeCooking(c, game, stove, changeState);
  }
}

/**
 * Complete the cooking process and produce bread
 */
function completeCooking(
  c: Colonist,
  game: Game,
  stove: Building,
  changeState: (newState: ColonistState, reason?: string) => void
): void {
  const breadProduced = 3; // 5 wheat → 3 bread
  
  // Consume the wheat
  c.carryingWheat = 0;
  
  // Drop bread on the floor next to stove
  const dropPos = { x: stove.x + stove.w / 2, y: stove.y + stove.h + 8 };
  game.itemManager.dropItems('bread', breadProduced, dropPos);
  
  // Reset stove state
  stove.cookingProgress = 0;
  stove.cookingColonist = undefined;
  
  // Notify and grant bonus XP
  game.msg(`${c.profile?.name || 'Colonist'} cooked ${breadProduced} bread!`, 'good');
  if (c.skills) {
    grantSkillXP(c, 'Cooking', 30, c.t || 0); // Bonus XP for completion
  }
  
  // Clean up and seek new task
  c.task = null;
  c.target = null;
  game.clearPath(c);
  changeState('seekTask', 'finished cooking');
}

/**
 * Abandon cooking and clean up state
 */
function abandonCooking(
  c: Colonist,
  game: Game,
  changeState: (newState: ColonistState, reason?: string) => void,
  reason: string
): void {
  c.task = null;
  c.target = null;
  c.carryingWheat = 0;
  game.clearPath(c);
  changeState('seekTask', reason);
}
