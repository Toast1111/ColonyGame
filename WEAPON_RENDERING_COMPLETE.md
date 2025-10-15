# Weapon Rendering Complete

## Summary

All weapons defined in the item database now render correctly on drafted colonists and colonists in combat. Weapon names have been standardized to match their sprite file names.

## What Changed

### Renamed Weapons in Item Database (`src/data/itemDatabase.ts`)

Weapon `defName` values have been updated to match their sprite file names:
- `Pistol` → `Autopistol`
- `Rifle` → `AssaultRifle`

This creates consistency between the item database and asset files.

### Updated Weapon Mapping (`src/assets/images.ts`)

Simplified the `getWeaponImage()` method since weapon names now match directly:

**Ranged Weapons:**
- `Autopistol` → `weapon_autopistol`
- `AssaultRifle` → `weapon_assault_rifle`
- `SniperRifle` → `weapon_sniper_rifle`
- `SMG` → `weapon_autopistol` (uses Autopistol sprite for smaller weapon appearance)
- `Revolver` → `weapon_revolver`
- `Shotgun` → `weapon_shotgun`

**Melee Weapons:**
- `Club` → `weapon_club`
- `Knife` → `weapon_knife`

### Enhanced Debug Console (`src/game/ui/debugConsole.ts`)

Added support for all weapon types in the `give` command:

**Ranged weapons:** `pistol`, `rifle`, `sniper`, `smg`  
**Melee weapons:** `club`, `knife`

### Updated References Across Codebase

Updated all files that referenced the old weapon names:
- `src/game/colonist_systems/colonistGenerator.ts` - Starting equipment logic
- `src/game/colonist_systems/traits/backgrounds.ts` - Soldier background
- `src/game/combat/pawnCombat.ts` - Combat calculations
- `src/game/test/weaponStatsTest.ts` - Weapon testing
- `src/game/Game.ts` - Starting colonist weapon guarantee

## How It Works

The weapon rendering system is already fully implemented in `src/game/ui/weaponRenderer.ts`. It automatically:

1. **Checks if weapon should be drawn**: Only renders when colonist is drafted or aiming
2. **Gets weapon from inventory**: Reads `colonist.inventory.equipment.weapon`
3. **Looks up weapon sprite**: Uses `ImageAssets.getWeaponImage(defName)` to get the image
4. **Positions and rotates weapon**: 
   - Positions weapon near colonist's hands/chest
   - Rotates to face aim direction
   - Flips vertically when aiming left to prevent upside-down appearance
   - Anchors at grip point (30% from left edge)
5. **Handles melee animations**: Supports swing and stab attack animations with rotation offsets

## Testing

Use the debug console (backtick key) to test:

```bash
# Give colonists different weapons
give pistol all       # Autopistols
give rifle all        # Assault rifles
give sniper all       # Sniper rifles
give smg all          # SMGs
give club all         # Clubs
give knife all        # Knives

# Draft colonists to see weapons
draft all

# Spawn enemies to test combat rendering
toggle enemies
spawn enemy 5
```

## Files Modified

- `src/data/itemDatabase.ts` - Renamed `Pistol` to `Autopistol`, `Rifle` to `AssaultRifle`
- `src/assets/images.ts` - Simplified weapon mapping
- `src/game/ui/debugConsole.ts` - Added all weapon types to `give` command
- `src/game/colonist_systems/colonistGenerator.ts` - Updated weapon references
- `src/game/colonist_systems/traits/backgrounds.ts` - Updated soldier background
- `src/game/combat/pawnCombat.ts` - Updated combat fallback values
- `src/game/test/weaponStatsTest.ts` - Updated test weapon list
- `src/game/Game.ts` - Updated starting weapon guarantee

## Existing Implementation

The following files were already working and didn't need changes:

- `src/game/ui/weaponRenderer.ts` - Weapon rendering logic with melee animations
- `src/game/ui/colonistRenderer.ts` - Calls `drawWeapon()` before UI elements
- Available weapon sprite files:
  - Ranged: AssaultRifle.png, Autopistol.png, Revolver.png, Shotgun.png, SniperRifle.png
  - Melee: Club.png, Knife.png

## Notes

- **Name consistency**: Weapon `defName` values now match their sprite file names exactly
- **SMG sprite**: Currently uses the Autopistol sprite since no dedicated SMG sprite exists. This works well visually as SMGs are typically smaller weapons
- **Weapon positioning**: Weapons appear at chest/hand level with 8px offset from colonist center
- **Rotation behavior**: Weapons automatically flip when aiming left (90° - 270°) to maintain proper orientation
- **Melee animations**: Club and Knife support swing/stab animations during attacks

