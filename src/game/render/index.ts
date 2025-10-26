import { COLORS, T, WORLD } from "../constants";
import type { Building, Bullet, Camera, Particle } from "../types";
import type { TerrainGrid } from "../terrain";
import { getFloorTypeFromId, FloorType, FLOOR_VISUALS, getTerrainTypeFromId, TerrainType, getOreTypeFromId, OreType, ORE_PROPERTIES } from "../terrain";
import { ImageAssets } from "../../assets/images";
import { getColonistMood } from "../colonist_systems/colonistGenerator";
import { drawParticles } from "../../core/particles";
import { getDoorOpenAmount } from "../systems/doorSystem";
import { fillRectAlpha } from "../../core/RenderOptimizations";
import type { DirtyRectTracker } from "../../core/DirtyRectTracker";
import { colonistSpriteCache } from "../../core/RenderCache";

// Export the new modular HUD system directly
export { drawHUD, type HUDData } from '../ui/hud/index';

// Re-export UI rendering utilities from their new locations
export { drawPersonIcon, drawShieldIcon } from '../ui/renderUtils';
export { drawColonistAvatar } from './sprites/colonistRenderer';

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
  // Align the transformed world to physical pixels so we avoid sub-pixel jitter
  // when the camera moves with fractional coordinates.
  const offsetX = Math.round(-cam.x * cam.zoom);
  const offsetY = Math.round(-cam.y * cam.zoom);
  ctx.setTransform(cam.zoom, 0, 0, cam.zoom, offsetX, offsetY);
}

