import { dist2, norm, sub } from "../core/utils";
import type { Building, Enemy, Colonist } from "../game/types";

export function updateEnemyFSM(game: any, e: Enemy, dt: number) {
  const HQ = (game.buildings as Building[]).find(b => b.kind === 'hq')!;
  let tgt: any = HQ; let bestD = dist2(e as any, game.centerOf(HQ) as any);
  for (const c of game.colonists as Colonist[]) { const d = dist2(e as any, c as any); if (d < bestD) { bestD = d; tgt = c; } }
  const pt = (tgt as Building).w ? game.centerOf(tgt as Building) : tgt;
  const dir = norm(sub(pt as any, e as any) as any); e.x += dir.x * e.speed * dt; e.y += dir.y * e.speed * dt;
  if ((tgt as Building).w) {
    const b = tgt as Building; if (game.pointInRect(e as any, b)) b.hp -= e.dmg * dt; if (b.hp <= 0) { if (b.kind === 'hq') { game.lose(); } else { game.evictColonistsFrom(b); (game.buildings as Building[]).splice((game.buildings as Building[]).indexOf(b), 1); game.msg((b.name || b.kind) + ' destroyed', 'warn'); } }
  } else {
    const c = tgt as Colonist; const d = Math.hypot(e.x - c.x, e.y - c.y); if (d < e.r + 8) { c.hp -= e.dmg * dt; if (c.hp <= 0) { c.alive = false; (game.colonists as Colonist[]).splice((game.colonists as Colonist[]).indexOf(c), 1); game.msg('A colonist has fallen', 'warn'); } }
  }
}
