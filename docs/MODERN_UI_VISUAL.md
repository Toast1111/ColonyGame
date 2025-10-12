# Modern UI Visual Layout Guide

## Screen Layout Overview

```
┌────────────────────────────────────────────────────────────────────┐
│  ┌──────────────┐                              ┌──────────────┐   │
│  │  RESOURCES   │                              │  TIME & DAY  │   │
│  │  🪵 Wood 120 │                              │   Day 5      │   │
│  │  🪨 Stone 85 │                              │   14:32  ☀️  │   │
│  │  🍖 Food 200 │                              └──────────────┘   │
│  └──────────────┘                                                  │
│                                                                     │
│                    ┌─────────────────────┐                         │
│                    │   RADIAL MENU       │                         │
│                    │   (When Active)     │                         │
│                    │                     │                         │
│                    │    [Categories]     │                         │
│                    │   in Circle Form    │                         │
│                    └─────────────────────┘                         │
│                                                                     │
│                                                                     │
│                                              ┌──────────────────┐  │
│                                              │    TOAST #1      │  │
│                                              │  ✓ Success msg   │  │
│                                              └──────────────────┘  │
│                                              ┌──────────────────┐  │
│                                              │    TOAST #2      │  │
│                                              │  ℹ Info message  │  │
│                                              └──────────────────┘  │
│                                                                     │
│  ┌──────────────┐                              ┌──────────────┐   │
│  │ COLONY STATS │                              │   MINI-MAP   │   │
│  │  👥 5/10     │         ┌──────────┐         │              │   │
│  │  🏠 2 hiding │         │ ACTIONS  │         │  [Map view]  │   │
│  └──────────────┘         │ PANEL    │         │  with grid   │   │
│                           │ (bottom) │         │  & entities  │   │
│                           └──────────┘         └──────────────┘   │
└────────────────────────────────────────────────────────────────────┘
```

## Radial Build Menu Layout

### Category Ring (First Level)

```
                        [DEFENSE]
                    ╱               ╲
              [HOUSING]           [PRODUCTION]
            ╱                               ╲
    [FLOORING]       ┌─────────┐       [FURNITURE]
                     │  Click  │
                     │category │
                     │to expand│
                     └─────────┘
            ╲                               ╱
              [UTILITY]           [OTHER]
                    ╲               ╱
                        [SPECIAL]
```

### Building Selection (Second Level)

```
              [← BACK]
                 ↑
                 
        [House]      [Tent]
    
   [Workshop]    ╱         ╲    [Storage]
                │  Selected │
                │ Category: │
                │  HOUSING  │
                ╲           ╱
    [Bed]                    [Door]
    
            [Kitchen]
```

## HUD Component Details

### Top-Left: Resources Panel

```
╔═══════════════════════╗
║  🪵 Wood     120      ║
║     Wood              ║
║                       ║
║  🪨 Stone     85      ║
║     Stone             ║
║                       ║
║  🍖 Food     200      ║
║     Food              ║
║                       ║
║  🌾 Wheat     45      ║  (Optional)
║     Wheat             ║
╚═══════════════════════╝
```

### Top-Right: Time Panel

```
╔═══════════════╗
║   Day 5       ║
║               ║
║   14:32  ☀️   ║
╚═══════════════╝
```

### Bottom-Left: Colony Stats

```
╔═══════════════╗
║  👥           ║
║               ║
║  5/10         ║
║               ║
║  🏠 2 hiding  ║
╚═══════════════╝
```

### Bottom-Right: Storage Indicator

```
╔═══════════════════╗
║                   ║
║  ████████░░░ 85%  ║
║                   ║
╚═══════════════════╝

Colors:
█ = Filled (green if <70%, yellow if <90%, red if ≥90%)
░ = Empty
```

## Contextual Action Panel

### When Colonist Selected

```
                   ╔═══════════════════════════════╗
                   ║  Actions: Emma                ║
                   ╚═══════════════════════════════╝
╔══════════════════════════════════════════════════════╗
║  🎯  Draft for Combat                            R  ║
╠══════════════════════════════════════════════════════╣
║  😴  Rest Now                                     Z  ║
╠══════════════════════════════════════════════════════╣
║  🏥  Treat Injuries                               T  ║
╠══════════════════════════════════════════════════════╣
║  👤  View Profile                                 P  ║
╚══════════════════════════════════════════════════════╝
```

### When Building Selected

```
                   ╔═══════════════════════════════╗
                   ║  Building: house              ║
                   ╚═══════════════════════════════╝
╔══════════════════════════════════════════════════════╗
║  ✗  Cancel Construction                        Del  ║
╠══════════════════════════════════════════════════════╣
║  📦  View Inventory                               I  ║
╠══════════════════════════════════════════════════════╣
║  🔨  Demolish                                   Del  ║
╚══════════════════════════════════════════════════════╝
```

