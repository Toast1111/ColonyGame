/**
 * Surgery System - RimWorld-inspired surgical operations
 * 
 * Features:
 * - Surgery execution with success chance calculation
 * - Three failure types: minor, catastrophic, ridiculous
 * - Hospital bed bonuses to surgery success
 * - Room cleanliness factors
 * - Doctor skill impact
 * - Operation complexity penalties
 */

import type { Colonist, Operation, SurgeryFailureType, OperationType, Injury, BodyPartType } from '../types';
import { initializeColonistHealth, createInjury, updateHealthStats } from './healthSystem';

/**
 * Helper to create custom surgery injury with specific properties
 */
function createSurgeryInjury(
  type: 'cut',
  bodyPart: BodyPartType,
  severity: number,
  customProps: {
    description?: string;
    bleeding?: number;
    bandaged?: boolean;
    treatmentQuality?: number;
    infected?: boolean;
  }
): Injury {
  const baseInjury = createInjury(type, bodyPart, severity, Date.now());
  
  // Override with custom properties
  if (customProps.description) baseInjury.description = customProps.description;
  if (customProps.bleeding !== undefined) baseInjury.bleeding = customProps.bleeding;
  if (customProps.bandaged !== undefined) baseInjury.bandaged = customProps.bandaged;
  if (customProps.treatmentQuality !== undefined) baseInjury.treatmentQuality = customProps.treatmentQuality;
  if (customProps.infected !== undefined) baseInjury.infected = customProps.infected;
  
  return baseInjury;
}

/**
 * Helper to update health stats correctly
 */
function updatePatientHealth(patient: Colonist): void {
  if (patient.health) {
    updateHealthStats(patient.health);
  }
}


/**
 * Surgery execution - performs a queued operation
 * Returns surgery outcome (success, minor failure, catastrophic, ridiculous)
 */
export function executeSurgery(
  game: any,
  patient: Colonist,
  doctor: Colonist,
  operation: Operation
): { success: boolean; failureType: SurgeryFailureType; message: string } {
  
  // Check if patient has medicine/anesthetic if required
  if (operation.requiresMedicine) {
    const hasMedicine = game.resources.medicine && game.resources.medicine > 0;
    if (!hasMedicine) {
      return {
        success: false,
        failureType: 'minor',
        message: 'Surgery cancelled: No medicine available for anesthetic'
      };
    }
    
    // Consume medicine for anesthetic
    game.resources.medicine = Math.max(0, game.resources.medicine - 1);
  }
  
  // Calculate success chance
  const successChance = calculateSurgerySuccessChance(game, doctor, patient, operation);
  
  // Determine outcome
  const roll = Math.random();
  let failureType: SurgeryFailureType = 'success';
  
  if (roll > successChance) {
    // Surgery failed - determine severity
    const failSeverity = Math.random();
    
    if (failSeverity < 0.05) {
      failureType = 'ridiculous'; // 5% of failures are ridiculous
    } else if (failSeverity < 0.25) {
      failureType = 'catastrophic'; // 20% of failures are catastrophic
    } else {
      failureType = 'minor'; // 75% of failures are minor
    }
  }
  
  // Execute the operation
  const result = performSurgeryOperation(game, patient, doctor, operation, failureType);
  
  return result;
}

/**
 * Calculate surgery success chance based on multiple factors
 */
export function calculateSurgerySuccessChance(
  game: any,
  doctor: Colonist,
  patient: Colonist,
  operation: Operation
): number {
  let baseChance = 0.70; // 70% base success rate
  
  // Doctor's medicine skill (most important factor)
  const medicineSkill = doctor.skills?.byName?.Medicine?.level || 0;
  baseChance += medicineSkill * 0.025; // +2.5% per skill level (max +50% at level 20)
  
  // Hospital bed bonus
  const hospitalBedBonus = getHospitalBedBonus(game, patient);
  baseChance += hospitalBedBonus;
  
  // Room cleanliness bonus
  const cleanlinessBonus = getCleanlinessBonus(game, patient);
  baseChance += cleanlinessBonus;
  
  // Patient consciousness affects surgery (harder to operate on unconscious patients)
  if (patient.health?.consciousness && patient.health.consciousness < 0.5) {
    baseChance -= 0.10; // -10% if patient is barely conscious
  }
  
  // Operation complexity (some operations are harder)
  const complexityPenalty = getOperationComplexity(operation.type);
  baseChance -= complexityPenalty;
  
  // Self-tend penalty (doctor operating on themselves)
  if (doctor === patient && (doctor as any).selfTend) {
    baseChance *= 0.65; // 35% reduction for self-surgery
  }
  
  // Clamp between 10% and 98%
  return Math.max(0.10, Math.min(0.98, baseChance));
}

