import { COLORS, T, WORLD } from "./constants";
import type { Building, Bullet, Camera, Message, Particle } from "./types";
import type { TerrainGrid } from "./terrain";
import { getFloorTypeFromId, FloorType, FLOOR_VISUALS } from "./terrain";
import { ImageAssets } from "../assets/images";
import { getColonistMood } from "./colonist_systems/colonistGenerator";
import { drawParticles } from "../core/particles";
import { getDoorOpenAmount } from "./systems/doorSystem";
import { fillRectAlpha } from "../core/RenderOptimizations";
import type { DirtyRectTracker } from "../core/DirtyRectTracker";
import { colonistSpriteCache } from "../core/RenderCache";

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

// Tiny person glyph for UI badges
export function drawPersonIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size = 10, color = COLORS.colonist) {
  ctx.save();
  ctx.translate(x, y);
  // shadow/outline for readability
  const outline = '#0b0f14';
  // head
  const hr = size * 0.32; const hy = -size * 0.3;
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, hy, hr, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, hy, hr + 0.5, 0, Math.PI * 2); ctx.stroke();
  // body (torso)
  const bw = size * 0.55, bh = size * 0.55; const by = -size * 0.05;
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(-bw / 2, by - bh / 2);
  ctx.lineTo(bw / 2, by - bh / 2);
  ctx.lineTo(bw / 2, by + bh / 2);
  ctx.lineTo(-bw / 2, by + bh / 2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = outline; ctx.stroke();
  // legs
  const lw = size * 0.18, lh = size * 0.5, ly = by + bh / 2 + lh * 0.1;
  ctx.fillStyle = color;
  ctx.fillRect(-lw - 0.6, ly - lh, lw, lh);
  ctx.fillRect(0.6, ly - lh, lw, lh);
  ctx.strokeStyle = outline; ctx.strokeRect(-lw - 0.6, ly - lh, lw, lh);
  ctx.strokeRect(0.6, ly - lh, lw, lh);
  ctx.restore();
}

