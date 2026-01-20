import { BUILD_TYPES } from "../buildings";
import { T, WORLD } from "../constants";
import type { Game } from "../Game";
import { handleWorkPriorityPanelHover, handleWorkPriorityPanelClick, isWorkPriorityPanelOpen } from "../ui/panels/workPriorityPanel";
import { handleBuildingInventoryPanelClick, isBuildingInventoryPanelOpen } from "../ui/panels/buildingInventoryPanel";
import { handleHotbarClick } from "../ui/hud/modernHotbar";
import { handleControlPanelClick } from "../ui/hud/controlPanel";
import { handleBuildMenuClick as handleModernBuildMenuClick } from "../ui/hud/modernBuildMenu";
import { handleBuildMenuClick as handleBuildMenuClickUI } from "../ui/buildMenu";
import { handleMobilePlacementClick, isClickOnGhost } from "../ui/mobilePlacement";
import { getZoneDef } from "../zones";
import { clamp } from "../../core/utils";
import { hideContextMenu as hideContextMenuUI } from "../ui/contextMenu";
import { cancelOrErasePlacement, canPlace as canPlacePlacement } from "../placement/placementSystem";

export function bindInput(game: Game): void {
  const c = game.canvas;
  c.addEventListener("mousemove", (e) => {
    const rect = c.getBoundingClientRect();
    game.mouse.x = (e.clientX - rect.left);
    game.mouse.y = (e.clientY - rect.top);
    const wpt = game.screenToWorld(game.mouse.x, game.mouse.y);
    game.mouse.wx = wpt.x; game.mouse.wy = wpt.y;

    if (isWorkPriorityPanelOpen()) {
      handleWorkPriorityPanelHover(
        game.mouse.x * game.DPR,
        game.mouse.y * game.DPR,
        game.colonists,
        game.canvas,
        game
      );
      return;
    }

    if (game.modernHotbarRects && Array.isArray(game.modernHotbarRects) && game.modernHotbarRects.length) {
      const mx = game.mouse.x * game.DPR; const my = game.mouse.y * game.DPR;
      let hoveredTab: any = null;
      for (const r of game.modernHotbarRects) {
        if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) { hoveredTab = r.tab; break; }
      }
      if (hoveredTab !== (game.uiManager as any).lastHoveredHotbarTab) {
        (game.uiManager as any).lastHoveredHotbarTab = hoveredTab;
        if (hoveredTab) {
          void game.audioManager.play("ui.hotbar.hover").catch(() => {});
        }
      }
    }

    if (game.uiManager.activeHotbarTab === "build") {
      const buildMenuRects = (game as any).modernBuildMenuRects;
      if (buildMenuRects && Array.isArray(buildMenuRects.categories) && Array.isArray(buildMenuRects.buildings)) {
        const mx = game.mouse.x * game.DPR; const my = game.mouse.y * game.DPR;
        let hoveredCategory: string | null = null;
        for (const r of buildMenuRects.categories) {
          if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) { hoveredCategory = r.category; break; }
        }
        if (hoveredCategory !== (game.uiManager as any).lastHoveredBuildCategory) {
          (game.uiManager as any).lastHoveredBuildCategory = hoveredCategory;
          if (hoveredCategory) { void game.audioManager.play("ui.hover").catch(() => {}); }
        }
        let hoveredBuilding: any = null;
        for (const r of buildMenuRects.buildings) {
          if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) { hoveredBuilding = r.buildingKey; break; }
        }
        if (hoveredBuilding !== (game.uiManager as any).lastHoveredBuildingKey) {
          (game.uiManager as any).lastHoveredBuildingKey = hoveredBuilding;
          if (hoveredBuilding) { void game.audioManager.play("ui.hover").catch(() => {}); }
        }
      }
    }

    if (game.pendingPlacement && game.mouse.down) {
      const def = BUILD_TYPES[game.pendingPlacement.key];
      const rot = game.pendingPlacement.rot || 0; const rotated = (rot === 90 || rot === 270);
      const gx = Math.floor(game.mouse.wx / T) * T; const gy = Math.floor(game.mouse.wy / T) * T;
      const w = (rotated ? def.size.h : def.size.w) * T, h = (rotated ? def.size.w : def.size.h) * T;
      game.pendingPlacement.x = clamp(gx, 0, WORLD.w - w);
      game.pendingPlacement.y = clamp(gy, 0, WORLD.h - h);
      return;
    }
    if (game.mouse.down) {
      const def = game.selectedBuild ? BUILD_TYPES[game.selectedBuild] : null;
      if (def?.isFloor) game.paintPathAtMouse();
      else if (game.selectedBuild === "wall") game.paintWallAtMouse();
    }
  });
  c.addEventListener("mousedown", (e) => {
    e.preventDefault();
    game.lastInputWasTouch = false;
    game.setTouchUIEnabled(false);
    if (game.touchUIManualOverride === null) {
      game.isActuallyTouchDevice = false;
    }

    if (game.tutorialSystem.isActive()) {
      if (game.tutorialSystem.handleClick(e.offsetX * game.DPR, e.offsetY * game.DPR)) {
        return;
      }
      if (game.tutorialSystem.shouldBlockClick(e)) {
        return;
      }
    }

    if (isWorkPriorityPanelOpen()) {
      if (handleWorkPriorityPanelClick(
        e.offsetX * game.DPR,
        e.offsetY * game.DPR,
        game.colonists,
        game.canvas,
        game
      )) {
        return;
      }
      return;
    }

    if (isBuildingInventoryPanelOpen()) {
      if (handleBuildingInventoryPanelClick(e.offsetX * game.DPR, e.offsetY * game.DPR, game.canvas.width, game.canvas.height)) {
        return;
      }
      return;
    }

    if ((e as MouseEvent).button === 0) {
      game.mouse.down = true;
      if (game.selColonist) {
        const mx0 = game.mouse.x * game.DPR; const my0 = game.mouse.y * game.DPR;
        if (game.colonistPanelCloseRect) {
          const r = game.colonistPanelCloseRect;
          if (mx0 >= r.x && mx0 <= r.x + r.w && my0 >= r.y && my0 <= r.y + r.h) {
            game.selColonist = null; game.follow = false; return;
          }
        }
        if (game.colonistAvatarRect) {
          const r = game.colonistAvatarRect;
          if (mx0 >= r.x && mx0 <= r.x + r.w && my0 >= r.y && my0 <= r.y + r.h) {
            game.follow = !game.follow;
            const colonistName = game.selColonist.profile?.name || "colonist";
            game.msg(game.follow ? `Following ${colonistName}` : `Stopped following ${colonistName}`, "info");
            return;
          }
        }
        if (game.colonistTabRects && Array.isArray(game.colonistTabRects)) {
          for (const tabRect of game.colonistTabRects) {
            if (tabRect && typeof tabRect.x === "number" && typeof tabRect.y === "number" &&
                typeof tabRect.w === "number" && typeof tabRect.h === "number") {
              if (mx0 >= tabRect.x && mx0 <= tabRect.x + tabRect.w && my0 >= tabRect.y && my0 <= tabRect.y + tabRect.h) {
                game.colonistProfileTab = tabRect.tab as any;
                return;
              }
            }
          }
        }

        if (game.colonistProfileTab === "health" && game.colonistHealthSubTabRects && Array.isArray(game.colonistHealthSubTabRects)) {
          for (const subTabRect of game.colonistHealthSubTabRects) {
            if (subTabRect && typeof subTabRect.x === "number" && typeof subTabRect.y === "number" &&
                typeof subTabRect.w === "number" && typeof subTabRect.h === "number") {
              if (mx0 >= subTabRect.x && mx0 <= subTabRect.x + subTabRect.w && my0 >= subTabRect.y && my0 <= subTabRect.y + subTabRect.h) {
                game.colonistHealthSubTab = subTabRect.tab as any;
                return;
              }
            }
          }
        }

        if (game.colonistProfileTab === "health" && game.colonistHealthToggles && Array.isArray(game.colonistHealthToggles)) {
          for (const toggle of game.colonistHealthToggles) {
            if (toggle && typeof toggle.x === "number" && typeof toggle.y === "number" &&
                typeof toggle.w === "number" && typeof toggle.h === "number") {
              if (mx0 >= toggle.x && mx0 <= toggle.x + toggle.w && my0 >= toggle.y && my0 <= toggle.y + toggle.h) {
                if (toggle.type === "selfTend" && game.selColonist) {
                  (game.selColonist as any).selfTend = !(game.selColonist as any).selfTend;
                  game.msg(`Self-tend ${(game.selColonist as any).selfTend ? "enabled" : "disabled"}`, "info");
                }
                return;
              }
            }
          }
        }

        if (game.colonistProfileTab === "health" && game.colonistHealthSubTab === "operations" &&
            game.colonistHealthOperationButtons && Array.isArray(game.colonistHealthOperationButtons)) {
          for (const button of game.colonistHealthOperationButtons) {
            if (button && typeof button.x === "number" && typeof button.y === "number" &&
                typeof button.w === "number" && typeof button.h === "number") {
              if (mx0 >= button.x && mx0 <= button.x + button.w && my0 >= button.y && my0 <= button.y + button.h) {
                if (button.type === "add" && game.selColonist && button.operation) {
                  game.queueOperation(game.selColonist, button.operation);
                  game.audioManager.play("ui.click.primary");
                } else if (button.type === "cancel" && game.selColonist && button.operationId) {
                  game.cancelOperation(game.selColonist, button.operationId);
                  game.audioManager.play("ui.click.secondary");
                }
                return;
              }
            }
          }
        }

        if (game.colonistPanelRect) {
          const r = game.colonistPanelRect;
          const inside = mx0 >= r.x && mx0 <= r.x + r.w && my0 >= r.y && my0 <= r.y + r.h;
          if (!inside) { game.selColonist = null; game.follow = false; return; }
        }
      }
      if (game.pendingPlacement) {
        const mx = game.mouse.x * game.DPR; const my = game.mouse.y * game.DPR;

        if (handleMobilePlacementClick(game, mx, my)) {
          return;
        }

        const p = game.pendingPlacement; const def = BUILD_TYPES[p.key];
        const toScreen = (wx: number, wy: number) => ({ x: (wx - game.camera.x) * game.camera.zoom, y: (wy - game.camera.y) * game.camera.zoom });
        const g = toScreen(p.x, p.y);
        const gw = def.size.w * T * game.camera.zoom; const gh = def.size.h * T * game.camera.zoom;
        if (mx >= g.x && mx <= g.x + gw && my >= g.y && my <= g.y + gh) {
          game.pendingDragging = true;
          void game.audioManager.play("ui.drag.start").catch(() => {});
          return;
        }
        const rot = p.rot || 0; const rotated = (rot === 90 || rot === 270);
        const gx = Math.floor(game.mouse.wx / T) * T; const gy = Math.floor(game.mouse.wy / T) * T;
        const w = (rotated ? def.size.h : def.size.w) * T, h = (rotated ? def.size.w : def.size.h) * T;
        p.x = clamp(gx, 0, WORLD.w - w); p.y = clamp(gy, 0, WORLD.h - h);
        return;
      }
      const mx = game.mouse.x * game.DPR; const my = game.mouse.y * game.DPR;
      if (game.modernHotbarRects && Array.isArray(game.modernHotbarRects)) {
        const clickedTab = handleHotbarClick(mx, my, game.modernHotbarRects);
        if (clickedTab) {
          game.uiManager.setHotbarTab(clickedTab);
          return;
        }
      }

      if (game.controlPanelRects && Array.isArray(game.controlPanelRects)) {
        if (handleControlPanelClick(mx, my, game.controlPanelRects, game)) {
          return;
        }
      }

      if (game.uiManager.activeHotbarTab === "build") {
        const buildMenuRects = (game as any).modernBuildMenuRects;
        if (buildMenuRects && Array.isArray(buildMenuRects.categories) && Array.isArray(buildMenuRects.buildings)) {
          const clickResult = handleModernBuildMenuClick(mx, my, buildMenuRects);
          if (clickResult) {
            if (clickResult.type === "category") {
              game.uiManager.setSelectedBuildCategory(clickResult.value);
              void game.audioManager.play("ui.click.primary").catch(() => {});
            } else if (clickResult.type === "building") {
              game.selectedBuild = clickResult.value;
              void game.audioManager.play("ui.click.primary").catch(() => {});
              game.uiManager.setHotbarTab(null);
              const def = BUILD_TYPES[clickResult.value] || getZoneDef(clickResult.value);
              if (def) {
                game.toast("Selected: " + def.name);
              }
            }
            return;
          }
        }
      }

      if (game.contextMenu) {
        const mx = game.mouse.x * game.DPR; const my = game.mouse.y * game.DPR;
        let clickedOnMenu = false;
        const menu = game.contextMenu;

        if (game.contextMenuRects && Array.isArray(game.contextMenuRects)) {
          for (const rect of game.contextMenuRects) {
            if (rect && typeof rect.x === "number" && typeof rect.y === "number" &&
                typeof rect.w === "number" && typeof rect.h === "number") {
              if (mx >= rect.x && mx <= rect.x + rect.w && my >= rect.y && my <= rect.y + rect.h) {
                const item = rect.item;
                if (!item) continue;
                const enabled = item.enabled !== false;

                if (!rect.isSubmenu && item.submenu && item.submenu.length) {
                  if (enabled) {
                    menu.openSubmenu = menu.openSubmenu === item.id ? undefined : item.id;
                    if (menu.openSubmenu) { void game.audioManager.play("ui.panel.open").catch(() => {}); }
                  }
                  clickedOnMenu = true;
                  return;
                }

                if (enabled) {
                  if (item.action) {
                    item.action({ game, target: menu.target, item });
                  } else if (menu.onSelect) {
                    menu.onSelect({ game, target: menu.target, item });
                  }
                  void game.audioManager.play("ui.click.primary").catch(() => {});
                }

                hideContextMenuUI(game);
                clickedOnMenu = true;
                return;
              }
            }
          }
        }

        if (!clickedOnMenu) {
          hideContextMenuUI(game);
        }
      }

      if (game.showBuildMenu) { handleBuildMenuClickUI(game); return; }

      if (game.selectedBuild) {
        const def = BUILD_TYPES[game.selectedBuild];
        if (def?.isFloor) { game.paintPathAtMouse(); return; }
        if (game.selectedBuild === "wall") { game.paintWallAtMouse(); return; }
      }

      if (game.selColonist) {
        if (!game.contextMenu || (game.contextMenu && !game.contextMenu.sticky)) {
          hideContextMenuUI(game);
        }

        const cms: ContextMenuItem[] = [];
        cms.push({ id: "move", label: "Move", action: () => game.moveCommand(game.selColonist!, { x: game.mouse.wx, y: game.mouse.wy }) });

        if (game.selectedBuild === "floor_smooth") {
          cms.push({ id: "smooth", label: "Smooth Floor", action: () => game.trySmoothFloorAt(game.mouse.wx, game.mouse.wy) });
        }
        if (game.selectedBuild === "harvest") {
          cms.push({ id: "harvest", label: "Harvest Plant", action: () => game.harvestPlantAt(game.mouse.wx, game.mouse.wy) });
        }
        if (game.selectedBuild === "cut_plant") {
          cms.push({ id: "cut", label: "Cut Plant", action: () => game.cutPlantAt(game.mouse.wx, game.mouse.wy) });
        }
        if (game.selectedBuild === "mine") {
          cms.push({ id: "mine", label: "Mine", action: () => game.mineAt(game.mouse.wx, game.mouse.wy) });
        }
        if (game.selectedBuild === "chop") {
          cms.push({ id: "chop", label: "Chop", action: () => game.chopAt(game.mouse.wx, game.mouse.wy) });
        }
        if (game.selectedBuild === "heal") {
          cms.push({ id: "heal", label: "Heal", action: () => game.healAt(game.mouse.wx, game.mouse.wy) });
        }
        if (game.selectedBuild === "doctor") {
          cms.push({ id: "doctor", label: "Tend", action: () => game.doctorAt(game.mouse.wx, game.mouse.wy) });
        }
        if (game.selectedBuild === "cook") {
          cms.push({ id: "cook", label: "Cook", action: () => game.cookAt(game.mouse.wx, game.mouse.wy) });
        }

        const target = game.entityAt(game.mouse.wx, game.mouse.wy, 12);
        if (target && target.type === "colonist" && !game.contextMenu) {
          game.contextMenu = {
            x: game.mouse.x * game.DPR,
            y: game.mouse.y * game.DPR,
            items: cms,
            target,
            sticky: true
          };
        }
      }
    } else if ((e as MouseEvent).button === 2) {
      game.mouse.rdown = true;

      if (game.selectedBuild === "stock" || game.selectedBuild === "mine" || game.selectedBuild === "tree_growing") {
        game.uiManager.zoneDragStart = { x: game.mouse.wx, y: game.mouse.wy };
        return;
      }

      if (game.selectedBuild === "wall" || game.selectedBuild === "floor") {
        game.eraseDragStart = { x: game.mouse.wx, y: game.mouse.wy };
        return;
      }

      if (game.contextMenu && game.contextMenu.sticky) {
        hideContextMenuUI(game);
      } else {
        game.showContextMenu();
      }
    }
  });

  c.addEventListener("mouseup", (e) => {
    if ((e as MouseEvent).button === 0) {
      game.mouse.down = false; game.pendingDragging = false;
      if (game.pendingPlacement) {
        if (game.pendingDragging) {
          game.pendingDragging = false;
          void game.audioManager.play("ui.drag.end").catch(() => {});
        } else {
          if (isClickOnGhost(game)) {
            game.confirmPending();
          } else {
            game.placeAtMouse();
          }
        }
      }
      if (game.uiManager.zoneDragStart && (game.selectedBuild === "stock" || game.selectedBuild === "mine" || game.selectedBuild === "tree_growing")) {
        game.finalizeStockpileDrag(game.uiManager.zoneDragStart, { x: game.mouse.wx, y: game.mouse.wy });
        game.uiManager.zoneDragStart = null;
      }
      if (game.eraseDragStart) {
        const rect = {
          x: Math.min(game.eraseDragStart.x, game.mouse.wx),
          y: Math.min(game.eraseDragStart.y, game.mouse.wy),
          w: Math.abs(game.eraseDragStart.x - game.mouse.wx),
          h: Math.abs(game.eraseDragStart.y - game.mouse.wy)
        };
        game.eraseInRect(rect);
        game.eraseDragStart = null;
      }
    } else if ((e as MouseEvent).button === 2) {
      game.mouse.rdown = false; game.eraseDragStart = null; game.uiManager.zoneDragStart = null;
      if (game.selectedBuild === "stock" || game.selectedBuild === "mine" || game.selectedBuild === "tree_growing") {
        game.uiManager.zoneDragStart = { x: game.mouse.wx, y: game.mouse.wy };
      }
    }
  });

  c.addEventListener("wheel", (e) => {
    if (game.locked) return;
    if (game.debug.forceDesktopMode) {
      e.preventDefault();
    }
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    game.camera.zoom = Math.max(Game.MIN_ZOOM, Math.min(2, game.camera.zoom + delta));
    game.cameraSystem.setZoom(game.camera.zoom);
    game.updateZoomOverlay();
  }, { passive: false });

  c.addEventListener("touchstart", (e) => {
    game.lastInputWasTouch = true;
    game.isActuallyTouchDevice = true;
    game.setTouchUIEnabled(true);

    const touches = (e as TouchEvent).touches;
    if (touches.length === 1) {
      const rect = c.getBoundingClientRect();
      const t = touches[0];
      game.mouse.x = (t.clientX - rect.left);
      game.mouse.y = (t.clientY - rect.top);
      const wpt = game.screenToWorld(game.mouse.x, game.mouse.y);
      game.mouse.wx = wpt.x; game.mouse.wy = wpt.y;
      game.mouse.down = true;
      game.touchZoneDragActive = true;
      game.touchZoneLastPos = { x: game.mouse.wx, y: game.mouse.wy };
      game.uiManager.zoneDragStart = { x: game.mouse.wx, y: game.mouse.wy };
    } else if (touches.length === 2) {
      game.touchLastDist = Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      );
      game.touchLastPan = {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2
      };
    }
  }, { passive: false });

  c.addEventListener("touchmove", (e) => {
    game.lastInputWasTouch = true;
    game.isActuallyTouchDevice = true;
    if (game.locked) return;
    const touches = (e as TouchEvent).touches;
    if (touches.length === 1) {
      const rect = c.getBoundingClientRect();
      const t = touches[0];
      const prev = { x: game.mouse.x, y: game.mouse.y };
      game.mouse.x = (t.clientX - rect.left);
      game.mouse.y = (t.clientY - rect.top);
      const wpt = game.screenToWorld(game.mouse.x, game.mouse.y);
      game.mouse.wx = wpt.x; game.mouse.wy = wpt.y;
      if (game.pendingPlacement) {
        const p = game.pendingPlacement;
        const def = BUILD_TYPES[p.key];
        const rot = p.rot || 0; const rotated = (rot === 90 || rot === 270);
        const gx = Math.floor(game.mouse.wx / T) * T; const gy = Math.floor(game.mouse.wy / T) * T;
        const w = (rotated ? def.size.h : def.size.w) * T, h = (rotated ? def.size.w : def.size.h) * T;
        p.x = clamp(gx, 0, WORLD.w - w); p.y = clamp(gy, 0, WORLD.h - h);
      } else if (game.mouse.down && !game.uiManager.zoneDragStart && !game.touchZoneDragActive) {
        const dx = game.mouse.x - prev.x;
        const dy = game.mouse.y - prev.y;
        game.cameraSystem.pan(-dx / game.camera.zoom, -dy / game.camera.zoom);
        game.clampCameraToWorld();
        game.cameraSystem.setCamera(game.camera.x, game.camera.y);
      } else if (game.uiManager.zoneDragStart) {
        game.touchZoneLastPos = { x: game.mouse.wx, y: game.mouse.wy };
      }
    } else if (touches.length === 2) {
      const dist = Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      );
      if (game.touchLastDist !== null) {
        const delta = dist - game.touchLastDist;
        game.camera.zoom = Math.max(Game.MIN_ZOOM, Math.min(2, game.camera.zoom + delta * 0.002));
        game.cameraSystem.setZoom(game.camera.zoom);
        game.updateZoomOverlay();
      }
      game.touchLastDist = dist;
      const panX = (touches[0].clientX + touches[1].clientX) / 2;
      const panY = (touches[0].clientY + touches[1].clientY) / 2;
      if (game.touchLastPan) {
        const dx = panX - game.touchLastPan.x;
        const dy = panY - game.touchLastPan.y;
        game.cameraSystem.pan(-dx / game.camera.zoom, -dy / game.camera.zoom);
        game.clampCameraToWorld();
        game.cameraSystem.setCamera(game.camera.x, game.camera.y);
      }
      game.touchLastPan = { x: panX, y: panY };
    }
    e.preventDefault();
  }, { passive: false });

  c.addEventListener("touchend", (e) => {
    game.lastInputWasTouch = true;
    game.isActuallyTouchDevice = true;
    const touches = (e as TouchEvent).touches;
    if (touches.length === 0) {
      if (game.pendingPlacement && game.touchZoneDragActive) {
        const wasDrag = game.touchZoneLastPos && (Math.abs(game.touchZoneLastPos.x - game.mouse.wx) > T * 0.5 || Math.abs(game.touchZoneLastPos.y - game.mouse.wy) > T * 0.5);
        if (!wasDrag) {
          if (isClickOnGhost(game)) { game.confirmPending(); }
          else { game.placeAtMouse(); }
        }
      } else if (game.selectedBuild === "stock" && game.touchZoneDragActive) {
        const created = game.finalizeStockpileDrag(game.uiManager.zoneDragStart, { x: game.mouse.wx, y: game.mouse.wy }, true);
        if (!created) {
          const endWorld = game.touchZoneLastPos || { x: game.mouse.wx, y: game.mouse.wy };
          game.finalizeStockpileDrag(game.uiManager.zoneDragStart, endWorld, true);
        }
      } else if (game.selectedBuild === "mine" && game.touchZoneDragActive) {
        const endWorld = game.touchZoneLastPos || { x: game.mouse.wx, y: game.mouse.wy };
        game.finalizeMiningZoneDrag(game.uiManager.zoneDragStart, endWorld, true);
      } else if (game.selectedBuild === "tree_growing" && game.touchZoneDragActive) {
        const endWorld = game.touchZoneLastPos || { x: game.mouse.wx, y: game.mouse.wy };
        game.finalizeTreeGrowingZoneDrag(game.uiManager.zoneDragStart, endWorld, true);
      }
      game.touchZoneDragActive = false;
      game.touchZoneLastPos = null;
      game.uiManager.zoneDragStart = null;
    } else if (touches.length === 1) {
      const rect = c.getBoundingClientRect();
      const t = touches[0];
      game.mouse.x = (t.clientX - rect.left);
      game.mouse.y = (t.clientY - rect.top);
      const wpt = game.screenToWorld(game.mouse.x, game.mouse.y);
      game.mouse.wx = wpt.x; game.mouse.wy = wpt.y;
      game.touchZoneLastPos = { x: game.mouse.wx, y: game.mouse.wy };
    }
    game.touchLastPan = null;
    game.touchLastDist = null;
  }, { passive: false });

  c.addEventListener("touchcancel", () => {
    game.touchZoneDragActive = false;
    game.touchZoneLastPos = null;
    game.uiManager.zoneDragStart = null;
    game.touchLastPan = null;
    game.touchLastDist = null;
  });
}
