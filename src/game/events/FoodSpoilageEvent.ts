import type { EventContext, GameEvent } from './types';
import { isGameReadyForEvents } from './eventUtils';

export class FoodSpoilageEvent implements GameEvent {
  id = 'cold_chain_failure';
  name = 'Cold Chain Failure';
  description = 'Storage temperatures drift and part of the food supply spoils.';
  category: GameEvent['category'] = 'threat';
  weight = 0.9;
  cooldownDays = 1.25;
  minDay = 1;

  canTrigger(ctx: EventContext): boolean {
    const game = ctx.game as any;
    if (!isGameReadyForEvents(game)) return false;
    return (game.RES?.food || 0) + (game.RES?.bread || 0) >= 8;
  }

  trigger(ctx: EventContext): void {
    const game = ctx.game as any;
    const foodPool = (game.RES?.food || 0) + (game.RES?.bread || 0);
    const loss = Math.max(4, Math.round(foodPool * (0.12 + ctx.rng() * 0.08)));

    let remaining = loss;
    const breadLost = Math.min(game.consumeStockpileResource?.('bread', remaining) || 0, remaining);
    remaining -= breadLost;

    const foodLost = remaining > 0
      ? Math.min(game.consumeStockpileResource?.('food', remaining) || 0, remaining)
      : 0;

    const totalLost = breadLost + foodLost;
    game.msg?.(`Cold chain failure: ${totalLost} food spoiled before it could be used.`, 'warn');
  }
}
