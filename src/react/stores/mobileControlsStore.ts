export interface MobileControlsState {
  visible: boolean;
  paused: boolean;
  fastForwardActive: boolean;
  eraseActive: boolean;
  showSkipTutorial: boolean;
}

const listeners = new Set<() => void>();

let state: MobileControlsState = {
  visible: false,
  paused: false,
  fastForwardActive: false,
  eraseActive: false,
  showSkipTutorial: false
};

export function getMobileControlsState(): MobileControlsState {
  return state;
}

export function subscribeMobileControls(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setMobileControlsState(partial: Partial<MobileControlsState>): void {
  state = { ...state, ...partial };
  listeners.forEach((listener) => listener());
}
