import { COLORS, T, WORLD } from "./constants";
import type { Building, Bullet, Camera, Particle } from "./types";
import type { TerrainGrid } from "./terrain";
import { getFloorTypeFromId, FloorType, FLOOR_VISUALS } from "./terrain";
import { ImageAssets } from "../assets/images";
import { getColonistMood } from "./colonist_systems/colonistGenerator";
import { drawParticles } from "../core/particles";
import { getDoorOpenAmount } from "./systems/doorSystem";
import { fillRectAlpha } from "../core/RenderOptimizations";
import type { DirtyRectTracker } from "../core/DirtyRectTracker";
import { colonistSpriteCache } from "../core/RenderCache";

// Export the new modular HUD system directly
export { drawHUD, type HUDData } from './ui/hud/index';

// Re-export UI rendering utilities from their new locations
export { drawPersonIcon, drawShieldIcon } from './ui/renderUtils';
export { drawColonistAvatar } from './ui/colonistRenderer';

/**
 * Clear canvas - optimized to support dirty rectangle tracking
 * When dirtyTracker is provided, only clears dirty regions
 */
export function clear(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, dirtyTracker?: DirtyRectTracker) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = COLORS.sky;
  
  if (dirtyTracker) {
    // Use dirty rect tracking for optimized clearing
    dirtyTracker.optimize();
    dirtyTracker.clearDirty(ctx, COLORS.sky);
  } else {
    // Fallback to full clear if no tracker
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

// Apply camera transform for world rendering
export function applyWorldTransform(ctx: CanvasRenderingContext2D, cam: Camera) {
  ctx.translate(-cam.x * cam.zoom, -cam.y * cam.zoom);
  ctx.scale(cam.zoom, cam.zoom);
}

// Simple ground renderer with grid
export function drawGround(ctx: CanvasRenderingContext2D, camera?: Camera) {
  ctx.save();
  // Base ground
  ctx.fillStyle = COLORS.ground;
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  
  // High-contrast grid that stays ~1px in screen space
  const tr = (ctx as any).getTransform ? (ctx.getTransform() as DOMMatrix) : null;
  const zoom = tr ? Math.max(0.001, tr.a) : 1;
  ctx.lineWidth = Math.max(1 / zoom, 0.75 / zoom);
  
  // Calculate visible bounds for grid culling
  let startX = 0, endX = WORLD.w, startY = 0, endY = WORLD.h;
  if (camera) {
    const canvasWidth = ctx.canvas.width / zoom;
    const canvasHeight = ctx.canvas.height / zoom;
    startX = Math.max(0, Math.floor(camera.x / T) * T);
    endX = Math.min(WORLD.w, Math.ceil((camera.x + canvasWidth) / T) * T);
    startY = Math.max(0, Math.floor(camera.y / T) * T);
    endY = Math.min(WORLD.h, Math.ceil((camera.y + canvasHeight) / T) * T);
  }
  
  // Use rgba() instead of globalAlpha for better performance
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)'; // #1e293b with 0.5 alpha
  ctx.beginPath();
  
  // Only draw visible grid lines
  for (let x = startX; x <= endX; x += T) {
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
  }
  for (let y = startY; y <= endY; y += T) {
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
  }
  ctx.stroke();
  ctx.restore();
}

// Render floors (paths, roads, wooden floors, etc.)
export function drawFloors(ctx: CanvasRenderingContext2D, terrainGrid: TerrainGrid, camera: Camera) {
  if (!terrainGrid) return;
  
  ctx.save();
  
  // Calculate visible bounds for performance
  const startX = Math.max(0, Math.floor(camera.x / T));
  const startY = Math.max(0, Math.floor(camera.y / T));
  const endX = Math.min(terrainGrid.cols, Math.ceil((camera.x + ctx.canvas.width / camera.zoom) / T) + 1);
  const endY = Math.min(terrainGrid.rows, Math.ceil((camera.y + ctx.canvas.height / camera.zoom) / T) + 1);
  
  // Draw each floor tile
  for (let gy = startY; gy < endY; gy++) {
    for (let gx = startX; gx < endX; gx++) {
      const idx = gy * terrainGrid.cols + gx;
      const floorType = getFloorTypeFromId(terrainGrid.floors[idx]);
      
      // Skip empty floor tiles
      if (floorType === FloorType.NONE) continue;
      
      const visual = FLOOR_VISUALS[floorType];
      if (!visual) continue;
      
      const wx = gx * T;
      const wy = gy * T;
      
      // Draw floor tile
      ctx.fillStyle = visual.color;
      ctx.fillRect(wx, wy, T, T);
      
      // Add pattern/texture based on floor type
      if (visual.pattern === 'stripes' && visual.secondaryColor) {
        ctx.fillStyle = visual.secondaryColor;
        ctx.fillRect(wx, wy, T, T / 4);
        ctx.fillRect(wx, wy + T / 2, T, T / 4);
      } else if (visual.pattern === 'noise' && visual.secondaryColor) {
        // Simple noise pattern
        ctx.fillStyle = visual.secondaryColor;
        if ((gx + gy) % 2 === 0) {
          ctx.fillRect(wx + T / 4, wy + T / 4, T / 2, T / 2);
        }
      }
      
      // Subtle border to distinguish tiles
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(wx, wy, T, T);
    }
  }
  
  ctx.restore();
}

