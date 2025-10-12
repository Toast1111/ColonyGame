/**
 * Error Overlay - In-app error display for mobile devices
 * 
 * Shows errors and warnings in an overlay since mobile devices
 * don't have easy access to browser dev tools.
 */

export class ErrorOverlay {
  private element: HTMLDivElement;
  private header: HTMLDivElement;
  private title: HTMLElement;
  private dismissButton: HTMLButtonElement;

  constructor() {
    this.element = this.createElement();
    this.header = this.createHeader();
    this.title = this.createTitle();
    this.dismissButton = this.createDismissButton();
    
    this.header.appendChild(this.title);
    this.header.appendChild(this.dismissButton);
    this.element.appendChild(this.header);
    document.body.appendChild(this.element);
    
    this.setupGlobalErrorHandlers();
  }

  private createElement(): HTMLDivElement {
    const el = document.createElement('div');
    el.id = 'error-overlay';
    el.style.cssText = [
      'position:fixed',
      'inset:0 auto auto 0',
      'max-width:100%',
      'z-index:99999',
      'background:rgba(8,8,10,0.82)',
      'color:#fee2e2',
      'font:12px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      'padding:10px',
      'overflow:auto',
      'display:none',
      'white-space:pre-wrap',
      'pointer-events:auto'
    ].join(';');
    return el;
  }

  private createHeader(): HTMLDivElement {
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
    return header;
  }

  private createTitle(): HTMLElement {
    const title = document.createElement('strong');
    title.textContent = 'Errors';
    return title;
  }

  private createDismissButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = 'Dismiss';
    btn.style.cssText = 'margin-left:auto;background:#ef4444;color:white;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;';
    btn.onclick = () => this.clear();
    return btn;
  }

  /**
   * Show an error message
   */
  show(message: string): void {
    this.element.style.display = 'block';
    const p = document.createElement('div');
    p.textContent = message;
    this.element.appendChild(p);
  }

  /**
   * Clear all error messages and hide overlay
   */
  clear(): void {
    this.element.style.display = 'none';
    this.element.innerHTML = '';
    this.element.appendChild(this.header);
    this.header.appendChild(this.title);
    this.header.appendChild(this.dismissButton);
  }

  /**
   * Setup global error handlers to catch runtime errors
   */
  private setupGlobalErrorHandlers(): void {
    // Expose show method globally for other parts of the app
    (window as any).__showErrorOverlay = (msg: string) => this.show(msg);

    // Window error handler
    window.addEventListener('error', (ev) => {
      const m = ev?.error?.stack || ev?.message || String(ev);
      this.show(`[error] ${m}`);
    });

    // Promise rejection handler
    window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
      const reason: any = ev.reason;
      const m = (reason && (reason.stack || reason.message)) || String(reason);
      this.show(`[unhandledrejection] ${m}`);
    });

    // Mirror console errors/warnings to overlay
    const origError = console.error.bind(console);
    const origWarn = console.warn.bind(console);
    
    console.error = (...args: any[]) => {
      try {
        const msg = args.map(a => (a && (a.stack || a.message)) ? (a.stack || a.message) : String(a)).join(' ');
        this.show(`[console.error] ${msg}`);
      } catch {}
      origError(...args);
    };
    
    console.warn = (...args: any[]) => {
      try {
        const msg = args.map(a => (a && (a.stack || a.message)) ? (a.stack || a.message) : String(a)).join(' ');
        this.show(`[console.warn] ${msg}`);
      } catch {}
      origWarn(...args);
    };
  }
}
