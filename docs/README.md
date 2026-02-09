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
- [Intent-Based Actions](./refactoring/INTENT_BASED_ACTION_SYSTEM.md) - Action system design
- [Worker Pool Removal](./refactoring/WORKER_POOL_REMOVAL.md) - Async optimization

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
- [Async Pathfinding](./pathfinding/ASYNC_PATHFINDING_WITHOUT_WORKERS.md) - Performance optimization

### 🏔️ [Terrain](./terrain/)
**Terrain generation and management**
- [System Overview](./terrain/TERRAIN_SYSTEM.md) - Terrain architecture
- [Migration Guide](./terrain/TERRAIN_MIGRATION_GUIDE.md) - Upgrading to new system
- [Nav Integration](./terrain/TERRAIN_AND_NAV_SUMMARY.md) - Navigation integration
- [Q&A](./terrain/TERRAIN_ANSWER.md) - Common questions
- [Mountain System Testing](./terrain/MOUNTAIN_SYSTEM_TESTING.md) - Mountain mechanics
- [Mountain Fix Summary](./terrain/MOUNTAIN_FIX_SUMMARY.md) - Bug fixes
- [Mountain Fix Testing](./terrain/MOUNTAIN_FIX_TESTING.md) - Test procedures
- [Unified Tree Layout](./terrain/UNIFIED_TREE_LAYOUT.md) - Tree rendering

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

### ⚔️ [Combat & Combat Systems](./combat/ & ./combat-systems/)
**Combat mechanics and damage systems**
- [Combat Manager Complete](./combat/COMBAT_MANAGER_COMPLETE.md) - Full implementation
- [Combat Guide](./combat/COMBAT_MANAGER_GUIDE.md) - Usage guide
- [Weapon Equipment System](./combat-systems/WEAPON_EQUIPMENT_SYSTEM_COMPLETE.md) - Equipment mechanics

### 🏗️ [Building Systems](./building-systems/)
**Building mechanics and interactions**
- [Building Inventory System](./building-systems/BUILDING_INVENTORY_SYSTEM.md) - Inventory mechanics
- [Bed Interaction Redesign](./building-systems/BED_INTERACTION_SYSTEM_REDESIGN.md) - Bed system

### 🎵 [Audio](./audio/)
**Sound systems and spatial audio**
- [Building Audio System](./audio/BUILDING_AUDIO_SYSTEM.md) - Building sound integration

### 🐛 [Bug Fixes](./bug-fixes/)
**General bug fixes and patches**
- [Bug Fixes Summary](./bug-fixes/BUG_FIXES_SUMMARY.md) - Overview
- [Fix Summary](./bug-fixes/FIX_SUMMARY.md) - Critical fixes
- [Hauling & Resources](./bug-fixes/HAULING_AND_RESOURCES_FIXES.md) - Resource system fixes

### 🎓 [Tutorial System](./tutorial/)
**In-game tutorial and onboarding**
- [Tutorial System](./tutorial/TUTORIAL_SYSTEM.md) - Tutorial architecture
- [Tutorial Complete](./tutorial/TUTORIAL_IMPLEMENTATION_COMPLETE.md) - Implementation

### 🔬 [Research System](./research/)
**Technology and progression**
- [Research System](./research/RESEARCH_SYSTEM_IMPLEMENTATION.md) - Core system
- [Research Tree Redesign](./research/RESEARCH_TREE_REDESIGN_COMPLETE.md) - Tree structure

### 🛠️ [Debug Tools](./debug-tools/)
**Development and debugging utilities**
- [Debug Console Commands](./debug-tools/DEBUG_CONSOLE_COMMANDS_SUMMARY.md) - Console reference

### 🎨 [UI Systems](./ui-systems/)
**User interface components**
- [Camera Follow Unlock](./ui-systems/CAMERA_FOLLOW_UNLOCK_FEATURE.md) - Camera controls

### 📋 [Reference](./reference/)
**Quick reference guides**
- [Colonist Base Stats](./reference/COLONIST_BASE_STATS_REFERENCE.md) - Stat reference
- [Hauling Quick Reference](./reference/HAULING_QUICKREF.md) - Hauling system
- [Tutorial Quick Reference](./reference/TUTORIAL_QUICKREF.md) - Tutorial commands

### 🍳 [Cooking Systems](./cooking-systems/)
**Food preparation and cooking**
- Detailed cooking mechanics documentation

### 📚 [General](./general/)
**Project-wide documentation**
- [Changelog](./general/CHANGELOG.md) - Version history
- [Recent Changes](./general/RECENT_CHANGES.md) - Latest updates
- [Security Summary](./general/SECURITY_SUMMARY.md) - Security considerations

### 📦 [Archived](./archived/)
**Historical documentation**
- Older documentation moved here for reference

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
Total Documents: 250+
├── Refactoring:        8 docs
├── Work Priority:      8 docs
├── Medical:           14 docs  
├── Navigation:         5 docs
├── Pathfinding:        5 docs
├── Terrain:            8 docs
├── Floor System:       4 docs
├── Door System:        2 docs
├── Combat:             3 docs
├── Building Systems:   6 docs
├── Audio:             20 docs
├── Bug Fixes:         11 docs
├── Tutorial:           2 docs
├── Research:           7 docs
├── Debug Tools:        7 docs
├── UI Systems:         5 docs
├── Cooking Systems:    5 docs
├── Reference:          3 docs
├── General:            5 docs
└── Archived:          21 docs
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
