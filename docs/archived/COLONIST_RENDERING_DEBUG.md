# Colonist Body Rendering Fix - DEBUG GUIDE

## The Problem
The colonist sprite cache (`ColonistSpriteCache`) was caching sprites with the old body type before we fixed the naming. Even though we fixed the constant, the cache still had the old broken sprites.

## The Fix (Applied)

### 1. Fixed sprite height in cache
- Changed `spriteHeight` from 32 to 48 in `RenderCache.ts` to match the actual sprite size

### 2. Clear cache on new game
- Added `colonistSpriteCache.clear()` at the start of `newGame()` in `Game.ts`

### 3. Migration + cache clear
- After migrating colonists from `'Male_Average_Normal'` to `'naked_male'`, we clear the cache

### 4. Added debug logging
- Cache composition logs when sprites are successfully found/missing
- Migration logs how many colonists were updated

## How to Verify the Fix

### Step 1: Hard Reload the Page
Press **Ctrl+Shift+R** (or **Cmd+Shift+R** on Mac) to clear browser cache and reload.

### Step 2: Open Browser Console
Press **F12** and go to the Console tab.

### Step 3: Look for These Messages

**On page load/new game, you should see:**
```
Migrated X colonist(s) to new body type, clearing sprite cache
```

**During gameplay (sampled at 1-5%), you should see:**
```
[Cache] Composed sprite: body=naked_male, apparel=shirt_basic_male, head=male_average_normal, hair=afro, dir=south
```

**You should NOT see:**
```
[Cache] Body sprite not found: body_Male_Average_Normal_east
[Cache] Apparel sprite not found: apparel_shirt_basic_male_east
```

### Step 4: Visual Check
- Colonists should have **full bodies** with clothes, not just floating heads
- You should see 4 sprite layers:
  1. Body (skin-toned)
  2. Clothing (colored shirt)
  3. Head (skin-toned)
  4. Hair (colored)

## If It's Still Not Working

### Check the console for warnings
If you see warnings like:
```
[Cache] Body sprite not found: body_SOMETHING_east
```

This means the sprite lookup is still failing. Check what `SOMETHING` is.

### Manual Cache Clear
Open the browser console and run:
```javascript
// Check current cache state
window.game.colonists[0].profile.avatar.sprites.bodyType

// Should output: "naked_male"
// If it outputs "Male_Average_Normal", the migration didn't run
```

### Force a fresh start
1. Close the browser tab completely
2. Hard reload (Ctrl+Shift+R)
3. Click "New Game" or refresh again
4. Check console for "Migrated X colonist(s)..." message

## Technical Details

The sprite cache key includes the bodyType:
```
{bodyType}-{skinTone}-{apparelType}-{clothing}-{headType}-{hairStyle}-{hairColor}-{direction}
```

If the bodyType was `Male_Average_Normal`, the cache would store a sprite that:
- Failed to find body sprite (because asset is `naked_male`)
- Failed to find apparel sprite (lookup failed)
- Successfully found head sprite
- Successfully found hair sprite

Result: Only head and hair rendered!

Now with `bodyType: 'naked_male'`, all sprite lookups succeed.
