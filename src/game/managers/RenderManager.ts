/**
 * RenderManager - Handles all game rendering
 * Extracted from Game.ts to reduce complexity and improve maintainability
 */

import type { Game } from '../Game';
import { COLORS, T, WORLD } from '../constants';
import { clear, applyWorldTransform, drawGround, drawPoly, drawCircle, drawFloors, drawBullets, drawHUD, drawBuilding, drawColonistAvatar } from '../render';
import { drawRegionDebug } from '../navigation/regionDebugRender';
import { drawTerrainDebug } from '../terrainDebugRender';
import { drawParticles } from '../../core/particles/particleRender';
import { drawColonistProfile as drawColonistProfileUI } from '../ui/colonistProfile';
import { drawBuildMenu as drawBuildMenuUI } from '../ui/buildMenu';
import { drawPlacementUI as drawPlacementUIUI } from '../ui/placement';
import { drawContextMenu as drawContextMenuUI } from '../ui/contextMenu';
import { drawWorkPriorityPanel } from '../ui/workPriorityPanel';
import { canPlace as canPlacePlacement } from '../placement/placementSystem';
import { BUILD_TYPES, hasCost } from '../buildings';
import { drawDebugConsole } from '../ui/debugConsole';
import type { Colonist, Building, Enemy } from '../types';

export class RenderManager {
  constructor(private game: Game) {}

  /**
   * Main render loop - orchestrates all drawing
   */
  render(): void {
    const { game } = this;
    const { ctx, canvas } = game;

    // Clear and set up world transform
    clear(ctx, canvas);
    (game as any).clampCameraToWorld(); // Private method access
    ctx.save();
    applyWorldTransform(ctx, game.camera);

    // World rendering
    this.renderWorld();
    
    // Entities
    this.renderEntities();
    
    // Debug visualizations (only if enabled)
    this.renderDebug();
    
    // Restore transform for UI rendering
    ctx.restore();

    // UI rendering in screen space
    this.renderUI();
  }

  /**
   * Render world background, floors, and terrain
   */
  private renderWorld(): void {
    const { game } = this;
    const { ctx } = game;

    // Ground and floors
    drawGround(ctx);
    drawFloors(ctx, game.terrainGrid, game.camera);
  }

