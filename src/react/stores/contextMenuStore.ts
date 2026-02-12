import type { ContextMenuAction, ContextMenuItem } from '../../game/ui/contextMenus/types';

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  items: ContextMenuItem<any>[];
  target: unknown;
  onSelect?: ContextMenuAction<any>;
  openSubmenuId?: string;
}

const listeners = new Set<() => void>();

let state: ContextMenuState = {
  visible: false,
  x: 0,
  y: 0,
  items: [],
  target: null,
  onSelect: undefined,
  openSubmenuId: undefined
};

export function getContextMenuState(): ContextMenuState {
  return state;
}

export function subscribeContextMenu(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setContextMenuState(partial: Partial<ContextMenuState>): void {
  state = { ...state, ...partial };
  listeners.forEach((listener) => listener());
}

export function showContextMenu(payload: {
  x: number;
  y: number;
  items: ContextMenuItem<any>[];
  target: unknown;
  onSelect?: ContextMenuAction<any>;
  openSubmenuId?: string;
}): void {
  state = {
    visible: true,
    x: payload.x,
    y: payload.y,
    items: payload.items,
    target: payload.target,
    onSelect: payload.onSelect,
    openSubmenuId: payload.openSubmenuId
  };
  listeners.forEach((listener) => listener());
}

export function hideContextMenuState(): void {
  if (!state.visible) return;
  state = {
    visible: false,
    x: 0,
    y: 0,
    items: [],
    target: null,
    onSelect: undefined,
    openSubmenuId: undefined
  };
  listeners.forEach((listener) => listener());
}
