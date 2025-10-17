# Weapon Rendering System

## Overview

The weapon rendering system displays equipped weapons on colonists when they are drafted or actively engaging in combat. Weapons automatically rotate to face the colonist's aim direction, providing visual feedback for combat situations.

## Features

- **Automatic Display**: Weapons appear when colonists are:
  - Drafted for combat (`isDrafted = true`)
  - Actively aiming at an enemy (`isAiming = true`)
  
- **Dynamic Rotation**: Weapons rotate smoothly to face the colonist's aim target
- **Proper Positioning**: Weapons are positioned at hand/chest level and anchored at the grip point
- **Flip Handling**: Weapons automatically flip to prevent upside-down appearance when aiming left

## Architecture

### Components

1. **Asset Loading** (`src/assets/images.ts`)
   - Imports weapon PNG assets from `src/assets/things/item/equipment/weapon-ranged/` and `weapon-melee/`
   - Available weapons: AssaultRifle, Autopistol, Revolver, Shotgun, SniperRifle, Club, Knife
   - `getWeaponImage(defName)` method retrieves weapon sprites

2. **Colonist Type Extensions** (`src/game/types.ts`)
   - `aimTarget: { x, y } | null` - Current aim point (enemy position)
   - `aimAngle: number` - Angle in radians the colonist is aiming
   - `isAiming: boolean` - True if actively aiming or drafted

3. **Combat System Integration** (`src/game/combat/pawnCombat.ts`)
   - `updateColonistCombat()` sets aim data when colonists acquire targets
   - Aim tracking updates every frame during combat
   - Clears aim data when exiting combat

4. **Weapon Renderer** (`src/game/ui/weaponRenderer.ts`)
   - `drawWeapon()` - Main rendering function
   - Handles weapon positioning, rotation, and flipping
   - Anchors weapons at grip point (30% from left for rifles)

5. **Colonist Renderer Integration** (`src/game/ui/colonistRenderer.ts`)
   - `drawColonistAvatar()` calls `drawWeapon()` after drawing sprite layers
   - Weapons render between colonist body and UI elements

## Weapon Positioning

- **Offset from Center**: 8 pixels from colonist center
- **Vertical Position**: Chest/hand level (adjusted by sprite offsetY)
- **Grip Point**: 30% from left edge of weapon sprite (for rifles)
- **Rotation**: Follows `aimAngle` in radians

## Technical Details

### Weapon Flip Logic
```typescript
const angleInDegrees = (aimAngle * 180 / Math.PI + 360) % 360;
const shouldFlipWeapon = angleInDegrees > 90 && angleInDegrees < 270;
```

When aiming left (90°-270°), weapons are flipped vertically to prevent upside-down appearance.

### Asset Naming Convention
- Asset files: `AssaultRifle.png`, `Autopistol.png`, etc.
- Internal names: `weapon_assault_rifle`, `weapon_autopistol`, etc.
- DefName in inventory: `AssaultRifle`, `Autopistol`, etc.

### Standard Dimensions
- Default weapon width: 32px
- Default weapon height: 16px
- Sprites can use actual dimensions if loaded

## Usage

### Adding New Weapons

1. **Add Asset File**
   ```bash
   src/assets/things/item/equipment/weapon-ranged/NewWeapon.png
   ```

2. **Import in images.ts**
   ```typescript
   import NewWeapon from './things/item/equipment/weapon-ranged/NewWeapon.png';
   ```

3. **Add to Asset Loading**
   ```typescript
   const weaponAssets = [
     { name: 'weapon_new_weapon', path: NewWeapon },
     // ...
   ];
   ```

4. **Update Weapon Map**
   ```typescript
   getWeaponImage(defName: string): HTMLImageElement | null {
     const weaponMap: Record<string, string> = {
       'NewWeapon': 'weapon_new_weapon',
       // ...
     };
   }
   ```

### Testing Weapons

1. **Draft a colonist** - Press 'R' key or click draft button
2. **Equip a weapon** - Ensure colonist has weapon in inventory
3. **Engage enemy** - Colonist will display weapon when aiming
4. **Check rotation** - Weapon should rotate to face target

## Known Limitations

- Weapons only display for colonists with profiles (generated colonists)
- Fallback colonists (simple circles) do not display weapons
- Weapon sprites should be designed horizontal (pointing right) in source files
- Melee weapons currently use same positioning as ranged (future: adjust for melee stance)

## Future Enhancements

- [ ] Different positioning for melee vs ranged weapons
- [ ] Animation for weapon recoil when firing
- [ ] Weapon muzzle flash effects attached to weapon sprite
- [ ] Support for dual-wielding or shields
- [ ] Idle weapon position when drafted but not aiming
- [ ] Holstered weapon display when not in combat

## RimWorld Inspiration

This system follows RimWorld's approach where:
- Weapons are always visible on drafted pawns
- Weapon orientation updates in real-time during combat
- Visual feedback helps players understand combat state
- Weapons are positioned relative to pawn body center
