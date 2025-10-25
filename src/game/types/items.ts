import type { Vec2 } from "../../core/utils";

export type ItemType = 'wood' | 'stone' | 'rubble' | 'food' | 'wheat' | 'bread' | 'medicine' | 'metal' | 'cloth' | 'coal' | 'copper' | 'steel' | 'silver' | 'gold';

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
