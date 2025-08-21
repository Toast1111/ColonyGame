import { dist2, norm, sub } from "../core/utils";
import type { Building, Colonist, Enemy } from "../game/types";

// Finite State Machine update for a single colonist
export function updateColonistFSM(game: any, c: Colonist, dt: number) {
  if (!c.alive) return; c.t += dt;
  if (!c.state) c.state = 'seekTask';
  c.stateSince = (c.stateSince || 0) + dt;
  // simple needs
  c.hunger = Math.min(100, (c.hunger || 0) + dt * 1.2);
  if (c.inside) c.fatigue = Math.max(0, (c.fatigue || 0) - dt * 12);
  else c.fatigue = Math.min(100, (c.fatigue || 0) + dt * 4);

  const danger = (game.enemies as Enemy[]).find(e => dist2(e as any, c as any) < 140 * 140);
  c.lastHp = c.lastHp ?? c.hp;
  if (c.hp < c.lastHp) { c.hurt = 1.5; }
  c.lastHp = c.hp; c.hurt = Math.max(0, (c.hurt || 0) - dt);

  if (!c.inside && danger && c.state !== 'flee') { c.state = 'flee'; c.stateSince = 0; }
  if (!c.inside && !danger && game.isNight() && c.state !== 'sleep' && c.state !== 'flee') { c.state = 'sleep'; c.stateSince = 0; }
  if (c.inside && c.state !== 'resting') { c.state = 'resting'; c.stateSince = 0; }

  switch (c.state) {
    case 'resting': {
      c.hideTimer = Math.max(0, (c.hideTimer || 0) - dt);
      c.hp = Math.min(100, c.hp + 4 * dt);
      const leave = (!game.isNight()) && (!danger && (c.hurt || 0) <= 0 && (c.hideTimer || 0) <= 0);
      if (leave) { game.leaveBuilding(c); c.safeTarget = null; c.safeTimer = 0; c.state = 'seekTask'; c.stateSince = 0; }
      break;
    }
    case 'flee': {
      let dest: { x: number; y: number } | null = null; let buildingDest: Building | null = null;
      const tgtTurret = danger ? game.findSafeTurret(c, danger) : null;
      if (tgtTurret) {
        const range = (tgtTurret as any).range || 120; const tc = game.centerOf(tgtTurret);
        const house = (game.buildings as Building[]).find(b => b.kind === 'house' && b.done && game.buildingHasSpace(b) && dist2(game.centerOf(b) as any, tc as any) < range * range);
        if (house) { buildingDest = house; dest = game.centerOf(house); }
      }
      if (!dest) { const hq = (game.buildings as Building[]).find((b: Building) => b.kind === 'hq' && game.buildingHasSpace(b)); if (hq) { buildingDest = hq; dest = game.centerOf(hq); } }
      if (!dest && tgtTurret) dest = game.centerOf(tgtTurret);
      if (dest) {
        const arrivedCenter = game.moveAlongPath(c, dt, dest, 20);
        // Also allow entering if we reached the building footprint (with small margin)
        const nearRect = buildingDest ? (c.x >= buildingDest.x - 8 && c.x <= buildingDest.x + buildingDest.w + 8 && c.y >= buildingDest.y - 8 && c.y <= buildingDest.y + buildingDest.h + 8) : false;
        if (arrivedCenter || nearRect) {
          if (buildingDest && game.tryEnterBuilding(c, buildingDest)) {
            c.hideTimer = 3; c.state = 'resting'; c.stateSince = 0;
          } else {
            // Retarget: find closest house with space, else HQ
            const choices = (game.buildings as Building[]).filter((b: Building) => b.done && game.buildingHasSpace(b) && (b.kind === 'house' || b.kind === 'hq'));
            if (choices.length) {
              const next = choices.sort((a: Building, b: Building) => dist2(c as any, game.centerOf(a) as any) - dist2(c as any, game.centerOf(b) as any))[0];
              const nc = game.centerOf(next); game.clearPath(c);
              buildingDest = next; dest = nc; // keep fleeing toward next spot
            } else {
              // Nowhere to hide; fall through and keep running
            }
          }
        }
      } else {
        const d = norm(sub(c as any, danger as any) as any); c.x += d.x * (c.speed + 90) * dt; c.y += d.y * (c.speed + 90) * dt;
      }
      if (!danger) { c.state = 'seekTask'; c.stateSince = 0; }
      break;
    }
    case 'sleep': {
      const protectedHouses = (game.buildings as Building[]).filter(b => b.kind === 'house' && b.done && game.isProtectedByTurret(b) && game.buildingHasSpace(b));
      if (!game.isNight() || protectedHouses.length === 0) { c.state = 'seekTask'; c.stateSince = 0; break; }
      let best = protectedHouses[0]; let bestD = dist2(c as any, game.centerOf(best) as any);
      for (let i = 1; i < protectedHouses.length; i++) { const d = dist2(c as any, game.centerOf(protectedHouses[i]) as any); if (d < bestD) { bestD = d; best = protectedHouses[i]; } }
  const hc = game.centerOf(best);
  const arrivedCenter = game.moveAlongPath(c, dt, hc, 20);
  const nearRect = (c.x >= best.x - 8 && c.x <= best.x + best.w + 8 && c.y >= best.y - 8 && c.y <= best.y + best.h + 8);
  if (arrivedCenter || nearRect) {
        if (game.tryEnterBuilding(c, best)) { c.hideTimer = 0; c.state = 'resting'; c.stateSince = 0; }
        else {
          // Try another house with space, or HQ if available
          const next = (game.buildings as Building[])
            .filter((b: Building) => b.done && game.buildingHasSpace(b) && (b.kind === 'house' || b.kind === 'hq'))
            .sort((a: Building, b: Building) => dist2(c as any, game.centerOf(a) as any) - dist2(c as any, game.centerOf(b) as any))[0];
          if (next) { const nc = game.centerOf(next); game.clearPath(c); /* keep sleeping and move to next */ }
          else { c.state = 'seekTask'; c.stateSince = 0; }
        }
      }
      break;
    }
    case 'seekTask': {
      if (game.isNight()) { c.state = 'sleep'; c.stateSince = 0; break; }
      if (!c.task || (c.task === 'idle' && Math.random() < 0.005)) game.pickTask(c);
      switch (c.task) {
        case 'build': c.state = 'build'; break;
        case 'harvestFarm': c.state = 'harvest'; break;
        case 'chop': c.state = 'chop'; break;
        case 'mine': c.state = 'mine'; break;
        case 'idle': default: c.state = 'idle'; break;
      }
      c.stateSince = 0; break;
    }
    case 'idle': {
      const dst = c.target; if (!dst) { c.state = 'seekTask'; break; }
      if (game.moveAlongPath(c, dt, dst, 8)) { c.task = null; c.target = null; game.clearPath(c); c.state = 'seekTask'; c.stateSince = 0; }
      break;
    }
    case 'build': {
      const b = c.target as Building; if (!b || b.done) { game.releaseBuildReservation(c); c.task = null; c.target = null; game.clearPath(c); c.state = 'seekTask'; break; }
      const pt = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
      if (game.moveAlongPath(c, dt, pt, 12)) {
        b.buildLeft -= 25 * dt;
        if (b.buildLeft <= 0) {
          b.done = true; if (b.kind === 'farm') { b.growth = 0; b.ready = false; }
          game.msg(b.name ? b.name + " complete" : "Building complete"); game.rebuildNavGrid(); game.clearPath(c);
          game.releaseBuildReservation(c); c.task = null; c.target = null; c.state = 'seekTask';
        }
      }
      break;
    }
    case 'harvest': {
      const f = c.target as Building; if (!f || !f.ready) { c.task = null; c.target = null; game.clearPath(c); c.state = 'seekTask'; break; }
      const pt = { x: f.x + f.w / 2, y: f.y + f.h / 2 };
      if (game.moveAlongPath(c, dt, pt, 12)) { f.ready = false; f.growth = 0; game.RES.food += 10; game.msg('Farm harvested (+10 food)'); c.task = null; c.target = null; game.clearPath(c); c.state = 'seekTask'; }
      break;
    }
    case 'chop': {
      const t = c.target as any; if (!t || t.hp <= 0) { if (t && game.assignedTargets.has(t)) game.assignedTargets.delete(t); c.task = null; c.target = null; game.clearPath(c); c.state = 'seekTask'; break; }
      // Allow a tiny slack so they don't stop just outside range
      const interact = (t.r || 12) + c.r + 4;
      const slack = 2.5; // pixels
      const d = Math.hypot(c.x - t.x, c.y - t.y);
      if (d <= interact + slack) {
        t.hp -= 18 * dt;
        if (t.hp <= 0) {
          game.RES.wood += 6; (game.trees as any[]).splice((game.trees as any[]).indexOf(t), 1);
          if (game.assignedTargets.has(t)) game.assignedTargets.delete(t);
          game.msg('+6 wood'); c.task = null; c.target = null; game.clearPath(c); c.state = 'seekTask';
        }
        break;
      }
      const goal = game.bestApproachToCircle(c, t, interact);
      // Tight arrival so we truly get into interact range
      game.moveAlongPath(c, dt, goal, 3);
      // If stuck too long, abandon and pick a new task
      if (c.stateSince && c.stateSince > 10) {
        if (game.assignedTargets.has(t)) game.assignedTargets.delete(t);
        c.task = null; c.target = null; game.clearPath(c); c.state = 'seekTask';
      }
      break;
    }
    case 'mine': {
      const r = c.target as any; if (!r || r.hp <= 0) { if (r && game.assignedTargets.has(r)) game.assignedTargets.delete(r); c.task = null; c.target = null; game.clearPath(c); c.state = 'seekTask'; break; }
      const interact = (r.r || 12) + c.r + 4;
      const slack = 2.5;
      const d = Math.hypot(c.x - r.x, c.y - r.y);
      if (d <= interact + slack) {
        r.hp -= 16 * dt;
        if (r.hp <= 0) {
          game.RES.stone += 5; (game.rocks as any[]).splice((game.rocks as any[]).indexOf(r), 1);
          if (game.assignedTargets.has(r)) game.assignedTargets.delete(r);
          game.msg('+5 stone'); c.task = null; c.target = null; game.clearPath(c); c.state = 'seekTask';
        }
        break;
      }
      const goal = game.bestApproachToCircle(c, r, interact);
      game.moveAlongPath(c, dt, goal, 3);
      // If stuck too long (likely unreachable due to walls), abandon and re-seek
      if (c.stateSince && c.stateSince > 10) {
        if (game.assignedTargets.has(r)) game.assignedTargets.delete(r);
        c.task = null; c.target = null; game.clearPath(c); c.state = 'seekTask';
      }
      break;
    }
  }

  // basic separation to avoid stacking
  for (const o of game.colonists as Colonist[]) {
    if (o === c) continue; const dx = c.x - o.x, dy = c.y - o.y; const d2 = dx * dx + dy * dy; const rr = (c.r + 2) * (c.r + 2);
    if (d2 > 0 && d2 < rr * 4) { const d = Math.sqrt(d2) || 1; const push = (rr * 2 - d) * 0.5; c.x += (dx / d) * push * dt * 6; c.y += (dy / d) * push * dt * 6; }
  }
}
