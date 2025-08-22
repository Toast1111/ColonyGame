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

## Deploy to GitHub Pages

This repo includes a GitHub Actions workflow that builds and deploys to GitHub Pages.

1) In GitHub → Settings → Pages:
	- Set Source to “GitHub Actions”.

2) Push to `main` to trigger the workflow.

The workflow uses Vite’s `base` set from `BASE_PATH` so assets work under the repo subpath. No changes are needed locally. The site will be available at:

```
https://<your-username>.github.io/ColonyGame/
```

If you fork and rename the repo, the workflow will still set the base path correctly using the repository name.

## Structure

- `src/core/*`: utilities
- `src/game/*`: game types, constants, buildings, renderer, Game class
- `index.html`, `style.css`: shell

## Notes

- Logic closely mirrors original; future work: unit tests, data-driven content, save/load.
