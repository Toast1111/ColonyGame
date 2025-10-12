import type { Colonist } from '../../types';
import type { Game } from '../../Game';
import type { ContextMenuDescriptor, ContextMenuItem } from './types';
import { openContextMenu } from '../contextMenu';

export function showColonistContextMenu(game: Game, colonist: Colonist, screenX: number, screenY: number) {
  const descriptor = buildColonistContextMenuDescriptor(game, colonist, screenX, screenY);
  openContextMenu(game, descriptor);
}

export function buildColonistContextMenuDescriptor(game: Game, colonist: Colonist, screenX: number, screenY: number): ContextMenuDescriptor<Colonist> {
  const isIdle = !colonist.task || colonist.task === 'idle';
  const isInjured = colonist.hp < 50;
  const isHungry = (colonist.hunger || 0) > 60;
  const isTired = (colonist.fatigue || 0) > 60;

  const injuries = colonist.health?.injuries ?? [];
  const hasInjuries = injuries.length > 0;
  const hasBleedingInjuries = injuries.some((inj) => inj.bleeding > 0);
  const hasInfection = injuries.some((inj) => inj.infected);
  const hasHighPain = (colonist.health?.totalPain || 0) > 0.3;
  const needsSurgery = injuries.some((inj) => inj.type === 'gunshot' || (inj.type === 'fracture' && inj.severity > 0.6));

  const isDowned = colonist.state === 'downed';

  const medicalItems: ContextMenuItem<Colonist>[] = [];
  if (isDowned) {
    medicalItems.push({ id: 'medical_rescue', label: 'Rescue (Carry to Bed)', icon: '🚑', enabled: true });
  }
  if (hasBleedingInjuries) {
    medicalItems.push({ id: 'medical_bandage', label: 'Bandage Wounds', icon: '🩹', enabled: true });
    medicalItems.push({ id: 'medical_bandage_all_bleeding', label: 'Bandage All Bleeding', icon: '🩸', enabled: true });
  }
  if (hasInfection) {
    medicalItems.push({ id: 'medical_treat_infection', label: 'Treat Infection', icon: '💊', enabled: true });
  }
  if (needsSurgery) {
    medicalItems.push({ id: 'medical_surgery', label: 'Surgery', icon: '⚕️', enabled: true });
  }
  if (hasHighPain) {
    medicalItems.push({ id: 'medical_pain_relief', label: 'Pain Relief', icon: '💉', enabled: true });
  }
  if (hasInjuries) {
    medicalItems.push({ id: 'medical_treat_all', label: 'Treat All Injuries', icon: '🏥', enabled: true });
    medicalItems.push({ id: 'medical_rest', label: 'Bed Rest', icon: '🛌', enabled: true });
    medicalItems.push({ id: 'medical_injury_summary', label: 'Injury Summary', icon: '📋', enabled: true });
  }
  if (medicalItems.length === 0 && isInjured) {
    medicalItems.push({ id: 'medical_treat', label: 'Basic Treatment', icon: '🩹', enabled: true });
  }

  // Build a flatter, more intuitive context menu structure
  const items: ContextMenuItem<Colonist>[] = [];
  
  // 1. DRAFT/COMBAT - Most common action first
  items.push({
    id: 'draft',
    label: colonist.isDrafted ? '⚔️ Undraft' : '🎯 Draft for Combat',
    icon: colonist.isDrafted ? '⚔️' : '🎯',
    enabled: true,
  });
  
  // 2. MEDICAL - Show critical medical actions at top level if needed
  if (isDowned) {
    items.push({ 
      id: 'medical_rescue', 
      label: '🚑 Rescue to Bed', 
      icon: '🚑', 
      enabled: true 
    });
  } else if (hasBleedingInjuries) {
    items.push({ 
      id: 'medical_bandage_all_bleeding', 
      label: '🩸 Bandage Bleeding', 
      icon: '🩸', 
      enabled: true 
    });
  } else if (hasInjuries) {
    items.push({ 
      id: 'medical_treat_all', 
      label: '🏥 Treat Injuries', 
      icon: '🏥', 
      enabled: true 
    });
  }
  
  // 3. QUICK ACTIONS - Common commands
  if (isTired) {
    items.push({ id: 'force_rest', label: '😴 Rest Now', icon: '😴', enabled: true });
  }
  if (isHungry) {
    items.push({ id: 'force_eat', label: '🍽️ Eat Now', icon: '🍽️', enabled: true });
  }
  
  // 4. MORE OPTIONS - Group less common actions in submenus
  const moreActions: ContextMenuItem<Colonist>[] = [];
  
  // Prioritize submenu (only if useful)
  if (!isDowned) {
    moreActions.push({
      id: 'prioritize',
      label: 'Set Priority',
      icon: '⚡',
      enabled: true,
      submenu: [
        { id: 'prioritize_medical', label: 'Medical Work', icon: '🏥', enabled: true },
        { id: 'prioritize_work', label: 'Work Tasks', icon: '🔨', enabled: true },
        { id: 'prioritize_build', label: 'Construction', icon: '🏗️', enabled: true },
        { id: 'prioritize_haul', label: 'Hauling', icon: '📦', enabled: true },
      ],
    });
  }
  
  // Go to submenu
  moreActions.push({
    id: 'goto',
    label: 'Send To...',
    icon: '🎯',
    enabled: true,
    submenu: [
      { id: 'goto_bed', label: 'Nearest Bed', icon: '🛏️', enabled: true },
      { id: 'goto_food', label: 'Food Storage', icon: '🥘', enabled: true },
      { id: 'goto_hq', label: 'HQ', icon: '🏠', enabled: true },
      { id: 'goto_safety', label: 'Safe Room', icon: '🛡️', enabled: true },
    ],
  });
  
  // Medical submenu (if there are multiple medical options)
  if (medicalItems.length > 1) {
    moreActions.push({
      id: 'medical',
      label: 'More Medical...',
      icon: '🏥',
      enabled: true,
      submenu: medicalItems,
    });
  }
  
  // Add "More" submenu if we have additional actions
  if (moreActions.length > 0) {
    items.push({
      id: 'more',
      label: 'More Actions...',
      icon: '⋯',
      enabled: true,
      submenu: moreActions,
    });
  }
  
  // 5. UTILITY ACTIONS - Always at bottom
  if (colonist.target) {
    items.push({ id: 'cancel', label: '❌ Cancel Task', icon: '❌', enabled: true });
  }
  items.push({
    id: 'follow',
    label: game.follow && game.selColonist === colonist ? '👁️ Stop Following' : '👁️ Follow Camera',
    icon: '👁️',
    enabled: true,
  });

  return {
    target: colonist,
    screenX,
    screenY,
    items,
    onSelect: ({ item }) => {
      game.handleContextMenuAction(item.id, colonist);
    },
  };
}
