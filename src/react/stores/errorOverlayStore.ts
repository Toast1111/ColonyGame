export interface ErrorOverlayState {
  visible: boolean;
  messages: string[];
}

const listeners = new Set<() => void>();

let state: ErrorOverlayState = {
  visible: false,
  messages: []
};

export function getErrorOverlayState(): ErrorOverlayState {
  return state;
}

export function subscribeErrorOverlay(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setErrorOverlayState(partial: Partial<ErrorOverlayState>): void {
  state = { ...state, ...partial };
  listeners.forEach((listener) => listener());
}

export function showErrorOverlay(message: string): void {
  const next = [...state.messages, message];
  setErrorOverlayState({ visible: true, messages: next });
}

export function clearErrorOverlay(): void {
  setErrorOverlayState({ visible: false, messages: [] });
}
