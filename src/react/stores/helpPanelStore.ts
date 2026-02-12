export interface HelpPanelState {
  visible: boolean;
}

const listeners = new Set<() => void>();

let state: HelpPanelState = {
  visible: false
};

export function getHelpPanelState(): HelpPanelState {
  return state;
}

export function subscribeHelpPanel(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setHelpPanelVisible(visible: boolean): void {
  if (state.visible === visible) return;
  state = { ...state, visible };
  listeners.forEach((listener) => listener());
}

export function toggleHelpPanel(): void {
  setHelpPanelVisible(!state.visible);
}
