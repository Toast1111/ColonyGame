# Debug Console Enhancement - Summary

## Overview

Added comprehensive debug console commands to improve testing and development workflow for the Colony Game. The console can be opened by pressing the **`** (backtick) key.

## New Commands Added

### 1. **Toggle Enemy Spawns** ⭐
```bash
toggle enemies
```
- Disables/enables night-time enemy wave spawning
- Perfect for peaceful building mode or testing colonist systems without combat
- Integrated with `Game.ts` dayTick() to check `disableEnemySpawns` flag

### 2. **Resource Management** ⭐
```bash
resources unlimited          # Set all resources to 999999
resources add wood 500       # Add specific amount
resources set food 100       # Set to exact value
resources                    # Show current resources
```
- Complete resource control for testing
- Supports all resource types: wood, stone, food, medicine, herbal, wheat, bread
- Useful for testing building construction without gathering

### 3. **Enhanced Give Command** ⭐
```bash
give <item> [target]
```
**Items:**
- `pistol` - Equip weapon
- `medicine` - Give 5 medicine kits
- `bandage` - Give 10 bandages  
- `food` - Give 10 bread

**Targets:**
- `selected` - Currently selected colonist (default)
- `all` - All living colonists
- `<name>` - Colonist by name (partial match)

**Examples:**
```bash
give pistol all         # Arm all colonists
give medicine John      # Give medicine to John
```

### 4. **Kill Command** ⭐
```bash
kill enemies            # Kill all enemies
kill selected           # Kill selected colonist
kill all                # Kill all colonists
kill John               # Kill colonist by name
```
- Instant entity removal for testing
- Useful for clearing enemies or testing death systems

### 5. **Heal Command** ⭐
```bash
heal selected           # Fully heal selected colonist
heal all                # Heal everyone
heal Sarah              # Heal specific colonist
```
- Restores HP to 100
- Removes all injuries from health system
- Clears hunger and fatigue
- Resets all health stats (consciousness, mobility, manipulation)

### 6. **Godmode** ⭐
```bash
godmode selected        # Toggle godmode for selected
godmode all             # Toggle for all colonists
```
- Makes colonists invincible
- No damage from any source
- No hunger accumulation
- No fatigue accumulation
- Perfect for testing without interruption

## Implementation Details

### Files Modified

1. **`src/game/ui/debugConsole.ts`** (Main changes)
   - Updated `help` command to list new commands
   - Enhanced `toggle` command with `enemies` flag
   - Completely rewrote `give` command to support multiple items and target selection
   - Added `resources` command with unlimited/add/set/show actions
   - Added `kill` command for entity removal
   - Added `heal` command for full restoration
   - Added `godmode` command for invincibility

2. **`src/game/Game.ts`**
   - Modified `dayTick()` to check `disableEnemySpawns` flag before calling `spawnWave()`
   - Prevents enemy spawning when toggle is disabled

3. **`src/game/health/healthSystem.ts`**
   - Added godmode check in `applyDamageToColonist()`
   - Returns early without applying damage if `colonist.godmode` is true

4. **`src/game/colonist_systems/colonistFSM.ts`**
   - Added godmode check in hunger/fatigue system
   - If godmode enabled, sets hunger and fatigue to 0 instead of accumulating
   - Prevents godmode colonists from needing sleep or food

### Technical Features

**Target Selection System:**
- `selected` - Uses `game.selColonist`
- `all` - Filters `game.colonists` for alive colonists
- `<name>` - Finds colonist by partial name match (case-insensitive)

**Resource System Integration:**
- Uses `game.resourceSystem.setResource()` for unlimited/set
- Uses `game.resourceSystem.getResource()` for add operations
- Uses `game.resourceSystem.getResourcesRef()` for display

**Item Database Integration:**
- Uses `itemDatabase.createItem()` for spawning items
- Supports quality levels (currently 'normal')
- Automatically initializes colonist inventories if missing

**Godmode Protection:**
- Damage immunity via `applyDamageToColonist()` early return
- Hunger/fatigue immunity via FSM state update bypass
- Maintains HP/hunger/fatigue at optimal levels

## Testing Workflows

### Peaceful Building Mode
```bash
toggle enemies          # No enemy waves
resources unlimited     # Infinite materials
speed 3                 # Build faster
```

### Medical System Testing
```bash
select next             # Select a colonist
injure gunshot 30       # Create injury
give medicine           # Give healing items
health check            # Verify injury status
heal                    # Instant recovery
```

### Combat Testing
```bash
spawn enemy 10          # Spawn test enemies
give pistol all         # Arm colonists
godmode all             # Make invincible
kill enemies            # Clear when done
```

### Resource Testing
```bash
resources               # Check current amounts
resources add wood 1000 # Test gathering systems
resources unlimited     # Bypass constraints
```

## Documentation

Created comprehensive documentation at:
- **`docs/DEBUG_CONSOLE_COMMANDS.md`** - Full command reference with examples and workflows

## Benefits

1. **Faster Development** - Skip resource gathering/enemy waves during feature testing
2. **Better Testing** - Precise control over game state for bug reproduction
3. **Quality Assurance** - Easy setup of specific scenarios
4. **Player Experience** - Future sandbox/creative mode foundation
5. **Medical System Testing** - Easy injury creation and healing
6. **Combat Balancing** - Quick enemy spawning and colonist protection

## Command Summary

| Command | Description |
|---------|-------------|
| `toggle enemies` | Disable/enable night spawns |
| `resources unlimited` | Infinite resources |
| `resources add <type> <amt>` | Add resources |
| `give <item> [target]` | Give items to colonists |
| `kill [target]` | Kill entities |
| `heal [target]` | Fully heal colonists |
| `godmode [target]` | Toggle invincibility |
| `spawn colonist [n]` | Spawn new colonists |
| `health check` | View health status |
| `injure <type> [dmg] [target]` | Create injuries |

## Notes

- All commands are safe to use (no crashes or corruption)
- Godmode state persists until toggled off
- Enemy spawn toggle persists across nights
- Resource changes are permanent (save game if needed)
- Commands are case-insensitive
- Use `help <command>` for detailed usage

## Future Enhancements

Potential additions:
- `weather` command to change weather
- `time` command to skip to day/night
- `skill` command to modify colonist skills
- `building` command to instant-build structures
- `save/load` commands for game state snapshots
