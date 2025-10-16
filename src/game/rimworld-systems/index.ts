// Main manager
export { RimWorldSystemManager, type RimWorldSystemConfig } from './rimWorldManager';

// Items system
export { FloorItemManager, type FloorItem, type ItemType, type ItemStack } from './items/floorItems';

// Stockpile system
export { StockpileManager, type StockpileZone, type StockpileSettings } from './stockpiles/stockpileZones';

// Logistics system
// Note: We export the stable LogisticsManager types. EnhancedLogistics is experimental
// and its internal types intentionally aren't re-exported to avoid type collisions
// with HaulingJob, WorkGiver, etc. Import directly from the file if you need them.
export { LogisticsManager, type HaulingJob, type ConstructionMaterialRequest } from './logistics/haulManager';
export { EnhancedLogisticsManager } from './logistics/enhancedHaulManager';

// AI system
export { 
  ColonistAI, 
  JobExecutor,
  ThinkNode,
  JobGiver_Emergency,
  JobGiver_Work,
  JobGiver_Idle,
  JobGiver_PlayerForced,
  type ThinkResult,
  type ColonistJob,
  type JobStep
} from './ai/colonistAI';

// Rendering
export { RimWorldRenderer } from './rendering/rimWorldRenderer';
