import type { Building, BuildingKind } from '../../../types';
import type { Game } from '../../../Game';
import type { ContextMenuDescriptor, ContextMenuItem } from '../types';
import { openContextMenu } from '../../contextMenu';

type BuildingContextMenuProvider = (args: { game: Game; building: Building }) => ContextMenuItem<Building>[] | null | undefined;

type ProviderMap = Map<BuildingKind | '*', BuildingContextMenuProvider[]>;

export class BuildingContextMenuManager {
  private providers: ProviderMap = new Map();

  register(kind: BuildingKind | '*', provider: BuildingContextMenuProvider) {
    const key = kind;
    const existing = this.providers.get(key) ?? [];
    existing.push(provider);
    this.providers.set(key, existing);
  }

  collectItems(game: Game, building: Building): ContextMenuItem<Building>[] {
    const items: ContextMenuItem<Building>[] = [];
    const perKind = this.providers.get(building.kind) ?? [];
    const globals = this.providers.get('*') ?? [];

    for (const provider of [...globals, ...perKind]) {
      const result = provider({ game, building });
      if (Array.isArray(result) && result.length) {
        items.push(...result);
      }
    }

    return items;
  }
}

export const buildingContextMenuManager = new BuildingContextMenuManager();

export function showBuildingContextMenu(game: Game, building: Building, screenX: number, screenY: number): boolean {
  const items = buildingContextMenuManager.collectItems(game, building);

  if (!items.length) {
    return false;
  }

  const descriptor: ContextMenuDescriptor<Building> = {
    target: building,
    screenX,
    screenY,
    items,
  };

  openContextMenu(game, descriptor);
  return true;
}
