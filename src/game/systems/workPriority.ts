/**
 * Work Priority System - RimWorld-style job assignment
 * 
 * Colonists have priorities (1-4, or disabled) for different work types.
 * Lower numbers = higher priority. The system assigns tasks based on:
 * 1. Work availability
 * 2. Colonist priority settings
 * 3. Colonist capabilities (skills, health)
 */

import type { Colonist, Building } from '../types';

// Work types match RimWorld's categories
export type WorkType = 
  | 'Firefighting'      // Emergency - putting out fires (future)
  | 'PatientEmergency'  // Emergency - colonist being treated
  | 'Doctor'            // Medical work - treating others
  | 'PatientBedRest'    // Medical - resting in bed when injured
  | 'Flicker'           // Operating switches (future - power management)
  | 'Warden'            // Prison management (future)
  | 'Handling'          // Animal handling (future)
  | 'Cooking'           // Food preparation (future - when cooking implemented)
  | 'Hunting'           // Hunting animals (future)
  | 'Construction'      // Building structures
  | 'Growing'           // Farming/agriculture
  | 'Mining'            // Extracting stone
  | 'PlantCutting'      // Tree chopping/woodcutting
  | 'Smithing'          // Weapon/armor crafting (future)
  | 'Tailoring'         // Clothing crafting (future)
  | 'Art'               // Creating art (future)
  | 'Crafting'          // General crafting (future)
  | 'Hauling'           // Moving items/resources (future with stockpile system)
  | 'Cleaning'          // Cleaning filth (future)
  | 'Research';         // Researching technology (future)

// Priority levels (RimWorld uses 1-4, where 1 = highest priority)
export type WorkPriority = 1 | 2 | 3 | 4 | 0; // 0 = disabled

// Default work priorities for a new colonist (balanced general worker)
export const DEFAULT_WORK_PRIORITIES: Record<WorkType, WorkPriority> = {
  'Firefighting': 1,      // Always highest for emergencies
  'PatientEmergency': 1,  // Always high for patient role
  'Doctor': 3,            // Most colonists can help with medical
  'PatientBedRest': 2,    // High priority when injured
  'Flicker': 2,
  'Warden': 3,
  'Handling': 3,
  'Cooking': 3,
  'Hunting': 3,
  'Construction': 2,      // Important for base building
  'Growing': 2,           // Important for food
  'Mining': 2,            // Important for resources
  'PlantCutting': 2,      // Important for resources
  'Smithing': 3,
  'Tailoring': 3,
  'Art': 4,               // Lower priority luxury
  'Crafting': 3,
  'Hauling': 3,           // General labor
  'Cleaning': 4,          // Lowest priority maintenance
  'Research': 3,
};

// Work type metadata
export interface WorkTypeInfo {
  name: WorkType;
  label: string;
  description: string;
  relatedSkill?: string; // Which skill affects this work
  emergencyWork?: boolean; // Always takes priority
  requiresCapability?: string; // e.g., 'conscious', 'manipulation', 'movement'
}

