import { useSyncExternalStore } from 'react';
import { getMobileControlsState, subscribeMobileControls } from '../stores/mobileControlsStore';

export function MobileControls() {
  const state = useSyncExternalStore(subscribeMobileControls, getMobileControlsState, getMobileControlsState);

  if (!state.visible) {
    return null;
  }

  const handleClick = (action: () => void) => {
    try { (window as any).game?.audioManager?.play('ui.click.primary'); } catch {}
    action();
  };

  const game = (window as any).game;

  return (
    <div id="mobileControls">
      {state.showSkipTutorial && (
        <button
          id="mc-skip-tutorial"
          type="button"
          title="Skip Tutorial"
          aria-label="Skip Tutorial"
          onClick={() => handleClick(() => game?.tutorialSystem?.skip?.())}
        >
          ⏭️
        </button>
      )}
      <button
        id="mc-erase"
        type="button"
        title="Erase Mode"
        aria-label="Erase Mode"
        className={state.eraseActive ? 'active' : ''}
        onClick={() => handleClick(() => {
          if (game) {
            game.eraseMode = !game.eraseMode;
            game.toast?.(game.eraseMode ? 'Erase mode ON' : 'Erase mode OFF');
            game.syncMobileControls?.();
          }
        })}
      >
        🗑️
      </button>
      <button
        id="mc-pause"
        type="button"
        title={state.paused ? 'Resume' : 'Pause'}
        aria-label={state.paused ? 'Resume' : 'Pause'}
        className={state.paused ? 'active' : ''}
        onClick={() => handleClick(() => {
          if (game) {
            game.paused = !game.paused;
            game.toast?.(game.paused ? 'Paused' : 'Resumed');
            game.syncMobileControls?.();
          }
        })}
      >
        {state.paused ? '▶️' : '⏸️'}
      </button>
      <button
        id="mc-ff"
        type="button"
        title="Fast Forward"
        aria-label="Fast Forward"
        className={state.fastForwardActive ? 'active' : ''}
        onClick={() => handleClick(() => {
          if (game) {
            game.fastForward = game.fastForward === 1 ? 6 : 1;
            game.toast?.(game.fastForward > 1 ? 'Fast-forward ON' : 'Fast-forward OFF');
            game.syncMobileControls?.();
          }
        })}
      >
        ⏩
      </button>
      <div className="zoom">
        <button
          id="mc-zoom-in"
          type="button"
          title="Zoom In"
          aria-label="Zoom In"
          onClick={() => handleClick(() => {
            if (game) {
              game.camera.zoom = Math.min(2.2, game.camera.zoom * 1.1);
            }
          })}
        >
          ＋
        </button>
        <button
          id="mc-zoom-out"
          type="button"
          title="Zoom Out"
          aria-label="Zoom Out"
          onClick={() => handleClick(() => {
            if (game) {
              game.camera.zoom = Math.max(0.6, game.camera.zoom / 1.1);
            }
          })}
        >
          －
        </button>
      </div>
    </div>
  );
}
