/**
 * HUD (Heads-Up Display) Module
 * 
 * Orchestrates all HUD elements:
 * - Top bar (resources, colonists, time)
 * - Bottom hotbar (building shortcuts 1-9)
 * - Toast messages
 */

import type { Message } from '../../types';
import { drawTopBar, type TopBarData } from './topBar';
import { drawHotbar, type HotbarItem, type HotbarRect } from './hotbar';
import { drawMessages } from './messages';

export interface HUDData {
  res: { 
    wood: number; 
    stone: number; 
    food: number; 
    wheat?: number; 
    bread?: number;
  };
  colonists: number;
  cap: number;
  hiding: number;
  day: number;
  tDay: number;
  isNight: boolean;
  hotbar: HotbarItem[];
  messages: Message[];
  storage?: { 
    used: number; 
    max: number;
  };
}

/**
 * Main HUD drawing function
 * Renders all HUD elements and returns hotbar click regions
 */
export function drawHUD(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  data: HUDData,
  game: any
): HotbarRect[] {
  // Draw top bar (resources, time, colonists)
  drawTopBar(ctx, canvas, {
    res: data.res,
    colonists: data.colonists,
    cap: data.cap,
    hiding: data.hiding,
    day: data.day,
    tDay: data.tDay,
    isNight: data.isNight,
    storage: data.storage
  }, game);
  
  // Draw bottom hotbar (building shortcuts) and get click regions
  const hotbarRects = drawHotbar(ctx, canvas, data.hotbar, game);
  
  // Draw toast messages
  drawMessages(ctx, canvas, data.messages, game);
  
  return hotbarRects;
}

// Re-export types for convenience
export type { TopBarData, HotbarItem, HotbarRect };
