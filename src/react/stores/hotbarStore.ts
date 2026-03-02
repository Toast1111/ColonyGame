import type { HotbarTab } from '../../game/ui/hud/modernHotbar';

export interface HotbarState {
  activeTab: HotbarTab | null;
  selectedBuildCategory: string | null;
  selectedBuild: string | null;
  isTouch: boolean;
  canvasWidth: number;
  canvasHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  safeAreaInsetBottom: number;
}

const listeners = new Set<() => void>();

let state: HotbarState = {
  activeTab: null,
  selectedBuildCategory: null,
  selectedBuild: null,
  isTouch: false,
  canvasWidth: 0,
  canvasHeight: 0,
  viewportWidth: 0,
  viewportHeight: 0,
  safeAreaInsetBottom: 0
};

let viewportTrackingInitialized = false;
let viewportMeasureEl: HTMLDivElement | null = null;

function readSafeAreaInsetBottom(): number {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return 0;
  }

  if (!viewportMeasureEl) {
    viewportMeasureEl = document.createElement('div');
    viewportMeasureEl.style.position = 'fixed';
    viewportMeasureEl.style.left = '0';
    viewportMeasureEl.style.bottom = '0';
    viewportMeasureEl.style.width = '0';
    viewportMeasureEl.style.height = '0';
    viewportMeasureEl.style.pointerEvents = 'none';
    viewportMeasureEl.style.visibility = 'hidden';
    viewportMeasureEl.style.paddingBottom = 'env(safe-area-inset-bottom)';
    document.body.appendChild(viewportMeasureEl);
  }

  const computed = window.getComputedStyle(viewportMeasureEl).paddingBottom;
  const px = Number.parseFloat(computed || '0');
  return Number.isFinite(px) ? Math.max(0, Math.round(px)) : 0;
}

function readViewportMetrics(): Pick<HotbarState, 'viewportWidth' | 'viewportHeight' | 'safeAreaInsetBottom'> {
  if (typeof window === 'undefined') {
    return {
      viewportWidth: 0,
      viewportHeight: 0,
      safeAreaInsetBottom: 0
    };
  }

  const visualViewport = window.visualViewport;
  const viewportWidth = Math.max(0, Math.round(visualViewport?.width ?? window.innerWidth ?? 0));
  const viewportHeight = Math.max(0, Math.round(visualViewport?.height ?? window.innerHeight ?? 0));
  const safeAreaInsetBottom = readSafeAreaInsetBottom();

  return {
    viewportWidth,
    viewportHeight,
    safeAreaInsetBottom
  };
}

export function getHotbarState(): HotbarState {
  return state;
}

export function subscribeHotbar(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setHotbarState(partial: Partial<HotbarState>): void {
  if (!partial || Object.keys(partial).length === 0) return;

  let changed = false;
  for (const key of Object.keys(partial) as Array<keyof HotbarState>) {
    if (partial[key] !== undefined && state[key] !== partial[key]) {
      changed = true;
      break;
    }
  }

  if (!changed) return;

  state = { ...state, ...partial };
  listeners.forEach((listener) => listener());
}

export function ensureHotbarViewportTracking(): void {
  if (viewportTrackingInitialized || typeof window === 'undefined') {
    return;
  }
  viewportTrackingInitialized = true;

  const updateViewport = () => {
    setHotbarState(readViewportMetrics());
  };

  window.addEventListener('resize', updateViewport, { passive: true });
  window.addEventListener('orientationchange', updateViewport, { passive: true });

  const visualViewport = window.visualViewport;
  visualViewport?.addEventListener('resize', updateViewport, { passive: true });
  visualViewport?.addEventListener('scroll', updateViewport, { passive: true });

  updateViewport();
}