export const WORK_TYPE_INFO: Record<WorkType, WorkTypeInfo> = {
  'Firefighting': {
    name: 'Firefighting',
    label: 'Firefight',
    description: 'Put out fires (emergency)',
    emergencyWork: true,
    requiresCapability: 'movement'
  },
  'PatientEmergency': {
    name: 'PatientEmergency',
    label: 'Patient',
    description: 'Being treated for injuries',
    emergencyWork: true,
  },
  'Doctor': {
    name: 'Doctor',
    label: 'Doctor',
    description: 'Treat injuries and illnesses',
    relatedSkill: 'Medicine',
    requiresCapability: 'manipulation'
  },
  'PatientBedRest': {
    name: 'PatientBedRest',
    label: 'Bed rest',
    description: 'Rest in bed when injured',
  },
  'Flicker': {
    name: 'Flicker',
    label: 'Flick',
    description: 'Operate switches and power controls',
    requiresCapability: 'manipulation'
  },
  'Warden': {
    name: 'Warden',
    label: 'Warden',
    description: 'Manage prisoners',
    relatedSkill: 'Social',
    requiresCapability: 'movement'
  },
  'Handling': {
    name: 'Handling',
    label: 'Handle',
    description: 'Tame and train animals',
    relatedSkill: 'Social',
    requiresCapability: 'manipulation'
  },
  'Cooking': {
    name: 'Cooking',
    label: 'Cook',
    description: 'Prepare meals',
    relatedSkill: 'Cooking',
    requiresCapability: 'manipulation'
  },
  'Hunting': {
    name: 'Hunting',
    label: 'Hunt',
    description: 'Hunt animals for food',
    relatedSkill: 'Shooting',
    requiresCapability: 'movement'
  },
  'Construction': {
    name: 'Construction',
    label: 'Construct',
    description: 'Build structures',
    relatedSkill: 'Construction',
    requiresCapability: 'manipulation'
  },
  'Growing': {
    name: 'Growing',
    label: 'Grow',
    description: 'Sow and harvest crops',
    relatedSkill: 'Plants',
    requiresCapability: 'manipulation'
  },
  'Mining': {
    name: 'Mining',
    label: 'Mine',
    description: 'Extract stone and minerals',
    relatedSkill: 'Mining',
    requiresCapability: 'manipulation'
  },
  'PlantCutting': {
    name: 'PlantCutting',
    label: 'Plant cut',
    description: 'Chop trees for wood',
    relatedSkill: 'Plants',
    requiresCapability: 'manipulation'
  },
  'Smithing': {
    name: 'Smithing',
    label: 'Smith',
    description: 'Craft weapons and armor',
    relatedSkill: 'Crafting',
    requiresCapability: 'manipulation'
  },
  'Tailoring': {
    name: 'Tailoring',
    label: 'Tailor',
    description: 'Craft clothing',
    relatedSkill: 'Crafting',
    requiresCapability: 'manipulation'
  },
  'Art': {
    name: 'Art',
    label: 'Art',
    description: 'Create artistic works',
    relatedSkill: 'Crafting',
    requiresCapability: 'manipulation'
  },
  'Crafting': {
    name: 'Crafting',
    label: 'Craft',
    description: 'General crafting',
    relatedSkill: 'Crafting',
    requiresCapability: 'manipulation'
  },
  'Hauling': {
    name: 'Hauling',
    label: 'Haul',
    description: 'Move items and resources',
    requiresCapability: 'movement'
  },
  'Cleaning': {
    name: 'Cleaning',
    label: 'Clean',
    description: 'Clean up filth',
    requiresCapability: 'movement'
  },
  'Research': {
    name: 'Research',
    label: 'Research',
    description: 'Conduct research',
    relatedSkill: 'Research',
    requiresCapability: 'manipulation'
  },
};

// Order work types by typical priority (for UI display)
export const WORK_TYPE_ORDER: WorkType[] = [
  'Firefighting',
  'PatientEmergency',
  'Doctor',
  'PatientBedRest',
  'Flicker',
  'Warden',
  'Handling',
  'Cooking',
  'Hunting',
  'Construction',
  'Growing',
  'Mining',
  'PlantCutting',
  'Smithing',
  'Tailoring',
  'Art',
  'Crafting',
  'Hauling',
  'Cleaning',
  'Research',
];

/**
 * Check if a colonist can perform a specific work type
 */
export function canDoWorkType(colonist: Colonist, workType: WorkType): boolean {
  const info = WORK_TYPE_INFO[workType];
  
  // Check health capabilities
  if (info.requiresCapability) {
    if (!colonist.health) return true; // Legacy colonists without health can do anything
    
    switch (info.requiresCapability) {
      case 'conscious':
        if (colonist.health.consciousness < 0.5) return false;
        break;
      case 'manipulation':
        if (colonist.health.manipulation < 0.3) return false;
        break;
      case 'movement':
        if (colonist.health.mobility < 0.3) return false;
        break;
    }
  }
  
  return true;
}

/**
 * Get the priority level for a colonist's work type (lower = higher priority)
 * Returns 999 if disabled
 */
