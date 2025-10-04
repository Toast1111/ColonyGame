# Door System Implementation

## Overview
A complete RimWorld-style door system has been implemented for the Colony Game. Doors can be opened by colonists, block enemies (who must attack them), and have animated opening/closing mechanics.

## Key Features

### 1. Door Building Type
- **Location**: `src/game/buildings.ts`
- **Cost**: 10 wood
- **HP**: 100
- **Build Time**: 30
- **Size**: 1x1 tile (32x32 pixels)
- **Category**: Defense
- **Key**: 'D'

### 2. Door States
Doors have four states managed by a finite state machine:
- **Closed**: Door is shut, blocks all movement
- **Opening**: Door is sliding open (0.5 second animation)
- **Open**: Door is fully open, all entities can pass
- **Closing**: Door is sliding closed (0.5 second animation)

### 3. Door System (`src/game/systems/doorSystem.ts`)

#### Core Functions:
- `initializeDoor(door)`: Initialize door state when built
- `updateDoor(door, dt, gameTime)`: Update door FSM each frame
- `isDoorPassable(door)`: Check if door is fully open
- `isDoorBlocking(door)`: Check if door blocks movement
- `requestDoorOpen(door, entity, type)`: Request door to open
- `releaseDoorQueue(door, entityId)`: Remove entity from queue
- `attackDoor(door, damage, game)`: Enemy attacks door

#### Door Queue System:
- Entities are tracked in a queue when waiting for a door
- Door remains open while entities are in the queue
- Auto-closes after 2 seconds when queue is empty
- Entities can slip through during closing if fast enough

### 4. Colonist Integration

#### New State: `waitingAtDoor`
- Colonists pause movement when encountering a closed door
- Request door to open
- Wait until door is fully open
- Resume previous task/movement
- Timeout after 10 seconds if door doesn't open

#### Movement Updates:
- `moveTowardsSafely()` now checks for doors before moving
- Doors are requested to open when colonist approaches
- Colonists will not collide with open doors
- Door check integrated into collision detection

### 5. Enemy Integration

#### Enemy Behavior:
- Enemies detect blocked doors in their path
- Attack doors instead of moving when blocked
- Deal damage based on enemy's `dmg` stat
- Door destruction triggers nav grid rebuild
- Enemies can pass through destroyed doors

#### Attack System:
- Discrete melee hits on 1-second cooldown
- Door HP decreases with each hit
- Message displayed when door is destroyed
- Nav grid automatically updates

### 6. Pathfinding Integration

#### Navigation Updates (`src/game/navigation/navGrid.ts`):
- Doors marked as walkable tiles (not solid obstacles)
- Colonists can path through doors
- Doors treated like paths for pathfinding
- Nav grid rebuilds when doors are built/destroyed

#### Collision System:
- Open doors don't block movement
- Closed/closing doors block like walls
- Opening doors allow slipping through if entity is fast

### 7. Visual Rendering

#### Door Appearance (`src/game/render.ts`):
- Wooden frame with sliding panels
- Animated opening/closing (horizontal slide)
- Left and right panels slide apart
- Vertical detail lines for visual interest
- HP bar when damaged
- Build progress bar during construction

#### Visual States:
- **Closed**: Full panels visible
- **Opening**: Panels sliding apart (0 to 100%)
- **Open**: Panels fully retracted
- **Closing**: Panels sliding back (100% to 0%)

### 8. Type System Updates

#### New Types (`src/game/types.ts`):
- Added `"door"` to `BuildingKind`
- Added `"waitingAtDoor"` to `ColonistState`
- Added door-specific properties to `Building`:
  - `doorState`: Current FSM state
  - `doorProgress`: Animation progress (0-1)
  - `doorOpenTime`: Timing for animations
  - `doorCloseDelay`: Auto-close timer
  - `doorQueue`: List of waiting entities
- Added door interaction properties to `Colonist` and `Enemy`:
  - `waitingForDoor`: Reference to door being waited for
  - `doorWaitStart`: Time when waiting started
  - `id`: Unique identifier for queue management

## Usage

### Building a Door:
1. Select door from build menu (key 'D')
2. Place on a 1x1 tile location
3. Colonist will construct it (30 build time)
4. Door initializes in closed state when complete

### Colonist Interaction:
1. Colonist paths toward destination
2. Encounters closed door
3. Automatically requests door to open
4. Enters `waitingAtDoor` state
5. Door begins opening animation (0.5s)
6. Once fully open, colonist proceeds
7. Door auto-closes after 2s if no one else in queue

### Enemy Interaction:
1. Enemy paths toward target (colonist/HQ)
2. Encounters closed door
3. Begins attacking door
4. Deals damage every 1 second
5. Door destroyed at 0 HP
6. Enemy proceeds through opening

## Technical Details

### Timing Constants:
```typescript
const DOOR_OPEN_TIME = 0.5;      // Time to fully open (seconds)
const DOOR_CLOSE_DELAY = 2.0;    // Wait before auto-close (seconds)
const DOOR_CLOSE_TIME = 0.5;     // Time to fully close (seconds)
```

### Door Animation:
- Progress stored as 0-1 value
- Visual rendering interpolates panel positions
- Smooth sliding motion
- Can interrupt closing to reopen if requested

### Integration Points:
- Game loop: `updateDoor()` called for each door
- Building completion: `initializeDoor()` called
- Collision detection: `isDoorBlocking()` checked
- Pathfinding: Doors marked as walkable
- Rendering: Custom door draw function

## Future Enhancements

Possible additions:
1. Different door types (metal, reinforced, automatic)
2. Door access control (friendly/enemy/specific colonists)
3. Sound effects for opening/closing
4. Power-operated doors (faster opening)
5. Double doors (2x1 or 1x2)
6. Lockable doors
7. Damage types affecting doors differently
8. Repair/upgrade mechanics

## Testing

To test doors:
1. Build a wall enclosure
2. Place a door in the wall
3. Send colonist through the door
4. Observe automatic opening/closing
5. Spawn enemies to test door attacks
6. Verify pathfinding works through doors
7. Check multiple colonists queuing at door

## RimWorld Fidelity

This implementation closely follows RimWorld's door mechanics:
- ✅ Doors must be opened before passing
- ✅ Colonists wait for doors to open
- ✅ Doors auto-close after delay
- ✅ Enemies attack doors
- ✅ Doors have HP and can be destroyed
- ✅ Smooth opening/closing animations
- ✅ Entities can slip through during closing
- ✅ Pathfinding treats doors as passable
