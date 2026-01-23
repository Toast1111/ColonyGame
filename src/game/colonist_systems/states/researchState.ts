import type { Building, Colonist } from '../../types';
import type { Game } from '../../Game';

export function updateResearchState(
  c: Colonist,
  game: Game,
  dt: number,
  changeState: (state: import('../../types').ColonistState, reason?: string) => void
) {
  // Research state - colonist works at research bench
  const bench = c.target as Building;
  if (!bench || bench.kind !== 'research_bench' || !bench.done) {
    // Research bench was destroyed or doesn't exist
    c.target = null;
    game.clearPath(c);
    changeState('seekTask', 'research bench no longer available');
    return;
  }

  // Check if research is still active
  if (!game.researchManager?.getCurrentResearch()) {
    c.target = null;
    changeState('seekTask', 'no active research');
    return;
  }

  const pt = { x: bench.x + bench.w / 2, y: bench.y + bench.h / 2 };
  const distance = Math.hypot(c.x - pt.x, c.y - pt.y);

  // Move to research bench
  if (distance > 20) {
    game.moveAlongPath(c, dt, pt, 20);
    return;
  }

  // At research bench - do research work
  if (game.pointInRect(c, bench)) {
    // Generate research points based on colonist's research skill (or use base rate)
    const researchSpeed = 5; // Base research points per second
    const points = researchSpeed * dt;

    // Add progress to research manager
    const completed = game.researchManager.addProgress(points);

    if (completed) {
      // Research completed!
      game.msg(`Research completed!`, 'success');
      c.target = null;
      changeState('seekTask', 'research completed');
    }
  } else {
    // Not in correct position, try to move there
    game.moveAlongPath(c, dt, pt, 0);
  }
}