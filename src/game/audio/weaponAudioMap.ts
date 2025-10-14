import type { AudioKey } from './AudioManager';

/**
 * Dynamic Weapon Audio System
 * 
 * This system derives audio keys from weapon properties (range, damage type)
 * rather than hardcoded weapon names. This makes it maintainable - you can
 * rename weapons freely without touching this file.
 * 
 * Audio selection strategy:
 * 1. Determine weapon category from range property (ranged vs melee)
 * 2. For ranged: Use generic autopistol fire sound (works for all guns)
 * 3. For melee: Use damage type to pick impact sound (blunt vs sharp)
 * 
 * Adding new weapons requires NO code changes - they automatically
 * get appropriate sounds based on their properties.
 */

export interface WeaponAudioContext {
  weaponRange?: number;      // From ItemDef.range
  damageType?: string;       // From ItemDef.damageType ('blunt', 'cut', etc.)
  weaponCategory?: string;   // From ItemDef.category (optional)
  weaponLabel?: string;      // From ItemDef.label (for debug logging)
}

/**
 * Get the appropriate fire sound for a ranged weapon.
 * 
 * Strategy: All ranged weapons use the same gunfire sound pool.
 * This is intentional - different guns can be distinguished by
 * volume, pitch, or reverb settings rather than completely different sounds.
 * 
 * Future: Could use weapon.damage or weapon.burstCount to vary between
 * autopistol (light) and assault_rifle (heavy) sounds.
 * 
 * @param context Weapon properties (range determines if ranged)
 * @returns Audio key for weapon fire, or null if not a ranged weapon
 */
export function getWeaponFireAudio(context: WeaponAudioContext): AudioKey | null {
  // Only ranged weapons (range > 2 tiles = ~64px) have fire sounds
  if (!context.weaponRange || context.weaponRange <= 2) {
    return null; // Melee weapon, no fire sound
  }
  
  // All ranged weapons use autopistol fire sound
  // This is maintainable - adding new guns requires no code changes
  return 'weapons.ranged.autopistol.fire';
}

/**
 * Get the appropriate impact sound for a melee weapon.
 * 
 * Strategy: Sound is determined by damage type, not weapon name.
 * - 'blunt' damage → club impact sounds (heavy, thudding)
 * - 'cut' damage → sword impact sounds (sharp, slicing)
 * - undefined/other → defaults to club (safer assumption)
 * 
 * This means renaming "Club" to "Mace" or "Knife" to "Dagger"
 * requires NO audio code changes - the damageType property drives it.
 * 
 * @param context Weapon properties (damageType determines sound)
 * @returns Audio key for melee impact sound
 */
export function getMeleeImpactAudio(context: WeaponAudioContext): AudioKey {
  // Use damage type to determine impact sound
  if (context.damageType === 'cut') {
    // Sharp weapons (knives, swords, spears)
    return 'weapons.melee.sword.impact';
  }
  
  // Default to blunt impact for undefined or 'blunt' damage type
  // Safe fallback for any weapon without explicit damage type
  return 'weapons.melee.club.impact';
}

/**
 * Get combat audio for a weapon based on its properties.
 * This is the main entry point - automatically picks fire OR impact sound.
 * 
 * Usage examples:
 * ```typescript
 * // Ranged weapon
 * const audio = getWeaponAudio({ weaponRange: 45 });
 * // Returns: 'weapons.ranged.autopistol.fire'
 * 
 * // Melee weapon with cut damage
 * const audio = getWeaponAudio({ weaponRange: 1, damageType: 'cut' });
 * // Returns: 'weapons.melee.sword.impact'
 * 
 * // Melee weapon with blunt damage
 * const audio = getWeaponAudio({ weaponRange: 1, damageType: 'blunt' });
 * // Returns: 'weapons.melee.club.impact'
 * ```
 * 
 * @param context Weapon properties
 * @returns Audio key for weapon sound (fire or impact)
 */
export function getWeaponAudio(context: WeaponAudioContext): AudioKey | null {
  // Check if ranged weapon (has fire sound)
  const fireAudio = getWeaponFireAudio(context);
  if (fireAudio) return fireAudio;
  
  // Otherwise, melee weapon (has impact sound)
  return getMeleeImpactAudio(context);
}

/**
 * Create weapon audio context from ItemDef.
 * This helper extracts the needed properties from a weapon definition.
 * 
 * @param weaponDef ItemDef from itemDatabase
 * @returns WeaponAudioContext for audio selection
 */
export function getWeaponAudioContext(weaponDef: any): WeaponAudioContext {
  return {
    weaponRange: weaponDef?.range,
    damageType: weaponDef?.damageType,
    weaponCategory: weaponDef?.category,
    weaponLabel: weaponDef?.label
  };
}

/**
 * Convenience function: Get audio from weapon def name.
 * Looks up the weapon in itemDatabase and derives audio from properties.
 * 
 * @param itemDatabase ItemDatabase instance
 * @param weaponDefName Weapon defName (e.g., 'Pistol', 'Club')
 * @param isFiring True for ranged fire, false for melee impact
 * @returns Audio key or null
 */
export function getWeaponAudioByDefName(
  itemDatabase: any,
  weaponDefName: string | undefined,
  isFiring: boolean
): AudioKey | null {
  if (!weaponDefName) {
    // No weapon specified, use defaults
    return isFiring 
      ? 'weapons.ranged.autopistol.fire' 
      : 'weapons.melee.club.impact';
  }
  
  const weaponDef = itemDatabase.getItemDef(weaponDefName);
  if (!weaponDef) {
    // Weapon not found in database, use defaults
    return isFiring 
      ? 'weapons.ranged.autopistol.fire' 
      : 'weapons.melee.club.impact';
  }
  
  const context = getWeaponAudioContext(weaponDef);
  
  if (isFiring) {
    return getWeaponFireAudio(context);
  } else {
    return getMeleeImpactAudio(context);
  }
}

/**
 * MAINTAINABILITY NOTES:
 * 
 * ✅ Adding new weapons: No code changes needed
 *    - New ranged weapon? It gets autopistol fire sound automatically
 *    - New melee weapon? DamageType property determines impact sound
 * 
 * ✅ Renaming weapons: No code changes needed
 *    - Rename 'Pistol' to 'Handgun'? Audio still works
 *    - Rename 'Club' to 'Mace'? Audio still works
 *    - System uses properties, not names
 * 
 * ✅ Changing weapon properties: Automatically picks correct sound
 *    - Change Club's damageType to 'cut'? Gets sword impact sound
 *    - Change Knife's range to 45? Gets autopistol fire sound
 * 
 * ⚙️ Adding new audio variants:
 *    - Add new .ogg files to assets/audio/weapons/
 *    - Register in manifest.ts with existing keys
 *    - No changes needed here!
 * 
 * ⚙️ Adding new weapon categories (future):
 *    - Add new audio key to manifest.ts
 *    - Update getWeaponFireAudio() to check for new category
 *    - Example: Heavy weapons could check weaponDef.damage > 20
 * 
 * 🎯 Design Philosophy:
 *    - Properties over names (data-driven)
 *    - Sensible defaults (always returns valid audio)
 *    - Single source of truth (itemDatabase)
 *    - No brittle string matching
 */
