# Cooking System - Complete Implementation

## Overview
A complete RimWorld-style cooking system has been implemented, adding depth to the colony's food production chain. Colonists now harvest wheat from farms, cook it into bread at stoves, and store it in pantries for later consumption.

## System Components

### 1. New Resources
- **Wheat**: Harvested from farms (replaces direct food production from farms)
- **Bread**: Cooked from wheat at stoves (more filling than raw food)

Both resources have unlimited storage (like medicine) and appear in the HUD when available.

### 2. New Buildings

#### Stove
- **Category**: Furniture
- **Cost**: 20 wood, 10 stone
- **Size**: 2x1 tiles
- **Build Time**: 60 units
- **Purpose**: Cooking station where colonists convert wheat into bread
- **Icon**: 🔥 (fire emoji)
- **Features**:
  - Tracks cooking progress (0-1)
  - Shows progress bar when cooking
  - Stores wheat temporarily during cooking
  - Locks to one colonist at a time via `cookingColonist` ID

#### Pantry
- **Category**: Furniture
- **Cost**: 25 wood, 5 stone
- **Size**: 2x2 tiles
- **Build Time**: 50 units
- **Purpose**: Storage for prepared food (bread)
- **Icon**: 🍞 (bread emoji)
- **Features**:
  - Tracks bread stored
  - Preferred location for colonists to retrieve food when hungry

### 3. Farm Changes
Farms now produce **wheat** instead of food:
- Harvest yields 10 wheat (modified by Plants skill)
- Growth time unchanged (2 days with 0.5 growth per day)
- Message changed to "+X wheat" instead of "+X food"

### 4. Cooking Workflow

#### Step 1: Harvest Wheat
1. Farm grows to maturity (`growth >= 1.0`)
2. Colonist with Growing work enabled harvests farm
3. Wheat added to global resources
4. Farm resets to growth = 0

#### Step 2: Cook Wheat
1. Colonist picks up 5 wheat from global storage
2. Carries wheat to stove (🌾 icon shown above colonist)
3. Deposits wheat into stove
4. Cooks for 10 seconds (modified by Cooking skill)
5. 5 wheat → 3 bread conversion
6. Grants Cooking XP while cooking

#### Step 3: Store Bread
1. Colonist receives 3 bread into inventory
2. Carries bread to pantry (🍞 icon shown above colonist)
3. Deposits bread into pantry
4. Bread added to global resources

#### Step 4: Consume Bread
When hungry, colonists:
1. Prefer bread from pantry over regular food
2. Move to pantry
3. Consume 1 bread
4. Restores 80 hunger (vs 60 for regular food)
5. Restores 5 HP (vs 2.5 for regular food)

### 5. FSM States

Three new colonist states added:

#### `cooking`
- Priority: 42 (productive work, between eat and standard work)
- Behavior:
  - Move to stove
  - Pick up 5 wheat if not carrying
  - Transfer wheat to stove
  - Cook with progress bar
  - Complete when `cookingProgress >= 1.0`
  - Timeout after 30 seconds
- Skill: Uses Cooking skill for speed multiplier

#### `storingBread`
- Priority: 45 (slightly higher than cooking to complete the job)
- Behavior:
  - Move to pantry
  - Deposit bread
  - Add to global resources
  - Return to seekTask
  - Fallback: Add to global resources if no pantry

#### Updates to `eat` state
- Now checks for bread availability first
- Prioritizes pantries with bread
- Falls back to regular food buildings (HQ, warehouse, stock)
- Consumes bread if available (80 hunger, 5 HP)
- Otherwise consumes regular food (60 hunger, 2.5 HP)

### 6. Work Priority Integration
- Cooking work type already existed in the system
- Default priority: 3 (medium)
- Related skill: Cooking
- Requires capability: manipulation
- Colonists can enable/disable cooking work in the work priority panel

### 7. Task Assignment

Added to `pickTask()` in Game.ts:

```typescript
// 5. Cooking - haul wheat to stove and cook bread
if (canDoWork('Cooking')) {
  // Find available stoves with wheat in storage
  // Assign cookWheat task
  
  // If colonist has bread, assign storeBread task
  // (higher priority to finish the cooking job)
}
```

### 8. Visual Indicators

#### HUD Resources
- Wheat: Yellow pill (`#f4d03f`) - only shown if wheat > 0
- Bread: Brown pill (`#d2691e`) - only shown if bread > 0

#### Building Labels
- Stove: 🔥 fire emoji
- Pantry: 🍞 bread emoji

#### Cooking Progress
- Red progress bar appears below stove when cooking
- Shows cookingProgress (0-100%)

#### Colonist Indicators
- Carrying wheat: 🌾 wheat emoji above head
- Carrying bread: 🍞 bread emoji above head

### 9. Skill System Integration

#### Cooking Skill
- Affects cooking speed via `skillWorkSpeedMultiplier`
- Grants XP while cooking (3 XP/second trickle)
- Bonus XP on completion (30 XP)
- Level 0-20 progression

