/**
 * RenderManager - Handles all game rendering
 * Extracted from Game.ts to reduce complexity and improve maintainability
 */

import type { Game } from '../Game';
import { COLORS, T, WORLD } from '../constants';
import { clear, applyWorldTransform, drawGround, drawPoly, drawCircle, drawFloors, drawBullets, drawHUD, drawBuilding, drawColonistAvatar, drawPersonIcon } from '../render/index';
import { drawTerrainDebug } from '../render/debug/terrainDebugRender';
import { drawParticles, toggleParticleSprites } from '../../core/particles/particleRender';
import { drawColonistProfile as drawColonistProfileUI } from '../ui/panels/colonistProfile';
import { drawBuildMenu as drawBuildMenuUI } from '../ui/buildMenu';
import { drawPlacementUI as drawPlacementUIUI } from '../ui/placement';
import { drawMobilePlacementUI } from '../ui/mobilePlacement';
import { drawContextMenu as drawContextMenuUI } from '../ui/contextMenu';
import { drawWorkPriorityPanel } from '../ui/panels/workPriorityPanel';
import { drawBuildingInventoryPanel } from '../ui/panels/buildingInventoryPanel';
import { drawModernHotbar, type HotbarTabRect } from '../ui/hud/modernHotbar';
import { drawModernBuildMenu, type BuildMenuRects } from '../ui/hud/modernBuildMenu';
import { canPlace as canPlacePlacement } from '../placement/placementSystem';
import { BUILD_TYPES, hasCost } from '../buildings';
import { drawDebugConsole } from '../ui/debugConsole';
import { drawTooltip, isPointInCircle } from '../ui/uiUtils';
import { drawPerformanceHUD } from '../ui/panels/performanceHUD';
import type { Colonist, Building, Enemy } from '../types';
import { worldBackgroundCache, nightOverlayCache, colonistSpriteCache } from '../../core/RenderCache';
import { workerPoolIntegration } from '../../core/workers';

type RenderWorkerVisibility = {
  trees: Set<number>;
  rocks: Set<number>;
  buildings: Set<number>;
  colonists: Set<number>;
  enemies: Set<number>;
};

type RenderWorkerState = {
  pending: boolean;
  pendingViewportKey: string;
  lastResultKey: string;
  visible: RenderWorkerVisibility | null;
  lastRequestedAt: number;
};

export class RenderManager {
  // Performance optimization flags
  public useWorldCache = true;  // Toggle world background caching
  public useColonistCache = true;  // Toggle colonist sprite caching (enabled via import)
  public useNightCache = true;  // Toggle night overlay caching
  public useParticleSprites = true;  // Toggle particle sprite caching

  private renderWorkerState: RenderWorkerState = {
    pending: false,
    pendingViewportKey: '',
    lastResultKey: '',
    visible: null,
    lastRequestedAt: 0,
  };

  private getViewportKey(
    viewport: { minX: number; minY: number; maxX: number; maxY: number },
    zoom: number
  ): string {
    const precision = 1; // 0.1 world unit precision is sufficient for culling reuse
    return [
      viewport.minX.toFixed(precision),
      viewport.minY.toFixed(precision),
      viewport.maxX.toFixed(precision),
      viewport.maxY.toFixed(precision),
      zoom.toFixed(3)
    ].join('|');
  }

  private updateRenderWorkerVisibility(
    viewport: { minX: number; minY: number; maxX: number; maxY: number },
    viewportKey: string,
    padding: number
  ): RenderWorkerVisibility | null {
    const state = this.renderWorkerState;

    if (!workerPoolIntegration.isAvailable()) {
      state.pending = false;
      state.pendingViewportKey = '';
      state.lastResultKey = '';
      state.visible = null;
      return null;
    }

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const elapsed = now - state.lastRequestedAt;
    const readyForNewRequest = state.lastRequestedAt === 0 || elapsed >= 16; // Throttle to ~60Hz

    if (!state.pending && state.lastResultKey !== viewportKey && readyForNewRequest) {
      this.dispatchRenderWorkerTask(viewport, viewportKey, padding, now);
    }

    // If the camera moved significantly while a request is in-flight, queue a new one when possible
    if (
      state.pending &&
      state.pendingViewportKey !== viewportKey &&
      readyForNewRequest &&
      state.lastResultKey !== viewportKey
    ) {
      // Mark pendingViewportKey so the next availability triggers a fresh request
      state.pendingViewportKey = '';
    }

    if (!state.pending && state.pendingViewportKey === '') {
      // No work queued and viewport changed since last resolve, request immediately
      if (state.lastResultKey !== viewportKey && readyForNewRequest) {
        this.dispatchRenderWorkerTask(viewport, viewportKey, padding, now);
      }
    }

    return state.lastResultKey === viewportKey ? state.visible : null;
  }

