// Colonist personality and background generator
import { ImageAssets } from '../../assets/images';
import { itemDatabase } from '../../data/itemDatabase';
import { NAMES, FAVORITE_FOODS, randomChoice } from './colonistData';
import { 
  CLOTHING_COLORS,
  getRandomColor,
  getRandomBackground,
  generateAppearanceTraits
} from './traits';
import { ALL_PASSIVE_TRAITS, type PassiveTrait } from './traits/passiveTraits';
import type { Background } from './traits/backgrounds';
import { BIRTHPLACES, LIFE_EVENTS, SKILLS, FEARS, SECRETS, type LifeEvent } from './narrative';
import { createDefaultSkillSet, addStartingSkillVariance } from '../skills/skills';
import type { InventoryItem, Equipment, ColonistInventory, SkillSet, SkillName } from '../types';

// Enhanced interface with detailed personal information
export interface ColonistProfile {
  name: string;
  age: number;
  seed: number; // Magic number for consistent generation
  background: string;
  personality: string[];
  favoriteFood: string;
  backstory: string;
  detailedInfo: {
    birthplace: string;
    family: {
      parents: string[];
      siblings: string[];
      spouse?: string;
      children: string[];
    };
    lifeEvents: { age: number; event: string; impact: 'positive' | 'negative' | 'neutral' }[];
    skills: string[];
    fears: string[];
    secrets: string[];
    relationships: { name: string; type: string; status: 'good' | 'bad' | 'neutral' }[];
  };
  avatar: {
    skinTone: string;
    hairColor: string;
    eyeColor: string;
    clothing: string;
    sprites: {
      headType: string;
      bodyType: string;
      hairStyle: string;
      apparelType: string;
    };
  };
  stats: {
    workSpeed: number;
    socialBonus: number;
    hungerRate: number;
    fatigueRate: number;
  };
  startingInventory: ColonistInventory; // New field for starting equipment and items
  passiveTraits?: PassiveTrait[]; // Passive gameplay traits
}

// Seeded random generator for consistent results
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  choice<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

  choices<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => this.next() - 0.5);
    return shuffled.slice(0, count);
  }

  range(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
}

function hashStringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Map narrative skills to gameplay skills
const SKILL_MAPPING: Record<string, { gameSkill: string; boost: number }> = {
  // Medical skills
  'Medicine': { gameSkill: 'Medicine', boost: 5 },
  'First Aid': { gameSkill: 'Medicine', boost: 4 },
  
  // Construction/Crafting
  'Carpentry': { gameSkill: 'Construction', boost: 4 },
  'Masonry': { gameSkill: 'Construction', boost: 4 },
  'Smithing': { gameSkill: 'Crafting', boost: 5 },
  'Tailoring': { gameSkill: 'Crafting', boost: 4 },
  'Mechanics': { gameSkill: 'Crafting', boost: 4 },
  'Engineering': { gameSkill: 'Crafting', boost: 5 },
  'Leatherworking': { gameSkill: 'Crafting', boost: 3 },
  'Pottery': { gameSkill: 'Crafting', boost: 3 },
  'Weaving': { gameSkill: 'Crafting', boost: 3 },
  'Glassblowing': { gameSkill: 'Crafting', boost: 3 },
  'Jewelry Making': { gameSkill: 'Crafting', boost: 3 },
  
  // Combat
  'Tactics': { gameSkill: 'Shooting', boost: 3 },
  'Hunting': { gameSkill: 'Shooting', boost: 4 },
  'Tracking': { gameSkill: 'Shooting', boost: 2 },
  
  // Agriculture (Herbalism boosts both Medicine and Plants)
  'Agriculture': { gameSkill: 'Plants', boost: 5 },
  'Gardening': { gameSkill: 'Plants', boost: 4 },
  'Animal Husbandry': { gameSkill: 'Plants', boost: 3 },
  'Herbalism': { gameSkill: 'Plants', boost: 3 },
  
  // Mining
  'Mining': { gameSkill: 'Mining', boost: 5 },
  'Prospecting': { gameSkill: 'Mining', boost: 3 },
  'Gem Cutting': { gameSkill: 'Mining', boost: 2 },
  
  // Cooking
  'Cooking': { gameSkill: 'Cooking', boost: 5 },
  'Alchemy': { gameSkill: 'Cooking', boost: 3 },
  
  // Social/Research
  'Leadership': { gameSkill: 'Social', boost: 4 },
  'Storytelling': { gameSkill: 'Social', boost: 3 },
  'Poetry': { gameSkill: 'Social', boost: 2 },
  'Music': { gameSkill: 'Social', boost: 3 },
  'Philosophy': { gameSkill: 'Research', boost: 4 },
  'Mathematics': { gameSkill: 'Research', boost: 5 },
  'Astronomy': { gameSkill: 'Research', boost: 4 },
  'Cartography': { gameSkill: 'Research', boost: 3 },
};

