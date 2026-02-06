import type { Game } from '../Game';

export type GameEventCategory = 'threat' | 'boon' | 'neutral';

export type EventContext = {
  game: Game;
  nowDay: number;
  rng: () => number;
};

export type GameEvent = {
  id: string;
  name: string;
  description: string;
  category: GameEventCategory;
  weight: number;
  cooldownDays?: number;
  minDay?: number;
  maxDay?: number;
  canTrigger: (ctx: EventContext) => boolean;
  trigger: (ctx: EventContext) => void;
};
