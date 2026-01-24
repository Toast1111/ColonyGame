import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getResourceBarState, subscribeResourceBar } from '../stores/resourceBarStore';

const MENU_ITEMS = [
  { id: 'hd-new', label: 'New Game', action: () => (window as any).game?.newGame?.() },
  { id: 'hd-help', label: 'Help', action: () => (window as any).uiComponents?.helpPanel?.toggle?.() },
  { id: 'hd-build', label: 'Build Menu', action: () => {
      const game = (window as any).game;
      if (game) {
        game.showBuildMenu = !game.showBuildMenu;
      }
    }
  },
  { id: 'hd-changelog', label: 'Change Logs', action: () => (window as any).uiComponents?.changelogModal?.show?.() },
  { id: 'hd-toggle-mobile', label: 'Toggle Mobile UI', action: () => {
      const game = (window as any).game;
      if (game) {
        const next = !game.touchUIEnabled;
        game.setTouchUIEnabled(next, true);
        game.toast?.(`Mobile mode: ${next ? 'ON' : 'OFF'}`);
      }
    }
  }
];

export function ResourceBar() {
  const state = useSyncExternalStore(subscribeResourceBar, getResourceBarState, getResourceBarState);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!open) return;
      const target = event.target as Node | null;
      if (!target) return;
      if (dropdownRef.current?.contains(target)) return;
      if (menuButtonRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === 'Escape' || event.key === 'Esc') && open) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const toggleDropdown = () => {
    const next = !open;
    setOpen(next);
    try {
      (window as any).game?.audioManager?.play(next ? 'ui.panel.open' : 'ui.panel.close');
    } catch {}
  };

  const handleItemClick = (action: () => void) => {
    try { (window as any).game?.audioManager?.play('ui.click.primary'); } catch {}
    action();
    setOpen(false);
  };

  const hour = Math.floor(state.tDay * 24);
  const minute = Math.floor((state.tDay * 24 - hour) * 60);
  const clock = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

  const leftItems = [
    { label: 'Wood', value: state.res.wood, color: '#d97706' },
    { label: 'Stone', value: state.res.stone, color: '#9aa5b1' },
    { label: 'Food', value: state.res.food, color: '#4ade80' }
  ];

  if ((state.res.wheat || 0) > 0) {
    leftItems.push({ label: 'Wheat', value: state.res.wheat || 0, color: '#facc15' });
  }
  if ((state.res.bread || 0) > 0) {
    leftItems.push({ label: 'Bread', value: state.res.bread || 0, color: '#ea580c' });
  }

  let storageLabel: string | null = null;
  let storageColor = '#34d399';
  if (state.storage) {
    const storagePercent = Math.round((state.storage.used / state.storage.max) * 100);
    storageColor = storagePercent > 92 ? '#f87171' : storagePercent > 75 ? '#facc15' : '#34d399';
    storageLabel = `Storage ${formatValue(state.storage.used)}/${formatValue(state.storage.max)} (${storagePercent}%)`;
  }

  return (
    <div className="resource-bar" data-touch={state.isTouch ? 'true' : 'false'}>
      <div className="resource-bar-left">
        {leftItems.map((item) => (
          <div key={item.label} className="resource-pill">
            <span className="resource-pill-bar" style={{ backgroundColor: item.color }} />
            <span className="resource-pill-text">{item.label} {formatValue(item.value)}</span>
          </div>
        ))}
        {storageLabel && (
          <div className="resource-pill">
            <span className="resource-pill-bar" style={{ backgroundColor: storageColor }} />
            <span className="resource-pill-text">{storageLabel}</span>
          </div>
        )}
      </div>
      <div className="resource-bar-right">
        <div className="resource-pill">
          <span className="resource-pill-bar" style={{ backgroundColor: '#60a5fa' }} />
          <span className="resource-pill-text">Crew {state.colonists}/{state.cap}{state.hiding ? ` · Hidden ${state.hiding}` : ''}</span>
        </div>
        <div className="resource-pill">
          <span className="resource-pill-bar" style={{ backgroundColor: state.isNight ? '#fcd34d' : '#67e8f9' }} />
          <span className="resource-pill-text">Day {state.day} · {clock}</span>
        </div>
        <button
          id="btnMenu"
          ref={menuButtonRef}
          type="button"
          title="Menu"
          aria-haspopup="true"
          aria-expanded={open}
          onClick={toggleDropdown}
          className="resource-menu-button"
        >
          ☰
        </button>
      </div>
      <div
        id="headerDropdown"
        ref={dropdownRef}
        hidden={!open}
      >
        {MENU_ITEMS.map((item) => (
          <button key={item.id} id={item.id} type="button" onClick={() => handleItemClick(item.action)}>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function formatValue(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  }
  if (abs >= 10_000) {
    return `${Math.floor(value / 1_000)}k`;
  }
  if (abs >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }
  return `${Math.floor(value)}`;
}
