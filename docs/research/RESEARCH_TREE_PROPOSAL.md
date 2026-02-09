# Research Tree Redesign Proposal

## Design Philosophy

**Tabbed Categories**: Keep the 6-category system (Basic, Military, Agriculture, Industry, Medicine, Advanced)

**Key Principles**:
1. Every prerequisite must make logical sense
2. No orphaned/dead-end research unless it's high-tier
3. Clear early/mid/late game progression in each category
4. Cross-category dependencies create strategic choices
5. Each unlock should feel impactful

---

## BASIC CATEGORY
*Foundation of colony survival - tools, construction, cooking*

### Tier 1 (Starting)
- **Agriculture** [FREE - Tutorial unlock]
  - Unlocks: Farm plots
  - Prereqs: None
  
- **Basic Medicine** [FREE - Tutorial unlock]
  - Unlocks: Medical bed, bandages
  - Prereqs: None

- **Cooking** [50 pts, 30s]
  - Unlocks: Campfire, stove, bread recipe
  - Prereqs: None

### Tier 2 (Early Game)
- **Basic Construction** [50 pts, 30s]
  - Unlocks: Wood walls, wood doors
  - Prereqs: None
  
- **Basic Crafting** [50 pts, 30s]
  - Unlocks: Crafting spot, cloth crafting
  - Prereqs: None
  
- **Basic Furniture** [80 pts, 35s]
  - Unlocks: Tables, chairs, stools, beds, end tables
  - Mechanics: Eat at table (mood buff)
  - Prereqs: Basic Construction

### Tier 3 (Developing)
- **Tool Crafting** [100 pts, 45s]
  - Unlocks: Hoe, axe, pickaxe, hammer
  - Prereqs: Basic Crafting
  
- **Advanced Cooking** [150 pts, 60s]
  - Unlocks: Industrial stove, fine meals, survival meals
  - Mechanics: Meal quality buffs
  - Prereqs: Cooking

### Tier 4 (Established)
- **Smithing** [200 pts, 75s]
  - Unlocks: Smithing workbench, metal tools
  - Prereqs: Tool Crafting, Stonecutting (Industry)

---

## MILITARY CATEGORY
*Defense and offense - weapons, armor, fortifications*

### Tier 1
- **Melee Weapons** [75 pts, 40s]
  - Unlocks: Club, knife, spear
  - Prereqs: Tool Crafting (Basic)

### Tier 2
- **Defensive Structures** [100 pts, 50s]
  - Unlocks: Barricades, sandbags, spike traps
  - Prereqs: Basic Construction (Basic)
  
- **Basic Firearms** [150 pts, 60s]
  - Unlocks: Revolver, autopistol, bolt-action rifle
  - Prereqs: Melee Weapons, Smithing (Basic)

### Tier 3
- **Body Armor** [180 pts, 65s]
  - Unlocks: Leather vest, flak vest, metal helmet
  - Prereqs: Basic Firearms
  
- **Fortifications** [200 pts, 80s]
  - Unlocks: Stone bunkers, reinforced barricades, embrasures
  - Prereqs: Defensive Structures, Stonecutting (Industry)

### Tier 4
- **Advanced Firearms** [300 pts, 90s]
  - Unlocks: Assault rifle, shotgun, sniper rifle, machine gun
  - Prereqs: Basic Firearms, Machining (Industry)
  
- **Automated Defense** [350 pts, 100s]
  - Unlocks: Mini-turret, auto-turret
  - Prereqs: Advanced Firearms, Electricity (Industry)

### Tier 5
- **Explosives** [320 pts, 100s]
  - Unlocks: Grenades, molotovs, IEDs, mortar shells
  - Prereqs: Advanced Firearms
  
- **Heavy Armor** [400 pts, 120s]
  - Unlocks: Marine armor, cataphract armor
  - Prereqs: Body Armor, Smelting (Industry)

### Tier 6 (Late Game)
- **Heavy Turrets** [500 pts, 140s]
  - Unlocks: Heavy turret, mortar, rocket turret
  - Prereqs: Automated Defense
  
- **Powered Armor** [600 pts, 180s]
  - Unlocks: Powered armor suit, powered helmet
  - Prereqs: Heavy Armor, Advanced Materials (Advanced)

---

## AGRICULTURE CATEGORY
*Food production, animal handling, farming efficiency*