/**
 * Get hospital bed quality bonus (RimWorld-accurate)
 */
export function getHospitalBedBonus(game: any, patient: Colonist): number {
  // Check if patient is in a bed
  const bed = game.state?.buildings?.find((b: any) => 
    b.kind === 'bed' && 
    b.done &&
    patient.inside === b
  );
  
  if (!bed) return 0;
  
  // Check if it's designated as medical bed (Hospital Bed)
  if (bed.isMedicalBed) {
    return 0.15; // +15% for hospital bed (RimWorld: Hospital Bed gives significant bonus)
  }
  
  // Regular bed gives small bonus
  return 0.05; // +5% for any bed
}

/**
 * Get room cleanliness bonus
 * RimWorld: Sterile tiles and cleanliness prevent infection and improve surgery
 */
export function getCleanlinessBonus(game: any, patient: Colonist): number {
  // Check if patient is in infirmary
  const infirmary = game.state?.buildings?.find((b: any) => 
    b.kind === 'infirmary' && 
    b.done &&
    patient.inside === b
  );
  
  if (infirmary) {
    // TODO: Check for sterile tiles when tile system is implemented
    return 0.10; // +10% for infirmary (assumed clean)
  }
  
  // Being indoors gives slight bonus
  if (patient.inside) {
    return 0.03; // +3% for being indoors
  }
  
  return 0;
}

/**
 * Get operation complexity penalty
 */
export function getOperationComplexity(type: OperationType): number {
  switch (type) {
    case 'amputate':
      return 0.05; // Simple operation
    case 'install_prosthetic':
      return 0.10; // Moderate complexity
    case 'install_implant':
      return 0.15; // More complex
    case 'transplant_organ':
      return 0.25; // Very complex
    case 'harvest_organ':
      return 0.20; // Complex and lethal
    case 'remove_scar':
      return 0.08; // Relatively simple
    case 'treat_infection':
      return 0.12; // Moderate
    default:
      return 0.10;
  }
}

/**
 * Perform the actual surgery operation and apply effects
 */
function performSurgeryOperation(
  game: any,
  patient: Colonist,
  doctor: Colonist,
  operation: Operation,
  failureType: SurgeryFailureType
): { success: boolean; failureType: SurgeryFailureType; message: string } {
  
  if (!patient.health) {
    initializeColonistHealth(patient);
  }
  
  // Success case
  if (failureType === 'success') {
    switch (operation.type) {
      case 'amputate':
        return performAmputation(patient, operation, true);
      
      case 'install_prosthetic':
        return performProstheticInstallation(patient, operation, true);
      
      case 'install_implant':
        return performImplantInstallation(patient, operation, true);
      
      case 'transplant_organ':
        return performOrganTransplant(patient, operation, true);
      
      case 'harvest_organ':
        return performOrganHarvest(game, patient, operation, true);
      
      case 'remove_scar':
        return performScarRemoval(patient, operation, true);
      
      case 'treat_infection':
        return performInfectionTreatment(patient, operation, true);
      
      default:
        return { success: true, failureType: 'success', message: 'Operation completed successfully' };
    }
  }
  
  // Failure cases
  return handleSurgeryFailure(patient, operation, failureType);
}

/**
 * Perform amputation (RimWorld: remove infected/damaged limb)
 */
function performAmputation(
  patient: Colonist,
  operation: Operation,
  success: boolean
): { success: boolean; failureType: SurgeryFailureType; message: string } {
  
  if (!success) {
    return { success: false, failureType: 'minor', message: 'Amputation failed' };
  }
  
  const targetPart = operation.targetBodyPart;
  if (!targetPart) {
    return { success: false, failureType: 'minor', message: 'No target body part specified' };
  }
  
  const health = patient.health!;
  const bodyPart = health.bodyParts?.find(bp => bp.type === targetPart);
  
  if (!bodyPart) {
    return { success: false, failureType: 'minor', message: 'Body part not found' };
  }
  
  // Mark part as missing
  bodyPart.missing = true;
  bodyPart.efficiency = 0;
  bodyPart.currentHp = 0;
  
  // Remove all injuries from that body part
  health.injuries = health.injuries.filter(inj => inj.bodyPart !== targetPart);
  
  // Add bleeding from surgery (will heal with base rate of 8HP/day)
  const surgeryInjury = createSurgeryInjury('cut', targetPart, 0.3, {
    description: 'Surgical amputation (healing)',
    bleeding: 0.15,
    bandaged: true,
    treatmentQuality: 0.9
  });
  health.injuries.push(surgeryInjury);
  
  updatePatientHealth(patient);
  
  return {
    success: true,
    failureType: 'success',
    message: `Successfully amputated ${bodyPart.label}`
  };
}

