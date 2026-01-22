import type { AudioKey } from '../AudioManager';

function playUi(game: any, key: AudioKey): void {
  if (game?.playAudio) {
    game.playAudio(key);
    return;
  }
  if (game?.audioManager) {
    game.audioManager.play(key).catch(() => {});
  }
}

export function playUiClickPrimary(game: any): void {
  playUi(game, 'ui.click.primary');
}

export function playUiClickSecondary(game: any): void {
  playUi(game, 'ui.click.secondary');
}

export function playUiPanelOpen(game: any): void {
  playUi(game, 'ui.panel.open');
}

export function playUiPanelClose(game: any): void {
  playUi(game, 'ui.panel.close');
}

export function playUiHover(game: any): void {
  playUi(game, 'ui.hover');
}

export function playUiHotbarHover(game: any): void {
  playUi(game, 'ui.hotbar.hover');
}

export function playUiDragStart(game: any): void {
  playUi(game, 'ui.drag.start');
}

export function playUiDragEnd(game: any): void {
  playUi(game, 'ui.drag.end');
}
