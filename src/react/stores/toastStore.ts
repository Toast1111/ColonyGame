export interface ToastState {
  message: string;
  visible: boolean;
}

const listeners = new Set<() => void>();

let state: ToastState = {
  message: '',
  visible: false
};

let hideTimeout: number | null = null;

export function getToastState(): ToastState {
  return state;
}

export function subscribeToast(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setToastState(partial: Partial<ToastState>): void {
  state = { ...state, ...partial };
  listeners.forEach((listener) => listener());
}

export function showToast(message: string, duration = 3000): void {
  if (hideTimeout !== null) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }

  setToastState({ message, visible: true });

  hideTimeout = window.setTimeout(() => {
    hideToast();
  }, duration);
}

export function hideToast(): void {
  if (!state.visible && !state.message) return;
  setToastState({ visible: false });
  if (hideTimeout !== null) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
}
