# Bed Interaction System Redesign

## Overview

Complete redesign of the bed interaction system to give colonists full agency over when they get in and out of beds. Colonists are no longer forced into sleep based on fatigue thresholds or time of day.

## Problem with Old System

**Complex Automatic Behavior**: 
- Colonists were automatically forced to sleep based on fatigue levels (60%+ fatigue)
- Night time forced colonists into sleep regardless of their energy level
- Complex reservation system with target locking and path retargeting
- Automatic exit conditions based on fatigue thresholds and time of day
- Colonists got "locked" in buildings and couldn't be easily controlled

**User Complaint**: "colonist's are no longer required to sleep during the night. especially if they are full on energy. now for some reason beds are still locking colonist's from moving during certain times"

## New System Design

### Simple One-Click Interactions
- **Get In Bed**: One interaction to enter bed
- **Get Out of Bed**: One interaction to exit bed
- **Player Agency**: Colonists only interact with beds when they choose to

### Core Principles
1. **No Forced Sleep**: Colonists never automatically enter sleep states
2. **Full Player Control**: Beds don't "lock" colonists - they can be drafted out anytime
3. **Simple State Management**: Entry/exit is immediate, not a complex process
4. **Choice-Based**: Tired colonists may choose beds during idle time, but it's not mandatory

## Implementation Details

### 1. Spatial Interaction System
**File**: `src/game/systems/spatialInteractions.ts`

```typescript
case 'bed':
  zones.push({
    id: `${building.kind}_interact_${building.x}_${building.y}`,
    target: building,
    center: { x: centerX, y: centerY },
    radius: Math.max(building.w, building.h) / 2 + 12,
    priority: 10,
    actions: [
      {
        id: 'enter_bed',
        name: 'Get in Bed',
        taskTypes: ['rest', 'sleep', 'goToSleep', 'idle'],
        canExecute: (c: Colonist) => !c.inside,
        execute: (c: Colonist, dt: number) => {
          // Simple bed entry - set inside, position, and sleeping pose
          c.inside = building;
          c.x = centerX;
          c.y = centerY;
          (c as any).sleepFacing = Math.PI / 2;
          return { completed: true, shouldContinue: false };
        }
      },
      {
        id: 'exit_bed',
        name: 'Get out of Bed',
        taskTypes: ['exit', 'leave', 'getup', 'idle'],
        canExecute: (c: Colonist) => !!(c.inside && c.inside === building),
        execute: (c: Colonist, dt: number) => {
          // Simple bed exit - clear inside and move away
          c.inside = null;
          c.x = centerX + 20;
          c.y = centerY;
          (c as any).sleepFacing = undefined;
          return { completed: true, shouldContinue: false };
        }
      }
    ]
  });
```

### 2. Simplified FSM States
**File**: `src/game/colonist_systems/colonistFSM.ts`

**Removed Complex Logic**:
- Automatic fatigue-based sleep forcing
- Complex house selection and reservation system  
- Time-based sleep triggers
- Automatic building entry/exit

**Simplified States**:
```typescript
case 'sleep': {
  // Sleep is now purely intent-based via spatial interactions
  changeState('resting', 'sleeping without bed');
  break;
}

case 'goToSleep': {  
  // GoToSleep is now purely intent-based via spatial interactions
  changeState('resting', 'resting without bed');
  break;
}
```

**Removed Automatic Building Entry**:
```typescript
// OLD: If inside any building and not resting, immediately switch to resting
// if (c.inside && c.state !== 'resting') { changeState('resting', 'entered building'); }

// NEW: Colonists now control their own bed entry/exit via spatial interactions
// No more automatic forcing into resting when inside buildings
```

**Simplified Resting State**:
```typescript
case 'resting': {
  // Keep bed position and pose
  if (c.inside && c.inside.kind === 'bed') {
    const bed = c.inside;
    c.x = bed.x + bed.w / 2;
    c.y = bed.y + bed.h / 2;
    if ((c as any).sleepFacing != null) {
      c.direction = (c as any).sleepFacing;
    }
  }
  
  // Rest recovers fatigue and heals
  c.hp = Math.min(100, c.hp + 1.2 * dt);
  
  // Colonists now stay in bed until they actively choose to leave
  // No more automatic exit based on fatigue - full player and colonist control
  break;
}
```

### 3. Intelligent Idle Behavior
**File**: `src/game/colonist_systems/colonistFSM.ts`

Added smart bed interaction logic to the `idle` state:

```typescript
case 'idle': {
  // Check for nearby spatial interactions when colonist is idle
  if (!c.target && c.stateSince > 1.0) {
    const nearbyBuildings = (game.buildings as Building[]).filter(b => {
      if (!b.done || b.kind !== 'bed') return false;
      const distance = Math.hypot(c.x - (b.x + b.w/2), c.y - (b.y + b.h/2));
      return distance <= 40;
    });
    
    if (nearbyBuildings.length > 0) {
      // If tired and there's a bed nearby, consider using it
      if ((c.fatigue || 0) > 50 && !c.inside) {
        const bed = nearbyBuildings[0];
        const bedCenter = { x: bed.x + bed.w/2, y: bed.y + bed.h/2 };
        const distance = Math.hypot(c.x - bedCenter.x, c.y - bedCenter.y);
        
        if (distance <= 20) {
          // Close enough - get in bed
          c.inside = bed;
          c.x = bedCenter.x;
          c.y = bedCenter.y;
          (c as any).sleepFacing = Math.PI / 2;
          changeState('resting', 'chose to use bed');
          break;
        } else {
          // Move toward bed
          c.target = bedCenter;
        }
      } else if (c.inside && (c.fatigue || 0) < 30) {
        // In bed but not tired - consider getting out
        const bed = c.inside;
        if (bed && bed.kind === 'bed') {
          c.inside = null;
          c.x = bed.x + bed.w/2 + 20;
          c.y = bed.y + bed.h/2;
          (c as any).sleepFacing = undefined;
          changeState('seekTask', 'got out of bed');
          break;
        }
      }
    }
  }
  
  // Normal idle behavior...
}
```

## Benefits of New System

### 1. **Player Agency**
- Colonists never get "locked" in beds
- Can be drafted out of beds immediately  
- No more forced sleep during night or high fatigue

### 2. **Realistic Behavior**
- Colonists make conscious choices about when to sleep
- Tired colonists prefer beds when idle, but it's not mandatory
- Rested colonists naturally get out of beds

### 3. **Simple and Predictable**
- One click to get in bed, one click to get out
- No complex reservation or targeting systems
- Clear cause and effect relationships

### 4. **Maintains Game Balance**
- Fatigue still recovers in beds (faster healing too)
- Colonists naturally prefer rest when tired
- Player can still command colonists to specific beds

## Migration Notes

**Removed Complex Systems**:
- Sleep reservation system (partially - still used for capacity)
- Target locking for sleep destinations
- Automatic fatigue-based sleep triggers
- Time-based sleep forcing
- Complex house selection algorithms

**Preserved Systems**:
- Basic building capacity tracking
- Fatigue recovery in beds
- Health recovery while resting
- Player command system for directing colonists to beds

## Testing

Use debug console to test:
```bash
# Create some colonists and beds
spawn colonist 3
build bed 5

# Set high fatigue to test natural bed usage
setfatigue all 80

# Watch colonists choose to use beds when idle
# Try drafting them - they should exit beds immediately
```

The system now provides full player control while allowing colonists to make intelligent choices about bed usage based on their needs.