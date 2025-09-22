import type { Colonist, BodyPart, BodyPartType, ColonistHealth, Injury, InjuryType } from '../types';

// --------------------------------------------------------------------------------------
// HEALTH / INJURY CORE
// Unified damage + progression helpers intended to make the system "just work".
// Design goals (RimWorld-inspired):
//  - Localized body part damage with coverage based selection
//  - Bleeding causes gradual blood loss -> consciousness -> death
//  - Infection chance on open / untreated wounds with progression & immunity check
//  - Clear death causes (vital destruction, exsanguination, infection)
//  - Single public API: applyDamageToColonist(game, colonist, amount, type, source)
//  - Minimal per-frame cost (aggregate bleeding once per tick, light math)
// --------------------------------------------------------------------------------------

// Default body part configurations
export const DEFAULT_BODY_PARTS: BodyPart[] = [
  {
    type: 'head',
    label: 'Head',
    maxHp: 40,
    currentHp: 40,
    coverage: 0.08, // 8% chance to be hit
    vital: true,
    efficiency: 1.0
  },
  {
    type: 'torso',
    label: 'Torso',
    maxHp: 80,
    currentHp: 80,
    coverage: 0.40, // 40% chance to be hit
    vital: true,
    efficiency: 1.0
  },
  {
    type: 'left_arm',
    label: 'Left Arm',
    maxHp: 30,
    currentHp: 30,
    coverage: 0.12, // 12% chance to be hit
    vital: false,
    efficiency: 1.0
  },
  {
    type: 'right_arm',
    label: 'Right Arm',
    maxHp: 30,
    currentHp: 30,
    coverage: 0.12, // 12% chance to be hit
    vital: false,
    efficiency: 1.0
  },
  {
    type: 'left_leg',
    label: 'Left Leg',
    maxHp: 35,
    currentHp: 35,
    coverage: 0.14, // 14% chance to be hit
    vital: false,
    efficiency: 1.0
  },
  {
    type: 'right_leg',
    label: 'Right Leg',
    maxHp: 35,
    currentHp: 35,
    coverage: 0.14, // 14% chance to be hit
    vital: false,
    efficiency: 1.0
  }
];

// Initialize a colonist's health system
export function initializeColonistHealth(colonist: Colonist): void {
  if (colonist.health) return; // Already initialized

  colonist.health = {
    bodyParts: DEFAULT_BODY_PARTS.map(part => ({ ...part })), // Deep copy
    injuries: [],
    totalPain: 0,
    bloodLevel: 1.0,
    consciousness: 1.0,
    mobility: 1.0,
    manipulation: 1.0,
    immunity: 1.0,
    lastBleedCalcTime: 0,
    lastInfectionTick: 0
  };
}

// Calculate total health percentage from all body parts
export function calculateOverallHealth(health: ColonistHealth): number {
  if (health.bodyParts.length === 0) return 0;
  
  const totalMaxHp = health.bodyParts.reduce((sum, part) => sum + part.maxHp, 0);
  const totalCurrentHp = health.bodyParts.reduce((sum, part) => sum + part.currentHp, 0);
  
  return Math.max(0, Math.min(100, (totalCurrentHp / totalMaxHp) * 100));
}

// Update derived stats from injuries and body part damage
export function updateHealthStats(health: ColonistHealth): void {
  // Calculate total pain from all injuries
  health.totalPain = Math.min(1.0, health.injuries.reduce((sum, injury) => sum + injury.pain, 0));
  
  // Calculate blood level from bleeding injuries
  const totalBleeding = health.injuries.reduce((sum, injury) => sum + (injury.bandaged ? injury.bleeding * 0.15 : injury.bleeding), 0);
  // Blood is not reduced here anymore; moved to tickBleeding() for deterministic timing.
  
  // Calculate consciousness (affected by pain, blood loss, head injuries)
  const headPart = health.bodyParts.find(p => p.type === 'head');
  const headEfficiency = headPart ? headPart.efficiency : 1.0;
  health.consciousness = Math.max(0.1, 
    headEfficiency * 
    (1.0 - health.totalPain * 0.5) * 
    Math.sqrt(health.bloodLevel)
  );
  
  // Calculate mobility (affected by leg injuries, pain, consciousness)
  const leftLeg = health.bodyParts.find(p => p.type === 'left_leg');
  const rightLeg = health.bodyParts.find(p => p.type === 'right_leg');
  const legEfficiency = ((leftLeg?.efficiency || 0) + (rightLeg?.efficiency || 0)) / 2;
  health.mobility = Math.max(0.1, 
    legEfficiency * 
    (1.0 - health.totalPain * 0.3) * 
    health.consciousness
  );
  
  // Calculate manipulation (affected by arm injuries, pain, consciousness)
  const leftArm = health.bodyParts.find(p => p.type === 'left_arm');
  const rightArm = health.bodyParts.find(p => p.type === 'right_arm');
  const armEfficiency = ((leftArm?.efficiency || 0) + (rightArm?.efficiency || 0)) / 2;
  health.manipulation = Math.max(0.1, 
    armEfficiency * 
    (1.0 - health.totalPain * 0.2) * 
    health.consciousness
  );
  
  // Update body part efficiency based on damage
  for (const part of health.bodyParts) {
    const healthRatio = part.currentHp / part.maxHp;
    part.efficiency = Math.max(0, Math.min(1.0, healthRatio));
  }
}

