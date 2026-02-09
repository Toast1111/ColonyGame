import type { GameEvent } from './types';
import { SingleEnemyAttackEvent } from './SingleEnemyAttackEvent';
import { SandStormEvent } from './sandstorm/SandStormEvent';

export function createDefaultEvents(): GameEvent[] {
  return [
    new SingleEnemyAttackEvent(),
    new SandStormEvent()
  ];
}
