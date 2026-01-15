import type { Building, Colonist } from '../../types';
import type { Game } from '../../Game';

export function updateRestingState(
  c: Colonist,
  game: Game,
  dt: number,
  changeState: (state: import('../../types').ColonistState, reason?: string) => void,
  opts: { fatigueExitThreshold: number }
) {
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
  const stateSince = c.stateSince ?? 0;
  const timedOut = stateSince > 120 && !waitingForDoctor;

  if ((starving || (recoveredFatigue && healedEnough) || timedOut) && (!waitingForDoctor || starving)) {
    if (game.leaveBuilding) game.leaveBuilding(c);
    changeState('seekTask', starving ? 'left bed to eat' : 'rested enough');
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

  if (!sleepTarget || !game.buildingHasSpace(sleepTarget, c)) {
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
