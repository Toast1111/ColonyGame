import type { Vec2 } from "../../core/utils";

export type ItemType = 'wood' | 'stone' | 'rubble' | 'food' | 'wheat' | 'bread' | 'medicine' | 'healroot' | 'metal' | 'cloth' | 'coal' | 'copper' | 'steel' | 'silver' | 'gold' | 'steel_ingot' | 'copper_ingot' | 'silver_ingot' | 'gold_ingot' | 'hot_steel_ingot' | 'hot_copper_ingot' | 'hot_silver_ingot' | 'hot_gold_ingot' | 'gladius' | 'mace' | 'knife';

export interface FloorItem {
  id: string;
  type: ItemType;
  quantity: number;
  position: Vec2;
  weight: number;
  stackLimit: number;
  createdAt: number;
  metadata?: { [key: string]: any };
}

export interface ItemStack {
  type: ItemType;
  totalQuantity: number;
  position: Vec2;
  itemIds: string[];
}

export interface ItemDefinition {
  name: string;
  weight: number;
  stackLimit: number;
  stackRadius: number;
  color: string;
}