// Apply skill boosts based on backstory narrative skills
function applyBackstorySkillBoosts(skillSet: SkillSet, narrativeSkills: string[], initialSetup: boolean = false) {
  for (const narrativeSkill of narrativeSkills) {
    const mapping = SKILL_MAPPING[narrativeSkill];
    if (mapping) {
      const gameSkill = skillSet.byName[mapping.gameSkill as SkillName];
      if (gameSkill) {
        if (initialSetup) {
          // During initial setup, set to modest professional level (not overpowered)
          // Primary skill from background: 6-8 (competent professional)
          // Secondary/related skills: 3-5 (some training)
          const baseLevel = mapping.boost >= 5 ? 6 : 3;
          const variance = mapping.boost >= 5 ? 2 : 2;
          gameSkill.level = baseLevel + Math.floor(Math.random() * variance);
          
          // Give passion for their profession (but not guaranteed)
          if (gameSkill.passion === 'none') {
            const passionRoll = Math.random();
            if (mapping.boost >= 5 && passionRoll > 0.2) {
              // 80% chance for primary skills
              gameSkill.passion = passionRoll > 0.6 ? 'burning' : 'interested';
            } else if (passionRoll > 0.5) {
              // 50% chance for secondary skills
              gameSkill.passion = 'interested';
            }
          }
        } else {
          // This path is for legacy/future use - small boost without breaking balance
          gameSkill.level = Math.min(12, gameSkill.level + Math.floor(mapping.boost / 2));
        }
      }
    }
  }
}

function generateStats(): ColonistProfile['stats'] {
  // Generate stats with slight variations to make colonists unique
  const baseVariation = () => 0.9 + Math.random() * 0.2; // 0.9 to 1.1
  
  return {
    workSpeed: Math.round(baseVariation() * 100) / 100,
    socialBonus: Math.round(baseVariation() * 100) / 100,
    hungerRate: Math.round(baseVariation() * 100) / 100,
    fatigueRate: Math.round(baseVariation() * 100) / 100
  };
}

