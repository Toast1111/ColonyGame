# Audio Asset Directory

This folder hosts all sound effects (SFX) and ambient loops used by the game.

## Structure Overview

```
audio/
  ambient/           # looping ambience beds (day wind, night crickets, etc.)
  buildings/
    construction/    # hammering, sawing, completion stingers
    placement/       # placement, cancel, rotate cues
  cooking/
    chopping/        # prep work, chopping boards
    stove/           # sizzling, oven doors
  medical/           # bandages, syringes, healing UI
  ui/                # hover, click, alerts, notifications
  weapons/
    ranged/
      pistol/        # fire, reload, dry fire (multiple variations)
      rifle/
        ...
      shared/        # shell drops, generic foley reused across ranged weapons
    melee/
      sword/         # slashes, impacts, parries
      club/          # blunt swings and impacts
      shared/        # generic whooshes/impacts for melee reuse
  _mix/              # project-wide mix/reference files (optional)
```

Each leaf folder keeps all variants for that event (e.g. `pistol_fire_01.ogg`, `pistol_fire_02.ogg`). When adding new assets, prefer short loop-friendly `.ogg` files and normalize peaks to around **-1 dBFS** for consistent playback.

## Naming Guidelines

- Use lowercase snake_case with a numeric suffix for variants: `rifle_fire_close_01.ogg`.
- Group supporting layers (e.g. `reload`, `cock`, `impact`) alongside the primary event.
- If you add new categories, update `manifest.ts` so code can access them.

See `manifest.ts` for the TypeScript manifest that exposes these sounds to the rest of the codebase.
