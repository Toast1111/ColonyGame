import type { HotbarTab } from '../../game/ui/hud/modernHotbar';

export interface HotbarState {
  activeTab: HotbarTab | null;
  selectedBuildCategory: string | null;
  selectedBuild: string | null;
  isTouch: boolean;
  canvasWidth: number;
  canvasHeight: number;
}

const listeners = new Set<() => void>();

let state: HotbarState = {
  activeTab: null,
  selectedBuildCategory: null,
  selectedBuild: null,
  isTouch: false,
  canvasWidth: 0,
  canvasHeight: 0
};

export function getHotbarState(): HotbarState {
  return state;
}

export function subscribeHotbar(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setHotbarState(partial: Partial<HotbarState>): void {
  state = { ...state, ...partial };
  listeners.forEach((listener) => listener());
}