// Generate traits that make contextual sense with the colonist's backstory
function generateContextualTraits(
  rng: SeededRandom,
  detailedInfo: ColonistProfile['detailedInfo'],
  background: Background,
  age: number
): PassiveTrait[] {
  const contextualTraits: PassiveTrait[] = [];
  const usedTraits = new Set<string>();
  
  // Map backstory elements to potential traits
  const traitCandidates: Array<{ trait: PassiveTrait; reason: string; priority: number }> = [];
  
  // SKILLS-BASED TRAITS
  if (detailedInfo.skills.includes('Hunting') || detailedInfo.skills.includes('Tracking')) {
    const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'nimble');
    if (trait) traitCandidates.push({ trait, reason: 'years of hunting in the wild', priority: 3 });
  }
  if (detailedInfo.skills.includes('Mechanics') || detailedInfo.skills.includes('Carpentry')) {
    const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'focused');
    if (trait) traitCandidates.push({ trait, reason: 'meticulous craftwork', priority: 3 });
  }
  if (detailedInfo.skills.includes('Leadership') || detailedInfo.skills.includes('Storytelling')) {
    const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'charismatic');
    if (trait) traitCandidates.push({ trait, reason: 'natural leadership ability', priority: 3 });
  }
  if (detailedInfo.skills.includes('First Aid') || detailedInfo.skills.includes('Herbalism')) {
    const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'empathetic');
    if (trait) traitCandidates.push({ trait, reason: 'healing the wounded', priority: 3 });
  }
  if (detailedInfo.skills.includes('Wilderness survival') || detailedInfo.skills.includes('Gardening')) {
    const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'green_thumb');
    if (trait) traitCandidates.push({ trait, reason: 'working with living things', priority: 3 });
  }
  if (detailedInfo.skills.includes('Animal Care') || detailedInfo.skills.includes('Taming wild beasts')) {
    const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'animal_whisperer');
    if (trait) traitCandidates.push({ trait, reason: 'a bond with animals', priority: 3 });
  }
  if (detailedInfo.skills.includes('Sleight of hand') || detailedInfo.skills.includes('Lockpicking')) {
    const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'nimble');
    if (trait) traitCandidates.push({ trait, reason: 'dexterous fingers and quick reflexes', priority: 3 });
  }
  if (detailedInfo.skills.includes('Deep meditation') || detailedInfo.skills.includes('Fortune-telling')) {
    const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'focused');
    if (trait) traitCandidates.push({ trait, reason: 'meditative practice', priority: 2 });
  }
  
  // LIFE EVENT-BASED TRAITS
  for (const event of detailedInfo.lifeEvents) {
    if (event.event.includes('survived') || event.event.includes('shipwreck') || event.event.includes('wilderness') || event.event.includes('weeks')) {
      const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'tough' || t.id === 'hardy');
      if (trait && !usedTraits.has(trait.id)) {
        traitCandidates.push({ trait, reason: event.event, priority: 4 });
      }
    }
    if (event.event.includes('lost their voice') || event.event.includes('slowly lose their mind') || event.event.includes('traumatic')) {
      const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'antisocial' || t.id === 'slow_learner');
      if (trait && !usedTraits.has(trait.id)) {
        traitCandidates.push({ trait, reason: event.event, priority: 4 });
      }
    }
    if (event.event.includes('library') || event.event.includes('decoded') || event.event.includes('artifact')) {
      const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'quick_learner' || t.id === 'photographic_memory');
      if (trait && !usedTraits.has(trait.id)) {
        traitCandidates.push({ trait, reason: event.event, priority: 4 });
      }
    }
    if (event.event.includes('lightning') || event.event.includes('dreams') || event.event.includes('visions') || event.event.includes('prophetic')) {
      const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'lucky' || t.id === 'night_owl');
      if (trait && !usedTraits.has(trait.id)) {
        traitCandidates.push({ trait, reason: event.event, priority: 5 });
      }
    }
    if (event.event.includes('betrayed') || event.event.includes('framed') || event.event.includes('abandoned') || event.event.includes('sole witness')) {
      const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'antisocial');
      if (trait && !usedTraits.has(trait.id)) {
        traitCandidates.push({ trait, reason: event.event, priority: 3 });
      }
    }
    if (event.event.includes('saved') || event.event.includes('village') || event.event.includes('noble') || event.event.includes('life')) {
      const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'empathetic' || t.id === 'charismatic');
      if (trait && !usedTraits.has(trait.id)) {
        traitCandidates.push({ trait, reason: event.event, priority: 3 });
      }
    }
    if (event.event.includes('infected') || event.event.includes('parasite') || event.event.includes('disease') || event.event.includes('barely recovered')) {
      const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'weak_immunity' || t.id === 'slow_healer');
      if (trait && !usedTraits.has(trait.id)) {
        traitCandidates.push({ trait, reason: event.event, priority: 4 });
      }
      // Or opposite - developed strong immunity
      const immuneTrait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'super_immune' || t.id === 'good_immunity');
      if (immuneTrait && !usedTraits.has(immuneTrait.id) && rng.next() > 0.5) {
        traitCandidates.push({ trait: immuneTrait, reason: event.event + ' (developed immunity)', priority: 4 });
      }
    }
    if (event.event.includes('invented') || event.event.includes('revolutionized')) {
      const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'quick_learner' || t.id === 'focused');
      if (trait && !usedTraits.has(trait.id)) {
        traitCandidates.push({ trait, reason: event.event, priority: 4 });
      }
    }
    if (event.event.includes('dead for') || event.event.includes('revived')) {
      const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'very_fast_healer' || t.id === 'super_immune');
      if (trait && !usedTraits.has(trait.id)) {
        traitCandidates.push({ trait, reason: event.event, priority: 5 });
      }
    }
  }
  
  // FEAR-BASED TRAITS (negative traits)
  if (detailedInfo.fears.includes('confined spaces') || detailedInfo.fears.includes('darkness')) {
    const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'claustrophobic');
    if (trait && !usedTraits.has(trait.id)) {
      traitCandidates.push({ trait, reason: 'traumatic experience', priority: 4 });
    }
  }
  if (detailedInfo.fears.includes('blood') || detailedInfo.fears.includes('needles')) {
    const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'squeamish');
    if (trait && !usedTraits.has(trait.id)) {
      traitCandidates.push({ trait, reason: 'sensitive nature', priority: 3 });
    }
  }
  if (detailedInfo.fears.includes('fire')) {
    const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'pyromaniac');
    if (trait && !usedTraits.has(trait.id) && rng.next() > 0.7) { // Opposite reaction sometimes
      traitCandidates.push({ trait, reason: 'fascination with fire', priority: 2 });
    }
  }
  
  // SECRET-BASED TRAITS
  for (const secret of detailedInfo.secrets) {
    if (secret.includes('killed') || secret.includes('executioner') || secret.includes('poisoned')) {
      const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'tough' || t.id === 'antisocial');
      if (trait && !usedTraits.has(trait.id)) {
        traitCandidates.push({ trait, reason: 'a dark secret', priority: 5 });
      }
    }
    if (secret.includes('memory') || secret.includes('photographic') || secret.includes('memorized')) {
      const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'photographic_memory');
      if (trait && !usedTraits.has(trait.id)) {
        traitCandidates.push({ trait, reason: 'an extraordinary gift', priority: 5 });
      }
    }
    if (secret.includes('immortal') || secret.includes('died and come back') || secret.includes("hasn't aged")) {
      const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'very_fast_healer' || t.id === 'super_immune');
      if (trait && !usedTraits.has(trait.id)) {
        traitCandidates.push({ trait, reason: 'supernatural resilience', priority: 5 });
      }
    }
    if (secret.includes('spy') || secret.includes('double life') || secret.includes('identity')) {
      const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'nimble' || t.id === 'focused');
      if (trait && !usedTraits.has(trait.id)) {
        traitCandidates.push({ trait, reason: 'years of deception', priority: 4 });
      }
    }
    if (secret.includes('communicate with animals') || secret.includes('animal')) {
      const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'animal_whisperer');
      if (trait && !usedTraits.has(trait.id)) {
        traitCandidates.push({ trait, reason: 'a mysterious connection to beasts', priority: 5 });
      }
    }
    if (secret.includes('prophetic') || secret.includes('predict') || secret.includes('visions') || secret.includes('future')) {
      const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'lucky' || t.id === 'night_owl');
      if (trait && !usedTraits.has(trait.id)) {
        traitCandidates.push({ trait, reason: 'glimpses of what is to come', priority: 5 });
      }
    }
    if (secret.includes('slowly losing their memory')) {
      const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'absent_minded' || t.id === 'slow_learner');
      if (trait && !usedTraits.has(trait.id)) {
        traitCandidates.push({ trait, reason: 'fading memories', priority: 5 });
      }
    }
    if (secret.includes("can't feel physical pain")) {
      const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'tough');
      if (trait && !usedTraits.has(trait.id)) {
        traitCandidates.push({ trait, reason: 'an unusual condition', priority: 5 });
      }
    }
  }
  
  // BACKGROUND-BASED TRAITS
  if (background.name === 'Farmer' || background.name === 'Herbalist') {
    const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'green_thumb');
    if (trait && !usedTraits.has(trait.id)) {
      traitCandidates.push({ trait, reason: 'years of farming', priority: 2 });
    }
  }
  if (background.name === 'Soldier' || background.name === 'Guard') {
    const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'tough' || t.id === 'brawler');
    if (trait && !usedTraits.has(trait.id)) {
      traitCandidates.push({ trait, reason: 'military training', priority: 3 });
    }
  }
  if (background.name === 'Scholar' || background.name === 'Engineer') {
    const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'quick_learner' || t.id === 'photographic_memory');
    if (trait && !usedTraits.has(trait.id)) {
      traitCandidates.push({ trait, reason: 'academic background', priority: 3 });
    }
  }
  if (background.name === 'Noble' || background.name === 'Merchant') {
    const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'beautiful' || t.id === 'pretty');
    if (trait && !usedTraits.has(trait.id)) {
      traitCandidates.push({ trait, reason: 'privileged upbringing', priority: 2 });
    }
  }
  
  // AGE-BASED TRAITS
  if (age < 25) {
    const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'quick_learner' || t.id === 'nimble');
    if (trait && !usedTraits.has(trait.id)) {
      traitCandidates.push({ trait, reason: 'youth and vitality', priority: 1 });
    }
  } else if (age > 45) {
    const trait = ALL_PASSIVE_TRAITS.find((t: any) => t.id === 'wise' || t.id === 'careful');
    if (trait && !usedTraits.has(trait.id)) {
      traitCandidates.push({ trait, reason: 'life experience', priority: 1 });
    }
  }
  
  // Sort by priority (higher priority first)
  traitCandidates.sort((a, b) => b.priority - a.priority);
  
  // Select 1-3 traits based on priority and randomness
  const numTraits = rng.range(1, 3);
  let attempts = 0;
  
  for (const candidate of traitCandidates) {
    if (contextualTraits.length >= numTraits) break;
    if (attempts++ > 50) break;
    
    const trait = candidate.trait;
    if (!trait || usedTraits.has(trait.id)) continue;
    
    // Check conflicts
    const hasConflict = trait.conflictsWith?.some((id: string) => usedTraits.has(id));
    if (hasConflict) continue;
    
    // Higher priority = higher chance, but still some randomness
    const chance = Math.min(0.9, 0.3 + (candidate.priority * 0.15));
    if (rng.next() < chance) {
      contextualTraits.push(trait);
      usedTraits.add(trait.id);
      // Store the reason for the trait (will be used in backstory)
      (trait as any).__backstoryReason = candidate.reason;
    }
  }
  
  // If we still don't have enough traits, fill with random appropriate ones
  if (contextualTraits.length < numTraits) {
    const availableTraits = ALL_PASSIVE_TRAITS.filter((t: PassiveTrait) => 
      !usedTraits.has(t.id) && 
      !t.conflictsWith?.some((id: string) => usedTraits.has(id))
    );
    
    while (contextualTraits.length < numTraits && availableTraits.length > 0) {
      const randomTrait = rng.choice(availableTraits) as PassiveTrait;
      contextualTraits.push(randomTrait);
      usedTraits.add(randomTrait.id);
      availableTraits.splice(availableTraits.indexOf(randomTrait), 1);
    }
  }
  
  return contextualTraits;
}

