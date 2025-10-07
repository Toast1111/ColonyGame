# Colony Game Documentation

Welcome to the Colony Game documentation! All technical documentation has been organized by system.

## 📁 Documentation Structure

### 🔧 [Refactoring](./refactoring/)
Architecture improvements and code organization:
- Game.ts refactoring phases (systems extraction)
- UI/Input manager creation
- Testing guides

### 🏥 [Medical System](./medical/)
Health, injury, and treatment systems:
- Medical AI implementation
- Treatment types and workflows
- Integration guides and fixes

### 🎯 [Work Priority](./work-priority/)
RimWorld-style work assignment system:
- Priority matrix implementation
- UI fixes (z-index, DPR, responsiveness)
- Modal panel system

### 🗺️ [Navigation](./navigation/)
Enemy AI and pathfinding for non-colonist entities:
- Enemy navigation system
- Complete navigation overhaul
- Testing and quickref guides

### 🌍 [Regions](./regions/)
Region-based pathfinding and door systems:
- Region implementation
- Door integration
- Visual debugging guides

### 🧭 [Pathfinding](./pathfinding/)
A* pathfinding and grid optimization:
- Floor speed integration
- Bug fixes
- Visual debugging

### 🏔️ [Terrain](./terrain/)
Terrain generation and management:
- Terrain system architecture
- Migration guides
- Navigation integration

### 🟦 [Floor System](./floor-system/)
Floor tiles and speed modifiers:
- Floor implementation
- Speed calculation
- System completion guide

### 🚪 [Door System](./door-system/)
Animated doors and building interactions:
- Door animation system
- Region integration
- Implementation guide

### ⚔️ [Combat](./combat/)
Combat mechanics and damage systems:
- Combat manager implementation
- Complete combat guide

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
- [Region Quick Start](./regions/REGION_QUICK_START.md) - Region system overview
- [Combat Manager Complete](./combat/COMBAT_MANAGER_COMPLETE.md) - Combat system guide

## 📊 Documentation Count

```
Total Documents: 57
├── Refactoring:    6 docs
├── Medical:       11 docs  
├── Work Priority:  8 docs
├── Navigation:     4 docs
├── Regions:        7 docs
├── Pathfinding:    4 docs
├── Terrain:        3 docs
├── Floor System:   3 docs
├── Door System:    2 docs
├── Combat:         2 docs
└── Bug Fixes:      1 doc
```

## 🔍 Finding Documentation

### By Feature
- **Adding new buildings?** → See refactoring docs for architecture
- **Fixing colonist behavior?** → See medical or work priority
- **Enemy AI issues?** → See navigation docs
- **Pathfinding problems?** → See pathfinding or regions
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
├── navigation/          - Pathfinding & regions
├── rimworld-systems/    - RimWorld-inspired features
└── ui/                  - UI rendering
```

See [Refactoring Plan](./refactoring/REFACTORING_PLAN.md) for full architecture details.

---

**Last Updated**: October 7, 2025  
**Game Version**: Alpha  
**Documentation Status**: Organized ✅
