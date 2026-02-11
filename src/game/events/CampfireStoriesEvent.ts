import type { EventContext, GameEvent } from './types';
import { isGameReadyForEvents, livingColonists } from './eventUtils';

export class CampfireStoriesEvent implements GameEvent {
  id = 'campfire_stories';
  name = 'Campfire Stories';
  description = 'An evening of stories and laughter boosts morale and recovery.';
  category: GameEvent['category'] = 'boon';
  weight = 0.95;
  cooldownDays = 1;
  minDay = 1;

  canTrigger(ctx: EventContext): boolean {
    return isGameReadyForEvents(ctx.game);
  }

  trigger(ctx: EventContext): void {
    const game = ctx.game as any;
    let refreshed = 0;

    for (const colonist of livingColonists(game)) {
      const prevFatigue = colonist.fatigue || 0;
      const prevHunger = colonist.hunger || 0;
      colonist.fatigue = Math.max(0, prevFatigue - 22);
      colonist.hunger = Math.max(0, prevHunger - 12);
      colonist.hp = Math.min(colonist.maxHp || 100, (colonist.hp || 0) + 6);
      refreshed++;
    }

    game.msg?.(`Campfire stories lift spirits: ${refreshed} colonist(s) feel rested and steady.`, 'good');
  }
}