// Enhanced colonist avatar with directional sprite rendering
export function drawColonistAvatar(ctx: CanvasRenderingContext2D, x: number, y: number, colonist: any, size = 8, isSelected = false) {
  const profile = colonist.profile;
  if (!profile) {
    // Fallback to simple circle for colonists without profiles
    ctx.fillStyle = isSelected ? '#93c5fd' : COLORS.colonist;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.save();
  ctx.translate(x, y);
  
  // Determine sprite direction based on movement direction
  let spriteDirection = 'south'; // default facing
  if (colonist.direction !== undefined) {
    const angle = colonist.direction;
    // Convert radians to cardinal direction
    const normalizedAngle = ((angle * 180 / Math.PI) + 360) % 360;
    
    if (normalizedAngle >= 315 || normalizedAngle < 45) {
      spriteDirection = 'east'; // facing right
    } else if (normalizedAngle >= 45 && normalizedAngle < 135) {
      spriteDirection = 'south'; // facing down
    } else if (normalizedAngle >= 135 && normalizedAngle < 225) {
      spriteDirection = 'east'; // facing left (we'll flip the east sprite)
    } else {
      spriteDirection = 'north'; // facing up
    }
  }
  
  const isFlipped = colonist.direction !== undefined && 
    ((colonist.direction * 180 / Math.PI + 360) % 360) >= 135 && 
    ((colonist.direction * 180 / Math.PI + 360) % 360) < 225;
  
  // Apply horizontal flip for west-facing sprites
  if (isFlipped) {
    ctx.scale(-1, 1);
  }
  
  // Fixed sprite sizes - not dependent on colonist collision radius
  const spriteWidth = 32; // Nice wide sprites that look proportional
  const spriteHeight = 48; // 2 tiles tall as requested
  
  // Selection highlight - circle that represents the actual collision area
  if (isSelected) {
    // Use rgba() instead of globalAlpha for better performance
    ctx.fillStyle = 'rgba(147, 197, 253, 0.3)'; // #93c5fd with 0.3 alpha
    ctx.beginPath();
    // Simple circle highlight that matches the collision radius
    ctx.arc(0, 0, size + 2, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Get the image assets instance
  const imageAssets = ImageAssets.getInstance();
  if (!imageAssets || !imageAssets.isLoaded()) {
    // Fallback to simple circle if assets not loaded
    console.log('Assets not loaded, using fallback circles for colonist:', profile?.name || 'unknown');
    ctx.fillStyle = profile.avatar.clothing;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  
  // Draw sprite layers in order: body, apparel, head, hair
  const sprites = profile.avatar.sprites;
  
  // Center the sprite better on the colonist's logical position
  // The sprite should be centered horizontally and the bottom 1/3 should align with the collision point
  const offsetY = spriteHeight * 0.6; // Move sprite up so the bottom portion aligns with colonist center
  
  // Helper function to create a properly tinted sprite using ImageData manipulation
  const createTintedSprite = (sprite: HTMLImageElement, color: string): HTMLCanvasElement => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = spriteWidth;
    tempCanvas.height = spriteHeight;
    const tempCtx = tempCanvas.getContext('2d')!;
    
    // Draw the original white sprite
    tempCtx.drawImage(sprite, 0, 0, spriteWidth, spriteHeight);
    
    // Get the image data to manipulate pixels directly
    const imageData = tempCtx.getImageData(0, 0, spriteWidth, spriteHeight);
    const data = imageData.data;
    
    // Parse the target color
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Tint each pixel
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) { // Only tint non-transparent pixels
        // Convert white pixels to the target color, maintaining brightness
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / (3 * 255);
        data[i] = r * brightness;     // Red
        data[i + 1] = g * brightness; // Green
        data[i + 2] = b * brightness; // Blue
        // Alpha stays the same
      }
    }
    
    // Put the tinted data back
    tempCtx.putImageData(imageData, 0, 0);
    return tempCanvas;
  };
  
  // Try to get cached composed sprite first
  const composedSprite = colonistSpriteCache.getComposedSprite(
    colonist,
    spriteDirection,
    imageAssets,
    createTintedSprite
  );
  
  if (composedSprite) {
    // Use cached composed sprite (single blit instead of 4 layers)
    ctx.drawImage(composedSprite, -spriteWidth/2, -offsetY);
  } else {
    // Fallback to individual layer rendering if cache fails
    // 1. Body (tinted with skin tone)
    const bodySprite = imageAssets.getColonistSprite('body', sprites.bodyType, spriteDirection);
    if (bodySprite) {
      const tintedBody = createTintedSprite(bodySprite, profile.avatar.skinTone);
      ctx.drawImage(tintedBody, -spriteWidth/2, -offsetY);
    } else if (Math.random() < 0.01) {
      console.warn(`Body sprite not found: body_${sprites.bodyType}_${spriteDirection}`);
    }
    
    // 2. Apparel (clothing) - tinted with clothing color
    const apparelSprite = imageAssets.getColonistSprite('apparel', sprites.apparelType, spriteDirection);
    if (apparelSprite) {
      const tintedApparel = createTintedSprite(apparelSprite, profile.avatar.clothing);
      ctx.drawImage(tintedApparel, -spriteWidth/2, -offsetY);
    } else if (Math.random() < 0.01) {
      console.warn(`Apparel sprite not found: apparel_${sprites.apparelType}_${spriteDirection}`);
    }
    
    // 3. Head (tinted with skin tone)
    const headSprite = imageAssets.getColonistSprite('head', sprites.headType, spriteDirection);
    if (headSprite) {
      const tintedHead = createTintedSprite(headSprite, profile.avatar.skinTone);
      ctx.drawImage(tintedHead, -spriteWidth/2, -offsetY);
    }
    
    // 4. Hair (tinted with hair color)
    const hairSprite = imageAssets.getColonistSprite('hair', sprites.hairStyle, spriteDirection);
    if (hairSprite) {
      const tintedHair = createTintedSprite(hairSprite, profile.avatar.hairColor);
      ctx.drawImage(tintedHair, -spriteWidth/2, -offsetY);
    }
  }
  
  // Mood indicator (small colored dot above the head) - not flipped
  ctx.save();
  if (isFlipped) ctx.scale(-1, 1); // Un-flip for UI elements
  
  const mood = getColonistMood && getColonistMood(colonist) || 'Okay';
  
  let moodColor = '#22c55e'; // default happy green
  switch (mood) {
    case 'Happy': moodColor = '#22c55e'; break;
    case 'Content': moodColor = '#84cc16'; break;
    case 'Okay': moodColor = '#eab308'; break;
    case 'Injured': moodColor = '#ef4444'; break;
    case 'Starving': moodColor = '#dc2626'; break;
    case 'Exhausted': moodColor = '#6b7280'; break;
    case 'Terrified': moodColor = '#7c2d12'; break;
    case 'Resting': moodColor = '#3b82f6'; break;
    default: moodColor = '#eab308'; break;
  }
  
  ctx.fillStyle = moodColor;
  ctx.beginPath();
  // Position mood indicator just above the colonist's head
  // Since sprite is offset by 60% upward, the head is at about -offsetY + 10% of sprite height
  ctx.arc(0, -offsetY + spriteHeight * 0.1, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.5;
  ctx.stroke();
  
  // Player command indicator - show exclamation mark for active player commands
  const hasActivePlayerCommand = colonist.playerCommand?.issued && 
                                   colonist.playerCommand.expires && 
                                   (colonist.t || 0) < colonist.playerCommand.expires;
  if (hasActivePlayerCommand) {
    ctx.font = 'bold 14px system-ui';
    ctx.fillStyle = '#fbbf24'; // Amber/yellow for command indicator
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeText('❗', 12, -offsetY + spriteHeight * 0.15);
    ctx.fillText('❗', 12, -offsetY + spriteHeight * 0.15);
  }
  
  // Carrying indicator - show icon if colonist is carrying wheat or bread
  if (colonist.carryingWheat && colonist.carryingWheat > 0) {
    ctx.font = 'bold 12px system-ui';
    ctx.fillText('🌾', 0, -offsetY - 5);
  } else if (colonist.carryingBread && colonist.carryingBread > 0) {
    ctx.font = 'bold 12px system-ui';
    ctx.fillText('🍞', 0, -offsetY - 5);
  }
  
  ctx.restore(); // Restore mood indicator transform
  ctx.restore(); // Restore main transform
}

// Small shield icon, centered at (x,y)
export function drawShieldIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size = 12, color = '#60a5fa') {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = '#0b0f14';
  ctx.lineWidth = 1;
  // Shield path
  ctx.beginPath();
  const w = size, h = size * 1.2;
  ctx.moveTo(0, -h * 0.5);
  ctx.lineTo(w * 0.35, -h * 0.25);
  ctx.lineTo(w * 0.35, h * 0.1);
  ctx.quadraticCurveTo(0, h * 0.55, -w * 0.35, h * 0.1);
  ctx.lineTo(-w * 0.35, -h * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
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
      const leftOffset = -openAmount * (b.w / 2 - 4);
      const rightOffset = openAmount * (b.w / 2 - 4);
      
      // Left panel
      ctx.fillStyle = b.color;
      ctx.fillRect(-b.w / 2 + 3 + leftOffset, -b.h / 2 + 3, (b.w / 2 - 6), b.h - 6);
      ctx.strokeStyle = '#2a1a10';
      ctx.strokeRect(-b.w / 2 + 3 + leftOffset, -b.h / 2 + 3, (b.w / 2 - 6), b.h - 6);
      
      // Right panel
      ctx.fillStyle = b.color;
      ctx.fillRect(3 - rightOffset, -b.h / 2 + 3, (b.w / 2 - 6), b.h - 6);
      ctx.strokeStyle = '#2a1a10';
      ctx.strokeRect(3 - rightOffset, -b.h / 2 + 3, (b.w / 2 - 6), b.h - 6);
      
      // Door details (vertical lines)
      ctx.strokeStyle = '#3a2510';
      ctx.lineWidth = 1;
      for (let i = 1; i < 3; i++) {
        const x1 = -b.w / 2 + 3 + leftOffset + (b.w / 2 - 6) * i / 3;
        const x2 = 3 - rightOffset + (b.w / 2 - 6) * i / 3;
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

export function drawHUD(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, parts: { res: { wood: number; stone: number; food: number; wheat?: number; bread?: number }, colonists: number, cap: number, hiding: number, day: number, tDay: number, isNight: boolean, hotbar: Array<{ key: string; name: string; cost: string; selected: boolean }>, messages: Message[], storage?: { used: number; max: number } }, game: any) {
  const scale = game.uiScale;
  const PAD = game.scale(game.isTouch ? 14 : 10);
  const BARH = game.scale(game.isTouch ? 56 : 44);
  const W = canvas.width;
  
  // Top bar background
  ctx.fillStyle = '#0b122088'; 
  ctx.fillRect(0, 0, W, BARH);
  ctx.strokeStyle = '#1e293b'; 
  ctx.lineWidth = 1; 
  ctx.strokeRect(0, .5, W, BARH);
  
  // Resource bars
  ctx.fillStyle = '#dbeafe'; 
  ctx.font = game.getScaledFont(game.isTouch ? 18 : 16, '600');
  let x = PAD;
  
  const dynamicSpace = Math.max(game.scale(game.isTouch ? 170 : 130), Math.min(game.scale(game.isTouch ? 260 : 220), Math.round(canvas.width * 0.14)));
  pill(ctx, x, game.scale(12), `Wood: ${Math.floor(parts.res.wood)}`, '#b08968', game); x += dynamicSpace;
  pill(ctx, x, game.scale(12), `Stone: ${Math.floor(parts.res.stone)}`, '#9aa5b1', game); x += dynamicSpace;
  pill(ctx, x, game.scale(12), `Food: ${Math.floor(parts.res.food)}`, '#9ae6b4', game); x += dynamicSpace;
  
  // New resources: wheat and bread
  if ((parts.res.wheat || 0) > 0) {
    pill(ctx, x, game.scale(12), `Wheat: ${Math.floor(parts.res.wheat || 0)}`, '#f4d03f', game); x += dynamicSpace;
  }
  if ((parts.res.bread || 0) > 0) {
    pill(ctx, x, game.scale(12), `Bread: ${Math.floor(parts.res.bread || 0)}`, '#d2691e', game); x += dynamicSpace;
  }
  
  // Storage capacity display
  if (parts.storage) {
    const storagePercent = Math.floor(parts.storage.used / parts.storage.max * 100);
    const storageColor = storagePercent > 90 ? '#ef4444' : storagePercent > 70 ? '#eab308' : '#22c55e';
    pill(ctx, x, game.scale(12), `Storage: ${Math.floor(parts.storage.used)}/${parts.storage.max} (${storagePercent}%)`, storageColor, game); 
    x += Math.max(dynamicSpace, game.scale(game.isTouch ? 260 : 200));
  }
  
  const popText = `Colonists: ${parts.colonists}/${parts.cap}`; 
  pill(ctx, x, game.scale(12), popText, '#93c5fd', game); x += Math.max(dynamicSpace, game.scale(game.isTouch ? 260 : 210));
  const hidText = `Hiding: ${parts.hiding}`; 
  pill(ctx, x, game.scale(12), hidText, '#60a5fa', game); x += Math.max(game.scale(game.isTouch ? 180 : 140), dynamicSpace * 0.9 | 0);
  
  // Format time as HH:MM
  const hour = Math.floor(parts.tDay * 24);
  const minute = Math.floor((parts.tDay * 24 - hour) * 60);
  const timeText = `Day ${parts.day} — ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${parts.isNight ? '🌙' : '☀️'}`;
  pill(ctx, x, game.scale(12), timeText, parts.isNight ? '#ffd166' : '#6ee7ff', game);
  
  // Hotbar
  const hbY = canvas.height - game.scale(game.isTouch ? 86 : 64); 
  const hbItemW = Math.max(game.scale(game.isTouch ? 170 : 140), Math.min(game.scale(game.isTouch ? 260 : 220), (canvas.width - PAD * 2) / parts.hotbar.length));
  x = PAD;
  
  ctx.fillStyle = '#0b122088'; 
  ctx.fillRect(0, hbY, canvas.width, game.scale(game.isTouch ? 86 : 64));
  ctx.strokeStyle = '#1e293b'; 
  ctx.strokeRect(0, hbY + .5, canvas.width, game.scale(game.isTouch ? 86 : 64));
  ctx.font = game.getScaledFont(game.isTouch ? 17 : 15);
  
  for (let i = 0; i < parts.hotbar.length; i++) {
    const h = parts.hotbar[i];
    const rx = x + game.scale(2);
    const ry = hbY + game.scale(game.isTouch ? 14 : 10);
    const rw = hbItemW - game.scale(6);
    const rh = game.scale(game.isTouch ? 60 : 44);
    drawHot(ctx, rx, ry, rw, rh, `${i + 1}. ${h.name}`, h.cost, h.selected, game);
    // Record rect for click/tap detection
    if (Array.isArray(game.hotbarRects)) {
      game.hotbarRects[i] = { index: i, x: rx, y: ry, w: rw, h: rh };
    }
    x += hbItemW;
  }
  
  // Messages - responsive positioning
  let my = BARH + game.scale(game.isTouch ? 12 : 8);
  const msgWidth = Math.min(game.scale(game.isTouch ? 520 : 420), canvas.width - PAD * 2);
  for (let i = parts.messages.length - 1; i >= 0; i--) { 
    const m = parts.messages[i]; 
    drawMsg(ctx, W - msgWidth - PAD, my, m.text, msgWidth, game); 
    my += game.scale(game.isTouch ? 34 : 26); 
  }
}

function pill(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string, game: any) {
  const w = ctx.measureText(text).width + game.scale(game.isTouch ? 28 : 24); 
  const h = game.scale(game.isTouch ? 32 : 26);
  ctx.fillStyle = '#0f172a'; 
  ctx.fillRect(x, y, w, h); 
  ctx.strokeStyle = '#1e293b'; 
  ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
  ctx.fillStyle = color; 
  ctx.fillRect(x + game.scale(3), y + game.scale(3), game.scale(game.isTouch ? 10 : 8), h - game.scale(6));
  ctx.fillStyle = '#dbeafe'; 
  ctx.fillText(text, x + game.scale(game.isTouch ? 18 : 16), y + game.scale(game.isTouch ? 22 : 18));
}

function drawHot(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string, cost: string, selected: boolean, game: any) {
  ctx.fillStyle = selected ? '#102034' : '#0f172a'; 
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = selected ? '#4b9fff' : '#1e293b'; 
  ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
  ctx.fillStyle = '#dbeafe'; 
  ctx.fillText(label, x + game.scale(10), y + game.scale(game.isTouch ? 36 : 28));
  ctx.fillStyle = '#9fb3c8'; 
  ctx.fillText(cost, x + w - game.scale(game.isTouch ? 66 : 56), y + game.scale(game.isTouch ? 36 : 28));
}

function drawMsg(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, width: number, game: any) {
  const h = game.scale(game.isTouch ? 30 : 24);
  ctx.fillStyle = '#0f172aee'; 
  ctx.fillRect(x, y, width, h);
  ctx.strokeStyle = '#1e293b'; 
  ctx.strokeRect(x + .5, y + .5, width - 1, h - 1);
  ctx.fillStyle = '#dbeafe'; 
  ctx.fillText(text, x + game.scale(10), y + game.scale(game.isTouch ? 20 : 16));
}
