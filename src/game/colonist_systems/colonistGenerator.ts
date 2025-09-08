// Colonist personality and background generator
import { ImageAssets } from '../../assets/images';
import { itemDatabase } from '../../data/itemDatabase';
import { 
  generateCompleteTraitSet,
  NAMES,
  FAVORITE_FOODS,
  APPEARANCE_OPTIONS,
  CLOTHING_COLORS,
  getRandomColor,
  randomChoice,
  type ColonistTraits
} from './traits';
import type { InventoryItem, Equipment, ColonistInventory } from '../types';

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
}

// Extended data for Prison Architect-style generation
const BIRTHPLACES = [
  'Millhaven', 'Riverside', 'Oakwood', 'Stonecrest', 'Greenfield', 'Ashford',
  'Fairview', 'Brookside', 'Clearwater', 'Redwood', 'Silverdale', 'Goldcrest',
  'Ironport', 'Copper Hills', 'Crystal Lake', 'Shadowvale', 'Brightwater', 'Darkwood'
];

const LIFE_EVENTS = [
  { event: "Lost a parent at a young age", impact: 'negative' as const },
  { event: "Won a local competition", impact: 'positive' as const },
  { event: "Survived a natural disaster", impact: 'neutral' as const },
  { event: "Fell in love and got heartbroken", impact: 'negative' as const },
  { event: "Started their own small business", impact: 'positive' as const },
  { event: "Served in the local militia", impact: 'neutral' as const },
  { event: "Lost everything in a fire", impact: 'negative' as const },
  { event: "Saved someone's life", impact: 'positive' as const },
  { event: "Was betrayed by a close friend", impact: 'negative' as const },
  { event: "Discovered a hidden talent", impact: 'positive' as const },
  { event: "Moved frequently as a child", impact: 'neutral' as const },
  { event: "Inherited property from a relative", impact: 'positive' as const }
];

const SKILLS = [
  'Cooking', 'Carpentry', 'Gardening', 'Mechanics', 'First Aid', 'Hunting',
  'Fishing', 'Sewing', 'Music', 'Art', 'Writing', 'Leadership', 'Animal Care'
];

const FEARS = [
  'heights', 'darkness', 'water', 'crowds', 'spiders', 'failure', 'abandonment',
  'confined spaces', 'loud noises', 'authority figures'
];

const SECRETS = [
  "once stole food to feed a starving family",
  "has a photographic memory but hides it",
  "is secretly afraid of butterflies",
  "wrote anonymous love letters for years",
  "saved someone's life and never told anyone",
  "knows the location of hidden treasure",
  "can't read but has never admitted it",
  "has recurring dreams about flying"
];

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

function generateDetailedInfo(rng: SeededRandom, age: number, name: string): ColonistProfile['detailedInfo'] {
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
  
  // Generate skills, fears, secrets
  const skills = rng.choices(SKILLS, rng.range(2, 4));
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

function createRichBackstory(profile: Partial<ColonistProfile>): string {
  const { name, age, detailedInfo, background } = profile;
  if (!detailedInfo) return "A mysterious person with an unknown past.";
  
  let story = `${name} is ${age} years old and was born in ${detailedInfo.birthplace}. `;
  
  // Family background
  if (detailedInfo.family.parents.length > 0) {
    story += `Raised by ${detailedInfo.family.parents.join(' and ')}, `;
  } else {
    story += `Growing up without parents, `;
  }
  
  if (detailedInfo.family.siblings.length > 0) {
    story += `they have ${detailedInfo.family.siblings.length} sibling${detailedInfo.family.siblings.length > 1 ? 's' : ''}. `;
  } else {
    story += `they were an only child. `;
  }
  
  // Major life events
  if (detailedInfo.lifeEvents.length > 0) {
    const majorEvents = detailedInfo.lifeEvents.filter(e => e.impact !== 'neutral').slice(0, 2);
    if (majorEvents.length > 0) {
      story += `Key moments in their life include: `;
      story += majorEvents.map(e => `at age ${e.age}, ${e.event.toLowerCase()}`).join('; ') + '. ';
    }
  }
  
  // Current family situation
  if (detailedInfo.family.spouse) {
    story += `They are married to ${detailedInfo.family.spouse}`;
    if (detailedInfo.family.children.length > 0) {
      story += ` and have ${detailedInfo.family.children.length} child${detailedInfo.family.children.length > 1 ? 'ren' : ''}: ${detailedInfo.family.children.join(', ')}`;
    }
    story += '. ';
  }
  
  // Skills and personality
  if (detailedInfo.skills.length > 0) {
    story += `They are skilled in ${detailedInfo.skills.slice(0, 2).join(' and ')}. `;
  }
  
  // Fears
  if (detailedInfo.fears.length > 0) {
    story += `Despite their strengths, they have a deep fear of ${detailedInfo.fears[0]}. `;
  }
  
  // Secrets
  if (detailedInfo.secrets.length > 0) {
    story += `What few know is that they ${detailedInfo.secrets[0]}.`;
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
  const hasRanged = hasWeapon && !!itemDatabase.getItemDef(inventory.equipment.weapon!.defName || '')?.range && (itemDatabase.getItemDef(inventory.equipment.weapon!.defName || '')!.range! > 2);
  if (!hasRanged && bgl !== 'soldier') {
    // ~35% chance to receive a pistol as starting gear
    if (rng.next() < 0.35) {
      const pistol = itemDatabase.createItem('Pistol', 1, getRandomQuality(rng));
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
  
  // Generate traits using the new modular system
  const traits = generateCompleteTraitSet();
  console.log('DEBUG: Generated traits:', traits);
  
  // Generate detailed personal information
  const detailedInfo = generateDetailedInfo(rng, age, name);
  
  const favoriteFood = randomChoice(FAVORITE_FOODS);
  
  const avatar = {
    skinTone: traits.appearance.skinTone.hex,
    hairColor: traits.appearance.hairColor.hex,
    eyeColor: traits.appearance.eyeColor.hex,
    // Use weighted clothing color selection from appearance traits
    clothing: getRandomColor(CLOTHING_COLORS).hex,
    sprites: {
      headType: randomChoice(ImageAssets.getInstance().getAvailableHeadTypes()),
      bodyType: traits.appearance.bodyType,
      hairStyle: traits.appearance.hairStyle,
      apparelType: randomChoice(ImageAssets.getInstance().getAvailableApparelTypes())
    }
  };
  
  const stats = generateStats();
  
  const profile: ColonistProfile = {
    name,
    age,
    seed,
    background: traits.background.name,
    personality: traits.passiveTraits.map(trait => trait.name),
    favoriteFood,
    backstory: '', // Will be generated next
    detailedInfo,
    avatar,
    stats,
    startingInventory: generateStartingInventory(rng, traits.background.name, detailedInfo.skills)
  };
  
  // Generate rich backstory using all the detailed information
  profile.backstory = createRichBackstory(profile);
  
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
  
  if (hp < 30) return "Injured";
  if (hunger > 80) return "Starving";
  if (fatigue > 80) return "Exhausted";
  if (colonist.inside) return "Resting";
  if (colonist.state === "flee") return "Terrified";
  if (hp > 80 && hunger < 30 && fatigue < 30) return "Happy";
  if (hp > 60 && hunger < 50 && fatigue < 50) return "Content";
  return "Okay";
}
