import { dist2, norm, sub } from "../core/utils";
import type { Building, Enemy, Colonist } from "../game/types";

// Helper function to check if a position would collide with buildings (for enemies)
function wouldCollideWithBuildings(game: any, x: number, y: number, radius: number): boolean {
  for (const b of game.buildings) {
    // Enemies can walk through HQ, paths, houses, and farms, but not other buildings
    if (b.kind === 'hq' || b.kind === 'path' || b.kind === 'house' || b.kind === 'farm' || !b.done) continue;
    
    // Check circle-rectangle collision
    const closestX = Math.max(b.x, Math.min(x, b.x + b.w));
    const closestY = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - closestX;
    const dy = y - closestY;
    
    if (dx * dx + dy * dy <= radius * radius) {
      return true;
    }
  }
  return false;
}

export function updateEnemyFSM(game: any, e: Enemy, dt: number) {
  const HQ = (game.buildings as Building[]).find(b => b.kind === 'hq')!;
  let tgt: any = HQ; let bestD = dist2(e as any, game.centerOf(HQ) as any);
  for (const c of game.colonists as Colonist[]) { const d = dist2(e as any, c as any); if (d < bestD) { bestD = d; tgt = c; } }
  const pt = (tgt as Building).w ? game.centerOf(tgt as Building) : tgt;
  const dir = norm(sub(pt as any, e as any) as any);
  
  // Apply collision-aware movement
  const newX = e.x + dir.x * e.speed * dt;
  const newY = e.y + dir.y * e.speed * dt;
  
  if (!wouldCollideWithBuildings(game, newX, newY, e.r)) {
    e.x = newX;
    e.y = newY;
  } else {
    // Try to slide around obstacles
    const perpDirX = -dir.y;
    const perpDirY = dir.x;
    
    // Try sliding right
    const slideRightX = e.x + perpDirX * e.speed * dt * 0.5;
    const slideRightY = e.y + perpDirY * e.speed * dt * 0.5;
    if (!wouldCollideWithBuildings(game, slideRightX, slideRightY, e.r)) {
      e.x = slideRightX;
      e.y = slideRightY;
    } else {
      // Try sliding left
      const slideLeftX = e.x - perpDirX * e.speed * dt * 0.5;
      const slideLeftY = e.y - perpDirY * e.speed * dt * 0.5;
      if (!wouldCollideWithBuildings(game, slideLeftX, slideLeftY, e.r)) {
        e.x = slideLeftX;
        e.y = slideLeftY;
      }
      // If both slides fail, enemy stays in place (stuck against wall)
    }
  }
  
  if ((tgt as Building).w) {
    const b = tgt as Building; if (game.pointInRect(e as any, b)) b.hp -= e.dmg * dt; if (b.hp <= 0) { if (b.kind === 'hq') { game.lose(); } else { game.evictColonistsFrom(b); (game.buildings as Building[]).splice((game.buildings as Building[]).indexOf(b), 1); game.msg((b.name || b.kind) + ' destroyed', 'warn'); } }
  } else {
    const c = tgt as Colonist; const d = Math.hypot(e.x - c.x, e.y - c.y); if (d < e.r + 8) { c.hp -= e.dmg * dt; if (c.hp <= 0) { c.alive = false; (game.colonists as Colonist[]).splice((game.colonists as Colonist[]).indexOf(c), 1); game.msg('A colonist has fallen', 'warn'); } }
  }
}