## Toast Notification Styles

### Info Toast (Blue)
```
╔═══════════════════════════════════╗
║  ℹ  Resource collected!           ║
║                                   ║
║  ████████████████████████░░░ 80%  ║
╚═══════════════════════════════════╝
```

### Success Toast (Green)
```
╔═══════════════════════════════════╗
║  ✓  Building completed!           ║
║                                   ║
║  ████████████████████████████ 95% ║
╚═══════════════════════════════════╝
```

### Warning Toast (Yellow)
```
╔═══════════════════════════════════╗
║  ⚠  Low on food!                  ║
║                                   ║
║  ██████████████░░░░░░░░░░░░░░ 50% ║
╚═══════════════════════════════════╝
```

### Error Toast (Red)
```
╔═══════════════════════════════════╗
║  ✗  Cannot build here!            ║
║                                   ║
║  ██████████░░░░░░░░░░░░░░░░░░ 30% ║
╚═══════════════════════════════════╝
```

## Mini-Map Component

```
╔═══════════════════════════╗
║ MAP                       ║
║                           ║
║  ┌───────────────────┐   ║
║  │ ░░░░░░░░░░░░░░░░░ │   ║  Grid
║  │ ░░■░░◯░░░░░░░░░░░ │   ║  ■ = Building
║  │ ░░░░░◉░░░░░▲░░░░░ │   ║  ◯ = Colonist
║  │ ░░░░░░░░░░░░░░░░░ │   ║  ◉ = Drafted
║  │ ░░░░◊░░░░░░░░░░░░ │   ║  ▲ = Enemy
║  │ ░░░░░░░░░░░░░░░░░ │   ║  ◊ = Downed
║  │ ╔════════╗░░░░░░░ │   ║  ╔══╗ = Viewport
║  │ ║Viewport║░░░░░░░ │   ║
║  └─┴────────┴───────┘   ║
║                           ║
║  ◯ Colonist               ║
║  ◉ Drafted                ║
║  ▲ Enemy                  ║
╚═══════════════════════════╝
```

## Animation States

### Radial Menu Animation

**Entrance (0.3s):**
```
Frame 1 (0%):    •           (invisible, scale 0)
Frame 2 (25%):   ○           (fading in, scale 0.5)
Frame 3 (50%):   ◎           (visible, scale 0.8)
Frame 4 (75%):   ⦿           (visible, scale 1.1 - overshoot)
Frame 5 (100%):  ◉           (visible, scale 1.0 - final)
```

**Category Hover:**
```
Default:   [Category]
Hover:     [Category]  (brighter, larger)
           ▓▓▓▓▓▓▓▓▓  (gradient fill)
```

### Toast Animation

**Slide In (0.2s):**
```
─────────────┤   →   ──────┤  →  ───┤  →  ▓▓▓│
   (off)          (75%)      (90%)    (100%)
```

**Slide Out (0.2s):**
```
▓▓▓│  →  ───┤  →  ──────┤  →  ─────────────┤
(100%)    (25%)      (10%)         (off)
```

## Color Reference

### Primary Colors
- **Blue (#3b82f6)**: Interactive elements, links
- **Emerald (#10b981)**: Success states, positive
- **Amber (#f59e0b)**: Warnings, caution
- **Red (#ef4444)**: Errors, danger, enemies

### Background Colors
- **Dark (#0b1220)**: Primary background
- **Slate 800 (#1e293b)**: Secondary background
- **Slate 700 (#334155)**: Borders, dividers

### Text Colors
- **Slate 200 (#e2e8f0)**: Primary text
- **Slate 300 (#cbd5e1)**: Secondary text
- **Slate 400 (#94a3b8)**: Muted text
- **Slate 500 (#64748b)**: Disabled text

## Responsive Behavior

### Mobile/Touch
- Larger hit areas (48px minimum)
- Radial menu opens at center
- Toast notifications wider
- HUD panels scale proportionally

### Desktop
- Standard hit areas (32px)
- Radial menu can open at cursor
- Compact toast notifications
- Precise hover states

### High DPI
- All measurements scaled by DPR
- Icons remain sharp
- Text remains readable
- Borders stay 1-2px visual

## Z-Order Layering

From bottom to top:

1. **Game World** (terrain, buildings, colonists)
2. **HUD Elements** (resources, time, stats, mini-map)
3. **Colonist Profile Panel** (when open)
4. **Radial Build Menu** (when open)
5. **Contextual Action Panel** (when applicable)
6. **Toast Notifications** (stack)
7. **Modal Panels** (work priority, inventory - unchanged)
8. **Performance HUD** (debug, top-most)
