import type { Colonist, Enemy } from "../types";

// Applies damage with optional armor reduction on colonists. Returns final damage applied.
export function applyDamageToColonist(colonist: Colonist, raw: number): number {
  const armor = Math.max(0, Math.min(0.8, (colonist as any).armorRating || getArmorFromEquipment(colonist)));
  const final = Math.max(0, raw * (1 - armor));
  colonist.hp -= final;
  return final;
}

function getArmorFromEquipment(c: Colonist): number {
  const eq = c.inventory?.equipment;
  if (!eq) return 0;
  let rating = 0;
  const parts = [eq.armor, eq.helmet];
  for (const it of parts) {
    if (!it || !it.defName) continue;
    // Use a simple mapping hook; callers can inject real values later
    const map: Record<string, number> = {
      FlakVest: 0.3,
      TacticalArmor: 0.5,
      WorkClothes: 0.05,
      SimpleHelmet: 0.2,
      TacticalHelmet: 0.35,
    };
    rating += map[it.defName] || 0;
  }
  return Math.min(0.7, rating);
}

export function applyDamageToEnemy(enemy: Enemy, raw: number): number {
  const final = Math.max(1, Math.round(raw));
  enemy.hp -= final;
  return final;
}