  /**
   * Render all game entities (trees, rocks, buildings, colonists, enemies)
   */
  private renderEntities(): void {
    const { game } = this;
    const { ctx } = game;

    // Trees - use drawCircle helper
    for (const tree of game.trees) {
      drawCircle(ctx, tree.x, tree.y, tree.r, COLORS.tree);
    }

    // Rocks - use drawCircle helper
    for (const rock of game.rocks) {
      drawCircle(ctx, rock.x, rock.y, rock.r, COLORS.rock);
    }

    // Buildings - use drawBuilding helper which handles all the rendering logic
    for (const b of game.buildings) {
      drawBuilding(ctx, b);
    }

    // Colonists - use drawColonistAvatar helper which handles sprites, fallbacks, and mood indicators
    for (const c of game.colonists) {
      if (!c.alive) continue;
      const hiddenInside = c.inside && (c.inside as any).kind !== 'bed';
      if (hiddenInside) continue;
      
      // Use the helper function which handles all the sprite rendering logic
      drawColonistAvatar(ctx, c.x, c.y, c, c.r, false);
    }

    // Combat debug: turret ranges
    if ((game.debug as any).combat) {
      for (const b of game.buildings) {
        if (!(b as any).alive || !b.done) continue;
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

    // Enemies
    for (const e of game.enemies) {
      drawPoly(ctx, e.x, e.y, e.r + 2, 3, COLORS.enemy, -Math.PI / 2);
    }

    // Bullets
    drawBullets(ctx, game.bullets);

    // Particles (muzzle flash, impact effects)
    drawParticles(ctx, game.particles);

    // Night overlay
    if (game.isNight()) {
      ctx.fillStyle = `rgba(6,10,18, 0.58)`;
      ctx.fillRect(0, 0, WORLD.w, WORLD.h);
    }

    // Ghost building preview
    if (game.selectedBuild && !game.pendingPlacement) {
      const def = BUILD_TYPES[game.selectedBuild];
      const gx = Math.floor(game.mouse.wx / T) * T;
      const gy = Math.floor(game.mouse.wy / T) * T;
      const can = canPlacePlacement(game, { ...def, size: def.size } as any, gx, gy) && hasCost(game.RES, def.cost);
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = can ? COLORS.ghost : '#ff6b6b88';
      ctx.fillRect(gx, gy, def.size.w * T, def.size.h * T);
      ctx.globalAlpha = 1;
    }

    // Right-drag erase rectangle
    if (game.mouse.rdown && game.eraseDragStart) {
      const x0 = Math.min(game.eraseDragStart.x, game.mouse.wx);
      const y0 = Math.min(game.eraseDragStart.y, game.mouse.wy);
      const w = Math.abs(game.mouse.wx - game.eraseDragStart.x);
      const h = Math.abs(game.mouse.wy - game.eraseDragStart.y);
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x0, y0, w, h);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#ef4444';
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  /**
   * Render debug visualizations (only when debug flags are enabled)
   */
  private renderDebug(): void {
    const { game } = this;
    const { ctx } = game;

    // Region debug
    if (game.debug.regions) {
      drawRegionDebug(game);
    }

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

    // Danger memory visualization
    if (game.debug.colonists) {
      this.renderDangerMemory();
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
    ctx.globalAlpha = 0.4;

    // Draw solid/unwalkable tiles
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const idx = r * grid.cols + c;
        if (!grid.solid[idx]) continue;
        const x = c * T;
        const y = r * T;
        if (x + T < cam.x - 100 || x > cam.x + cam.w + 100) continue;
        if (y + T < cam.y - 100 || y > cam.y + cam.h + 100) continue;
        ctx.fillStyle = '#ff000088';
        ctx.fillRect(x, y, T, T);
      }
    }

    // Draw movement costs (terrain speed modifiers)
    ctx.font = '8px monospace';
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const idx = r * grid.cols + c;
        if (grid.solid[idx]) continue;
        const cost = grid.cost[idx];
        if (cost === 1) continue;
        const x = c * T;
        const y = r * T;
        if (x + T < cam.x - 100 || x > cam.x + cam.w + 100) continue;
        if (y + T < cam.y - 100 || y > cam.y + cam.h + 100) continue;
        const alpha = Math.min(1, (cost - 1) * 0.3);
        ctx.fillStyle = `rgba(255, 200, 0, ${alpha})`;
        ctx.fillRect(x, y, T, T);
        ctx.fillStyle = '#000000';
        ctx.fillText(cost.toFixed(1), x + 2, y + 10);
      }
    }

    ctx.restore();

    // Colonist paths
    for (const c of game.colonists) {
      if (!c.alive || !c.path || c.path.length === 0) continue;
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

    ctx.save();
    ctx.font = '10px monospace';
    ctx.lineWidth = 1;

    for (const c of game.colonists) {
      if (!c.alive) continue;
      const hiddenInside = c.inside && c.inside.kind !== 'bed';
      if (hiddenInside) continue;

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
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Show interaction range for current task
      if (c.target && c.task && (c.task === 'chop' || c.task === 'mine')) {
        const target = c.target as any;
        if (target.x != null && target.r != null) {
          const interactRange = target.r + c.r + 4 + 2.5;
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.4;
          ctx.beginPath();
          ctx.arc(target.x, target.y, interactRange, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;

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

    ctx.save();
    ctx.font = '9px monospace';

    for (const e of game.enemies) {
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
  private renderDangerMemory(): void {
    const { game } = this;
    const { ctx } = game;

    ctx.save();

    for (const c of game.colonists) {
      const col = c as any; // Colonist type needs dangerMemory
      if (!c.alive || !col.dangerMemory) continue;

      for (const mem of col.dangerMemory) {
        const timeSinceDanger = game.tDay - mem.time;

        // Skip very old memories that have faded completely
        if (timeSinceDanger >= 20) continue;

        // Calculate current danger radius
        const currentRadius = timeSinceDanger < 5 ? mem.radius :
          timeSinceDanger < 20 ? mem.radius * (1 - (timeSinceDanger - 5) / 15) : 0;

        if (currentRadius <= 0) continue;

        // Color and opacity based on how recent/strong the memory is
        const alpha = timeSinceDanger < 5 ? 0.3 : 0.15 * (1 - (timeSinceDanger - 5) / 15);
        const hue = timeSinceDanger < 5 ? 0 : 30; // Red to orange as it fades

        ctx.globalAlpha = alpha;
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.strokeStyle = `hsl(${hue}, 100%, 30%)`;
        ctx.lineWidth = 2;

        // Draw danger zone circle
        ctx.beginPath();
        ctx.arc(mem.x, mem.y, currentRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw small dot at danger center
        ctx.globalAlpha = alpha * 2;
        ctx.fillStyle = `hsl(${hue}, 100%, 20%)`;
        ctx.beginPath();
        ctx.arc(mem.x, mem.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Draw timer text
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.font = '10px monospace';
        const timeText = `${(20 - timeSinceDanger).toFixed(1)}s`;
        ctx.strokeText(timeText, mem.x - 10, mem.y - currentRadius - 5);
        ctx.fillText(timeText, mem.x - 10, mem.y - currentRadius - 5);
      }
    }

    ctx.restore();
  }

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
    const hotbar = game.hotbar.map(k => ({
      key: String(k),
      name: BUILD_TYPES[k].name,
      cost: game.costText(BUILD_TYPES[k].cost || {}),
      selected: game.selectedBuild === k
    }));

    // Main HUD
    drawHUD(ctx, canvas, {
      res: game.RES,
      colonists: game.colonists.filter(c => c.alive).length,
      cap,
      hiding,
      day: game.day,
      tDay: game.tDay,
      isNight: game.isNight(),
      hotbar,
      messages: game.messages,
      storage: { used: storageUsed, max: storageMax }
    }, game);

    // Colonist profile panel
    if (game.selColonist) {
      drawColonistProfileUI(game, game.selColonist);
    } else {
      game.colonistPanelRect = game.colonistPanelCloseRect = null;
    }

    // Build menu
    if (game.showBuildMenu) {
      drawBuildMenuUI(game);
    }

    // Placement UI
    if (game.pendingPlacement) {
      drawPlacementUIUI(game);
    }

    // Context menu
    if (game.contextMenu) {
      drawContextMenuUI(game);
    }

    // Work priority panel (modal overlay - renders on top of everything)
    drawWorkPriorityPanel(ctx, game.colonists, canvas.width, canvas.height);
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
