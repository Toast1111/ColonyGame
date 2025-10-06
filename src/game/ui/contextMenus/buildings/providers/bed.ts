import type { ContextMenuItem } from '../../types';
import { buildingContextMenuManager } from '../manager';

buildingContextMenuManager.register('bed', ({ game, building }) => {
  if (building.kind !== 'bed') {
    return null;
  }

  const isMedical = Boolean((building as any).isMedicalBed);

  const toggleItem: ContextMenuItem<typeof building> = {
    id: isMedical ? 'bed_unset_medical' : 'bed_set_medical',
    label: isMedical ? 'Unset Medical Bed' : 'Set as Medical Bed',
    icon: isMedical ? '🛌' : '⚕️',
    enabled: true,
    action: ({ game, target }) => {
      target.isMedicalBed = !target.isMedicalBed;
      const nowMedical = Boolean(target.isMedicalBed);
      game.msg(
        nowMedical ? 'Bed designated as a medical bed' : 'Bed returned to standard use',
        nowMedical ? 'good' : 'info'
      );
    },
  };

  const infoItem: ContextMenuItem<typeof building> = {
    id: 'bed_medical_info',
    label: isMedical ? 'Medical bed (patients only)' : 'Standard bed (rest only)',
    icon: 'ℹ️',
    enabled: false,
  };

  return [infoItem, toggleItem];
});
