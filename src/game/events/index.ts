import type { GameEvent } from './types';
import { CacheWindfallEvent } from './CacheWindfallEvent';
import { CampfireStoriesEvent } from './CampfireStoriesEvent';
import { FoodSpoilageEvent } from './FoodSpoilageEvent';
import { SingleEnemyAttackEvent } from './SingleEnemyAttackEvent';
import { SkyFestivalEvent } from './SkyFestivalEvent';
import { SolarFlareEvent } from './SolarFlareEvent';
import { SandStormEvent } from './sandstorm/SandStormEvent';

export function createDefaultEvents(): GameEvent[] {
  return [
    new SingleEnemyAttackEvent(),
    new SandStormEvent(),
    new SolarFlareEvent(),
    new FoodSpoilageEvent(),
    new CacheWindfallEvent(),
    new CampfireStoriesEvent(),
    new SkyFestivalEvent()
  ];
}
