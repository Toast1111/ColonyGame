# HUD Module Quick Reference

## File Locations

All HUD elements are now in: **`src/game/ui/hud/`**

```
src/game/ui/hud/
├── index.ts       - Main entry point
├── topBar.ts      - Resources & info bar
├── hotbar.ts      - Building selection (1-9)
└── messages.ts    - Toast notifications
```

## Quick Edit Guide

### To Modify Resources Display (Top Bar)
**File**: `src/game/ui/hud/topBar.ts`

Add new resource pill:
```typescript
// Around line 60
drawPill(ctx, x, game.scale(12), `Metal: ${Math.floor(data.res.metal)}`, '#silver', game);
x += dynamicSpace;
```

### To Modify Hotbar (Bottom Ribbon)
**File**: `src/game/ui/hud/hotbar.ts`

Change hotbar appearance:
```typescript
// Line 75 - drawHotbarSlot function
ctx.fillStyle = selected ? '#YOUR_COLOR' : '#0f172a';
```

### To Modify Toast Messages
**File**: `src/game/ui/hud/messages.ts`

Change message styling:
```typescript
// Line 35 - drawMessage function
ctx.fillStyle = '#YOUR_BACKGROUND_COLOR';
```

### To Add New HUD Element
1. Create new file: `src/game/ui/hud/newElement.ts`
2. Export a `drawNewElement()` function
3. Import in `src/game/ui/hud/index.ts`
4. Call in `drawHUD()` function

## What Controls the Hotbar Number Keys?

**Rendering**: `src/game/ui/hud/hotbar.ts`
**Input Handling**: `src/game/Game.ts` line 2070
**Building List**: `src/game/managers/UIManager.ts` line 20

To change which buildings appear in hotbar:
```typescript
// src/game/managers/UIManager.ts
hotbar: Array<keyof typeof BUILD_TYPES> = [
  'house',    // Key 1
  'farm',     // Key 2
  'turret',   // Key 3
  // ... add more here
];
```

## Common Tasks

### Change Hotbar Size
`src/game/ui/hud/hotbar.ts` line 25-27

### Change Top Bar Height
`src/game/ui/hud/topBar.ts` line 30

### Add Storage Warning
`src/game/ui/hud/topBar.ts` line 79-86 (already has storage meter)

### Reposition Messages
`src/game/ui/hud/messages.ts` line 14-17

## Testing Checklist

After modifying HUD:
- [ ] Run `npm run build` - should pass
- [ ] Check no TypeScript errors
- [ ] Launch game visually
- [ ] Test number keys 1-9
- [ ] Test hotbar clicking
- [ ] Verify resources update
- [ ] Check toast messages appear