/**
 * Install prosthetic (RimWorld: peg legs have -50%, bionics have +12.5%)
 */
function performProstheticInstallation(
  patient: Colonist,
  operation: Operation,
  success: boolean
): { success: boolean; failureType: SurgeryFailureType; message: string } {
  
  if (!success) {
    return { success: false, failureType: 'minor', message: 'Prosthetic installation failed' };
  }
  
  const targetPart = operation.targetBodyPart;
  const prostheticType = operation.prostheticType;
  
  if (!targetPart || !prostheticType) {
    return { success: false, failureType: 'minor', message: 'Missing prosthetic details' };
  }
  
  const health = patient.health!;
  const bodyPart = health.bodyParts?.find(bp => bp.type === targetPart);
  
  if (!bodyPart) {
    return { success: false, failureType: 'minor', message: 'Body part not found' };
  }
  
  // Install prosthetic
  bodyPart.replaced = true;
  bodyPart.missing = false;
  
  // Set efficiency based on prosthetic type (RimWorld-accurate)
  const prostheticEfficiency = getProstheticEfficiency(prostheticType);
  bodyPart.efficiency = prostheticEfficiency;
  bodyPart.currentHp = bodyPart.maxHp * prostheticEfficiency;
  
  // Add to prosthetics list
  if (!health.prosthetics) health.prosthetics = [];
  health.prosthetics.push({
    type: prostheticType,
    quality: 1.0,
    label: getProstheticLabel(prostheticType),
    bodyPart: targetPart,
    efficiencyModifier: prostheticEfficiency - 1.0
  });
  
  updatePatientHealth(patient);
  
  return {
    success: true,
    failureType: 'success',
    message: `Successfully installed ${getProstheticLabel(prostheticType)}`
  };
}

/**
 * Install implant (RimWorld: bionic parts give +12.5% or +25% bonus)
 */
function performImplantInstallation(
  patient: Colonist,
  operation: Operation,
  success: boolean
): { success: boolean; failureType: SurgeryFailureType; message: string } {
  
  if (!success) {
    return { success: false, failureType: 'minor', message: 'Implant installation failed' };
  }
  
  const targetPart = operation.targetBodyPart;
  const implantType = operation.implantType;
  
  if (!targetPart || !implantType) {
    return { success: false, failureType: 'minor', message: 'Missing implant details' };
  }
  
  const health = patient.health!;
  
  // Add implant (RimWorld: multiple implants can stack)
  if (!health.implants) health.implants = [];
  
  const efficiencyBonus = getImplantEfficiencyBonus(implantType);
  
  health.implants.push({
    type: implantType,
    quality: 1.0,
    label: getImplantLabel(implantType),
    bodyPart: targetPart,
    efficiencyBonus
  });
  
  // Apply efficiency bonus to body part
  const bodyPart = health.bodyParts?.find(bp => bp.type === targetPart);
  if (bodyPart) {
    bodyPart.efficiency = Math.min(1.5, bodyPart.efficiency + efficiencyBonus);
  }
  
  updatePatientHealth(patient);
  
  return {
    success: true,
    failureType: 'success',
    message: `Successfully installed ${getImplantLabel(implantType)}`
  };
}

/**
 * Organ transplant (RimWorld: cure diseases, restore organ function)
 */
function performOrganTransplant(
  patient: Colonist,
  operation: Operation,
  success: boolean
): { success: boolean; failureType: SurgeryFailureType; message: string } {
  
  if (!success) {
    return { success: false, failureType: 'catastrophic', message: 'Organ transplant failed - patient critical' };
  }
  
  const targetPart = operation.targetBodyPart;
  if (!targetPart) {
    return { success: false, failureType: 'minor', message: 'No target organ specified' };
  }
  
  const health = patient.health!;
  
  // Restore organ health (RimWorld: cures artery blockages with heart, asthma with lungs)
  switch (targetPart) {
    case 'heart':
      health.heartHealth = 1.0;
      break;
    case 'lungs':
      health.lungHealth = 1.0;
      break;
    case 'kidneys':
      health.kidneyHealth = 1.0;
      break;
    case 'liver':
      health.liverHealth = 1.0;
      break;
    case 'stomach':
      health.stomachHealth = 1.0;
      break;
  }
  
  // Remove related injuries
  health.injuries = health.injuries.filter(inj => inj.bodyPart !== targetPart);
  
  updatePatientHealth(patient);
  
  return {
    success: true,
    failureType: 'success',
    message: `Successfully transplanted ${targetPart}`
  };
}

