import { BUILD_TYPES, hasCost, makeBuilding } from "../buildings";
import { canPlace as canPlacePlacement } from "../placement/placementSystem";
import { COLORS, T } from "../constants";

export function drawPlacementUI(game: any) {
  const p = game.pendingPlacement; if (!p) return;
  const def = BUILD_TYPES[p.key];
  const ctx = game.ctx as CanvasRenderingContext2D; const w = def.size.w * T; const h = def.size.h * T;
  const toScreen = (wx: number, wy: number) => ({ x: (wx - game.camera.x) * game.camera.zoom, y: (wy - game.camera.y) * game.camera.zoom });
  const scr = toScreen(p.x, p.y);
  let sw = w * game.camera.zoom; let sh = h * game.camera.zoom;
  const rot = p.rot || 0; const rotated = (rot === 90 || rot === 270);
  if (rotated) { const tmp = sw; sw = sh; sh = tmp; }
  ctx.save();
  const bTmp = makeBuilding(p.key as any, p.x + 1, p.y + 1);
  const can = canPlacePlacement(game, bTmp as any, bTmp.x, bTmp.y) && hasCost(game.RES, def.cost);
  ctx.globalAlpha = .6; ctx.fillStyle = can ? COLORS.ghost : '#ff6b6b88'; ctx.fillRect(scr.x, scr.y, sw, sh); ctx.globalAlpha = 1;
  ctx.strokeStyle = '#4b9fff'; ctx.setLineDash([4,3]); ctx.strokeRect(scr.x + .5, scr.y + .5, sw - 1, sh - 1); ctx.setLineDash([]);
  ctx.restore();
  const pad = game.scale(10); const btn = game.scale(42);
  let cx = scr.x + sw + pad; let cy = scr.y; const maxW = game.canvas.width;
  if (cx + btn * 3 > maxW - game.scale(6)) cx = Math.max(game.scale(6), scr.x - pad - btn * 3);
  const makeRect = (id: any, x: number, y: number) => ({ id, x, y, w: btn, h: btn });
  const rects = [
    makeRect('up', cx + btn, cy),
    makeRect('left', cx, cy + btn),
    makeRect('right', cx + btn * 2, cy + btn),
    makeRect('down', cx + btn, cy + btn * 2),
    makeRect('rotL', cx, cy + btn * 3 + game.scale(6)),
    makeRect('rotR', cx + btn * 2, cy + btn * 3 + game.scale(6)),
    makeRect('cancel', cx, cy + btn * 4 + game.scale(6)),
    makeRect('ok', cx + btn * 2, cy + btn * 4 + game.scale(6)),
  ];
  game.placeUIRects = rects as any;
  ctx.save();
  ctx.fillStyle = '#0f172aee'; ctx.strokeStyle = '#1e293b';
  const drawBtn = (r: any, label: string, disabled = false) => { 
    ctx.save(); ctx.globalAlpha = disabled ? 0.5 : 1; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.strokeRect(r.x + .5, r.y + .5, r.w - 1, r.h - 1);
    ctx.fillStyle = '#dbeafe'; ctx.font = game.getScaledFont(18, '600'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + game.scale(2)); ctx.restore(); ctx.fillStyle = '#0f172aee'; };
  for (const r of rects) {
    if (r.id === 'up') drawBtn(r, '↑'); else if (r.id === 'down') drawBtn(r, '↓'); else if (r.id === 'left') drawBtn(r, '←'); else if (r.id === 'right') drawBtn(r, '→');
    else if (r.id === 'rotL') drawBtn(r, '⟲'); else if (r.id === 'rotR') drawBtn(r, '⟳'); else if (r.id === 'ok') drawBtn(r, 'OK', !can); else if (r.id === 'cancel') drawBtn(r, 'X');
  }
  ctx.fillStyle = '#dbeafe'; ctx.font = game.getScaledFont(14, '500'); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('Drag to move • Tap OK to place', Math.max(game.scale(6), scr.x), Math.max(game.scale(6), scr.y - game.scale(26)));
  ctx.restore();
}