  private dispatchRenderWorkerTask(
    viewport: { minX: number; minY: number; maxX: number; maxY: number },
    viewportKey: string,
    padding: number,
    timestamp: number
  ): void {
    const state = this.renderWorkerState;

    if (!workerPoolIntegration.isAvailable()) {
      return;
    }

    const { game } = this;

    const treeEntities = game.trees.map((tree, index) => ({
      id: index,
      x: tree.x,
      y: tree.y,
      r: tree.r ?? 12,
    }));

    const rockEntities = game.rocks.map((rock, index) => ({
      id: index,
      x: rock.x,
      y: rock.y,
      r: rock.r ?? 12,
    }));

    const buildingEntities = game.buildings.map((building, index) => ({
      id: index,
      x: building.x,
      y: building.y,
      w: building.w,
      h: building.h,
    }));

    const colonistEntities = game.colonists.reduce<{ id: number; x: number; y: number; r: number }[]>((acc, colonist, index) => {
      if (!colonist.alive) return acc;
      const hiddenInside = colonist.inside && (colonist.inside as any).kind !== 'bed';
      if (hiddenInside) return acc;
      const radius = (colonist.r ?? 12) + 18; // Include sprite size and drafted indicators
      acc.push({ id: index, x: colonist.x, y: colonist.y, r: radius });
      return acc;
    }, []);

    const enemyEntities = game.enemies.reduce<{ id: number; x: number; y: number; r: number }[]>((acc, enemy, index) => {
      if (enemy.hp <= 0) return acc;
      const radius = (enemy.r ?? 12) + 5;
      acc.push({ id: index, x: enemy.x, y: enemy.y, r: radius });
      return acc;
    }, []);

    state.pending = true;
    state.pendingViewportKey = viewportKey;
    state.lastRequestedAt = timestamp;

    const requestKey = viewportKey;

    Promise.all([
      workerPoolIntegration.cullEntities(treeEntities, viewport, padding),
      workerPoolIntegration.cullEntities(rockEntities, viewport, padding),
      workerPoolIntegration.cullEntities(buildingEntities, viewport, padding),
      workerPoolIntegration.cullEntities(colonistEntities, viewport, padding),
      workerPoolIntegration.cullEntities(enemyEntities, viewport, padding),
    ])
      .then(([treeIds, rockIds, buildingIds, colonistIds, enemyIds]) => {
        if (state.pendingViewportKey && state.pendingViewportKey !== requestKey) {
          return;
        }

        const toSet = (ids: Array<string | number>) => new Set(ids.map(id => Number(id)));

        state.visible = {
          trees: toSet(treeIds),
          rocks: toSet(rockIds),
          buildings: toSet(buildingIds),
          colonists: toSet(colonistIds),
          enemies: toSet(enemyIds),
        };
        state.lastResultKey = requestKey;
      })
      .catch(error => {
        console.warn('[RenderManager] Rendering worker culling failed, falling back to main thread:', error);
        if (state.pendingViewportKey === requestKey) {
          state.visible = null;
          state.lastResultKey = '';
        }
      })
      .finally(() => {
        if (state.pendingViewportKey === requestKey || state.pendingViewportKey === '') {
          state.pending = false;
          state.pendingViewportKey = '';
        }
      });
  }

  constructor(private game: Game) {}

  /**
   * Toggle world background caching
   */
  public toggleWorldCache(enabled: boolean): void {
    this.useWorldCache = enabled;
    if (!enabled) {
      // Clear cache when disabled
      worldBackgroundCache.markDirty();
    }
  }

  /**
   * Toggle colonist sprite caching
   */
  public toggleColonistCache(enabled: boolean): void {
    this.useColonistCache = enabled;
    if (!enabled) {
      // Clear cache when disabled
      colonistSpriteCache.clear();
    }
  }

  /**
   * Toggle particle sprite caching
   */
  public toggleParticleCache(enabled: boolean): void {
    this.useParticleSprites = enabled;
    toggleParticleSprites(enabled);
  }

  /**
   * Get performance stats for debugging
   */
  public getPerformanceStats(): {
    worldCacheEnabled: boolean;
    colonistCacheEnabled: boolean;
    colonistCacheSize: number;
    particleSpritesEnabled: boolean;
  } {
    return {
      worldCacheEnabled: this.useWorldCache,
      colonistCacheEnabled: this.useColonistCache,
      colonistCacheSize: colonistSpriteCache.size(),
      particleSpritesEnabled: this.useParticleSprites
    };
  }

  /**
   * Main render loop - orchestrates all drawing
   */
  render(): void {
    const { game } = this;
    const { ctx, canvas } = game;

    // Clear and set up world transform
    clear(ctx, canvas, game.dirtyRectTracker);
    (game as any).clampCameraToWorld(); // Private method access
    ctx.save();
    applyWorldTransform(ctx, game.camera);

    // World rendering
    this.renderWorld();

    // Entities
    this.renderEntities();

    // Stockpile zone preview (world space overlay)
    this.renderZoneDragPreview();

    // Debug visualizations (only if enabled)
    this.renderDebug();
    
    // Restore transform for UI rendering
    ctx.restore();

    // UI rendering in screen space
    this.renderUI();
    
    // Reset dirty rects for next frame
    game.dirtyRectTracker.reset();
  }

  /**
   * Render world background, floors, and terrain
   */
  private renderWorld(): void {
    const { game } = this;
    const { ctx } = game;

    if (this.useWorldCache) {
      // Use cached world background (single blit instead of hundreds of fillRect)
      const worldCanvas = worldBackgroundCache.getCanvas(ctx, game.terrainGrid);
      ctx.drawImage(worldCanvas, 0, 0);
    } else {
      // Legacy rendering (hundreds of fillRect calls)
      drawGround(ctx, game.camera);
      drawFloors(ctx, game.terrainGrid, game.camera);
    }

    // Render RimWorld stockpile zones and floor items between terrain and entities
    if ((game as any).rimWorld) {
      // We are already in world space (applyWorldTransform active)
      const zones = (game as any).rimWorld.stockpiles.getAllZones();
      (game as any).rimWorld.renderer.renderStockpileZones(zones, game.camera.x, game.camera.y, { isWorldTransformed: true, zoom: game.camera.zoom });
      const stacks = (game as any).rimWorld.floorItems.getVisualStacks();
      (game as any).rimWorld.renderer.renderFloorItems(stacks, game.camera.x, game.camera.y, { isWorldTransformed: true, zoom: game.camera.zoom });
    }
  }