/**
 * Harvest organ (RimWorld: kills patient, -30 mood to all colonists for 6 days)
 */
function performOrganHarvest(
  game: any,
  patient: Colonist,
  operation: Operation,
  success: boolean
): { success: boolean; failureType: SurgeryFailureType; message: string } {
  
  if (!success) {
    // Failed harvest - patient dies anyway
    patient.alive = false;
    patient.hp = 0;
    return {
      success: false,
      failureType: 'catastrophic',
      message: 'Organ harvest failed - patient died, organ destroyed'
    };
  }
  
  // Kill patient
  patient.alive = false;
  patient.hp = 0;
  
  // Apply mood debuff to all colonists (RimWorld: -30 mood for 6 days)
  if (game.state?.colonists) {
    for (const colonist of game.state.colonists) {
      if (colonist.alive && colonist !== patient) {
        // TODO: Implement mood system with timed debuffs
        console.log(`${colonist.name || 'Colonist'} is horrified by organ harvesting (-30 mood for 6 days)`);
      }
    }
  }
  
  // TODO: Add harvested organ to storage
  
  return {
    success: true,
    failureType: 'success',
    message: `Organ harvested successfully (patient died, -30 mood to colony)`
  };
}

/**
 * Remove scar
 */
function performScarRemoval(
  patient: Colonist,
  operation: Operation,
  success: boolean
): { success: boolean; failureType: SurgeryFailureType; message: string } {
  
  if (!success) {
    return { success: false, failureType: 'minor', message: 'Scar removal failed' };
  }
  
  const targetPart = operation.targetBodyPart;
  const health = patient.health!;
  
  // Find and remove scar
  const scarIndex = health.injuries.findIndex(inj => 
    inj.type === 'scar' && inj.bodyPart === targetPart
  );
  
  if (scarIndex >= 0) {
    health.injuries.splice(scarIndex, 1);
    updatePatientHealth(patient);
    
    return {
      success: true,
      failureType: 'success',
      message: 'Scar removed successfully'
    };
  }
  
  return { success: false, failureType: 'minor', message: 'No scar found' };
}

/**
 * Treat infection
 */
function performInfectionTreatment(
  patient: Colonist,
  operation: Operation,
  success: boolean
): { success: boolean; failureType: SurgeryFailureType; message: string } {
  
  if (!success) {
    return { success: false, failureType: 'minor', message: 'Infection treatment failed' };
  }
  
  const health = patient.health!;
  
  // Cure all infections
  let curedCount = 0;
  for (const injury of health.injuries) {
    if (injury.infected) {
      injury.infected = false;
      injury.infectionProgress = 0;
      curedCount++;
    }
  }
  
  // Boost immunity
  health.immunity = Math.min(1.0, health.immunity + 0.2);
  
  updatePatientHealth(patient);
  
  return {
    success: true,
    failureType: 'success',
    message: `Treated ${curedCount} infection(s) successfully`
  };
}

/**
 * Handle surgery failure based on type (RimWorld Alpha 16 system)
 * - Minor: hits parts near surgery site
 * - Catastrophic: hits parts near surgery site (more severe)
 * - Ridiculous: hits ALL body parts
 */
function handleSurgeryFailure(
  patient: Colonist,
  operation: Operation,
  failureType: SurgeryFailureType
): { success: boolean; failureType: SurgeryFailureType; message: string } {
  
  const health = patient.health!;
  
  switch (failureType) {
    case 'minor':
      // Minor failure - small additional injury near surgery site
      if (operation.targetBodyPart) {
        const minorInjury = createSurgeryInjury('cut', operation.targetBodyPart, 0.15, {
          description: 'Minor surgical error',
          bleeding: 0.05,
          treatmentQuality: 0.5
        });
        health.injuries.push(minorInjury);
      }
      updatePatientHealth(patient);
      return {
        success: false,
        failureType: 'minor',
        message: 'Surgery failed - minor complications'
      };
    
    case 'catastrophic':
      // Catastrophic failure - major damage to nearby parts
      if (operation.targetBodyPart) {
        const catastrophicInjury = createSurgeryInjury('cut', operation.targetBodyPart, 0.6, {
          description: 'Catastrophic surgical error',
          bleeding: 0.3,
          infected: Math.random() < 0.5,
          treatmentQuality: 0.3
        });
        health.injuries.push(catastrophicInjury);
        
        // Damage nearby body parts
        const nearbyParts = getNearbyBodyParts(operation.targetBodyPart);
        for (const part of nearbyParts) {
          if (Math.random() < 0.4) {
            const additionalInjury = createSurgeryInjury('cut', part as BodyPartType, 0.25, {
              description: 'Collateral surgical damage',
              bleeding: 0.1
            });
            health.injuries.push(additionalInjury);
          }
        }
      }
      updatePatientHealth(patient);
      return {
        success: false,
        failureType: 'catastrophic',
        message: 'Surgery failed catastrophically - severe complications'
      };
    
    case 'ridiculous':
      // Ridiculous failure - damage to ALL body parts (RimWorld's worst outcome)
      for (const bodyPart of health.bodyParts || []) {
        const ridiculousInjury = createSurgeryInjury('cut', bodyPart.type, 0.3, {
          description: 'Absurd surgical catastrophe',
          bleeding: 0.15,
          infected: Math.random() < 0.3
        });
        health.injuries.push(ridiculousInjury);
      }
      
      // Severe consciousness penalty
      health.consciousness = Math.max(0.1, health.consciousness - 0.4);
      
      updatePatientHealth(patient);
      return {
        success: false,
        failureType: 'ridiculous',
        message: 'RIDICULOUS SURGICAL FAILURE - catastrophic damage to entire body!'
      };
    
    default:
      return { success: false, failureType: 'minor', message: 'Surgery failed' };
  }
}

