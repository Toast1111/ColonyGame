import { HQ_POS } from '../constants';
import type { ItemType } from '../types/items';

export const isGameReadyForEvents = (game: any): boolean => {
  if (game?.tutorialSystem?.isActive?.()) return false;
  if (game?.gameOverScreen?.isActive?.()) return false;
  return (game?.colonists || []).some((c: any) => c.alive);
};

export const livingColonists = (game: any): any[] => {
  return (game?.colonists || []).filter((c: any) => c.alive);
};

export const pickColonist = (game: any, rng: () => number): any | null => {
  const colonists = livingColonists(game);
  if (!colonists.length) return null;
  return colonists[Math.floor(rng() * colonists.length)] ?? null;
};

export const dropAroundHQ = (game: any, itemType: ItemType, quantity: number, rng: () => number): void => {
  if (!game?.itemManager || quantity <= 0) return;

  const angle = rng() * Math.PI * 2;
  const radius = 42 + rng() * 68;
  const position = {
    x: HQ_POS.x + Math.cos(angle) * radius,
    y: HQ_POS.y + Math.sin(angle) * radius
  };

  game.itemManager.dropItems(itemType, quantity, position, { source: 'event' });
  game.syncResourcesFromStockpiles?.();
};
