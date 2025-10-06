# Floor System - Quick Reference

## 🎯 What Changed
- ❌ **Removed**: Legacy `path` building
- ✅ **Added**: Terrain-based floor system with 3 floor types

## 🎮 Hotkeys

| Key | Floor Type | Cost | Speed Bonus |
|-----|------------|------|-------------|
| `0` | Dirt Path | FREE | 40% faster |
| `9` | Stone Road | 2 stone | 50% faster |
| `8` | Wooden Floor | 3 wood | 35% faster |
| `T` | Toggle terrain debug | - | - |

## 🛠️ How to Build

### Paint Mode (Fastest)
1. Press `0`, `8`, or `9` to select floor type
2. Click and drag to paint paths
3. Release to finish

### Click Mode
1. Select floor type
2. Click individual tiles
3. Each click places one tile

## 📊 Debug Mode

Press `T` to toggle terrain visualization:
- **P** = Dirt Path (gray)
- **R** = Stone Road (dark gray)  
- **W** = Wooden Floor (brown)
- Shows movement costs
- Highlights floor coverage

## 🚀 Performance

- **50x faster** pathfinding (region system)
- **40-50% faster** movement on floors
- **~56 KB** memory for entire floor grid
- **No runtime cost** - pre-computed

## 📁 Key Files

```
src/game/terrain.ts              # Terrain/floor definitions
src/game/terrainDebugRender.ts   # Debug visualization
src/game/buildings.ts             # Floor types (floor_path, etc.)
src/game/placement/placementSystem.ts  # Floor placement logic
src/game/Game.ts                  # Terrain grid init & input
```

## 💡 Tips

1. **Free paths first** - Use dirt paths (key `0`) to map routes
2. **Upgrade to roads** - Replace busy paths with stone roads
3. **Debug to verify** - Press `T` to see floor coverage
4. **Watch AI** - Enemies and colonists prefer faster floors
5. **Strategic placement** - Roads through mud are still slow but better than no road

## 🐛 Troubleshooting

**Floor not showing speed bonus?**
```javascript
// Check terrain synced
console.log(game.grid.cost[idx]); // Should be < 1.0
```

**Can't place floor?**
- Check if floor already exists (shows in debug mode)
- Check if building is in the way
- Check if you have resources

**Pathfinding not using floors?**
```javascript
// Enable debug to see paths
game.debug.colonists = true;  // Show AI paths
game.debug.terrain = true;    // Show floors
```

## 📚 Full Documentation

- `FLOOR_SYSTEM.md` - Complete guide
- `FLOOR_SYSTEM_COMPLETE.md` - Implementation summary
- `TERRAIN_SYSTEM.md` - Architecture details
- `COMPLETE_NAVIGATION_SYSTEM.md` - Full navigation stack

---

**TL;DR**: Press `0` and drag to paint free paths. Press `T` to see them! 🎨