### Tier 1
- **Agriculture** [FREE]
  - Already unlocked (tutorial)

### Tier 2
- **Composting** [80 pts, 40s]
  - Unlocks: Compost bin, fertilizer
  - Mechanics: +15% crop growth speed
  - Prereqs: Agriculture

- **Cooking Efficiency** [100 pts, 45s]
  - Unlocks: Bulk meal prep
  - Mechanics: Cook 4 meals at once
  - Prereqs: Advanced Cooking (Basic)

### Tier 3
- **Irrigation** [150 pts, 60s]
  - Unlocks: Irrigation channels
  - Mechanics: +20% crop growth, drought resistance
  - Prereqs: Composting
  
- **Animal Husbandry** [180 pts, 70s]
  - Unlocks: Animal pen, haygrass, kibble
  - Mechanics: Tame and train animals
  - Prereqs: Agriculture

### Tier 4
- **Advanced Farming** [250 pts, 85s]
  - Unlocks: Greenhouse, fertilizer spreader
  - Mechanics: Year-round growing, crop rotation
  - Prereqs: Irrigation
  
- **Food Preservation** [200 pts, 70s]
  - Unlocks: Smokehouse, salt cellar, jerky
  - Mechanics: Food lasts 300% longer
  - Prereqs: Cooking Efficiency

### Tier 5
- **Breeding Programs** [320 pts, 105s]
  - Unlocks: Breeding facility, selective breeding
  - Mechanics: Improve animal stats over generations
  - Prereqs: Animal Husbandry
  
- **Cold Storage** [280 pts, 90s]
  - Unlocks: Freezer, refrigerator
  - Mechanics: Indefinite food preservation
  - Prereqs: Food Preservation, Electricity (Industry)

### Tier 6
- **Hydroponics** [450 pts, 130s]
  - Unlocks: Hydroponic basin, climate-controlled greenhouse
  - Mechanics: 200% growth speed, soilless farming
  - Prereqs: Advanced Farming, Electricity (Industry)
  
- **Industrial Ranching** [400 pts, 120s]
  - Unlocks: Automated feeders, milking stations, shearing stations
  - Mechanics: Passive resource generation
  - Prereqs: Breeding Programs, Automation (Industry)

### Tier 7 (Late Game)
- **Genetic Modification** [800 pts, 240s]
  - Unlocks: Gene lab, bioreactor, GMO seeds
  - Mechanics: Custom crop stats, super-animals
  - Prereqs: Hydroponics, Industrial Ranching, Gene Therapy (Medicine)

---

## INDUSTRY CATEGORY
*Infrastructure, power, production, resources*

### Tier 1
- **Stonecutting** [80 pts, 45s]
  - Unlocks: Stonecutter table, stone blocks, stone walls
  - Prereqs: Basic Construction (Basic)

### Tier 2
- **Deep Mining** [150 pts, 60s]
  - Unlocks: Mining zone, quarry, deep drill
  - Mechanics: Extract ore and stone from mountains
  - Prereqs: Tool Crafting (Basic)
  
- **Logging Efficiency** [100 pts, 50s]
  - Unlocks: Sawmill, lumber processing
  - Mechanics: +50% wood from trees
  - Prereqs: Tool Crafting (Basic)

### Tier 3
- **Smelting** [200 pts, 75s]
  - Unlocks: Bloomery, smelter, forge
  - Items: Iron bars, steel bars
  - Prereqs: Deep Mining
  
- **Masonry** [180 pts, 65s]
  - Unlocks: Stone furniture, flagstone floors, marble crafting
  - Prereqs: Stonecutting

### Tier 4
- **Machining** [300 pts, 100s]
  - Unlocks: Machine shop, fabricator, precision tools
  - Items: Components, mechanical parts
  - Prereqs: Smelting
  
- **Power Generation** [400 pts, 120s]
  - Unlocks: Wood-fired generator, water wheel, power conduit, battery
  - Mechanics: Power grid system
  - Prereqs: Machining

### Tier 5
- **Electricity** [450 pts, 130s]
  - Unlocks: Electric lights, refrigeration, powered crafting benches
  - Mechanics: Unlocks all electric buildings
  - Prereqs: Power Generation
  
