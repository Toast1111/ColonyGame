import { Colonist, Building } from '../types';
import { T } from '../constants';

/**
 * Spatial Interaction System
 * 
 * Defines specific interaction zones around objects where colonists can
 * perform different actions. Multiple interactions may be available in the
 * same tile, requiring colonists to choose the appropriate one.
 */

export interface InteractionZone {
  id: string;
  target: any;                    // The object being interacted with
  center: { x: number; y: number }; // Center of interaction zone
  radius: number;                 // Interaction range
  actions: InteractionAction[];   // Available actions in this zone
  priority: number;               // Zone priority when overlapping
}

export interface InteractionAction {
  id: string;
  name: string;
  taskTypes: string[];           // Which colonist tasks can use this action
  requirements?: {               // Prerequisites for this action
    tools?: string[];
    skills?: { [skill: string]: number };
    resources?: { [resource: string]: number };
  };
  canExecute: (colonist: Colonist) => boolean;
  execute: (colonist: Colonist, dt: number) => ActionResult;
}

export interface ActionResult {
  completed: boolean;
  progress?: number;
  message?: string;
  shouldContinue: boolean;
}

/**
 * Find all interaction zones that contain a colonist's position
 */
export function getAvailableInteractions(
  colonist: Colonist,
  allZones: InteractionZone[]
): InteractionZone[] {
  const available: InteractionZone[] = [];
  
  for (const zone of allZones) {
    const distance = Math.hypot(colonist.x - zone.center.x, colonist.y - zone.center.y);
    if (distance <= zone.radius) {
      available.push(zone);
    }
  }
  
  // Sort by priority (higher priority first)
  return available.sort((a, b) => b.priority - a.priority);
}

/**
 * Choose the best interaction for a colonist's current task
 */
export function selectBestInteraction(
  colonist: Colonist,
  availableZones: InteractionZone[]
): { zone: InteractionZone; action: InteractionAction } | null {
  
  for (const zone of availableZones) {
    for (const action of zone.actions) {
      // Check if this action matches the colonist's current task
      if (action.taskTypes.includes(colonist.task || '')) {
        // Check if colonist can execute this action
        if (action.canExecute(colonist)) {
          return { zone, action };
        }
      }
    }
  }
  
  return null;
}

/**
 * Create interaction zones for a building based on its type and position
 */
export function createBuildingInteractionZones(building: Building): InteractionZone[] {
  const zones: InteractionZone[] = [];
  const centerX = building.x + building.w / 2;
  const centerY = building.y + building.h / 2;
  
  switch (building.kind) {
    case 'stove':
      // Cooking zone - front of stove
      zones.push({
        id: `${building.kind}_cooking_${building.x}_${building.y}`,
        target: building,
        center: { x: centerX, y: building.y + building.h + 16 }, // In front
        radius: 20,
        priority: 10,
        actions: [
          {
            id: 'cook',
            name: 'Cook Food',
            taskTypes: ['cooking', 'cookWheat'],
            canExecute: (c: Colonist) => (c as any).carryingWheat >= 5,
            execute: (c: Colonist, dt: number) => {
              // Cooking logic here
              return { completed: false, progress: 0.1 * dt, shouldContinue: true };
            }
          }
        ]
      });
      
      // Storage zone - side of stove  
      zones.push({
        id: `${building.kind}_storage_${building.x}_${building.y}`,
        target: building,
        center: { x: building.x - 16, y: centerY }, // Left side
        radius: 16,
        priority: 5,
        actions: [
          {
            id: 'store_bread',
            name: 'Store Bread',
            taskTypes: ['storingBread', 'haulBread'],
            canExecute: (c: Colonist) => (c as any).carryingBread > 0,
            execute: (c: Colonist, dt: number) => {
              // Storage logic here
              return { completed: true, shouldContinue: false };
            }
          }
        ]
      });
      break;
      
    case 'bed':
      // Simple bed interaction - one click to get in, one click to get out
      zones.push({
        id: `${building.kind}_interact_${building.x}_${building.y}`,
        target: building,
        center: { x: centerX, y: centerY },
        radius: Math.max(building.w, building.h) / 2 + 12,
        priority: 10,
        actions: [
          {
            id: 'enter_bed',
            name: 'Get in Bed',
            taskTypes: ['rest', 'sleep', 'goToSleep', 'idle'],  // Allow any colonist to choose to use bed
            canExecute: (c: Colonist) => !c.inside,  // Can only get in if not already inside
            execute: (c: Colonist, dt: number) => {
              // Simple bed entry - just set inside and position, and enter resting state
              c.inside = building;
              c.x = centerX;
              c.y = centerY;
              (c as any).sleepFacing = Math.PI / 2; // Horizontal sleeping pose
              
              // Update the reservation system
              const game = (window as any).game;
              if (game && game.reservationManager) {
                game.reservationManager.insideCounts.set(building, (game.reservationManager.insideCounts.get(building) || 0) + 1);
              }
              
              return { completed: true, shouldContinue: false };
            }
          },
          {
            id: 'exit_bed',
            name: 'Get out of Bed',
            taskTypes: ['exit', 'leave', 'getup', 'idle'],  // Allow any colonist to choose to leave bed
            canExecute: (c: Colonist) => !!(c.inside && c.inside === building),  // Can only get out if inside this bed
            execute: (c: Colonist, dt: number) => {
              // Simple bed exit - clear inside status and move slightly away
              c.inside = null;
              c.x = centerX + 20; // Move colonist out of bed
              c.y = centerY;
              (c as any).sleepFacing = undefined;
              
              // Update the reservation system  
              const game = (window as any).game;
              if (game && game.reservationManager) {
                const cur = (game.reservationManager.insideCounts.get(building) || 1) - 1;
                if (cur <= 0) game.reservationManager.insideCounts.delete(building);
                else game.reservationManager.insideCounts.set(building, cur);
              }
              
              return { completed: true, shouldContinue: false };
            }
          }
        ]
      });
      break;
      
    case 'farm':
      // Different zones for different farm activities
      const farmZones = [
        // Planting zone
        {
          id: `${building.kind}_plant_${building.x}_${building.y}`,
          target: building,
          center: { x: centerX - building.w/4, y: centerY },
          radius: 20,
          priority: 8,
          actions: [{
            id: 'plant',
            name: 'Plant Seeds',
            taskTypes: ['plantWheat'],
            canExecute: (c: Colonist) => !(building as any).planted,
            execute: (c: Colonist, dt: number) => {
              // Planting logic
              return { completed: true, shouldContinue: false };
            }
          }]
        },
        // Harvesting zone  
        {
          id: `${building.kind}_harvest_${building.x}_${building.y}`,
          target: building,
          center: { x: centerX + building.w/4, y: centerY },
          radius: 20,
          priority: 12,
          actions: [{
            id: 'harvest',
            name: 'Harvest Crops',
            taskTypes: ['harvestFarm'],
            canExecute: (c: Colonist) => !!(building as any).ready,
            execute: (c: Colonist, dt: number) => {
              // Harvesting logic
              return { completed: true, shouldContinue: false };
            }
          }]
        }
      ];
      zones.push(...farmZones);
      break;
  }
  
  return zones;
}

