# Colony Game - Change Log

## v0.8.0 - Enhanced UI & Zoom Features
*December 2024*

### 🎯 New Features
- **Zoom Overlay System**: When fully zoomed out, colonists are highlighted in blue and enemies in red
- **Off-screen Arrows**: Blue arrows point to colonists outside the viewport when zoomed out
- **Enhanced Changelog Modal**: Added this changelog system with GitHub integration
- **Improved Mobile UI**: Colonist profile now appears in top-left on both mobile and PC

### 🛠️ Improvements  
- Enhanced touch event handling with better error handling
- Improved build menu type safety for zones and buildings
- Better canvas element validation in touch handlers
- Colonist profile positioning consistency across platforms

### 🐛 Bug Fixes
- Fixed runtime errors when clicking build menu items with touch input
- Fixed type mismatches in modern build menu for mining zones
- Added safety checks for canvas element access in touch events
- Resolved touch zone drag issues

---

## v0.7.0 - Research & Work Systems
*November 2024*

### 🎯 New Features
- **Research System**: Complete technology tree with categories and dependencies
- **Work Priority Panel**: RimWorld-style colonist job assignment
- **Medical System**: Comprehensive health, injuries, and treatment
- **Building Inventory**: Multi-slot storage system for buildings

### 🛠️ Improvements
- Enhanced FSM system for colonist AI with 20+ states  
- Improved pathfinding with navigation manager
- Better resource management with capacity limits
- Mobile controls and touch gesture support

---

## v0.6.0 - Core Gameplay
*October 2024*

### 🎯 New Features
- **Colony Management**: Build and manage your colony
- **Colonist System**: AI-driven colonists with needs and skills
- **Combat System**: Weapons, enemies, and tactical combat
- **Resource Gathering**: Wood, stone, food, and material management
- **Construction System**: Buildings, walls, and infrastructure

### 🛠️ Foundation
- Canvas-based 2D rendering engine
- Tile-based world system (240×240 tiles)  
- Audio system with spatial sound
- Performance optimization systems
- Debug console for development

---

*For the latest updates and detailed commit history, visit our [GitHub repository](https://github.com/Toast1111/ColonyGame/releases).*