function generateDetailedInfo(rng: SeededRandom, age: number, name: string, background: Background): ColonistProfile['detailedInfo'] {
  const birthplace = rng.choice(BIRTHPLACES);
  
  // Generate family
  const hasParents = rng.next() > 0.1; // 90% have known parents
  const parents = [];
  if (hasParents) {
    if (rng.next() > 0.2) parents.push(`${rng.choice(NAMES.FIRST)} ${name.split(' ')[1]} (Father)`);
    if (rng.next() > 0.1) parents.push(`${rng.choice(NAMES.FIRST)} ${rng.choice(NAMES.LAST)} (Mother)`);
  }
  
  const siblingCount = rng.next() > 0.6 ? rng.range(1, 3) : 0;
  const siblings = [];
  for (let i = 0; i < siblingCount; i++) {
    const siblingName = rng.choice(NAMES.FIRST);
    const relationship = rng.choice(['Brother', 'Sister']);
    siblings.push(`${siblingName} ${name.split(' ')[1]} (${relationship})`);
  }
  
  const spouse = age > 25 && rng.next() > 0.6 ? `${rng.choice(NAMES.FIRST)} ${rng.choice(NAMES.LAST)}` : undefined;
  
  const childCount = spouse && rng.next() > 0.7 ? rng.range(1, 2) : 0;
  const children = [];
  for (let i = 0; i < childCount; i++) {
    const childName = rng.choice(NAMES.FIRST);
    const gender = rng.choice(['Son', 'Daughter']);
    children.push(`${childName} (${gender})`);
  }
  
  // Generate life events based on age
  const eventCount = Math.min(rng.range(2, 5), Math.floor(age / 8));
  const lifeEvents = [];
  for (let i = 0; i < eventCount; i++) {
    const event = rng.choice(LIFE_EVENTS);
    const eventAge = rng.range(8, age - 2);
    lifeEvents.push({ age: eventAge, ...event });
  }
  lifeEvents.sort((a, b) => a.age - b.age);
  
  // Generate skills based on background (primary skills + random extras)
  const backgroundSkills = getSkillsForBackground(background.name);
  const extraSkills = rng.choices(SKILLS.filter(s => !backgroundSkills.includes(s)), rng.range(0, 2));
  const skills = [...backgroundSkills, ...extraSkills];
  
  const fears = rng.choices(FEARS, rng.range(1, 2));
  const secrets = rng.next() > 0.7 ? [rng.choice(SECRETS)] : [];
  
  // Generate relationships
  const relationshipCount = Math.min(rng.range(1, 3), Math.floor(age / 12));
  const relationships = [];
  const relationshipTypes = ['Childhood Friend', 'Former Colleague', 'Neighbor', 'Mentor', 'Rival'];
  for (let i = 0; i < relationshipCount; i++) {
    const relName = `${rng.choice(NAMES.FIRST)} ${rng.choice(NAMES.LAST)}`;
    const type = rng.choice(relationshipTypes);
    const status = rng.choice(['good', 'bad', 'neutral'] as const);
    relationships.push({ name: relName, type, status });
  }
  
  return {
    birthplace,
    family: { parents, siblings, spouse, children },
    lifeEvents,
    skills,
    fears,
    secrets,
    relationships
  };
}

