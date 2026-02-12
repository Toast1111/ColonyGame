import { useEffect, useRef, useSyncExternalStore } from 'react';
import { getHelpPanelState, subscribeHelpPanel, setHelpPanelVisible } from '../stores/helpPanelStore';

export function HelpPanel() {
  const state = useSyncExternalStore(subscribeHelpPanel, getHelpPanelState, getHelpPanelState);
  const prevVisible = useRef(state.visible);

  useEffect(() => {
    if (prevVisible.current !== state.visible) {
      try {
        (window as any).game?.audioManager?.play(state.visible ? 'ui.panel.open' : 'ui.panel.close');
      } catch {}
      prevVisible.current = state.visible;
    }
  }, [state.visible]);

  if (!state.visible) {
    return null;
  }

  const handleReplayTutorial = () => {
    setHelpPanelVisible(false);
    const game = (window as any).game;
    game?.tutorialSystem?.start?.();
  };

  return (
    <div id="help">
      <h2>How to play</h2>
      <div><strong>Goal:</strong> Gather wood and stone, build farms for food, add houses for pop cap; survive nightly raids with turrets and walls.</div>

      <div style={{ marginTop: '12px' }}><strong>Tutorial:</strong></div>
      <div style={{ marginLeft: '16px' }}>
        <button
          id="btnReplayTutorial"
          type="button"
          style={{ padding: '8px 16px', margin: '4px 0', cursor: 'pointer', background: '#4a5568', color: 'white', border: 'none', borderRadius: '4px' }}
          onClick={handleReplayTutorial}
        >
          Replay Tutorial
        </button>
      </div>

      <div style={{ marginTop: '12px' }}><strong>Controls:</strong></div>
      <div style={{ marginLeft: '16px' }}>
        <div><strong>B</strong> - Build tab | <strong>P</strong> - Work tab | <strong>H</strong> - Help (this panel)</div>
        <div><strong>ESC</strong> - Close menus/Cancel action</div>
        <div><strong>Space</strong> - Pause/Resume | <strong>F</strong> - Fast forward</div>
        <div><strong>WASD</strong> - Pan camera | <strong>+/-</strong> - Zoom</div>
        <div><strong>LMB</strong> - Select/Place | <strong>RMB</strong> - Context menu/Cancel</div>
        <div><strong>~</strong> - Debug console</div>
      </div>

      <div style={{ marginTop: '12px' }}><strong>Mobile:</strong></div>
      <div style={{ marginLeft: '16px' }}>
        <div>Touch controls appear at bottom</div>
        <div>Long-press colonist for context menu</div>
        <div>Pinch to zoom, drag to pan</div>
      </div>

      <div style={{ marginTop: '12px' }}><strong>Debug:</strong></div>
      <div style={{ marginLeft: '16px' }}>
        <div><strong>M</strong> - Performance HUD | <strong>G</strong> - Nav grid</div>
        <div><strong>J</strong> - Colonist info | <strong>R</strong> - Regions | <strong>T</strong> - Terrain</div>
      </div>
    </div>
  );
}
