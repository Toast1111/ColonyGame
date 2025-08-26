import { Game } from "./game/Game";
import { BUILD_TYPES } from "./game/buildings";
import { ImageAssets } from "./assets/images";

const canvas = document.getElementById('game') as HTMLCanvasElement;
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
  <div><b>Controls:</b> 1..9 quick-build, <b>B</b> build menu, LMB place, RMB cancel/erase; WASD pan; Space pause; H toggle help; +/- zoom; F fast-forward.</div>
  <div><b>UI Modes:</b> 📱 Mobile UI shows touch controls for tap/touch gameplay. 🖥️ Desktop UI is clean with keyboard shortcuts only.</div>
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
initGame();