// Map backgrounds to appropriate narrative skills
function getSkillsForBackground(backgroundName: string): string[] {
  const skillMap: Record<string, string[]> = {
    'Medic': ['Medicine', 'First Aid', 'Herbalism'],
    'Doctor': ['Medicine', 'First Aid'],
    'Farmer': ['Agriculture', 'Gardening', 'Animal Husbandry'],
    'Herbalist': ['Herbalism', 'Gardening', 'Alchemy'],
    'Soldier': ['Tactics', 'Hunting', 'Leadership'],
    'Guard': ['Tactics', 'Leadership'],
    'Scholar': ['Philosophy', 'Mathematics', 'Astronomy'],
    'Engineer': ['Engineering', 'Mechanics', 'Mathematics'],
    'Noble': ['Leadership', 'Poetry', 'Music'],
    'Merchant': ['Leadership', 'Mathematics', 'Storytelling'],
    'Hunter': ['Hunting', 'Tracking', 'Fishing'],
    'Laborer': ['Carpentry', 'Masonry', 'Mining'],
    'Craftsman': ['Smithing', 'Leatherworking', 'Carpentry'],
    'Miner': ['Mining', 'Prospecting', 'Masonry'],
    'Cook': ['Cooking', 'Herbalism'],
    'Builder': ['Carpentry', 'Masonry', 'Engineering'],
    'Witch': ['Alchemy', 'Herbalism', 'Astronomy'],
    'Assassin': ['Tactics', 'Alchemy'],
    'Pirate': ['Navigation', 'Tactics', 'Fishing'],
  };
  
  return skillMap[backgroundName] || ['Carpentry', 'Cooking']; // Default fallback
}

