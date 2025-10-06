# Work Priority System - Quick Reference

## Overview

The Colony Game now features a **RimWorld-style work priority system** that allows you to assign specific jobs to colonists based on their skills and your colony's needs.

## How to Use

### Opening the Work Priority Panel

- Press **`P`** key to open/close the Work Priority Panel
- The panel shows all colonists and their work priorities

### Setting Priorities

- **Click any cell** in the grid to cycle through priorities:
  - **1** = Highest priority (green)
  - **2** = High priority (light green)
  - **3** = Normal priority (amber)
  - **4** = Low priority (orange)
  - **—** = Disabled (dark gray)

### How It Works

1. Colonists check for available work in priority order (1 → 2 → 3 → 4)
2. Among same-priority jobs, they choose the closest one
3. Disabled work types (—) are never performed by that colonist
4. Skills affect work speed and quality, but not job selection

## Work Types

### Emergency (Always Priority 1)
- **Firefighting** - Put out fires (future)
- **Patient** - Being treated for injuries
- **Doctor** - Treating others' injuries

### Core Work
- **Construction** - Building structures (requires manipulation)
- **Growing** - Farming and harvesting (requires manipulation)
- **Mining** - Extracting stone (requires manipulation)
- **Plant Cutting** - Chopping trees (requires manipulation)

### Future Work Types
- **Cooking** - Preparing meals
- **Hunting** - Hunting animals for food
- **Hauling** - Moving items and resources
- **Crafting** - General item creation
- **Research** - Technology advancement
- **Cleaning** - Maintaining cleanliness

## Tips & Strategies

### Specialization
- **Dedicated Builders**: Set Construction to 1, other work to 3-4
- **Full-time Farmers**: Set Growing to 1, disable (—) other manual labor
- **Doctor/Researcher**: Set Doctor and Research to 1-2, disable manual labor

### Balanced Colonists
- Use priority 2-3 for most work types
- Keep at least one colonist with priority 1-2 for each critical task

### Skill-Based Priorities
- High-skill colonists get automatic priority boosts in their specialty
- Colonists with "burning passion" for a skill get even higher priority

### Health Considerations
- Injured colonists (low manipulation/mobility) can't perform some work
- System automatically prevents assigning work they can't do

## Advanced Configuration

### Disable Non-Essential Work
For specialists, disable (—) work you don't want them to do:
- **Disable Growing** for dedicated builders/doctors
- **Disable Construction** for full-time farmers
- **Disable Manual Labor** entirely for researchers/doctors

### Emergency Response
- Firefighting and Patient care always override other work
- Doctor work has very high priority for treating injuries

### Balance Example Setup

**Colonist 1** (Builder/Hauler):
- Construction: 1
- Mining: 2
- Plant Cutting: 2
- Growing: 3
- Doctor: 3

**Colonist 2** (Farmer/Cook):
- Growing: 1
- Cooking: 1
- Doctor: 2
- Construction: 3
- Mining: —
- Plant Cutting: —

**Colonist 3** (Doctor/Researcher):
- Doctor: 1
- Research: 1
- Construction: 3
- Growing: 3
- Mining: —
- Plant Cutting: —

## Hotkeys

- **P** - Toggle Work Priority Panel
- **B** - Build Menu
- **H** - Help
- **Escape** - Close panels/cancel actions

## Technical Notes

- Priorities are saved with each colonist
- New colonists get default priorities based on their skills
- The system respects health limitations (consciousness, manipulation, mobility)
- Work is assigned every frame when colonists are in 'seekTask' state

## Future Features (Coming Soon)

- **Hauling System**: Automated resource/item transport
- **Cooking Jobs**: Meal preparation from raw food
- **Research System**: Technology tree advancement
- **Animal Handling**: Taming and training
- **Social Work**: Prison management (warden)

---

**Pro Tip**: Press `P` during gameplay to customize your colonists' roles and create an efficient colony!
