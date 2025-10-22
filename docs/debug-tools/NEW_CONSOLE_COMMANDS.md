# New Debug Console Commands

This document describes the new console commands added for faster testing and debugging. Press **backtick (`)** to open the debug console.

## Farm Commands

### `farm ready` or `farm harvest`
Instantly makes all completed farms ready to harvest (sets growth to 100%).

**Usage:**
```
farm ready
farm harvest
```

**Output:** `5 farm(s) ready to harvest`

### `farm grow [amount]`
Adds growth progress to all farms. Default is 0.5 (50%).

**Usage:**
```
farm grow          # Add 50% growth
farm grow 0.25     # Add 25% growth
farm grow 1        # Make fully ready
```

**Output:** `added 50% growth to 5 farm(s)`

### `farm clear`
Resets all farm growth to 0%.

**Usage:**
```
farm clear
```

**Output:** `cleared growth from 5 farm(s)`

---

## Building Commands

### `building complete` or `building finish`
Instantly completes all buildings under construction.

**Usage:**
```
building complete
building finish
```

**Output:** `completed 3 building(s)`

### `building progress [amount]`
Adds build progress to all buildings under construction. Default is 0.5 (50%).

**Usage:**
```
building progress       # Add 50% progress
building progress 0.25  # Add 25% progress
building progress 1     # Complete all
```

**Output:** `added 50% progress to 3 building(s)`

### `building destroy` or `building delete`
Deletes the currently selected building.

**Usage:**
```
building destroy
building delete
```

**Output:** `deleted stove` or `no building selected`

---

## Stove Commands

### `stove fill` or `stove wheat`
Fills all stoves with wheat (10 units per stove).

**Usage:**
```
stove fill
stove wheat
```

**Output:** `filled 2 stove(s) with wheat`

**Notes:**
- Only fills stoves that have inventory space
- Useful for testing cooking system quickly

### `stove clear`
Clears all stove inventories and resets cooking progress.

**Usage:**
```
stove clear
```

**Output:** `cleared 2 stove(s)`

---

## Time Commands

### `time day` or `time morning`
Sets time to 6:00 AM (morning).

**Usage:**
```
time day
time morning
```

**Output:** `set time to 6:00 AM (morning)`

### `time noon` or `time midday`
Sets time to 12:00 PM (noon).

**Usage:**
```
time noon
time midday
```

**Output:** `set time to 12:00 PM (noon)`

### `time night` or `time evening`
Sets time to 8:00 PM (night).

**Usage:**
```
time night
time evening
```

**Output:** `set time to 8:00 PM (night)`

### `time midnight`
Sets time to 12:00 AM (midnight).

**Usage:**
```
time midnight
```

**Output:** `set time to 12:00 AM (midnight)`

### `time <hour>`
Sets time to specific hour (0-23).

**Usage:**
```
time 6     # 6:00 AM
time 14    # 2:00 PM
time 22    # 10:00 PM
```

**Output:** `set time to 14:00`

---

## Tree Commands

### `tree regrow` or `tree restore`
Respawns all trees (useful after clearing forests).

**Usage:**
```
tree regrow
tree restore
```

**Output:** `regenerated 100 trees`

**Notes:**
- Tree count calculated from world size
- Randomly places trees across the map

### `tree clear` or `tree remove`
Removes all trees from the map.

**Usage:**
```
tree clear
tree remove
```

**Output:** `removed 87 trees`

---

## Research Commands

### `research complete` or `research all`
Completes all research nodes instantly.

**Usage:**
```
research complete
research all
```

**Output:** `completed 43 research node(s)`

**Notes:**
- Unlocks all research nodes
- Useful for testing late-game content

### `research reset` or `research clear`
Resets all research progress and clears completed nodes.

**Usage:**
```
research reset
research clear
```

**Output:** `reset all research progress`

### `research start <id>`
Starts specific research by ID.

**Usage:**
```
research start basicFarming
research start steelProduction
```

**Output:** `started research: basicFarming` or `failed to start research: invalid_id`

---

## Quick Testing Workflows

### Test Cooking System
```
farm ready              # Make farms ready
building complete       # Finish any construction
stove fill              # Add wheat to stoves
time day                # Set to morning
```

### Test Late Game Content
```
research complete       # Unlock everything
resources unlimited     # Infinite resources
building complete       # Finish construction
spawn colonist 5        # More colonists
```

### Fast Resource Gathering
```
tree regrow            # Respawn trees for wood
farm ready             # Instant wheat harvest
time day               # Set to working hours
```

### Clean Slate Testing
```
kill enemies           # Remove all enemies
tree clear             # Clear forest
farm clear             # Reset farms
research reset         # Reset tech tree
```

---

## Command Summary

| Command | Description | Example |
|---------|-------------|---------|
| `farm ready` | Instant harvest | `farm ready` |
| `farm grow [amt]` | Add growth % | `farm grow 0.5` |
| `farm clear` | Reset growth | `farm clear` |
| `building complete` | Finish all construction | `building complete` |
| `building progress [amt]` | Add build % | `building progress 0.5` |
| `building destroy` | Delete selected building | `building destroy` |
| `stove fill` | Add wheat to stoves | `stove fill` |
| `stove clear` | Clear stove inventories | `stove clear` |
| `time day/noon/night` | Set time of day | `time noon` |
| `time <hour>` | Set specific hour | `time 14` |
| `tree regrow` | Respawn all trees | `tree regrow` |
| `tree clear` | Remove all trees | `tree clear` |
| `research complete` | Unlock all research | `research complete` |
| `research reset` | Clear research progress | `research reset` |
| `research start <id>` | Start specific research | `research start basicFarming` |

---

## Implementation Details

**File:** `src/game/ui/debugConsole.ts`

**Lines Added:** ~200 lines (7 new commands with multiple sub-commands)

**Pattern:**
```typescript
reg("commandName", (g, args) => {
  const action = (args[0] || "default").toLowerCase();
  // Command logic
  return "result message";
}, "help text — description");
```

**Integration:**
- Commands use existing game state access patterns
- No new dependencies required
- All commands check for valid state before executing
- User-friendly error messages for invalid usage

---

## See Also

- [DEBUG_CONSOLE_QUICKREF.md](./DEBUG_CONSOLE_QUICKREF.md) - Original console commands
- [debugConsole.ts](../../src/game/ui/debugConsole.ts) - Implementation