function createRichBackstory(profile: Partial<ColonistProfile>): string {
  const { name, age, detailedInfo, background } = profile;
  if (!detailedInfo) return "A mysterious person with an unknown past.";
  
  // Use a random narrative structure instead of a template
  const seed = hashStringToNumber(name!);
  const rng = new SeededRandom(seed + 1000); // Different seed for story variation
  const narrativeStyle = rng.range(0, 6);
  
  let story = '';
  
  switch (narrativeStyle) {
    case 0: // Event-focused opening
      if (detailedInfo.lifeEvents.length > 0) {
        const pivotalEvent = detailedInfo.lifeEvents[rng.range(0, detailedInfo.lifeEvents.length - 1)];
        story += `Everything changed for ${name} when they were ${pivotalEvent.age}. That was when ${pivotalEvent.event}. `;
      }
      story += `Born in ${detailedInfo.birthplace}, `;
      if (detailedInfo.family.parents.length === 0) {
        story += `they never knew their parents. `;
      } else {
        story += `their early years were shaped by ${detailedInfo.family.parents[0].split(' (')[0]}. `;
      }
      break;
      
    case 1: // Skill/talent focused opening
      if (detailedInfo.skills.length > 0) {
        story += `${name} discovered their gift for ${detailedInfo.skills[0].toLowerCase()} at a young age. `;
      }
      story += `Growing up in ${detailedInfo.birthplace}, they learned early that survival meant `;
      story += rng.choice(['adapting quickly', 'trusting no one completely', 'keeping secrets', 'staying sharp']);
      story += '. ';
      break;
      
    case 2: // Fear/psychology focused opening
      if (detailedInfo.fears.length > 0) {
        story += `Some say ${name}'s fear of ${detailedInfo.fears[0]} stems from their childhood in ${detailedInfo.birthplace}. `;
      }
      story += `Now ${age}, they've lived through `;
      if (detailedInfo.lifeEvents.length > 0) {
        story += `more than most: ${detailedInfo.lifeEvents[0].event.toLowerCase()}`;
        if (detailedInfo.lifeEvents.length > 1) {
          story += `, and later, ${detailedInfo.lifeEvents[1].event.toLowerCase()}`;
        }
        story += '. ';
      } else {
        story += 'enough to change anyone. ';
      }
      break;
      
    case 3: // Mystery/secret focused opening
      if (detailedInfo.secrets.length > 0) {
        story += `${name} carries a burden few could imagine: they ${detailedInfo.secrets[0]}. `;
        story += `This secret has shaped their ${age} years more than being born in ${detailedInfo.birthplace} ever could. `;
      } else {
        story += `${name}, ${age}, came from ${detailedInfo.birthplace} with ghosts in their past. `;
      }
      break;
      
    case 4: // Relationship focused opening
      if (detailedInfo.relationships.length > 0) {
        const rel = detailedInfo.relationships[0];
        story += `${name} still thinks about ${rel.name}, their ${rel.type.toLowerCase()}. `;
        story += `That relationship ended ${rel.status === 'bad' ? 'badly' : rel.status === 'good' ? 'on good terms' : 'ambiguously'}, but it taught them `;
        story += rng.choice(['who to trust', 'the cost of loyalty', 'that nothing lasts forever', 'the value of bonds']);
        story += '. ';
      }
      if (detailedInfo.family.spouse) {
        story += `These days, they share their life with ${detailedInfo.family.spouse}. `;
      }
      story += `They originally came from ${detailedInfo.birthplace}, `;
      break;
      
    case 5: // Career/background focused opening
      story += `As a ${background?.toLowerCase()}, ${name} has seen ${detailedInfo.birthplace} and beyond. `;
      story += `${age} years of life have taught them `;
      if (detailedInfo.skills.length >= 2) {
        story += `${detailedInfo.skills[0].toLowerCase()} and ${detailedInfo.skills[1].toLowerCase()}, `;
      }
      story += `but more importantly, they've learned `;
      story += rng.choice(['when to fight', 'when to run', 'who deserves trust', 'that survival isn\'t everything']);
      story += '. ';
      break;
      
    case 6: // Philosophical/reflective opening
      story += `At ${age}, ${name} has learned that life rarely goes as planned. `;
      if (detailedInfo.family.parents.length > 0) {
        story += `Their parents, ${detailedInfo.family.parents.map(p => p.split(' (')[0]).join(' and ')}, `;
        story += `who raised them in ${detailedInfo.birthplace}, `;
      } else {
        story += `Orphaned at a young age and raised in ${detailedInfo.birthplace}, `;
      }
      story += 'but that was just the beginning. ';
      break;
  }
  
  // Add middle section with varied structure
  const middleStyle = rng.range(0, 3);
  
  switch (middleStyle) {
    case 0: // Chronicle events
      const chronEvents = detailedInfo.lifeEvents.filter(e => !story.includes(e.event)).slice(0, 2);
      if (chronEvents.length > 0) {
        story += chronEvents.map(e => {
          const details = rng.choice([
            `At ${e.age}, ${e.event}`,
            `When they were ${e.age}, ${e.event}`,
            `Age ${e.age} brought change: ${e.event}`,
            `${e.age} was a turning point when ${e.event}`
          ]);
          return details;
        }).join('. ') + '. ';
      }
      break;
      
    case 1: // Describe relationships and family
      if (detailedInfo.family.siblings.length > 0) {
        const sibCount = detailedInfo.family.siblings.length;
        story += `${sibCount === 1 ? 'Their sibling' : `Their ${sibCount} siblings`} `;
        story += rng.choice([
          'scattered to the winds years ago',
          'remain back home, unaware of their current life',
          'may not even know they\'re alive',
          'were lost to the same events that brought them here'
        ]) + '. ';
      }
      if (detailedInfo.family.children.length > 0) {
        story += `They have ${detailedInfo.family.children.length} child${detailedInfo.family.children.length > 1 ? 'ren' : ''} `;
        story += rng.choice([
          'somewhere out there',
          'they hope to see again someday',
          'they left behind for their own safety',
          'who may never forgive them'
        ]) + '. ';
      }
      break;
      
    case 2: // Highlight skills and quirks
      if (detailedInfo.skills.length > 1) {
        const skills = detailedInfo.skills.slice(0, 3);
        story += `Over the years, they\'ve picked up skills in `;
        story += skills.slice(0, -1).map(s => s.toLowerCase()).join(', ');
        story += `, and ${skills[skills.length - 1].toLowerCase()}. `;
      }
      break;
      
    case 3: // Add mystery or personality depth
      if (detailedInfo.secrets.length > 0 && !story.includes(detailedInfo.secrets[0])) {
        story += rng.choice([
          `There are things they don\'t talk about. Things like how they ${detailedInfo.secrets[0]}. `,
          `They keep quiet about certain matters, particularly that they ${detailedInfo.secrets[0]}. `,
          `Some truths are better left unsaid, such as the fact that they ${detailedInfo.secrets[0]}. `
        ]);
      }
      break;
  }
  
  // Add a section that explicitly connects traits to backstory
  if (profile.passiveTraits && profile.passiveTraits.length > 0) {
    story += '\n\n';
    const traitDescriptions: string[] = [];
    
    for (const trait of profile.passiveTraits) {
      const reason = (trait as any).__backstoryReason;
      if (reason && rng.next() > 0.3) { // 70% chance to explain each trait
        const traitName = trait.name;
        const connections = [
          `Their ${traitName.toLowerCase()} nature stems from ${reason}.`,
          `${reason.charAt(0).toUpperCase() + reason.slice(1)} left them ${traitName.toLowerCase()}.`,
          `People often notice they're ${traitName.toLowerCase()}, a quality developed through ${reason}.`,
          `${reason.charAt(0).toUpperCase() + reason.slice(1)} made them ${traitName.toLowerCase()}.`
        ];
        traitDescriptions.push(rng.choice(connections));
      }
    }
    
    if (traitDescriptions.length > 0) {
      story += traitDescriptions.slice(0, 2).join(' ');
    }
  }
  
  // Add closing with variety
  const closingStyle = rng.range(0, 4);
  
  switch (closingStyle) {
    case 0: // Forward-looking
      story += rng.choice([
        'Now they seek a fresh start, though the past is never truly behind anyone.',
        'They came here hoping to leave their old life behind, but some things follow you.',
        'This colony represents a new chapter, though they know better than to expect peace.',
        'Whatever comes next, they\'re ready to face it. They have to be.'
      ]);
      break;
      
    case 1: // Reflective on fears/weaknesses
      if (detailedInfo.fears.length > 0 && !story.includes(detailedInfo.fears[0])) {
        story += rng.choice([
          `Despite everything, they\'ve never overcome their fear of ${detailedInfo.fears[0]}.`,
          `Their fear of ${detailedInfo.fears[0]} remains, a reminder that even survivors have limits.`,
          `${detailedInfo.fears[0]} still troubles them, though they\'d never admit it.`
        ]);
      } else {
        story += 'Some scars never fully heal, but they\'ve learned to keep moving forward.';
      }
      break;
      
    case 2: // Mysterious/ominous
      story += rng.choice([
        'Whether they\'re running from something or toward something, even they might not know.',
        'They rarely speak of what drove them here. Perhaps it\'s better that way.',
        'Some questions are better left unasked. They certainly won\'t offer answers.',
        'The full truth of their past may never be known. Perhaps that\'s for the best.'
      ]);
      break;
      
    case 3: // Skills/capability focused
      story += rng.choice([
        'Whatever happens, their skills will prove useful to the colony.',
        'They\'ve survived worse than this. Probably.',
        'Their past has prepared them for hardship, if nothing else.',
        'They know how to survive. Everything else is negotiable.'
      ]);
      break;
      
    case 4: // Philosophical
      story += rng.choice([
        'In the end, everyone\'s past is a collection of choices and chances. Theirs is no different.',
        'They believe that where you come from matters less than where you\'re going.',
        'The past made them who they are. Whether that\'s good or bad remains to be seen.',
        'Life, they\'ve learned, is what happens between the disasters.'
      ]);
      break;
  }
  
  return story;
}

