/**
 * GameState - Central state container for all game entities and data
 * 
 * Separates state from game logic, making it easier to:
 * - Save/load game state
 * - Test game logic
 * - Understand what data the game manages
 * - Prevent accidental coupling
 */

import type { Colonist, Enemy, Building, Bullet, Message, Particle } from '../types';
import type { BUILD_TYPES } from '../buildings';

export interface Resources {
  wood: number;
  stone: number;
  food: number;
  medicine: number;
  herbal: number;
}

export interface TreeEntity {
  x: number;
  y: number;
  r: number;
  hp: number;
  type: 'tree';
}

export interface RockEntity {
  x: number;
  y: number;
  r: number;
  hp: number;
  type: 'rock';
}

/**
 * All game state in one place
 * No methods - just data
 */
export class GameState {
  // Core entities
  colonists: Colonist[] = [];
  enemies: Enemy[] = [];
  buildings: Building[] = [];
  trees: TreeEntity[] = [];
  rocks: RockEntity[] = [];
  bullets: Bullet[] = [];
  particles: Particle[] = [];
  
  // Resources
  resources: Resources = {
    wood: 0,
    stone: 0,
    food: 0,
    medicine: 5,
    herbal: 3
  };
  
  BASE_STORAGE = 200; // Base storage capacity
  storageFullWarned = false;
  
  // Time and speed
  day = 1;
  tDay = 0; // Time of day (0-1)
  dayLength = 180; // seconds per day
  fastForward = 1; // Speed multiplier (1 or 6)
  paused = false;
  prevIsNight = false;
  
  // UI messages
  messages: Message[] = [];
  
  // Selection state
  selectedBuild: keyof typeof BUILD_TYPES | null = 'house';
  selColonist: Colonist | null = null;
  
  // Building hotbar
  hotbar: Array<keyof typeof BUILD_TYPES> = [
    'house',
    'farm', 
    'turret',
    'wall',
    'stock',
    'tent',
    'warehouse',
    'well',
    'infirmary'
  ];
  
  // Respawn and timers
  respawnTimer = 0; // seconds accumulator for resource respawn
  
  // Assignment tracking (prevents multiple colonists from claiming same target)
  assignedTargets = new WeakSet<object>();
  buildReservations = new Map<Building, number>();
  insideCounts = new Map<Building, number>();
  sleepReservations = new Map<Building, Set<Colonist>>();
  
  /**
   * Check if it's night time
   */
  isNight(): boolean {
    return this.tDay > 0.5;
  }
  
  /**
   * Reset to initial state (for new game)
   */
  reset(): void {
    this.colonists = [];
    this.enemies = [];
    this.buildings = [];
    this.trees = [];
    this.rocks = [];
    this.bullets = [];
    this.particles = [];
    
    this.resources = {
      wood: 50,
      stone: 30,
      food: 20,
      medicine: 5,
      herbal: 3
    };
    
    this.storageFullWarned = false;
    this.day = 1;
    this.tDay = 0;
    this.fastForward = 1;
    this.paused = false;
    this.prevIsNight = false;
    
    this.messages = [];
    this.selectedBuild = 'house';
    this.selColonist = null;
    this.respawnTimer = 0;
    
    this.assignedTargets = new WeakSet<object>();
    this.buildReservations = new Map<Building, number>();
    this.insideCounts = new Map<Building, number>();
    this.sleepReservations = new Map<Building, Set<Colonist>>();
  }
}
