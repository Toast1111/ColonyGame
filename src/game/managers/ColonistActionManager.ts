/**
 * ColonistActionManager - Handles all colonist actions and commands
 * 
 * Extracted from Game.ts lines 2976-3157 as part of the manager architecture refactor.
 * This manager handles context menu actions, drafting, task assignment, and player commands.
 */

import type { Colonist, Building } from '../types';
import type { Game } from '../Game';
import { hideContextMenu } from '../ui/contextMenu';

export class ColonistActionManager {
  constructor(private game: Game) {}

  /**
   * Handle context menu actions for colonists
   * This is the main entry point for all colonist commands from the context menu
   */
  handleContextMenuAction(actionId: string, colonist: Colonist): void {
    console.log(`Context menu action: ${actionId} for colonist:`, colonist.profile?.name);
    
    switch (actionId) {
      // Draft/Undraft
      case 'draft':
        this.handleDraftToggle(colonist);
        break;
        
      // Prioritize actions
      case 'prioritize_medical':
        this.prioritizeMedicalWork(colonist);
        break;
      case 'prioritize_work':
        this.prioritizeWork(colonist);
        break;
      case 'prioritize_build':
        this.prioritizeBuild(colonist);
        break;
      case 'prioritize_haul':
        this.prioritizeHaul(colonist);
        break;
      case 'prioritize_research':
        this.prioritizeResearch(colonist);
        break;
        
      // Force actions
      case 'force_rest':
        this.forceRest(colonist, true);
        break;
      case 'force_eat':
        this.forceEat(colonist, true);
        break;
      case 'force_work':
        this.forceWork(colonist);
        break;
      case 'force_guard':
        this.forceGuard(colonist);
        break;
        
      // Go to actions
      case 'goto_hq':
        this.sendToHQ(colonist);
        break;
      case 'goto_safety':
        this.sendToSafety(colonist);
        break;
      case 'goto_bed':
        this.sendToBed(colonist);
        break;
      case 'goto_food':
        this.sendToFood(colonist);
        break;
        
      // Medical actions (will be delegated to MedicalManager once implemented)
      case 'medical_bandage':
      case 'medical_treat_infection':
      case 'medical_surgery':
      case 'medical_pain_relief':
      case 'medical_treat_all':
      case 'medical_treat':
      case 'medical_rest':
      case 'medical_injury_summary':
      case 'medical_bandage_all_bleeding':
      case 'prioritize_treat_patient':
      case 'clear_prioritize_treat':
      case 'medical_rescue':
        // TODO: Delegate to MedicalManager once implemented
        console.log(`Medical action ${actionId} not yet delegated to MedicalManager`);
        break;
        
      // Basic actions
      case 'cancel':
        this.cancelTask(colonist);
        break;
      case 'follow':
        this.handleFollow(colonist);
        break;
        
      // Equipment actions
      default:
        if (actionId.startsWith('equip_')) {
          this.handleEquipWeapon(actionId, colonist);
        }
        break;
    }
    
    hideContextMenu(this.game);
  }

  /**
   * Handle draft/undraft toggle
   */
  private handleDraftToggle(colonist: Colonist): void {
    if (colonist.isDrafted) {
      // Undraft
      colonist.isDrafted = false;
      colonist.draftedTarget = null;
      colonist.draftedPosition = null;
      this.game.msg(`${colonist.profile?.name || 'Colonist'} undrafted`, 'info');
    } else {
      // Draft
      colonist.isDrafted = true;
      colonist.draftedTarget = null;
      colonist.draftedPosition = null;
      
      // Force clear any existing tasks/paths to allow immediate control
      colonist.task = null;
      colonist.target = null;
      colonist.path = undefined;
      colonist.pathIndex = undefined;
      colonist.pathGoal = undefined;
      
      // Force state change to drafted (will be picked up by FSM)
      colonist.state = 'drafted';
      colonist.stateSince = 0;
      
      this.game.msg(`${colonist.profile?.name || 'Colonist'} drafted for combat`, 'info');
    }
  }

  /**
   * Prioritize medical work
   */
  private prioritizeMedicalWork(colonist: Colonist): void {
    // TODO: Replace with proper MedicalManager delegation once implemented
    (this.game as any).setColonistMedicalPriority?.(colonist, true);
    this.game.msg(`${colonist.profile?.name || 'Colonist'} prioritizing medical work`, 'info');
  }

  /**
   * Prioritize general work tasks
   */
  private prioritizeWork(colonist: Colonist): void {
    const target = this.findNearestWorkTarget(colonist);
    this.game.taskManager.setTask(colonist, 'work', target, { isPlayerCommand: true });
    this.game.msg(`${colonist.profile?.name || 'Colonist'} prioritizing work tasks`, 'info');
  }

  /**
   * Prioritize construction/building tasks
   */
  private prioritizeBuild(colonist: Colonist): void {
    const target = this.findNearestBuildTarget(colonist);
    this.game.taskManager.setTask(colonist, 'build', target, { isPlayerCommand: true });
    this.game.msg(`${colonist.profile?.name || 'Colonist'} prioritizing construction`, 'info');
  }