// Select a random body part to hit based on coverage
export function selectRandomBodyPart(health: ColonistHealth): BodyPart {
  const totalCoverage = health.bodyParts.reduce((sum, part) => sum + part.coverage, 0);
  let random = Math.random() * totalCoverage;
  
  for (const part of health.bodyParts) {
    random -= part.coverage;
    if (random <= 0) {
      return part;
    }
  }
  
  // Fallback to torso
  return health.bodyParts.find(p => p.type === 'torso') || health.bodyParts[0];
}

// Create a new injury
export function createInjury(
  type: InjuryType, 
  bodyPart: BodyPartType, 
  severity: number, 
  gameTime: number
): Injury {
  const id = `${type}_${bodyPart}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Injury type specific properties
  let basePain = 0;
  let baseBleeding = 0;
  let baseHealRate = 1;
  let infectionChance = 0;
  let description = '';
  
  switch (type) {
    case 'cut':
      basePain = 0.2;
      baseBleeding = 0.1;
      baseHealRate = 2;
      infectionChance = 0.1;
      description = `Cut on ${bodyPart.replace('_', ' ')}`;
      break;
    case 'bruise':
      basePain = 0.1;
      baseBleeding = 0;
      baseHealRate = 3;
      infectionChance = 0;
      description = `Bruise on ${bodyPart.replace('_', ' ')}`;
      break;
    case 'burn':
      basePain = 0.4;
      baseBleeding = 0.05;
      baseHealRate = 0.5;
      infectionChance = 0.2;
      description = `Burn on ${bodyPart.replace('_', ' ')}`;
      break;
    case 'gunshot':
      basePain = 0.6;
      baseBleeding = 0.3;
      baseHealRate = 1;
      infectionChance = 0.15;
      description = `Gunshot wound on ${bodyPart.replace('_', ' ')}`;
      break;
    case 'fracture':
      basePain = 0.5;
      baseBleeding = 0;
      baseHealRate = 0.2;
      infectionChance = 0;
      description = `Fractured ${bodyPart.replace('_', ' ')}`;
      break;
    default:
      description = `${type} on ${bodyPart.replace('_', ' ')}`;
  }
  
  const injury: Injury = {
    id,
    type,
    bodyPart,
    severity: Math.max(0, Math.min(1, severity)),
    pain: basePain * severity,
    bleeding: baseBleeding * severity,
    healRate: baseHealRate,
    permanent: severity > 0.8 && (type === 'burn' || type === 'fracture'),
    timeCreated: gameTime,
    description,
    infected: false,
    infectionChance: infectionChance * severity,
    bandaged: false,
    infectionProgress: 0
  };
  return injury;
}

// Apply damage to a specific body part
export function damageBodyPart(
  health: ColonistHealth, 
  bodyPartType: BodyPartType, 
  damage: number, 
  injuryType: InjuryType = 'cut',
  gameTime: number
): boolean {
  const bodyPart = health.bodyParts.find(p => p.type === bodyPartType);
  if (!bodyPart) return false;
  
  // Apply damage
  bodyPart.currentHp = Math.max(0, bodyPart.currentHp - damage);
  
  // Create injury based on damage severity
  const severity = Math.min(1.0, damage / bodyPart.maxHp);
  if (severity > 0.1) { // Only create injury if significant damage
    const injury = createInjury(injuryType, bodyPartType, severity, gameTime);
    health.injuries.push(injury);
  }
  
  // Update derived stats
  updateHealthStats(health);
  
  // Check if this was a fatal injury
  if (bodyPart.vital && bodyPart.currentHp <= 0) {
    return true; // Fatal
  }
  
  return false;
}

// --------------------------------------------------------------------------------------
// Unified damage application API
// --------------------------------------------------------------------------------------

export interface DamageOptions {
  type?: InjuryType;
  bodyPart?: BodyPartType; // Force specific part
  source?: string;         // e.g., 'turret', 'enemy', 'friendly_fire'
  armorPenetration?: number; // Future use
  createInjury?: boolean;    // default true
  damageMultiplier?: number; // situational modifiers
}

// Applies damage, creates injury, updates death + returns whether colonist died
export function applyDamageToColonist(
  game: any,
  colonist: Colonist,
  rawDamage: number,
  injuryType: InjuryType = 'cut',
  options: DamageOptions = {}
): { died: boolean; bodyPart: BodyPartType; fatal: boolean; cause?: string } {
  if (!colonist.alive) return { died: false, bodyPart: 'torso', fatal: false } as any;
  initializeColonistHealth(colonist);
  const health = colonist.health!;

  // Select body part
  const part = options.bodyPart ? health.bodyParts.find(p => p.type === options.bodyPart)! : selectRandomBodyPart(health);
  const dmg = Math.max(0, rawDamage * (options.damageMultiplier ?? 1));
  const fatal = damageBodyPart(health, part.type, dmg, injuryType, performance.now());

  // If colonist died from vital part destruction
  if (fatal) {
    handleColonistDeath(game, colonist, `Destroyed vital ${part.label}`);
    return { died: true, bodyPart: part.type, fatal: true, cause: 'vital_part' };
  }

  // Sync legacy hp (0-100 scale)
  colonist.hp = calculateOverallHealth(health);

  // Extra death checks (exsanguination or consciousness collapse)
  if (health.bloodLevel <= 0.01) {
    handleColonistDeath(game, colonist, 'Blood loss');
    return { died: true, bodyPart: part.type, fatal: true, cause: 'blood_loss' };
  }
  if (health.consciousness <= 0.05) {
    // Not immediate death; could be unconsciousness placeholder
    // Future: implement downed state. For now, mark near-death.
  }

  return { died: false, bodyPart: part.type, fatal: false };
}

// Centralized death handler
export function handleColonistDeath(game: any, colonist: Colonist, reason: string) {
  colonist.alive = false;
  colonist.task = null;
  colonist.state = 'idle';
  if (game && typeof game.msg === 'function') {
    game.msg(`${colonist.profile?.name || 'Colonist'} died (${reason})`, 'bad');
  }
}

// --------------------------------------------------------------------------------------
// Bleeding & Infection Progression
// --------------------------------------------------------------------------------------

// Advance bleeding on a fixed timestep (called from game loop ideally once per second)
export function tickBleeding(health: ColonistHealth, elapsedSeconds: number) {
  const totalBleeding = health.injuries.reduce((sum, i) => sum + (i.bandaged ? i.bleeding * 0.15 : i.bleeding), 0);
  if (totalBleeding <= 0) return;
  // Blood loss scaling: 1.0 -> lose 100% in ~300s if bleeding=1
  const bleedRate = totalBleeding * (elapsedSeconds / 300);
  health.bloodLevel = Math.max(0, health.bloodLevel - bleedRate);
}

// Infection logic: wounds with infectionChance accumulate progress; immunity counters it
export function tickInfections(health: ColonistHealth, elapsedSeconds: number) {
  for (const inj of health.injuries) {
    if (inj.infected) {
      // Infection progresses toward 1; immunity pushes back
      const immune = health.immunity;
  inj.infectionProgress = Math.min(1, (inj.infectionProgress || 0) + (elapsedSeconds / 600) * (1 - immune * 0.8));
      // Severe infection -> systemic effects (reduce blood & add pain)
  if ((inj.infectionProgress || 0) > 0.7) {
        health.bloodLevel = Math.max(0, health.bloodLevel - 0.0005 * elapsedSeconds);
        inj.pain = Math.min(1, inj.pain + 0.05 * (elapsedSeconds / 60));
      }
    } else if (inj.infectionChance > 0 && inj.severity > 0.2 && !inj.bandaged) {
      // Chance to become infected over time
      const chance = inj.infectionChance * (elapsedSeconds / 400);
      if (Math.random() < chance) {
        inj.infected = true;
        inj.infectionProgress = 0.05;
      }
    }
  }
}

// High level periodic update (called each frame)
export function updateHealthProgression(health: ColonistHealth, dt: number) {
  health.lastBleedCalcTime = (health.lastBleedCalcTime || 0) + dt;
  health.lastInfectionTick = (health.lastInfectionTick || 0) + dt;
  if (health.lastBleedCalcTime >= 1) { // 1s cadence
    tickBleeding(health, health.lastBleedCalcTime);
    health.lastBleedCalcTime = 0;
  }
  if (health.lastInfectionTick >= 4) { // every 4s
    tickInfections(health, health.lastInfectionTick);
    health.lastInfectionTick = 0;
  }
}

// Get health status description
export function getHealthStatus(health: ColonistHealth): string {
  const overallHealth = calculateOverallHealth(health);
  
  if (overallHealth >= 95) return "Healthy";
  if (overallHealth >= 80) return "Bruised";
  if (overallHealth >= 60) return "Injured";
  if (overallHealth >= 40) return "Badly injured";
  if (overallHealth >= 20) return "Severely injured";
  return "Near death";
}

// Heal injuries over time
export function healInjuries(health: ColonistHealth, deltaTime: number): void {
  for (let i = health.injuries.length - 1; i >= 0; i--) {
    const injury = health.injuries[i];
    
    // Reduce injury severity based on heal rate
    const healAmount = injury.healRate * deltaTime / 86400; // Convert seconds to days
    injury.severity = Math.max(0, injury.severity - healAmount);
    
    // Update injury effects
    injury.pain = injury.pain * (injury.severity / (injury.severity + 0.1));
    injury.bleeding = injury.bleeding * injury.severity;
    
    // Remove healed injuries
    if (injury.severity <= 0.05) {
      health.injuries.splice(i, 1);
    }
  }
  
  // Slowly regenerate body part HP for minor damage
  for (const part of health.bodyParts) {
    if (part.currentHp < part.maxHp && part.currentHp > 0) {
      const regenRate = 0.1 * deltaTime / 86400; // Very slow natural healing
      part.currentHp = Math.min(part.maxHp, part.currentHp + regenRate);
    }
  }
  
  // Slowly restore blood level
  if (health.bloodLevel < 1.0) {
    health.bloodLevel = Math.min(1.0, health.bloodLevel + 0.01 * deltaTime / 86400);
  }
  
  updateHealthStats(health);
}

// Convenience helper for UI summaries
export function getInjurySummary(health: ColonistHealth): string {
  if (!health.injuries.length) return 'No injuries';
  const bleeding = health.injuries.filter(i => i.bleeding > 0 && !i.bandaged).length;
  const infected = health.injuries.filter(i => i.infected).length;
  const severe = health.injuries.filter(i => i.severity > 0.6).length;
  return [
    `${health.injuries.length} wound${health.injuries.length!==1?'s':''}`,
    bleeding?`${bleeding} bleeding`:null,
    severe?`${severe} severe`:null,
    infected?`${infected} infected`:null
  ].filter(Boolean).join(', ');
}

export function getMostCriticalInjury(health: ColonistHealth): Injury | undefined {
  return [...health.injuries].sort((a,b)=>{
    const as = (a.bleeding*2)+(a.severity)+(a.infected?0.5:0);
    const bs = (b.bleeding*2)+(b.severity)+(b.infected?0.5:0);
    return bs - as;
  })[0];
}

// Basic field treatment: quick, low-skill stabilization when no doctor available.
export function basicFieldTreatment(health: ColonistHealth): { bandaged: number; painReduced: number } {
  let bandaged = 0; let painReduced = 0;
  for (const inj of health.injuries) {
    if (inj.bleeding > 0 && !inj.bandaged) {
      inj.bandaged = true;
      inj.bleeding *= 0.35; // Not as effective as proper bandage
      inj.infectionChance *= 0.7;
      bandaged++;
    }
    if (inj.pain > 0.4) {
      const before = inj.pain;
      inj.pain *= 0.85; // mild reduction
      painReduced += before - inj.pain;
    }
  }
  updateHealthStats(health);
  return { bandaged, painReduced: Number(painReduced.toFixed(2)) };
}