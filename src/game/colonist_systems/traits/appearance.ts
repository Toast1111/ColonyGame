/**
 * Colonist Appearance and Coloration System
 * Defines visual traits like hair color, skin tone, eye color, clothing colors, etc.
 */

export interface ColorVariant {
  name: string;
  hex: string;
  rgb: [number, number, number];
  rarity: 'common' | 'uncommon' | 'rare';
}

export interface AppearanceTraits {
  hairColor: ColorVariant;
  hairStyle: string;
  skinTone: ColorVariant;
  eyeColor: ColorVariant;
  bodyType: string;
  height: 'short' | 'average' | 'tall';
  build: 'slim' | 'average' | 'stocky' | 'muscular';
}

// Hair Colors
export const HAIR_COLORS: ColorVariant[] = [
  // Common
  { name: 'Brown', hex: '#8B4513', rgb: [139, 69, 19], rarity: 'common' },
  { name: 'Black', hex: '#000000', rgb: [0, 0, 0], rarity: 'common' },
  { name: 'Blonde', hex: '#FFD700', rgb: [255, 215, 0], rarity: 'common' },
  { name: 'Dark Brown', hex: '#654321', rgb: [101, 67, 33], rarity: 'common' },
  
  // Uncommon
  { name: 'Auburn', hex: '#A0522D', rgb: [160, 82, 45], rarity: 'uncommon' },
  { name: 'Ginger', hex: '#FF6347', rgb: [255, 99, 71], rarity: 'uncommon' },
  { name: 'Strawberry Blonde', hex: '#FF8C69', rgb: [255, 140, 105], rarity: 'uncommon' },
  { name: 'Gray', hex: '#808080', rgb: [128, 128, 128], rarity: 'uncommon' },
  
  // Rare
  { name: 'White', hex: '#FFFFFF', rgb: [255, 255, 255], rarity: 'rare' },
  { name: 'Silver', hex: '#C0C0C0', rgb: [192, 192, 192], rarity: 'rare' },
  { name: 'Platinum Blonde', hex: '#F5F5DC', rgb: [245, 245, 220], rarity: 'rare' }
];

// Skin Tones
export const SKIN_TONES: ColorVariant[] = [
  { name: 'Fair', hex: '#FDBCB4', rgb: [253, 188, 180], rarity: 'common' },
  { name: 'Light', hex: '#F1C27D', rgb: [241, 194, 125], rarity: 'common' },
  { name: 'Medium', hex: '#E0AC69', rgb: [224, 172, 105], rarity: 'common' },
  { name: 'Olive', hex: '#C68642', rgb: [198, 134, 66], rarity: 'common' },
  { name: 'Tan', hex: '#8D5524', rgb: [141, 85, 36], rarity: 'common' },
  { name: 'Brown', hex: '#8B4513', rgb: [139, 69, 19], rarity: 'common' },
  { name: 'Dark', hex: '#5C4033', rgb: [92, 64, 51], rarity: 'common' },
  { name: 'Deep', hex: '#3C2415', rgb: [60, 36, 21], rarity: 'common' }
];

// Eye Colors
export const EYE_COLORS: ColorVariant[] = [
  // Common
  { name: 'Brown', hex: '#8B4513', rgb: [139, 69, 19], rarity: 'common' },
  { name: 'Blue', hex: '#4169E1', rgb: [65, 105, 225], rarity: 'common' },
  { name: 'Green', hex: '#228B22', rgb: [34, 139, 34], rarity: 'common' },
  { name: 'Hazel', hex: '#8FBC8F', rgb: [143, 188, 143], rarity: 'common' },
  
  // Uncommon
  { name: 'Gray', hex: '#808080', rgb: [128, 128, 128], rarity: 'uncommon' },
  { name: 'Amber', hex: '#FFBF00', rgb: [255, 191, 0], rarity: 'uncommon' },
  
  // Rare
  { name: 'Violet', hex: '#8A2BE2', rgb: [138, 43, 226], rarity: 'rare' },
  { name: 'Heterochromia', hex: '#FF1493', rgb: [255, 20, 147], rarity: 'rare' }
];

