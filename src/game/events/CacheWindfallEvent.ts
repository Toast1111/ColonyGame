import type { EventContext, GameEvent } from './types';
import { dropAroundHQ, isGameReadyForEvents } from './eventUtils';

export class CacheWindfallEvent implements GameEvent {
  id = 'forgotten_cache_windfall';
  name = 'Forgotten Cache Windfall';
  description = 'A buried cache is discovered near the colony perimeter.';
  category: GameEvent['category'] = 'boon';
  weight = 0.75;
  cooldownDays = 1.8;
  minDay = 2;

  canTrigger(ctx: EventContext): boolean {
    return isGameReadyForEvents(ctx.game);
  }

  trigger(ctx: EventContext): void {
    const game = ctx.game as any;
    const wood = 20 + Math.floor(ctx.rng() * 16);
    const stone = 12 + Math.floor(ctx.rng() * 10);
    const medicine = 2 + Math.floor(ctx.rng() * 4);

    dropAroundHQ(game, 'wood', wood, ctx.rng);
    dropAroundHQ(game, 'stone', stone, ctx.rng);
    dropAroundHQ(game, 'medicine', medicine, ctx.rng);

    game.msg?.(`Forgotten cache recovered: +${wood} wood, +${stone} stone, +${medicine} medicine.`, 'good');
  }
}
