export interface ResourceBarState {
  res: {
    wood: number;
    stone: number;
    food: number;
    wheat?: number;
    bread?: number;
  };
  colonists: number;
  cap: number;
  hiding: number;
  day: number;
  tDay: number;
  isNight: boolean;
  storage?: {
    used: number;
    max: number;
  };
  isTouch: boolean;
}

const listeners = new Set<() => void>();

let state: ResourceBarState = {
  res: { wood: 0, stone: 0, food: 0 },
  colonists: 0,
  cap: 0,
  hiding: 0,
  day: 0,
  tDay: 0,
  isNight: false,
  storage: undefined,
  isTouch: false
};

export function getResourceBarState(): ResourceBarState {
  return state;
}

export function subscribeResourceBar(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setResourceBarState(partial: Partial<ResourceBarState>): void {
  state = { ...state, ...partial };
  listeners.forEach((listener) => listener());
}
