import { showErrorOverlay, clearErrorOverlay } from '../stores/errorOverlayStore';

export interface ErrorOverlayHandle {
  show(message: string): void;
  clear(): void;
}

let handlersInitialized = false;
let consolePatched = false;
let origError: typeof console.error | null = null;
let origWarn: typeof console.warn | null = null;

function ensureErrorHandlers(): void {
  if (handlersInitialized) return;
  handlersInitialized = true;

  (window as any).__showErrorOverlay = (msg: string) => showErrorOverlay(msg);

  window.addEventListener('error', (ev) => {
    const m = (ev as any)?.error?.stack || (ev as any)?.message || String(ev);
    showErrorOverlay(`[error] ${m}`);
  });

  window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
    const reason: any = ev.reason;
    const m = (reason && (reason.stack || reason.message)) || String(reason);
    showErrorOverlay(`[unhandledrejection] ${m}`);
  });

  if (!consolePatched) {
    consolePatched = true;
    origError = console.error.bind(console);
    origWarn = console.warn.bind(console);

    console.error = (...args: any[]) => {
      try {
        const msg = args
          .map((a) => (a && (a.stack || a.message)) ? (a.stack || a.message) : String(a))
          .join(' ');
        showErrorOverlay(`[console.error] ${msg}`);
      } catch {}
      origError?.(...args);
    };

    console.warn = (...args: any[]) => {
      try {
        const msg = args
          .map((a) => (a && (a.stack || a.message)) ? (a.stack || a.message) : String(a))
          .join(' ');
        showErrorOverlay(`[console.warn] ${msg}`);
      } catch {}
      origWarn?.(...args);
    };
  }
}

export function createErrorOverlayBridge(): ErrorOverlayHandle {
  ensureErrorHandlers();
  return {
    show(message: string) {
      showErrorOverlay(message);
    },
    clear() {
      clearErrorOverlay();
    }
  };
}
