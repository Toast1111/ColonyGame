import type { Colonist } from '../../types';
import type { Game } from '../../Game';
import type { ContextMenuDescriptor, ContextMenuItem } from './types';
import { openContextMenu } from '../contextMenu';

export function showColonistContextMenu(game: Game, colonist: Colonist, screenX: number, screenY: number) {
  const descriptor = buildColonistContextMenuDescriptor(game, colonist, screenX, screenY);
  openContextMenu(game, descriptor);
}

export function buildColonistContextMenuDescriptor(game: Game, colonist: Colonist, screenX: number, screenY: number): ContextMenuDescriptor<Colonist> {
  const items: ContextMenuItem<Colonist>[] = [
    {
      id: 'draft',
      label: colonist.isDrafted ? 'Undraft' : 'Draft for Combat',
      icon: colonist.isDrafted ? '⚔️' : '🎯',
      enabled: true,
    }
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
