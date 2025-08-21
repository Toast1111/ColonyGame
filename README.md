# Colony Survival 2D (TypeScript)

Modular TypeScript port of the single-file HTML game. Uses Vite for dev/build.

## Try it

```bash
npm install
npm run dev
```

Then open the local URL in your browser. Use WASD to pan, 1..6 to select buildings, LMB to place, RMB to cancel/erase, Space to pause, H for help, +/- zoom, F fast-forward.

## Build

```bash
npm run build
npm run preview
```

## Structure

- `src/core/*`: utilities
- `src/game/*`: game types, constants, buildings, renderer, Game class
- `index.html`, `style.css`: shell

## Notes

- Logic closely mirrors original; future work: unit tests, data-driven content, save/load.
