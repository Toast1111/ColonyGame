/**
 * Passive Traits System
 * Defines gameplay modifying traits like movement speed, stat bonuses, special abilities, etc.
 */

export interface PassiveTrait {
  id: string;
  name: string;
  description: string;
  type: 'positive' | 'negative' | 'neutral';
  category: 'physical' | 'mental' | 'social' | 'special';
  effects: TraitEffect[];
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  conflictsWith?: string[]; // IDs of traits that can't coexist
}

export interface TraitEffect {
  stat: string;
  modifier: number;
  type: 'additive' | 'multiplicative';
  description?: string;
}

// Physical Traits
export const PHYSICAL_TRAITS: PassiveTrait[] = [
  {
    id: 'fleet_footed',
    name: 'Fleet-Footed',
    description: 'Moves faster than average due to natural agility.',
    type: 'positive',
    category: 'physical',
    effects: [
      { stat: 'movementSpeed', modifier: 1.25, type: 'multiplicative', description: '+25% movement speed' }
    ],
    rarity: 'uncommon',
    conflictsWith: ['sluggish']
  },
  {
    id: 'sluggish',
    name: 'Sluggish',
    description: 'Naturally slow-moving, but often more careful and precise.',
    type: 'negative',
    category: 'physical',
    effects: [
      { stat: 'movementSpeed', modifier: 0.8, type: 'multiplicative', description: '-20% movement speed' },
      { stat: 'accuracy', modifier: 1, type: 'additive', description: '+1 accuracy due to carefulness' }
    ],
    rarity: 'common',
    conflictsWith: ['fleet_footed', 'nimble']
  },
  {
    id: 'strong_back',
    name: 'Strong Back',
    description: 'Can carry more items and work longer without fatigue.',
    type: 'positive',
    category: 'physical',
    effects: [
      { stat: 'carryCapacity', modifier: 1.5, type: 'multiplicative', description: '+50% carry capacity' },
      { stat: 'construction', modifier: 2, type: 'additive', description: '+2 construction skill' }
    ],
    rarity: 'uncommon',
    conflictsWith: ['frail']
  },
  {
    id: 'frail',
    name: 'Frail',
    description: 'Physically weak but often compensates with intelligence.',
    type: 'negative',
    category: 'physical',
    effects: [
      { stat: 'health', modifier: 0.75, type: 'multiplicative', description: '-25% max health' },
      { stat: 'intelligence', modifier: 2, type: 'additive', description: '+2 intelligence' }
    ],
    rarity: 'common',
    conflictsWith: ['strong_back', 'tough']
  },
  {
    id: 'tough',
    name: 'Tough',
    description: 'Naturally resilient and hard to hurt.',
    type: 'positive',
    category: 'physical',
    effects: [
      { stat: 'health', modifier: 1.3, type: 'multiplicative', description: '+30% max health' },
      { stat: 'painTolerance', modifier: 3, type: 'additive', description: '+3 pain tolerance' }
    ],
    rarity: 'uncommon',
    conflictsWith: ['frail']
  },
  {
    id: 'nimble',
    name: 'Nimble',
    description: 'Quick reflexes and excellent hand-eye coordination.',
    type: 'positive',
    category: 'physical',
    effects: [
      { stat: 'dexterity', modifier: 3, type: 'additive', description: '+3 dexterity' },
      { stat: 'accuracy', modifier: 2, type: 'additive', description: '+2 accuracy' }
    ],
    rarity: 'uncommon',
    conflictsWith: ['clumsy']
  },
  {
    id: 'clumsy',
    name: 'Clumsy',
    description: 'Prone to accidents but oddly endearing to others.',
    type: 'negative',
    category: 'physical',
    effects: [
      { stat: 'dexterity', modifier: -2, type: 'additive', description: '-2 dexterity' },
      { stat: 'social', modifier: 1, type: 'additive', description: '+1 social (endearing clumsiness)' }
    ],
    rarity: 'common',
    conflictsWith: ['nimble']
  }
];

