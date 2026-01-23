import type { Building, Colonist } from '../../types';
import type { Game } from '../../Game';

export function updateIdleState(
  c: Colonist,
  game: Game,
  dt: number,
  changeState: (state: import('../../types').ColonistState, reason?: string) => void
) {
  // Idle colonists can choose to interact with nearby objects like beds
  if (!c.target && (c.stateSince ?? 0) > 1.0) {  // Wait 1 second before checking interactions
    const nearbyBuildings = (game.buildings as Building[]).filter(b => {
      if (!b.done || b.kind !== 'bed') return false;
      const distance = Math.hypot(c.x - (b.x + b.w/2), c.y - (b.y + b.h/2));
      return distance <= 40; // Check beds within 40 pixels
    });

    if (nearbyBuildings.length > 0) {
      // If colonist is tired and there's a bed nearby, consider using it
      if ((c.fatigue || 0) > 50 && !c.inside) {
        const bed = nearbyBuildings[0];
        const bedCenter = { x: bed.x + bed.w/2, y: bed.y + bed.h/2 };
        const distance = Math.hypot(c.x - bedCenter.x, c.y - bedCenter.y);

        if (distance <= 20) {
          // Close enough to interact - get in bed
          const entered = game.tryEnterBuilding ? game.tryEnterBuilding(c, bed) : false;
          if (entered) {
            changeState('resting', 'chose to use bed');
            return;
          }
        } else {
          // Move toward bed
          c.target = bedCenter;
        }
      } else if (c.inside && (c.fatigue || 0) < 30) {
        // In bed but not tired - consider getting out
        const bed = c.inside;
        if (bed && bed.kind === 'bed') {
          // Get out of bed
          if (game.leaveBuilding) {
            game.leaveBuilding(c);
          } else {
            c.inside = null;
          }
          c.x = bed.x + bed.w/2 + 20;
          c.y = bed.y + bed.h/2;
          (c as any).sleepFacing = undefined;
          changeState('seekTask', 'got out of bed');
          return;
        }
      }
    }
  }

  const dst = c.target;
  if (!dst) {
    // Create a random idle target if none exists
    c.target = { x: c.x + (Math.random() - 0.5) * 160, y: c.y + (Math.random() - 0.5) * 160 };
    return;
  }

  // Safety: if carrying a floor item but somehow in idle, finish the haul by dropping and rescheduling
  if ((c as any).carryingItem) {
    const payload = (c as any).carryingItem;
    const rim = (game as any).itemManager;
    if (rim && payload.qty > 0) {
      rim.dropItems(payload.type, payload.qty, { x: c.x, y: c.y });
    }
    (c as any).carryingItem = null;
    c.taskData = null;
    c.task = null;
    c.target = null;
    game.clearPath(c);
    changeState('seekTask', 'reset idle with carried item');
    return;
  }

  // If we’ve been idling too long, re-seek a task to avoid lingering
  if ((c.stateSince ?? 0) > 15) {
    c.task = null;
    c.target = null;
    game.clearPath(c);
    changeState('seekTask', 'idle timeout');
    return;
  }

  if (game.moveAlongPath(c, dt, dst, 8)) {
    c.task = null;
    c.target = null;
    game.clearPath(c);
    changeState('seekTask', 'reached target');
  }
}