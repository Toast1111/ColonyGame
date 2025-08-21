import { Game } from "./game/Game";
import { BUILD_TYPES } from "./game/buildings";

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

const game = new Game(canvas);

btnPause.onclick = () => { game.paused = !game.paused; btnPause.textContent = game.paused ? 'Resume' : 'Pause'; };
btnNew.onclick = () => { game.newGame(); };
btnHelp.onclick = () => { if (helpEl) helpEl.hidden = !helpEl.hidden; };

(Object.assign(window as any, { game, BUILD_TYPES }));