// Item generation for starting inventory
function generateStartingInventory(rng: SeededRandom, background: string, skills: string[]): ColonistInventory {
  const inventory: ColonistInventory = {
    items: [],
    equipment: {},
    carryCapacity: 50, // Base carry capacity
    currentWeight: 0
  };

  // Initialize item database
  itemDatabase.loadItems();

  // Get items based on background
  const backgroundItems = itemDatabase.getItemsForBackground(background);
  
  // Add background-specific items
  for (const itemDefName of backgroundItems) {
    const item = itemDatabase.createItem(itemDefName, 1, getRandomQuality(rng));
    if (item) {
      if (item.category === 'Tool' || item.category === 'Weapon' || item.category === 'Armor' || item.category === 'Helmet') {
        // Equip the item
        const equipSlot = getEquipSlot(item.category);
        if (equipSlot && !inventory.equipment[equipSlot]) {
          inventory.equipment[equipSlot] = item;
        } else {
          inventory.items.push(item);
        }
      } else {
        inventory.items.push(item);
      }
    }
  }

  // Add skill-based bonus items
  if (skills.includes('Cooking')) {
    const item = itemDatabase.createItem('Knife', 1);
    if (item) inventory.items.push(item);
  }
  if (skills.includes('First Aid')) {
    const item = itemDatabase.createItem('MedicineKit', 1);
    if (item) inventory.items.push(item);
  }

  // Add some basic supplies for everyone
  const basicSupplies = ['Bread', 'Bandages'];
  for (const itemDefName of basicSupplies) {
    const item = itemDatabase.createItem(itemDefName, rng.range(1, 3));
    if (item) {
      inventory.items.push(item);
    }
  }

  // Basic clothing if not equipped
  if (!inventory.equipment.armor) {
    const workClothes = itemDatabase.createItem('WorkClothes', 1);
    if (workClothes) {
      inventory.equipment.armor = workClothes;
    }
  }

  // Soft guarantee: Non-soldiers sometimes get a pistol. This increases chances
  // that early colonies have at least one ranged weapon without forcing it.
  const bgl = background.toLowerCase();
  const hasWeapon = !!inventory.equipment.weapon;
  const hasRanged = hasWeapon && (inventory.equipment.weapon?.defName === 'Autopistol' || inventory.equipment.weapon?.defName === 'AssaultRifle');
  if (!hasRanged && bgl !== 'soldier') {
    // ~35% chance to receive a pistol as starting gear
    if (rng.next() < 0.35) {
      const pistol = itemDatabase.createItem('Autopistol', 1, getRandomQuality(rng));
      if (pistol) inventory.equipment.weapon = pistol;
    }
  }

  // Calculate total weight
  let totalWeight = 0;
  for (const item of inventory.items) {
    totalWeight += (item.weight || 0) * item.quantity;
  }
  for (const equipped of Object.values(inventory.equipment)) {
    if (equipped) {
      totalWeight += equipped.weight || 0;
    }
  }
  inventory.currentWeight = totalWeight;

  return inventory;
}

