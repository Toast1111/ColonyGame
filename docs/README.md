# Colony Game Documentation

Welcome to the Colony Game documentation! All technical documentation has been organized by system.

## 📁 Documentation Structure

### 🔧 [Refactoring](./refactoring/)
**Architecture improvements and code organization**
- [Refactoring Plan](./refactoring/REFACTORING_PLAN.md) - Original extraction plan
- [Refactoring Roadmap](./refactoring/GAME_TS_REFACTORING_ROADMAP.md) - Complete strategy ✨ NEW
- [Phase 1 Summary](./refactoring/REFACTORING_SUMMARY.md) - Systems creation (GameState, TimeSystem, etc.)
- [Phase 2 Success](./refactoring/REFACTORING_SUCCESS.md) - Systems integration
- [UI Refactoring](./refactoring/UI_REFACTORING_SUMMARY.md) - InputManager & UIManager extraction
- [UI Testing Guide](./refactoring/UI_REFACTORING_TEST_GUIDE.md) - Comprehensive test checklist

### � [Work Priority System](./work-priority/)
**RimWorld-style work assignment system**
- [System Overview](./work-priority/WORK_PRIORITY_SYSTEM.md) - Core architecture
- [Implementation](./work-priority/WORK_PRIORITY_IMPLEMENTATION.md) - Full implementation guide
- [Z-Index Fix](./work-priority/WORK_PRIORITY_ZINDEX_FIX.md) - Mobile controls overlay fix
- [DPR Fix](./work-priority/WORK_PRIORITY_DPR_FIX.md) - High-resolution display support
- [Modal Fix](./work-priority/WORK_PRIORITY_MODAL_FIX.md) - Full-screen modal behavior
- [Final Summary](./work-priority/WORK_PRIORITY_FINAL_SUMMARY.md) - Complete feature summary

### 🏥 [Medical System](./medical/)
**Health, injury, and treatment systems**
- [System Overview](./medical/MEDICAL_README.md) - Medical system architecture
- [Complete Guide](./medical/MEDICAL_SYSTEM_COMPLETE.md) - Full implementation
- [AI Refactor](./medical/MEDICAL_AI_REFACTOR_SUMMARY.md) - FSM integration
- [Visual Guide](./medical/MEDICAL_VISUAL_GUIDE.md) - UI and workflows
- [Test Guide](./medical/MEDICAL_TEST_GUIDE.md) - Testing procedures

### 🗺️ [Navigation](./navigation/)
**Enemy AI and pathfinding for non-colonist entities**
- [Complete System](./navigation/COMPLETE_NAVIGATION_SYSTEM.md) - Full navigation overhaul
- [Enemy Nav Upgrade](./navigation/ENEMY_NAVIGATION_UPGRADE.md) - Enemy pathfinding
- [Implementation](./navigation/ENEMY_NAV_IMPLEMENTATION.md) - Technical details
- [Quick Reference](./navigation/ENEMY_NAV_QUICKREF.md) - Quick lookup
- [Testing](./navigation/ENEMY_NAV_TESTING.md) - Test procedures

### 🧭 [Pathfinding](./pathfinding/)
**A* pathfinding and grid optimization**
- [Bug Fixes](./pathfinding/PATHFINDING_BUG_FIX.md) - Critical pathfinding fixes
- [Floor Integration](./pathfinding/PATHFINDING_FLOOR_FIX.md) - Floor speed modifiers
- [Floor Testing](./pathfinding/PATHFINDING_FLOOR_TEST.md) - Floor system tests
- [Visual Guide](./pathfinding/PATHFINDING_VISUAL_GUIDE.md) - Debug visualization

### 🏔️ [Terrain](./terrain/)
**Terrain generation and management**
- [System Overview](./terrain/TERRAIN_SYSTEM.md) - Terrain architecture
- [Migration Guide](./terrain/TERRAIN_MIGRATION_GUIDE.md) - Upgrading to new system
- [Nav Integration](./terrain/TERRAIN_AND_NAV_SUMMARY.md) - Navigation integration
- [Q&A](./terrain/TERRAIN_ANSWER.md) - Common questions

