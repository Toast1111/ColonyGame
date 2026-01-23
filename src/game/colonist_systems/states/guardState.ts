import type { Colonist } from '../../types';
import type { Game } from '../../Game';

export function updateGuardState(
  c: Colonist,
  game: Game,
  dt: number,
  changeState: (state: import('../../types').ColonistState, reason?: string) => void
) {
  const anchor = c.guardAnchor;
  if (!anchor) {
    c.task = null;
    c.commandIntent = null;
    c.commandData = null;
    changeState('seekTask', 'guard anchor missing');
    return;
  }

  const distance = Math.hypot(c.x - anchor.x, c.y - anchor.y);
  if (distance > 18) {
    game.moveAlongPath(c, dt, anchor, 10);
  } else {
    const dx = anchor.x - c.x;
    const dy = anchor.y - c.y;
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      c.direction = Math.atan2(-dy, -dx);
    }
  }

  const commandStillActive = c.playerCommand?.issued && (!c.playerCommand.expires || (c.t || 0) < c.playerCommand.expires);
  if (!commandStillActive) {
    c.task = null;
    c.target = null;
    c.commandIntent = null;
    c.commandData = null;
    c.guardAnchor = null;
    changeState('seekTask', 'guard command expired');
  }
}