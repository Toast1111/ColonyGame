/**
 * Weapon Rendering System
 * 
 * Renders weapons on colonists when they are:
 * - Drafted for combat
 * - Actively aiming at an enemy
 * 
 * Weapons rotate to face the aim direction and are positioned
 * relative to the colonist's body.
 */

import { ImageAssets } from "../../assets/images";
import type { Colonist } from "../types";

/**
 * Calculate animation transforms for melee attacks
 * Returns { rotationOffset, positionOffsetX, positionOffsetY, scale }
 * 
 * @param attackType Type of attack (swing or stab)
 * @param progress Animation progress (0-1)
 */
function getMeleeAnimationTransform(
  attackType: 'swing' | 'stab',
  progress: number
): { rotationOffset: number; positionOffsetX: number; positionOffsetY: number; scale: number } {
  // Use easeInOut for smoother animation
  const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  const easedProgress = easeInOut(progress);
  
  if (attackType === 'swing') {
    // Swing arc: weapon arcs from back to front
    // 0.0: pulled back (-60°)
    // 0.5: at target (0°)
    // 1.0: follow-through (+30°)
    const startAngle = -Math.PI / 3; // -60° (back)
    const endAngle = Math.PI / 6;     // +30° (forward)
    const rotationOffset = startAngle + (endAngle - startAngle) * easedProgress;
    
    // Slight forward motion during swing
    const positionOffsetX = easedProgress * 4;
    const positionOffsetY = Math.sin(easedProgress * Math.PI) * -2; // Slight arc upward
    
    return { rotationOffset, positionOffsetX, positionOffsetY, scale: 1.0 };
  } else {
    // Stab: weapon extends forward and retracts
    // 0.0: ready position
    // 0.3: fully extended
    // 1.0: returned to ready
    let extension = 0;
    if (progress < 0.3) {
      // Quick extension
      extension = easeInOut(progress / 0.3);
    } else {
      // Slower retraction
      extension = 1 - easeInOut((progress - 0.3) / 0.7);
    }
    
    const positionOffsetX = extension * 12; // Extend 12 pixels forward
    const positionOffsetY = 0;
    
    // Slight rotation during stab for more dynamic feel
    const rotationOffset = Math.sin(extension * Math.PI) * 0.1; // 5.7° wobble
    
    return { rotationOffset, positionOffsetX, positionOffsetY, scale: 1.0 };
  }
}

/**
 * Draw a weapon on a colonist, rotated to face their aim direction
 * 
 * @param ctx Canvas rendering context
 * @param colonist The colonist to draw the weapon for
 * @param offsetY Vertical offset for sprite positioning (from colonistRenderer)
 * @param isFlipped Whether the colonist sprite is horizontally flipped
 */
export function drawWeapon(
  ctx: CanvasRenderingContext2D,
  colonist: Colonist,
  offsetY: number = 28.8, // Default 60% of 48px sprite height
  isFlipped: boolean = false
) {
  // Only draw weapon if colonist is aiming or drafted
  if (!colonist.isAiming && !colonist.isDrafted) {
    return;
  }

  // Check if colonist has a weapon equipped
  const weapon = colonist.inventory?.equipment?.weapon;
  if (!weapon || !weapon.defName) {
    return;
  }

  // Get weapon image from assets
  const imageAssets = ImageAssets.getInstance();
  const weaponImage = imageAssets.getWeaponImage(weapon.defName);
  
  if (!weaponImage) {
    // Weapon image not found, skip rendering
    return;
  }

  ctx.save();
  
  // Get aim angle (default to facing right if no aim target)
  let aimAngle = colonist.aimAngle ?? 0;
  
  // Check if melee attack animation is active
  const isMeleeAnimating = colonist.meleeAttackProgress !== undefined && 
                           colonist.meleeAttackProgress < 1 &&
                           colonist.meleeAttackType !== null;
  
  let animationTransform = { rotationOffset: 0, positionOffsetX: 0, positionOffsetY: 0, scale: 1.0 };
  if (isMeleeAnimating && colonist.meleeAttackType) {
    animationTransform = getMeleeAnimationTransform(
      colonist.meleeAttackType,
      colonist.meleeAttackProgress ?? 0
    );
  }
  
  // Weapon positioning relative to colonist center
  // Weapons should appear near the hands/center of the body
  const weaponOffsetFromCenter = 8; // Distance from colonist center
  const weaponX = weaponOffsetFromCenter + animationTransform.positionOffsetX;
  const weaponY = -offsetY + 24 + animationTransform.positionOffsetY; // Position at roughly chest/hand level
  
  // Move to weapon position
  ctx.translate(weaponX, weaponY);
  
  // Rotate to aim angle + animation offset
  ctx.rotate(aimAngle + animationTransform.rotationOffset);
  
  // Flip weapon vertically if aiming to the left (angle between 90° and 270°)
  const angleInDegrees = (aimAngle * 180 / Math.PI + 360) % 360;
  const shouldFlipWeapon = angleInDegrees > 90 && angleInDegrees < 270;
  
  if (shouldFlipWeapon) {
    // Flip weapon vertically when aiming left to prevent upside-down appearance
    ctx.scale(1, -1);
  }
  
  // Draw weapon image
  // Weapons are anchored at their grip point (roughly 1/3 from the left for rifles)
  const weaponWidth = 32; // Standard weapon sprite width
  const weaponHeight = 16; // Standard weapon sprite height
  const gripOffsetX = weaponWidth * 0.3; // Grip point at 30% from left
  
  ctx.drawImage(
    weaponImage,
    -gripOffsetX,              // Anchor at grip point
    -weaponHeight / 2,         // Center vertically
    weaponWidth,
    weaponHeight
  );
  
  ctx.restore();
}

/**
 * Helper function to determine if a weapon is melee or ranged
 * Used to adjust rendering position (melee weapons held differently)
 */
export function isMeleeWeapon(weaponDefName: string): boolean {
  const meleeWeapons = ['Club', 'Knife', 'Spear', 'Sword', 'Mace'];
  return meleeWeapons.includes(weaponDefName);
}

/**
 * Get weapon sprite dimensions from the actual image
 * Falls back to standard dimensions if image not available
 */
export function getWeaponDimensions(weaponDefName: string): { width: number; height: number } {
  const imageAssets = ImageAssets.getInstance();
  const weaponImage = imageAssets.getWeaponImage(weaponDefName);
  
  if (weaponImage && weaponImage.complete) {
    return {
      width: weaponImage.naturalWidth,
      height: weaponImage.naturalHeight
    };
  }
  
  // Default dimensions for weapons
  return {
    width: 32,
    height: 16
  };
}
