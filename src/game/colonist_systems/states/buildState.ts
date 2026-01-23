import type { Building, Colonist } from '../../types';
import type { Game } from '../../Game';
import { T, WORLD } from '../../constants';
import { BUILD_TYPES } from '../../buildings';
import { getConstructionAudio, getConstructionCompleteAudio } from '../../audio/buildingAudioMap';
import { stopConstructionAudio, stopConstructionLoop } from '../../audio/helpers/constructionAudio';
import { initializeDoor, isDoorBlocking } from '../../systems/doorSystem';
import { isMountainTile as checkIsMountainTile } from '../../terrain';
import { grantSkillXP, skillLevel, skillWorkSpeedMultiplier } from '../../skills/skills';

// Helper function to check if a position would collide with buildings or mountains
function wouldCollideWithBuildings(game: any, x: number, y: number, radius: number): boolean {
  // Check mountain collision first (most important for getting stuck)
  const gx = Math.floor(x / T);
  const gy = Math.floor(y / T);
  if (game.terrainGrid && checkIsMountainTile(game.terrainGrid, gx, gy)) {
    return true; // Mountains block movement
  }

  // Check building collisions
  for (const b of game.buildings) {
    // Skip HQ, paths, houses, and farms as they don't block movement
    // Skip doors that are open
    if (b.kind === 'hq' || b.kind === 'path' || b.kind === 'house' || b.kind === 'farm' || b.kind === 'bed' || !b.done) continue;
    if (b.kind === 'door' && !isDoorBlocking(b)) continue;

    // Check circle-rectangle collision
    const closestX = Math.max(b.x, Math.min(x, b.x + b.w));
    const closestY = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - closestX;
    const dy = y - closestY;

    if (dx * dx + dy * dy <= radius * radius) {
      return true;
    }
  }
  return false;
}