function getEquipSlot(category: string): keyof ColonistInventory['equipment'] | null {
  switch (category) {
    case 'Tool': return 'tool';
    case 'Weapon': return 'weapon';
    case 'Armor': return 'armor';
    case 'Helmet': return 'helmet';
    default: return null;
  }
}

function getRandomQuality(rng: SeededRandom): 'poor' | 'normal' | 'good' | 'excellent' | 'masterwork' | 'legendary' | 'awful' {
  const rand = rng.range(0, 1);
  if (rand < 0.05) return 'poor';
  if (rand < 0.15) return 'awful';
  if (rand < 0.60) return 'normal';
  if (rand < 0.85) return 'good';
  if (rand < 0.95) return 'excellent';
  if (rand < 0.99) return 'masterwork';
  return 'legendary';
}

export function generateColonistProfile(): ColonistProfile {
  console.log('DEBUG: Generating new colonist profile...');
  const firstName = randomChoice(NAMES.FIRST);
  const lastName = randomChoice(NAMES.LAST);
  const name = `${firstName} ${lastName}`;
  
  // Generate consistent seed from name for reproducible results
  const seed = hashStringToNumber(name);
  const rng = new SeededRandom(seed);
  const age = rng.range(20, 55);
  
  // STEP 1: Generate background FIRST (this drives their skills)
  const background = getRandomBackground();
  
  // STEP 2: Generate detailed personal information (with background-appropriate skills)
  const detailedInfo = generateDetailedInfo(rng, age, name, background);
  
  // STEP 3: Generate traits that make sense with the backstory
  const contextualTraits = generateContextualTraits(rng, detailedInfo, background, age);
  
  // STEP 4: Generate appearance traits
  const appearance = generateAppearanceTraits();
  
  console.log('DEBUG: Generated contextual traits:', contextualTraits.map(t => t.name));
  
  const favoriteFood = randomChoice(FAVORITE_FOODS);
  
  const avatar = {
    skinTone: appearance.skinTone.hex,
    hairColor: appearance.hairColor.hex,
    eyeColor: appearance.eyeColor.hex,
    // Use weighted clothing color selection from appearance traits
    clothing: getRandomColor(CLOTHING_COLORS).hex,
    sprites: {
      headType: randomChoice(ImageAssets.getInstance().getAvailableHeadTypes()),
      bodyType: appearance.bodyType,
      hairStyle: appearance.hairStyle,
      apparelType: randomChoice(ImageAssets.getInstance().getAvailableApparelTypes())
    }
  };
  
  const stats = generateStats();
  
  const profile: ColonistProfile = {
    name,
    age,
    seed,
    background: background.name,
    personality: contextualTraits.map(trait => trait.name),
    favoriteFood,
    backstory: '', // Will be generated next
    detailedInfo,
    avatar,
    stats,
    startingInventory: generateStartingInventory(rng, background.name, detailedInfo.skills),
    passiveTraits: contextualTraits // Store the full trait objects
  };
  
  // Generate rich backstory using all the detailed information
  profile.backstory = createRichBackstory(profile);

  // Attach initial skill set (game will later copy to colonist entity)
  const initialSkillSet = createDefaultSkillSet();
  
  // BALANCED APPROACH: Add background-based skills FIRST to guarantee competence,
  // then add random variance to other skills. This prevents both overpowered colonists
  // and ensures backstory matches actual skills.
  applyBackstorySkillBoosts(initialSkillSet, detailedInfo.skills, true); // true = initial setup
  addStartingSkillVariance(initialSkillSet); // Will only boost skills still at 0
  
  (profile as any).initialSkills = initialSkillSet;
  
  return profile;
}

// Helper function to get a short description of a colonist
export function getColonistDescription(profile: ColonistProfile): string {
  return `${profile.name}, a ${profile.personality.join(' and ').toLowerCase()} ${profile.background.toLowerCase()}`;
}

// Helper function to get colonist mood based on current state
export function getColonistMood(colonist: any): string {
  const hp = colonist.hp || 0;
  const hunger = colonist.hunger || 0;
  const fatigue = colonist.fatigue || 0;
  const pain = colonist.health?.totalPain || 0;
  const consciousness = colonist.health?.consciousness || 1.0;
  
  // Pain-based moods (highest priority)
  if (pain > 0.6) return "Agonizing pain";
  if (pain > 0.4) return "In pain";
  if (consciousness < 0.5) return "Barely conscious";
  
  // Existing health checks
  if (hp < 30) return "Injured";
  if (hunger > 80) return "Starving";
  if (fatigue > 80) return "Exhausted";
  if (colonist.inside) return "Resting";
  if (colonist.state === "flee") return "Terrified";
  
  // Positive moods (factor in pain)
  if (pain < 0.1 && hp > 80 && hunger < 30 && fatigue < 30) return "Happy";
  if (pain < 0.2 && hp > 60 && hunger < 50 && fatigue < 50) return "Content";
  if (pain > 0.2) return "Uncomfortable";
  
  return "Okay";
}
