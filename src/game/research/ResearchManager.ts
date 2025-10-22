/**
 * Research Manager
 * 
 * Handles research state, progress, and unlocks.
 * Separate from Game.ts for maintainability.
 */

import { RESEARCH_TREE, ResearchNode, isResearchAvailable, getResearch } from './researchDatabase';
import type { Building } from '../types';

export interface ResearchProgress {
  researchId: string;
  progress: number;      // Current research points accumulated
  startTime: number;     // When research started
  researcherCount: number; // Number of colonists actively researching
}

export class ResearchManager {
  private completedResearch: Set<string> = new Set();
  private currentResearch: ResearchProgress | null = null;
  private researchPoints: number = 0;
  private unlockedBuildings: Set<string> = new Set();
  private unlockedItems: Set<string> = new Set();
  private unlockedMechanics: Set<string> = new Set();
  private partialResearch: Map<string, number> = new Map(); // Saved progress for canceled research

  constructor() {
    // Initialize with tutorial unlocks
    this.completeResearch('agriculture');
    this.completeResearch('basic_medicine');
  }

  /**
   * Check if a research is completed
   */
  isCompleted(researchId: string): boolean {
    return this.completedResearch.has(researchId);
  }

  /**
   * Check if a research is currently being worked on
   */
  isInProgress(researchId: string): boolean {
    return this.currentResearch?.researchId === researchId;
  }

  /**
   * Check if a research is available to start
   */
  isAvailable(researchId: string): boolean {
    if (this.completedResearch.has(researchId)) return false;
    return isResearchAvailable(researchId, this.completedResearch);
  }

  /**
   * Get current research progress
   */
  getCurrentResearch(): ResearchProgress | null {
    return this.currentResearch;
  }

  /**
   * Get progress percentage for current research (0-100)
   */
  getCurrentProgress(): number {
    if (!this.currentResearch) return 0;
    const node = getResearch(this.currentResearch.researchId);
    if (!node) return 0;
    return Math.min(100, (this.currentResearch.progress / node.cost) * 100);
  }

  /**
   * Start researching a technology
   */
  startResearch(researchId: string, currentTime: number): boolean {
    if (!this.isAvailable(researchId)) {
      console.warn(`Cannot start research ${researchId}: not available`);
      return false;
    }

    if (this.currentResearch) {
      // Silently fail - already researching something else
      return false;
    }

    const node = getResearch(researchId);
    if (!node) {
      console.warn(`Research ${researchId} not found`);
      return false;
    }

    // Restore any partial progress from previous attempt
    const savedProgress = this.partialResearch.get(researchId) || 0;
    
    this.currentResearch = {
      researchId,
      progress: savedProgress,
      startTime: currentTime,
      researcherCount: 0
    };

    if (savedProgress > 0) {
      console.log(`Resumed research: ${node.name} (${savedProgress.toFixed(0)}/${node.cost} RP)`);
    } else {
      console.log(`Started research: ${node.name}`);
    }
    return true;
  }

  /**
   * Cancel current research (saves progress for later)
   */
  cancelResearch(): boolean {
    if (!this.currentResearch) return false;
    
    const node = getResearch(this.currentResearch.researchId);
    
    // Save current progress so it can be resumed later
    if (this.currentResearch.progress > 0) {
      this.partialResearch.set(this.currentResearch.researchId, this.currentResearch.progress);
      console.log(`Cancelled research: ${node?.name} (saved ${this.currentResearch.progress.toFixed(0)} RP)`);
    } else {
      console.log(`Cancelled research: ${node?.name}`);
    }
    
    this.currentResearch = null;
    return true;
  }
  
  /**
   * Get saved progress for a research (if any)
   */
  getPartialProgress(researchId: string): number {
    return this.partialResearch.get(researchId) || 0;
  }

  /**
   * Add research progress (called by research bench)
   */
  addProgress(amount: number): boolean {
    if (!this.currentResearch) return false;

    this.currentResearch.progress += amount;
    const node = getResearch(this.currentResearch.researchId);
    
    if (!node) {
      this.currentResearch = null;
      return false;
    }

    // Check if research is complete
    if (this.currentResearch.progress >= node.cost) {
      this.completeResearch(node.id);
      return true;
    }

    return false;
  }

  /**
   * Update researcher count (called each frame)
   */
  updateResearcherCount(count: number): void {
    if (this.currentResearch) {
      this.currentResearch.researcherCount = count;
    }
  }

  /**
   * Complete a research and unlock its benefits
   */
  private completeResearch(researchId: string): void {
    const node = getResearch(researchId);
    if (!node) return;

    this.completedResearch.add(researchId);
    
    // Apply unlocks
    node.unlocks.buildings?.forEach(buildingKind => {
      this.unlockedBuildings.add(buildingKind);
    });
    
    node.unlocks.items?.forEach(itemDef => {
      this.unlockedItems.add(itemDef);
    });
    
    node.unlocks.mechanics?.forEach(mechanic => {
      this.unlockedMechanics.add(mechanic);
    });

    // Clear current research
    if (this.currentResearch?.researchId === researchId) {
      this.currentResearch = null;
    }

    console.log(`Research completed: ${node.name}`);
    console.log(`Unlocked:`, node.unlocks);
  }

  /**
   * Check if a building is unlocked
   */
  isBuildingUnlocked(buildingKind: string): boolean {
    // Tutorial buildings always unlocked
    const alwaysUnlocked = ['hq', 'house', 'farm', 'bed', 'path', 'pantry', 'stove', 
                            'warehouse', 'medical_bed', 'research_bench'];
    if (alwaysUnlocked.includes(buildingKind)) return true;
    
    return this.unlockedBuildings.has(buildingKind);
  }

  /**
   * Check if an item is unlocked for crafting
   */
  isItemUnlocked(itemDef: string): boolean {
    return this.unlockedItems.has(itemDef);
  }

  /**
   * Check if a mechanic is unlocked
   */
  isMechanicUnlocked(mechanic: string): boolean {
    return this.unlockedMechanics.has(mechanic);
  }

  /**
   * Get all completed research IDs
   */
  getCompletedResearch(): string[] {
    return Array.from(this.completedResearch);
  }

  /**
   * Get research tree with completion status
   */
  getResearchTreeWithStatus(): Array<ResearchNode & { completed: boolean; available: boolean; inProgress: boolean }> {
    return Object.values(RESEARCH_TREE).map(node => ({
      ...node,
      completed: this.isCompleted(node.id),
      available: this.isAvailable(node.id),
      inProgress: this.isInProgress(node.id)
    }));
  }

  /**
   * Serialize research state for saving
   */
  serialize(): any {
    return {
      completedResearch: Array.from(this.completedResearch),
      currentResearch: this.currentResearch,
      researchPoints: this.researchPoints,
      unlockedBuildings: Array.from(this.unlockedBuildings),
      unlockedItems: Array.from(this.unlockedItems),
      unlockedMechanics: Array.from(this.unlockedMechanics),
      partialResearch: Array.from(this.partialResearch.entries()) // Save partial progress
    };
  }

  /**
   * Deserialize research state from save
   */
  deserialize(data: any): void {
    this.completedResearch = new Set(data.completedResearch || []);
    this.currentResearch = data.currentResearch || null;
    this.researchPoints = data.researchPoints || 0;
    this.unlockedBuildings = new Set(data.unlockedBuildings || []);
    this.unlockedItems = new Set(data.unlockedItems || []);
    this.unlockedMechanics = new Set(data.unlockedMechanics || []);
    this.partialResearch = new Map(data.partialResearch || []); // Restore partial progress
  }
}
