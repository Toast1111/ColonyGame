import { Colonist, Building } from '../types';

/**
 * Intent-Based Action System
 * 
 * Replaces automatic radius-based actions with deliberate colonist decisions.
 * Colonists must be stationary and actively choose to interact with objects.
 */

export type ColonistIntent = 
  | 'moving'           // Traveling to destination
  | 'deciding'         // Arrived, considering what to do
  | 'working'          // Actively performing work
  | 'resting'          // Deliberately resting in bed
  | 'eating'           // Deliberately eating at table
  | 'socializing'      // Deliberately talking to others
  | 'idle'             // Standing around with no specific task

export interface IntentContext {
  intent: ColonistIntent;
  target?: any;
  interactionRange?: number;
  canCancel?: boolean;     // Can player/emergency interrupt this?
  requiresStationary?: boolean;  // Must colonist be still to perform?
  decisionTime?: number;   // How long to decide what to do
  workProgress?: number;   // Progress on current work action
}

/**
 * Check if colonist should transition to decision phase
 */
export function shouldEnterDecisionPhase(
  colonist: Colonist, 
  target: any, 
  interactionRange: number
): boolean {
  if (!target) return false;
  
  const distance = Math.hypot(colonist.x - target.x, colonist.y - target.y);
  const isInRange = distance <= interactionRange;
  
  // Check if colonist has arrived (no active path or very close to current path node)
  const hasArrivedAtTarget = !colonist.path || 
    (colonist.pathIndex !== undefined && colonist.pathIndex >= colonist.path.length) ||
    (colonist.path && colonist.pathIndex !== undefined && colonist.path[colonist.pathIndex] && 
     Math.hypot(colonist.x - colonist.path[colonist.pathIndex].x, colonist.y - colonist.path[colonist.pathIndex].y) < 8);
  
  return isInRange && hasArrivedAtTarget;
}

/**
 * Check if colonist can be interrupted (drafted, emergency, etc.)
 */
export function canInterruptColonist(colonist: Colonist): boolean {
  const context = (colonist as any).intentContext as IntentContext | undefined;
  
  if (!context) return true; // No intent context = always interruptible
  
  // Always interruptible when moving or deciding
  if (context.intent === 'moving' || context.intent === 'deciding') return true;
  
  // Check canCancel flag for other intents
  return context.canCancel !== false;
}

/**
 * Force colonist out of current intent (for emergencies, drafting)
 */
export function forceInterruptIntent(colonist: Colonist, reason: string = 'interrupted'): void {
  const context = (colonist as any).intentContext as IntentContext | undefined;
  
  if (context) {
    console.log(`Interrupting colonist intent '${context.intent}': ${reason}`);
    
    // Handle specific cleanup based on intent type
    switch (context.intent) {
      case 'resting':
        // Remove from bed occupancy
        if (colonist.inside) {
          (colonist as any).game?.leaveBuilding(colonist);
        }
        break;
      case 'working':
        // Stop any work audio
        if ((colonist as any).activeConstructionAudio) {
          (colonist as any).game?.audioManager?.stop((colonist as any).activeConstructionAudio);
          (colonist as any).activeConstructionAudio = undefined;
        }
        break;
    }
    
    // Clear intent context
    (colonist as any).intentContext = undefined;
  }
  
  // Clear movement and task state
  colonist.task = null;
  colonist.target = null;
  if ((colonist as any).game?.clearPath) {
    (colonist as any).game.clearPath(colonist);
  }
}

/**
 * Set colonist's current intent with context
 */
export function setColonistIntent(
  colonist: Colonist, 
  intent: ColonistIntent,
  options: Partial<IntentContext> = {}
): void {
  (colonist as any).intentContext = {
    intent,
    canCancel: true,
    requiresStationary: true,
    decisionTime: 1.0,
    workProgress: 0,
    ...options
  } as IntentContext;
}

/**
 * Get colonist's current intent
 */
export function getColonistIntent(colonist: Colonist): IntentContext | null {
  return (colonist as any).intentContext || null;
}

/**
 * Update colonist's intent context (called each frame)
 */
export function updateColonistIntent(colonist: Colonist, dt: number): void {
  const context = (colonist as any).intentContext as IntentContext | undefined;
  if (!context) return;
  
  // Update decision timer
  if (context.intent === 'deciding' && context.decisionTime !== undefined) {
    context.decisionTime -= dt;
  }
  
  // Update work progress for gradual actions
  if (context.intent === 'working' && context.workProgress !== undefined) {
    context.workProgress += dt;
  }
}

/**
 * Check if colonist is in a specific intent state
 */
export function hasIntent(colonist: Colonist, intent: ColonistIntent): boolean {
  const context = getColonistIntent(colonist);
  return context?.intent === intent;
}

/**
 * Check if colonist is performing any work intent
 */
export function isWorking(colonist: Colonist): boolean {
  const context = getColonistIntent(colonist);
  return context?.intent === 'working';
}

/**
 * Check if colonist is available for new tasks
 */
export function isAvailableForTask(colonist: Colonist): boolean {
  const context = getColonistIntent(colonist);
  if (!context) return true;
  
  // Available if moving, deciding, or idle
  return ['moving', 'deciding', 'idle'].includes(context.intent);
}

/**
 * Helper to create work intent for specific tasks
 */
export function createWorkIntent(
  target: any, 
  interactionRange: number,
  canCancel: boolean = true
): Partial<IntentContext> {
  return {
    intent: 'working' as ColonistIntent,
    target,
    interactionRange,
    canCancel,
    requiresStationary: true,
    workProgress: 0
  };
}

/**
 * Helper to create rest intent for beds/buildings
 */
export function createRestIntent(
  building: Building,
  canCancel: boolean = false  // Harder to interrupt sleep
): Partial<IntentContext> {
  return {
    intent: 'resting' as ColonistIntent,
    target: building,
    canCancel,
    requiresStationary: true
  };
}