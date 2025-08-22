import { Game } from "./game/Game";
import { BUILD_TYPES } from "./game/buildings";
import { ImageAssets } from "./assets/images";

const canvas = document.getElementById('game') as HTMLCanvasElement;
const btnPause = document.getElementById('btnPause') as HTMLButtonElement;
const btnHelp = document.getElementById('btnHelp') as HTMLButtonElement;
const btnMenu = document.getElementById('btnMenu') as HTMLButtonElement | null;
const headerDropdown = document.getElementById('headerDropdown') as HTMLDivElement | null;
const hdNew = document.getElementById('hd-new') as HTMLButtonElement | null;
const hdHelp = document.getElementById('hd-help') as HTMLButtonElement | null;
const hdBuild = document.getElementById('hd-build') as HTMLButtonElement | null;
const hdToggleMobile = document.getElementById('hd-toggle-mobile') as HTMLButtonElement | null;
const btnNew = document.getElementById('btnNew') as HTMLButtonElement;
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
  <div><b>Controls:</b> 1..9 quick-build, <b>B</b> build menu, LMB place, RMB cancel/erase; WASD pan; Space pause; H toggle help; +/- zoom; F fast-forward.</div>
  `;
}

// Initialize game and load assets
async function initGame() {
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
  }

  // Create game instance
  const game = new Game(canvas);

  btnPause.onclick = () => { game.paused = !game.paused; btnPause.textContent = game.paused ? 'Resume' : 'Pause'; };
  btnNew.onclick = () => { game.newGame(); };
  btnHelp.onclick = () => { if (helpEl) helpEl.hidden = !helpEl.hidden; };

  (Object.assign(window as any, { game, BUILD_TYPES }));

  // Show mobile controls if touch device
  const isTouch = (('ontouchstart' in window) || (navigator as any).maxTouchPoints > 0);
  if (isTouch && mobileControls) {
    const setMobileUI = (on: boolean) => {
      (window as any)._mobileUI = on;
      mobileControls.hidden = !on;
      if (btnMenu) btnMenu.hidden = !on;
    };
    setMobileUI(true);
    // Show header overflow menu button
    if (btnMenu) btnMenu.hidden = false;
    if (btnMenu && headerDropdown) {
      btnMenu.onclick = () => { headerDropdown.hidden = !headerDropdown.hidden; };
      hdNew && (hdNew.onclick = () => { headerDropdown.hidden = true; game.newGame(); });
      hdHelp && (hdHelp.onclick = () => { headerDropdown.hidden = true; if (helpEl) helpEl.hidden = !helpEl.hidden; });
      hdBuild && (hdBuild.onclick = () => { headerDropdown.hidden = true; game.showBuildMenu = !game.showBuildMenu; });
      hdToggleMobile && (hdToggleMobile.onclick = () => {
        headerDropdown.hidden = true;
        setMobileUI(!(window as any)._mobileUI);
        game.toast(((window as any)._mobileUI) ? 'Mobile UI: ON' : 'Mobile UI: OFF');
      });
      // Close dropdown on outside tap
      document.addEventListener('click', (ev) => {
        if (!headerDropdown) return;
        const t = ev.target as HTMLElement;
        if (t && !headerDropdown.contains(t) && t !== btnMenu) headerDropdown.hidden = true;
      });
    }
    // Buttons
    mcBuild && (mcBuild.onclick = () => { game.showBuildMenu = !game.showBuildMenu; });
    mcCancel && (mcCancel.onclick = () => { game.selectedBuild = null; game.toast('Build canceled'); });
    mcErase && (mcErase.onclick = () => { 
      // Toggle a simple erase-tap mode: tap button to enable; next tap on canvas erases single item
      (window as any)._eraseOnce = true; game.toast('Erase mode: tap on a building to remove');
    });
    mcPause && (mcPause.onclick = () => { game.paused = !game.paused; btnPause.textContent = game.paused ? 'Resume' : 'Pause'; });
    mcFF && (mcFF.onclick = () => { game.fastForward = (game.fastForward === 1 ? 6 : 1); game.toast(game.fastForward > 1 ? 'Fast-forward ON' : 'Fast-forward OFF'); });
    mcZoomIn && (mcZoomIn.onclick = () => { game.camera.zoom = Math.max(0.6, Math.min(2.2, game.camera.zoom * 1.1)); });
    mcZoomOut && (mcZoomOut.onclick = () => { game.camera.zoom = Math.max(0.6, Math.min(2.2, game.camera.zoom / 1.1)); });
  }

  // Touch gestures: one-finger pan, two-finger pinch zoom
  let lastTouchDist: number | null = null;
  let lastPan: { x: number; y: number } | null = null;
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!isTouch) return;
    if (e.touches.length === 1) {
      lastPan = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist = Math.hypot(dx, dy);
    }
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!isTouch) return;
    if (e.touches.length === 1 && lastPan) {
      // Pan camera
      const nx = e.touches[0].clientX, ny = e.touches[0].clientY;
      const dx = nx - lastPan.x, dy = ny - lastPan.y;
      lastPan = { x: nx, y: ny };
      game.camera.x -= dx * (1 / game.camera.zoom) * (game.DPR);
      game.camera.y -= dy * (1 / game.camera.zoom) * (game.DPR);
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (lastTouchDist != null) {
        const factor = dist / (lastTouchDist || dist);
        game.camera.zoom = Math.max(0.6, Math.min(2.2, game.camera.zoom * factor));
      }
      lastTouchDist = dist;
    }
  }, { passive: false });
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (!isTouch) return;
    // One-shot erase if enabled
    const eraseOnce = (window as any)._eraseOnce;
    if (eraseOnce && e.changedTouches.length === 1) {
      (window as any)._eraseOnce = false;
      // Map touch to world and try to remove a building
      const rect = canvas.getBoundingClientRect();
      const sx = e.changedTouches[0].clientX - rect.left;
      const sy = e.changedTouches[0].clientY - rect.top;
      const wpt = game.screenToWorld(sx, sy);
      // Mimic cancelOrErase but for single point
      for (let i = game.buildings.length - 1; i >= 0; i--) {
        const b = game.buildings[i];
        if (b.kind === 'hq') continue;
        if (wpt.x >= b.x && wpt.x <= b.x + b.w && wpt.y >= b.y && wpt.y <= b.y + b.h) {
          game.evictColonistsFrom(b);
          game.buildings.splice(i, 1);
          game.msg('Building removed');
          game.rebuildNavGrid();
          break;
        }
      }
    }
    // If not erasing, treat as a primary tap/click for gameplay
    if (!eraseOnce && e.changedTouches.length === 1) {
      const rect = canvas.getBoundingClientRect();
      const sx = e.changedTouches[0].clientX - rect.left;
      const sy = e.changedTouches[0].clientY - rect.top;
      game.handleTapOrClickAtScreen(sx, sy);
    }
    if (e.touches.length === 0) { lastPan = null; lastTouchDist = null; }
  }, { passive: false });
}

// Start the game
initGame();
