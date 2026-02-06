/**
 * Research Panel Store - State management for research modal
 */

type ResearchPanelState = {
  visible: boolean;
};

let state: ResearchPanelState = {
  visible: false
};

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function subscribeResearchPanel(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getResearchPanelState(): ResearchPanelState {
  return state;
}

export function setResearchPanelVisible(visible: boolean) {
  if (state.visible !== visible) {
    state = { ...state, visible };
    notifyListeners();
  }
}

export function toggleResearchPanel() {
  setResearchPanelVisible(!state.visible);
}