// Mental Traits
export const MENTAL_TRAITS: PassiveTrait[] = [
  {
    id: 'quick_learner',
    name: 'Quick Learner',
    description: 'Gains experience and skills faster than others.',
    type: 'positive',
    category: 'mental',
    effects: [
      { stat: 'experienceGain', modifier: 1.5, type: 'multiplicative', description: '+50% experience gain' }
    ],
    rarity: 'rare'
  },
  {
    id: 'slow_learner',
    name: 'Slow Learner',
    description: 'Takes longer to learn new skills but retains them better.',
    type: 'negative',
    category: 'mental',
    effects: [
      { stat: 'experienceGain', modifier: 0.7, type: 'multiplicative', description: '-30% experience gain' },
      { stat: 'skillRetention', modifier: 1.2, type: 'multiplicative', description: '+20% skill retention' }
    ],
    rarity: 'common'
  },
  {
    id: 'photographic_memory',
    name: 'Photographic Memory',
    description: 'Never forgets anything and excels at research.',
    type: 'positive',
    category: 'mental',
    effects: [
      { stat: 'research', modifier: 4, type: 'additive', description: '+4 research skill' },
      { stat: 'intelligence', modifier: 3, type: 'additive', description: '+3 intelligence' }
    ],
    rarity: 'legendary'
  },
  {
    id: 'absent_minded',
    name: 'Absent-Minded',
    description: 'Often forgets things but has moments of brilliant insight.',
    type: 'negative',
    category: 'mental',
    effects: [
      { stat: 'taskCompletion', modifier: 0.85, type: 'multiplicative', description: '-15% task completion rate' },
      { stat: 'creativity', modifier: 3, type: 'additive', description: '+3 creativity bonus' }
    ],
    rarity: 'common'
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Works slower but produces higher quality results.',
    type: 'neutral',
    category: 'mental',
    effects: [
      { stat: 'workSpeed', modifier: 0.8, type: 'multiplicative', description: '-20% work speed' },
      { stat: 'quality', modifier: 1.4, type: 'multiplicative', description: '+40% work quality' }
    ],
    rarity: 'uncommon'
  },
  {
    id: 'focused',
    name: 'Focused',
    description: 'Excellent concentration allows for efficient work.',
    type: 'positive',
    category: 'mental',
    effects: [
      { stat: 'workSpeed', modifier: 1.2, type: 'multiplicative', description: '+20% work speed' },
      { stat: 'accuracy', modifier: 2, type: 'additive', description: '+2 accuracy' }
    ],
    rarity: 'uncommon'
  }
];

// Social Traits
export const SOCIAL_TRAITS: PassiveTrait[] = [
  {
    id: 'charismatic',
    name: 'Charismatic',
    description: 'Natural leader who inspires others.',
    type: 'positive',
    category: 'social',
    effects: [
      { stat: 'social', modifier: 4, type: 'additive', description: '+4 social skill' },
      { stat: 'leadership', modifier: 3, type: 'additive', description: '+3 leadership' }
    ],
    rarity: 'rare'
  },
  {
    id: 'antisocial',
    name: 'Antisocial',
    description: 'Prefers solitude but works well independently.',
    type: 'negative',
    category: 'social',
    effects: [
      { stat: 'social', modifier: -3, type: 'additive', description: '-3 social skill' },
      { stat: 'independentWork', modifier: 1.3, type: 'multiplicative', description: '+30% efficiency when working alone' }
    ],
    rarity: 'common'
  },
  {
    id: 'empathetic',
    name: 'Empathetic',
    description: 'Deeply understands others emotions and needs.',
    type: 'positive',
    category: 'social',
    effects: [
      { stat: 'medicine', modifier: 2, type: 'additive', description: '+2 medicine (bedside manner)' },
      { stat: 'social', modifier: 2, type: 'additive', description: '+2 social skill' },
      { stat: 'moodImpact', modifier: 1.2, type: 'multiplicative', description: '+20% positive mood impact on others' }
    ],
    rarity: 'uncommon'
  },
  {
    id: 'intimidating',
    name: 'Intimidating',
    description: 'Natural presence that can be useful in conflict.',
    type: 'neutral',
    category: 'social',
    effects: [
      { stat: 'melee', modifier: 2, type: 'additive', description: '+2 melee (intimidation factor)' },
      { stat: 'social', modifier: -1, type: 'additive', description: '-1 social (can be off-putting)' },
      { stat: 'conflictResolution', modifier: 1.5, type: 'multiplicative', description: '+50% conflict resolution through intimidation' }
    ],
    rarity: 'uncommon'
  }
];

