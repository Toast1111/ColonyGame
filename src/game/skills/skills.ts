import type { Colonist, SkillName, SkillSet, Skill } from '../types';

// XP curve similar in spirit to RimWorld: increasing cost per level
const LEVEL_XP: number[] = (() => {
  const arr: number[] = []; // XP required to REACH level i from i-1
  for (let lvl = 1; lvl <= 20; lvl++) {
    // Base grows mildly exponential; tweakable
    const base = 100 + Math.pow(lvl, 1.6) * 40;
    arr[lvl] = Math.round(base);
  }
  return arr;
})();

export function createDefaultSkillSet(): SkillSet {
  const names: SkillName[] = ['Medicine','Construction','Shooting','Melee','Plants','Mining','Crafting','Social','Cooking','Research'];
  const byName: any = {};
  for (const n of names) {
    byName[n] = { name: n, level: 0, xp: 0, passion: 'none' } as Skill;
  }
  return { byName, xpMultiplier: 1 };
}

export function addStartingSkillVariance(skills: SkillSet) {
  for (const skill of Object.values(skills.byName)) {
    // Random baseline levels with slight bias
    const roll = Math.random();
    if (roll > 0.95) skill.level = 8 + Math.floor(Math.random()*4); // specialist
    else if (roll > 0.75) skill.level = 4 + Math.floor(Math.random()*3);
    else skill.level = Math.floor(Math.random()*3);
    // Passions
    const pRoll = Math.random();
    if (pRoll > 0.9) skill.passion = 'burning';
    else if (pRoll > 0.65) skill.passion = 'interested';
    else skill.passion = 'none';
  }
}

export function getSkill(colonist: Colonist, name: SkillName): Skill | null {
  if (!colonist.skills) return null;
  return colonist.skills.byName[name];
}

export function grantSkillXP(colonist: Colonist, name: SkillName, baseAmount: number, gameTime: number) {
  if (!colonist.skills) return;
  const skill = colonist.skills.byName[name];
  if (!skill) return;
  let amount = baseAmount;
  // Passion multipliers
  if (skill.passion === 'interested') amount *= 1.5;
  else if (skill.passion === 'burning') amount *= 2.0;
  // Global multiplier
  if (colonist.skills.xpMultiplier) amount *= colonist.skills.xpMultiplier;
  skill.xp += amount;
  skill.lastUsed = gameTime;
  // Track recent xp deltas for UI tooltips (keep last ~5 seconds)
  if (!skill.xpDeltas) skill.xpDeltas = [];
  if (gameTime != null) {
    skill.xpDeltas.push({ t: gameTime, amount });
    // prune anything older than 5s window and cap length
    const cutoff = gameTime - 5;
    if (cutoff > 0) skill.xpDeltas = skill.xpDeltas.filter(d => d.t >= cutoff);
    if (skill.xpDeltas.length > 64) skill.xpDeltas.splice(0, skill.xpDeltas.length - 64);
  }
  // Level up loop
  while (skill.level < 20) {
    const needed = LEVEL_XP[skill.level+1];
    if (skill.xp >= needed) {
      skill.xp -= needed;
      skill.level++;
    } else break;
  }
}

export function skillLevel(colonist: Colonist, name: SkillName): number {
  return getSkill(colonist, name)?.level ?? 0;
}

export function skillWorkSpeedMultiplier(level: number): number {
  // Soft scaling: 0 -> 0.6, 10 -> ~1.3, 20 -> ~1.8
  return 0.6 + (Math.pow(level, 0.9) * 0.06);
}

export function skillSuccessBonus(level: number): number {
  // Convert level to small additive success chance, cap ~+30%
  return Math.min(0.3, level * 0.015);
}

export function medicineSuccessChance(base: number, level: number): number {
  return Math.min(0.98, base + skillSuccessBonus(level));
}
