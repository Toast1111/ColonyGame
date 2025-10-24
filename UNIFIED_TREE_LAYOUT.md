# Unified Research Tree Layout

## Design Philosophy
- **Single giant tree** - All 60+ techs visible at once
- **Spatial grouping** - Related techs cluster together naturally
- **Color-coded** - Each category has distinct color
- **Multiple paths** - Linear spine with branching options
- **Cross-dependencies visible** - Connection lines show everything

## Layout Grid (20 columns × 12 rows)

```
                    INDUSTRY SPINE (Top)
                         ↓
BASIC → MILITARY → INDUSTRY → ADVANCED
  ↓        ↓           ↓          ↓
AGRICULTURE        MEDICINE   ENDGAME
  ↓                    ↓          ↓
FOOD PATH          AUGMENT    VICTORY
```

## Positioning Strategy

### Horizontal Zones (X-axis):
- **X: 0-3** = BASIC (gray) - Starting techs
- **X: 4-7** = MILITARY (red) - Combat path  
- **X: 8-11** = INDUSTRY (orange) - Production spine
- **X: 12-15** = MEDICINE (pink) - Healing augments
- **X: 16-19** = ADVANCED (purple) - Sci-fi endgame

### Vertical Flows (Y-axis):
- **Y: 0-2** = Early game (cheap, few prereqs)
- **Y: 3-5** = Mid game (moderate cost)
- **Y: 6-8** = Late game (expensive)
- **Y: 9-11** = Endgame (victory techs)

### Agriculture Special Flow:
- Starts at X:2, Y:3 (below basic)
- Flows downward and right
- Ends at X:6, Y:10 (GMO connects to endgame)

---

## Complete Node Positions

### BASIC (Gray #94a3b8)
```
cooking               (0, 0)
basic_construction    (1, 0)
basic_crafting        (2, 0)

agriculture           (0, 1)  [Tutorial - FREE]
basic_medicine        (1, 1)  [Tutorial - FREE]
basic_furniture       (2, 1)

tool_crafting         (1, 2)
advanced_cooking      (0, 2)

smithing              (2, 3)
```

### MILITARY (Red #ef4444)
```
melee_weapons         (4, 2)

defensive_structures  (4, 3)
basic_firearms        (5, 3)

body_armor            (5, 4)
fortifications        (4, 4)

advanced_firearms     (6, 4)
automated_defense     (7, 4)

explosives            (6, 5)
heavy_armor           (5, 5)

heavy_turrets         (7, 5)
powered_armor         (6, 6)
```

### AGRICULTURE (Green #22c55e)
```
composting            (2, 4)
cooking_efficiency    (1, 4)

irrigation            (3, 5)
animal_husbandry      (2, 5)

advanced_farming      (4, 6)
food_preservation     (2, 6)

breeding_programs     (3, 7)
cold_storage          (2, 7)

hydroponics           (5, 7)
industrial_ranching   (4, 8)

genetic_modification  (5, 9)
```

### INDUSTRY (Orange #f59e0b)
```
stonecutting          (8, 1)

deep_mining           (9, 2)
logging_efficiency    (8, 2)

smelting              (10, 3)
masonry               (8, 3)

machining             (11, 4)
power_generation      (10, 4)

electricity           (11, 5)
renewable_energy      (10, 5)

automation            (12, 6)
advanced_materials    (11, 6)

industrial_fabrication (12, 7)
```

### MEDICINE (Pink #ec4899)
```
herbal_medicine       (13, 2)

surgery               (14, 3)
pharmaceuticals       (13, 3)

advanced_medicine     (14, 4)
prosthetics           (15, 4)

regenerative_medicine (14, 5)
bionics               (15, 5)

gene_therapy          (15, 6)
archotech_implants    (16, 7)
```

### ADVANCED (Purple #8b5cf6)
```
energy_weapons        (16, 4)
laser_turrets         (17, 5)

robotics              (17, 6)

shields               (16, 6)
artificial_intelligence (18, 7)

cryogenics            (16, 8)
nanotechnology        (17, 8)

quantum_computing     (18, 8)
teleportation         (18, 9)

starship_construction (18, 10)
```

---

## Major Connection Lines

### Cross-Category Dependencies (Red dashed lines):
```
hydroponics → electricity (Agriculture needs Industry)
powered_armor → advanced_materials (Military needs Advanced)
bionics → electricity (Medicine needs Industry)
genetic_modification → gene_therapy (Agriculture needs Medicine)
energy_weapons → electricity (Advanced needs Industry)
cold_storage → electricity (Agriculture needs Industry)
industrial_ranching → automation (Agriculture needs Industry)
archotech_implants → nanotechnology (Medicine needs Advanced)
```

### Critical Path Highlights (Thick gold lines):
```
tool_crafting → melee_weapons → basic_firearms → advanced_firearms
stonecutting → deep_mining → smelting → machining → electricity
basic_medicine → surgery → prosthetics → bionics
```

---

## Visual Features

### Node Appearance:
- **Width**: 200px (was 180px - bigger for readability)
- **Color border**: Category color at 100% opacity
- **Background**: Category color at 15% opacity
- **Shadow**: Category color glow when available

### Connection Lines:
- **Same category**: Solid line in category color
- **Cross-category**: Dashed line, gradient between colors
- **Thickness**: 3px for normal, 5px for critical path

### States:
- **Locked**: Grayscale filter, 40% opacity
- **Available**: Full color, pulsing glow
- **In Progress**: Orange border, animated progress ring
- **Completed**: Green checkmark, subtle green glow

---

## Filter Toggle Buttons (Instead of Tabs)

```css
[Basic ✓] [Military ✓] [Agriculture ✓] 
[Industry ✓] [Medicine ✓] [Advanced ✓]
```

- Click to toggle ON/OFF
- Can have multiple active
- Dims non-selected categories (30% opacity)
- Shows count: "Military (11)" 
- All enabled by default

---

## Zoom & Pan

### Initial View:
- Zoom: 0.7x (show ~70% of tree)
- Center: (10, 5) - Middle of industry spine
- User can scroll/pinch to zoom 0.3x - 1.5x

### Minimap (Bottom-right corner):
- 150×100px overview
- Blue rectangle shows viewport
- Click to jump to area

---

## Mobile Optimizations

### Touch Controls:
- Two-finger pinch zoom
- One-finger pan
- Double-tap node to select
- Long-press for tooltip

### Responsive:
- Nodes: 180px → 160px on mobile
- Font sizes: -2px on mobile
- Connection lines: 3px → 2px
- Filter buttons: Horizontal scroll