  /**
   * Prioritize hauling tasks
   */
  private prioritizeHaul(colonist: Colonist): void {
    // Future: implement hauling system
    this.game.msg(`${colonist.profile?.name || 'Colonist'} prioritizing hauling`, 'info');
  }

  /**
   * Prioritize research tasks
   */
  private prioritizeResearch(colonist: Colonist): void {
    // Future: implement research system
    this.game.msg(`${colonist.profile?.name || 'Colonist'} prioritizing research`, 'info');
  }

  /**
   * Force colonist to rest
   */
  private forceRest(colonist: Colonist, isPlayerCommand = false): void {
    // TODO: Replace with proper ColonistNavigationManager delegation once implemented
    (this.game as any).forceColonistToRest?.(colonist, isPlayerCommand);
  }

  /**
   * Force colonist to eat
   */
  private forceEat(colonist: Colonist, isPlayerCommand = false): void {
    // TODO: Replace with proper ColonistNavigationManager delegation once implemented
    (this.game as any).forceColonistToEat?.(colonist, isPlayerCommand);
  }

  /**
   * Force colonist to work
   */
  private forceWork(colonist: Colonist): void {
    const target = this.findNearestWorkTarget(colonist);
    this.game.taskManager.setTask(colonist, 'work', target, { isPlayerCommand: true });
    this.game.msg(`${colonist.profile?.name || 'Colonist'} forced to work`, 'info');
  }

  /**
   * Force colonist to guard current position
   */
  private forceGuard(colonist: Colonist): void {
    this.game.taskManager.setTask(colonist, 'guard', { x: colonist.x, y: colonist.y }, { isPlayerCommand: true });
    this.game.msg(`${colonist.profile?.name || 'Colonist'} guarding area`, 'info');
  }

  /**
   * Send colonist to HQ
   */
  private sendToHQ(colonist: Colonist): void {
    // TODO: Replace with proper ColonistNavigationManager delegation once implemented
    (this.game as any).sendColonistToHQ?.(colonist);
  }

  /**
   * Send colonist to safety
   */
  private sendToSafety(colonist: Colonist): void {
    // TODO: Replace with proper ColonistNavigationManager delegation once implemented
    (this.game as any).sendColonistToSafety?.(colonist);
  }

  /**
   * Send colonist to bed
   */
  private sendToBed(colonist: Colonist): void {
    // TODO: Replace with proper ColonistNavigationManager delegation once implemented
    (this.game as any).sendColonistToBed?.(colonist);
  }

  /**
   * Send colonist to food storage
   */
  private sendToFood(colonist: Colonist): void {
    // TODO: Replace with proper ColonistNavigationManager delegation once implemented
    (this.game as any).sendColonistToFood?.(colonist);
  }

  /**
   * Cancel colonist's current task
   */
  private cancelTask(colonist: Colonist): void {
    this.game.taskManager.setTask(colonist, 'idle', { x: colonist.x, y: colonist.y });
    this.game.msg(`${colonist.profile?.name || 'Colonist'} task cancelled`, 'info');
  }

  /**
   * Handle follow toggle
   */
  private handleFollow(colonist: Colonist): void {
    if (this.game.follow && this.game.selColonist === colonist) {
      this.game.follow = false;
      this.game.selColonist = null;
      this.game.msg('Stopped following', 'info');
    } else {
      this.game.selColonist = colonist;
      this.game.follow = true;
      this.game.msg(`Following ${colonist.profile?.name || 'colonist'}`, 'info');
    }
  }

  /**
   * Find nearest unfinished building for work tasks
   */
  private findNearestWorkTarget(colonist: Colonist): Building | { x: number; y: number } {
    let nearest = null;
    let minDist = Infinity;
    
    for (const building of this.game.buildings) {
      if (!building.done) {
        const dist = Math.hypot(colonist.x - (building.x + building.w/2), colonist.y - (building.y + building.h/2));
        if (dist < minDist) {
          minDist = dist;
          nearest = building;
        }
      }
    }
    
    // Import rand from utils
    const rand = (min: number, max: number) => Math.random() * (max - min) + min;
    return nearest || { x: colonist.x + rand(-50, 50), y: colonist.y + rand(-50, 50) };
  }

  /**
   * Find nearest building target for construction tasks
   */
  private findNearestBuildTarget(colonist: Colonist): Building | { x: number; y: number } {
    return this.findNearestWorkTarget(colonist);
  }
  
  /**
   * Handle equipping a specific weapon
   */
  private handleEquipWeapon(actionId: string, colonist: Colonist): void {
    const weaponId = actionId.replace('equip_', '');
    
    // Find the weapon item
    const rim = (this.game as any).itemManager;
    if (!rim) return;
    
    const allFloorItems = rim.floorItems.getAllItems();
    const weaponItem = allFloorItems.find((item: any) => item.id === weaponId);
    
    if (!weaponItem) {
      this.game.msg('Weapon not found!', 'bad');
      return;
    }
    
    // Assign equipment pickup task to colonist
    colonist.task = 'equipment';
    colonist.target = weaponItem;
    colonist.state = 'equipment';
    
    this.game.msg(`${colonist.profile?.name || 'Colonist'} ordered to equip ${weaponItem.type}`, 'info');
  }
}
