/**
 * Coloration traits for colonists - hair colors, skin tones, eye colors, clothing colors
 */

export interface ColorationTrait {
  id: string;
  name: string;
  description: string;
  category: 'hair' | 'skin' | 'eyes' | 'clothing';
  hexColor: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  modifiers?: {
    attractiveness?: number;
    visibility?: number; // How noticeable the colonist is
  };
}

// Hair Colors
export const HAIR_COLORS: ColorationTrait[] = [
  {
    id: 'black_hair',
    name: 'Black Hair',
    description: 'Deep black hair color',
    category: 'hair',
    hexColor: '#1C1C1C',
    rarity: 'common'
  },
  {
    id: 'brown_hair',
    name: 'Brown Hair',
    description: 'Rich brown hair color',
    category: 'hair',
    hexColor: '#8B4513',
    rarity: 'common'
  },
  {
    id: 'blonde_hair',
    name: 'Blonde Hair',
    description: 'Golden blonde hair color',
    category: 'hair',
    hexColor: '#DAA520',
    rarity: 'common'
  },
  {
    id: 'red_hair',
    name: 'Red Hair',
    description: 'Fiery red hair color',
    category: 'hair',
    hexColor: '#B22222',
    rarity: 'uncommon',
    modifiers: {
      attractiveness: 1,
      visibility: 2
    }
  },
  {
    id: 'white_hair',
    name: 'White Hair',
    description: 'Pure white hair color',
    category: 'hair',
    hexColor: '#F5F5F5',
    rarity: 'uncommon'
  },
  {
    id: 'gray_hair',
    name: 'Gray Hair',
    description: 'Distinguished gray hair color',
    category: 'hair',
    hexColor: '#808080',
    rarity: 'common'
  },
  {
    id: 'silver_hair',
    name: 'Silver Hair',
    description: 'Shimmering silver hair color',
    category: 'hair',
    hexColor: '#C0C0C0',
    rarity: 'rare',
    modifiers: {
      attractiveness: 2
    }
  },
  {
    id: 'blue_hair',
    name: 'Blue Hair',
    description: 'Vibrant blue hair color',
    category: 'hair',
    hexColor: '#0066CC',
    rarity: 'rare',
    modifiers: {
      visibility: 3
    }
  },
  {
    id: 'purple_hair',
    name: 'Purple Hair',
    description: 'Royal purple hair color',
    category: 'hair',
    hexColor: '#800080',
    rarity: 'rare',
    modifiers: {
      attractiveness: 1,
      visibility: 2
    }
  },
  {
    id: 'rainbow_hair',
    name: 'Rainbow Hair',
    description: 'Magical rainbow-colored hair',
    category: 'hair',
    hexColor: '#FF69B4', // Representative color
    rarity: 'legendary',
    modifiers: {
      attractiveness: 5,
      visibility: 10
    }
  }
];

// Skin Tones
export const SKIN_TONES: ColorationTrait[] = [
  {
    id: 'pale_skin',
    name: 'Pale Skin',
    description: 'Light, pale skin tone',
    category: 'skin',
    hexColor: '#FDBCB4',
    rarity: 'common'
  },
  {
    id: 'fair_skin',
    name: 'Fair Skin',
    description: 'Fair, light skin tone',
    category: 'skin',
    hexColor: '#F1C27D',
    rarity: 'common'
  },
  {
    id: 'medium_skin',
    name: 'Medium Skin',
    description: 'Medium skin tone',
    category: 'skin',
    hexColor: '#E0AC69',
    rarity: 'common'
  },
  {
    id: 'olive_skin',
    name: 'Olive Skin',
    description: 'Olive-toned skin',
    category: 'skin',
    hexColor: '#C68642',
    rarity: 'common'
  },
  {
    id: 'tan_skin',
    name: 'Tan Skin',
    description: 'Sun-kissed tan skin',
    category: 'skin',
    hexColor: '#8D5524',
    rarity: 'common'
  },
  {
    id: 'brown_skin',
    name: 'Brown Skin',
    description: 'Rich brown skin tone',
    category: 'skin',
    hexColor: '#8B4513',
    rarity: 'common'
  },
  {
    id: 'dark_skin',
    name: 'Dark Skin',
    description: 'Deep, dark skin tone',
    category: 'skin',
    hexColor: '#654321',
    rarity: 'common'
  },
  {
    id: 'albino_skin',
    name: 'Albino Skin',
    description: 'Very pale, albino skin',
    category: 'skin',
    hexColor: '#FFF8DC',
    rarity: 'rare',
    modifiers: {
      visibility: -2 // Less visible in bright environments
    }
  }
];

