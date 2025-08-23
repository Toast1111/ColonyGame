// Colonist personality and background generator
import { ImageAssets } from '../assets/images';

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
    // New sprite-based appearance system
    sprites: {
      headType: string;    // e.g., 'male_average_normal'
      bodyType: string;    // e.g., 'naked_male'
      hairStyle: string;   // e.g., 'afro', 'bob', 'bowlcut'
      apparelType: string; // e.g., 'shirt_basic_male'
    };
  };
  stats: {
    workSpeed: number;    // 0.8 - 1.2 multiplier
    socialBonus: number;  // affects morale of nearby colonists
    hungerRate: number;   // 0.8 - 1.2 multiplier
    fatigueRate: number;  // 0.8 - 1.2 multiplier
  };
}

const FIRST_NAMES = [
  // Classic names
  'Alex', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Jamie', 'Avery',
  'Quinn', 'Sage', 'River', 'Rowan', 'Phoenix', 'Dakota', 'Skyler', 'Emery',
  
  // Traditional names
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason',
  'Isabella', 'William', 'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas',
  
  // Unique names
  'Zara', 'Kai', 'Nova', 'Atlas', 'Luna', 'Orion', 'Iris', 'Felix',
  'Hazel', 'Jasper', 'Willow', 'Oscar', 'Ivy', 'Leo', 'Ruby', 'Finn'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
  'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell'
];

const BACKGROUNDS = [
  'Former Teacher', 'Ex-Engineer', 'Retired Chef', 'Former Nurse', 'Ex-Carpenter',
  'Former Artist', 'Ex-Farmer', 'Former Mechanic', 'Ex-Librarian', 'Former Soldier',
  'Ex-Scientist', 'Former Merchant', 'Ex-Doctor', 'Former Baker', 'Ex-Blacksmith',
  'Former Scholar', 'Ex-Hunter', 'Former Musician', 'Ex-Tailor', 'Former Guard'
];

const PERSONALITY_TRAITS = [
  'Optimistic', 'Hardworking', 'Friendly', 'Brave', 'Creative', 'Analytical',
  'Compassionate', 'Resourceful', 'Patient', 'Loyal', 'Adventurous', 'Wise',
  'Energetic', 'Calm', 'Witty', 'Generous', 'Determined', 'Gentle', 'Curious', 'Resilient'
];

const FAVORITE_FOODS = [
  'Fresh Bread', 'Roasted Vegetables', 'Berry Pie', 'Hearty Stew', 'Honey Cakes',
  'Grilled Fish', 'Wild Mushrooms', 'Apple Cider', 'Cheese & Crackers', 'Herbal Tea',
  'Dried Fruits', 'Nut Butter', 'Vegetable Soup', 'Sweet Berries', 'Grain Porridge'
];

const SKIN_TONES = [
  // Natural human skin tones
  '#F5DEB3', '#DEB887', '#D2B48C', '#BC9A6A', '#8B7355', '#654321',
  '#F4C2A1', '#E8B796', '#D4A574', '#C19A6B', '#A0522D', '#8B4513',
  // Fantasy colors for extra fabulousness!
  '#FFE4E1', '#FFF8DC', '#F0E68C', '#E6E6FA', '#F5F5DC', '#FFEFD5'
];

const HAIR_COLORS = [
  // Natural colors
  '#8B4513', '#D2691E', '#CD853F', '#DEB887', '#F4A460', '#FFD700',
  '#FF8C00', '#B22222', '#800000', '#2F4F4F', '#000000', '#696969',
  // Fun but not scary fantasy colors!
  '#FFB6C1', '#87CEEB', '#DDA0DD', '#90EE90', '#F0E68C', '#FFDAB9',
  '#98FB98', '#F5DEB3', '#FFE4B5', '#E0E0E0', '#D3D3D3', '#C0C0C0'
];

const EYE_COLORS = [
  // Natural colors
  '#8B4513', '#228B22', '#4169E1', '#808080', '#32CD32', '#006400',
  '#4682B4', '#2E8B57', '#8B008B', '#FF69B4', '#FF4500', '#DC143C',
  // Magical eye colors
  '#00FFFF', '#FF00FF', '#FFFF00', '#FF8C00', '#9932CC', '#00FA9A'
];

const CLOTHING_COLORS = [
  // Classic colors
  '#8B4513', '#228B22', '#4169E1', '#DC143C', '#FF8C00', '#9932CC',
  '#2F4F4F', '#B22222', '#008B8B', '#DAA520', '#8B008B', '#556B2F',
  // Pleasant vibrant additions
  '#4682B4', '#32CD32', '#FFD700', '#FF6347', '#87CEEB', '#DDA0DD',
  '#F0E68C', '#FFA500', '#98FB98', '#F5DEB3', '#E6E6FA', '#FFDAB9'
];

const BACKSTORY_TEMPLATES = [
  "Once lived in a bustling city before seeking a simpler life in the wilderness.",
  "Grew up on a farm and knows the value of hard work and community.",
  "Traveled extensively before deciding to settle down and build something lasting.",
  "Lost their previous home to disaster and is determined to rebuild stronger.",
  "Always dreamed of living close to nature and away from the chaos of modern life.",
  "Inherited skills from their family trade and wants to put them to good use.",
  "Seeks redemption by helping others and contributing to something meaningful.",
  "Values knowledge and believes in preserving wisdom for future generations.",
  "Passionate about creating beauty and bringing joy to others through their work.",
  "Believes in the power of community and wants to help create a safe haven.",
  "Hopes to find peace and purpose after years of searching for their place in the world.",
  "Dreams of creating a legacy that will benefit generations to come."
];

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomChoices<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
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
  const firstName = randomChoice(FIRST_NAMES);
  const lastName = randomChoice(LAST_NAMES);
  const name = `${firstName} ${lastName}`;
  
  const background = randomChoice(BACKGROUNDS);
  const personality = randomChoices(PERSONALITY_TRAITS, 2 + Math.floor(Math.random() * 2)); // 2-3 traits
  const favoriteFood = randomChoice(FAVORITE_FOODS);
  const backstory = randomChoice(BACKSTORY_TEMPLATES);
  
  const avatar = {
    skinTone: randomChoice(SKIN_TONES),
    hairColor: randomChoice(HAIR_COLORS),
    eyeColor: randomChoice(EYE_COLORS),
    clothing: randomChoice(CLOTHING_COLORS),
    sprites: {
      headType: randomChoice(ImageAssets.getInstance().getAvailableHeadTypes()),
      bodyType: randomChoice(ImageAssets.getInstance().getAvailableBodyTypes()),
      hairStyle: randomChoice(ImageAssets.getInstance().getAvailableHairStyles()),
      apparelType: randomChoice(ImageAssets.getInstance().getAvailableApparelTypes())
    }
  };
  
  const stats = generateStats();
  
  return {
    name,
    background,
    personality,
    favoriteFood,
    backstory,
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