### 🟦 [Floor System](./floor-system/)
**Floor tiles and speed modifiers**
- [System Overview](./floor-system/FLOOR_SYSTEM.md) - Floor architecture
- [Complete Guide](./floor-system/FLOOR_SYSTEM_COMPLETE.md) - Full implementation
- [Speed Fix](./floor-system/FLOOR_SPEED_FIX.md) - Speed calculation fixes
- [Quick Reference](./floor-system/FLOOR_QUICKREF.md) - Quick lookup

### 🚪 [Door System](./door-system/)
**Animated doors and building interactions**
- [Door System](./door-system/DOOR_SYSTEM.md) - Core door mechanics
- [Animation Update](./door-system/DOOR_ANIMATION_UPDATE.md) - Animation improvements

### ⚔️ [Combat](./combat/)
**Combat mechanics and damage systems**
- [Combat Manager Complete](./combat/COMBAT_MANAGER_COMPLETE.md) - Full implementation
- [Combat Guide](./combat/COMBAT_MANAGER_GUIDE.md) - Usage guide

### 🐛 [Bug Fixes](./STATE_FLIPPING_BUG_FIX.md)
General bug fixes and patches

## 🚀 Quick Links

### Getting Started
- [Main README](../README.md) - Project overview and setup
- [Refactoring Plan](./refactoring/REFACTORING_PLAN.md) - Architecture roadmap

### Recent Updates
- [UI Refactoring Summary](./refactoring/UI_REFACTORING_SUMMARY.md) - Latest refactoring phase
- [UI Test Guide](./refactoring/UI_REFACTORING_TEST_GUIDE.md) - Testing checklist
- [Work Priority Final](./work-priority/WORK_PRIORITY_FINAL_SUMMARY.md) - Work system completion

### System Guides
- [Medical System Complete](./medical/MEDICAL_SYSTEM_COMPLETE.md) - Full medical implementation
- [Combat Manager Complete](./combat/COMBAT_MANAGER_COMPLETE.md) - Combat system guide

## 📊 Documentation Count

```
Total Documents: 51+
├── Refactoring:    6 docs
├── Work Priority:  8 docs
├── Medical:       14 docs  
├── Navigation:     5 docs
├── Pathfinding:    4 docs
├── Terrain:        4 docs
├── Floor System:   4 docs
├── Door System:    2 docs
├── Combat:         2 docs
└── General:        2 docs
```

## 🔍 Finding Documentation

### By Feature
- **Adding new buildings?** → See refactoring docs for architecture
- **Fixing colonist behavior?** → See medical or work priority
- **Enemy AI issues?** → See navigation docs
- **Pathfinding problems?** → See pathfinding or navigation
- **UI/Input bugs?** → See refactoring (InputManager/UIManager)

### By Task
- **Implementing a new system** → Check similar system's completion guide
- **Fixing a bug** → Check that system's fix history
- **Testing** → Check system's test guide
- **Understanding architecture** → See refactoring docs

## 📝 Contributing to Docs

When adding new documentation:

1. **Choose the right category** - Put docs in the appropriate subfolder
2. **Use descriptive names** - `SYSTEM_FEATURE_TYPE.md` format
3. **Update this index** - Add your doc to the relevant section
4. **Cross-reference** - Link to related docs

### Naming Conventions
- `SYSTEM_COMPLETE.md` - Final implementation summary
- `SYSTEM_GUIDE.md` - How-to guide
- `SYSTEM_FIX.md` - Bug fix documentation
- `SYSTEM_TEST_GUIDE.md` - Testing procedures
- `SYSTEM_SUMMARY.md` - Overview/status

## 🏗️ Architecture Overview

The game uses a modular architecture with clear separation of concerns:

```
src/game/
├── Game.ts              - Main coordinator (being refactored)
├── core/                - Core systems (GameState)
├── systems/             - Time, Camera, Resources
├── managers/            - Input, UI ✨ NEW
├── colonist_systems/    - Colonist AI & FSM
├── combat/              - Combat mechanics
├── health/              - Medical systems
├── navigation/          - Pathfinding & enemy AI
├── rimworld-systems/    - RimWorld-inspired features
└── ui/                  - UI rendering
```

See [Refactoring Plan](./refactoring/REFACTORING_PLAN.md) for full architecture details.

---

**Last Updated**: October 7, 2025  
**Game Version**: Alpha  
**Documentation Status**: Organized ✅