/**
 * Get nearby body parts for catastrophic failure
 */
function getNearbyBodyParts(part: string): string[] {
  const nearby: Record<string, string[]> = {
    'head': ['neck', 'torso'],
    'neck': ['head', 'torso'],
    'torso': ['left_arm', 'right_arm', 'left_leg', 'right_leg'],
    'left_arm': ['torso'],
    'right_arm': ['torso'],
    'left_leg': ['torso'],
    'right_leg': ['torso'],
    'heart': ['lungs', 'torso'],
    'lungs': ['heart', 'torso'],
    'liver': ['stomach', 'kidneys'],
    'kidneys': ['liver', 'stomach'],
    'stomach': ['liver', 'kidneys']
  };
  
  return (nearby[part] || []) as string[];
}

/**
 * Get prosthetic efficiency (RimWorld-accurate values)
 */
function getProstheticEfficiency(type: string): number {
  switch (type) {
    case 'peg_leg': return 0.50; // -50% efficiency (RimWorld accurate)
    case 'prosthetic_arm': return 0.75; // -25% efficiency
    case 'prosthetic_leg': return 0.75; // -25% efficiency
    case 'bionic_arm': return 1.125; // +12.5% efficiency (RimWorld accurate)
    case 'bionic_leg': return 1.125; // +12.5% efficiency (RimWorld accurate)
    case 'bionic_eye': return 1.25; // +25% efficiency
    case 'bionic_ear': return 1.25; // +25% efficiency
    default: return 1.0;
  }
}

/**
 * Get prosthetic label
 */
function getProstheticLabel(type: string): string {
  const labels: Record<string, string> = {
    'peg_leg': 'Peg Leg',
    'prosthetic_arm': 'Prosthetic Arm',
    'prosthetic_leg': 'Prosthetic Leg',
    'bionic_arm': 'Bionic Arm',
    'bionic_leg': 'Bionic Leg',
    'bionic_eye': 'Bionic Eye',
    'bionic_ear': 'Bionic Ear'
  };
  return labels[type] || type;
}

/**
 * Get implant efficiency bonus (RimWorld-accurate values)
 */
function getImplantEfficiencyBonus(type: string): number {
  switch (type) {
    case 'bionic_eye': return 0.25; // +25%
    case 'bionic_arm': return 0.125; // +12.5%
    case 'bionic_leg': return 0.125; // +12.5%
    case 'bionic_heart': return 0.15; // +15%
    case 'bionic_lung': return 0.15; // +15%
    case 'immunizer': return 0; // No efficiency bonus, affects immunity
    case 'filtering_kidneys': return 0; // Affects blood filtration
    case 'healer': return 0; // Affects healing rate
    default: return 0;
  }
}

/**
 * Get implant label
 */
function getImplantLabel(type: string): string {
  const labels: Record<string, string> = {
    'bionic_eye': 'Bionic Eye Implant',
    'bionic_arm': 'Bionic Arm Enhancement',
    'bionic_leg': 'Bionic Leg Enhancement',
    'bionic_heart': 'Bionic Heart',
    'bionic_lung': 'Bionic Lung',
    'bionic_stomach': 'Bionic Stomach',
    'immunizer': 'Immunoenhancer',
    'filtering_kidneys': 'Artificial Kidneys',
    'healer': 'Healing Enhancer'
  };
  return labels[type] || type;
}
