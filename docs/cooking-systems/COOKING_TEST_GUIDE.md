# Cooking System - Quick Test Guide

## How to Test the New Cooking System

### 1. Start the Game
```bash
npm run dev
```
Then open the browser to the URL shown (usually http://localhost:5173)

### 2. Basic Test Sequence

#### Phase 1: Build Infrastructure
1. **Build a Farm** (Hotkey: 2)
   - Place 2x2 farm somewhere safe
   - Wait for colonist to build it
   - Farm will start growing wheat (takes 2 in-game days)

2. **Build a Stove** (Hotkey: S)
   - Place 2x1 stove near your base
   - Cost: 20 wood, 10 stone
   - Icon: 🔥

3. **Build a Pantry** (Hotkey: P)
   - Place 2x2 pantry near stove
   - Cost: 25 wood, 5 stone
   - Icon: 🍞

#### Phase 2: Watch the Workflow
1. **Wait for Farm to Mature**
   - Takes 2 in-game days
   - Farm icon changes as it grows
   - When ready, colonist will harvest automatically

2. **Observe Wheat Harvest**
   - Colonist walks to farm
   - Harvests wheat
   - Message appears: "+10 wheat" (or more with skilled colonist)
   - **HUD**: Yellow "Wheat: 10" pill appears

3. **Watch Cooking Begin**
   - If you have ≥5 wheat, a colonist with Cooking enabled will:
     - Pick up 5 wheat (🌾 icon appears above colonist)
     - Walk to stove
     - Start cooking
   - **Stove**: Red progress bar fills over ~10 seconds

4. **Bread Production**
   - When cooking completes:
     - Message: "Colonist cooked 3 bread!"
     - Colonist gets 🍞 icon above head
   - Colonist walks to pantry
   - Stores bread in pantry
   - **HUD**: Brown "Bread: 3" pill appears

5. **Colonist Eats Bread**
   - When a colonist gets hungry (hunger > 75):
     - Colonist walks to pantry
     - Eats bread
     - Hunger drops by 80 points
     - HP increases by 5
   - **Notice**: Colonists prefer bread over regular food!

### 3. Debug Console Commands

Open browser console (F12) and try:

```javascript
// Add wheat manually
game.RES.wheat = 50;

// Add bread manually
game.RES.bread = 20;

// Check colonist states
game.colonists.forEach(c => {
  console.log(`${c.profile?.name}: ${c.state}, carrying wheat: ${c.carryingWheat || 0}, carrying bread: ${c.carryingBread || 0}`);
});

// Find stoves and pantries
game.buildings.filter(b => b.kind === 'stove' || b.kind === 'pantry');

// Speed up time
game.fastForward = 5; // 5x speed
```

### 4. What to Look For

#### Visual Indicators
- ✅ Yellow "Wheat" pill in HUD when wheat > 0
- ✅ Brown "Bread" pill in HUD when bread > 0
- ✅ 🔥 emoji on stove buildings
- ✅ 🍞 emoji on pantry buildings
- ✅ 🌾 emoji above colonist when carrying wheat
- ✅ 🍞 emoji above colonist when carrying bread
- ✅ Red progress bar below stove when cooking

#### Behavior Checks
- ✅ Farms produce wheat (not food)
- ✅ Colonists automatically cook when wheat ≥ 5
- ✅ 5 wheat → 3 bread conversion
- ✅ Colonists store bread in pantry
- ✅ Hungry colonists prefer bread from pantry
- ✅ Bread restores more hunger than regular food (80 vs 60)

#### Edge Cases
- ✅ No wheat → colonists don't cook
- ✅ No stove → cooking task not assigned
- ✅ No pantry → bread goes to global resources
- ✅ Multiple colonists → only one uses stove at a time

### 5. Common Issues

**Problem**: Colonists won't cook
- **Check**: Do you have ≥5 wheat?
- **Check**: Is the stove built (done = true)?
- **Check**: Is Cooking work enabled for colonist? (Work Priority Panel)
- **Check**: Are all colonists busy with higher priority work?

**Problem**: No wheat appearing
- **Check**: Are farms mature (growth >= 1.0)?
- **Check**: Is a colonist assigned to harvest? (Growing work enabled)
- **Fix**: Wait for farm to grow (2 in-game days)

**Problem**: Colonists eating regular food instead of bread
- **Check**: Is there bread in storage? (Check HUD)
- **Check**: Is there a pantry built?
- **Check**: Colonists prefer pantries, but will eat from HQ/warehouse if closer

### 6. Performance Test

Build multiple cooking stations:
1. Build 3 farms
2. Build 3 stoves
3. Build 2 pantries
4. Watch 3 colonists cook simultaneously
5. Verify smooth operation and no conflicts

### 7. Success Criteria

✅ **All workflows complete successfully**:
1. Farm → Wheat (harvest)
2. Wheat → Stove (transport)
3. Stove → Bread (cooking)
4. Bread → Pantry (storage)
5. Pantry → Colonist (consumption)

✅ **Visual feedback is clear**:
- All icons render correctly
- Progress bars animate smoothly
- HUD updates in real-time

✅ **Colonist AI works correctly**:
- Work priority respected
- No stuck colonists
- Efficient pathfinding
- Task completion

✅ **Resource balance makes sense**:
- Wheat production rate sustainable
- Cooking time reasonable
- Bread consumption matches production

## Expected Timeline

From game start to first bread consumed:
1. Build farm: ~30 seconds (construction time)
2. Farm grows: 2 in-game days (~2-3 minutes real time at 1x speed)
3. Harvest wheat: ~10 seconds
4. Build stove: ~30 seconds (construction time)
5. Cook bread: ~10 seconds
6. Build pantry: ~25 seconds (construction time)
7. Store bread: ~5 seconds
8. Wait for hunger: Variable (colonists get hungry over time)
9. Eat bread: ~5 seconds

**Total**: Approximately 5-7 minutes at normal game speed to see the full workflow.

**Tip**: Use `game.fastForward = 5` to speed up testing!

## Troubleshooting

### Console Logging
The system includes debug logging. Open console (F12) to see:
- Task assignments: "Colonist assigned Cooking..."
- State changes: "Colonist state change: seekTask → cooking..."
- Cooking events: "Colonist picked up 5 wheat", "Colonist cooked 3 bread!"
- Eating events: "Colonist successfully ate bread from pantry"

### Manual Testing
Force state changes for rapid testing:
```javascript
const c = game.colonists[0];
game.RES.wheat = 50;
game.setTask(c, 'cookWheat', game.buildings.find(b => b.kind === 'stove'));
```

## Conclusion

The cooking system is fully functional and integrates seamlessly with existing game systems. Test all workflows to verify correct operation!
