/**
 * Colonist Background Stories and Origins
 * Defines the backstories, professions, and life experiences of colonists
 */

export interface Background {
  id: string;
  name: string;
  description: string;
  skillModifiers: Record<string, number>;
  startingItems?: string[];
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export const BACKGROUNDS: Background[] = [
  // Common Backgrounds
  {
    id: 'farmer',
    name: 'Farmer',
    description: 'Spent years working the fields, knows the land well.',
    skillModifiers: {
      farming: 3,
      construction: 1,
      strength: 2
    },
    startingItems: ['seeds', 'hoe'],
    rarity: 'common'
  },
  {
    id: 'laborer',
    name: 'Laborer',
    description: 'Hard physical work has made them strong and resilient.',
    skillModifiers: {
      construction: 3,
      strength: 3,
      endurance: 2
    },
    startingItems: ['hammer', 'nails'],
    rarity: 'common'
  },
  {
    id: 'merchant',
    name: 'Merchant',
    description: 'Skilled in trade and negotiation, knows the value of goods.',
    skillModifiers: {
      social: 3,
      intelligence: 2,
      trade: 3
    },
    startingItems: ['coin_purse', 'ledger'],
    rarity: 'common'
  },
  {
    id: 'hunter',
    name: 'Hunter',
    description: 'Experienced in tracking and survival in the wilderness.',
    skillModifiers: {
      shooting: 3,
      animals: 2,
      survival: 3
    },
    startingItems: ['bow', 'arrows'],
    rarity: 'common'
  },

  // Uncommon Backgrounds
  {
    id: 'soldier',
    name: 'Soldier',
    description: 'Military training has prepared them for combat and discipline.',
    skillModifiers: {
      shooting: 4,
      melee: 3,
      discipline: 3,
      strength: 2
    },
    startingItems: ['assault_rifle', 'armor'],
    rarity: 'uncommon'
  },
  {
    id: 'scholar',
    name: 'Scholar',
    description: 'Years of study have made them knowledgeable but physically weak.',
    skillModifiers: {
      research: 4,
      intelligence: 4,
      medicine: 2,
      strength: -2
    },
    startingItems: ['books', 'research_notes'],
    rarity: 'uncommon'
  },
  {
    id: 'engineer',
    name: 'Engineer',
    description: 'Technical expertise in building and maintaining complex systems.',
    skillModifiers: {
      construction: 4,
      crafting: 3,
      intelligence: 3,
      repair: 4
    },
    startingItems: ['toolbox', 'blueprints'],
    rarity: 'uncommon'
  },
  {
    id: 'medic',
    name: 'Medic',
    description: 'Trained in healing and medical procedures.',
    skillModifiers: {
      medicine: 4,
      intelligence: 2,
      social: 2,
      dexterity: 2
    },
    startingItems: ['MedicineKit', 'Bandages'],
    rarity: 'uncommon'
  },

  // Rare Backgrounds
  {
    id: 'noble',
    name: 'Noble',
    description: 'Born into privilege, skilled in leadership but lacks practical experience.',
    skillModifiers: {
      social: 4,
      leadership: 4,
      intelligence: 2,
      construction: -2,
      farming: -2
    },
    startingItems: ['fine_clothes', 'signet_ring'],
    rarity: 'rare'
  },
  {
    id: 'assassin',
    name: 'Assassin',
    description: 'Trained in stealth and precision, deadly but antisocial.',
    skillModifiers: {
      melee: 4,
      stealth: 5,
      dexterity: 3,
      social: -3
    },
    startingItems: ['poison', 'throwing_knives'],
    rarity: 'rare'
  },
  {
    id: 'witch',
    name: 'Witch',
    description: 'Practitioner of ancient arts, mysterious and powerful.',
    skillModifiers: {
      medicine: 3,
      research: 3,
      intelligence: 3,
      social: -2
    },
    startingItems: ['herbs', 'ritual_components'],
    rarity: 'rare'
  },

  // Legendary Backgrounds
  {
    id: 'hero',
    name: 'Hero',
    description: 'A legendary figure with exceptional abilities in all areas.',
    skillModifiers: {
      shooting: 3,
      melee: 3,
      leadership: 4,
      strength: 3,
      intelligence: 2
    },
    startingItems: ['legendary_weapon', 'hero_medal'],
    rarity: 'legendary'
  },
  {
    id: 'mastermind',
    name: 'Mastermind',
    description: 'Brilliant strategist and inventor, capable of incredible feats.',
    skillModifiers: {
      intelligence: 5,
      research: 5,
      leadership: 3,
      crafting: 4
    },
    startingItems: ['advanced_tools', 'invention_plans'],
    rarity: 'legendary'
  }
];

export const ORIGIN_STORIES = [
  "Was a respected member of their community before the collapse.",
  "Survived alone in the wilderness for months before joining the colony.",
  "Lost their family in the great disaster and seeks a new beginning.",
  "Was part of a failed expedition to establish another settlement.",
  "Escaped from raiders who destroyed their previous home.",
  "Voluntarily left their old life behind to join the colony.",
  "Was rescued by the colony after being found injured and alone.",
  "Brings tales of distant lands and strange discoveries.",
  "Seeks redemption for past mistakes in their former life.",
  "Dreams of rebuilding civilization better than it was before."
];

export function getRandomBackground(rarity?: 'common' | 'uncommon' | 'rare' | 'legendary'): Background {
  let availableBackgrounds = BACKGROUNDS;
  
  if (rarity) {
    availableBackgrounds = BACKGROUNDS.filter(bg => bg.rarity === rarity);
  } else {
    // Weighted random selection based on rarity
    const roll = Math.random();
    if (roll < 0.6) {
      availableBackgrounds = BACKGROUNDS.filter(bg => bg.rarity === 'common');
    } else if (roll < 0.85) {
      availableBackgrounds = BACKGROUNDS.filter(bg => bg.rarity === 'uncommon');
    } else if (roll < 0.98) {
      availableBackgrounds = BACKGROUNDS.filter(bg => bg.rarity === 'rare');
    } else {
      availableBackgrounds = BACKGROUNDS.filter(bg => bg.rarity === 'legendary');
    }
  }
  
  return availableBackgrounds[Math.floor(Math.random() * availableBackgrounds.length)];
}

export function getRandomOriginStory(): string {
  return ORIGIN_STORIES[Math.floor(Math.random() * ORIGIN_STORIES.length)];
}
