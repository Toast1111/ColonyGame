import type { Building, Colonist } from '../../types';
import type { Game } from '../../Game';

export function updateMoveState(
  c: Colonist,
  game: Game,
  dt: number,
  changeState: (state: import('../../types').ColonistState, reason?: string) => void
) {
  const intent = c.commandIntent;
  const target = c.target as any;
  if (!intent || !target) {
    if (intent !== 'guard') {
      c.task = null;
      c.target = null;
      c.taskData = null;
      c.commandData = null;
      c.guardAnchor = null;
    }
    if (intent !== 'guard') {
      c.commandIntent = null;
    }
    changeState('seekTask', 'move missing context');
    return;
  }

  const targetIsBuilding = typeof target.x === 'number' && typeof target.y === 'number' && target.w != null && target.h != null;
  const destination = targetIsBuilding
    ? { x: (target as Building).x + (target as Building).w / 2, y: (target as Building).y + (target as Building).h / 2 }
    : { x: target.x, y: target.y };
  const arriveRadius = intent === 'guard'
    ? 14
    : targetIsBuilding ? Math.max((target as Building).w, (target as Building).h) / 2 + c.r + 12 : 14;

  if (game.moveAlongPath(c, dt, destination, arriveRadius)) {
    const clearCommand = () => {
      c.task = null;
      c.target = null;
      c.taskData = null;
      c.commandIntent = null;
      c.commandData = null;
      c.guardAnchor = null;
      game.clearPath && game.clearPath(c);
    };

    switch (intent) {
      case 'goto': {
        let entered = false;
        if (targetIsBuilding && game.tryEnterBuilding) {
          if (!game.buildingHasSpace || game.buildingHasSpace(target, c)) {
            entered = game.tryEnterBuilding(c, target);
          }
        }
        if (entered) {
          clearCommand();
          changeState('resting', 'entered requested building');
        } else {
          clearCommand();
          changeState('seekTask', 'reached ordered location');
        }
        break;
      }
      case 'rest': {
        let entered = false;
        if (targetIsBuilding && game.tryEnterBuilding) {
          entered = game.tryEnterBuilding(c, target);
        }
        clearCommand();
        changeState('resting', entered ? 'resting in assigned shelter' : 'resting at ordered spot');
        break;
      }
      case 'medical':
      case 'seekMedical': {
        let entered = false;
        if (targetIsBuilding && game.tryEnterBuilding) {
          entered = game.tryEnterBuilding(c, target);
        }
        (c as any).needsMedical = true;
        clearCommand();
        changeState('beingTreated', entered ? 'entered medical facility' : 'awaiting treatment');
        break;
      }
      case 'guard': {
        c.guardAnchor = { x: destination.x, y: destination.y };
        c.commandIntent = 'guard';
        c.commandData = c.commandData ?? null;
        c.target = { x: destination.x, y: destination.y };
        c.taskData = null;
        game.clearPath && game.clearPath(c);
        changeState('guard', 'holding position');
        break;
      }
      default: {
        clearCommand();
        changeState('seekTask', 'unknown move intent');
        break;
      }
    }
  }
}