#### Plants Skill (unchanged)
- Still affects wheat harvest yield (+50% max at level 25)
- Grants XP while harvesting (20 XP per harvest)

## Testing Checklist

### Basic Workflow
- [x] Build farm → harvest wheat → see wheat in HUD
- [x] Build stove → colonist picks up wheat → cooks at stove
- [x] Cooking progress bar appears and fills
- [x] 5 wheat converts to 3 bread after 10 seconds
- [x] Build pantry → colonist stores bread → see bread in HUD
- [x] Hungry colonist retrieves bread from pantry → hunger decreases

### Edge Cases
- [x] No wheat available → colonist doesn't attempt cooking
- [x] No stove → colonist doesn't attempt cooking task
- [x] No pantry → bread added to global resources directly
- [x] Colonist interrupted during cooking → timeout releases stove
- [x] Multiple colonists → stoves locked to one colonist at a time

### Visual Feedback
- [x] Wheat icon shows when colonist carrying wheat
- [x] Bread icon shows when colonist carrying bread
- [x] Cooking progress bar animates smoothly
- [x] Building labels (🔥, 🍞) render correctly

### Balance
- [x] Bread is more efficient than raw food (80 vs 60 hunger)
- [x] Cooking adds time investment (10 seconds per batch)
- [x] 5 wheat → 3 bread is a reasonable conversion
- [x] Stove and pantry costs are balanced with other furniture

## Code Locations

### Core Files Modified
- `src/game/types.ts` - Added wheat/bread to Resources, new building types, new colonist states
- `src/game/buildings.ts` - Added stove and pantry building definitions
- `src/game/Game.ts` - Added cooking task assignment logic
- `src/game/colonist_systems/colonistFSM.ts` - Added cooking, storingBread states; updated eat state
- `src/game/systems/ResourceSystem.ts` - Added wheat and bread resource handling
- `src/game/render.ts` - Added HUD display, building labels, cooking progress bar, carrying indicators

### Files Referenced
- `src/game/systems/workPriority.ts` - Cooking work type already existed
- `src/game/skills/skills.ts` - Cooking skill support already existed
- `src/game/constants.ts` - Building costs use existing constants

## Future Enhancements

### Potential Additions
1. **Raw wheat consumption**: Allow eating wheat directly (less filling than bread)
2. **Cooking recipes**: Multiple dishes with different ingredients and effects
3. **Food quality**: Poor/normal/good/excellent meals based on Cooking skill
4. **Meal variety**: Simple meals, fine meals, lavish meals (RimWorld-style)
5. **Food spoilage**: Perishable ingredients and prepared food
6. **Refrigeration**: Fridges to extend food shelf life
7. **Food preferences**: Colonists prefer certain foods based on traits
8. **Cooking speed**: Improve cook time with better stoves or skilled cooks
9. **Batch cooking**: Cook multiple meals at once
10. **Nutrition system**: Different foods provide different nutrition values

### Balance Adjustments
- Monitor wheat production vs consumption rates
- Adjust bread conversion ratio if needed (currently 5:3)
- Fine-tune cooking time (currently 10 seconds base)
- Evaluate hunger restoration values (80 for bread, 60 for food)

## Integration Notes

### Work Priority System
- Cooking priority defaults to 3 (medium)
- Can be adjusted per-colonist in work priority panel
- Disabled (priority 0) colonists won't cook

### Pathfinding
- Stoves and pantries use existing pathfinding system
- Buildings don't block movement (like beds, farms)
- Colonists path to building center with 20px arrival radius

### Door System
- Cooking workflow integrates with door system
- Colonists wait at doors when moving to/from stoves and pantries

### Medical System
- No direct integration (food restores health slowly)
- Could be enhanced with nutritious meals boosting healing rate

## Performance Considerations

- Wheat and bread have unlimited storage (no capacity checks)
- Cooking progress updates every frame (minimal overhead)
- Only one colonist can use a stove at a time (prevents conflicts)
- Task assignment checks are efficient (filtered building searches)

## RimWorld Fidelity

This implementation closely follows RimWorld's cooking system:
- ✅ Raw ingredients (wheat) → cooked food (bread)
- ✅ Dedicated cooking station (stove)
- ✅ Food storage (pantry)
- ✅ Work priority system integration
- ✅ Skill-based efficiency (Cooking skill)
- ✅ Visual feedback (progress bars, icons)
- ⏳ Food quality (not yet implemented)
- ⏳ Meal variety (not yet implemented)
- ⏳ Food spoilage (not yet implemented)

## Conclusion

The cooking system adds a complete production chain to the game, making food management more strategic and engaging. Players must now:
1. Plan farm layouts for wheat production
2. Build and staff cooking facilities
3. Manage food storage
4. Balance colonist work priorities

This creates emergent gameplay opportunities and adds depth to colony management, staying true to the RimWorld-inspired design philosophy.
