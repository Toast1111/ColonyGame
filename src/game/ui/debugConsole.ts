import type { Game } from "../Game";
import { itemDatabase } from "../../data/itemDatabase";

type CommandHandler = (game: Game, args: string[]) => string | void;

export function initDebugConsole(game: Game) {
  (game as any).debugConsole = {
    open: false,
    input: "",
    history: [] as string[],
    historyIndex: -1,
    output: [] as string[],
    commands: new Map<string, CommandHandler>()
  };

  const reg = (name: string, fn: CommandHandler, help?: string) => {
    (game as any).debugConsole.commands.set(name, fn);
    // store help text as output of 'help name'
    if (help) (fn as any).help = help;
  };

  reg("help", (g, args) => {
    const dc = (g as any).debugConsole;
    if (args.length) {
      const fn = dc.commands.get(args[0]);
      return fn && (fn as any).help ? (fn as any).help : `No help for '${args[0]}'`;
    }
  return "commands: help, toggle, spawn, speed, pause, give, select, clear";
  }, "help [cmd] — show commands or help for cmd");

  reg("toggle", (g, args) => {
    const flag = (args[0] || "").toLowerCase();
  if (!flag) return "usage: toggle <nav|colonists|combat>";
    if (flag === "nav") g.debug.nav = !g.debug.nav;
    else if (flag === "colonists") g.debug.colonists = !g.debug.colonists;
  else if (flag === "combat") (g.debug as any).combat = !(g.debug as any).combat;
    else return `unknown toggle '${flag}'`;
    return `${flag} = ${flag === 'combat' ? (g.debug as any).combat : (g.debug as any)[flag]}`;
  }, "toggle nav|colonists|combat — flip debug flags");

  reg("spawn", (g, args) => {
    const what = (args[0] || "enemy").toLowerCase();
    const n = Math.max(1, Math.min(20, parseInt(args[1] || "1", 10) || 1));
    if (what === "enemy") { for (let i = 0; i < n; i++) g.spawnEnemy(); return `spawned ${n} enemy`; }
    if (what === "colonist") { for (let i = 0; i < n; i++) g.spawnColonist({ x: g.camera.x + 100 + i * 8, y: g.camera.y + 100 }); return `spawned ${n} colonist`; }
    return `unknown spawn '${what}'`;
  }, "spawn enemy [n] | spawn colonist [n]");

  reg("speed", (g, args) => {
    const s = parseFloat(args[0] || "");
    if (!isFinite(s) || s <= 0) return "usage: speed <number> e.g. 1 or 6";
    g.fastForward = s;
    return `speed = ${g.fastForward}`;
  }, "speed <n> — set game speed multiplier");

  reg("pause", (g) => { g.paused = !g.paused; return `paused = ${g.paused}`; }, "pause — toggle pause");

  reg("weapons", (g) => {
    const defs = itemDatabase.getItemDefsByCategory('Weapon');
    if (!defs.length) return 'no weapons loaded';
    return 'weapons: ' + defs.map(d => d.defName).sort().join(', ');
  }, "weapons — list available weapon defNames");

  reg("give", (g, args) => {
    const what = (args[0] || "").trim();
    if (!what) return "usage: give <ItemDefName> [all]";
    const def = itemDatabase.getItemDef(what) || itemDatabase.getItemDef(what[0].toUpperCase() + what.slice(1));
    if (!def) return `unknown item: ${what}`;
    const all = (args[1] || "").toLowerCase() === "all";
    const targets = all ? g.colonists : (g.selColonist ? [g.selColonist] : []);
    if (!targets.length) return "no colonist selected (use 'select next') or add 'all'";
    for (const c of targets) {
      if (!c.inventory) (c as any).inventory = { items: [], equipment: {}, carryCapacity: 50, currentWeight: 0 } as any;
      const item = itemDatabase.createItem(def.defName, 1, 'normal');
      if (!(c as any).inventory.equipment) (c as any).inventory.equipment = {} as any;
      (c as any).inventory.equipment.weapon = item || null;
      g.recalcInventoryWeight(c);
    }
    return `gave ${def.label} to ${targets.length} colonist(s)`;
  }, "give <ItemDefName> [all] — equip item to selected or all");

  reg("select", (g, args) => {
    const sub = (args[0] || "").toLowerCase();
    if (sub !== "next") return "usage: select next";
    const alive = g.colonists.filter(c => c.alive);
    if (!alive.length) return "no colonists";
    const idx = Math.max(0, alive.indexOf(g.selColonist || alive[0]));
    const next = alive[(idx + 1) % alive.length];
    g.selColonist = next; g.follow = true;
    return `selected ${next.profile?.name || 'colonist'}`;
  }, "select next — select next colonist");

  reg("clear", (g, args) => {
    const what = (args[0] || "messages").toLowerCase();
    if (what === "messages") { g.messages.length = 0; return "cleared messages"; }
    if (what === "bullets") { g.bullets.length = 0; return "cleared bullets"; }
    return "usage: clear messages|bullets";
  }, "clear messages|bullets — clear logs or bullets");
}

