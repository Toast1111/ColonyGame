# Research Unlocks Implementation Guide

## Overview
This guide explains how to implement the 50+ buildings, 60+ items, and 30+ mechanics unlocked by the expanded research tree.

## Implementation Priority

### Phase 1: Core Systems (High Priority)
These systems make research immediately visible and testable.

#### 1.1 Research Lock System
**File**: `src/game/managers/UIManager.ts` or `src/game/ui/dom/buildMenu.ts`

Add research requirements to building placement:
```typescript
// In buildMenu or UIManager
function canPlaceBuilding(buildingType: string): boolean {
  const buildingDef = BUILD_TYPES[buildingType];
  if (!buildingDef) return false;
  
  // Check if building requires research
  const requiredResearch = getBuildingResearchRequirement(buildingType);
  if (requiredResearch && !game.researchManager.isCompleted(requiredResearch)) {
    return false; // Show locked icon
  }
  
  return true;
}

function getBuildingResearchRequirement(buildingType: string): string | null {
  // Map building types to research IDs
  const buildingResearchMap: Record<string, string> = {
    'wall': 'basic_construction',
    'door': 'basic_construction',
    'turret': 'turrets',
    'greenhouse': 'advanced_farming',
    'freezer': 'food_preservation',
    'quarry': 'mining',
    'smelter': 'smelting',
    // ... add all 50+ buildings
  };
  
  return buildingResearchMap[buildingType] || null;
}
```

**UI Feedback**:
- Gray out locked buildings in build menu
- Show lock icon and "Requires: [Research Name]" tooltip
- Highlight newly unlocked buildings when research completes

#### 1.2 Unlock Notification System
**File**: `src/game/research/ResearchManager.ts`

```typescript
// Add to ResearchManager.completeResearch()
private notifyUnlocks(researchId: string): void {
  const node = getResearch(researchId);
  if (!node) return;
  
  const messages: string[] = [];
  
  if (node.unlocks.buildings) {
    messages.push(`Buildings: ${node.unlocks.buildings.join(', ')}`);
  }
  if (node.unlocks.items) {
    messages.push(`Items: ${node.unlocks.items.join(', ')}`);
  }
  if (node.unlocks.mechanics) {
    messages.push(`Mechanics: ${node.unlocks.mechanics.join(', ')}`);
  }
  
  // Show notification popup
  this.game.uiManager?.showNotification({
    title: `Research Complete: ${node.name}`,
    message: messages.join('\n'),
    type: 'success',
    duration: 5000
  });
}
```

### Phase 2: Industry Buildings (Medium Priority)
Implement material production chain to enable crafting.

#### 2.1 Quarry Building
**File**: `src/game/buildings.ts`

```typescript
quarry: {
  name: 'Quarry',
  description: 'Extract stone from the ground. Requires mining research.',
  type: 'quarry',
  w: 4, h: 4,
  cost: { wood: 100, stone: 50 },
  buildTime: 120,
  hp: 300,
  blocking: true,
  requiresResearch: 'mining',
  workable: true, // Can be worked by colonists
  production: {
    output: 'stone',
    rate: 1, // 1 stone per work cycle
    workTime: 10 // 10 seconds per cycle
  }
}
```

**FSM Integration**: Add `'quarrying'` state to colonist FSM similar to `'chopping'` or `'mining'`.

#### 2.2 Smelter Building
```typescript
smelter: {
  name: 'Smelter',
  description: 'Smelt ores into metal bars. Requires smelting research.',
  type: 'smelter',
  w: 3, h: 3,
  cost: { wood: 80, stone: 120 },
  buildTime: 150,
  hp: 350,
  blocking: true,
  requiresResearch: 'smelting',
  workable: true,
  inventory: { maxSlots: 4, capacity: 100 }, // Input: ore, Output: bars
  recipes: [
    { input: { IronOre: 2 }, output: { IronBar: 1 }, time: 20 },
    { input: { IronBar: 1, Coal: 2 }, output: { SteelBar: 1 }, time: 30 }
  ]
}
```

**FSM Integration**: Add `'smelting'` state, similar to `'cooking'`.

