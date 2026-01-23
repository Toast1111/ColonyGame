import type { Building, Colonist } from '../../types';
import type { Game } from '../../Game';

export function updateRestingState(
  c: Colonist,
  game: Game,
  dt: number,
  changeState: (state: import('../../types').ColonistState, reason?: string) => void,
  opts: { fatigueExitThreshold: number }
) {
  const hasEdible = (game.RES?.food || 0) > 0 || (game.RES?.bread || 0) > 0;

  if (c.inside && (!c.inside.done || !(game.buildings as Building[]).includes(c.inside))) {
    if (game.leaveBuilding) game.leaveBuilding(c);
    else c.inside = null;
    (c as any).sleepFacing = undefined;
    changeState('seekTask', 'resting bed invalid');
    return;
  }

  // Ensure we are logically inside a bed if we're lying on one (handles teleports or desyncs)
  if (!c.inside) {
    const bedHere = (game.buildings as Building[]).find((b) => b.kind === 'bed' && b.done && game.pointInRect({ x: c.x, y: c.y }, b));
    if (bedHere) {
      // Try to formally enter to align occupancy/reservations
      if (!game.tryEnterBuilding(c, bedHere)) {
        // Fallback: mark occupancy if enter failed (capacity mismatch) but we are physically on it
        if (game.buildingHasSpace(bedHere, c)) {
          if (!(c as any).id) {
            (c as any).id = `colonist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          }
          (bedHere as any).occupiedBy = (c as any).id;
          c.inside = bedHere;
        }
      }
    }
  }

  c.hideTimer = Math.max(0, (c.hideTimer || 0) - dt);
  if (c.inside && c.inside.kind === 'bed') {
    const bed = c.inside;
    const centerX = bed.x + bed.w / 2;
    const centerY = bed.y + bed.h / 2;
    c.x = centerX;
    c.y = centerY;
    if ((c as any).sleepFacing != null) {
      c.direction = (c as any).sleepFacing;
    }
  }

  c.hp = Math.min(100, c.hp + 1.2 * dt);

  const fatigue = c.fatigue || 0;
  const hunger = c.hunger || 0;
  const missingHp = Math.max(0, 100 - (c.hp || 100));
  const waitingForDoctor = !!(c as any).isBeingTreated && !!(c as any).doctorId;
  const recoveredFatigue = fatigue <= opts.fatigueExitThreshold;
  const healedEnough = missingHp < 4 || !(c.health?.injuries?.length);
  const starving = hunger > 88;
  const hungry = hunger > 85;
  const stateSince = c.stateSince ?? 0;
  const timedOut = stateSince > 120 && !waitingForDoctor;

  if ((starving || (hungry && hasEdible) || (recoveredFatigue && healedEnough) || timedOut) && (!waitingForDoctor || starving)) {
    if (game.leaveBuilding) game.leaveBuilding(c);
    if (hungry && hasEdible) {
      changeState('eat', 'left bed to eat');
    } else {
      changeState('seekTask', starving ? 'left bed to eat' : 'rested enough');
    }
  }
}

export function updateSleepState(
  c: Colonist,
  game: Game,
  dt: number,
  changeState: (state: import('../../types').ColonistState, reason?: string) => void,
  opts: { fatigueExitThreshold: number }
) {
  const inBed = !!c.inside && (c.inside as any).kind === 'bed';
  const sleepingOutside = (c as any).sleepOutside === true;

  if (inBed || sleepingOutside) {
    updateRestingState(c, game, dt, changeState, opts);
    return;
  }

  let sleepTarget = (c as any).sleepTarget as Building | undefined;
  const needMedical = (c.health?.injuries?.length || 0) > 0;

  if (!sleepTarget || !sleepTarget.done || !(game.buildings as Building[]).includes(sleepTarget) || !game.buildingHasSpace(sleepTarget, c)) {
    if (sleepTarget && game.releaseSleepReservation) game.releaseSleepReservation(c);
    sleepTarget = game.buildingManager?.findBestRestBuilding(c as any, { requireMedical: false, preferMedical: needMedical, allowShelterFallback: true }) || undefined;
    if (sleepTarget && game.reserveSleepSpot) {
      game.reserveSleepSpot(c, sleepTarget);
    }
    (c as any).sleepTarget = sleepTarget;
  }

  if (!sleepTarget) {
    (c as any).sleepOutside = true;
    updateRestingState(c, game, dt, changeState, opts);
    return;
  }

  const center = game.centerOf(sleepTarget);
  const arrive = Math.max(sleepTarget.w, sleepTarget.h) / 2 + 18;
  const atTarget = Math.hypot(c.x - center.x, c.y - center.y) <= arrive ||
    game.pointInRect({ x: c.x, y: c.y }, sleepTarget);

  if (atTarget) {
    const entered = game.tryEnterBuilding ? game.tryEnterBuilding(c, sleepTarget) : false;
    if (entered) {
      (c as any).sleepOutside = false;
      updateRestingState(c, game, dt, changeState, opts);
      return;
    }
    if (game.releaseSleepReservation) game.releaseSleepReservation(c);
    (c as any).sleepTarget = undefined;
    (c as any).sleepOutside = true;
    updateRestingState(c, game, dt, changeState, opts);
    return;
  }

  if (game.moveAlongPath(c, dt, center, arrive)) {
    const entered = game.tryEnterBuilding ? game.tryEnterBuilding(c, sleepTarget) : false;
    if (entered) {
      (c as any).sleepOutside = false;
    } else {
      if (game.releaseSleepReservation) game.releaseSleepReservation(c);
      (c as any).sleepTarget = undefined;
      (c as any).sleepOutside = true;
    }
    updateRestingState(c, game, dt, changeState, opts);
    return;
  }

  const stateSince = c.stateSince ?? 0;
  if (stateSince > 40) {
    if (game.releaseSleepReservation) game.releaseSleepReservation(c);
    (c as any).sleepTarget = undefined;
    (c as any).sleepOutside = true;
    updateRestingState(c, game, dt, changeState, opts);
  }
}

export function updateGoToSleepState(
  c: Colonist,
  game: Game,
  dt: number,
  changeState: (state: import('../../types').ColonistState, reason?: string) => void
) {
  let sleepTarget = (c as any).sleepTarget as Building | undefined;
  const needMedical = (c.health?.injuries?.length || 0) > 0;

  if (!sleepTarget || !sleepTarget.done || !(game.buildings as Building[]).includes(sleepTarget) || !game.buildingHasSpace(sleepTarget, c)) {
    if (sleepTarget && game.releaseSleepReservation) game.releaseSleepReservation(c);
    sleepTarget = game.buildingManager?.findBestRestBuilding(c as any, { requireMedical: false, preferMedical: needMedical, allowShelterFallback: true }) || undefined;
    if (sleepTarget && game.reserveSleepSpot) {
      game.reserveSleepSpot(c, sleepTarget);
    }
    (c as any).sleepTarget = sleepTarget;
  }

  if (!sleepTarget) {
    changeState('resting', 'sleeping outside');
    return;
  }

  const center = game.centerOf(sleepTarget);
  const arrive = Math.max(sleepTarget.w, sleepTarget.h) / 2 + 18;
  if (game.moveAlongPath(c, dt, center, arrive)) {
    const entered = game.tryEnterBuilding ? game.tryEnterBuilding(c, sleepTarget) : false;
    if (entered) {
      changeState('resting', sleepTarget.isMedicalBed ? 'asleep in medical bed' : 'asleep in bed');
    } else {
      if (game.releaseSleepReservation) game.releaseSleepReservation(c);
      (c as any).sleepTarget = undefined;
      changeState('resting', 'sleeping near shelter');
    }
  }

  const stateSince = c.stateSince ?? 0;
  if (stateSince > 40) {
    if (game.releaseSleepReservation) game.releaseSleepReservation(c);
    (c as any).sleepTarget = undefined;
    changeState('resting', 'sleep timeout');
  }
}
