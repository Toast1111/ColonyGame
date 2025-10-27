# Tutorial System - Quick Reference

## For Players

### First Time Playing
- Tutorial auto-starts when you begin a new game
- Shows intro cinematic then 9 interactive steps
- Game is paused - take your time!

### Skipping
- Press **ESC** at any time to skip
- Never shows again (tracked in browser)

### Replaying
- Press **H** to open Help
- Click **"Replay Tutorial"** button

## For Developers

### Testing Fresh Tutorial
```javascript
// Browser console (F12)
localStorage.removeItem('colony_tutorial_completed');
location.reload();
```

### Manual Start
```javascript
// Browser console
game.tutorialSystem.start();
```

### Check Completion
```javascript
// Browser console
game.tutorialSystem.hasCompletedBefore(); // returns true/false
```

### Force Skip
```javascript
// Browser console
game.tutorialSystem.skip();
```

## Tutorial Steps Overview

| Step | Title | Completion | Duration |
|------|-------|------------|----------|
| 0 | Welcome | Press SPACE | Manual |
| 1 | Camera Controls | Move camera or zoom | Player action |
| 2 | Building Basics | Open build menu | Player action |
| 3 | Building Placement | Place a house | Player action |
| 4 | Work Priorities | Open Work tab | Player action |
| 5 | Colonist Management | Right-click colonist | Player action |
| 6 | Zones | - | 8s auto |
| 7 | Survival & Loss | - | 6s auto |
| 8 | Complete | Press SPACE | Manual |

## Code Integration Points

### Game.ts
```typescript
// Auto-start check
if (this.tutorialSystem.shouldAutoStart()) {
  setTimeout(() => this.tutorialSystem.start(), 500);
}

// Update loop
if (this.tutorialSystem.isActive()) {
  this.tutorialSystem.update(dt);
  return; // Skip game logic
}
```

### RenderManager.ts
```typescript
// Render after debug console, before game over
if (game.tutorialSystem.isActive()) {
  game.tutorialSystem.render(ctx, canvas);
}
```

### HelpPanel.ts
```html
<button id="btnReplayTutorial">Replay Tutorial</button>
```

## File Locations

- **System**: `src/game/ui/TutorialSystem.ts`
- **Integration**: `src/game/Game.ts` (lines ~54, ~100, ~2467, ~1871)
- **Rendering**: `src/game/managers/RenderManager.ts` (line ~983)
- **Help Button**: `src/game/ui/dom/HelpPanel.ts`

## Architecture

```
TutorialSystem
├── State: active, skipped, currentStepIndex
├── Intro Phase: fade-in → title → fade-out
├── Tutorial Phase: steps[0..8]
└── Completion: save to localStorage, unpause game
```

## Customization

### Adding a Step
```typescript
{
  id: 'new-step',
  title: 'New Feature',
  description: ['Learn about...', 'Try it now!'],
  waitForCondition: (game) => {
    // Return true when step complete
    return game.someCondition;
  },
  onEnter: (game) => {
    // Setup for this step
  }
}
```

### Changing Timing
```typescript
// In TutorialSystem.ts
private readonly INTRO_FADE_IN = 2.0;       // Intro fade-in duration
private readonly INTRO_TITLE_DURATION = 4.0; // Title hold time
private readonly INTRO_FADE_OUT = 1.5;      // Intro fade-out duration
```

### Styling
```typescript
// Text box position (% of screen height)
const boxHeight = h * 0.25;  // 25% of screen

// Font sizes (% of screen height)
const titleSize = Math.max(18, h * 0.03);  // 3%
const descSize = Math.max(14, h * 0.022);  // 2.2%
```

## Events & Callbacks

### Step Lifecycle
1. `onEnter(game)` - Called when step becomes active
2. `waitForCondition(game)` or `duration` timeout
3. `onExit(game)` - Called when advancing to next step

### Example with Callbacks
```typescript
{
  id: 'example',
  title: 'Example Step',
  description: ['Do something...'],
  onEnter: (game) => {
    console.log('Step started');
    game.camera.zoom = 1.5; // Zoom in
  },
  waitForCondition: (game) => {
    return game.buildings.length > 5;
  },
  onExit: (game) => {
    console.log('Step completed');
    game.camera.zoom = 1.0; // Reset zoom
  }
}
```

## Troubleshooting

### Tutorial Doesn't Start
- Check localStorage not blocked
- Verify `shouldAutoStart()` returns true
- Check browser console for errors
- Ensure 500ms delay hasn't been removed

### Can't Skip
- Verify ESC key not captured by other systems
- Check `tutorialSystem.isActive()` is true
- Look for console errors in `skip()` method

### Steps Not Advancing
- Check `waitForCondition` logic
- Verify game state matches condition
- Test with `duration` fallback instead
- Add console.log to condition function

### Visual Issues
- Check canvas dimensions
- Verify DPR (device pixel ratio) handling
- Test on different screen sizes
- Inspect render layer order

## Performance

- Tutorial overlay renders once per frame (~60 FPS)
- No performance impact when inactive
- localStorage read once on init, written once on complete
- Step conditions checked every frame when active (negligible cost)

## Browser Compatibility

- **localStorage**: All modern browsers (IE11+)
- **Canvas API**: All modern browsers
- **ES6 features**: Transpiled by TypeScript
- **Audio**: Optional, graceful fallback if blocked

## Accessibility Notes

- Text scales with screen size (% based)
- High contrast text (white on black)
- Skip option clearly visible (red text)
- No time pressure on manual advance steps
- Works with keyboard only (no mouse required)

---

**Status**: ✅ Production Ready  
**Version**: 1.0.0  
**Last Updated**: October 26, 2025
