import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { getContextMenuState, hideContextMenuState, subscribeContextMenu } from '../stores/contextMenuStore';
import type { ContextMenuItem } from '../../game/ui/contextMenus/types';

const MENU_MARGIN = 12;

export function ContextMenu() {
  const state = useSyncExternalStore(subscribeContextMenu, getContextMenuState, getContextMenuState);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [openSubmenuId, setOpenSubmenuId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!state.visible) return;
    setOpenSubmenuId(state.openSubmenuId);
  }, [state.visible, state.openSubmenuId]);

  useLayoutEffect(() => {
    if (!state.visible) return;
    setPosition({ x: state.x, y: state.y });
    const frame = requestAnimationFrame(() => {
      const menu = menuRef.current;
      if (!menu) return;
      const rect = menu.getBoundingClientRect();
      const x = clamp(state.x, MENU_MARGIN, window.innerWidth - rect.width - MENU_MARGIN);
      const y = clamp(state.y, MENU_MARGIN, window.innerHeight - rect.height - MENU_MARGIN);
      setPosition({ x, y });
    });
    return () => cancelAnimationFrame(frame);
  }, [state.visible, state.x, state.y, state.items.length]);

  useEffect(() => {
    if (!state.visible) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (menuRef.current?.contains(target)) return;
      hideContextMenuState();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        hideContextMenuState();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [state.visible]);

  const game = (window as any).game;
  const items = useMemo(() => state.items ?? [], [state.items]);

  if (!state.visible) {
    return null;
  }

  const handleSelect = (item: ContextMenuItem<any>) => {
    if (item.enabled === false) return;
    const context = { game, target: state.target, item };
    if (item.action) {
      item.action(context);
    } else if (state.onSelect) {
      state.onSelect(context);
    }
    try { (window as any).game?.audioManager?.play('ui.click.primary'); } catch {}
    hideContextMenuState();
  };

  const handleSubmenuToggle = (item: ContextMenuItem<any>) => {
    if (item.enabled === false) return;
    setOpenSubmenuId((prev) => (prev === item.id ? undefined : item.id));
  };

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: position.x, top: position.y }}
      role="menu"
      onMouseLeave={() => setOpenSubmenuId(undefined)}
    >
      {items.map((item) => {
        const hasSubmenu = Boolean(item.submenu && item.submenu.length > 0);
        const isOpen = hasSubmenu && openSubmenuId === item.id;
        return (
          <div
            key={item.id}
            className={`context-menu-item${item.enabled === false ? ' disabled' : ''}`}
            role="menuitem"
            title={item.tooltip}
            onClick={() => (hasSubmenu ? handleSubmenuToggle(item) : handleSelect(item))}
            onMouseEnter={() => hasSubmenu && setOpenSubmenuId(item.id)}
          >
            <span className="context-menu-icon">{item.icon ?? ''}</span>
            <span className="context-menu-label">{item.label}</span>
            {hasSubmenu && <span className="context-menu-arrow">&gt;</span>}
            {hasSubmenu && isOpen && (
              <div className="context-menu-submenu" role="menu">
                {item.submenu!.map((sub) => (
                  <div
                    key={sub.id}
                    className={`context-menu-item${sub.enabled === false ? ' disabled' : ''}`}
                    role="menuitem"
                    title={sub.tooltip}
                    onClick={() => handleSelect(sub)}
                  >
                    <span className="context-menu-icon">{sub.icon ?? ''}</span>
                    <span className="context-menu-label">{sub.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
