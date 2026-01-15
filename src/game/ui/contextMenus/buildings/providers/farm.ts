import type { ContextMenuItem } from '../../types';
import { buildingContextMenuManager } from '../manager';

type CropOption = { id: string; label: string; type: string; desc: string; growTime: number; yield: number };

const CROP_OPTIONS: CropOption[] = [
  { id: 'farm_crop_wheat', label: 'Wheat', type: 'wheat', desc: 'Grow wheat for bread/cooking.', growTime: 1, yield: 10 },
  { id: 'farm_crop_healroot', label: 'Healroot', type: 'healroot', desc: 'Medicinal herb used for crafting medicine.', growTime: 2, yield: 6 },
];

buildingContextMenuManager.register('farm', ({ game, building }) => {
  if (building.kind !== 'farm') return null;
  const current = (building as any).cropType || 'wheat';

  const items: ContextMenuItem<typeof building>[] = [];

  items.push({
    id: 'farm_crop_info',
    label: `Current crop: ${CROP_OPTIONS.find(o => o.type === current)?.label || current}`,
    icon: '🌱',
    enabled: false,
  });

  for (const opt of CROP_OPTIONS) {
    items.push({
      id: opt.id,
      label: opt.label,
      icon: opt.type === 'healroot' ? '🌿' : '🌾',
      enabled: current !== opt.type,
      action: ({ target }) => {
        (target as any).cropType = opt.type;
        (target as any).growTime = opt.growTime;
        target.growth = 0;
        target.ready = false;
        (target as any).yieldPerHarvest = opt.yield;
        game.msg(`Farm crop set to ${opt.label}`, 'info');
      },
      tooltip: `${opt.desc} (Grows in ~${opt.growTime * 2} days)`,
    });
  }

  return items;
});
