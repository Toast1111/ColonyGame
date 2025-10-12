/**
 * Contextual Action Panel - Smart panel that adapts to selection
 * 
 * Features:
 * - Shows relevant actions based on selected colonist/building
 * - Smooth slide animations
 * - Touch-friendly buttons
 * - Keyboard shortcuts displayed
 */

import type { Colonist, Building } from '../types';

interface ActionButton {
  id: string;
  label: string;
  icon: string;
  hotkey?: string;
  enabled: boolean;
  action: () => void;
}

export function drawContextualPanel(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  selectedColonist: Colonist | null,
  selectedBuilding: Building | null,
  game: any
) {
  // Only show if something is selected
  if (!selectedColonist && !selectedBuilding) return;
  
  const actions = getContextualActions(selectedColonist, selectedBuilding, game);
  if (actions.length === 0) return;
  
  const panelWidth = game.scale(280);
  const buttonHeight = game.scale(48);
  const spacing = game.scale(8);
  const panelHeight = actions.length * (buttonHeight + spacing) + spacing;
  
  const x = canvas.width / 2 - panelWidth / 2;
  const y = canvas.height - panelHeight - game.scale(100);
  
  ctx.save();
  
  // Draw panel background
  ctx.fillStyle = 'rgba(11, 18, 32, 0.92)';
  ctx.fillRect(x, y, panelWidth, panelHeight);
  
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, panelWidth, panelHeight);
  
  // Draw title
  const colonistName = selectedColonist?.profile?.name || 'Colonist';
  const buildingName = selectedBuilding?.kind || 'Building';
  const title = selectedColonist ? `Actions: ${colonistName}` : `Building: ${buildingName}`;
  ctx.fillStyle = '#cbd5e1';
  ctx.font = game.getScaledFont(12, '600');
  ctx.textAlign = 'center';
  ctx.fillText(title, x + panelWidth / 2, y - game.scale(16));
  
  // Draw action buttons
  let currentY = y + spacing;
  
  actions.forEach((action, index) => {
    const buttonX = x + spacing;
    const buttonY = currentY;
    const buttonW = panelWidth - spacing * 2;
    
    // Draw button background
    const isEnabled = action.enabled;
    ctx.fillStyle = isEnabled ? 'rgba(30, 41, 59, 0.9)' : 'rgba(30, 41, 59, 0.5)';
    ctx.fillRect(buttonX, buttonY, buttonW, buttonHeight);
    
    ctx.strokeStyle = isEnabled ? 'rgba(71, 85, 105, 0.8)' : 'rgba(71, 85, 105, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(buttonX, buttonY, buttonW, buttonHeight);
    
    // Draw icon
    ctx.fillStyle = isEnabled ? '#60a5fa' : '#64748b';
    ctx.font = game.getScaledFont(20);
    ctx.textAlign = 'left';
    ctx.fillText(action.icon, buttonX + game.scale(12), buttonY + buttonHeight / 2 + game.scale(6));
    
    // Draw label
    ctx.fillStyle = isEnabled ? '#e2e8f0' : '#64748b';
    ctx.font = game.getScaledFont(14, '600');
    ctx.fillText(action.label, buttonX + game.scale(44), buttonY + buttonHeight / 2 + game.scale(4));
    
    // Draw hotkey if available
    if (action.hotkey) {
      ctx.fillStyle = isEnabled ? '#94a3b8' : '#475569';
      ctx.font = game.getScaledFont(11, '600');
      ctx.textAlign = 'right';
      ctx.fillText(action.hotkey, buttonX + buttonW - game.scale(12), buttonY + buttonHeight / 2 + game.scale(4));
    }
    
    currentY += buttonHeight + spacing;
  });
  
  ctx.restore();
}

