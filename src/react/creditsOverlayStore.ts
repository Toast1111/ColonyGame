export interface CreditEntry {
  title: string;
  name: string;
}

export interface GuiltMessage {
  text: string;
  delay: number;
  duration: number;
}

export interface GameOverOverlayState {
  active: boolean;
  phase: 'fade' | 'guilt' | 'credits';
  fadeOpacity: number;
  elapsed: number;
  timeSinceFade: number;
  messages: GuiltMessage[];
  credits: CreditEntry[];
  scrollY: number;
  canvasWidth: number;
  canvasHeight: number;
  showEndMessage: boolean;
  showMemorial: boolean;
  memorialOpacity: number;
  deadColonists: any[];
}

const listeners = new Set<() => void>();

let state: GameOverOverlayState = {
  active: false,
  phase: 'fade',
  fadeOpacity: 0,
  elapsed: 0,
  timeSinceFade: 0,
  messages: [],
  credits: [],
  scrollY: 0,
  canvasWidth: 0,
  canvasHeight: 0,
  showEndMessage: false,
  showMemorial: false,
  memorialOpacity: 0,
  deadColonists: []
};

export function getGameOverOverlayState(): GameOverOverlayState {
  return state;
}

export function subscribeGameOverOverlay(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setGameOverOverlayState(partial: Partial<GameOverOverlayState>): void {
  state = { ...state, ...partial };
  listeners.forEach((listener) => listener());
}

export function resetGameOverOverlayState(): void {
  state = {
    ...state,
    active: false,
    showEndMessage: false,
    showMemorial: false,
    memorialOpacity: 0
  };
  listeners.forEach((listener) => listener());
}