// Eye Colors
export const EYE_COLORS: ColorationTrait[] = [
  {
    id: 'brown_eyes',
    name: 'Brown Eyes',
    description: 'Warm brown eyes',
    category: 'eyes',
    hexColor: '#8B4513',
    rarity: 'common'
  },
  {
    id: 'blue_eyes',
    name: 'Blue Eyes',
    description: 'Bright blue eyes',
    category: 'eyes',
    hexColor: '#4169E1',
    rarity: 'common'
  },
  {
    id: 'green_eyes',
    name: 'Green Eyes',
    description: 'Striking green eyes',
    category: 'eyes',
    hexColor: '#228B22',
    rarity: 'uncommon',
    modifiers: {
      attractiveness: 1
    }
  },
  {
    id: 'hazel_eyes',
    name: 'Hazel Eyes',
    description: 'Multi-colored hazel eyes',
    category: 'eyes',
    hexColor: '#8E7618',
    rarity: 'common'
  },
  {
    id: 'gray_eyes',
    name: 'Gray Eyes',
    description: 'Mysterious gray eyes',
    category: 'eyes',
    hexColor: '#708090',
    rarity: 'uncommon'
  },
  {
    id: 'amber_eyes',
    name: 'Amber Eyes',
    description: 'Golden amber eyes',
    category: 'eyes',
    hexColor: '#FFBF00',
    rarity: 'rare',
    modifiers: {
      attractiveness: 2
    }
  },
  {
    id: 'violet_eyes',
    name: 'Violet Eyes',
    description: 'Rare violet-colored eyes',
    category: 'eyes',
    hexColor: '#8B00FF',
    rarity: 'rare',
    modifiers: {
      attractiveness: 3
    }
  },
  {
    id: 'heterochromia',
    name: 'Heterochromia',
    description: 'Two different colored eyes',
    category: 'eyes',
    hexColor: '#4169E1', // Representative color
    rarity: 'rare',
    modifiers: {
      attractiveness: 2,
      visibility: 3
    }
  },
  {
    id: 'golden_eyes',
    name: 'Golden Eyes',
    description: 'Brilliant golden eyes',
    category: 'eyes',
    hexColor: '#FFD700',
    rarity: 'legendary',
    modifiers: {
      attractiveness: 5
    }
  }
];

// Clothing Colors (for basic clothing)
export const CLOTHING_COLORS: ColorationTrait[] = [
  {
    id: 'white_clothing',
    name: 'White Clothing',
    description: 'Clean white clothing',
    category: 'clothing',
    hexColor: '#FFFFFF',
    rarity: 'common'
  },
  {
    id: 'black_clothing',
    name: 'Black Clothing',
    description: 'Dark black clothing',
    category: 'clothing',
    hexColor: '#000000',
    rarity: 'common'
  },
  {
    id: 'brown_clothing',
    name: 'Brown Clothing',
    description: 'Earth-toned brown clothing',
    category: 'clothing',
    hexColor: '#8B4513',
    rarity: 'common'
  },
  {
    id: 'gray_clothing',
    name: 'Gray Clothing',
    description: 'Neutral gray clothing',
    category: 'clothing',
    hexColor: '#808080',
    rarity: 'common'
  },
  {
    id: 'blue_clothing',
    name: 'Blue Clothing',
    description: 'Vibrant blue clothing',
    category: 'clothing',
    hexColor: '#0066CC',
    rarity: 'common'
  },
  {
    id: 'red_clothing',
    name: 'Red Clothing',
    description: 'Bold red clothing',
    category: 'clothing',
    hexColor: '#CC0000',
    rarity: 'uncommon',
    modifiers: {
      visibility: 2
    }
  },
  {
    id: 'green_clothing',
    name: 'Green Clothing',
    description: 'Natural green clothing',
    category: 'clothing',
    hexColor: '#228B22',
    rarity: 'common'
  },
  {
    id: 'purple_clothing',
    name: 'Purple Clothing',
    description: 'Royal purple clothing',
    category: 'clothing',
    hexColor: '#800080',
    rarity: 'rare',
    modifiers: {
      attractiveness: 1
    }
  },
  {
    id: 'gold_clothing',
    name: 'Gold Clothing',
    description: 'Luxurious golden clothing',
    category: 'clothing',
    hexColor: '#FFD700',
    rarity: 'legendary',
    modifiers: {
      attractiveness: 3,
      visibility: 5
    }
  }
];

// All coloration traits combined
export const ALL_COLORATION_TRAITS = [
  ...HAIR_COLORS,
  ...SKIN_TONES,
  ...EYE_COLORS,
  ...CLOTHING_COLORS
];

// Utility functions
export function getRandomHairColor(): ColorationTrait {
  return HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)];
}

export function getRandomSkinTone(): ColorationTrait {
  return SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)];
}

export function getRandomEyeColor(): ColorationTrait {
  return EYE_COLORS[Math.floor(Math.random() * EYE_COLORS.length)];
}

export function getRandomClothingColor(): ColorationTrait {
  return CLOTHING_COLORS[Math.floor(Math.random() * CLOTHING_COLORS.length)];
}

export function getColorationTraitById(id: string): ColorationTrait | undefined {
  return ALL_COLORATION_TRAITS.find(trait => trait.id === id);
}

export function getColorationTraitsByCategory(category: 'hair' | 'skin' | 'eyes' | 'clothing'): ColorationTrait[] {
  return ALL_COLORATION_TRAITS.filter(trait => trait.category === category);
}

export function getRandomColorationByRarity(rarity: 'common' | 'uncommon' | 'rare' | 'legendary'): ColorationTrait[] {
  return ALL_COLORATION_TRAITS.filter(trait => trait.rarity === rarity);
}
