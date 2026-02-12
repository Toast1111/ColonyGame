import type { ChangelogEntry } from './changelogTypes';

export interface ChangelogState {
  visible: boolean;
  loading: boolean;
  entries: ChangelogEntry[] | null;
  error: string | null;
}

const listeners = new Set<() => void>();

let state: ChangelogState = {
  visible: false,
  loading: false,
  entries: null,
  error: null
};

export function getChangelogState(): ChangelogState {
  return state;
}

export function subscribeChangelog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setChangelogState(partial: Partial<ChangelogState>): void {
  state = { ...state, ...partial };
  listeners.forEach((listener) => listener());
}

export function setChangelogVisible(visible: boolean): void {
  if (state.visible === visible) return;
  state = { ...state, visible };
  listeners.forEach((listener) => listener());
}
