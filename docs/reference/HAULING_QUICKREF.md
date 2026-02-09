# Hauling System Quick Reference

**TL;DR:** Colonists now automatically haul chopped/mined resources to stockpile zones near HQ.

---

## What Changed

### Before Fix
- ❌ Colonists chopped trees and mined rocks
- ❌ Resources dropped on ground as floor items
- ❌ Nobody hauled anything → floor items piled up everywhere
- ❌ Resources spawned 6-7 tiles from HQ (far!)

### After Fix
- ✅ 3 automatic stockpile zones created near HQ on new game
- ✅ Colonists automatically haul harvested resources to stockpiles
- ✅ Resources spawn 4 tiles from HQ (33-43% closer)
- ✅ Resources added to HUD counter when delivered to stockpiles

---

## Initial Stockpile Layout

```
        Materials (3x3)
        [wood, stone]
             │
             ▼
    General ──► HQ ──► Food (2x2)
     (4x4)    Center    [food, wheat, bread]
   [all items]
```

**Distances from HQ:**
- Materials: 3 tiles northeast (96px)
- General: 5 tiles northwest (160px)
- Food: 3 tiles southeast (96px)

---

## Resource Flow Diagram

```
1. HARVEST                   2. HAUL                    3. CREDIT
┌─────────────┐           ┌─────────────┐           ┌─────────────┐
│ Chop tree   │──drops──►│ Floor items │──carry──►│ Stockpile   │
│ Mine rock   │           │ on ground   │           │ zone        │
└─────────────┘           └─────────────┘           └──────┬──────┘
                                                            │
                                                    game.addResource()
                                                            │
                                                            ▼
                          4. BUILD                  ┌─────────────┐
                      ┌─────────────┐              │  game.RES   │
                      │ Construction│◄──subtracts──│ (HUD counter)│
                      │ completes   │              └─────────────┘
                      └─────────────┘              
```

---

## How It Works

### Automatic Hauling Cycle

1. **Harvest:** Colonist chops tree → drops 6 wood at tree location
2. **Detect:** `FloorHaulingWorkGiver` scans for items outside stockpiles
3. **Assign:** Finds wood pile, assigns hauling job to idle colonist
4. **Transport:** Colonist walks to wood, picks up (up to 20 units)
5. **Deliver:** Carries to Materials stockpile zone
6. **Drop:** Drops wood on floor inside stockpile
7. **Credit:** `game.addResource('wood', 6)` adds to HUD counter

### Work Priority

Colonists prioritize hauling based on work priority settings:
- **Hauling** is priority 3 (medium) by default
- Construction and doctoring are higher priority
- Can be customized via Work Priority panel

### Item Categories

**Materials Zone** (wood, stone):
- Chopped wood from trees
- Mined stone from rocks
- Used for construction

**Food Zone** (food, wheat, bread):
- Harvested food from farms
- Wheat from wheat fields
- Bread from stove

**General Zone** (all items):
- Fallback for uncategorized items
- Can store anything
- Acts as overflow storage

---

## Player Controls

### Creating Custom Stockpiles

1. Click "Stockpile" in build menu
2. Click and drag to define zone area
3. Click zone to open settings
4. Select allowed items (or "Allow All")

### Adjusting Priorities

Open Work Priority panel:
- Set hauling priority per colonist (0-4)
- 0 = disabled, 1 = low, 4 = critical
- Colonists do higher priority work first

### Manual Hauling

Right-click floor item → "Haul to stockpile"
- Forces immediate hauling job
- Bypasses work priority
- Good for urgent situations

---

## Debug Commands

```bash
# Toggle enemy spawns for peaceful testing
toggle enemies

# Speed up time to watch hauling
speed 3

# Add colonists to speed up hauling
spawn colonist 2

# Give unlimited resources (bypass hauling)
resources unlimited
```

---

## Common Issues

### "Colonists won't haul my items!"

**Check:**
1. Is there a stockpile zone that accepts this item type?
2. Is the item inside a stockpile already? (Won't haul if already "home")
3. Is hauling enabled for this colonist? (Check work priorities)
4. Are all colonists busy with higher priority work?

### "Resources pile up outside stockpiles"

**Solutions:**
1. Create more stockpile zones
2. Increase hauling priority
3. Add more colonists
4. Expand existing stockpile zones

### "HUD counter doesn't match floor items"

**This is correct!**
- Floor items = physical items on ground
- HUD counter = resources available for construction
- Resources only enter HUD counter when hauled to valid stockpiles
- Items outside stockpiles aren't counted (not "available" yet)

---

## Tips & Tricks

### Efficient Base Layout

Place stockpiles near:
- **Materials:** Near HQ/construction area
- **Food:** Near kitchen/stove
- **General:** Central location for everything else

### Hauling Speed

Speed up hauling by:
- Creating stockpiles closer to resource spawns
- Using multiple smaller zones instead of one huge zone
- Increasing colonist movement speed (equipment/skills)

### Resource Management

Keep an eye on:
- Floor item count (items waiting to be hauled)
- HUD counter (resources ready for construction)
- Stockpile capacity (expand zones if full)

---

## Related Systems

- **FloorHaulingWorkGiver:** Scans for items needing hauling
- **ItemManager:** Tracks floor items and stockpile zones
- **Work Priority System:** Determines which colonist hauls what
- **Building System:** Consumes resources from HUD counter

---

## Testing Your Game

After updating:

1. ✅ Start new game
2. ✅ Verify 3 green stockpile zones appear near HQ
3. ✅ Chop a tree, watch colonist automatically haul wood
4. ✅ Verify wood appears in HUD counter after delivery
5. ✅ Build something, verify HUD counter decreases

If all steps work → System functioning correctly! 🎉
