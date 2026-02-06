import type { GameEvent } from './types';
import { SingleEnemyAttackEvent } from './SingleEnemyAttackEvent';

export function createDefaultEvents(): GameEvent[] {
  return [
    new SingleEnemyAttackEvent()
  ];
}
