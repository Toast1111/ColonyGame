# Mountain Mining Quick Reference

## Quick Start

1. **Start New Game** - Mountains generate automatically
2. **Press '6'** or select "Mining Zone" from build menu
3. **Right-click Drag** to designate mining area (orange overlay)
4. **Watch Colonists** mine exposed ores automatically

## Ore Types & Properties

| Ore    | Color      | Rarity | Yield | HP  | Icon |
|--------|------------|--------|-------|-----|------|
| Coal   | Gray       | 25%    | 8     | 80  | ⚫   |
| Copper | Brown      | 15%    | 12    | 100 | 🟤   |
| Steel  | Steel Gray | 12%    | 10    | 120 | ⚙️   |
| Silver | Silver     | 8%     | 6     | 110 | ⚪   |
| Gold   | Gold       | 5%     | 4     | 100 | 🟡   |

## Mining Mechanics

### Visibility
- **Fog-of-War**: Ores only visible when exposed
- **Exposure**: Adjacent to mined-out tiles
- **Progressive**: Mine reveals nearby ores

### Work Assignment
- **Priority**: Mining work type in work panel
- **Auto-Assign**: Colonists pick exposed ores in zones
- **Skill Bonus**: Higher mining skill = more yield (up to +50%)

### Mining Speed
- **Mountain Tiles**: 12 damage/second
- **Regular Rocks**: 16 damage/second
- **Equipment**: Future pickaxe bonus planned

## Controls

### Desktop
- **Place Zone**: Right-click drag
- **Build Menu**: Press '6' or click "Mining Zone"
- **Cancel**: Left-click or Esc

### Mobile
- **Place Zone**: Long-press and drag
- **Build Menu**: Tap "Mining Zone" from zones menu
- **Cancel**: Tap elsewhere

## Troubleshooting

**Colonists not mining?**
- Check Mining priority in work panel (default enabled)
- Ensure ores are exposed (visible)
- Verify colonists not busy with higher priority tasks

**No ores visible?**
- Mine adjacent tiles to expose ores
- Check if mountains spawned (random generation)
- Try mining edge tiles first

**Zone not creating?**
- Ensure you're in Mining Zone mode (orange preview)
- Drag must be at least 32×32 pixels
- Check not overlapping HQ area

## Tips

1. **Start at Edges**: Mine mountain edges first to expose ores
2. **Small Zones**: Create focused zones around exposed veins
3. **Priority**: Set Mining to priority 1-2 for dedicated miners
4. **Storage**: Build stockpiles near mountains for efficiency
5. **Skills**: Mining skill increases with practice and yield

## Debug Commands

```bash
resources unlimited    # Remove resource limits (testing)
spawn colonist 3      # Add more miners
speed 3              # 3x game speed
godmode all          # Make invincible (testing)
```

## Known Behaviors

- Mountains block pathfinding until mined
- Trees/rocks don't spawn in mountains
- HQ area (15 tiles) protected from mountains
- Resources drop on ground after mining
- Pathfinding updates automatically after mining
