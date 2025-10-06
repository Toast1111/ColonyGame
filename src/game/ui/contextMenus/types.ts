import type { Game } from '../../Game';

export interface ContextMenuActionContext<TTarget = unknown> {
  game: Game;
  target: TTarget;
  item: ContextMenuItem<TTarget>;
}

export type ContextMenuAction<TTarget = unknown> = (context: ContextMenuActionContext<TTarget>) => void;

export interface ContextMenuItem<TTarget = unknown> {
  id: string;
  label: string;
  icon?: string;
  enabled?: boolean;
  submenu?: ContextMenuItem<TTarget>[];
  action?: ContextMenuAction<TTarget>;
  tooltip?: string;
  metadata?: Record<string, unknown>;
}

export interface ContextMenuDescriptor<TTarget = unknown> {
  target: TTarget;
  screenX: number;
  screenY: number;
  items: ContextMenuItem<TTarget>[];
  onSelect?: ContextMenuAction<TTarget>;
  openSubmenuId?: string;
}
