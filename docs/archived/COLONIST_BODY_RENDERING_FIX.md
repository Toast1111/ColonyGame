# Colonist Body Rendering Fix

## Issue
Colonists were only rendering their head and hair sprites, not their body or clothing. This made them appear as floating heads.

## Root Cause
The `BODY_TYPES` constant in `src/game/colonist_systems/traits/appearance.ts` was using `'Male_Average_Normal'` as the body type identifier, but the actual sprite assets in `src/assets/images.ts` were loaded with the key `'naked_male'`.

This mismatch caused the sprite lookup to fail:
- **Expected lookup**: `body_Male_Average_Normal_east`
- **Actual asset key**: `body_naked_male_east`

Since the body sprite lookup failed, only the head and hair sprites (which had matching keys) were rendered.

## Solution

### 1. Fixed Body Type Constant
**File**: `src/game/colonist_systems/traits/appearance.ts`

Changed the `BODY_TYPES` array to match the actual asset naming:

```typescript
// Before
export const BODY_TYPES = [
  'Male_Average_Normal'  // Can be expanded with more body types
];

// After
export const BODY_TYPES = [
  'naked_male'  // Must match the sprite asset naming in images.ts
];
```

### 2. Added Debug Logging
**File**: `src/game/render.ts`

Added warning messages when sprite lookups fail (sampled at 1% to avoid spam):

```typescript
if (bodySprite) {
  const tintedBody = createTintedSprite(bodySprite, profile.avatar.skinTone);
  ctx.drawImage(tintedBody, -spriteWidth/2, -offsetY);
} else if (Math.random() < 0.01) {
  console.warn(`Body sprite not found: body_${sprites.bodyType}_${spriteDirection}`);
}
```

This helps diagnose similar issues in the future.

### 3. Added Migration Code
**File**: `src/game/Game.ts`

Added a fix-up migration in `newGame()` to handle any existing colonists with the old naming:

```typescript
// Fix up any colonists with old body type naming (migration)
for (const c of this.colonists) {
  if (c.profile?.avatar?.sprites?.bodyType === 'Male_Average_Normal') {
    c.profile.avatar.sprites.bodyType = 'naked_male';
  }
}
```

## Verification

After these changes:
1. New colonists will be generated with the correct `bodyType: 'naked_male'`
2. The sprite lookup will succeed: `body_naked_male_east`, `body_naked_male_south`, `body_naked_male_north`
3. All four sprite layers will render correctly:
   - Body (tinted with skin tone)
   - Apparel/clothing (tinted with clothing color)
   - Head (tinted with skin tone)
   - Hair (tinted with hair color)

## Asset Naming Convention

For future sprite additions, ensure consistency between:
- **Appearance trait constants** (`BODY_TYPES`, `HAIR_STYLES`, etc.)
- **Asset loader keys** in `ImageAssets.getColonistSprite()`
- **Actual file imports** in `src/assets/images.ts`

The naming pattern is:
```
{component}_{variant}_{direction}
```

Examples:
- `body_naked_male_east`
- `hair_afro_south`
- `apparel_shirt_basic_male_north`
- `head_male_average_normal_east`

## Related Files
- `src/game/colonist_systems/traits/appearance.ts` - Appearance trait definitions
- `src/assets/images.ts` - Asset loading and sprite management
- `src/game/render.ts` - Colonist rendering with sprite composition
- `src/game/Game.ts` - Game initialization and colonist spawning
- `src/core/RenderCache.ts` - Colonist sprite caching system