/**
 * Create interaction zones for trees with different approach angles
 */
export function createTreeInteractionZones(tree: any): InteractionZone[] {
  const zones: InteractionZone[] = [];
  
  // Multiple chopping positions around the tree
  const angles = [0, Math.PI/2, Math.PI, -Math.PI/2]; // North, East, South, West
  
  angles.forEach((angle, index) => {
    const distance = tree.r + 20; // Stand back from tree
    const x = tree.x + Math.cos(angle) * distance;
    const y = tree.y + Math.sin(angle) * distance;
    
    zones.push({
      id: `tree_chop_${tree.x}_${tree.y}_${index}`,
      target: tree,
      center: { x, y },
      radius: 12,
      priority: 10,
      actions: [{
        id: 'chop',
        name: 'Chop Tree',
        taskTypes: ['chop'],
        canExecute: (c: Colonist) => tree.hp > 0,
        execute: (c: Colonist, dt: number) => {
          const damage = 18 * dt;
          tree.hp -= damage;
          return { 
            completed: tree.hp <= 0,
            progress: damage,
            shouldContinue: tree.hp > 0
          };
        }
      }]
    });
  });
  
  return zones;
}

/**
 * Example: Multiple overlapping zones scenario
 * 
 * A colonist stands at tile (10, 5) and finds these overlapping zones:
 * 1. Stove cooking zone (priority 10)
 * 2. Floor item pickup zone (priority 5) 
 * 3. Stockpile storage zone (priority 3)
 * 
 * The colonist's task is 'cooking', so they choose the stove cooking action
 * despite other available interactions in the same location.
 */
export function demonstrateZoneSelection(): string {
  // Simulated colonist with cooking task
  const colonist = {
    x: 320, y: 160, // Tile (10, 5) in world coordinates
    task: 'cooking',
    carryingWheat: 5
  } as any;
  
  // Simulated overlapping zones at this location
  const zones: InteractionZone[] = [
    {
      id: 'stove_cooking',
      target: { kind: 'stove' },
      center: { x: 320, y: 160 },
      radius: 20,
      priority: 10,
      actions: [{
        id: 'cook',
        name: 'Cook Food',
        taskTypes: ['cooking'],
        canExecute: (c: Colonist) => true,
        execute: (c: Colonist, dt: number) => ({ completed: false, shouldContinue: true })
      }]
    },
    {
      id: 'floor_pickup',
      target: { type: 'wheat' },
      center: { x: 320, y: 160 },
      radius: 16,
      priority: 5, 
      actions: [{
        id: 'pickup',
        name: 'Pick Up Item',
        taskTypes: ['haulFloorItem'],
        canExecute: (c: Colonist) => true,
        execute: (c: Colonist, dt: number) => ({ completed: true, shouldContinue: false })
      }]
    }
  ];
  
  const available = getAvailableInteractions(colonist, zones);
  const selected = selectBestInteraction(colonist, available);
  
  return `Colonist at (${colonist.x}, ${colonist.y}) with task '${colonist.task}':
Available zones: ${available.length}
Selected: ${selected ? selected.action.name : 'none'}
Reason: Task-specific priority matching`;
}