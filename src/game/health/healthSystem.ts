import type { Colonist, BodyPart, BodyPartType, ColonistHealth, Injury, InjuryType } from '../types';

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
    immunity: 1.0
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
  const totalBleeding = health.injuries.reduce((sum, injury) => sum + injury.bleeding, 0);
  health.bloodLevel = Math.max(0, health.bloodLevel - totalBleeding * 0.001); // Slow blood loss
  
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
  
  return {
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
    infectionChance: infectionChance * severity
  };
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