# Debug Console Quick Reference

**Press ` (backtick) to open console**

## Essential Commands

```bash
# GAME CONTROL
toggle enemies           # Disable night enemy spawns ⭐
speed 3                  # 3x game speed
pause                    # Pause/unpause

# RESOURCES
resources unlimited      # Infinite everything ⭐
resources add wood 500   # Add 500 wood
resources                # Show amounts

# COLONISTS
spawn colonist 3         # Spawn 3 colonists
select next              # Select next colonist
heal all                 # Heal everyone ⭐
godmode all              # Make invincible ⭐

# ITEMS
give pistol all          # Arm everyone
give medicine selected   # Give medicine to selected ⭐
give bandage John        # Give bandages to John ⭐

# COMBAT
spawn enemy 5            # Spawn 5 enemies
kill enemies             # Clear all enemies ⭐
injure gunshot 30        # Shoot selected colonist

# MEDICAL
health check             # Show health stats
injure burn 15           # Create burn injury
heal                     # Full heal selected ⭐

# UTILITIES
clear messages           # Clear message log
help                     # List all commands
help give                # Help for specific command
```

## Common Workflows

### Creative/Sandbox Mode
```bash
toggle enemies
resources unlimited
speed 3
```

### Combat Testing
```bash
spawn enemy 10
give pistol all
godmode all
```

### Medical Testing
```bash
injure gunshot 30
give medicine
health check
heal
```

## Target Selection

Most commands accept targets:
- `selected` - Currently selected (default)
- `all` - All colonists
- `John` - By name (partial match)

Examples:
```bash
heal selected    # Heal selected
give pistol all  # Give to all
kill John        # Kill John
```

## Tips

- Use **↑/↓** arrows for command history
- Commands are case-insensitive
- Press **Esc** to close console
- Use `help <cmd>` for detailed info

---

**Full Documentation:** See `docs/DEBUG_CONSOLE_COMMANDS.md`