- **Renewable Energy** [380 pts, 115s]
  - Unlocks: Solar panels, wind turbines, geothermal taps
  - Mechanics: Infinite clean power
  - Prereqs: Electricity

### Tier 6
- **Automation** [550 pts, 160s]
  - Unlocks: Auto-crafters, conveyor belts, assembly line
  - Mechanics: Automated production (no colonist needed)
  - Prereqs: Electricity
  
- **Advanced Materials** [500 pts, 150s]
  - Unlocks: Plasteel, composites, hyperweave cloth
  - Prereqs: Machining, Smelting

### Tier 7 (Late Game)
- **Industrial Fabrication** [700 pts, 200s]
  - Unlocks: Advanced fabricator, nanoforge
  - Mechanics: Instant crafting with rare materials
  - Prereqs: Automation, Advanced Materials

---

## MEDICINE CATEGORY
*Healthcare, surgery, augmentation, healing*

### Tier 1
- **Basic Medicine** [FREE]
  - Already unlocked (tutorial)

### Tier 2
- **Herbal Medicine** [100 pts, 50s]
  - Unlocks: Herbal medicine crafting, healing poultices
  - Mechanics: Cheap healing items from plants
  - Prereqs: Basic Medicine

### Tier 3
- **Surgery** [200 pts, 80s]
  - Unlocks: Operating table, surgical tools
  - Mechanics: Remove bullets, install prosthetics
  - Prereqs: Basic Medicine
  
- **Pharmaceuticals** [250 pts, 90s]
  - Unlocks: Drug lab, medicine, painkillers
  - Prereqs: Herbal Medicine

### Tier 4
- **Advanced Medicine** [350 pts, 110s]
  - Unlocks: Vitals monitor, IV drip, intensive care
  - Mechanics: +50% healing speed, surgery success rate
  - Prereqs: Surgery, Pharmaceuticals
  
- **Prosthetics** [380 pts, 115s]
  - Unlocks: Prosthetics workbench, wooden/simple prosthetic limbs
  - Items: Peg leg, hook hand, dentures, glass eye
  - Prereqs: Surgery, Machining (Industry)

### Tier 5
- **Regenerative Medicine** [500 pts, 150s]
  - Unlocks: Regeneration tank, healer mech serum
  - Mechanics: Heal scars, permanent injuries, old wounds
  - Prereqs: Advanced Medicine
  
- **Bionics** [600 pts, 170s]
  - Unlocks: Bionic workshop, advanced bionic limbs
  - Items: Bionic arm, leg, eye, ear, heart, spine, stomach
  - Mechanics: Better than natural (+stats)
  - Prereqs: Prosthetics, Electricity (Industry)

### Tier 6 (Late Game)
- **Gene Therapy** [850 pts, 230s]
  - Unlocks: Gene therapy lab, gene extractors
  - Mechanics: Modify traits, cure genetic diseases
  - Prereqs: Regenerative Medicine, Bionics
  
- **Archotech Implants** [1000 pts, 300s]
  - Unlocks: Archotech parts (best in game)
  - Items: Archotech eye, arm, leg (+massive stats)
  - Prereqs: Bionics, Nanotechnology (Advanced)

---

## ADVANCED CATEGORY
*Cutting-edge sci-fi tech - endgame research*

### Tier 1
- **Advanced Materials** [500 pts, 150s]
  - See Industry category (also appears here)

### Tier 2
- **Energy Weapons** [650 pts, 180s]
  - Unlocks: Laser pistol, plasma rifle, charge lance
  - Prereqs: Advanced Firearms (Military), Electricity (Industry)
  
- **Laser Turrets** [600 pts, 170s]
  - Unlocks: Laser turret, plasma turret
  - Prereqs: Heavy Turrets (Military), Energy Weapons

### Tier 3
- **Robotics** [750 pts, 210s]
  - Unlocks: Robotics facility, worker bots, charging station
  - Mechanics: Autonomous hauling/cleaning robots
  - Prereqs: Automation (Industry), Laser Turrets

### Tier 4
- **Shields** [800 pts, 220s]
  - Unlocks: Shield generator, personal shield belt
  - Mechanics: Absorb damage before health loss
  - Prereqs: Energy Weapons
  
- **Artificial Intelligence** [900 pts, 260s]
  - Unlocks: AI core, AI assistant
  - Mechanics: +30% research speed, smart turret targeting
  - Prereqs: Robotics