#### 2.3 Item Definitions
**File**: `src/game/itemDatabase.ts` (or create if doesn't exist)

```typescript
export interface ItemDefinition {
  id: string;
  name: string;
  category: 'material' | 'weapon' | 'armor' | 'medical' | 'food';
  stackSize: number;
  value: number; // Base value for trading
  weight: number;
  // Weapon stats (if weapon)
  damage?: number;
  range?: number;
  fireRate?: number;
  // Armor stats (if armor)
  armorRating?: number;
  bodyPart?: 'head' | 'torso' | 'legs';
}

export const ITEMS: Record<string, ItemDefinition> = {
  // Materials
  'IronBar': {
    id: 'IronBar',
    name: 'Iron Bar',
    category: 'material',
    stackSize: 75,
    value: 2,
    weight: 1
  },
  'SteelBar': {
    id: 'SteelBar',
    name: 'Steel Bar',
    category: 'material',
    stackSize: 75,
    value: 5,
    weight: 1
  },
  'Component': {
    id: 'Component',
    name: 'Component',
    category: 'material',
    stackSize: 50,
    value: 10,
    weight: 0.5
  },
  
  // Weapons
  'AssaultRifle': {
    id: 'AssaultRifle',
    name: 'Assault Rifle',
    category: 'weapon',
    stackSize: 1,
    value: 150,
    weight: 3,
    damage: 12,
    range: 300,
    fireRate: 0.3 // 3 shots per second
  },
  
  // Armor
  'Vest': {
    id: 'Vest',
    name: 'Flak Vest',
    category: 'armor',
    stackSize: 1,
    value: 80,
    weight: 2,
    armorRating: 0.3, // 30% damage reduction
    bodyPart: 'torso'
  },
  
  // ... add all 60+ items
};
```

### Phase 3: Power System (Medium Priority)
Implement electricity generation and consumption.

#### 3.1 Power Grid System
**File**: `src/game/systems/powerSystem.ts`

```typescript
export class PowerSystem {
  private generators: Building[] = [];
  private consumers: Building[] = [];
  private totalGeneration: number = 0;
  private totalConsumption: number = 0;
  
  registerGenerator(building: Building, powerOutput: number): void {
    this.generators.push(building);
    building.powerOutput = powerOutput;
    this.recalculatePower();
  }
  
  registerConsumer(building: Building, powerConsumption: number): void {
    this.consumers.push(building);
    building.powerConsumption = powerConsumption;
    this.recalculatePower();
  }
  
  private recalculatePower(): void {
    this.totalGeneration = this.generators
      .filter(b => !b.done) // Only completed buildings
      .reduce((sum, b) => sum + (b.powerOutput || 0), 0);
      
    this.totalConsumption = this.consumers
      .filter(b => !b.done)
      .reduce((sum, b) => sum + (b.powerConsumption || 0), 0);
  }
  
  isPowered(building: Building): boolean {
    if (!building.powerConsumption) return true; // Doesn't need power
    return this.totalGeneration >= this.totalConsumption;
  }
  
  getPowerStatus(): { generation: number; consumption: number; surplus: number } {
    return {
      generation: this.totalGeneration,
      consumption: this.totalConsumption,
      surplus: this.totalGeneration - this.totalConsumption
    };
  }
}
```

#### 3.2 Power Buildings
```typescript
// In buildings.ts
generator: {
  name: 'Generator',
  type: 'generator',
  w: 2, h: 2,
  cost: { steel: 100, component: 20 },
  requiresResearch: 'electricity',
  powerOutput: 1000, // Generates 1000W
  fuelType: 'wood', // Burns wood
  fuelConsumption: 0.5 // 0.5 wood per second
}

battery: {
  name: 'Battery',
  type: 'battery',
  w: 1, h: 1,
  cost: { steel: 50, component: 10 },
  requiresResearch: 'electricity',
  powerStorage: 5000 // Stores 5000W
}

hydroponic_basin: {
  name: 'Hydroponic Basin',
  type: 'hydroponic_basin',
  w: 4, h: 1,
  cost: { steel: 100, component: 5 },
  requiresResearch: 'hydroponics',
  powerConsumption: 100, // Uses 100W
  cropGrowthSpeed: 2 // 2x faster than regular farm
}
```

### Phase 4: Weapon & Armor System (High Priority)
Make combat research meaningful.

#### 4.1 Equipment System
**File**: `src/game/systems/equipmentSystem.ts`

```typescript
export interface Equipment {
  weapon?: ItemDefinition;
  helmet?: ItemDefinition;
  armor?: ItemDefinition;
}

export function equipItem(colonist: Colonist, item: ItemDefinition): boolean {
  if (!colonist.equipment) colonist.equipment = {};
  
  if (item.category === 'weapon') {
    colonist.equipment.weapon = item;
    colonist.damage = item.damage || colonist.damage;
    colonist.range = item.range || colonist.range;
    return true;
  }
  
  if (item.category === 'armor') {
    if (item.bodyPart === 'head') {
      colonist.equipment.helmet = item;
    } else if (item.bodyPart === 'torso') {
      colonist.equipment.armor = item;
    }
    return true;
  }
  
  return false;
}

export function calculateDamageReduction(colonist: Colonist): number {
  let reduction = 0;
  if (colonist.equipment?.helmet) reduction += colonist.equipment.helmet.armorRating || 0;
  if (colonist.equipment?.armor) reduction += colonist.equipment.armor.armorRating || 0;
  return Math.min(reduction, 0.9); // Max 90% reduction
}
```

#### 4.2 Combat Integration
```typescript
// In combat system
function applyDamage(target: Colonist, rawDamage: number): void {
  const damageReduction = calculateDamageReduction(target);
  const actualDamage = rawDamage * (1 - damageReduction);
  target.health -= actualDamage;
}
```

### Phase 5: Medical Items (Medium Priority)

#### 5.1 Prosthetics System
**File**: `src/game/medical/prosthetics.ts`

```typescript
export interface BodyPart {
  name: string;
  health: number; // 0 = destroyed, 100 = healthy
  prosthetic?: ItemDefinition; // Installed prosthetic/bionic
}

export interface ColonistBody {
  head: BodyPart;
  torso: BodyPart;
  leftArm: BodyPart;
  rightArm: BodyPart;
  leftLeg: BodyPart;
  rightLeg: BodyPart;
}

export function installProsthetic(
  colonist: Colonist, 
  bodyPart: keyof ColonistBody, 
  item: ItemDefinition
): boolean {
  if (!colonist.body) initializeBody(colonist);
  
  colonist.body[bodyPart].prosthetic = item;
  colonist.body[bodyPart].health = 100; // Prosthetic restores function
  
  // Bionics provide bonuses
  if (item.id.includes('Bionic')) {
    if (bodyPart.includes('Leg')) colonist.moveSpeed *= 1.2; // 20% faster
    if (bodyPart.includes('Arm')) colonist.workSpeed *= 1.15; // 15% faster work
  }
  
  return true;
}
```

### Phase 6: Advanced Mechanics (Low Priority)
End-game systems.

#### 6.1 Automation System
Buildings work without colonists assigned.

#### 6.2 Genetic Modification
Modify colonist traits permanently.

#### 6.3 AI Research Bonus
Passive research speed multiplier.

#### 6.4 Teleportation
Instant movement between teleport pads.

## Testing Checklist

For each research unlock:
- [ ] Building appears in build menu only after research
- [ ] Item can be crafted/found after research
- [ ] Mechanic is functional after research
- [ ] Notification shows what was unlocked
- [ ] Save/load preserves research state
- [ ] Prerequisites work correctly (can't skip)

## Quick Implementation Order

1. **Day 1**: Research lock system + unlock notifications (makes research visible)
2. **Day 2**: Simple production buildings (quarry, smelter) + material items
3. **Day 3**: Weapon/armor items + equipment system
4. **Day 4**: Power system + power buildings (generator, battery)
5. **Day 5**: Advanced buildings (hydroponics, auto-loom, etc.)
6. **Week 2**: Medical items, prosthetics, advanced mechanics

## Integration Points

### Building Definition Template
```typescript
new_building: {
  name: 'Building Name',
  type: 'new_building',
  w: 2, h: 2,
  cost: { wood: 100, steel: 50 },
  buildTime: 100,
  hp: 300,
  requiresResearch: 'research_id', // KEY ADDITION
  // ... rest of properties
}
```

### Research Check Pattern
```typescript
// Anywhere you need to check if research is done
if (game.researchManager?.isCompleted('research_id')) {
  // Unlock feature
}
```

### UI Update Hook
```typescript
// In ResearchManager.completeResearch()
this.game.uiManager?.refreshBuildMenu(); // Show newly unlocked buildings
this.game.uiManager?.showUnlockNotification(researchId);
```

## Files to Create/Modify

**New Files Needed**:
- `src/game/itemDatabase.ts` - All item definitions
- `src/game/systems/powerSystem.ts` - Electricity generation/consumption
- `src/game/systems/equipmentSystem.ts` - Weapon/armor equipping
- `src/game/medical/prosthetics.ts` - Body parts and prosthetics

**Existing Files to Modify**:
- `src/game/buildings.ts` - Add 50+ building definitions with `requiresResearch` field
- `src/game/managers/UIManager.ts` - Add research lock checks to build menu
- `src/game/research/ResearchManager.ts` - Add unlock notification system
- `src/game/colonist_systems/colonistFSM.ts` - Add new work states (quarrying, smelting, etc.)
- `src/game/combat/combatSystem.ts` - Integrate armor damage reduction
- `src/game/types.ts` - Add equipment types to Colonist interface

## Summary

This expansion adds **meaningful depth** to the research system:
- 43 research nodes unlock 140+ new game elements
- Clear progression from stone age → space age
- Multiple viable tech paths (military, farming, industry, medicine)
- End-game content provides long-term goals

The implementation is modular - each phase can be tested independently. Start with research locks (makes progress visible), then add production buildings (creates material chains), then weapons/armor (makes combat research meaningful).
