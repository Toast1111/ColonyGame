/**
 * Simulation Worker
 * 
 * Dedicated worker for game simulation tasks (2 workers for load balancing).
 * Offloads AI state updates, FSM transitions, and game logic from the main thread.
 * 
 * Operations:
 * - processColonistAI: Update colonist AI state and decision making
 * - processEnemyAI: Update enemy AI state
 * - computeTaskPriorities: Calculate task priorities for work assignment
 * - simulateNeedsDecay: Calculate needs (hunger, fatigue) decay
 * - batchSimulation: Process multiple entities in one batch
 */

import type { WorkerTask, WorkerResponse } from './WorkerPool';

// Colonist data structure (subset needed for AI)
interface ColonistAIData {
  id: string | number;
  x: number;
  y: number;
  state: string;
  task: string | null;
  hp: number;
  hunger: number;
  fatigue: number;
  isDrafted?: boolean;
  workPriorities?: Record<string, number>;
}

// Enemy data structure (subset needed for AI)
interface EnemyAIData {
  id: string | number;
  x: number;
  y: number;
  hp: number;
  target: any;
}

// Task data structure
interface Task {
  id: string;
  type: string;
  priority: number;
  workType: string;
  distance: number;
}

/**
 * Process colonist AI state updates
 * Determines next state based on current conditions
 */
function processColonistAI(colonist: ColonistAIData, dt: number): {
  newState?: string;
  newTask?: string | null;
  needsUpdate: boolean;
} {
  const result = {
    newState: colonist.state,
    newTask: colonist.task,
    needsUpdate: false
  };
  
  // Check critical needs first
  if (colonist.hp <= 0) {
    result.newState = 'downed';
    result.needsUpdate = true;
    return result;
  }
  
  // If drafted, maintain combat stance
  if (colonist.isDrafted) {
    if (colonist.state !== 'drafted' && colonist.state !== 'guard') {
      result.newState = 'drafted';
      result.needsUpdate = true;
    }
    return result;
  }
  
  // Check urgent needs
  if (colonist.hunger > 80) {
    if (colonist.state !== 'eat' && colonist.state !== 'goingToEat') {
      result.newState = 'goingToEat';
      result.newTask = 'eat';
      result.needsUpdate = true;
    }
    return result;
  }
  
  if (colonist.fatigue > 85) {
    if (colonist.state !== 'sleep' && colonist.state !== 'goToSleep') {
      result.newState = 'goToSleep';
      result.newTask = 'rest';
      result.needsUpdate = true;
    }
    return result;
  }
  
  // If idle, seek new task
  if (colonist.state === 'idle' || colonist.state === 'seekTask') {
    result.newState = 'seekTask';
    result.needsUpdate = true;
  }
  
  return result;
}

/**
 * Process enemy AI state updates
 */
function processEnemyAI(enemy: EnemyAIData, dt: number): {
  newState?: string;
  needsUpdate: boolean;
} {
  const result = {
    newState: 'attack',
    needsUpdate: false
  };
  
  if (enemy.hp <= 0) {
    result.newState = 'dead';
    result.needsUpdate = true;
    return result;
  }
  
  // Simple flee logic
  if (enemy.hp < 20) {
    result.newState = 'flee';
    result.needsUpdate = true;
    return result;
  }
  
  return result;
}

/**
 * Compute task priorities for colonist work assignment
 */
function computeTaskPriorities(
  colonist: ColonistAIData,
  tasks: Task[]
): Task[] {
  const priorities = colonist.workPriorities || {};
  
  return tasks
    .map(task => {
      // Base priority from task
      let priority = task.priority;
      
      // Apply work type priority from colonist
      const workPriority = priorities[task.workType] || 0;
      priority += workPriority * 10;
      
      // Distance penalty (closer tasks are higher priority)
      const distancePenalty = Math.min(task.distance / 100, 5);
      priority -= distancePenalty;
      
      return { ...task, priority };
    })
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Simulate needs decay (hunger, fatigue increase)
 */
function simulateNeedsDecay(colonists: ColonistAIData[], dt: number): Map<string | number, { hunger: number; fatigue: number }> {
  const updates = new Map<string | number, { hunger: number; fatigue: number }>();
  
  for (const colonist of colonists) {
    // Hunger increases over time (slower if resting)
    const hungerRate = colonist.state === 'sleep' ? 0.05 : 0.1;
    const newHunger = Math.min(100, colonist.hunger + hungerRate * dt);
    
    // Fatigue increases over time (decreases if sleeping)
    const fatigueRate = colonist.state === 'sleep' ? -2.0 : 0.15;
    const newFatigue = Math.max(0, Math.min(100, colonist.fatigue + fatigueRate * dt));
    
    updates.set(colonist.id, {
      hunger: newHunger,
      fatigue: newFatigue
    });
  }
  
  return updates;
}

/**
 * Batch simulation for multiple entities
 */
function batchSimulation(colonists: ColonistAIData[], dt: number): {
  aiUpdates: Map<string | number, ReturnType<typeof processColonistAI>>;
  needsUpdates: Map<string | number, { hunger: number; fatigue: number }>;
} {
  const aiUpdates = new Map<string | number, ReturnType<typeof processColonistAI>>();
  
  for (const colonist of colonists) {
    const update = processColonistAI(colonist, dt);
    if (update.needsUpdate) {
      aiUpdates.set(colonist.id, update);
    }
  }
  
  const needsUpdates = simulateNeedsDecay(colonists, dt);
  
  return { aiUpdates, needsUpdates };
}

/**
 * Message handler for simulation worker
 */
self.onmessage = (event: MessageEvent<WorkerTask>) => {
  const task = event.data;
  const startTime = performance.now();
  
  try {
    let result: any = null;
    
    switch (task.operation) {
      case 'processColonistAI': {
        const { colonist, dt } = task.data;
        result = processColonistAI(colonist, dt);
        break;
      }
      
      case 'processEnemyAI': {
        const { enemy, dt } = task.data;
        result = processEnemyAI(enemy, dt);
        break;
      }
      
      case 'computeTaskPriorities': {
        const { colonist, tasks } = task.data;
        result = computeTaskPriorities(colonist, tasks);
        break;
      }
      
      case 'simulateNeedsDecay': {
        const { colonists, dt } = task.data;
        const updates = simulateNeedsDecay(colonists, dt);
        // Convert Map to array of tuples for transfer
        result = Array.from(updates.entries());
        break;
      }
      
      case 'batchSimulation': {
        const { colonists, dt } = task.data;
        const batchResult = batchSimulation(colonists, dt);
        // Convert Maps to arrays for transfer
        result = {
          aiUpdates: Array.from(batchResult.aiUpdates.entries()),
          needsUpdates: Array.from(batchResult.needsUpdates.entries())
        };
        break;
      }
      
      default:
        throw new Error(`Unknown simulation operation: ${task.operation}`);
    }
    
    const executionTime = performance.now() - startTime;
    
    const response: WorkerResponse = {
      taskId: task.id,
      success: true,
      data: {
        result,
        executionTime
      }
    };
    
    self.postMessage(response);
  } catch (error: any) {
    const response: WorkerResponse = {
      taskId: task.id,
      success: false,
      error: error.message || 'Simulation computation failed'
    };
    
    self.postMessage(response);
  }
};

// Export empty object to make this a module
export {};
