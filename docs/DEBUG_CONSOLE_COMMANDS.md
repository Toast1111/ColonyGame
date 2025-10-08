# Debug Console Commands

Press **`** (backtick/tilde key) to open the debug console.

## Quick Reference

| Command | Description |
|---------|-------------|
| `help` | List all commands |
| `help <cmd>` | Show help for specific command |

## Toggle Commands

### `toggle <flag>`
Toggle debug visualization or game features.

**Flags:**
- `nav` - Show navigation grid
- `colonists` - Show colonist debug info
- `combat` - Show combat debug info
- `enemies` - **Toggle enemy spawning at night (NEW!)** ⭐

**Examples:**
```
toggle enemies    # Disable/enable night enemy waves
toggle nav        # Show pathfinding grid
toggle combat     # Show combat ranges
```

## Spawning Commands

### `spawn <type> [count]`
Spawn entities in the world.

**Types:**
- `enemy [n]` - Spawn enemies (default: 1)
- `colonist [n]` - Spawn colonists (default: 1)

**Examples:**
```
spawn enemy 5       # Spawn 5 enemies
spawn colonist 3    # Spawn 3 new colonists
```

## Resource Commands ⭐ NEW!

### `resources [action]`
Manage colony resources.

**Actions:**
- `unlimited` - Set all resources to 999999 (god mode)
- `add <type> <amount>` - Add resources
- `set <type> <amount>` - Set resource to exact value
- `show` - Display current resources (default)

**Resource Types:**
- `wood`, `stone`, `food`, `medicine`, `herbal`, `wheat`, `bread`

**Examples:**
```
resources unlimited       # Infinite resources
resources add wood 500    # Add 500 wood
resources set food 100    # Set food to 100
resources                 # Show all resources
```

## Item Commands

### `give <item> [target]` ⭐ UPDATED!
Give items to colonists.

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
```
give pistol all         # Arm all colonists
give medicine selected  # Give medicine to selected
give bandage John       # Give bandages to John
```

## Health & Injury Commands

### `injure [type] [damage] [target]`
Injure colonist(s) for testing medical system.

**Injury Types:**
- `cut` (default: 8 dmg)
- `bruise` (default: 6 dmg)
- `burn` (default: 12 dmg)
- `bite` (default: 10 dmg)
- `gunshot` (default: 25 dmg)
- `fracture` (default: 20 dmg)

**Examples:**
```
injure gunshot 30 selected   # Shoot selected colonist
injure burn 15 all           # Burn all colonists
injure fracture              # Default fracture damage
```

### `heal [target]` ⭐ NEW!
Fully heal colonist(s) - restores HP, removes all injuries, clears hunger/fatigue.

**Examples:**
```
heal selected    # Heal selected colonist
heal all         # Heal everyone
heal Sarah       # Heal Sarah
```

### `health <action> [target]`
Check or initialize health system.

**Actions:**
- `check` - Display health status
- `init` - Initialize health system

**Examples:**
```
health check selected   # Check selected colonist's health
health init all         # Initialize health for all
```

## Combat Commands ⭐ NEW!

### `kill [target]`
Kill entities for testing.

**Targets:**
- `enemies` - Kill all enemies (default)
- `selected` - Kill selected colonist
- `all` - Kill all colonists
- `<name>` - Kill colonist by name

**Examples:**
```
kill enemies     # Clear all enemies
kill selected    # Kill selected colonist
kill John        # Kill John
```

### `godmode [target]` ⭐ NEW!
Toggle invincibility - no damage, hunger, or fatigue.

**Examples:**
```
godmode selected   # Make selected colonist invincible
godmode all        # Make all colonists invincible
godmode John       # Toggle godmode for John
```

## Selection Commands

### `select next`
Select the next living colonist.

**Example:**
```
select next   # Cycle through colonists
```

## Game Control Commands

### `speed <multiplier>`
Set game speed.

**Examples:**
```
speed 1    # Normal speed
speed 6    # Fast forward
speed 0.5  # Slow motion
```

### `pause`
Toggle game pause.

### `clear <type>`
Clear UI elements.

**Types:**
- `messages` - Clear message log
- `bullets` - Clear all bullets

**Examples:**
```
clear messages   # Clear message history
clear bullets    # Remove all bullets
```

---

## Usage Tips

1. **Press `** to open console
2. Type command and press **Enter**
3. Use **↑/↓** arrows to scroll through command history
4. Press **Esc** to close console

## Common Workflows

### Testing Medical System
```
select next              # Select a colonist
injure gunshot 30        # Wound them
give medicine            # Give them medicine
```

### Peaceful Building Mode
```
toggle enemies           # Disable night attacks
resources unlimited      # Infinite resources
speed 3                  # Build faster
```

### Combat Testing
```
spawn enemy 10           # Spawn enemies
give pistol all          # Arm colonists
godmode all              # Make colonists invincible
```

### Debugging Hunger/Fatigue
```
select next              # Select colonist
health check             # Check current status
heal                     # Reset to healthy state
```
