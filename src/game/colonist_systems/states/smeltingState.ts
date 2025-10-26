/**
 * Smelting State Handler
 * 
 * Handles the complete smelting workflow:
 * 1. Pick up raw ore from floor (coal, copper, steel, silver, gold)
 * 2. Move to smelter
 * 3. Smelt ore into refined ingots (1 ore → 1 ingot)
 * 4. Drop ingot on floor next to smelter
 */

import type { Colonist, ColonistState } from '../../types';
import type { Game } from '../../Game';
import type { Building } from '../../types';
import type { ItemType } from '../../types/items';
import { skillLevel, skillWorkSpeedMultiplier, grantSkillXP } from '../../skills/skills';

export function updateSmeltingState(
  c: Colonist,
  game: Game,
  dt: number,
  changeState: (newState: ColonistState, reason?: string) => void
): void {
  const smelter = c.target as Building;
  
  // Validate smelter still exists and is usable
  if (!smelter || smelter.kind !== 'smelter' || !smelter.done) {
    abandonSmelting(c, game, changeState, 'smelter no longer available');
    return;
  }
  
  // Timeout check - if stuck for too long, abandon smelting
  if ((c.stateSince ?? 0) > 45) {
    console.log(`Smelting timeout after ${(c.stateSince ?? 0).toFixed(1)}s, abandoning`);
    abandonSmelting(c, game, changeState, 'smelting timeout');
    if (smelter.smeltingColonist === c.id) {
      smelter.smeltingColonist = undefined;
      smelter.smeltingProgress = 0;
      smelter.smeltingOre = undefined;
    }
    return;
  }
  
  const pt = { x: smelter.x + smelter.w / 2, y: smelter.y + smelter.h / 2 };
  const distance = Math.hypot(c.x - pt.x, c.y - pt.y);
  
  // Phase 1: Pick up ore if we don't have any
  if (!c.carryingOre || !c.carryingOreType) {
    handleOrePickup(c, game, dt, changeState);
    return;
  }
  
  // Phase 2: Move to smelter with ore
  if (distance > 20) {
    game.moveAlongPath(c, dt, pt, 20);
    return;
  }
  
  // Phase 3: Smelt ore at the smelter
  handleSmelting(c, game, dt, smelter, changeState);
}

/**
 * Handle picking up ore from the floor
 */
function handleOrePickup(
  c: Colonist,
  game: Game,
  dt: number,
  changeState: (newState: ColonistState, reason?: string) => void
): void {
  const rim = game.itemManager;
  if (!rim) {
    abandonSmelting(c, game, changeState, 'no item manager');
    return;
  }
  
  // Look for ore on the floor (from mining mountains)
  const allFloorItems = rim.floorItems.getAllItems();
  const oreTypes: ItemType[] = ['coal', 'copper', 'steel', 'silver', 'gold'];
  const oreItems = allFloorItems.filter((item: any) => 
    oreTypes.includes(item.type) && item.quantity > 0
  );
  
  if (oreItems.length === 0) {
    abandonSmelting(c, game, changeState, 'no ore available');
    return;
  }
  
  // Find closest ore pile (prioritize gold > silver > steel > copper > coal by value)
  const oreValue: Record<string, number> = { gold: 5, silver: 4, steel: 3, copper: 2, coal: 1 };
  const closestOre = oreItems.reduce((closest: any, item: any) => {
    if (!closest) return item;
    const d = Math.hypot(c.x - item.position.x, c.y - item.position.y);
    const closestD = Math.hypot(c.x - closest.position.x, c.y - closest.position.y);
    // Prioritize closer ore, but prefer higher value ores if within similar distance
    if (d < closestD - 50 || (Math.abs(d - closestD) < 50 && oreValue[item.type] > oreValue[closest.type])) {
      return item;
    }
    return closest;
  });
  
  const oreDist = Math.hypot(c.x - closestOre.position.x, c.y - closestOre.position.y);
  
  // Move to ore if not close enough
  if (oreDist > 10) {
    const orePos = { x: closestOre.position.x, y: closestOre.position.y };
    game.moveAlongPath(c, dt, orePos, 10);
    return;
  }
  
  // Pick up ore (grab 1 at a time for smelting)
  const pickupResult = rim.pickupItems(closestOre.id, 1);
  const picked = typeof pickupResult === 'number' ? pickupResult : pickupResult.taken;
  if (picked > 0) {
    c.carryingOre = 1;
    c.carryingOreType = closestOre.type;
  } else {
    // Failed to pick up, abandon
    abandonSmelting(c, game, changeState, 'failed to pickup ore');
  }
}

/**
 * Handle the smelting process at the smelter
 */
