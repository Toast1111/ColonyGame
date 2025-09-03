# Item System Documentation

## Overview

The Colony Game now features a comprehensive XML-based item definition system similar to RimWorld's approach. This system allows for easy expansion and modification of items without touching the core game code.

## Architecture

### 1. XML Item Definitions (`src/data/items.xml`)
- Central database of all item definitions
- Standardized format for defining item properties
- Easy to read and modify by designers/modders

### 2. TypeScript Item Database (`src/data/itemDatabase.ts`)
- Singleton class that loads and manages item definitions
- Provides helper methods for item creation and querying
- Handles item generation with proper typing

### 3. Enhanced Type System (`src/game/types.ts`)
- Extended `InventoryItem` interface with all necessary properties
- Proper TypeScript typing for quality, durability, and categories
- Support for item references via `defName`

## Item Properties

### Core Properties
- **defName**: Unique identifier for the item type
- **label**: Display name shown to players  
- **description**: Flavor text explaining the item
- **category**: Classification (Tool, Weapon, Armor, etc.)
- **value**: Base trade value
- **weight**: Physical weight affecting carry capacity

### Equipment Properties
- **equipSlot**: Where the item can be equipped (helmet, armor, weapon, tool, etc.)
- **maxDurability**: How much wear the item can take
- **stackable**: Whether multiple items can be grouped together
- **maxStack**: Maximum quantity in a single stack

### Specialized Properties
- **damage/range/accuracy**: Combat statistics for weapons
- **armorRating**: Protection value for armor pieces
- **workSpeedBonus**: Efficiency improvement for tools
- **healAmount**: Health restoration for medical items
- **nutrition**: Hunger satisfaction for food items
- **spoilage**: Days until food becomes inedible

## Usage Examples

### Creating Items Programmatically
```typescript
import { itemDatabase } from '../data/itemDatabase';

// Create a single item
const rifle = itemDatabase.createItem('Rifle', 1, 'excellent');

// Create multiple items
const bullets = itemDatabase.createItem('Bullets', 30, 'normal');

// Get item definition for game mechanics
const itemDef = itemDatabase.getItemDef('TacticalArmor');
const armorValue = itemDef?.armorRating || 0;
```

### Background-Based Starting Equipment
The system automatically generates appropriate starting equipment based on colonist backgrounds:

- **Farmers**: Hoe, seeds, work clothes
- **Soldiers**: Rifle, tactical armor, helmet, medical kit
- **Doctors**: Medical supplies, bandages
- **Engineers**: Tools, electronic components
- **Miners**: Pickaxe, safety helmet, work clothes
- **Traders**: Valuable goods, currency

### Quality System
Items can have different quality levels that affect their properties:
- **Awful**: Terrible condition, may break easily
- **Poor**: Below average performance
- **Normal**: Standard quality (default)
- **Good**: Above average effectiveness
- **Excellent**: High quality with bonuses
- **Masterwork**: Exceptional items with significant bonuses
- **Legendary**: Extremely rare, maximum effectiveness

## Integration Points

### Game Initialization
The item database is automatically loaded when the game starts:
```typescript
// In Game constructor
itemDatabase.loadItems();
```

### Colonist Generation
Starting inventories are generated using the item database:
```typescript
// In generateStartingInventory()
const backgroundItems = itemDatabase.getItemsForBackground(background);
for (const itemDefName of backgroundItems) {
  const item = itemDatabase.createItem(itemDefName, 1, getRandomQuality(rng));
  // ... equipment logic
}
```

### UI Display
The gear tab now shows proper item information:
- Equipment slots with actual equipped items
- Inventory list with quantities and qualities
- Color-coded quality indicators
- Durability percentages for degradable items

## Future Expansion

### Adding New Items
1. Add item definition to `items.xml`
2. Update item database arrays if needed
3. Items automatically become available in game

### New Item Categories
Simply add new categories to existing items or create new specialized properties in the `ItemDef` interface.

### Modding Support
The XML-based system makes it easy for modders to:
- Add new items without code changes
- Modify existing item properties
- Create themed item packs
- Balance gameplay through item stats

## Performance Notes

- Item definitions are loaded once at game start
- Item creation uses efficient factory pattern
- Inventory calculations are optimized with caching
- Quality determination uses weighted random distribution

This system provides a solid foundation for a complex item-based economy while maintaining the simplicity and expandability that made RimWorld's item system so successful.
