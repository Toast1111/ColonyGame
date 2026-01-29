/**
 * Work Priority Store - State management for work priority panel
 */

type WorkPriorityState = {
  visible: boolean;
};

let state: WorkPriorityState = {
  visible: false
};

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach(listener => listener());
}

export function subscribeWorkPriority(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getWorkPriorityState(): WorkPriorityState {
  return state;
}

export function setWorkPriorityVisible(visible: boolean) {
  if (state.visible !== visible) {
    state = { ...state, visible };
    notifyListeners();
  }
}

export function toggleWorkPriorityPanel() {
  setWorkPriorityVisible(!state.visible);
}