### Tier 5
- **Cryogenics** [850 pts, 230s]
  - Unlocks: Cryo pod, cryo casket
  - Mechanics: Suspend colonists (no aging/healing), emergency storage
  - Prereqs: Bionics (Medicine), Electricity (Industry)
  
- **Nanotechnology** [1100 pts, 320s]
  - Unlocks: Nanoforge, nano-healer kits
  - Mechanics: Instant wound healing, advanced manufacturing
  - Prereqs: Artificial Intelligence, Gene Therapy (Medicine)

### Tier 6 (Endgame)
- **Quantum Computing** [1400 pts, 380s]
  - Unlocks: Quantum processor
  - Mechanics: 3x research speed, unlocks final techs
  - Prereqs: Artificial Intelligence
  
- **Teleportation** [1600 pts, 420s]
  - Unlocks: Teleporter, teleport beacon
  - Mechanics: Instant colonist/item transport
  - Prereqs: Quantum Computing, Shields

### Tier 7 (Victory Path)
- **Starship Construction** [2000 pts, 500s]
  - Unlocks: Ship reactor, ship engine, ship hull, ship sensors
  - Mechanics: Build escape ship (win condition)
  - Prereqs: Quantum Computing, Nanotechnology

---

## Key Fixes Applied

### 1. **Removed Broken Prerequisites**
- Fixed `turrets` requiring itself
- Created missing `cooking` and `tool_crafting` nodes
- All prereqs now reference real research

### 2. **Logical Tech Progression**
```
Tools → Weapons → Advanced Weapons → Energy Weapons
Farming → Irrigation → Greenhouse → Hydroponics
Mining → Smelting → Machining → Automation
Medicine → Surgery → Prosthetics → Bionics
```

### 3. **Added Missing Technologies**
- **Composting** - Early farming boost
- **Logging Efficiency** - Wood processing
- **Renewable Energy** - Solar/wind power
- **Cold Storage** - Freezer prerequisite
- **Industrial Ranching** - Automated animal products
- **Herbal Medicine** - Cheap early healing
- **Masonry** - Stone crafting
- **Starship Construction** - Victory condition

### 4. **Cross-Category Dependencies**
These create strategic choices:
- Hydroponics needs Agriculture + Industry (Electricity)
- Powered Armor needs Military + Advanced (Advanced Materials)
- Bionics needs Medicine + Industry (Electricity)
- GMO needs Agriculture + Medicine (Gene Therapy)
- Energy Weapons needs Military + Industry (Electricity)

### 5. **Balanced Costs**
- Tier 1: 50-100 pts (early game)
- Tier 2-3: 100-200 pts (developing)
- Tier 4-5: 300-500 pts (established)
- Tier 6+: 600-1000 pts (late game)
- Endgame: 1000-2000 pts

---

## Implementation Notes

### Position Layout (Per Category)
Use a **tiered grid layout** within each category:
```
Tier 1:  y=0
Tier 2:  y=1
Tier 3:  y=2
Tier 4:  y=3
Tier 5:  y=4
Tier 6:  y=5
Tier 7:  y=6

Spread nodes horizontally within each tier (x=0,1,2,3...)
```

### Visual Enhancements
1. **Cross-category icon** - Show small icon next to prereq like "(⚡Industry)" 
2. **Locked state** - Gray out nodes with unmet cross-category prereqs
3. **Completion markers** - Green checkmark on completed research
4. **Current research** - Pulsing border on active research
5. **Available research** - Highlight nodes that can be started

### UI Improvements
- Add **tooltip** on hover showing full description + exact prereqs
- **Filter buttons**: "Available", "In Progress", "Completed", "Locked"
- **Search bar** to find specific research by name
- **Cost display** on each node showing points + time estimate

---

## Questions for You

1. **Do you want a ship escape victory?** (Starship Construction path)
2. **Should Basic/Medicine start unlocked?** (Tutorial concepts)
3. **Do you like cross-category dependencies?** (Makes strategic choices)
4. **Any specific RimWorld techs you want to add?** (I can integrate them)
5. **What's your preferred late-game tech theme?** (Archotech/Spacer/Mechanoid focused?)

Let me know what you think of this restructure! I can refine any category or add more tech paths based on your preferences.