export function toggleDebugConsole(game: Game) {
  const dc = (game as any).debugConsole;
  if (!dc) return;
  dc.open = !dc.open;
}

export function handleDebugConsoleKey(game: Game, e: KeyboardEvent) {
  const dc = (game as any).debugConsole;
  if (!dc || !dc.open) return false;
  if (e.key === 'Escape') { dc.open = false; return true; }
  if (e.key === 'Enter') {
    const line = dc.input.trim();
    if (line.length) {
      dc.history.unshift(line);
      dc.historyIndex = -1;
      execute(game, line);
      dc.input = "";
    }
    return true;
  }
  if (e.key === 'Backspace') { dc.input = dc.input.slice(0, -1); return true; }
  if (e.key === 'ArrowUp') { if (dc.history.length) { dc.historyIndex = Math.min(dc.historyIndex + 1, dc.history.length - 1); dc.input = dc.history[dc.historyIndex]; } return true; }
  if (e.key === 'ArrowDown') { if (dc.historyIndex > 0) { dc.historyIndex -= 1; dc.input = dc.history[dc.historyIndex]; } else { dc.historyIndex = -1; dc.input = ""; } return true; }
  // Append printable characters
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { dc.input += e.key; return true; }
  return false;
}

function execute(game: Game, line: string) {
  const dc = (game as any).debugConsole;
  const [cmd, ...args] = line.split(/\s+/);
  const fn = dc.commands.get(cmd.toLowerCase());
  if (!fn) { dc.output.push(`unknown command: ${cmd}`); trim(dc); return; }
  try {
    const res = fn(game, args);
    if (res) dc.output.push(res);
  } catch (err: any) {
    dc.output.push(`error: ${err?.message || err}`);
  }
  trim(dc);
}

function trim(dc: any) {
  const max = 10;
  if (dc.output.length > max) dc.output.splice(0, dc.output.length - max);
}

export function drawDebugConsole(game: Game) {
  const dc = (game as any).debugConsole;
  if (!dc || !dc.open) return;
  const ctx = game.ctx;
  const pad = 10; const w = game.canvas.width; const h = game.canvas.height;
  const hotbarH = game.scale(game.isTouch ? 86 : 64);
  const bottomOffset = hotbarH + 8; // keep above the quick build menu with a gap
  const boxH = Math.min(220, Math.max(140, Math.round(h * 0.25)));
  ctx.save();
  ctx.resetTransform();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = '#0b1220cc';
  const y0 = h - bottomOffset - boxH;
  ctx.fillRect(0, y0, w, boxH);
  // Outline for better visibility
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#ffffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, y0 + 0.5, w - 1, boxH - 1);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#c7d2fe';
  const fontSize = game.isTouch ? 17 : 15;
  ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // Output lines
  let y = y0 + pad + 4;
  for (const line of dc.output) {
    ctx.fillText(line, pad, y);
    y += fontSize + 5;
  }
  // Prompt
  const prompt = `> ${dc.input}`;
  ctx.fillStyle = '#e5e7eb';
  const promptY = (h - bottomOffset) - pad;
  ctx.fillText(prompt, pad, promptY);
  // Blinking caret
  const showCaret = (performance.now() % 1000) < 600;
  if (showCaret) {
    const metrics = ctx.measureText(prompt);
    const tw = metrics.width;
    const ascent = (metrics as any).actualBoundingBoxAscent || fontSize * 0.9;
    const descent = (metrics as any).actualBoundingBoxDescent || fontSize * 0.2;
    const cx = pad + tw + 2;
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, promptY - ascent);
    ctx.lineTo(cx, promptY + descent);
    ctx.stroke();
  }
  ctx.restore();
}