function handleSmelting(
  c: Colonist,
  game: Game,
  dt: number,
  smelter: Building,
  changeState: (newState: ColonistState, reason?: string) => void
): void {
  // Check if smelter is occupied by another colonist
  if (smelter.smeltingColonist && smelter.smeltingColonist !== c.id) {
    abandonSmelting(c, game, changeState, 'smelter occupied');
    return;
  }
  
  // Claim the smelter and set ore type
  smelter.smeltingColonist = c.id;
  smelter.smeltingOre = c.carryingOreType;
  
  // Calculate smelting speed based on crafting skill
  const craftingLvl = c.skills ? skillLevel(c, 'Crafting') : 0;
  const skillMult = skillWorkSpeedMultiplier(craftingLvl);
  const smeltingSpeed = 0.12 * skillMult; // Base ~8-9 seconds to smelt
  
  smelter.smeltingProgress = (smelter.smeltingProgress || 0) + smeltingSpeed * dt;
  
  // Grant crafting XP while smelting
  if (c.skills) {
    grantSkillXP(c, 'Crafting', 2 * dt, c.t || 0);
  }
  
  // Check if smelting is complete
  if (smelter.smeltingProgress >= 1.0) {
    completeSmelting(c, game, smelter, changeState);
  }
}

/**
 * Complete the smelting process and produce ingots
 */
function completeSmelting(
  c: Colonist,
  game: Game,
  smelter: Building,
  changeState: (newState: ColonistState, reason?: string) => void
): void {
  const oreType = c.carryingOreType;
  if (!oreType) {
    abandonSmelting(c, game, changeState, 'no ore type');
    return;
  }
  
  // Map ore type to hot ingot type
  const oreToIngot: Record<string, ItemType> = {
    coal: 'coal', // Coal doesn't smelt to ingot, stays as coal (fuel)
    copper: 'hot_copper_ingot',
    steel: 'hot_steel_ingot',
    silver: 'hot_silver_ingot',
    gold: 'hot_gold_ingot'
  };
  
  const ingotType = oreToIngot[oreType] || oreType;
  const ingotsProduced = 1; // 1 ore → 1 hot ingot
  
  // Consume the ore
  c.carryingOre = 0;
  c.carryingOreType = undefined;
  
  // For coal, just drop it (it doesn't need cooling)
  if (ingotType === 'coal') {
    const dropPos = { x: smelter.x + smelter.w / 2, y: smelter.y + smelter.h + 8 };
    game.itemManager.dropItems(ingotType, ingotsProduced, dropPos);
    
    // Reset smelter state
    smelter.smeltingProgress = 0;
    smelter.smeltingColonist = undefined;
    smelter.smeltingOre = undefined;
    
    game.msg(`${c.profile?.name || 'Colonist'} smelted ${ingotsProduced} ${ingotType}!`, 'good');
    if (c.skills) {
      grantSkillXP(c, 'Crafting', 20, c.t || 0);
    }
    
    c.task = null;
    c.target = null;
    game.clearPath(c);
    changeState('seekTask', 'finished smelting coal');
    return;
  }
  
  // For hot ingots, find an available cooling rack
  const availableRack = game.state.buildings.find((b: Building) => 
    b.kind === 'cooling_rack' && 
    b.done && 
    !b.coolingColonist
  );
  
  if (!availableRack) {
    // No cooling rack available - drop on floor as fallback
    const dropPos = { x: smelter.x + smelter.w / 2, y: smelter.y + smelter.h + 8 };
    game.itemManager.dropItems(ingotType, ingotsProduced, dropPos);
    
    game.msg(`${c.profile?.name || 'Colonist'} smelted ${ingotType.replace('_', ' ')} - no cooling rack available!`, 'bad');
  } else {
    // Place hot ingot on cooling rack and start cooling process
    availableRack.coolingColonist = 'PASSIVE'; // Mark as occupied but not requiring a colonist
    availableRack.coolingIngotType = ingotType;
    availableRack.coolingProgress = 0;
    
    game.msg(`${c.profile?.name || 'Colonist'} placed ${ingotType.replace('_', ' ')} on cooling rack!`, 'good');
  }
  
  // Reset smelter state
  smelter.smeltingProgress = 0;
  smelter.smeltingColonist = undefined;
  smelter.smeltingOre = undefined;
  
  if (c.skills) {
    grantSkillXP(c, 'Crafting', 20, c.t || 0); // Bonus XP for completion
  }
  
  // Smelting job done - colonist can seek new task
  c.task = null;
  c.target = null;
  game.clearPath(c);
  changeState('seekTask', 'finished smelting');
}

/**
 * Abandon smelting and clean up state
 */
function abandonSmelting(
  c: Colonist,
  game: Game,
  changeState: (newState: ColonistState, reason?: string) => void,
  reason: string
): void {
  c.task = null;
  c.target = null;
  c.carryingOre = 0;
  c.carryingOreType = undefined;
  game.clearPath(c);
  changeState('seekTask', reason);
}
