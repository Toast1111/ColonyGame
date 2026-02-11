import type { EventContext, GameEvent } from './types';
import { isGameReadyForEvents, livingColonists, pickColonist } from './eventUtils';

export class SolarFlareEvent implements GameEvent {
  id = 'solar_flare_surge';
  name = 'Solar Flare Surge';
  description = 'A geomagnetic surge fries systems, injuring a colonist and wearing everyone down.';
  category: GameEvent['category'] = 'threat';
  weight = 0.85;
  cooldownDays = 1.5;
  minDay = 2;

  canTrigger(ctx: EventContext): boolean {
    return isGameReadyForEvents(ctx.game);
  }

  trigger(ctx: EventContext): void {
    const game = ctx.game as any;
    const target = pickColonist(game, ctx.rng);

    if (target && typeof game.applyDamageToColonist === 'function') {
      game.applyDamageToColonist(target, 10 + Math.floor(ctx.rng() * 6), 'burn');
    }

    for (const colonist of livingColonists(game)) {
      colonist.fatigue = Math.min(100, (colonist.fatigue || 0) + 16);
    }

    game.msg?.('Solar flare surge! Electronics arc, colonists stagger, and fatigue spikes.', 'bad');
  }
}
