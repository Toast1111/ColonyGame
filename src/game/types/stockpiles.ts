import type { ItemType } from './items';

export interface StockpileZone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  allowedItems: Set<ItemType>;
  priority: number;
  settings: StockpileSettings;
}

export interface StockpileSettings {
  allowAll: boolean;
  maxStacks: number;
  organized: boolean;
}
