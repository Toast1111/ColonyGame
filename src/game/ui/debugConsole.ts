import type { Game } from "../Game";
import { itemDatabase } from "../../data/itemDatabase";
import { initializeColonistHealth } from "../health/healthSystem";

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
    return "commands: help, toggle, spawn, speed, pause, give, select, clear, injure, health, resources, drop, stockpile, kill, heal, godmode";
  }, "help [cmd] — show commands or help for cmd");

  reg("toggle", (g, args) => {
    const flag = (args[0] || "").toLowerCase();
    if (!flag) return "usage: toggle <nav|colonists|combat|enemies>";
    if (flag === "nav") g.debug.nav = !g.debug.nav;
    else if (flag === "colonists") g.debug.colonists = !g.debug.colonists;
    else if (flag === "combat") (g.debug as any).combat = !(g.debug as any).combat;
    else if (flag === "enemies") {
      (g as any).disableEnemySpawns = !(g as any).disableEnemySpawns;
      return `enemy spawns ${(g as any).disableEnemySpawns ? 'disabled' : 'enabled'}`;
    }
    else return `unknown toggle '${flag}'`;
    return `${flag} = ${flag === 'combat' ? (g.debug as any).combat : (g.debug as any)[flag]}`;
  }, "toggle nav|colonists|combat|enemies — flip debug flags or disable enemy spawning");

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

  reg("give", (g, args) => {
    const what = (args[0] || "").toLowerCase();
    const target = (args[1] || "selected").toLowerCase();
    
    // Get target colonist(s)
    let targets: any[] = [];
    if (target === "all") {
      targets = g.colonists.filter(c => c.alive);
    } else if (target === "selected") {
      targets = g.selColonist ? [g.selColonist] : [];
    } else {
      // Try to find colonist by name
      const found = g.colonists.find(c => c.alive && c.profile?.name?.toLowerCase().includes(target));
      if (found) targets = [found];
    }
    
    if (!targets.length) {
      return target === "selected" ? "no colonist selected (use 'select next')" : `no colonist found matching '${target}'`;
    }

    // Initialize inventory if needed
    for (const c of targets) {
      if (!c.inventory) {
        (c as any).inventory = { 
          items: [], 
          equipment: {}, 
          carryCapacity: 50, 
          currentWeight: 0 
        };
      }
      if (!(c as any).inventory.equipment) {
        (c as any).inventory.equipment = {};
      }
    }
    
    // Handle different item types
    if (what === "pistol" || what === "autopistol" || what === "weapon") {
      for (const c of targets) {
        const pistol = itemDatabase.createItem('Autopistol', 1, 'normal');
        (c as any).inventory.equipment.weapon = pistol;
        g.recalcInventoryWeight(c);
      }
      return `gave autopistol to ${targets.length} colonist(s)`;
    }
    else if (what === "rifle" || what === "assaultrifle") {
      for (const c of targets) {
        const rifle = itemDatabase.createItem('AssaultRifle', 1, 'normal');
        (c as any).inventory.equipment.weapon = rifle;
        g.recalcInventoryWeight(c);
      }
      return `gave assault rifle to ${targets.length} colonist(s)`;
    }
    else if (what === "sniper" || what === "sniperrifle") {
      for (const c of targets) {
        const sniper = itemDatabase.createItem('SniperRifle', 1, 'normal');
        (c as any).inventory.equipment.weapon = sniper;
        g.recalcInventoryWeight(c);
      }
      return `gave sniper rifle to ${targets.length} colonist(s)`;
    }
    else if (what === "smg") {
      for (const c of targets) {
        const smg = itemDatabase.createItem('SMG', 1, 'normal');
        (c as any).inventory.equipment.weapon = smg;
        g.recalcInventoryWeight(c);
      }
      return `gave SMG to ${targets.length} colonist(s)`;
    }
    else if (what === "club") {
      for (const c of targets) {
        const club = itemDatabase.createItem('Club', 1, 'normal');
        (c as any).inventory.equipment.weapon = club;
        g.recalcInventoryWeight(c);
      }
      return `gave club to ${targets.length} colonist(s)`;
    }
    else if (what === "knife") {
      for (const c of targets) {
        const knife = itemDatabase.createItem('Knife', 1, 'normal');
        (c as any).inventory.equipment.weapon = knife;
        g.recalcInventoryWeight(c);
      }
      return `gave knife to ${targets.length} colonist(s)`;
    } 
    else if (what === "medicine" || what === "medicinekit") {
      for (const c of targets) {
        const medicine = itemDatabase.createItem('MedicineKit', 5, 'normal');
        (c as any).inventory.items.push(medicine);
        g.recalcInventoryWeight(c);
      }
      return `gave 5 medicine kits to ${targets.length} colonist(s)`;
    }
    else if (what === "bandage" || what === "bandages") {
      for (const c of targets) {
        const bandage = itemDatabase.createItem('Bandage', 10, 'normal');
        (c as any).inventory.items.push(bandage);
        g.recalcInventoryWeight(c);
      }
      return `gave 10 bandages to ${targets.length} colonist(s)`;
    }
    else if (what === "food" || what === "bread") {
      for (const c of targets) {
        const bread = itemDatabase.createItem('Bread', 10, 'normal');
        (c as any).inventory.items.push(bread);
        g.recalcInventoryWeight(c);
      }
      return `gave 10 bread to ${targets.length} colonist(s)`;
    }
    else {
      return "usage: give <weapon|item> [selected|all|name]\nWeapons: pistol, rifle, sniper, smg, club, knife\nItems: medicine, bandage, food";
    }
  }, "give <item> [target] — give items to colonist(s). Weapons: pistol,rifle,sniper,smg,club,knife. Items: medicine,bandage,food. Target: selected,all,name");

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

  reg("injure", (g, args) => {
    const damageType = (args[0] || "bruise").toLowerCase() as 'cut' | 'bruise' | 'burn' | 'bite' | 'gunshot' | 'fracture';
    
    // Set realistic default damage based on injury type
    const defaultDamage = {
      'cut': 8,
      'bruise': 6,
      'burn': 12,
      'bite': 10,
      'gunshot': 25,  // Much higher default for gunshots
      'fracture': 20
    };
    
    const damage = Math.max(1, Math.min(50, parseInt(args[1] || defaultDamage[damageType].toString(), 10) || defaultDamage[damageType]));
    const target = (args[2] || "selected").toLowerCase();
    
    // Validate damage type
    const validTypes = ['cut', 'bruise', 'burn', 'bite', 'gunshot', 'fracture'];
    if (!validTypes.includes(damageType)) {
      return `invalid damage type '${damageType}'. Use: ${validTypes.join(', ')}`;
    }
    
    // Get target colonist(s)
    let targets: any[] = [];
    if (target === "all") {
      targets = g.colonists.filter(c => c.alive);
    } else if (target === "selected") {
      targets = g.selColonist ? [g.selColonist] : [];
    } else {
      // Try to find colonist by name
      const found = g.colonists.find(c => c.alive && c.profile?.name?.toLowerCase().includes(target));
      if (found) targets = [found];
    }
    
    if (!targets.length) {
      return target === "selected" ? "no colonist selected (use 'select next')" : `no colonist found matching '${target}'`;
    }
    
    // Apply injuries
    for (const colonist of targets) {
      if (typeof g.applyDamageToColonist === 'function') {
        g.applyDamageToColonist(colonist, damage, damageType);
      } else {
        return "damage system not available";
      }
    }
    
    return `applied ${damage} ${damageType} damage to ${targets.length} colonist(s)`;
  }, "injure [type] [damage] [target] — injure colonist(s). Types: cut,bruise,burn,bite,gunshot,fracture. Target: selected,all,name");

  reg("health", (g, args) => {
    const action = (args[0] || "check").toLowerCase();
    const target = (args[1] || "selected").toLowerCase();
    
    // Get target colonist(s)
    let targets: any[] = [];
    if (target === "all") {
      targets = g.colonists.filter(c => c.alive);
    } else if (target === "selected") {
      targets = g.selColonist ? [g.selColonist] : [];
    } else {
      // Try to find colonist by name
      const found = g.colonists.find(c => c.alive && c.profile?.name?.toLowerCase().includes(target));
      if (found) targets = [found];
    }
    
    if (!targets.length) {
      return target === "selected" ? "no colonist selected (use 'select next')" : `no colonist found matching '${target}'`;
    }
    
    if (action === "check") {
      const colonist = targets[0];
      const name = colonist.profile?.name || 'Unknown';
      
      if (!colonist.health) {
        return `${name}: No health system initialized. Use 'health init' to initialize.`;
      }
      
      const pain = Math.round((colonist.health.totalPain || 0) * 100);
      const injuries = colonist.health.injuries?.length || 0;
      const consciousness = Math.round((colonist.health.consciousness || 1) * 100);
      const mobility = Math.round((colonist.health.mobility || 1) * 100);
      const manipulation = Math.round((colonist.health.manipulation || 1) * 100);
      
      let status = `${name}: Pain=${pain}%, Injuries=${injuries}, Consciousness=${consciousness}%, Mobility=${mobility}%, Manipulation=${manipulation}%`;
      
      if (injuries > 0) {
        const injuryList = colonist.health.injuries.slice(0, 3).map((inj: any) => `${inj.type}(${Math.round(inj.severity * 100)}%)`).join(', ');
        status += ` | Injuries: ${injuryList}${injuries > 3 ? '...' : ''}`;
      }
      
      return status;
    } else if (action === "init") {
      let initialized = 0;
      for (const colonist of targets) {
        if (!colonist.health) {
          // Use the imported function directly
          initializeColonistHealth(colonist);
          initialized++;
        }
      }
      return `initialized health system for ${initialized} colonist(s)`;
    } else {
      return "usage: health check|init [target]. Target: selected,all,name";
    }
  }, "health check|init [target] — check health status or initialize health system");

  // NEW COMMANDS

  // Drop floor items using floor item system
  reg("drop", (g, args) => {
    const rim = (g as any).itemManager;
    if (!rim) return "Floor item system not initialized";
    const itemType = (args[0] || "").toLowerCase();
    const allowed = ['wood','stone','food','metal','cloth','medicine'];
    if (!allowed.includes(itemType)) {
      return `usage: drop <${allowed.join('|')}> [qty] [here|x y]`;
    }

    // Flexible parsing to support: 
    // - drop wood here
    // - drop wood 10 here
    // - drop wood 100 512 600
    // - drop wood 512 600 (qty defaults to 10)
    let qty = 10;
    let x: number | null = null, y: number | null = null;
    const tail = args.slice(1); // after type

    // If the last two tokens are numbers, treat as x y
    if (tail.length >= 2) {
      const a = parseFloat(tail[tail.length - 2]);
      const b = parseFloat(tail[tail.length - 1]);
      if (Number.isFinite(a) && Number.isFinite(b)) {
        x = a; y = b;
      }
    }

    // If 'here' is present and x/y not set, use camera center
    if (!Number.isFinite(x as number) || !Number.isFinite(y as number)) {
      const hasHere = tail.some(t => (t || '').toLowerCase() === 'here');
      if (hasHere) {
        const vw = g.canvas.width / g.camera.zoom;
        const vh = g.canvas.height / g.camera.zoom;
        x = g.camera.x + vw / 2;
        y = g.camera.y + vh / 2;
      }
    }

    // Find a numeric token to use as qty (first numeric that isn't part of x y when both are present at end)
    let qtyCandidate: number | null = null;
    for (let i = 0; i < tail.length; i++) {
      const tok = tail[i];
      const n = parseFloat(tok);
      if (Number.isFinite(n)) {
        // If this pair is the trailing x y, skip it for qty
        const isTrailingPair = (i === tail.length - 2) && Number.isFinite(parseFloat(tail[i+1]));
        if (isTrailingPair && Number.isFinite(x as number) && Number.isFinite(y as number)) {
          // skip
        } else {
          qtyCandidate = n;
          break;
        }
      }
    }
    if (qtyCandidate && qtyCandidate > 0) qty = Math.floor(Math.max(1, qtyCandidate));

    // Default drop position: selected colonist or camera center
    if (!Number.isFinite(x as number) || !Number.isFinite(y as number)) {
      if (g.selColonist) { x = g.selColonist.x; y = g.selColonist.y; }
      else {
        const vw = g.canvas.width / g.camera.zoom;
        const vh = g.canvas.height / g.camera.zoom;
        x = g.camera.x + vw / 2; y = g.camera.y + vh / 2;
      }
    }

    rim.dropItems(itemType as any, qty, { x: x!, y: y! });
    return `dropped ${qty} ${itemType} at (${(x as number).toFixed(0)},${(y as number).toFixed(0)})`;
  }, "drop <wood|stone|food|metal|cloth|medicine> [qty] [here|x y] — drop floor items");

  // Stockpile zone management
  reg("stockpile", (g, args) => {
    const rim = (g as any).itemManager;
    if (!rim) return "Floor item system not initialized";
    const sub = (args[0] || '').toLowerCase();

    // Helper to resolve zone id or 'last'
    const resolveZone = (idOrLast: string) => {
      if (!idOrLast || idOrLast === 'last') {
        const lastId = (g as any).debugConsole.lastStockpileId as string | undefined;
        return lastId ? rim.stockpiles.getZone(lastId) : null;
      }
      return rim.stockpiles.getZone(idOrLast) || null;
    };

    if (sub === 'create') {
      const w = Math.max(24, parseInt(args[1] || '128', 10) || 128);
      const h = Math.max(24, parseInt(args[2] || '96', 10) || 96);
      const name = args.slice(3).join(' ') || undefined;
      // Create centered at camera
      const vw = g.canvas.width / g.camera.zoom;
      const vh = g.canvas.height / g.camera.zoom;
      const cx = g.camera.x + vw / 2;
      const cy = g.camera.y + vh / 2;
      const zone = rim.createStockpileZone(Math.floor(cx - w/2), Math.floor(cy - h/2), w, h, name);
      (g as any).debugConsole.lastStockpileId = zone.id;
      return `stockpile created ${zone.id} '${zone.name}' at (${zone.x},${zone.y}) ${w}x${h}`;
    }

    if (sub === 'list') {
      const zones = rim.stockpiles.getAllZones();
      if (!zones.length) return 'no stockpiles';
      return zones.map((z: any) => `${z.id} '${z.name}' @(${z.x},${z.y}) ${z.width}x${z.height} prio:${z.priority} allowAll:${z.settings.allowAll} allowed:[${Array.from(z.allowedItems).join(',')}]`).join('\n');
    }

    if (sub === 'allow') {
      const id = (args[1] || 'last');
      const zone = resolveZone(id);
      if (!zone) return `zone not found: ${id}`;
      const typesArg = (args[2] || '').toLowerCase();
      if (!typesArg) return "usage: stockpile allow <id|last> <all|wood,stone,...>";
      if (typesArg === 'all') {
        // Empty array sets allowAll true in manager
        rim.updateStockpileItems(zone.id, []);
        return `stockpile ${zone.id} now allows all items`;
      } else {
        const parts = typesArg.split(',').map(s => s.trim()).filter(Boolean);
        const valid = ['wood','stone','food','metal','cloth','medicine'];
        const bad = parts.filter(p => !valid.includes(p));
        if (bad.length) return `invalid item(s): ${bad.join(', ')} (valid: ${valid.join(', ')})`;
        rim.updateStockpileItems(zone.id, parts as any);
        return `stockpile ${zone.id} allowed: ${parts.join(', ')}`;
      }
    }

    if (sub === 'priority') {
      const id = (args[1] || 'last');
      const zone = resolveZone(id);
      if (!zone) return `zone not found: ${id}`;
      const prio = Math.max(0, parseInt(args[2] || '1', 10) || 1);
      zone.priority = prio;
      return `stockpile ${zone.id} priority set to ${prio}`;
    }

    if (sub === 'remove' || sub === 'delete') {
      const id = (args[1] || 'last');
      const zone = resolveZone(id);
      if (!zone) return `zone not found: ${id}`;
      const ok = rim.removeStockpileZone(zone.id);
      return ok ? `removed stockpile ${zone.id}` : `failed to remove stockpile ${zone.id}`;
    }

    return "usage: stockpile create [w h name] | list | allow <id|last> <all|types> | priority <id|last> <n> | remove <id|last>";
  }, "stockpile — manage zones. create [w h name], list, allow <id|last> <all|wood,stone,...>, priority <id|last> <n>, remove <id|last>");

  // Floor items debug/info
  reg("items", (g, args) => {
    const rim = (g as any).itemManager;
    if (!rim) return "Floor item system not initialized";
    const sub = (args[0] || 'list').toLowerCase();

    if (sub === 'list') {
      const items = rim.floorItems.getAllItems();
      if (!items.length) return 'no floor items';
      const lines = items.slice(0, 20).map((it: any) => `${it.id}: ${it.type} x${it.quantity} @(${Math.round(it.position.x)},${Math.round(it.position.y)})`);
      if (items.length > 20) lines.push(`... and ${items.length - 20} more`);
      return lines.join('\n');
    }

    if (sub === 'count') {
      const items = rim.floorItems.getAllItems();
      const counts = new Map<string, number>();
      for (const it of items) counts.set(it.type, (counts.get(it.type) || 0) + it.quantity);
      const parts = Array.from(counts.entries()).map(([k, v]) => `${k}:${v}`);
      return parts.length ? parts.join(' ') : 'no floor items';
    }

    if (sub === 'purge' || sub === 'clear') {
      const items = rim.floorItems.getAllItems();
      let removed = 0;
      for (const it of items) { if (rim.floorItems.removeItem(it.id)) removed++; }
      return `removed ${removed} floor item stack(s)`;
    }

    if (sub === 'debug') {
      const onoff = (args[1] || '').toLowerCase();
      const on = onoff === 'on' || onoff === '1' || onoff === 'true';
      rim.renderer.setDebugMode(on);
      return `items debug ${on ? 'enabled' : 'disabled'}`;
    }

    return "usage: items [list|count|purge|debug on|off]";
  }, "items — list/count/purge floor items, or 'items debug on' to show item markers");

  reg("resources", (g, args) => {
    const action = (args[0] || "").toLowerCase();
    
    if (action === "unlimited" || action === "god" || action === "infinite") {
      // Set to very high amounts
      g.resourceSystem.setResource('wood', 999999);
      g.resourceSystem.setResource('stone', 999999);
      g.resourceSystem.setResource('food', 999999);
      g.resourceSystem.setResource('medicine', 999999);
      g.resourceSystem.setResource('herbal', 999999);
      g.resourceSystem.setResource('wheat', 999999);
      g.resourceSystem.setResource('bread', 999999);
      return "resources set to unlimited (999999 each)";
    } 
    else if (action === "add") {
      const resourceType = (args[1] || "").toLowerCase();
      const amount = Math.max(1, parseInt(args[2] || "100", 10) || 100);
      
      const validTypes = ['wood', 'stone', 'food', 'medicine', 'herbal', 'wheat', 'bread'];
      if (!validTypes.includes(resourceType)) {
        return `invalid resource type '${resourceType}'. Use: ${validTypes.join(', ')}`;
      }
      
      g.resourceSystem.setResource(resourceType as any, g.resourceSystem.getResource(resourceType as any) + amount);
      return `added ${amount} ${resourceType}`;
    }
    else if (action === "set") {
      const resourceType = (args[1] || "").toLowerCase();
      const amount = Math.max(0, parseInt(args[2] || "0", 10) || 0);
      
      const validTypes = ['wood', 'stone', 'food', 'medicine', 'herbal', 'wheat', 'bread'];
      if (!validTypes.includes(resourceType)) {
        return `invalid resource type '${resourceType}'. Use: ${validTypes.join(', ')}`;
      }
      
      g.resourceSystem.setResource(resourceType as any, amount);
      return `set ${resourceType} to ${amount}`;
    }
    else if (action === "show" || action === "list" || action === "") {
      const res = g.resourceSystem.getResourcesRef();
      return `Wood:${res.wood} Stone:${res.stone} Food:${res.food} Medicine:${res.medicine} Herbal:${res.herbal} Wheat:${res.wheat} Bread:${res.bread}`;
    }
    else {
      return "usage: resources [unlimited|add|set|show] [type] [amount]";
    }
  }, "resources [action] — manage resources. Actions: unlimited, add <type> <amt>, set <type> <amt>, show");

  reg("kill", (g, args) => {
    const target = (args[0] || "enemies").toLowerCase();
    
    if (target === "enemies" || target === "enemy") {
      const count = g.enemies.length;
      g.enemies.length = 0;
      return `killed ${count} enemies`;
    }
    else if (target === "selected") {
      if (!g.selColonist) return "no colonist selected";
      g.selColonist.alive = false;
      g.selColonist.hp = 0;
      return `killed ${g.selColonist.profile?.name || 'selected colonist'}`;
    }
    else if (target === "all") {
      const count = g.colonists.filter(c => c.alive).length;
      for (const c of g.colonists) {
        c.alive = false;
        c.hp = 0;
      }
      return `killed ${count} colonists`;
    }
    else {
      // Try to find colonist by name
      const found = g.colonists.find(c => c.alive && c.profile?.name?.toLowerCase().includes(target));
      if (found) {
        found.alive = false;
        found.hp = 0;
        return `killed ${found.profile?.name || target}`;
      }
      return `no colonist found matching '${target}'`;
    }
  }, "kill [target] — kill entities. Target: enemies,selected,all,name");

  reg("heal", (g, args) => {
    const target = (args[0] || "selected").toLowerCase();
    
    // Get target colonist(s)
    let targets: any[] = [];
    if (target === "all") {
      targets = g.colonists.filter(c => c.alive);
    } else if (target === "selected") {
      targets = g.selColonist ? [g.selColonist] : [];
    } else {
      // Try to find colonist by name
      const found = g.colonists.find(c => c.alive && c.profile?.name?.toLowerCase().includes(target));
      if (found) targets = [found];
    }
    
    if (!targets.length) {
      return target === "selected" ? "no colonist selected (use 'select next')" : `no colonist found matching '${target}'`;
    }
    
    for (const colonist of targets) {
      // Restore HP
      colonist.hp = 100;
      
      // Clear all injuries
      if (colonist.health && colonist.health.injuries) {
        colonist.health.injuries = [];
        colonist.health.totalPain = 0;
        colonist.health.bleeding = 0;
        colonist.health.consciousness = 1;
        colonist.health.mobility = 1;
        colonist.health.manipulation = 1;
      }
      
      // Restore hunger and fatigue
      colonist.hunger = 0;
      colonist.fatigue = 0;
    }
    
    return `fully healed ${targets.length} colonist(s)`;
  }, "heal [target] — fully heal colonist(s). Target: selected,all,name");

  reg("godmode", (g, args) => {
    const target = (args[0] || "selected").toLowerCase();
    
    // Get target colonist(s)
    let targets: any[] = [];
    if (target === "all") {
      targets = g.colonists.filter(c => c.alive);
    } else if (target === "selected") {
      targets = g.selColonist ? [g.selColonist] : [];
    } else {
      // Try to find colonist by name
      const found = g.colonists.find(c => c.alive && c.profile?.name?.toLowerCase().includes(target));
      if (found) targets = [found];
    }
    
    if (!targets.length) {
      return target === "selected" ? "no colonist selected (use 'select next')" : `no colonist found matching '${target}'`;
    }
    
    for (const colonist of targets) {
      // Toggle godmode flag
      (colonist as any).godmode = !(colonist as any).godmode;
      
      if ((colonist as any).godmode) {
        // Set to invincible
        colonist.hp = 100;
        colonist.hunger = 0;
        colonist.fatigue = 0;
      }
    }
    
    const status = (targets[0] as any).godmode ? 'enabled' : 'disabled';
    return `godmode ${status} for ${targets.length} colonist(s)`;
  }, "godmode [target] — toggle godmode (no damage/hunger/fatigue). Target: selected,all,name");
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
