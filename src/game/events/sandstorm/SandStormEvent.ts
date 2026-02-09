import type { GameEvent, EventContext } from '../types';
import type { SandStormSystem } from './SandStormSystem';

export class SandStormEvent implements GameEvent {
  id = 'sand_storm';
  name = 'Sand Storm';
  description = 'A dense sand storm reduces visibility across the colony.';
  category: GameEvent['category'] = 'threat';
  weight = 0.7;
  cooldownDays = 2;
  minDay = 2;

  canTrigger(ctx: EventContext): boolean {
    const game = ctx.game as any;
    if (game?.tutorialSystem?.isActive?.()) return false;
    if (game?.gameOverScreen?.isActive?.()) return false;
    if (game?.sandStormSystem?.isActive?.()) return false;
    if ((game?.colonists || []).filter((c: any) => c.alive).length === 0) return false;
    return true;
  }

  trigger(ctx: EventContext): void {
    const game = ctx.game as any;
    const durationSeconds = 60 + ctx.rng() * 60;
    const system = game?.sandStormSystem as SandStormSystem | undefined;
    if (system) {
      system.start(durationSeconds);
    }
  }
}
