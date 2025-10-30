/**
 * Enemy Generator
 * 
 * Generates visually diverse enemies using the same asset pool as colonists.
 * Enemies are essentially hostile raiders with randomized appearances, weapons, and gear.
 * 
 * Design philosophy (RimWorld-inspired):
 * - Enemies are humans, just hostile
 * - Use same sprites/assets as colonists
 * - Visual variety creates emergent storytelling
 * - Difficulty scales through better equipment, not just stats
 */

import { ImageAssets } from '../../assets/images';
import { itemDatabase } from '../../data/itemDatabase';
import { randomChoice, getRandomColor, CLOTHING_COLORS } from '../colonist_systems/traits';
import type { Enemy } from '../types';
import type { InventoryItem, Equipment } from '../types';

// Enemy faction/type names for variety
const RAIDER_FACTIONS = [
  'Wasteland Marauders',
  'Iron Legion',
  'Night Wolves',
  'Blood Hawks',
  'Rust Bandits',
  'Shadow Reapers',
  'Desert Raiders',
  'Crimson Clan'
];

// Enemy "roles" that determine equipment loadout
export type EnemyRole = 'melee' | 'shooter' | 'sniper' | 'bruiser' | 'scout';

export interface EnemyProfile {
  faction: string;
  role: EnemyRole;
  threat: number; // 1-10 difficulty rating
  avatar: {
    skinTone: string;
    hairColor: string;
    clothing: string;
    sprites: {
      headType: string;
      bodyType: string;
      hairStyle: string;
      apparelType: string;
    };
  };
  equipment: {
    weapon?: InventoryItem;
    armor?: InventoryItem; // Future: armor items
  };
  stats: {
    baseDamage: number;
    baseSpeed: number;
    baseHealth: number;
  };
}

// Weapon pools by threat level
const WEAPON_POOLS = {
  low: ['Club', 'Knife'],
  medium: ['Autopistol', 'Revolver'],
  high: ['AssaultRifle', 'SniperRifle'],
  elite: ['SniperRifle', 'AssaultRifle']
};

/**
 * Generate a random enemy profile with visual appearance and equipment
 */
export function generateEnemyProfile(threatLevel: number = 1, dayNumber: number = 1): EnemyProfile {
  // Seed random generation based on time for variety
  const seed = Date.now() + Math.random();
  const rng = () => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };
  
  // Determine enemy role based on RNG
  const roles: EnemyRole[] = ['melee', 'shooter', 'shooter', 'sniper', 'bruiser', 'scout'];
  const role = roles[Math.floor(rng() * roles.length)];
  
  // Pick random faction
  const faction = RAIDER_FACTIONS[Math.floor(rng() * RAIDER_FACTIONS.length)];
  
  // Generate appearance using same system as colonists
  const skinTones = ['#fdd', '#dcb', '#ba9', '#987', '#765'];
  const hairColors = ['#321', '#543', '#654', '#876', '#987', '#cba', '#fed', '#f90'];
  
  const skinTone = skinTones[Math.floor(rng() * skinTones.length)];
  const hairColor = hairColors[Math.floor(rng() * hairColors.length)];
  
  // Use colonist sprite assets (lowercase names to match asset naming)
  const heads = ['male_average_normal'];
  const bodies = ['naked_male']; // Same as colonists
  const hairs = ['bowlcut', 'bravo', 'cleopatra', 'cute', 'decent', 'elder', 'fancybun', 'flowy', 'fringe',
    'frozen', 'gaston', 'greasyswoop', 'junkie', 'keeper', 'lackland', 'locks', 'long', 'mess',
    'mohawk', 'mop', 'pigtails', 'ponytails', 'primal', 'princess', 'randy', 'recruit', 'revolt',
    'rockstar', 'rookie', 'savage', 'scat', 'scorpiontail', 'scrapper', 'senorita', 'shaved',
    'shavetopbraid', 'snazzy', 'spikes', 'sticky', 'topdog', 'troubadour', 'tuft', 'warden', 'wavy'];
  const apparels = ['shirt_basic_male', 'naked_male'];
  
  const headType = heads[Math.floor(rng() * heads.length)];
  const bodyType = bodies[0];
  const hairStyle = hairs[Math.floor(rng() * hairs.length)];
  const apparelType = apparels[Math.floor(rng() * apparels.length)];
  
  // Hostile clothing colors (darker, more aggressive)
  const hostileColors = [
    '#444', '#555', '#333', // Dark grays
    '#622', '#822', '#922', // Dark reds
    '#442', '#552', '#332', // Muddy browns
    '#224', '#335', '#446'  // Dark blues
  ];
  const clothing = hostileColors[Math.floor(rng() * hostileColors.length)];
  
  // Determine weapon based on role and threat level
  const weapon = selectWeaponForEnemy(role, threatLevel, dayNumber);
  
  // Calculate stats based on role and threat
  const stats = calculateEnemyStats(role, threatLevel, dayNumber);
  
  return {
    faction,
    role,
    threat: threatLevel,
    avatar: {
      skinTone,
      hairColor,
      clothing,
      sprites: {
        headType,
        bodyType,
        hairStyle,
        apparelType
      }
    },
    equipment: {
      weapon
    },
    stats
  };
}

