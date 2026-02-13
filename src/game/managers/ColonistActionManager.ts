/**
 * ColonistActionManager - Handles all colonist actions and commands
 * 
 * Extracted from Game.ts lines 2976-3157 as part of the manager architecture refactor.
 * This manager handles context menu actions, drafting, task assignment, and player commands.
 */

import type { Colonist } from '../types';
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
      default:
        console.warn('Unhandled colonist context menu action:', actionId);
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

      // Ensure the colonist exits any building so drafted orders/combat apply.
      if (colonist.inside) {
        this.game.leaveBuilding(colonist);
      }
      
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

}
