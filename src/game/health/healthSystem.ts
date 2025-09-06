import type { Colonist, Building } from "../types";

export type InjuryKind = 'cut' | 'bruise' | 'bite' | 'gunshot';
export type BodyPart = 'Head' | 'Torso' | 'Left Arm' | 'Right Arm' | 'Left Leg' | 'Right Leg';

export interface Injury {
  id: string;
  kind: InjuryKind;
  part: BodyPart;
  severity: number;      // 0-100
  bleeding: number;      // per second blood loss
  pain: number;          // contribution to pain 0-100
  tended?: boolean;
  infected?: boolean;
  infection?: number;    // 0-100
}

export interface ColonistHealth {
  bloodLoss: number;   // 0-100
  pain: number;        // 0-100
  injuries: Injury[];
  downed?: boolean;
}

function ensureHealth(c: Colonist): ColonistHealth {
  if (!(c as any).health) {
    (c as any).health = { bloodLoss: 0, pain: 0, injuries: [] } as ColonistHealth;
  }
  return (c as any).health as ColonistHealth;
}

const PARTS: BodyPart[] = ['Head','Torso','Left Arm','Right Arm','Left Leg','Right Leg'];

function randPart(): BodyPart { return PARTS[(Math.random() * PARTS.length) | 0]; }

function kindDefaults(kind: InjuryKind) {
  switch (kind) {
    case 'cut':     return { bleedPerSec: 3, painPerSev: 0.5 };
    case 'bite':    return { bleedPerSec: 4, painPerSev: 0.7 };
    case 'gunshot': return { bleedPerSec: 6, painPerSev: 0.9 };
    case 'bruise':  return { bleedPerSec: 0.5, painPerSev: 0.2 };
    default:        return { bleedPerSec: 2, painPerSev: 0.5 };
  }
}

export function applyDamageToColonist(game: any, c: Colonist, raw: number, kind: InjuryKind = 'cut', part?: BodyPart): number {
  if (!c.alive) return 0;
  const h = ensureHealth(c);
  const sv = Math.max(1, Math.round(raw));
  const defs = kindDefaults(kind);
  const inj: Injury = {
    id: Math.random().toString(36).slice(2),
    kind, part: part || randPart(), severity: sv,
    bleeding: defs.bleedPerSec * (sv / 25),
    pain: Math.min(40, defs.painPerSev * sv)
  };
  h.injuries.push(inj);
  // Apply immediate HP impact too (coarse), keep existing systems compatible
  c.hp = Math.max(0, c.hp - raw);
  return raw;
}

export function tendColonist(c: Colonist, quality: number = 0.5) {
  const h = ensureHealth(c);
  for (const inj of h.injuries) {
    if (inj.tended) continue;
    inj.tended = true;
    inj.bleeding *= (1 - Math.max(0.2, Math.min(0.9, 0.6 * quality)));
    // Reduce pain slightly
    inj.pain *= 0.85;
  }
}

export function updateColonistHealth(game: any, c: Colonist, dt: number) {
  const h = ensureHealth(c);
  const wasDowned = !!h.downed;

  // Bleeding and infections
  let bleedRate = 0;
  let pain = 0;
  for (const inj of h.injuries) {
    bleedRate += inj.bleeding;
    pain += inj.pain;
    if (!inj.tended && (inj.kind === 'cut' || inj.kind === 'bite' || inj.kind === 'gunshot')) {
      inj.infection = Math.min(100, (inj.infection || 0) + dt * 0.4);
      if ((inj.infection || 0) >= 25) inj.infected = true;
      if (inj.infected) {
        // Infected wounds add pain over time
        inj.pain = Math.min(60, inj.pain + dt * 0.8);
      }
    }
  }

  // Apply blood loss
  if (bleedRate > 0) {
    h.bloodLoss = Math.min(100, h.bloodLoss + bleedRate * dt * 0.2);
    // Passive HP drain from blood loss
    c.hp = Math.max(0, c.hp - bleedRate * 0.05 * dt);
  }

  // Aggregate pain (cap)
  h.pain = Math.min(100, pain);

  // Downed logic: high pain or heavy blood loss
  const shouldDown = h.pain >= 60 || h.bloodLoss >= 50;
  h.downed = shouldDown || h.downed;

  // If the colonist just became downed while inside a building, pop them outside
  if (!wasDowned && h.downed && c.inside) {
    const b = c.inside;
    // Leave the building to update occupancy
    game.leaveBuilding && game.leaveBuilding(c);
    // Place just outside the top edge by default
    const bx = (b as any).x, by = (b as any).y, bw = (b as any).w, bh = (b as any).h;
    const outX = bx + bw / 2;
    const outY = by - (c.r || 10) - 6;
    c.x = Math.max(c.r || 10, Math.min(outX, game.WORLD ? game.WORLD.w - (c.r || 10) : outX));
    c.y = Math.max(c.r || 10, Math.min(outY, game.WORLD ? game.WORLD.h - (c.r || 10) : outY));
  }

  if (h.downed) {
    // If dead, ensure not stuck
    if (c.hp <= 0) { c.alive = false; return; }
    // Immobilize
    (c as any).task = null; (c as any).target = null;
  }

  // Death from total blood loss
  if (h.bloodLoss >= 100 || c.hp <= 0) {
    c.alive = false;
  }
}

export function isDowned(c: Colonist): boolean { return !!((c as any).health?.downed); }

export function findRescueDestination(game: any): Building | null {
  const inf = game.buildings.find((b: Building) => b.kind === 'infirmary' && b.done);
  if (inf) return inf;
  const house = game.buildings.find((b: Building) => b.kind === 'house' && b.done);
  if (house) return house;
  const hq = game.buildings.find((b: Building) => b.kind === 'hq');
  return hq || null;
}