// Hair Styles (matches existing asset names - lowercase to match sprite names)
export const HAIR_STYLES = [
  'afro', 'bob', 'bowlcut', 'braidbun', 'bravo', 'burgundy',
  'cleopatra', 'curly', 'cute', 'decent', 'elder', 'fancybun',
  'firestarter', 'flowy', 'fringe', 'frozen', 'gaston', 'greasyswoop',
  'junkie', 'keeper', 'lackland', 'locks', 'long', 'mess',
  'mohawk', 'mop', 'pigtails', 'ponytails', 'primal', 'princess',
  'randy', 'recruit', 'revolt', 'rockstar', 'rookie', 'savage',
  'scat', 'scorpiontail', 'scrapper', 'senorita', 'shaved', 'shavetopbraid',
  'snazzy', 'spikes', 'sticky', 'topdog', 'troubadour', 'tuft',
  'warden', 'wavy'
];

// Body Types
export const BODY_TYPES = [
  'naked_male'  // Must match the sprite asset naming in images.ts
];

// Clothing Colors
export const CLOTHING_COLORS: ColorVariant[] = [
  // Basic Colors
  { name: 'White', hex: '#FFFFFF', rgb: [255, 255, 255], rarity: 'common' },
  { name: 'Black', hex: '#000000', rgb: [0, 0, 0], rarity: 'common' },
  { name: 'Gray', hex: '#808080', rgb: [128, 128, 128], rarity: 'common' },
  { name: 'Brown', hex: '#8B4513', rgb: [139, 69, 19], rarity: 'common' },
  { name: 'Blue', hex: '#4169E1', rgb: [65, 105, 225], rarity: 'common' },
  { name: 'Red', hex: '#DC143C', rgb: [220, 20, 60], rarity: 'common' },
  { name: 'Green', hex: '#228B22', rgb: [34, 139, 34], rarity: 'common' },
  
  // Uncommon Colors
  { name: 'Purple', hex: '#800080', rgb: [128, 0, 128], rarity: 'uncommon' },
  { name: 'Orange', hex: '#FF8C00', rgb: [255, 140, 0], rarity: 'uncommon' },
  
  // Rare Colors
  { name: 'Gold', hex: '#FFD700', rgb: [255, 215, 0], rarity: 'rare' },
  { name: 'Silver', hex: '#C0C0C0', rgb: [192, 192, 192], rarity: 'rare' }
];

export function getRandomColor(colorArray: ColorVariant[], rarityBias: boolean = true): ColorVariant {
  if (!rarityBias) {
    return colorArray[Math.floor(Math.random() * colorArray.length)];
  }
  
  // Weighted selection based on rarity
  const roll = Math.random();
  let availableColors: ColorVariant[];
  
  if (roll < 0.7) {
    availableColors = colorArray.filter(c => c.rarity === 'common');
  } else if (roll < 0.9) {
    availableColors = colorArray.filter(c => c.rarity === 'uncommon');
  } else {
    availableColors = colorArray.filter(c => c.rarity === 'rare');
  }
  
  // Fallback to all colors if none found
  if (availableColors.length === 0) {
    availableColors = colorArray;
  }
  
  return availableColors[Math.floor(Math.random() * availableColors.length)];
}

export function getRandomHairStyle(): string {
  return HAIR_STYLES[Math.floor(Math.random() * HAIR_STYLES.length)];
}

export function getRandomBodyType(): string {
  return BODY_TYPES[Math.floor(Math.random() * BODY_TYPES.length)];
}

export function generateAppearanceTraits(): AppearanceTraits {
  return {
    hairColor: getRandomColor(HAIR_COLORS),
    hairStyle: getRandomHairStyle(),
    skinTone: getRandomColor(SKIN_TONES),
    eyeColor: getRandomColor(EYE_COLORS),
    bodyType: getRandomBodyType(),
    height: ['short', 'average', 'tall'][Math.floor(Math.random() * 3)] as 'short' | 'average' | 'tall',
    build: ['slim', 'average', 'stocky', 'muscular'][Math.floor(Math.random() * 4)] as 'slim' | 'average' | 'stocky' | 'muscular'
  };
}

export function getColorTint(color: ColorVariant, intensity: number = 1.0): string {
  const [r, g, b] = color.rgb;
  return `rgba(${r}, ${g}, ${b}, ${intensity})`;
}
