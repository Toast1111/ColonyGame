# Health Tab Redesign - RimWorld-Inspired

## Overview
The health tab in the colonist bio panel has been redesigned to follow RimWorld's comprehensive health system display, providing detailed information about colonist health status, injuries, and bodily systems.

## Implementation

### Files Created/Modified
- **Created**: `src/game/ui/panels/healthTab.ts` - New dedicated health tab module
- **Modified**: `src/game/ui/panels/colonistProfile.ts` - Integrated new health tab
- **Modified**: `src/game/managers/UIManager.ts` - Added health sub-tab state management
- **Modified**: `src/game/Game.ts` - Added input handling for health sub-tabs and toggles

## Features

### 1. Health Sub-Tabs
The health tab is now divided into three sub-tabs:

#### Overview Tab
- **Creature Info Section**: Displays type, gender, and age with hover for detailed info
- **Self-Tend Toggle**: Allows colonists to treat their own wounds (with reduced efficiency)
- **Bodily Systems Display**: Shows all relevant body systems with capacity percentages
  - Color-coded bars: Green (good), Yellow (impaired), Orange (poor), Red (critical)
  - Fatal systems marked as "CRITICAL" when below 30%

#### Operations Tab
- **Queued Operations**: Shows pending surgical procedures
- **Available Operations**: List of possible surgeries
  - Install prosthetics/bionics
  - Remove infections
  - Organ operations
  - Each operation shows required skill level and time
  - "Add" button to queue operations (placeholder functionality)

#### Injuries Tab
- **Overall Bleeding Rate**: Displayed prominently at the top with visual droplet indicator
- **Detailed Injury List**: Each injury shows:
  - **Bleeding Indicator**: Red droplet (size varies with severity)
  - **Treatment Status Indicators**:
    - Open circle (○) = Needs tending
    - Solid circle (●) = Tended
  - **Bandage Quality Indicator**: 🩹 with color-coded quality
    - White = High quality treatment
    - Light gray = Medium quality
    - Dark gray = Poor quality
  - Injury description with icon (🔪 cut, 🔥 burn, etc.)
  - Body part affected
  - Severity and pain percentages
  - Infection status (if infected)
  - Permanent damage marker
- **Implants & Prosthetics**: Listed separately at the bottom

### 2. Bodily Systems (RimWorld-Style)
Based on RimWorld's system, showing capacity for:
- Pain
- Consciousness (fatal)
- Sight
- Hearing
- Moving
- Manipulation
- Talking
- Breathing (fatal)
- Blood Filtration (fatal)
- Blood Pumping (fatal)
- Digestion (fatal)

Each system calculates capacity based on:
- Relevant body parts
- Current health values (consciousness, mobility, manipulation)
- Organ health (kidneys, liver)
- Overall blood level

### 3. Visual Design
- **Color Palette**: Consistent with existing UI (dark blue/slate theme)
- **Sub-Tab Navigation**: Horizontal tabs below main health tab
- **Active State**: Blue highlight with glow effect
- **Responsive**: Adapts to panel width (mobile-friendly)
- **Icons**: Emoji-based injury type indicators for quick recognition

## Input Handling

### Click Interactions
1. **Sub-Tab Clicks**: Switch between Overview, Operations, Injuries
2. **Self-Tend Toggle**: Click to enable/disable (shows toast notification)
3. **Operation Buttons**: Queue surgical procedures (placeholder)

### Code Flow
```typescript
// Input handling in Game.ts handleMouseDown
1. Check health sub-tab rects for clicks
2. Check health toggle rects for clicks (self-tend)
3. Update UI state and provide feedback
```

## Data Integration

### Health System Data Used
- `colonist.health.bodyParts` - Individual body part health
- `colonist.health.injuries` - Active injuries with bleeding/infection status
- `colonist.health.totalPain` - Pain level
- `colonist.health.consciousness` - Consciousness capacity
- `colonist.health.mobility` - Movement capacity
- `colonist.health.manipulation` - Work speed capacity
- `colonist.health.bloodLevel` - Blood pumping capacity
- `colonist.health.kidneyHealth` - Kidney function
- `colonist.health.liverHealth` - Liver function
- `colonist.health.implants` - Installed prosthetics/bionics

### Self-Tend Property
- Stored as `(colonist as any).selfTend` boolean
- Reduces medical treatment efficiency when enabled
- Allows colonists to treat themselves when no other doctor available

## Future Enhancements

### Short-Term
1. Implement operation queueing functionality
2. Add hover tooltips for bodily systems showing contributing factors
3. Display treatment quality history for injuries
4. Add infection progress bars

### Long-Term
1. Mechanical colonist support (Data Processing, Power Generation, etc.)
2. Detailed age/birth date hover tooltip
3. Medical treatment scheduling
4. Body part replacement tracking
5. Scar/permanent damage visualization

## Testing

### Manual Testing Steps
1. Start game and spawn colonists
2. Open colonist bio panel (click colonist)
3. Navigate to Health tab
4. Test sub-tab switching (Overview, Operations, Injuries)
5. Toggle self-tend on/off
6. Cause damage to colonist (debug console: `damage selected 20`)
7. Verify injury display with bleeding/infection indicators
8. Check responsive behavior on different screen sizes

### Debug Console Commands
```bash
damage selected 20          # Cause damage
heal selected               # Heal injuries
infect selected             # Add infection
select next                 # Cycle through colonists
```

## Architecture Notes

### Design Decisions
1. **Separate Module**: Health tab extracted to `healthTab.ts` to keep colonistProfile.ts maintainable
2. **No Game.ts Logic**: All rendering logic in UI module, Game.ts only handles input
3. **Type Safety**: Uses existing types from `types.ts` (Colonist, ColonistHealth, etc.)
4. **Responsive**: Font scaling and layout adapts to panel width
5. **RimWorld Fidelity**: Closely matches RimWorld's UI/UX patterns for familiarity

### Performance Considerations
- Minimal computation per frame (capacity calculations cached)
- Only active sub-tab rendered
- Injury list truncated if too long (prevents performance issues)

## References
- RimWorld Wiki: Health Tab Documentation
- Existing health system: `src/game/health/healthSystem.ts`
- Medical system: `src/game/health/medicalSystem.ts`
- Body part types: `src/game/types.ts` (lines 148-210)

---
**Last Updated**: November 6, 2025
**Author**: AI Assistant
**Related Systems**: Health System, Medical System, UI System