// Utility to draw a filled circle
export function drawCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function drawPoly(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, n: number, color: string, rot = 0) {
  ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < n; i++) { const a = rot + i * 2 * Math.PI / n; const px = x + Math.cos(a) * r; const py = y + Math.sin(a) * r; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
  ctx.closePath(); ctx.fill();
}

export function drawBuilding(ctx: CanvasRenderingContext2D, b: Building) {
  // Path visual: subtle darker tile
  if ((b as any).kind === 'path') {
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = '#0b0f14cc'; ctx.strokeRect(b.x + .5, b.y + .5, b.w - 1, b.h - 1);
    return;
  }
  
  // Door visual: animated opening/closing
  if (b.kind === 'door') {
    const openAmount = getDoorOpenAmount(b);
    
    ctx.save();
    ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
    
    // Door frame (always visible)
    ctx.fillStyle = '#4a3520';
    ctx.fillRect(-b.w / 2, -b.h / 2, b.w, 3); // Top frame
    ctx.fillRect(-b.w / 2, b.h / 2 - 3, b.w, 3); // Bottom frame
    ctx.fillRect(-b.w / 2, -b.h / 2, 3, b.h); // Left frame
    ctx.fillRect(b.w / 2 - 3, -b.h / 2, 3, b.h); // Right frame
    
    // Door panels (slide horizontally when opening)
    if (openAmount < 1) {
      const panelTravel = b.w / 2 - 3;
      const panelWidth = b.w / 2 - 6;
      const leftX = -b.w / 2 + 3 - openAmount * panelTravel;
      const rightX = 3 + openAmount * panelTravel;
      
      // Left panel
      ctx.fillStyle = b.color;
      ctx.fillRect(leftX, -b.h / 2 + 3, panelWidth, b.h - 6);
      ctx.strokeStyle = '#2a1a10';
      ctx.strokeRect(leftX, -b.h / 2 + 3, panelWidth, b.h - 6);
      
      // Right panel
      ctx.fillStyle = b.color;
      ctx.fillRect(rightX, -b.h / 2 + 3, panelWidth, b.h - 6);
      ctx.strokeStyle = '#2a1a10';
      ctx.strokeRect(rightX, -b.h / 2 + 3, panelWidth, b.h - 6);
      
      // Door details (vertical lines)
      ctx.strokeStyle = '#3a2510';
      ctx.lineWidth = 1;
      for (let i = 1; i < 3; i++) {
        const x1 = leftX + panelWidth * i / 3;
        const x2 = rightX + panelWidth * i / 3;
        ctx.beginPath();
        ctx.moveTo(x1, -b.h / 2 + 6);
        ctx.lineTo(x1, b.h / 2 - 6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x2, -b.h / 2 + 6);
        ctx.lineTo(x2, b.h / 2 - 6);
        ctx.stroke();
      }
    }
    
    ctx.restore();
    
    // Build progress bar
    if (!b.done) {
      ctx.fillStyle = '#0b1220'; ctx.fillRect(b.x, b.y - 6, b.w, 4);
      ctx.fillStyle = '#6ee7ff'; const pct = 1 - (b.buildLeft / b.build);
      ctx.fillRect(b.x, b.y - 6, pct * b.w, 4);
    }
    
    // HP bar if damaged
    if (b.done && b.hp < 100) {
      const maxHp = 100; // You may want to store this
      const hpPct = b.hp / maxHp;
      ctx.fillStyle = '#0b1220'; 
      ctx.fillRect(b.x, b.y + b.h + 2, b.w, 3);
      ctx.fillStyle = hpPct > 0.5 ? '#4ade80' : hpPct > 0.25 ? '#fbbf24' : '#ef4444';
      ctx.fillRect(b.x, b.y + b.h + 2, b.w * hpPct, 3);
    }
    
    return;
  }

  // Special handling for house buildings with image assets
  if (b.kind === 'house') {
    const assets = ImageAssets.getInstance();
    const houseImg = assets.getImage('house');
    
    if (houseImg && assets.isLoaded()) {
      // Draw the house image, scaled to fit the building size
      ctx.drawImage(houseImg, b.x, b.y, b.w, b.h);
      
      // Add border for consistency
      ctx.strokeStyle = '#0b0f14cc'; 
      ctx.strokeRect(b.x + .5, b.y + .5, b.w - 1, b.h - 1);
    } else {
      // Fallback to colored rectangle if image isn't loaded
      ctx.fillStyle = b.color; 
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = '#0b0f14cc'; 
      ctx.strokeRect(b.x + .5, b.y + .5, b.w - 1, b.h - 1);
    }
  } 
  // Special handling for farm buildings with growth stage images
  else if (b.kind === 'farm' && b.done) {
    const assets = ImageAssets.getInstance();
    
    // Determine which growth stage to show based on growth progress
    const growth = b.growth || 0;
    let stageName = 'wheat_stage_1'; // Default to stage 1 (just planted)
    
    if (growth >= 0.67) {
      stageName = 'wheat_stage_3'; // Ready to harvest
    } else if (growth >= 0.33) {
      stageName = 'wheat_stage_2'; // Growing
    }
    
    const wheatImg = assets.getImage(stageName);
    
    if (wheatImg && assets.isLoaded()) {
      // Draw the wheat image, scaled to fit the building size
      ctx.drawImage(wheatImg, b.x, b.y, b.w, b.h);
      
      // Add border for consistency
      ctx.strokeStyle = '#0b0f14cc'; 
      ctx.strokeRect(b.x + .5, b.y + .5, b.w - 1, b.h - 1);
    } else {
      // Fallback to colored rectangle with growth indicator if image isn't loaded
      ctx.fillStyle = b.color; 
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = '#0b0f14cc'; 
      ctx.strokeRect(b.x + .5, b.y + .5, b.w - 1, b.h - 1);
      
      // Draw a simple growth progress bar as fallback
      if (growth > 0) {
        ctx.fillStyle = '#4ade80'; // Green progress
        ctx.fillRect(b.x + 2, b.y + b.h - 4, (b.w - 4) * Math.min(growth, 1), 2);
      }
    }
  } 
  else {
    // Default building rendering for non-house, non-farm buildings
    ctx.fillStyle = b.color; 
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = '#0b0f14cc'; 
    ctx.strokeRect(b.x + .5, b.y + .5, b.w - 1, b.h - 1);
    
    // Turret flash effect when firing
    if (b.kind === 'turret' && (b as any).flashTimer > 0) {
      ctx.fillStyle = '#ffffff88';
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
  }

  // Build progress bar
  if (!b.done) {
    ctx.fillStyle = '#0b1220'; ctx.fillRect(b.x, b.y - 6, b.w, 4);
    ctx.fillStyle = '#6ee7ff'; const pct = 1 - (b.buildLeft / b.build);
    ctx.fillRect(b.x, b.y - 6, pct * b.w, 4);
  }

  // Building labels (skip for houses and completed farms since they have images)
  if (b.kind !== 'house' && !(b.kind === 'farm' && b.done)) {
    ctx.fillStyle = '#0b0f14aa'; ctx.font = 'bold 12px system-ui';
    const cx = b.x + b.w / 2; const cy = b.y + b.h / 2; let letter = 'B';
    if (b.kind === 'hq') letter = 'HQ';
    else if (b.kind === 'farm') letter = 'F'; // Only for farms under construction
    else if (b.kind === 'turret') letter = 'T';
    else if (b.kind === 'wall') letter = 'W';
    else if (b.kind === 'stock') letter = 'S';
    else if (b.kind === 'tent') letter = 'R';
  else if ((b as any).kind === 'warehouse') letter = 'WH';
  else if ((b as any).kind === 'well') letter = 'WL';
  else if ((b as any).kind === 'infirmary') letter = 'I';
  else if ((b as any).kind === 'bed') letter = (b as any).isMedicalBed ? '⚕️' : '🛏';
  else if ((b as any).kind === 'stove') letter = '🔥';
  else if ((b as any).kind === 'pantry') letter = '🍞';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(letter, cx, cy);
  }
  
  // Cooking progress bar for stove
  if (b.kind === 'stove' && b.done && b.cookingProgress !== undefined && b.cookingProgress > 0) {
    ctx.fillStyle = '#0b1220'; 
    ctx.fillRect(b.x, b.y + b.h + 2, b.w, 4);
    ctx.fillStyle = '#ff6347'; // Tomato red for cooking progress
    ctx.fillRect(b.x, b.y + b.h + 2, b.w * b.cookingProgress, 4);
  }

  // Turret range visualization
  if (b.kind === 'turret' && (b as any).range) { 
    const cx = b.x + b.w / 2; const cy = b.y + b.h / 2;
    // Use rgba() instead of globalAlpha for better performance
    ctx.fillStyle = 'rgba(226, 243, 255, 0.07)'; // #e2f3ff with 0.07 alpha
    ctx.beginPath(); ctx.arc(cx, cy, (b as any).range, 0, Math.PI * 2); 
    ctx.fill();
  }
}

export function drawBullets(ctx: CanvasRenderingContext2D, bullets: Bullet[]) {
  for (const b of bullets) {
    // Draw the projectile trail particles if they exist
    if (b.particles && b.particles.length > 0) {
      drawParticles(ctx, b.particles);
    }
    
    // Draw a very subtle projectile line
    // Use rgba() instead of globalAlpha for better performance
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.15)'; // #e0f2fe with 0.15 alpha
    ctx.lineWidth = 1; 
    ctx.beginPath(); 
    ctx.moveTo(b.x, b.y); 
    ctx.lineTo(b.tx, b.ty); 
    ctx.stroke();
  }
}
