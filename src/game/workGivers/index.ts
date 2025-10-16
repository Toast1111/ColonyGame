import type { WorkGiver } from './types';
import { GrowingWorkGiver } from './growing';
import { WaterCollectionWorkGiver } from './waterCollection';
import { ConstructionWorkGiver } from './construction';
import { PlantCuttingWorkGiver } from './plantCutting';
import { MiningWorkGiver } from './mining';
import { CookingWorkGiver } from './cooking';
import { HaulingWorkGiver } from './hauling';
import { FloorHaulingWorkGiver } from './floorHauling';

export const WORK_GIVERS: WorkGiver[] = [
  // Order can influence tie-breakers before distance sort
  ConstructionWorkGiver,
  GrowingWorkGiver,
  WaterCollectionWorkGiver,
  PlantCuttingWorkGiver,
  MiningWorkGiver,
  CookingWorkGiver,
  HaulingWorkGiver,
  FloorHaulingWorkGiver,
  // Add more: ConstructionWorkGiver, MiningWorkGiver, HaulingWorkGiver, etc.
];
