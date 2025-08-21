import { COLORS, T, WORLD } from "./constants";
import type { Building, Bullet, Camera, Message } from "./types";

export function clear(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = COLORS.sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

export function applyWorldTransform(ctx: CanvasRenderingContext2D, cam: Camera) {
  ctx.translate(-cam.x * cam.zoom, -cam.y * cam.zoom);
  ctx.scale(cam.zoom, cam.zoom);
}

export function drawGround(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = COLORS.ground;
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  ctx.globalAlpha = 0.08; ctx.strokeStyle = '#d6e4ff'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= WORLD.w; x += T) { ctx.moveTo(x, 0); ctx.lineTo(x, WORLD.h); }
  for (let y = 0; y <= WORLD.h; y += T) { ctx.moveTo(0, y); ctx.lineTo(WORLD.w, y); }
  ctx.stroke(); ctx.globalAlpha = 1;
}

export function drawCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

export function drawPoly(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, n: number, color: string, rot = 0) {
  ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < n; i++) { const a = rot + i * 2 * Math.PI / n; const px = x + Math.cos(a) * r; const py = y + Math.sin(a) * r; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
  ctx.closePath(); ctx.fill();
}

// Tiny person glyph for UI badges
export function drawPersonIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size = 10, color = COLORS.colonist) {
  ctx.save();
  ctx.translate(x, y);
  // shadow/outline for readability
  const outline = '#0b0f14';
  // head
  const hr = size * 0.32; const hy = -size * 0.3;
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, hy, hr, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, hy, hr + 0.5, 0, Math.PI * 2); ctx.stroke();
  // body (torso)
  const bw = size * 0.55, bh = size * 0.55; const by = -size * 0.05;
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(-bw / 2, by - bh / 2);
  ctx.lineTo(bw / 2, by - bh / 2);
  ctx.lineTo(bw / 2, by + bh / 2);
  ctx.lineTo(-bw / 2, by + bh / 2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = outline; ctx.stroke();
  // legs
  const lw = size * 0.18, lh = size * 0.5, ly = by + bh / 2 + lh * 0.1;
  ctx.fillStyle = color;
  ctx.fillRect(-lw - 0.6, ly - lh, lw, lh);
  ctx.fillRect(0.6, ly - lh, lw, lh);
  ctx.strokeStyle = outline; ctx.strokeRect(-lw - 0.6, ly - lh, lw, lh);
  ctx.strokeRect(0.6, ly - lh, lw, lh);
  ctx.restore();
}

