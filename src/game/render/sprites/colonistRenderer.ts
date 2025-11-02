/**
 * Colonist Rendering Module
 * 
 * Handles visual representation of colonists including:
 * - Sprite composition and layering
 * - Directional sprites
 * - Mood indicators
 * - Status icons (carrying items, player commands)
 * - Selection highlighting
 */

import { COLORS } from "../../constants";
import { ImageAssets } from "../../../assets/images";
import { getColonistMood } from "../../colonist_systems/colonistGenerator";
import { colonistSpriteCache } from "../../../core/RenderCache";
import { drawWeapon } from "./weaponRenderer";

/**
 * Draw progress bar for resource gathering activities (chopping trees, mining rocks/mountains)
 */
function drawResourceGatheringProgress(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colonist: any
): void {
  if (!colonist.target || colonist.target.hp === undefined) return;
  
  // Determine initial HP based on target type
  let initialHp = 0;
  if (colonist.target.type === 'tree') {
    initialHp = 40; // Trees start with 40 HP
  } else if (colonist.target.type === 'rock') {
    initialHp = 50; // Rocks start with 50 HP
  } else if (colonist.target.isMountain) {
    // Mountain tiles have variable HP based on ore type (70-120 HP)
    // If we have the maxHp stored, use it; otherwise estimate based on current HP
    initialHp = colonist.target.maxHp || Math.max(70, colonist.target.hp + 30);
  } else {
    return; // Unknown target type
  }
  
  // Calculate progress (0 to 1)
  const currentHp = colonist.target.hp;
  const progress = Math.max(0, Math.min(1, (initialHp - currentHp) / initialHp));
  
  // Only show progress bar if there's meaningful progress (> 2% damage dealt)
  if (progress < 0.02) return;
  
  // Progress bar dimensions
  const barWidth = 24;
  const barHeight = 4;
  const barY = y + 20; // Position below colonist
  
  // Background border
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(x - barWidth/2 - 1, barY - 1, barWidth + 2, barHeight + 2);
  
  // Background bar
  ctx.fillStyle = 'rgba(60, 60, 60, 0.9)';
  ctx.fillRect(x - barWidth/2, barY, barWidth, barHeight);
  
  // Progress fill - different colors based on activity
  let progressColor = '#84cc16'; // Lime green for chopping (default)
  if (colonist.state === 'mine') {
    progressColor = '#f59e0b'; // Amber for mining
  }
  
  ctx.fillStyle = progressColor;
  ctx.fillRect(x - barWidth/2, barY, barWidth * progress, barHeight);
}

/**
 * Enhanced colonist avatar with directional sprite rendering
 * Renders the full colonist with body, clothing, head, hair, and status indicators
 */
export function drawColonistAvatar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colonist: any,
  size = 8,
  isSelected = false
) {
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
    // Skip apparel rendering if it's a body type (naked_male) instead of actual apparel
    if (sprites.apparelType && sprites.apparelType !== 'naked_male') {
      const apparelSprite = imageAssets.getColonistSprite('apparel', sprites.apparelType, spriteDirection);
      if (apparelSprite) {
        const tintedApparel = createTintedSprite(apparelSprite, profile.avatar.clothing);
        ctx.drawImage(tintedApparel, -spriteWidth/2, -offsetY);
      } else if (Math.random() < 0.01) {
        console.warn(`Apparel sprite not found: apparel_${sprites.apparelType}_${spriteDirection}`);
      }
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
  
  // WEAPON RENDERING - Draw weapon before UI elements so it appears behind colonist
  // This makes the weapon look like it's being held by the colonist
  ctx.save();
  if (isFlipped) ctx.scale(-1, 1); // Un-flip for weapon so rotation works correctly
  drawWeapon(ctx, colonist, offsetY, isFlipped);
  ctx.restore();
  
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
  
  // Resource gathering progress bar (chopping, mining) - drawn in world coordinates
  if ((colonist.state === 'chop' || colonist.state === 'mine') && colonist.target) {
    // We need to draw this in world coordinates, so we need to transform back
    // The progress bar function expects screen coordinates (x, y params)
    // but we're currently in colonist-relative coordinates due to ctx.translate(x, y)
    drawResourceGatheringProgress(ctx, 0, offsetY, colonist);
  }
  
  // Carrying indicator - show icon if colonist is carrying something
  if (colonist.carryingWheat && colonist.carryingWheat > 0) {
    ctx.font = 'bold 12px system-ui';
    ctx.fillText('🌾', 0, -offsetY - 5);
  } else if (colonist.carryingBread && colonist.carryingBread > 0) {
    ctx.font = 'bold 12px system-ui';
    ctx.fillText('🍞', 0, -offsetY - 5);
  } else if ((colonist as any).carryingItem && (colonist as any).carryingItem.qty > 0) {
    // Generic package icon for hauled floor items
    ctx.font = 'bold 12px system-ui';
    ctx.fillText('📦', 0, -offsetY - 5);
  }
  
  ctx.restore(); // Restore mood indicator transform
  ctx.restore(); // Restore main transform
}
