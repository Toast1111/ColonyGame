# Audio System Testing Guide

## Quick Start

### 1. Open Debug Console
Press the **backtick (`)** key to open the debug console.

### 2. Test Building Placement Audio

Run these commands to spawn different building types and hear their unique placement sounds:

```bash
# Housing - Wood construction sounds
spawn house
spawn tent

# Defense - Heavy metal/stone sounds
spawn turret
spawn wall

# Production - Wood/nail sounds
spawn farm
spawn well

# Storage - Saw sounds
spawn stock
spawn warehouse

# Furniture - Light construction
spawn bed
spawn door
spawn stove
spawn pantry

# Flooring - Quick placement
spawn floor_path
spawn floor_stone_road
spawn floor_wooden
```

### 3. Expected Results

Each building type should play a **distinct placement sound**:

| Building | Sound Type | Description |
|----------|------------|-------------|
| House | Wood hammer (pin) | Light wooden tapping |
| Turret | Metal heavy | Drill/jackhammer |
| Farm | Wood nail | Nailing sound |
| Wall | Stone hammer | Heavy stone impact |
| Warehouse | Circular saw | Power tool sound |
| Stove | Metal heavy | Industrial construction |
| Door | Hand saw | Manual sawing |
| Bed | Wood nail | Furniture assembly |
| Floor (stone) | Stone hammer | Rock placement |
| Floor (wood) | Wood sand | Sanding/finishing |

## Detailed Testing

### Test 1: Category Consistency

Buildings in the same category should have similar audio themes:

```bash
# Housing category - All should sound wooden/comfortable
spawn house
spawn tent

# Defense category - All should sound heavy/industrial
spawn turret
spawn wall

# Furniture category - All should sound like light construction
spawn bed
spawn door
spawn stove
spawn pantry
```

**Expected**: Similar audio themes within each category.

### Test 2: Material-Based Audio

Buildings should sound like their primary construction material:

```bash
# Stone-based buildings (heavy impact sounds)
spawn wall
spawn well
spawn floor_stone_road

# Wood-based buildings (saw/hammer sounds)
spawn house
spawn door
spawn warehouse
spawn floor_wooden

# Metal-based buildings (industrial sounds)
spawn turret
spawn stove
```

**Expected**: Audio matches material (stone = impact, wood = saw/hammer, metal = heavy machinery).

### Test 3: Volume Consistency

All placement sounds should have similar volume levels:

```bash
# Test rapid placements
spawn house
spawn turret
spawn farm
spawn wall
spawn warehouse
```

**Expected**: No jarring volume differences between building types.

## Troubleshooting

### No Sound Playing

**Check master volume:**
1. Open browser DevTools (F12)
2. In console, run:
   ```javascript
   game.audioManager.getMasterVolume()
   ```
3. Should return a value between 0 and 1
4. If 0, set volume:
   ```javascript
   game.audioManager.setMasterVolume(0.5)
   ```

**Check mute status:**
```javascript
game.audioManager.isMuted()
```
If `true`, unmute:
```javascript
game.audioManager.setMuted(false)
```

**Check browser autoplay policy:**
- Some browsers block audio until user interaction
- Click anywhere on the canvas first, then test

### Wrong Sound Playing

**Check building audio mapping:**
```javascript
// In browser console
import { getBuildingPlacementAudio } from './src/game/audio/buildingAudioMap'
getBuildingPlacementAudio('house', BUILD_TYPES.house)
```

Should return a valid audio key like `'buildings.placement.confirm'`.

### Audio Key Not Found

**Check manifest:**
1. Open `src/assets/audio/manifest.ts`
2. Search for the audio key (e.g., `'buildings.placement.confirm'`)
3. Verify it exists and has variants

## Performance Testing

### Test Rapid Placement

```bash
# Place many buildings quickly
spawn house 10
spawn turret 5
spawn farm 10
```

**Expected**:
- No audio stuttering
- No memory leaks
- Smooth placement sounds even with rapid spawning

## Advanced Tests

### Test All Building Types

```bash
# Complete building roster
spawn house
spawn farm
spawn turret
spawn wall
spawn stock
spawn tent
spawn warehouse
spawn well
spawn infirmary
spawn floor_path
spawn floor_stone_road
spawn floor_wooden
spawn bed
spawn door
spawn stove
spawn pantry
```

**Expected**: Every single building plays appropriate audio on placement.

### Test Edge Cases

```bash
# Toggle unlimited resources
resources unlimited

# Place building, cancel, place again
spawn house
# (cancel with right-click or X button)
spawn house
```

**Expected**: Audio plays consistently even with placement cancellations.

## Validation Checklist

- [ ] All housing buildings play wooden construction sounds
- [ ] All defense buildings play heavy metal/stone sounds
- [ ] All furniture plays light construction sounds
- [ ] Floor tiles play material-appropriate sounds
- [ ] Volume is consistent across all building types
- [ ] No audio errors in browser console
- [ ] Rapid placement doesn't cause stuttering
- [ ] Placement cancellation doesn't break audio
- [ ] All 20+ building types have audio (none silent)

## Success Criteria

✅ **100% Audio Coverage**: Every building type plays a sound on placement
✅ **Thematic Consistency**: Audio matches building category and materials
✅ **No Hardcoding**: All audio dynamically loaded from buildingAudioMap
✅ **Performance**: No lag or stuttering with rapid placements
✅ **Volume Balance**: All placement sounds normalized to comfortable levels

## Reporting Issues

If you find audio issues:

1. **Which building?** (e.g., "turret")
2. **Expected sound?** (e.g., "metal construction")
3. **Actual result?** (e.g., "no sound" or "wrong sound")
4. **Browser console errors?** (screenshot)
5. **Volume settings?** (master volume, category volumes)

---

**Note**: This testing guide covers placement audio only. Construction loop and completion sounds are planned for future implementation.
