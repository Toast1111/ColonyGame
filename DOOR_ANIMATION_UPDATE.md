# Door Animation & Timing Update

## Summary
Updated the door system to have proper RimWorld-style animated doors with realistic timing:

- **Opening Time**: 2 seconds (was 0.5s)
- **Closing Time**: 2 seconds (was 0.5s)
- **Close Delay**: 1 second after last use
- **Detection Range**: 3 tiles (96 pixels) - colonists detect doors earlier

## How It Works

### Animation System
The door uses a smooth animation system tracked by `doorProgress` (0 = fully closed, 1 = fully open):

1. **Closed State**: Door panels are together, blocking passage
2. **Opening State**: Panels slide apart horizontally over 2 seconds
3. **Open State**: Panels are fully retracted, passage is clear
4. **Closing State**: Panels slide back together over 2 seconds

### Colonist Interaction Flow

1. **Detection**: When a colonist moves within 3 tiles of a closed/closing door:
   - Door is added to their `waitingForDoor` reference
   - Door begins opening animation
   - Colonist is added to the door's queue

2. **Waiting**: Colonist enters `waitingAtDoor` state:
   - Stops moving
   - Waits for door to reach `doorProgress >= 1.0`
   - Shows "waitingAtDoor" status in debug overlay
   - Has a 10-second timeout before giving up

3. **Passage**: When door is fully open:
   - Colonist is removed from door queue
   - Returns to previous task/movement
   - Can pass through the doorway

4. **Auto-Close**: After the last colonist leaves the queue:
   - 1-second delay begins
   - Door starts closing animation
   - Takes 2 seconds to fully close

### Enemy Interaction
- Enemies can attack doors to break through
- Doors have health that must be depleted
- Broken doors are removed from the building list

### Visual Features
- **Animated Panels**: Split doors that slide horizontally
- **Wooden Frame**: Always visible frame around door
- **Detail Lines**: Vertical lines on door panels for texture
- **Smooth Animation**: Linear interpolation of panel position

## Files Modified

1. **src/game/systems/doorSystem.ts**
   - Updated `DOOR_OPEN_TIME` from 0.5 to 2.0 seconds
   - Updated `DOOR_CLOSE_TIME` from 0.5 to 2.0 seconds
   - Increased `isNearDoor()` range from 2 to 3 tiles

2. **src/game/colonist_systems/colonistFSM.ts**
   - Updated `checkDoorInteraction()` to detect doors at 3 tiles
   - Ensures colonists stop before reaching door
   - Proper state transition to `waitingAtDoor`

## Testing the Door

1. **Build a Door**: Select door from build menu, place in a wall
2. **Send Colonist Through**: Order a colonist to work/move past the door
3. **Observe Behavior**:
   - Colonist should stop ~3 tiles from door
   - Door panels slide apart (takes 2 seconds)
   - Colonist waits with "waitingAtDoor" state visible
   - When fully open, colonist proceeds through
   - Door waits 1 second, then closes over 2 seconds

4. **Multiple Colonists**: Send several colonists through
   - Door stays open while anyone is in queue
   - Only closes after everyone has passed

## RimWorld Fidelity

This implementation closely matches RimWorld's door behavior:
- ✅ Animated opening/closing
- ✅ Pawns wait for doors to open
- ✅ Doors stay open for multiple pawns
- ✅ Auto-close after delay
- ✅ Can be attacked and destroyed
- ✅ Block pathfinding when closed
- ✅ Allow passage when open

## Performance Notes

- Doors update every frame using state machine
- `doorProgress` is smoothly interpolated
- No performance impact with multiple doors
- Detection range increased but still efficient (simple distance check)