export function updateBuildState(
  c: Colonist,
  game: Game,
  dt: number,
  changeState: (state: import('../../types').ColonistState, reason?: string) => void
) {
  const b = c.target as Building;
  const stateSince = c.stateSince ?? 0;

  if (!b || b.done) {
    // Only switch to seekTask if we've been in this state for at least a short duration
    // This prevents rapid task cycling when buildings complete instantly or targets become invalid
    if (stateSince >= 0.5) {
      game.releaseBuildReservation(c);
      c.task = null;
      c.target = null;
      game.clearPath(c);
      // Stop any looping construction audio before clearing tracking
      stopConstructionAudio(game, c);
      changeState('seekTask', 'building complete');
    }
    return;
  }

  const pt = { x: b.x + b.w / 2, y: b.y + b.h / 2 };

  // Walls and other 1x1 structures block their own tile even while under construction.
  // When builders stand on the adjacent tile, the distance to the building centre is
  // roughly half the building's largest dimension (~16px for a wall). The previous
  // arrive radius of 12px meant we would only register "in range" for a single frame
  // as the colonist slid into position, then immediately fall out of range and stop
  // progressing the build. Expand the reach based on building size so tiny blueprints
  // can be completed while standing just outside the blocked tile.
  const largestHalfExtent = Math.max(b.w, b.h) / 2;
  const interactRadius = Math.max(12, largestHalfExtent + 6);

  // Build-specific stuck detection and timeout
  if (stateSince > 15) {
    console.log(`Build task timeout after ${stateSince.toFixed(1)}s, abandoning building`);
    game.releaseBuildReservation(c);
    c.task = null;
    c.target = null;
    game.clearPath(c);
    // Stop any looping construction audio before clearing tracking
    stopConstructionAudio(game, c);
    changeState('seekTask', 'build timeout');
    return;
  }

  // Track position for jitter detection - TEMPORARILY DISABLED
  const distToTarget = Math.hypot(c.x - pt.x, c.y - pt.y);
  if (!c.lastDistToNode) c.lastDistToNode = distToTarget;

  // Check for build jittering (not making progress) - TEMPORARILY DISABLED
  /*
  if (c.stateSince > 3 && Math.abs(distToTarget - c.lastDistToNode) < 5) {
    c.jitterScore = (c.jitterScore || 0) + 1;
    if (c.jitterScore > 30) { // 30 frames of no progress
      console.log(`Build jittering detected, clearing path and retrying`);
      game.clearPath(c);
      c.jitterScore = 0;
      // Try moving to a slightly different position around the building
      const offset = (Math.random() - 0.5) * 20;
      pt.x += offset;
      pt.y += offset;
    }
  } else {
    c.jitterScore = 0;
  }
  */
  c.lastDistToNode = distToTarget;

  // Check if colonist is within interaction range first
  const currentDist = Math.hypot(c.x - pt.x, c.y - pt.y);

  // Only move if not in range - prevents infinite repathing when already at destination
  if (currentDist > interactRadius) {
    game.moveAlongPath(c, dt, pt, interactRadius);
  }

  // Build if within interaction range
  if (currentDist <= interactRadius) {
    // Apply equipment work speed bonuses (Construction) and skill multiplier
    const equipMult = (game as any).getWorkSpeedMultiplier ? (game as any).getWorkSpeedMultiplier(c, 'Construction') : 1;
    const lvl = c.skills ? skillLevel(c, 'Construction') : 0;
    const skillMult = skillWorkSpeedMultiplier(lvl);
    const workMult = equipMult * skillMult;
    b.buildLeft -= 25 * dt * workMult;

    // === CONSTRUCTION AUDIO SYSTEM ===
    // Play construction work sounds while actively building
    const buildingDef = BUILD_TYPES[b.kind];
    if (buildingDef) {
      const audioClip = getConstructionAudio(b.kind, buildingDef);
      const currentTime = c.t || 0;

      // Play construction audio every 1-2 seconds (randomized for natural feel)
      // Each audio clip plays to completion, then a new one starts
      const audioInterval = 1.5 + Math.random() * 0.5; // 1.5-2.0 seconds

      if (!c.lastConstructionAudioTime || (currentTime - c.lastConstructionAudioTime) >= audioInterval) {
        // Stop any previous looping construction audio before starting new one
        stopConstructionLoop(game, c);

        // Play construction sound with per-clip volume control
        (game as any).playAudio?.(audioClip.key, {
          category: 'buildings',
          volume: audioClip.volume ?? 0.75,
          rng: Math.random,
          position: { x: b.x + b.w / 2, y: b.y + b.h / 2 },
          listenerPosition: (game as any).audioManager?.getListenerPosition(),
          replaceExisting: true
        });
        c.lastConstructionAudioTime = currentTime;
        c.activeConstructionAudio = audioClip.key;
      }
    }
    // === END CONSTRUCTION AUDIO ===

    // Grant construction XP over time while actively building
    if (c.skills) {
      // Base XP per second while building
      grantSkillXP(c, 'Construction', 6 * dt, c.t || 0);
    }
    if (b.buildLeft <= 0) {
      b.done = true;

      // === CONSTRUCTION COMPLETION AUDIO ===
      // Stop any looping construction audio first
      stopConstructionAudio(game, c);
      // Play completion sound when building finishes
      if (buildingDef) {
        const completeAudioClip = getConstructionCompleteAudio(b.kind, buildingDef);
        (game as any).playAudio?.(completeAudioClip.key, {
          category: 'buildings',
          volume: completeAudioClip.volume ?? 0.85,
          position: { x: b.x + b.w / 2, y: b.y + b.h / 2 },
          listenerPosition: (game as any).audioManager?.getListenerPosition()
        });
      }
      // === END COMPLETION AUDIO ===

      if (b.kind === 'farm') { b.growth = 0; b.ready = false; }
      if (b.kind === 'door') { initializeDoor(b); }

      // Handle floor construction completion - convert to terrain floor
      if ((b as any).isFloorConstruction && (b as any).floorType) {
        const floorTypeStr = (b as any).floorType as string;
        const floorTypeMap: Record<string, number> = {
          'BASIC_PATH': 1,
          'STONE_ROAD': 2,
          'WOODEN_FLOOR': 3,
          'CONCRETE': 4,
          'METAL_FLOOR': 5,
          'CARPET': 6
        };
        const floorTypeId = floorTypeMap[floorTypeStr] || 1;

        // Get tile position
        const tx = Math.floor(b.x / 32);
        const ty = Math.floor(b.y / 32);

        // Set floor in terrain grid
        if (game.terrainGrid && tx >= 0 && ty >= 0 && tx < game.grid.cols && ty < game.grid.rows) {
          const idx = ty * game.grid.cols + tx;
          game.terrainGrid.floors[idx] = floorTypeId;

          // Use deferred cache invalidation to prevent performance issues during
          // rapid floor placement (immediate invalidation caused 200%+ render time)
          game.deferredRebuildSystem.requestCacheInvalidation();

          // Sync terrain to pathfinding grid
          (game as any).syncTerrainToGrid?.();

          // Remove the construction marker building
          const buildingIdx = game.buildings.indexOf(b);
          if (buildingIdx !== -1) {
            game.buildings.splice(buildingIdx, 1);
          }

          // Show completion message
          game.msg(`Floor construction complete`, 'good');
        }
      }

      // Check if colonist is stuck inside the building and move them to safety
      if (wouldCollideWithBuildings(game, c.x, c.y, c.r)) {
        // Find a safe position around the building
        const angles = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2, Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4];
        let moved = false;

        for (const angle of angles) {
          const safeDistance = Math.max(b.w, b.h) / 2 + c.r + 10;
          const safeX = b.x + b.w / 2 + Math.cos(angle) * safeDistance;
          const safeY = b.y + b.h / 2 + Math.sin(angle) * safeDistance;

          // Ensure safe position is within world bounds
          const clampedX = Math.max(c.r, Math.min(safeX, WORLD.w - c.r));
          const clampedY = Math.max(c.r, Math.min(safeY, WORLD.h - c.r));

          if (!wouldCollideWithBuildings(game, clampedX, clampedY, c.r)) {
            c.x = clampedX;
            c.y = clampedY;
            moved = true;
            if (Math.random() < 0.1) {
              console.log(`Moved colonist to safety after building completion: (${c.x.toFixed(1)}, ${c.y.toFixed(1)})`);
            }
            break;
          }
        }

        if (!moved) {
          // Emergency fallback: move to HQ area
          const hq = game.buildings.find((bld: any) => bld.kind === 'hq');
          if (hq) {
            c.x = hq.x + hq.w / 2;
            c.y = hq.y - 30;
            console.log('Emergency teleport to HQ area after building completion');
          }
        }
      }

      game.msg(b.name ? b.name + " complete" : "Building complete"); game.rebuildNavGrid(); game.clearPath(c);
      game.releaseBuildReservation(c); c.task = null; c.target = null; changeState('seekTask', 'building complete');
    }
  }
}