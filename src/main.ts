import { Game } from "./game/Game";
import { BUILD_TYPES } from "./game/buildings";
import { ImageAssets } from "./assets/images";

// Simple in-app error overlay for mobile (iPad) where dev tools are limited
function setupErrorOverlay() {
  const existing = document.getElementById('error-overlay');
  if (existing) return;
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
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
  const title = document.createElement('strong');
  title.textContent = 'Errors';
  const btn = document.createElement('button');
  btn.textContent = 'Dismiss';
  btn.style.cssText = 'margin-left:auto;background:#ef4444;color:white;border:none;border-radius:4px;padding:4px 8px;';
  btn.onclick = () => { el.style.display = 'none'; el.innerHTML = ''; el.appendChild(header); header.appendChild(title); header.appendChild(btn); };
  header.appendChild(title);
  header.appendChild(btn);
  el.appendChild(header);
  document.body.appendChild(el);

  const show = (msg: string) => {
    el.style.display = 'block';
    const p = document.createElement('div');
    p.textContent = msg;
    el.appendChild(p);
  };
  (window as any).__showErrorOverlay = show;

  window.addEventListener('error', (ev) => {
    const m = ev?.error?.stack || ev?.message || String(ev);
    show(`[error] ${m}`);
  });
  window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
    const reason: any = ev.reason;
    const m = (reason && (reason.stack || reason.message)) || String(reason);
    show(`[unhandledrejection] ${m}`);
  });
}

// Initialize error overlay immediately
setupErrorOverlay();

// Mirror console errors/warnings to overlay for visibility on mobile
(() => {
  const show = (window as any).__showErrorOverlay as undefined | ((m: string) => void);
  if (!show) return;
  const origError = console.error.bind(console);
  const origWarn = console.warn.bind(console);
  console.error = (...args: any[]) => {
    try { show(`[console.error] ${args.map(a => (a && (a.stack || a.message)) ? (a.stack || a.message) : String(a)).join(' ')}`); } catch {}
    origError(...args);
  };
  console.warn = (...args: any[]) => {
    try { show(`[console.warn] ${args.map(a => (a && (a.stack || a.message)) ? (a.stack || a.message) : String(a)).join(' ')}`); } catch {}
    origWarn(...args);
  };
})();

let canvas: HTMLCanvasElement | null = document.getElementById('game') as HTMLCanvasElement | null;
const btnPause = document.getElementById('btnPause') as HTMLButtonElement | null;
const btnHelp = document.getElementById('btnHelp') as HTMLButtonElement | null;
const btnToggleUI = document.getElementById('btnToggleUI') as HTMLButtonElement | null; // may not exist
const btnMenu = document.getElementById('btnMenu') as HTMLButtonElement | null; // may not exist
const headerDropdown = document.getElementById('headerDropdown') as HTMLDivElement | null; // optional
const hdNew = document.getElementById('hd-new') as HTMLButtonElement | null;
const hdHelp = document.getElementById('hd-help') as HTMLButtonElement | null;
const hdBuild = document.getElementById('hd-build') as HTMLButtonElement | null;
const hdToggleMobile = document.getElementById('hd-toggle-mobile') as HTMLButtonElement | null;
const btnNew = document.getElementById('btnNew') as HTMLButtonElement | null;
const helpEl = document.getElementById('help') as HTMLDivElement;
const mobileControls = document.getElementById('mobileControls') as HTMLDivElement | null;
const mcBuild = document.getElementById('mc-build') as HTMLButtonElement | null;
const mcCancel = document.getElementById('mc-cancel') as HTMLButtonElement | null;
const mcErase = document.getElementById('mc-erase') as HTMLButtonElement | null;
const mcPause = document.getElementById('mc-pause') as HTMLButtonElement | null;
const mcFF = document.getElementById('mc-ff') as HTMLButtonElement | null;
const mcZoomIn = document.getElementById('mc-zoom-in') as HTMLButtonElement | null;
const mcZoomOut = document.getElementById('mc-zoom-out') as HTMLButtonElement | null;

if (helpEl) {
  helpEl.innerHTML = `
    <h2>How to play</h2>
    <div><b>Goal:</b> Gather wood & stone, build farms for food, add houses for pop cap; survive nightly raids with turrets/walls.</div>
    
    <div style="margin-top: 12px;"><b>🎮 Controls:</b></div>
    <div style="margin-left: 16px;">
      • <b>B</b> - Build menu | <b>P</b> - Work priorities | <b>H</b> - Help (this panel)<br>
      • <b>1-9</b> - Quick-build hotbar | <b>ESC</b> - Cancel action<br>
      • <b>Space</b> - Pause/Resume | <b>F</b> - Fast forward<br>
      • <b>WASD</b> - Pan camera | <b>+/-</b> - Zoom<br>
      • <b>LMB</b> - Select/Place | <b>RMB</b> - Context menu/Cancel<br>
      • <b>~</b> - Debug console
    </div>
    
    <div style="margin-top: 12px;"><b>📱 Mobile:</b></div>
    <div style="margin-left: 16px;">
      • Touch controls appear at bottom<br>
      • Long-press colonist for context menu<br>
      • Pinch to zoom, drag to pan
    </div>
    
    <div style="margin-top: 12px;"><b>🔧 Debug:</b></div>
    <div style="margin-left: 16px;">
      • <b>M</b> - Performance HUD | <b>G</b> - Nav grid<br>
      • <b>J</b> - Colonist info | <b>R</b> - Regions | <b>T</b> - Terrain
    </div>
  `;
}