  /**
   * Render all game entities (trees, rocks, buildings, colonists, enemies)
   */
  private renderEntities(): void {
    const { game } = this;
    const { ctx } = game;

    // Calculate visible bounds for culling
    const camera = game.camera;
    const viewportPadding = 100; // Extra padding to avoid pop-in
    const minX = camera.x - viewportPadding;
    const minY = camera.y - viewportPadding;
    const maxX = camera.x + (game.canvas.width / camera.zoom) + viewportPadding;
    const maxY = camera.y + (game.canvas.height / camera.zoom) + viewportPadding;
    
    // Helper: Check if entity is in viewport
    const inViewport = (x: number, y: number, r: number = 0) => {
      return x + r >= minX && x - r <= maxX && y + r >= minY && y - r <= maxY;
    };

    const viewport = { minX, minY, maxX, maxY };
    const viewportKey = this.getViewportKey(viewport, camera.zoom);
    const workerVisible = this.updateRenderWorkerVisibility(viewport, viewportKey, viewportPadding);
    const visibleTrees = workerVisible?.trees ?? null;
    const visibleRocks = workerVisible?.rocks ?? null;
    const visibleBuildings = workerVisible?.buildings ?? null;
    const visibleColonists = workerVisible?.colonists ?? null;
    const visibleEnemies = workerVisible?.enemies ?? null;

    // Trees - use drawCircle helper (with worker-assisted culling)
    for (let i = 0; i < game.trees.length; i++) {
      const tree = game.trees[i];
      const isVisible = visibleTrees ? visibleTrees.has(i) : inViewport(tree.x, tree.y, tree.r);
      if (!isVisible) continue;
      drawCircle(ctx, tree.x, tree.y, tree.r, COLORS.tree);
    }

    // Rocks - use drawCircle helper (with worker-assisted culling)
    for (let i = 0; i < game.rocks.length; i++) {
      const rock = game.rocks[i];
      const isVisible = visibleRocks ? visibleRocks.has(i) : inViewport(rock.x, rock.y, rock.r);
      if (!isVisible) continue;
      drawCircle(ctx, rock.x, rock.y, rock.r, COLORS.rock);
    }

    // Buildings - use drawBuilding helper which handles all the rendering logic (with worker-assisted culling)
    for (let i = 0; i < game.buildings.length; i++) {
      const b = game.buildings[i];
      const radius = Math.max(b.w, b.h) / 2;
      const centerX = b.x + b.w / 2;
      const centerY = b.y + b.h / 2;
      const isVisible = visibleBuildings ? visibleBuildings.has(i) : inViewport(centerX, centerY, radius);
      if (!isVisible) continue;
      drawBuilding(ctx, b);
    }

    // Colonist hiding indicators - show person icons on buildings with colonists inside (with worker-assisted culling)
    for (let i = 0; i < game.buildings.length; i++) {
      const b = game.buildings[i];
      if (!b.done) continue;
      const radius = Math.max(b.w, b.h) / 2;
      const centerX = b.x + b.w / 2;
      const centerY = b.y + b.h / 2;
      const isVisible = visibleBuildings ? visibleBuildings.has(i) : inViewport(centerX, centerY, radius);
      if (!isVisible) continue;

      const numInside = game.insideCounts.get(b) || 0;
      if (numInside > 0 && (b.kind === 'hq' || b.kind === 'house')) {
        // Draw person icon(s) in top-right corner of building
        const iconSize = 10;
        const iconSpacing = iconSize + 2;
        const startX = b.x + b.w - 6;
        const startY = b.y + 6;
        
        // Draw up to 4 person icons (if more, show number instead)
        if (numInside <= 4) {
          for (let i = 0; i < numInside; i++) {
            const iconX = startX - (i % 2) * iconSpacing;
            const iconY = startY + Math.floor(i / 2) * iconSpacing;
            drawPersonIcon(ctx, iconX, iconY, iconSize, '#93c5fd');
          }
        } else {
          // Show count badge instead if more than 4
          drawPersonIcon(ctx, startX, startY, iconSize, '#93c5fd');
          ctx.save();
          ctx.fillStyle = '#1e293b';
          ctx.strokeStyle = '#93c5fd';
          ctx.lineWidth = 1.5;
          const badgeX = startX - iconSpacing;
          const badgeY = startY;
          const badgeRadius = 8;
          ctx.beginPath();
          ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px system-ui';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(numInside), badgeX, badgeY);
          ctx.restore();
        }
      }
    }

    // Colonists - use drawColonistAvatar helper which handles sprites, fallbacks, and mood indicators (with culling)
    for (let i = 0; i < game.colonists.length; i++) {
      const c = game.colonists[i];
      if (!c.alive) continue;
      const hiddenInside = c.inside && (c.inside as any).kind !== 'bed';
      if (hiddenInside) continue;

      // Cull colonists outside viewport
      const colonistVisible = visibleColonists ? visibleColonists.has(i) : inViewport(c.x, c.y, 30);
      if (!colonistVisible) continue; // 30px padding for sprite size
      
      // Check if this colonist is selected
      const isSelected = game.selColonist === c;
      
      // Use the helper function which handles all the sprite rendering logic
      drawColonistAvatar(ctx, c.x, c.y, c, c.r, isSelected);
      
      // Draft indicator - draw a larger, more visible shield icon with label
      if (c.isDrafted) {
        ctx.save();
        
        // Draw green circle background
        ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
        ctx.beginPath();
        ctx.arc(c.x, c.y - c.r - 16, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw shield icon
        ctx.strokeStyle = '#10b981'; // green
        ctx.fillStyle = 'rgba(16, 185, 129, 0.5)';
        ctx.lineWidth = 2.5;
        
        const shieldX = c.x;
        const shieldY = c.y - c.r - 16;
        const shieldSize = 9;
        
        ctx.beginPath();
        ctx.moveTo(shieldX, shieldY - shieldSize);
        ctx.lineTo(shieldX + shieldSize, shieldY);
        ctx.lineTo(shieldX + shieldSize * 0.6, shieldY + shieldSize);
        ctx.lineTo(shieldX - shieldSize * 0.6, shieldY + shieldSize);
        ctx.lineTo(shieldX - shieldSize, shieldY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Add "DRAFTED" label below for clarity
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('DRAFTED', c.x, c.y + c.r + 4);
        
        ctx.restore();
      }
      
      // Medical/Injury indicator - show if colonist is injured
      const injuries = c.health?.injuries ?? [];
      const hasInjuries = injuries.length > 0;
      const hasBleedingInjuries = injuries.some((inj: any) => inj.bleeding > 0);
      const isDowned = c.state === 'downed';
      
      if (isDowned || hasBleedingInjuries || hasInjuries) {
        ctx.save();
        
        // Position indicator to the right of colonist (opposite of draft indicator)
        const indicatorX = c.x + c.r + 14;
        const indicatorY = c.y - c.r - 8;
        
        // Color based on severity
        let color = '#f59e0b'; // amber for general injury
        let icon = '🤕';
        
        if (isDowned) {
          color = '#dc2626'; // red for downed
          icon = '💀';
        } else if (hasBleedingInjuries) {
          color = '#ef4444'; // bright red for bleeding
          icon = '🩸';
        }
        
        // Draw pulsing background circle for urgency
        const pulse = Math.sin(Date.now() / 500) * 0.3 + 0.7; // Pulse effect
        ctx.fillStyle = `rgba(${isDowned ? '220, 38, 38' : hasBleedingInjuries ? '239, 68, 68' : '245, 158, 11'}, ${pulse * 0.3})`;
        ctx.beginPath();
        ctx.arc(indicatorX, indicatorY, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw injury indicator icon
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, indicatorX, indicatorY);
        
        ctx.restore();
      }
      
      // Drafted position indicator
      if (c.isDrafted && c.draftedPosition) {
        ctx.save();
        ctx.strokeStyle = '#10b981'; // green
        ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
        ctx.lineWidth = 2;
        
        // Draw X marker at position
        const size = 12;
        ctx.beginPath();
        ctx.moveTo(c.draftedPosition.x - size, c.draftedPosition.y - size);
        ctx.lineTo(c.draftedPosition.x + size, c.draftedPosition.y + size);
        ctx.moveTo(c.draftedPosition.x + size, c.draftedPosition.y - size);
        ctx.lineTo(c.draftedPosition.x - size, c.draftedPosition.y + size);
        ctx.stroke();
        
        // Draw circle around position
        ctx.beginPath();
        ctx.arc(c.draftedPosition.x, c.draftedPosition.y, size, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
      }
      
      // Drafted target indicator
      if (c.isDrafted && c.draftedTarget) {
        const target = c.draftedTarget as any;
        if (target.hp > 0 && target.alive !== false) {
          ctx.save();
          ctx.strokeStyle = '#ef4444'; // red
          ctx.lineWidth = 2;
          
          // Draw line from colonist to target
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(c.x, c.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
          
          // Draw target reticle
          ctx.setLineDash([]);
          const reticleSize = 14;
          ctx.beginPath();
          ctx.arc(target.x, target.y, reticleSize, 0, Math.PI * 2);
          ctx.stroke();
          
          // Draw crosshair
          ctx.beginPath();
          ctx.moveTo(target.x - reticleSize, target.y);
          ctx.lineTo(target.x + reticleSize, target.y);
          ctx.moveTo(target.x, target.y - reticleSize);
          ctx.lineTo(target.x, target.y + reticleSize);
          ctx.stroke();
          
          ctx.restore();
        }
      }
    }

    // Combat debug: turret ranges
    if ((game.debug as any).combat) {
      for (const b of game.buildings) {
        if (!(b as any).alive || !b.done) continue;
        if (!inViewport(b.x + b.w/2, b.y + b.h/2, Math.max(b.w, b.h)/2)) continue;
        
        const btype = BUILD_TYPES[b.kind] as any;
        if (!btype.isTurret) continue;
        const range = btype.range || 0;
        if (range > 0) {
          const cx = b.x + b.w / 2;
          const cy = b.y + b.h / 2;
          ctx.strokeStyle = 'rgba(255,0,0,0.3)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, range, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // Long press progress circle
    (game as any).drawLongPressProgress();

    // Enemies (with culling)
    for (let i = 0; i < game.enemies.length; i++) {
      const e = game.enemies[i];
      const enemyVisible = visibleEnemies ? visibleEnemies.has(i) : inViewport(e.x, e.y, e.r + 5);
      if (!enemyVisible) continue;
      drawPoly(ctx, e.x, e.y, e.r + 2, 3, COLORS.enemy, -Math.PI / 2);
    }

    // Bullets (with culling)
    drawBullets(ctx, game.bullets.filter(b => inViewport(b.x, b.y, 20)));

    // Particles (muzzle flash, impact effects) (with culling)
    const visibleParticles = game.particles.filter(p => inViewport(p.x, p.y, p.size || 10));
    drawParticles(ctx, visibleParticles);

    // Night overlay
    if (game.isNight()) {
      if (this.useNightCache) {
        // Use cached night overlay (single blit instead of fillRect)
        const nightCanvas = nightOverlayCache.getCanvas();
        ctx.drawImage(nightCanvas, 0, 0);
      } else {
        // Legacy rendering
        ctx.fillStyle = `rgba(6,10,18, 0.58)`;
        ctx.fillRect(0, 0, WORLD.w, WORLD.h);
      }
    }

    // Ghost building preview
    if (game.selectedBuild && !game.pendingPlacement) {
      const def = BUILD_TYPES[game.selectedBuild];
      const gx = Math.floor(game.mouse.wx / T) * T;
      const gy = Math.floor(game.mouse.wy / T) * T;
      const can = canPlacePlacement(game, { ...def, size: def.size } as any, gx, gy) && hasCost(game.RES, def.cost);
      // Use rgba() in fillStyle instead of globalAlpha for better performance
      // COLORS.ghost or #ff6b6b with 0.6 alpha built into the color
      ctx.fillStyle = can ? (typeof COLORS.ghost === 'string' && COLORS.ghost.includes('rgba') ? COLORS.ghost : 'rgba(100, 200, 100, 0.6)') : 'rgba(255, 107, 107, 0.53)'; // 0.53 = 0.88 * 0.6
      ctx.fillRect(gx, gy, def.size.w * T, def.size.h * T);
    }

    // Right-drag erase rectangle
    if (game.mouse.rdown && game.eraseDragStart) {
      const x0 = Math.min(game.eraseDragStart.x, game.mouse.wx);
      const y0 = Math.min(game.eraseDragStart.y, game.mouse.wy);
      const w = Math.abs(game.mouse.wx - game.eraseDragStart.x);
      const h = Math.abs(game.mouse.wy - game.eraseDragStart.y);
      ctx.save();
      // Use rgba() instead of globalAlpha for better performance
      ctx.fillStyle = 'rgba(239, 68, 68, 0.18)'; // #ef4444 with 0.18 alpha
      ctx.fillRect(x0, y0, w, h);
      ctx.strokeStyle = '#ef4444';
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  private renderZoneDragPreview(): void {
    const { game } = this;
    if (!game.getZoneDragPreviewRect) { return; }
    const preview = game.getZoneDragPreviewRect();
    if (!preview) { return; }

    const { ctx, camera } = game;
    const zoom = camera.zoom;
    const dash = 8 / zoom;
    const lineWidth = 2 / zoom;
    const handleSize = 10 / zoom;
    const halfHandle = handleSize / 2;
    const label = `${Math.max(1, Math.round(preview.width / T))}x${Math.max(1, Math.round(preview.height / T))}`;
    const centerX = preview.x + preview.width / 2;
    const centerY = preview.y + preview.height / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(80, 180, 255, 0.18)';
    ctx.strokeStyle = 'rgba(80, 180, 255, 0.7)';
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([dash, dash]);
    ctx.fillRect(preview.x, preview.y, preview.width, preview.height);
    ctx.strokeRect(preview.x, preview.y, preview.width, preview.height);
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    const corners: [number, number][] = [
      [preview.x, preview.y],
      [preview.x + preview.width, preview.y],
      [preview.x, preview.y + preview.height],
      [preview.x + preview.width, preview.y + preview.height]
    ];
    for (const [px, py] of corners) {
      ctx.fillRect(px - halfHandle, py - halfHandle, handleSize, handleSize);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${14 / zoom}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.lineWidth = 3 / zoom;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.strokeText(label, centerX, centerY);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(label, centerX, centerY);
    ctx.restore();
  }

  /**
   * Render debug visualizations (only when debug flags are enabled)
   */
  private renderDebug(): void {
    const { game } = this;
    const { ctx } = game;

    // Terrain debug
    if (game.debug.terrain) {
      drawTerrainDebug(game);
    }

    // Navigation debug
    if (game.debug.nav) {
      this.renderNavDebug();
    }

    // Colonist debug info
    if (game.debug.colonists) {
      this.renderColonistDebug();
      this.renderEnemyDebug();
    }

    // Debug console (rendered last in world space)
    drawDebugConsole(game);
  }

  /**
   * Render navigation debug visualization
   */
  private renderNavDebug(): void {
    const { game } = this;
    const { ctx, grid, camera } = game;
    const cam = camera as any; // Camera type needs width/height

    ctx.save();
    // Note: This globalAlpha is for entire debug visualization, acceptable in debug mode
    // In production rendering, avoid globalAlpha - use rgba() instead
    ctx.globalAlpha = 0.4;

    // Calculate visible tile range for culling
    const startCol = Math.max(0, Math.floor((camera.x - 100) / T));
    const endCol = Math.min(grid.cols, Math.ceil((camera.x + (ctx.canvas.width / camera.zoom) + 100) / T));
    const startRow = Math.max(0, Math.floor((camera.y - 100) / T));
    const endRow = Math.min(grid.rows, Math.ceil((camera.y + (ctx.canvas.height / camera.zoom) + 100) / T));

    // Draw solid/unwalkable tiles (only visible ones)
    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        const idx = r * grid.cols + c;
        if (!grid.solid[idx]) continue;
        const x = c * T;
        const y = r * T;
        ctx.fillStyle = '#ff000088';
        ctx.fillRect(x, y, T, T);
      }
    }

    // Draw movement costs (terrain speed modifiers) (only visible ones)
    ctx.font = '8px monospace';
    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        const idx = r * grid.cols + c;
        if (grid.solid[idx]) continue;
        const cost = grid.cost[idx];
        if (cost === 1) continue;
        const x = c * T;
        const y = r * T;
        const alpha = Math.min(1, (cost - 1) * 0.3);
        ctx.fillStyle = `rgba(255, 200, 0, ${alpha})`;
        ctx.fillRect(x, y, T, T);
        ctx.fillStyle = '#000000';
        ctx.fillText(cost.toFixed(1), x + 2, y + 10);
      }
    }

    ctx.restore();

    // Colonist paths (with culling)
    const viewportPadding = 100;
    const minX = camera.x - viewportPadding;
    const minY = camera.y - viewportPadding;
    const maxX = camera.x + (ctx.canvas.width / camera.zoom) + viewportPadding;
    const maxY = camera.y + (ctx.canvas.height / camera.zoom) + viewportPadding;
    
    const inViewport = (x: number, y: number) => {
      return x >= minX && x <= maxX && y >= minY && y <= maxY;
    };

    for (const c of game.colonists) {
      if (!c.alive || !c.path || c.path.length === 0) continue;
      if (!inViewport(c.x, c.y)) continue; // Cull paths for colonists outside viewport
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      for (const node of c.path) {
        ctx.lineTo(node.x, node.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Current target
      if (c.pathIndex !== undefined && c.path[c.pathIndex]) {
        const node = c.path[c.pathIndex];
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Line to task target
      if (c.target && (c.target as any).x != null) {
        const target = c.target as any;
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Enemy paths
    for (const e of game.enemies) {
      if (!inViewport(e.x, e.y)) continue; // Cull paths for enemies outside viewport
      
      const enemyAny = e as any;
      const path = enemyAny.path;
      if (!path || path.length === 0) continue;

      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      for (const node of path) {
        ctx.lineTo(node.x, node.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Path nodes
      for (let i = 0; i < path.length; i++) {
        const node = path[i];
        ctx.fillStyle = i === enemyAny.pathIndex ? '#ff0000' : '#ff8888';
        ctx.fillRect(node.x - 2, node.y - 2, 4, 4);
      }
    }
  }

  /**
   * Render colonist debug information
   */
  private renderColonistDebug(): void {
    const { game } = this;
    const { ctx } = game;

    // Calculate visible bounds for culling
    const camera = game.camera;
    const viewportPadding = 100;
    const minX = camera.x - viewportPadding;
    const minY = camera.y - viewportPadding;
    const maxX = camera.x + (game.canvas.width / camera.zoom) + viewportPadding;
    const maxY = camera.y + (game.canvas.height / camera.zoom) + viewportPadding;
    
    const inViewport = (x: number, y: number) => {
      return x >= minX && x <= maxX && y >= minY && y <= maxY;
    };

    ctx.save();
    ctx.font = '10px monospace';
    ctx.lineWidth = 1;

    for (const c of game.colonists) {
      if (!c.alive) continue;
      const hiddenInside = c.inside && c.inside.kind !== 'bed';
      if (hiddenInside) continue;
      
      // Cull debug info for colonists outside viewport
      if (!inViewport(c.x, c.y)) continue;

      // Enhanced colonist state display
      const x = c.x - 35;
      let y = c.y - c.r - 45;
      const lineHeight = 12;

      // Gather debug text
      const textLines = [
        `State: ${(c as any).state || 'unknown'}`,
        `Task: ${c.task || 'none'}`,
        `HP: ${Math.floor(c.hp || 0)}`,
        `Pos: ${Math.floor(c.x)},${Math.floor(c.y)}`,
        `Speed: ${this.calculateColonistSpeed(c).toFixed(1)}`,
        `Stuck: ${(c as any).stuckTimer ? (c as any).stuckTimer.toFixed(1) + 's' : 'no'}`,
        `Since: ${(c as any).stateSince ? (c as any).stateSince.toFixed(1) + 's' : '0s'}`,
        `PathIdx: ${c.pathIndex ?? 'none'}/${c.path?.length ?? 0}`,
        `Jitter: ${(c as any).jitterScore ?? 0}`,
        `Repath: ${(c as any).repath ? (c as any).repath.toFixed(1) + 's' : 'none'}`
      ];
      
      // Add carrying info if colonist is carrying items
      if (c.carryingWheat && c.carryingWheat > 0) {
        textLines.push(`Wheat: ${c.carryingWheat}`);
      }
      if (c.carryingBread && c.carryingBread > 0) {
        textLines.push(`Bread: ${c.carryingBread}`);
      }

      if (c.target) {
        const target = c.target as any;
        if (target.x != null) {
          textLines.push(`Target: ${Math.floor(target.x)},${Math.floor(target.y)}`);
          if (target.type) textLines.push(`Type: ${target.type}`);
          if (target.hp != null) textLines.push(`T.HP: ${Math.floor(target.hp)}`);
        }
      }

      // Draw background
      const bgWidth = 140;
      const bgHeight = textLines.length * lineHeight + 4;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(x - 2, y - lineHeight + 2, bgWidth, bgHeight);
      ctx.strokeStyle = '#444';
      ctx.strokeRect(x - 2, y - lineHeight + 2, bgWidth, bgHeight);

      // Draw text lines
      for (let i = 0; i < textLines.length; i++) {
        const line = textLines[i];
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeText(line, x, y + i * lineHeight);
        ctx.fillText(line, x, y + i * lineHeight);
      }

      // Draw collision radius
      ctx.strokeStyle = 'rgba(255, 107, 107, 0.3)'; // #ff6b6b with 0.3 alpha
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.stroke();

      // Show interaction range for current task
      if (c.target && c.task && (c.task === 'chop' || c.task === 'mine')) {
        const target = c.target as any;
        if (target.x != null && target.r != null) {
          const interactRange = target.r + c.r + 4 + 2.5;
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)'; // #22c55e with 0.4 alpha
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(target.x, target.y, interactRange, 0, Math.PI * 2);
          ctx.stroke();

          // Distance to target
          const distance = Math.hypot(c.x - target.x, c.y - target.y);
          ctx.fillStyle = distance <= interactRange ? '#22c55e' : '#ff6b6b';
          ctx.font = '12px monospace';
          const midX = (c.x + target.x) / 2;
          const midY = (c.y + target.y) / 2;
          ctx.strokeText(`${distance.toFixed(1)}`, midX - 15, midY);
          ctx.fillText(`${distance.toFixed(1)}`, midX - 15, midY);
        }
      }
    }

    ctx.restore();
  }

  /**
   * Render enemy debug information
   */
  private renderEnemyDebug(): void {
    const { game } = this;
    const { ctx } = game;

    // Calculate visible bounds for culling
    const camera = game.camera;
    const viewportPadding = 100;
    const minX = camera.x - viewportPadding;
    const minY = camera.y - viewportPadding;
    const maxX = camera.x + (game.canvas.width / camera.zoom) + viewportPadding;
    const maxY = camera.y + (game.canvas.height / camera.zoom) + viewportPadding;
    
    const inViewport = (x: number, y: number) => {
      return x >= minX && x <= maxX && y >= minY && y <= maxY;
    };

    ctx.save();
    ctx.font = '9px monospace';

    for (const e of game.enemies) {
      // Cull debug info for enemies outside viewport
      if (!inViewport(e.x, e.y)) continue;
      
      const enemyAny = e as any;
      const path = enemyAny.path;

      // Draw enemy info
      const x = e.x - 40;
      let y = e.y - e.r - 35;
      const lineHeight = 11;

      const textLines = [
        `HP: ${Math.floor(e.hp)}`,
        `Pos: ${Math.floor(e.x)},${Math.floor(e.y)}`,
        `Target: ${e.target ? (e.target as any).kind || 'colonist' : 'none'}`,
        `PathIdx: ${enemyAny.pathIndex ?? 'none'}/${path?.length ?? 0}`,
        `Repath: ${enemyAny.repath ? enemyAny.repath.toFixed(1) + 's' : 'none'}`,
        `Stuck: ${enemyAny.stuckTimer ? enemyAny.stuckTimer.toFixed(1) + 's' : 'no'}`
      ];

      // Background
      const bgWidth = 120;
      const bgHeight = textLines.length * lineHeight + 4;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(x - 2, y - 2, bgWidth, bgHeight);

      // Text
      ctx.fillStyle = '#ff4444';
      for (let i = 0; i < textLines.length; i++) {
        ctx.fillText(textLines[i], x, y + i * lineHeight + 10);
      }
    }

    ctx.restore();
  }

  /**
   * Render danger memory visualization
   */
  /**
   * Render UI elements in screen space
   */
  private renderUI(): void {
    const { game } = this;
    const { ctx, canvas } = game;

    // Gather UI data
    const cap = game.getPopulationCap();
    const hiding = game.colonists.filter(c => c.inside && c.inside.kind !== 'bed').length;
    const storageUsed = game.RES.wood + game.RES.stone + game.RES.food;
    const storageMax = game.getStorageCapacity();

    // Main HUD (top bar with resources, day, etc.)
    drawHUD(ctx, canvas, {
      res: game.RES,
      colonists: game.colonists.filter(c => c.alive).length,
      cap,
      hiding,
      day: game.day,
      tDay: game.tDay,
      isNight: game.isNight(),
      hotbar: [], // No longer needed - using new hotbar
      messages: game.messages,
      storage: { used: storageUsed, max: storageMax }
    }, game);

    // Modern Hotbar (replaces old building selection hotbar)
    const hotbarRects = drawModernHotbar(ctx, canvas, game.uiManager.activeHotbarTab, game);
    
    // Store hotbar click regions for the new system
    (game as any).modernHotbarRects = hotbarRects;

    // Show panel based on active tab
    if (game.uiManager.activeHotbarTab === 'build') {
      // Build menu - two-panel category system
      const buildMenuRects = drawModernBuildMenu(ctx, canvas, game.uiManager.selectedBuildCategory, game);
      (game as any).modernBuildMenuRects = buildMenuRects;
    } else if (game.uiManager.activeHotbarTab === 'work') {
      // Work priority panel - modal overlay, no container needed
      drawWorkPriorityPanel(ctx, game.colonists, canvas, game);
    }

    // Colonist profile panel
    if (game.selColonist) {
      drawColonistProfileUI(game, game.selColonist);
    } else {
      game.colonistPanelRect = game.colonistPanelCloseRect = null;
    }

    // Placement UI
    if (game.pendingPlacement) {
      drawMobilePlacementUI(game);
    }

    // Context menu
    if (game.contextMenu) {
      drawContextMenuUI(game);
    }
    
    // Colonist hover tooltip - show info when mouse hovers over colonist (only if no menu open)
    if (!game.contextMenu && !game.uiManager.activeHotbarTab && !game.selColonist) {
      this.drawColonistHoverTooltip(game, ctx, canvas);
    }
    
    // Building inventory panel (modal overlay - renders on top of everything except work priority)
    drawBuildingInventoryPanel(ctx, canvas.width, canvas.height);
    
    // Performance HUD (top layer - always visible when enabled)
    drawPerformanceHUD(game);
    
    // Debug console (always on top)
    drawDebugConsole(game);
  }

  /**
   * Draw colonist hover tooltip - shows info when mouse is over a colonist
   */
  private drawColonistHoverTooltip(game: Game, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    const mx = game.mouse.x * game.DPR;
    const my = game.mouse.y * game.DPR;
    
    // Convert screen coordinates to world coordinates
    const worldX = (mx - canvas.width / 2) / game.camera.zoom + game.camera.x;
    const worldY = (my - canvas.height / 2) / game.camera.zoom + game.camera.y;
    
    // Find colonist under mouse
    let hoveredColonist = null;
    for (const c of game.colonists) {
      if (!c.alive) continue;
      const hiddenInside = c.inside && (c.inside as any).kind !== 'bed';
      if (hiddenInside) continue;
      
      // Check if mouse is within colonist's circle (use larger radius for easier hover)
      if (isPointInCircle(worldX, worldY, c.x, c.y, c.r + 8)) {
        hoveredColonist = c;
        break;
      }
    }
    
    if (hoveredColonist) {
      const c = hoveredColonist;
      const tooltipLines: string[] = [];
      
      // Name
      tooltipLines.push(`👤 ${c.profile?.name || 'Colonist'}`);
      
      // Status
      if (c.state === 'downed') {
        tooltipLines.push('💀 DOWNED - needs rescue!');
      } else if (c.isDrafted) {
        tooltipLines.push('⚔️ Drafted for combat');
      } else {
        tooltipLines.push(`📋 ${c.task || 'idle'}`);
      }
      
      // Health
      const healthPercent = Math.round((c.hp / 100) * 100);
      const healthIcon = healthPercent > 75 ? '💚' : healthPercent > 50 ? '💛' : healthPercent > 25 ? '🧡' : '❤️';
      tooltipLines.push(`${healthIcon} Health: ${healthPercent}%`);
      
      // Injuries
      const injuries = c.health?.injuries ?? [];
      if (injuries.length > 0) {
        const bleeding = injuries.some((inj: any) => inj.bleeding > 0);
        if (bleeding) {
          tooltipLines.push('🩸 Bleeding - needs bandages!');
        } else {
          tooltipLines.push(`🤕 ${injuries.length} injur${injuries.length > 1 ? 'ies' : 'y'}`);
        }
      }
      
      // Needs
      if (c.hunger && c.hunger > 70) {
        tooltipLines.push('🍽️ Very hungry');
      } else if (c.hunger && c.hunger > 50) {
        tooltipLines.push('🍞 Hungry');
      }
      
      if (c.fatigue && c.fatigue > 70) {
        tooltipLines.push('😴 Exhausted');
      } else if (c.fatigue && c.fatigue > 50) {
        tooltipLines.push('💤 Tired');
      }
      
      // Inventory/Carrying
      if (c.carryingWheat && c.carryingWheat > 0) {
        tooltipLines.push(`🌾 Carrying ${c.carryingWheat} wheat`);
      }
      if (c.carryingBread && c.carryingBread > 0) {
        tooltipLines.push(`🍞 Carrying ${c.carryingBread} bread`);
      }
      
      // Tip
      tooltipLines.push('');
      tooltipLines.push('💡 Click to select, Right-click for menu');
      
      drawTooltip(ctx, tooltipLines, mx, my, {
        maxWidth: 280,
        padding: 10,
        fontSize: 13
      });
    }
  }

  /**
   * Helper: Calculate colonist current speed with all modifiers
   */
  private calculateColonistSpeed(c: Colonist): number {
    const { game } = this;
    let baseSpeed = c.speed || 0;

    // Apply fatigue multiplier
    if (c.fatigueSlow) baseSpeed *= c.fatigueSlow;

    // Apply equipment speed multiplier
    baseSpeed *= game.getMoveSpeedMultiplier(c);

    let speed = baseSpeed;

    // Apply terrain/floor speed modifier
    const gx = Math.floor(c.x / T);
    const gy = Math.floor(c.y / T);
    if (gx >= 0 && gy >= 0 && gx < game.grid.cols && gy < game.grid.rows) {
      const idx = gy * game.grid.cols + gx;
      const tileCost = game.grid.cost[idx];
      if (tileCost > 0) {
        speed = baseSpeed / tileCost;
      }
    }

    return speed;
  }
}