function getContextualActions(
  colonist: Colonist | null,
  building: Building | null,
  game: any
): ActionButton[] {
  const actions: ActionButton[] = [];
  
  if (colonist) {
    // Colonist actions
    const isDowned = colonist.state === 'downed';
    const colonistName = colonist.profile?.name || 'Colonist';
    
    if (!isDowned) {
      actions.push({
        id: 'draft',
        label: colonist.isDrafted ? 'Undraft' : 'Draft',
        icon: colonist.isDrafted ? '⚔️' : '🎯',
        hotkey: 'R',
        enabled: true,
        action: () => {
          colonist.isDrafted = !colonist.isDrafted;
          if (game.showToast) {
            game.showToast(
              `${colonistName} ${colonist.isDrafted ? 'drafted' : 'undrafted'}`,
              'info'
            );
          }
        },
      });
    }
    
    if (colonist.hp < 100 && !isDowned) {
      actions.push({
        id: 'rest',
        label: 'Rest Now',
        icon: '😴',
        hotkey: 'Z',
        enabled: true,
        action: () => {
          colonist.task = 'resting';
          if (game.showToast) {
            game.showToast(`${colonistName} is resting`, 'info');
          }
        },
      });
    }
    
    if (isDowned) {
      actions.push({
        id: 'rescue',
        label: 'Rescue to Bed',
        icon: '🚑',
        hotkey: 'E',
        enabled: true,
        action: () => {
          if (game.assignRescueMission) {
            game.assignRescueMission(colonist);
          }
        },
      });
    }
    
    if (colonist.health?.injuries && colonist.health.injuries.length > 0 && !isDowned) {
      const hasBleeding = colonist.health.injuries.some((inj: any) => inj.bleeding);
      
      if (hasBleeding) {
        actions.push({
          id: 'bandage',
          label: 'Bandage Bleeding',
          icon: '🩸',
          hotkey: 'B',
          enabled: true,
          action: () => {
            if (game.assignMedicalTreatment) {
              game.assignMedicalTreatment(colonist, 'bandage_wound');
            }
          },
        });
      }
      
      actions.push({
        id: 'treat',
        label: 'Treat Injuries',
        icon: '🏥',
        hotkey: 'T',
        enabled: true,
        action: () => {
          if (game.assignMedicalTreatment) {
            game.assignMedicalTreatment(colonist, 'tend_wounds');
          }
        },
      });
    }
    
    actions.push({
      id: 'profile',
      label: 'View Profile',
      icon: '👤',
      hotkey: 'P',
      enabled: true,
      action: () => {
        // Profile is already shown when selected
      },
    });
  } else if (building) {
    // Building actions
    if (!building.done) {
      actions.push({
        id: 'cancel',
        label: 'Cancel Construction',
        icon: '✗',
        hotkey: 'Del',
        enabled: true,
        action: () => {
          if (game.cancelBuilding) {
            game.cancelBuilding(building);
          }
        },
      });
    }
    
    if (building.kind === 'stock' || building.kind === 'warehouse') {
      actions.push({
        id: 'inventory',
        label: 'View Inventory',
        icon: '📦',
        hotkey: 'I',
        enabled: true,
        action: () => {
          if (game.showBuildingInventory) {
            game.showBuildingInventory(building);
          }
        },
      });
    }
    
    if (building.done && building.kind !== 'hq') {
      actions.push({
        id: 'demolish',
        label: 'Demolish',
        icon: '🔨',
        hotkey: 'Del',
        enabled: true,
        action: () => {
          if (game.demolishBuilding) {
            game.demolishBuilding(building);
          }
        },
      });
    }
  }
  
  return actions;
}

export function handleContextualPanelClick(
  x: number,
  y: number,
  canvas: HTMLCanvasElement,
  selectedColonist: Colonist | null,
  selectedBuilding: Building | null,
  game: any
): boolean {
  if (!selectedColonist && !selectedBuilding) return false;
  
  const actions = getContextualActions(selectedColonist, selectedBuilding, game);
  if (actions.length === 0) return false;
  
  const panelWidth = game.scale(280);
  const buttonHeight = game.scale(48);
  const spacing = game.scale(8);
  const panelHeight = actions.length * (buttonHeight + spacing) + spacing;
  
  const panelX = canvas.width / 2 - panelWidth / 2;
  const panelY = canvas.height - panelHeight - game.scale(100);
  
  let currentY = panelY + spacing;
  
  for (const action of actions) {
    const buttonX = panelX + spacing;
    const buttonY = currentY;
    const buttonW = panelWidth - spacing * 2;
    
    if (x >= buttonX && x <= buttonX + buttonW &&
        y >= buttonY && y <= buttonY + buttonHeight) {
      if (action.enabled) {
        action.action();
        return true;
      }
    }
    
    currentY += buttonHeight + spacing;
  }
  
  return false;
}