// Initialize game and load assets
async function initGame() {
  // Ensure canvas exists before anything else
  canvas = document.getElementById('game') as HTMLCanvasElement | null;
  if (!canvas) {
    const show = (window as any).__showErrorOverlay as undefined | ((m: string) => void);
    const msg = 'Fatal: Canvas element with id "game" not found in DOM.';
    show?.(msg);
    throw new Error(msg);
  }
  // Show loading message
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#dbeafe';
    ctx.font = '24px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Loading assets...', canvas.width / 2, canvas.height / 2);
  }

  // Load image assets
  try {
    await ImageAssets.getInstance().loadAssets();
    console.log('Assets loaded successfully');
    console.log('House image loaded:', !!ImageAssets.getInstance().getImage('house'));
  } catch (error) {
    console.warn('Some assets failed to load:', error);
    const show = (window as any).__showErrorOverlay as undefined | ((m: string) => void);
    show?.('Warning: some assets failed to load. See console for details.');
  }

  // Create game instance
  const game = new Game(canvas);

  if (btnPause) btnPause.onclick = () => { game.paused = !game.paused; btnPause.textContent = game.paused ? 'Resume' : 'Pause'; };
  if (btnNew) btnNew.onclick = () => { game.newGame(); };
  if (btnHelp) btnHelp.onclick = () => { if (helpEl) helpEl.hidden = !helpEl.hidden; };
  
  // FSM Editor functionality
const btnFSM = document.getElementById('btnFSM') as HTMLButtonElement;
const btnBlueprint = document.getElementById('btnBlueprint') as HTMLButtonElement;

if (btnFSM) {
    btnFSM.onclick = () => {
        window.open('./fsm-editor.html', '_blank');
    };
}

if (btnBlueprint) {
    btnBlueprint.onclick = () => {
        window.open('./blueprint-fsm-editor.html', '_blank');
    };
}

  // Make game and assets available globally
  (Object.assign(window as any, { game, BUILD_TYPES, imageAssets: ImageAssets.getInstance() }));

  // No UI mode switching; visibility of mobile controls handled by CSS only.
  if (mobileControls) mobileControls.hidden = false; // rely on CSS media queries to show/hide

  // Prevent keyboard navigation from interfering with game controls
  document.addEventListener('keydown', (e) => {
    const gameKeys = [' ', 'h', 'b', 'f', 'g', 'j', 'escape', 'w', 'a', 's', 'd', '+', '=', '-', '_'];
    const isNumberKey = /^[1-9]$/.test(e.key);
    
    if (gameKeys.includes(e.key.toLowerCase()) || isNumberKey) {
      // Remove focus from any focused element to prevent button highlighting
      if (document.activeElement && document.activeElement !== document.body) {
        (document.activeElement as HTMLElement).blur();
      }
    }
  });

  // Header dropdown menu (optional)
  if (btnMenu && headerDropdown) {
    btnMenu.onclick = () => { headerDropdown.hidden = !headerDropdown.hidden; };
    hdNew && (hdNew.onclick = () => { headerDropdown.hidden = true; game.newGame(); });
    hdHelp && (hdHelp.onclick = () => { headerDropdown.hidden = true; if (helpEl) helpEl.hidden = !helpEl.hidden; });
  hdBuild && (hdBuild.onclick = () => { headerDropdown.hidden = true; game.showBuildMenu = !game.showBuildMenu; });
  // Mobile UI toggle removed: no mode switching
    // Close dropdown on outside tap
    document.addEventListener('click', (ev) => {
      if (!headerDropdown) return;
      const t = ev.target as HTMLElement;
      if (t && !headerDropdown.contains(t) && t !== btnMenu) headerDropdown.hidden = true;
    });
  }

  // Mobile control buttons
  mcBuild && (mcBuild.onclick = () => { game.showBuildMenu = !game.showBuildMenu; });
  mcCancel && (mcCancel.onclick = () => { 
    game.selectedBuild = null; 
    game.pendingPlacement = null;
    game.toast('Build canceled'); 
  });
  mcErase && (mcErase.onclick = () => { 
    // Toggle a simple erase-tap mode: tap button to enable; next tap on canvas erases single item
    (window as any)._eraseOnce = true; game.toast('Erase mode: tap on a building to remove');
  });
  mcPause && (mcPause.onclick = () => { 
    game.paused = !game.paused; 
    if (btnPause) btnPause.textContent = game.paused ? 'Resume' : 'Pause'; 
  });
  mcFF && (mcFF.onclick = () => { game.fastForward = (game.fastForward === 1 ? 6 : 1); game.toast(game.fastForward > 1 ? 'Fast-forward ON' : 'Fast-forward OFF'); });
  mcZoomIn && (mcZoomIn.onclick = () => { game.camera.zoom = Math.max(0.6, Math.min(2.2, game.camera.zoom * 1.1)); });
  mcZoomOut && (mcZoomOut.onclick = () => { game.camera.zoom = Math.max(0.6, Math.min(2.2, game.camera.zoom / 1.1)); });

  // No external touch listeners; Game handles all input consistently.
}

// Start the game
try {
  const p = initGame();
  // Also surface rejected promise explicitly (in addition to unhandledrejection)
  if (p && typeof (p as any).catch === 'function') {
    (p as Promise<void>).catch((e) => {
      const show = (window as any).__showErrorOverlay as undefined | ((m: string) => void);
      const msg = (e && (e.stack || e.message)) ? (e.stack || e.message) : String(e);
      show?.(`[init] ${msg}`);
      console.error(e);
    });
  }
} catch (e: any) {
  const show = (window as any).__showErrorOverlay as undefined | ((m: string) => void);
  const msg = (e && (e.stack || e.message)) ? (e.stack || e.message) : String(e);
  show?.(`[init-sync] ${msg}`);
  console.error(e);
}