// Simple ground renderer with grid
// Now integrated with terrain system - draws ground and mountains together
export function drawGround(ctx: CanvasRenderingContext2D, camera?: Camera, terrainGrid?: TerrainGrid) {
  ctx.save();
  
  // Calculate visible bounds for grid culling
  const tr = (ctx as any).getTransform ? (ctx.getTransform() as DOMMatrix) : null;
  const zoom = tr ? Math.max(0.001, tr.a) : 1;
  
  let startX = 0, endX = WORLD.w, startY = 0, endY = WORLD.h;
  if (camera) {
    const canvasWidth = ctx.canvas.width / zoom;
    const canvasHeight = ctx.canvas.height / zoom;
    startX = Math.max(0, Math.floor(camera.x / T) * T);
    endX = Math.min(WORLD.w, Math.ceil((camera.x + canvasWidth) / T) * T);
    startY = Math.max(0, Math.floor(camera.y / T) * T);
    endY = Math.min(WORLD.h, Math.ceil((camera.y + canvasHeight) / T) * T);
  }
  
  // If we have terrain grid, draw tile-by-tile to respect mountains
  if (terrainGrid) {
    const startGX = Math.floor(startX / T);
    const startGY = Math.floor(startY / T);
    const endGX = Math.ceil(endX / T);
    const endGY = Math.ceil(endY / T);
    
    for (let gy = startGY; gy < endGY; gy++) {
      for (let gx = startGX; gx < endGX; gx++) {
        if (gx < 0 || gy < 0 || gx >= terrainGrid.cols || gy >= terrainGrid.rows) continue;
        
        const idx = gy * terrainGrid.cols + gx;
        const terrainType = getTerrainTypeFromId(terrainGrid.terrain[idx]);
        
        // Skip mountain tiles - they'll be drawn by drawMountains()
        if (terrainType === TerrainType.MOUNTAIN) continue;
        
        // Draw ground tile
        ctx.fillStyle = COLORS.ground;
        ctx.fillRect(gx * T, gy * T, T, T);
      }
    }
  } else {
    // Fallback: draw entire ground as before
    ctx.fillStyle = COLORS.ground;
    ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  }
  
  // High-contrast grid that stays ~1px in screen space
  ctx.lineWidth = Math.max(1 / zoom, 0.75 / zoom);
  
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

// Render mountains and ore deposits
export function drawMountains(ctx: CanvasRenderingContext2D, terrainGrid: TerrainGrid, camera: Camera) {
  if (!terrainGrid) return;

  ctx.save();
  
  // Calculate visible bounds for performance
  const startX = Math.max(0, Math.floor(camera.x / T));
  const startY = Math.max(0, Math.floor(camera.y / T));
  const endX = Math.min(terrainGrid.cols, Math.ceil((camera.x + ctx.canvas.width / camera.zoom) / T) + 1);
  const endY = Math.min(terrainGrid.rows, Math.ceil((camera.y + ctx.canvas.height / camera.zoom) / T) + 1);
  
  // Draw each mountain tile using helper function
  for (let gy = startY; gy < endY; gy++) {
    for (let gx = startX; gx < endX; gx++) {
      const idx = gy * terrainGrid.cols + gx;
      const terrainType = getTerrainTypeFromId(terrainGrid.terrain[idx]);
      
      // Skip non-mountain tiles
      if (terrainType !== TerrainType.MOUNTAIN) continue;
      
      drawMountainTile(ctx, terrainGrid, gx, gy);
    }
  }

  ctx.restore();
}

/**
 * Adjust a hex color by the supplied delta (-1 to 1)
 */
export function adjustColor(hexColor: string, amount: number): string {
  let color = hexColor.trim();
  if (color.startsWith('#')) {
    color = color.slice(1);
  }

  if (color.length === 3) {
    color = color
      .split('')
      .map((c) => c + c)
      .join('');
  }

  const num = parseInt(color, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;

  const clamp = (value: number) => Math.min(255, Math.max(0, value));

  const adjust = (component: number) => {
    const delta = amount >= 0
      ? (255 - component) * amount
      : component * amount;
    return clamp(component + delta);
  };

  r = adjust(r);
  g = adjust(g);
  b = adjust(b);

  const toHex = (value: number) => Math.round(value).toString(16).padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Draw a single mountain tile (helper for both cached and live rendering)
 * @param ctx - Canvas context to draw on
 * @param terrainGrid - Terrain grid containing mountain data
 * @param gx - Grid X coordinate
 * @param gy - Grid Y coordinate
 */
export function drawMountainTile(
  ctx: CanvasRenderingContext2D,
  terrainGrid: TerrainGrid,
  gx: number,
  gy: number
): void {
  const idx = gy * terrainGrid.cols + gx;
  const wx = gx * T;
  const wy = gy * T;
  
  // Check if ore is visible (exposed)
  const isOreVisible = terrainGrid.oreVisible[idx] === 1;
  const oreType = getOreTypeFromId(terrainGrid.ores[idx]);
  
  // Deterministic pseudo random helper for variation per tile
  const rand = (seed: number) => {
    const x = (gx * 73856093) ^ (gy * 19349663) ^ seed;
    const hashed = (x >>> 0) % 10000;
    return hashed / 10000;
  };

  // Draw base mountain color using a gradient for depth
  const baseColor = isOreVisible && oreType !== OreType.NONE
    ? ORE_PROPERTIES[oreType].color
    : '#4b5563';
  const shadowColor = adjustColor(baseColor, -0.35);
  const highlightColor = adjustColor(baseColor, 0.2);

  const gradient = ctx.createLinearGradient(wx, wy + T, wx, wy);
  gradient.addColorStop(0, shadowColor);
  gradient.addColorStop(0.55, baseColor);
  gradient.addColorStop(1, highlightColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(wx, wy, T, T);

  // Create an angular ridge to break up the grid silhouette
  const ridgePeakX = wx + T * (0.35 + rand(1) * 0.3);
  const ridgePeakY = wy + T * (0.15 + rand(2) * 0.1);
  const ridgeBaseLeft = wx + T * (0.1 + rand(3) * 0.1);
  const ridgeBaseRight = wx + T * (0.9 - rand(4) * 0.1);

  ctx.beginPath();
  ctx.moveTo(ridgePeakX, ridgePeakY);
  ctx.lineTo(ridgeBaseLeft, wy + T);
  ctx.lineTo(ridgeBaseRight, wy + T);
  ctx.closePath();
  ctx.fillStyle = shadowColor;
  ctx.globalAlpha = 0.85;
  ctx.fill();

  // Highlighted side of the ridge
  ctx.beginPath();
  const ridgeSplit = wx + T * (0.5 + (rand(5) - 0.5) * 0.2);
  ctx.moveTo(ridgePeakX, ridgePeakY);
  ctx.lineTo(ridgeSplit, wy + T * (0.55 + rand(6) * 0.15));
  ctx.lineTo(ridgeBaseRight, wy + T);
  ctx.closePath();
  ctx.fillStyle = highlightColor;
  ctx.globalAlpha = 0.65;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Subtle edge darkening to anchor the tile without drawing hard grid lines
  ctx.fillStyle = adjustColor(baseColor, -0.45);
  ctx.globalAlpha = 0.6;
  ctx.fillRect(wx, wy + T - 3, T, 3);
  ctx.fillRect(wx, wy, 3, T);
  ctx.globalAlpha = 1;

  // Draw ore veins if visible (overlay organic streaks)
  if (isOreVisible && oreType !== OreType.NONE) {
    const oreProps = ORE_PROPERTIES[oreType];
    const orePrimary = oreProps.color;
    const oreSecondary = oreProps.secondaryColor || adjustColor(orePrimary, 0.25);

    ctx.strokeStyle = orePrimary;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    const veinCount = 2 + Math.floor(rand(7) * 2);
    for (let v = 0; v < veinCount; v++) {
      const startX = wx + T * (0.2 + rand(8 + v) * 0.6);
      const startY = wy + T * (0.2 + rand(12 + v) * 0.4);
      const endX = startX + T * 0.3 * (rand(16 + v) - 0.5);
      const endY = wy + T * (0.75 + rand(20 + v) * 0.2);

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(
        startX + T * 0.15 * (rand(24 + v) - 0.5),
        wy + T * (0.45 + rand(28 + v) * 0.2),
        endX,
        endY
      );
      ctx.stroke();
    }

    // Add small sparkles to emphasise exposed ore without flicker
    ctx.fillStyle = oreSecondary;
    ctx.globalAlpha = 0.7;
    const sparkleCount = 1 + Math.floor(rand(60) * 2);
    for (let s = 0; s < sparkleCount; s++) {
      const sparkleX = wx + T * (0.15 + rand(64 + s) * 0.7);
      const sparkleY = wy + T * (0.25 + rand(68 + s) * 0.6);
      const size = 2 + rand(72 + s) * 2;
      ctx.fillRect(sparkleX, sparkleY, size, size);
    }
    ctx.globalAlpha = 1;
  }
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
    if (b.kind === 'turret') {
      const turretState = (b as any).turretState;
      if (turretState && turretState.flashTimer > 0) {
        // Brighter flash with pulsing effect
        const flashIntensity = Math.min(1, turretState.flashTimer / 0.15);
        const alpha = Math.floor(flashIntensity * 200).toString(16).padStart(2, '0');
        ctx.fillStyle = `#ffaa00${alpha}`; // Orange flash
        ctx.fillRect(b.x, b.y, b.w, b.h);
        
        // Add gun barrel visual (rotated toward target)
        if (turretState.rotation !== undefined) {
          ctx.save();
          const cx = b.x + b.w / 2;
          const cy = b.y + b.h / 2;
          ctx.translate(cx, cy);
          ctx.rotate(turretState.rotation);
          
          // Draw barrel
          ctx.fillStyle = '#666';
          ctx.fillRect(6, -2, 12, 4);
          
          // Draw barrel tip (muzzle)
          ctx.fillStyle = '#333';
          ctx.fillRect(16, -1, 2, 2);
          
          ctx.restore();
        }
      } else if (turretState && turretState.rotation !== undefined) {
        // Draw turret barrel even when not firing
        ctx.save();
        const cx = b.x + b.w / 2;
        const cy = b.y + b.h / 2;
        ctx.translate(cx, cy);
        ctx.rotate(turretState.rotation);
        
        // Draw barrel
        ctx.fillStyle = '#555';
        ctx.fillRect(6, -2, 12, 4);
        
        // Draw barrel tip
        ctx.fillStyle = '#333';
        ctx.fillRect(16, -1, 2, 2);
        
        ctx.restore();
      }
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

  // Stonecutting progress bar for stonecutting_table
  if (b.kind === 'stonecutting_table' && b.done && b.cuttingProgress !== undefined && b.cuttingProgress > 0) {
    ctx.fillStyle = '#0b1220'; 
    ctx.fillRect(b.x, b.y + b.h + 2, b.w, 4);
    ctx.fillStyle = '#708090'; // Slate gray for stonecutting progress
    ctx.fillRect(b.x, b.y + b.h + 2, b.w * b.cuttingProgress, 4);
  }

  // Smelting progress bar for smelter
  if (b.kind === 'smelter' && b.done && b.smeltingProgress !== undefined && b.smeltingProgress > 0) {
    ctx.fillStyle = '#0b1220'; 
    ctx.fillRect(b.x, b.y + b.h + 2, b.w, 4);
    ctx.fillStyle = '#dc2626'; // Hot red for smelting progress
    ctx.fillRect(b.x, b.y + b.h + 2, b.w * b.smeltingProgress, 4);
  }

  // Cooling progress bar for cooling_rack
  if (b.kind === 'cooling_rack' && b.done && b.coolingProgress !== undefined && b.coolingProgress > 0) {
    ctx.fillStyle = '#0b1220'; 
    ctx.fillRect(b.x, b.y + b.h + 2, b.w, 4);
    ctx.fillStyle = '#6366f1'; // Cool blue-purple for cooling progress
    ctx.fillRect(b.x, b.y + b.h + 2, b.w * b.coolingProgress, 4);
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
