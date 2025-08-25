/**
 * Traits System Index
 * Central export point for all trait-related functionality
 */

// Export all background-related functionality
export * from './backgrounds';

// Export all appearance-related functionality  
export * from './appearance';

// Export all passive trait functionality
export * from './passiveTraits';

// Utility types that combine all trait systems
export interface ColonistTraits {
  background: import('./backgrounds').Background;
  appearance: import('./appearance').AppearanceTraits;
  passiveTraits: import('./passiveTraits').PassiveTrait[];
  originStory: string;
}

// Import functions for combined generation
import { getRandomBackground, getRandomOriginStory } from './backgrounds';
import { generateAppearanceTraits } from './appearance';
import { generatePassiveTraits } from './passiveTraits';

// Combined trait generation function
export function generateCompleteTraitSet(): ColonistTraits {
  return {
    background: getRandomBackground(),
    appearance: generateAppearanceTraits(),
    passiveTraits: generatePassiveTraits(Math.floor(Math.random() * 3) + 1), // 1-3 traits
    originStory: getRandomOriginStory()
  };
}
