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
import { TreePlantingWorkGiver } from './treePlanting';
import { SmithingWorkGiver } from './smithing';
import { EquipmentWorkGiver } from './equipment';
import { PatientWorkGiver } from './patient';

export const WORK_GIVERS: WorkGiver[] = [
  // Order can influence tie-breakers before distance sort
  // Patient work should be checked first for injured colonists
  PatientWorkGiver,
  ConstructionWorkGiver,
  GrowingWorkGiver,
  TreePlantingWorkGiver, // Tree planting and harvesting in designated zones
  WaterCollectionWorkGiver,
  PlantCuttingWorkGiver,
  MiningWorkGiver,
  CookingWorkGiver,
  StonecuttingWorkGiver,
  SmeltingWorkGiver,
  CoolingWorkGiver,
  FloorHaulingWorkGiver, // Hauls floor items (wheat, bread, etc.) to stockpiles
  ResearchWorkGiver,
  SmithingWorkGiver, // Smithing weapons and tools at smithing bench
  EquipmentWorkGiver, // Colonists pickup and equip weapons/armor from floor
];
