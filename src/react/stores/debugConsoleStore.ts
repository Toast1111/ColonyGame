export interface DebugConsoleState {
  open: boolean;
  input: string;
  output: string[];
  history: string[];
  historyIndex: number;
}

const listeners = new Set<() => void>();

let state: DebugConsoleState = {
  open: false,
  input: '',
  output: [],
  history: [],
  historyIndex: -1
};

export function getDebugConsoleState(): DebugConsoleState {
  return state;
}

export function subscribeDebugConsole(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setDebugConsoleState(partial: Partial<DebugConsoleState>): void {
  state = { ...state, ...partial };
  listeners.forEach((listener) => listener());
}

export function setDebugConsoleOpen(open: boolean): void {
  setDebugConsoleState({ open });
}

export function appendDebugConsoleOutput(lines: string | string[]): void {
  const nextLines = Array.isArray(lines) ? lines : [lines];
  if (nextLines.length === 0) return;

  const merged = [...state.output, ...nextLines];
  const maxLines = 200;
  const trimmed = merged.length > maxLines ? merged.slice(merged.length - maxLines) : merged;
  setDebugConsoleState({ output: trimmed });
}
