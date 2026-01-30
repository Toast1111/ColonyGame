/**
 * Stonecutting State Handler
 * 
 * Handles the complete stonecutting workflow:
 * 1. Pick up rubble from floor (need 2 rubble chunks from mining mountains)
 * 2. Move to stonecutting table
 * 3. Cut rubble into refined stone blocks (2 rubble → 1 stone block)
 * 4. Drop stone block on floor next to table
 */

import type { Colonist, ColonistState } from '../../types';
import type { Game } from '../../Game';
import type { Building } from '../../types';
import { skillLevel, skillWorkSpeedMultiplier, grantSkillXP } from '../../skills/skills';

export function updateStonecuttingState(
  c: Colonist,
  game: Game,
  dt: number,
  changeState: (newState: ColonistState, reason?: string) => void
): void {
  const table = c.target as Building;
  
  // Validate table still exists and is usable
  if (!table || table.kind !== 'stonecutting_table' || !table.done) {
    abandonStonecutting(c, game, changeState, 'table no longer available');
    return;
  }
  
  // Timeout check - if stuck for too long, abandon stonecutting
  if ((c.stateSince ?? 0) > 45) {
    console.log(`Stonecutting timeout after ${(c.stateSince ?? 0).toFixed(1)}s, abandoning`);
    abandonStonecutting(c, game, changeState, 'stonecutting timeout');
    if (table.cuttingColonist === c.id) {
      table.cuttingColonist = undefined;
      table.cuttingProgress = 0;
    }
    return;
  }
  
  const pt = { x: table.x + table.w / 2, y: table.y + table.h / 2 };
  const distance = Math.hypot(c.x - pt.x, c.y - pt.y);
  
  // Phase 1: Pick up rubble if we don't have enough
  if (!c.carryingStone || c.carryingStone < 2) {
    handleRubblePickup(c, game, dt, changeState);
    return;
  }
  
  // Phase 2: Move to table with stone
  if (distance > 20) {
    game.moveAlongPath(c, dt, pt, 20);
    return;
  }
  
  // Phase 3: Cut stone at the table
  handleStonecutting(c, game, dt, table, changeState);
}

/**
 * Handle picking up rubble from the floor
 */
function handleRubblePickup(
  c: Colonist,
  game: Game,
  dt: number,
  changeState: (newState: ColonistState, reason?: string) => void
): void {
  const rim = game.itemManager;
  if (!rim) {
    abandonStonecutting(c, game, changeState, 'no item manager');
    return;
  }
  
  // Look for rubble on the floor (from mining mountains)
  const allFloorItems = rim.floorItems.getAllItems();
  const rubbleItems = allFloorItems.filter((item: any) => 
    item.type === 'rubble' && item.quantity > 0
  );
  
  if (rubbleItems.length === 0) {
    abandonStonecutting(c, game, changeState, 'no rubble available');
    return;
  }
  
  // Find closest rubble pile
  const closestRubble = rubbleItems.reduce((closest: any, item: any) => {
    const d = Math.hypot(c.x - item.position.x, c.y - item.position.y);
    const closestD = Math.hypot(c.x - closest.position.x, c.y - closest.position.y);
    return d < closestD ? item : closest;
  });
  
  const rubbleDist = Math.hypot(c.x - closestRubble.position.x, c.y - closestRubble.position.y);
  
  // Move to rubble if not close enough
  if (rubbleDist > 10) {
    const rubblePos = { x: closestRubble.position.x, y: closestRubble.position.y };
    game.moveAlongPath(c, dt, rubblePos, 10);
    return;
  }
  
  // Pick up rubble (need 2 for stonecutting)
  const needed = 2 - (c.carryingStone || 0);
  const pickupResult = rim.pickupItems(closestRubble.id, Math.min(needed, closestRubble.quantity));
  const picked = typeof pickupResult === 'number' ? pickupResult : pickupResult.taken;
  c.carryingStone = (c.carryingStone || 0) + picked;
  
  // If we still need more rubble, the next update will continue searching
}

/**
 * Handle the stonecutting process at the table
 */
function handleStonecutting(
  c: Colonist,
  game: Game,
  dt: number,
  table: Building,
  changeState: (newState: ColonistState, reason?: string) => void
): void {
  // Check if table is occupied by another colonist
  if (table.cuttingColonist && table.cuttingColonist !== c.id) {
    abandonStonecutting(c, game, changeState, 'table occupied');
    return;
  }
  
  // Claim the table
  table.cuttingColonist = c.id;
  
  // Calculate cutting speed based on crafting skill
  const craftingLvl = c.skills ? skillLevel(c, 'Crafting') : 0;
  const skillMult = skillWorkSpeedMultiplier(craftingLvl);
  const traitMult = (c as any).traitModifiers?.workSpeed || 1.0; // Trait modifier from passive traits
  const cuttingSpeed = 0.15 * skillMult * traitMult; // Base ~7 seconds to cut
  
  table.cuttingProgress = (table.cuttingProgress || 0) + cuttingSpeed * dt;
  
  // Grant crafting XP while cutting
  if (c.skills) {
    grantSkillXP(c, 'Crafting', 2 * dt, c.t || 0);
  }
  
  // Check if stonecutting is complete
  if (table.cuttingProgress >= 1.0) {
    completeStonecutting(c, game, table, changeState);
  }
}

/**
 * Complete the stonecutting process and produce stone blocks
 */
function completeStonecutting(
  c: Colonist,
  game: Game,
  table: Building,
  changeState: (newState: ColonistState, reason?: string) => void
): void {
  const blocksProduced = 1; // 2 rubble → 1 stone block
  
  // Consume the rubble
  c.carryingStone = 0;
  
  // Drop stone block on the floor next to table
  const dropPos = { x: table.x + table.w / 2, y: table.y + table.h + 8 };
  game.itemManager.dropItems('stone', blocksProduced, dropPos);
  
  // Reset table state
  table.cuttingProgress = 0;
  table.cuttingColonist = undefined;
  
  game.msg(`${c.profile?.name || 'Colonist'} cut ${blocksProduced} stone block!`, 'good');
  if (c.skills) {
    grantSkillXP(c, 'Crafting', 20, c.t || 0); // Bonus XP for completion
  }
  
  // Stonecutting job done - colonist can seek new task
  c.task = null;
  c.target = null;
  game.clearPath(c);
  changeState('seekTask', 'finished stonecutting');
}

/**
 * Abandon stonecutting and clean up state
 */
function abandonStonecutting(
  c: Colonist,
  game: Game,
  changeState: (newState: ColonistState, reason?: string) => void,
  reason: string
): void {
  c.task = null;
  c.target = null;
  c.carryingStone = 0;
  game.clearPath(c);
  changeState('seekTask', reason);
}
