import { Game } from "./game/Game";
import { BUILD_TYPES } from "./game/buildings";
import { ImageAssets } from "./assets/images";

const canvas = document.getElementById('game') as HTMLCanvasElement;
const btnPause = document.getElementById('btnPause') as HTMLButtonElement;
const btnHelp = document.getElementById('btnHelp') as HTMLButtonElement;
const btnNew = document.getElementById('btnNew') as HTMLButtonElement;
const helpEl = document.getElementById('help') as HTMLDivElement;

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
}

// Start the game
initGame();
