// Colonist personality and background generator
import { ImageAssets } from '../assets/images';
import { 
  generateCompleteTraitSet,
  NAMES,
  FAVORITE_FOODS,
  APPEARANCE_OPTIONS,
  randomChoice,
  type ColonistTraits
} from './traits';

export interface ColonistProfile {
  name: string;
  background: string;
  personality: string[];
  favoriteFood: string;
  backstory: string;
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

export function generateColonistProfile(): ColonistProfile {
  const firstName = randomChoice(NAMES.FIRST);
  const lastName = randomChoice(NAMES.LAST);
  const name = `${firstName} ${lastName}`;
  
  // Generate traits using the new modular system
  const traits = generateCompleteTraitSet();
  
  const favoriteFood = randomChoice(FAVORITE_FOODS);
  
  const avatar = {
    skinTone: traits.appearance.skinTone.hex,
    hairColor: traits.appearance.hairColor.hex,
    eyeColor: traits.appearance.eyeColor.hex,
    clothing: randomChoice(APPEARANCE_OPTIONS.CLOTHING_COLORS),
    sprites: {
      headType: randomChoice(ImageAssets.getInstance().getAvailableHeadTypes()),
      bodyType: traits.appearance.bodyType,
      hairStyle: traits.appearance.hairStyle,
      apparelType: randomChoice(ImageAssets.getInstance().getAvailableApparelTypes())
    }
  };
  
  const stats = generateStats();
  
  return {
    name,
    background: traits.background.name,
    personality: traits.passiveTraits.map(trait => trait.name),
    favoriteFood,
    backstory: traits.originStory,
    avatar,
    stats
  };
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
