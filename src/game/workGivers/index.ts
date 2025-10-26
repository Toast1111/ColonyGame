import type { WorkGiver } from './types';
import { GrowingWorkGiver } from './growing';
import { WaterCollectionWorkGiver } from './waterCollection';
import { ConstructionWorkGiver } from './construction';
import { PlantCuttingWorkGiver } from './plantCutting';
import { MiningWorkGiver } from './mining';
import { CookingWorkGiver } from './cooking';
import { StonecuttingWorkGiver } from './stonecutting';
import { SmeltingWorkGiver } from './smelting';
import { CoolingWorkGiver } from './cooling';
// Removed old HaulingWorkGiver (stove->pantry bread hauling) - now uses floor-based system
import { FloorHaulingWorkGiver } from './floorHauling';
import { ResearchWorkGiver } from './research';

export const WORK_GIVERS: WorkGiver[] = [
  // Order can influence tie-breakers before distance sort
  ConstructionWorkGiver,
  GrowingWorkGiver,
  WaterCollectionWorkGiver,
  PlantCuttingWorkGiver,
  MiningWorkGiver,
  CookingWorkGiver,
  StonecuttingWorkGiver,
  SmeltingWorkGiver,
  CoolingWorkGiver,
  FloorHaulingWorkGiver, // Hauls floor items (wheat, bread, etc.) to stockpiles
  ResearchWorkGiver,
];
