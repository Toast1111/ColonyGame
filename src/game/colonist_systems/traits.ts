/**
 * Legacy Traits System - Backwards Compatibility Layer
 * This file maintains compatibility with existing code while using the new modular trait system
 * 
 * NEW CODE SHOULD IMPORT FROM:
 * - ./traits/backgrounds.ts for background stories and professions
 * - ./traits/appearance.ts for visual/color traits
 * - ./traits/passiveTraits.ts for gameplay modifying traits
 * - ./traits/index.ts for complete trait generation
 */

// Re-export everything from the new modular system for backwards compatibility
export * from './traits/index';

// Legacy exports (deprecated - use new modular imports instead)
import { 
  getRandomBackground, 
  getRandomOriginStory,
  BACKGROUNDS,
  ORIGIN_STORIES 
} from './traits/backgrounds';

import { 
  HAIR_COLORS,
  SKIN_TONES,
  EYE_COLORS,
  HAIR_STYLES,
  getRandomColor,
  getRandomHairStyle,
  generateAppearanceTraits 
} from './traits/appearance';

import { 
  ALL_PASSIVE_TRAITS,
  generatePassiveTraits,
  getRandomPassiveTrait 
} from './traits/passiveTraits';

// Legacy interfaces for backwards compatibility
export interface TraitEffect {
  workSpeed?: number;
  socialBonus?: number;
  hungerRate?: number;
  fatigueRate?: number;
  buildSpeed?: number;
  harvestSpeed?: number;
  healthRegen?: number;
  stressResistance?: number;
  learningSpeed?: number;
  combatEffectiveness?: number;
}

export interface PersonalityTrait {
  name: string;
  description: string;
  effects: TraitEffect;
  rarity?: 'common' | 'uncommon' | 'rare' | 'legendary';
  conflictsWith?: string[];
  synergizesWith?: string[];
}

export interface BackgroundTrait {
  name: string;
  description: string;
  effects: TraitEffect;
  startingSkills?: string[];
  unlocks?: string[];
}

export interface PhysicalTrait {
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
}

// Legacy constant exports
export const PERSONALITY_TRAIT_NAMES = ALL_PASSIVE_TRAITS.map(trait => trait.name);
export const personalityTraits = ALL_PASSIVE_TRAITS.map(trait => ({
  name: trait.name,
  description: trait.description,
  effects: trait.effects.reduce((acc, effect) => {
    (acc as any)[effect.stat] = effect.modifier;
    return acc;
  }, {} as TraitEffect),
  rarity: trait.rarity
}));

export const hairColors = HAIR_COLORS.map(color => color.name);
export const skinTones = SKIN_TONES.map(tone => tone.name);
export const eyeColors = EYE_COLORS.map(color => color.name);
export const hairStyles = HAIR_STYLES;
export const backgrounds = BACKGROUNDS.map(bg => ({
  name: bg.name,
  description: bg.description,
  effects: Object.entries(bg.skillModifiers).reduce((acc, [skill, mod]) => {
    (acc as any)[skill] = mod;
    return acc;
  }, {} as TraitEffect),
  startingSkills: bg.startingItems || []
}));
export const originStories = ORIGIN_STORIES;

// Legacy appearance options
export const APPEARANCE_OPTIONS = {
  SKIN_TONES: SKIN_TONES.map(tone => tone.hex),
  HAIR_COLORS: HAIR_COLORS.map(color => color.hex),
  EYE_COLORS: EYE_COLORS.map(color => color.hex),
  CLOTHING_COLORS: ['#8B4513', '#228B22', '#4169E1', '#DC143C', '#FF8C00', '#9932CC']
};

// Legacy names and foods
export const NAMES = {
  FIRST: [
    'Alex', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Jamie', 'Avery',
    'Quinn', 'Sage', 'River', 'Rowan', 'Phoenix', 'Dakota', 'Skyler', 'Emery',
    'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason',
    'Isabella', 'William', 'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas'
  ],
  LAST: [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas'
  ]
};

export const FAVORITE_FOODS = [
  'Fresh Bread', 'Roasted Vegetables', 'Berry Pie', 'Hearty Stew', 'Honey Cakes',
  'Grilled Fish', 'Wild Mushrooms', 'Apple Cider', 'Cheese & Crackers', 'Herbal Tea'
];

export const BACKSTORY_TEMPLATES = ORIGIN_STORIES;

// Legacy utility functions
export function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function randomChoices<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export const getRandomPersonalityTrait = getRandomPassiveTrait;
export const getRandomHairColor = () => getRandomColor(HAIR_COLORS).name;
export const getRandomSkinTone = () => getRandomColor(SKIN_TONES).name;
export const getRandomEyeColor = () => getRandomColor(EYE_COLORS).name;

export function generatePhysicalTraits(): any {
  const appearance = generateAppearanceTraits();
  return {
    hairColor: appearance.hairColor.name,
    hairStyle: appearance.hairStyle,
    skinTone: appearance.skinTone.name,
    eyeColor: appearance.eyeColor.name,
    bodyType: appearance.bodyType,
    height: appearance.height,
    build: appearance.build
  };
}

export function generateColonistTraits() {
  return {
    personality: getRandomPassiveTrait(),
    background: getRandomBackground(),
    physical: generatePhysicalTraits(),
    originStory: getRandomOriginStory()
  };
}

// Legacy functions for backwards compatibility
export function getWeightedRandomTrait(): string {
  return getRandomPassiveTrait().name;
}

export function validateTraitCombination(traits: string[]): { valid: boolean; conflicts: string[] } {
  return { valid: true, conflicts: [] }; // Simplified for backwards compatibility
}

export function calculateTraitSynergy(traits: string[]): number {
  return 0; // Simplified for backwards compatibility
}

export function combineTraitEffects(traits: string[], background: string): TraitEffect {
  return {}; // Simplified for backwards compatibility
}

export function getTraitDescription(traitName: string): string {
  const trait = ALL_PASSIVE_TRAITS.find(t => t.name === traitName);
  return trait ? trait.description : 'Unknown trait';
}

export function getBackgroundDescription(backgroundName: string): string {
  const background = BACKGROUNDS.find(bg => bg.name === backgroundName);
  return background ? background.description : 'Unknown background';
}

export function getAvailableUnlocks(background: string): string[] {
  return []; // Simplified for backwards compatibility
}
