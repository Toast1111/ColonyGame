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

  const items: ContextMenuItem<Colonist>[] = [
    {
      id: 'prioritize',
      label: 'Prioritize',
      icon: '⚡',
      enabled: true,
      submenu: [
        { id: 'prioritize_medical', label: 'Medical Work', icon: '🏥', enabled: true },
        { id: 'prioritize_work', label: 'Work Tasks', icon: '🔨', enabled: true },
        { id: 'prioritize_build', label: 'Construction', icon: '🏗️', enabled: true },
        { id: 'prioritize_haul', label: 'Hauling', icon: '📦', enabled: true },
        { id: 'prioritize_research', label: 'Research', icon: '🔬', enabled: true },
        ...((game.selColonist && game.selColonist !== colonist && (hasInjuries || isInjured))
          ? (() => {
              const doctor = game.selColonist;
              const already = (doctor as any).assignedMedicalPatientId && (doctor as any).assignedMedicalPatientId === (colonist as any).id;
              return [
                {
                  id: already ? 'clear_prioritize_treat' : 'prioritize_treat_patient',
                  label: already
                    ? `Clear Treat ${colonist.profile?.name || 'Patient'}`
                    : `Treat ${colonist.profile?.name || 'Patient'} First`,
                  icon: '🩺',
                  enabled: true,
                },
              ];
            })()
          : []),
      ],
    },
    {
      id: 'force',
      label: 'Force',
      icon: '❗',
      enabled: true,
      submenu: [
        { id: 'force_rest', label: 'Rest Now', icon: '😴', enabled: isTired },
        { id: 'force_eat', label: 'Eat Now', icon: '🍽️', enabled: isHungry },
        { id: 'force_work', label: 'Work', icon: '⚒️', enabled: isIdle },
        { id: 'force_guard', label: 'Guard Area', icon: '🛡️', enabled: true },
      ],
    },
    {
      id: 'goto',
      label: 'Go To',
      icon: '🎯',
      enabled: true,
      submenu: [
        { id: 'goto_hq', label: 'HQ', icon: '🏠', enabled: true },
        { id: 'goto_safety', label: 'Safe Room', icon: '🛡️', enabled: true },
        { id: 'goto_bed', label: 'Nearest Bed', icon: '🛏️', enabled: true },
        { id: 'goto_food', label: 'Food Storage', icon: '🥘', enabled: true },
      ],
    },
    {
      id: 'medical',
      label: 'Medical',
      icon: '🏥',
      enabled: hasInjuries || isInjured,
      submenu: medicalItems,
    },
    { id: 'cancel', label: 'Cancel Current Task', icon: '❌', enabled: !!colonist.target },
    {
      id: 'follow',
      label: game.follow && game.selColonist === colonist ? 'Stop Following' : 'Follow',
      icon: '👁️',
      enabled: true,
    },
  ];

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