export function getWorkPriority(colonist: Colonist, workType: WorkType): number {
  const priorities = (colonist as any).workPriorities as Record<WorkType, WorkPriority> | undefined;
  
  if (!priorities) {
    // Use defaults if not initialized
    const defaultPriority = DEFAULT_WORK_PRIORITIES[workType];
    return defaultPriority === 0 ? 999 : defaultPriority;
  }
  
  const priority = priorities[workType];
  return priority === 0 ? 999 : priority; // 0 means disabled (treat as lowest priority)
}

/**
 * Initialize work priorities for a colonist
 */
export function initializeWorkPriorities(colonist: Colonist): void {
  if ((colonist as any).workPriorities) return; // Already initialized
  
  // Start with default priorities
  const priorities: Record<WorkType, WorkPriority> = { ...DEFAULT_WORK_PRIORITIES };
  
  // Customize based on skills if available
  if (colonist.skills) {
    const skills = colonist.skills;
    
    // Boost priorities for high-skill areas (passion = higher priority)
    for (const [skillName, skill] of Object.entries(skills.byName)) {
      if (skill.level >= 8 || skill.passion === 'burning') {
        // Find related work types
        for (const [workType, info] of Object.entries(WORK_TYPE_INFO)) {
          if (info.relatedSkill === skillName) {
            const currentPriority = priorities[workType as WorkType];
            if (currentPriority > 1) {
              priorities[workType as WorkType] = Math.max(1, currentPriority - 1) as WorkPriority;
            }
          }
        }
      }
    }
  }
  
  (colonist as any).workPriorities = priorities;
}

/**
 * Get work type for a given task string
 */
export function getWorkTypeForTask(task: string | null): WorkType | null {
  if (!task) return null;
  
  switch (task) {
    case 'build': return 'Construction';
    case 'harvestFarm':
    case 'harvestWell': return 'Growing';
    case 'chop': return 'PlantCutting';
    case 'mine': return 'Mining';
    case 'doctor': return 'Doctor';
    case 'cooking': return 'Cooking';
    case 'haul': return 'Hauling';
    case 'haulFloorItem': return 'Hauling';
    case 'research': return 'Research';
    default: return null;
  }
}

/**
 * Evaluate all possible work for a colonist and return the best task
 * Returns null if no suitable work found
 */
export interface WorkCandidate {
  workType: WorkType;
  priority: number;
  task: string;
  target: any;
  distance?: number;
}

/**
 * Find the best work for a colonist based on priorities
 */
export function findBestWork(
  colonist: Colonist, 
  availableWork: WorkCandidate[]
): WorkCandidate | null {
  // Filter to work the colonist can do
  const capableWork = availableWork.filter(work => canDoWorkType(colonist, work.workType));
  
  if (capableWork.length === 0) return null;
  
  // Sort by priority (lower number = higher priority), then by distance
  capableWork.sort((a, b) => {
    const priorityA = getWorkPriority(colonist, a.workType);
    const priorityB = getWorkPriority(colonist, b.workType);
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB; // Lower priority number = do first
    }
    
    // Same priority - prefer closer work
    const distA = a.distance ?? 9999;
    const distB = b.distance ?? 9999;
    return distA - distB;
  });
  
  return capableWork[0] || null;
}

/**
 * Set a work priority for a colonist
 */
export function setWorkPriority(colonist: Colonist, workType: WorkType, priority: WorkPriority): void {
  if (!(colonist as any).workPriorities) {
    initializeWorkPriorities(colonist);
  }
  
  (colonist as any).workPriorities[workType] = priority;
}

/**
 * Cycle work priority (for UI clicks): 1 → 2 → 3 → 4 → disabled → 1
 */
export function cycleWorkPriority(colonist: Colonist, workType: WorkType): void {
  if (!(colonist as any).workPriorities) {
    initializeWorkPriorities(colonist);
  }
  
  const current = (colonist as any).workPriorities[workType] as WorkPriority;
  
  let next: WorkPriority;
  if (current === 1) next = 2;
  else if (current === 2) next = 3;
  else if (current === 3) next = 4;
  else if (current === 4) next = 0; // Disable
  else next = 1; // From disabled back to highest
  
  (colonist as any).workPriorities[workType] = next;
}