/**
 * Select appropriate weapon based on enemy role and game progression
 */
function selectWeaponForEnemy(role: EnemyRole, threatLevel: number, dayNumber: number): InventoryItem | undefined {
  // Early game: mostly melee and basic guns
  // Mid game: more guns appear
  // Late game: advanced weapons
  
  let weaponPool: string[] = [];
  
  switch (role) {
    case 'melee':
      // 40% chance of truly unarmed melee enemies for proper unarmed combat testing
      if (Math.random() < 0.4) {
        weaponPool = []; // No weapon - truly unarmed, will use fists/head/teeth
      } else {
        weaponPool = dayNumber < 5 ? ['Club', 'Knife'] : ['Club', 'Knife'];
      }
      break;
    case 'shooter':
      if (dayNumber < 3) {
        weaponPool = ['Club', 'Knife', 'Autopistol']; // Some melee early
      } else if (dayNumber < 10) {
        weaponPool = ['Autopistol', 'Revolver'];
      } else {
        weaponPool = ['Autopistol', 'Revolver', 'AssaultRifle'];
      }
      break;
    case 'sniper':
      if (dayNumber < 7) {
        weaponPool = ['Revolver', 'Autopistol']; // No snipers early
      } else {
        weaponPool = ['SniperRifle', 'AssaultRifle'];
      }
      break;
    case 'bruiser':
      weaponPool = ['Club', 'Knife', 'AssaultRifle'];
      break;
    case 'scout':
      weaponPool = ['Autopistol', 'Knife'];
      break;
  }
  
  // Select random weapon from pool
  const weaponDefName = weaponPool[Math.floor(Math.random() * weaponPool.length)];
  
  // Create weapon item from database
  const weapon = itemDatabase.createItem(weaponDefName, 1, 'normal');
  
  return weapon || undefined;
}

/**
 * Calculate enemy stats based on role and progression
 */
function calculateEnemyStats(role: EnemyRole, threatLevel: number, dayNumber: number): {
  baseDamage: number;
  baseSpeed: number;
  baseHealth: number;
} {
  // Base stats
  let baseDamage = 8;
  let baseSpeed = 48;
  let baseHealth = 60;
  
  // Role modifiers
  switch (role) {
    case 'melee':
      // Reduced base damage since many melee enemies will be unarmed (using 8.2 damage fists)
      baseDamage += 0; // Base 8 damage, unarmed combat system will handle the rest
      baseSpeed += 8;
      baseHealth += 10;
      break;
    case 'shooter':
      // Balanced stats
      break;
    case 'sniper':
      baseDamage += 12;
      baseSpeed -= 8;
      baseHealth -= 10;
      break;
    case 'bruiser':
      baseDamage += 6;
      baseSpeed -= 12;
      baseHealth += 30;
      break;
    case 'scout':
      baseDamage -= 2;
      baseSpeed += 16;
      baseHealth -= 15;
      break;
  }
  
  // Day scaling (enemies get tougher over time)
  const dayScaling = 1 + (dayNumber * 0.08); // +8% per day
  baseDamage *= dayScaling;
  baseSpeed += dayNumber * 1.5; // +1.5 speed per day
  baseHealth *= dayScaling;
  
  // Threat level scaling
  baseDamage *= (1 + threatLevel * 0.15);
  baseSpeed *= (1 + threatLevel * 0.1);
  baseHealth *= (1 + threatLevel * 0.2);
  
  return {
    baseDamage: Math.round(baseDamage),
    baseSpeed: Math.round(baseSpeed),
    baseHealth: Math.round(baseHealth)
  };
}

/**
 * Create a complete Enemy object with generated profile
 */
export function createEnemyWithProfile(
  x: number, 
  y: number, 
  threatLevel: number = 1,
  dayNumber: number = 1
): Enemy & { profile?: EnemyProfile; inventory?: { equipment?: Equipment } } {
  const profile = generateEnemyProfile(threatLevel, dayNumber);
  const stats = profile.stats;
  
  // Generate unique ID for enemy
  const id = `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const enemy: Enemy & { profile?: EnemyProfile; inventory?: { equipment?: Equipment } } = {
    x,
    y,
    r: 9, // Same radius as colonist (8 for colonist, 9 for enemy - slightly larger)
    hp: stats.baseHealth,
    speed: stats.baseSpeed,
    dmg: stats.baseDamage,
    target: null,
    color: profile.avatar.clothing,
    id,
    direction: Math.PI / 2, // Default facing south (downward)
    profile,
    inventory: {
      equipment: {
        weapon: profile.equipment.weapon
      }
    }
  };
  
  return enemy;
}

/**
 * Get human-readable description of enemy
 */
export function getEnemyDescription(profile: EnemyProfile): string {
  const roleNames = {
    melee: 'Brawler',
    shooter: 'Raider',
    sniper: 'Marksman',
    bruiser: 'Heavy',
    scout: 'Scout'
  };
  
  const weaponName = profile.equipment.weapon?.defName || 'unarmed';
  return `${profile.faction} ${roleNames[profile.role]} (${weaponName})`;
}
