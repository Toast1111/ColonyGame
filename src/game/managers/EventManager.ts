import type { Game } from '../Game';
import type { EventContext, GameEvent } from '../events/types';

export type EventManagerOptions = {
  checkIntervalSeconds?: number;
  baseChance?: number;
};

export class EventManager {
  private game: Game;
  private events: GameEvent[] = [];
  private checkTimer = 0;
  private lastTriggeredDay: Map<string, number> = new Map();
  private enabled = true;
  private checkIntervalSeconds: number;
  private baseChance: number;

  constructor(game: Game, events: GameEvent[] = [], options: EventManagerOptions = {}) {
    this.game = game;
    this.events = events.slice();
    this.checkIntervalSeconds = options.checkIntervalSeconds ?? 60;
    this.baseChance = options.baseChance ?? 0.06;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getEvents(): GameEvent[] {
    return this.events.slice();
  }

  registerEvent(event: GameEvent): void {
    this.events.push(event);
  }

  update(dt: number): void {
    if (!this.enabled) return;

    this.checkTimer += dt;
    while (this.checkTimer >= this.checkIntervalSeconds) {
      this.checkTimer -= this.checkIntervalSeconds;
      this.tryTriggerRandomEvent();
    }
  }

  triggerEventById(eventId: string): boolean {
    const event = this.events.find((entry) => entry.id === eventId);
    if (!event) return false;

    const ctx = this.buildContext();
    if (!this.canTriggerEvent(event, ctx)) return false;

    event.trigger(ctx);
    this.lastTriggeredDay.set(event.id, ctx.nowDay);
    return true;
  }

  triggerRandomEligibleEvent(): string | null {
    const ctx = this.buildContext();
    const event = this.pickWeightedEligibleEvent(ctx);
    if (!event) return null;

    event.trigger(ctx);
    this.lastTriggeredDay.set(event.id, ctx.nowDay);
    return event.id;
  }

  private tryTriggerRandomEvent(): void {
    const ctx = this.buildContext();
    if (Math.random() > this.baseChance) return;

    const event = this.pickWeightedEligibleEvent(ctx);
    if (!event) return;

    event.trigger(ctx);
    this.lastTriggeredDay.set(event.id, ctx.nowDay);
  }

  private pickWeightedEligibleEvent(ctx: EventContext): GameEvent | null {
    const eligible = this.events.filter((event) => this.canTriggerEvent(event, ctx));
    if (eligible.length === 0) return null;

    const totalWeight = eligible.reduce((sum, event) => sum + Math.max(0, event.weight), 0);
    if (totalWeight <= 0) return null;

    let roll = Math.random() * totalWeight;
    for (const event of eligible) {
      roll -= Math.max(0, event.weight);
      if (roll <= 0) {
        return event;
      }
    }

    return eligible[eligible.length - 1] || null;
  }

  private canTriggerEvent(event: GameEvent, ctx: EventContext): boolean {
    if (event.minDay !== undefined && ctx.nowDay < event.minDay) return false;
    if (event.maxDay !== undefined && ctx.nowDay > event.maxDay) return false;

    const lastTriggered = this.lastTriggeredDay.get(event.id);
    if (lastTriggered !== undefined) {
      const cooldownDays = event.cooldownDays ?? 0;
      if (ctx.nowDay - lastTriggered < cooldownDays) return false;
    }

    return event.canTrigger(ctx);
  }

  private buildContext(): EventContext {
    const nowDay = (this.game.day ?? 0) + (this.game.tDay ?? 0);
    return {
      game: this.game,
      nowDay,
      rng: Math.random
    };
  }
}