// Small shield icon, centered at (x,y)
export function drawShieldIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size = 12, color = '#60a5fa') {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = '#0b0f14';
  ctx.lineWidth = 1;
  // Shield path
  ctx.beginPath();
  const w = size, h = size * 1.2;
  ctx.moveTo(0, -h * 0.5);
  ctx.lineTo(w * 0.35, -h * 0.25);
  ctx.lineTo(w * 0.35, h * 0.1);
  ctx.quadraticCurveTo(0, h * 0.55, -w * 0.35, h * 0.1);
  ctx.lineTo(-w * 0.35, -h * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawBuilding(ctx: CanvasRenderingContext2D, b: Building) {
  // Path visual: subtle darker tile
  if ((b as any).kind === 'path') {
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = '#0b0f14cc'; ctx.strokeRect(b.x + .5, b.y + .5, b.w - 1, b.h - 1);
    return;
  }
  ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.strokeStyle = '#0b0f14cc'; ctx.strokeRect(b.x + .5, b.y + .5, b.w - 1, b.h - 1);
  if (!b.done) {
    ctx.fillStyle = '#0b1220'; ctx.fillRect(b.x, b.y - 6, b.w, 4);
    ctx.fillStyle = '#6ee7ff'; const pct = 1 - (b.buildLeft / b.build);
    ctx.fillRect(b.x, b.y - 6, pct * b.w, 4);
  }
  ctx.fillStyle = '#0b0f14aa'; ctx.font = 'bold 12px system-ui';
  const cx = b.x + b.w / 2; const cy = b.y + b.h / 2; let letter = 'B';
  if (b.kind === 'hq') letter = 'HQ';
  else if (b.kind === 'house') letter = 'H';
  else if (b.kind === 'farm') letter = b.ready ? 'F*' : 'F';
  else if (b.kind === 'turret') letter = 'T';
  else if (b.kind === 'wall') letter = 'W';
  else if (b.kind === 'stock') letter = 'S';
  else if (b.kind === 'tent') letter = 'R';
  else if ((b as any).kind === 'warehouse') letter = 'WH';
  else if ((b as any).kind === 'well') letter = 'WL';
  else if ((b as any).kind === 'infirmary') letter = 'I';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(letter, cx, cy);
  if (b.kind === 'turret' && (b as any).range) { ctx.globalAlpha = .07; ctx.fillStyle = '#e2f3ff'; ctx.beginPath(); ctx.arc(cx, cy, (b as any).range, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
}

export function drawBullets(ctx: CanvasRenderingContext2D, bullets: Bullet[]) {
  for (const b of bullets) {
    ctx.globalAlpha = .8; ctx.strokeStyle = '#e0f2fe'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.tx, b.ty); ctx.stroke(); ctx.globalAlpha = 1;
  }
}

export function drawHUD(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, parts: { res: { wood: number; stone: number; food: number }, colonists: number, cap: number, hiding: number, day: number, tDay: number, isNight: boolean, hotbar: Array<{ key: string; name: string; cost: string; selected: boolean }>, messages: Message[] }) {
  const PAD = 10; const BARH = 34; const W = canvas.width;
  ctx.fillStyle = '#0b122088'; ctx.fillRect(0, 0, W, BARH);
  ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1; ctx.strokeRect(0, .5, W, BARH);
  ctx.fillStyle = '#dbeafe'; ctx.font = '600 14px system-ui,Segoe UI,Roboto';
  let x = PAD;
  pill(ctx, x, 8, `Wood: ${parts.res.wood | 0}`, '#b08968'); x += 140;
  pill(ctx, x, 8, `Stone: ${parts.res.stone | 0}`, '#9aa5b1'); x += 150;
  pill(ctx, x, 8, `Food: ${parts.res.food | 0}`, '#9ae6b4'); x += 140;
  const popText = `Colonists: ${parts.colonists}/${parts.cap}`; pill(ctx, x, 8, popText, '#93c5fd'); x += 190;
  const hidText = `Hiding: ${parts.hiding}`; pill(ctx, x, 8, hidText, '#60a5fa'); x += 120;
  const timeText = `Day ${parts.day} — ${(parts.tDay * 24) | 0}:00 ${parts.isNight ? '🌙' : '☀️'}`; pill(ctx, x, 8, timeText, parts.isNight ? '#ffd166' : '#6ee7ff');
  const hbY = canvas.height - 46; const hbItemW = 150; x = PAD;
  ctx.fillStyle = '#0b122088'; ctx.fillRect(0, hbY, canvas.width, 46);
  ctx.strokeStyle = '#1e293b'; ctx.strokeRect(0, hbY + .5, canvas.width, 46);
  ctx.font = '500 13px system-ui,Segoe UI,Roboto';
  for (let i = 0; i < parts.hotbar.length; i++) {
    const h = parts.hotbar[i];
    drawHot(ctx, x + 2, hbY + 6, hbItemW - 6, 34, `${i + 1}. ${h.name}`, h.cost, h.selected);
    x += hbItemW;
  }
  let my = BARH + 6;
  for (let i = parts.messages.length - 1; i >= 0; i--) { const m = parts.messages[i]; drawMsg(ctx, W - 360, my, m.text); my += 22; }
}

function pill(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string) {
  const w = ctx.measureText(text).width + 18; const h = 20;
  ctx.fillStyle = '#0f172a'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#1e293b'; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
  ctx.fillStyle = color; ctx.fillRect(x + 2, y + 2, 6, h - 4);
  ctx.fillStyle = '#dbeafe'; ctx.fillText(text, x + 12, y + 14);
}
function drawHot(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string, cost: string, selected: boolean) {
  ctx.fillStyle = selected ? '#102034' : '#0f172a'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = selected ? '#4b9fff' : '#1e293b'; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
  ctx.fillStyle = '#dbeafe'; ctx.fillText(label, x + 8, y + 20);
  ctx.fillStyle = '#9fb3c8'; ctx.fillText(cost, x + w - 48, y + 20);
}
function drawMsg(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
  ctx.fillStyle = '#0f172aee'; ctx.fillRect(x, y, 340, 20);
  ctx.strokeStyle = '#1e293b'; ctx.strokeRect(x + .5, y + .5, 340 - 1, 20 - 1);
  ctx.fillStyle = '#dbeafe'; ctx.fillText(text, x + 8, y + 14);
}
