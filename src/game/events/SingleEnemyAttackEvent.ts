import type { GameEvent, EventContext } from './types';

export class SingleEnemyAttackEvent implements GameEvent {
  id = 'single_enemy_attack';
  name = 'Lone Raider';
  description = 'A single raider approaches the colony.';
  category: GameEvent['category'] = 'threat';
  weight = 1;
  cooldownDays = 0.5;
  minDay = 1;

  canTrigger(ctx: EventContext): boolean {
    const game = ctx.game as any;
    if (game?.tutorialSystem?.isActive?.()) return false;
    if (game?.gameOverScreen?.isActive?.()) return false;
    if (game?.disableEnemySpawns) return false;
    if ((game?.colonists || []).filter((c: any) => c.alive).length === 0) return false;
    if ((game?.enemies || []).length >= 6) return false;
    return true;
  }

  trigger(ctx: EventContext): void {
    const game = ctx.game as any;
    const enemy = game?.spawnEnemy?.();
    if (enemy) {
      game?.msg?.('A lone raider approaches the colony.', 'warn');
    }
  }
}