// Special Traits
export const SPECIAL_TRAITS: PassiveTrait[] = [
  {
    id: 'green_thumb',
    name: 'Green Thumb',
    description: 'Plants seem to grow better under their care.',
    type: 'positive',
    category: 'special',
    effects: [
      { stat: 'farming', modifier: 4, type: 'additive', description: '+4 farming skill' },
      { stat: 'cropYield', modifier: 1.25, type: 'multiplicative', description: '+25% crop yield' },
      { stat: 'plantGrowthSpeed', modifier: 1.15, type: 'multiplicative', description: '+15% plant growth speed' }
    ],
    rarity: 'rare'
  },
  {
    id: 'animal_whisperer',
    name: 'Animal Whisperer',
    description: 'Has an uncanny ability to understand and work with animals.',
    type: 'positive',
    category: 'special',
    effects: [
      { stat: 'animals', modifier: 5, type: 'additive', description: '+5 animal skill' },
      { stat: 'animalProductivity', modifier: 1.3, type: 'multiplicative', description: '+30% animal productivity' },
      { stat: 'tamingSpeed', modifier: 2.0, type: 'multiplicative', description: '100% faster animal taming' }
    ],
    rarity: 'rare'
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'More productive during night hours.',
    type: 'neutral',
    category: 'special',
    effects: [
      { stat: 'nightWorkBonus', modifier: 1.5, type: 'multiplicative', description: '+50% work efficiency at night' },
      { stat: 'dayWorkPenalty', modifier: 0.9, type: 'multiplicative', description: '-10% work efficiency during day' }
    ],
    rarity: 'uncommon'
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Most productive in the early morning hours.',
    type: 'neutral',
    category: 'special',
    effects: [
      { stat: 'morningWorkBonus', modifier: 1.4, type: 'multiplicative', description: '+40% work efficiency in morning' },
      { stat: 'eveningWorkPenalty', modifier: 0.9, type: 'multiplicative', description: '-10% work efficiency in evening' }
    ],
    rarity: 'uncommon'
  },
  {
    id: 'lucky',
    name: 'Lucky',
    description: 'Good things just seem to happen around them.',
    type: 'positive',
    category: 'special',
    effects: [
      { stat: 'criticalSuccess', modifier: 2.0, type: 'multiplicative', description: '100% higher chance of critical success' },
      { stat: 'resourceFind', modifier: 1.2, type: 'multiplicative', description: '+20% chance to find extra resources' }
    ],
    rarity: 'legendary'
  },
  {
    id: 'jinxed',
    name: 'Jinxed',
    description: 'Prone to unfortunate accidents and bad luck.',
    type: 'negative',
    category: 'special',
    effects: [
      { stat: 'criticalFailure', modifier: 1.5, type: 'multiplicative', description: '+50% chance of critical failure' },
      { stat: 'equipmentBreakage', modifier: 1.3, type: 'multiplicative', description: '+30% equipment breakage rate' }
    ],
    rarity: 'uncommon'
  }
];

// Combine all traits
export const ALL_PASSIVE_TRAITS: PassiveTrait[] = [
  ...PHYSICAL_TRAITS,
  ...MENTAL_TRAITS,
  ...SOCIAL_TRAITS,
  ...SPECIAL_TRAITS
];

export function getRandomPassiveTrait(
  category?: 'physical' | 'mental' | 'social' | 'special',
  rarity?: 'common' | 'uncommon' | 'rare' | 'legendary'
): PassiveTrait {
  let availableTraits = ALL_PASSIVE_TRAITS;
  
  if (category) {
    availableTraits = availableTraits.filter(trait => trait.category === category);
  }
  
  if (rarity) {
    availableTraits = availableTraits.filter(trait => trait.rarity === rarity);
  } else {
    // Weighted selection based on rarity
    const roll = Math.random();
    if (roll < 0.5) {
      availableTraits = availableTraits.filter(trait => trait.rarity === 'common');
    } else if (roll < 0.8) {
      availableTraits = availableTraits.filter(trait => trait.rarity === 'uncommon');
    } else if (roll < 0.95) {
      availableTraits = availableTraits.filter(trait => trait.rarity === 'rare');
    } else {
      availableTraits = availableTraits.filter(trait => trait.rarity === 'legendary');
    }
  }
  
  if (availableTraits.length === 0) {
    availableTraits = ALL_PASSIVE_TRAITS; // Fallback
  }
  
  return availableTraits[Math.floor(Math.random() * availableTraits.length)];
}

export function generatePassiveTraits(count: number = 2): PassiveTrait[] {
  const traits: PassiveTrait[] = [];
  const usedTraits = new Set<string>();
  
  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let trait: PassiveTrait;
    
    do {
      trait = getRandomPassiveTrait();
      attempts++;
    } while (
      (usedTraits.has(trait.id) || 
       (trait.conflictsWith && trait.conflictsWith.some(id => usedTraits.has(id)))) &&
      attempts < 50
    );
    
    if (attempts < 50) {
      traits.push(trait);
      usedTraits.add(trait.id);
    }
  }
  
  return traits;
}

export function applyTraitEffects(baseStats: Record<string, number>, traits: PassiveTrait[]): Record<string, number> {
  const modifiedStats = { ...baseStats };
  
  for (const trait of traits) {
    for (const effect of trait.effects) {
      if (modifiedStats[effect.stat] !== undefined) {
        if (effect.type === 'additive') {
          modifiedStats[effect.stat] += effect.modifier;
        } else if (effect.type === 'multiplicative') {
          modifiedStats[effect.stat] *= effect.modifier;
        }
      }
    }
  }
  
  return modifiedStats;
}

export function getTraitsByCategory(category: 'physical' | 'mental' | 'social' | 'special'): PassiveTrait[] {
  return ALL_PASSIVE_TRAITS.filter(trait => trait.category === category);
}

export function getTraitById(id: string): PassiveTrait | undefined {
  return ALL_PASSIVE_TRAITS.find(trait => trait.id === id);
}
