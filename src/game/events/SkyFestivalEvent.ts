import type { EventContext, GameEvent } from './types';
import { dropAroundHQ, isGameReadyForEvents, pickColonist } from './eventUtils';

export class SkyFestivalEvent implements GameEvent {
  id = 'sky_festival';
  name = 'Sky Festival';
  description = 'Strange lights fill the sky, and colonists pause to watch.';
  category: GameEvent['category'] = 'neutral';
  weight = 0.7;
  cooldownDays = 2;
  minDay = 3;

  canTrigger(ctx: EventContext): boolean {
    return isGameReadyForEvents(ctx.game);
  }

  trigger(ctx: EventContext): void {
    const game = ctx.game as any;
    const target = pickColonist(game, ctx.rng);

    if (target) {
      target.state = 'idle';
      target.stateSince = target.t || 0;
    }

    const giftRoll = ctx.rng();
    if (giftRoll < 0.4) {
      dropAroundHQ(game, 'silver', 3 + Math.floor(ctx.rng() * 4), ctx.rng);
      game.msg?.('Sky festival: beautiful lights drift by, leaving tiny silver fragments.', 'info');
    } else {
      game.msg?.('Sky festival: everyone pauses to stare as silent lights cross the night.', 'info');
    }
  }
}
