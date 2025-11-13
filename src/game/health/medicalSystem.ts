import type { Colonist, Injury, BodyPartType, InjuryType } from '../types';
import { skillLevel, grantSkillXP } from '../skills/skills';
import { damageBodyPart, createInjury, initializeColonistHealth, updateHealthStats } from './healthSystem';
import { itemDatabase } from '../../data/itemDatabase';
import type { MedicalJob } from './medicalWorkGiver';

export interface MedicalTreatment {
  id: string;
  name: string;
  description: string;
  requiredMedicine?: string[]; // Item defNames required
  skillRequired: number; // 0-20 skill level
  baseSuccessRate: number; // 0-1 base chance
  duration: number; // seconds to perform
  painReduction: number; // 0-1 amount of pain reduced
  healingBonus: number; // multiplier to healing rate
  canTreatInjuryTypes: InjuryType[];
  canTreatBodyParts: BodyPartType[];
  surgeryRequired: boolean; // requires surgical facility
  riskOfInfection: number; // 0-1 chance of causing infection if failed
  priority: number; // treatment priority (higher = more urgent)
}

// Medical work priority levels
export enum MedicalPriority {
  EMERGENCY = 1, // Life-threatening, bleeding out
  URGENT = 2,    // Severe pain, major injuries
  NORMAL = 3,    // Standard injuries
  ROUTINE = 4,   // Minor wounds, maintenance
  ELECTIVE = 5   // Optional procedures, cosmetic
}

// Available medical treatments
export const MEDICAL_TREATMENTS: MedicalTreatment[] = [
  {
    id: 'bandage_wound',
    name: 'Bandage Wound',
    description: 'Apply bandages to stop bleeding and reduce infection risk.',
    requiredMedicine: ['Bandages'],
    skillRequired: 0,
    baseSuccessRate: 0.85,
    duration: 30,
    painReduction: 0.2,
    healingBonus: 1.2,
    canTreatInjuryTypes: ['cut', 'gunshot', 'burn'],
    canTreatBodyParts: ['head', 'torso', 'left_arm', 'right_arm', 'left_leg', 'right_leg'],
    surgeryRequired: false,
    riskOfInfection: 0.05,
    priority: 1
  },
  {
    id: 'treat_burn',
    name: 'Treat Burn',
    description: 'Apply medicine to burns to prevent infection and reduce scarring.',
    requiredMedicine: ['MedicineKit'],
    skillRequired: 2,
    baseSuccessRate: 0.75,
    duration: 45,
    painReduction: 0.4,
    healingBonus: 1.5,
    canTreatInjuryTypes: ['burn'],
    canTreatBodyParts: ['head', 'torso', 'left_arm', 'right_arm', 'left_leg', 'right_leg'],
    surgeryRequired: false,
    riskOfInfection: 0.1,
    priority: 2
  },
  {
    id: 'set_fracture',
    name: 'Set Fracture',
    description: 'Set and splint broken bones. Requires medical skill.',
    requiredMedicine: ['MedicineKit'],
    skillRequired: 5,
    baseSuccessRate: 0.7,
    duration: 120,
    painReduction: 0.3,
    healingBonus: 2.0,
    canTreatInjuryTypes: ['fracture'],
    canTreatBodyParts: ['left_arm', 'right_arm', 'left_leg', 'right_leg'],
    surgeryRequired: false,
    riskOfInfection: 0.05,
    priority: 2
  },
  {
    id: 'remove_bullet',
    name: 'Remove Bullet',
    description: 'Surgical removal of bullets and foreign objects.',
    requiredMedicine: ['MedicineKit'],
    skillRequired: 8,
    baseSuccessRate: 0.6,
    duration: 180,
    painReduction: 0.5,
    healingBonus: 2.5,
    canTreatInjuryTypes: ['gunshot'],
    canTreatBodyParts: ['head', 'torso', 'left_arm', 'right_arm', 'left_leg', 'right_leg'],
    surgeryRequired: true,
    riskOfInfection: 0.15,
    priority: 1
  },
  {
    id: 'treat_infection',
    name: 'Treat Infection',
    description: 'Use medicine to fight infection and prevent sepsis.',
    requiredMedicine: ['MedicineKit'],
    skillRequired: 4,
    baseSuccessRate: 0.8,
    duration: 60,
    painReduction: 0.1,
    healingBonus: 1.3,
    canTreatInjuryTypes: ['infection'],
    canTreatBodyParts: ['head', 'torso', 'left_arm', 'right_arm', 'left_leg', 'right_leg'],
    surgeryRequired: false,
    riskOfInfection: 0.0,
    priority: 1
  },
  {
    id: 'pain_management',
    name: 'Pain Management',
    description: 'Administer pain relief without treating the underlying injury.',
    requiredMedicine: ['MedicineKit'],
    skillRequired: 1,
    baseSuccessRate: 0.95,
    duration: 15,
    painReduction: 0.6,
    healingBonus: 1.0,
    canTreatInjuryTypes: ['cut', 'bruise', 'burn', 'gunshot', 'fracture'],
    canTreatBodyParts: ['head', 'torso', 'left_arm', 'right_arm', 'left_leg', 'right_leg'],
    surgeryRequired: false,
    riskOfInfection: 0.0,
    priority: 3
  }
];

/**
 * Simplified medical system focused on treatment application
 * Job management is handled by medicalWorkGiver.ts
 */
export class MedicalSystem {
  /**
   * Perform medical treatment on a patient
   * Called from the FSM when doctor is treating a patient
   */
  performTreatment(doctor: Colonist, patient: Colonist, treatment: MedicalTreatment, targetInjury: Injury): boolean {
    if (!treatment || !targetInjury) return false;
    
    const doctorSkill = this.getDoctorSkill(doctor);
    
    // Calculate success rate based on doctor skill
    const skillBonus = Math.max(0, (doctorSkill - treatment.skillRequired) * 0.05);
    const successRate = Math.min(0.95, treatment.baseSuccessRate + skillBonus);
    
    const success = Math.random() < successRate;
    
    if (success) {
      this.applySuccessfulTreatment(patient, targetInjury, treatment, doctorSkill);
      // Grant Medicine XP; more for harder treatments
      if (doctor.skills) {
        const base = 20 + treatment.skillRequired * 4;
        grantSkillXP(doctor, 'Medicine', base, (doctor as any).t || 0);
      }
      return true;
    } else {
      this.applyFailedTreatment(patient, targetInjury, treatment);
      if (doctor.skills) {
        const amt = 8 + Math.max(0, treatment.skillRequired - doctorSkill) * 2;
        grantSkillXP(doctor, 'Medicine', amt, (doctor as any).t || 0);
      }
      return false;
    }
  }

  // Apply successful treatment effects
  private applySuccessfulTreatment(patient: Colonist, injury: Injury, treatment: MedicalTreatment, doctorSkill: number): void {
    if (!patient.health) return;

    // Calculate treatment quality (0-1 scale)
    // Base quality from skill: 0.2 + (skill * 0.03) caps at ~0.8 for skill 20
    // Medicine bonus will be added here in future (herbal +0.1, medicine +0.2, advanced +0.3)
    const baseQuality = Math.min(1.0, 0.2 + (doctorSkill * 0.03));
    const medicineBonus = 0; // TODO: Add medicine quality bonus when medicine types are implemented
    injury.treatmentQuality = Math.min(1.0, baseQuality + medicineBonus);

    // Reduce pain
    injury.pain = Math.max(0, injury.pain - treatment.painReduction);
    
    // Increase healing rate
    injury.healRate *= treatment.healingBonus;
    
    // Reduce bleeding
    if (treatment.id === 'bandage_wound') {
      injury.bleeding = Math.max(0, injury.bleeding * 0.2);
      injury.bandaged = true;
      injury.infectionChance = Math.max(0, injury.infectionChance * 0.5);
    }

    if (treatment.id === 'treat_burn') {
      injury.bandaged = true;
      injury.infectionChance = Math.max(0, injury.infectionChance * 0.6);
    }

    if (treatment.id === 'set_fracture') {
      injury.bandaged = true; // splinted
    }
    
    // Remove infection
    if (treatment.id === 'treat_infection') {
      injury.infected = false;
      injury.infectionChance = 0;
    }
    
    // Mark as treated
    injury.treatedBy = treatment.id;
    
    // IMPORTANT: Update health stats immediately to reflect treatment effects
    updateHealthStats(patient.health);
    
    console.log(`Successfully treated ${injury.description} with ${treatment.name} (quality: ${(injury.treatmentQuality * 100).toFixed(0)}%)`);
  }

  // Apply failed treatment effects
  private applyFailedTreatment(patient: Colonist, injury: Injury, treatment: MedicalTreatment): void {
    if (!patient.health) return;

    // Risk of infection on failed treatment
    if (Math.random() < treatment.riskOfInfection && !injury.infected) {
      injury.infected = true;
      injury.infectionChance = 0.1;
      console.log(`Treatment failed and caused infection: ${injury.description}`);
    }
    
    // Increase pain slightly from botched treatment
    injury.pain = Math.min(1.0, injury.pain + 0.1);
    // Open wound gets slightly higher future infection chance
    if (!injury.infected && injury.infectionChance > 0) {
      injury.infectionChance = Math.min(1, injury.infectionChance + 0.05);
    }
    
    // Update health stats to reflect increased pain
    updateHealthStats(patient.health);
    
    console.log(`Failed to treat ${injury.description} with ${treatment.name}`);
  }

  // Check if doctor has required medical items
  private hasRequiredItems(doctor: Colonist, requiredItems: string[]): boolean {
    if (!doctor.inventory || requiredItems.length === 0) return true;

    for (const itemDefName of requiredItems) {
      const hasItem = doctor.inventory.items.some(item => 
        item.defName === itemDefName && item.quantity > 0
      );
      if (!hasItem) return false;
    }
    return true;
  }

  // Consume medical items after treatment
  private consumeItems(doctor: Colonist, items: string[]): void {
    if (!doctor.inventory) return;

    for (const itemDefName of items) {
      const item = doctor.inventory.items.find(item => 
        item.defName === itemDefName && item.quantity > 0
      );
      if (item) {
        item.quantity -= 1;
        if (item.quantity <= 0) {
          const index = doctor.inventory.items.indexOf(item);
          doctor.inventory.items.splice(index, 1);
        }
      }
    }
  }

  /**
   * Get doctor's medical skill level
   */
  private getDoctorSkill(doctor: Colonist): number {
    return doctor.skills ? skillLevel(doctor, 'Medicine') : 0;
  }
}

// Singleton instance
export const medicalSystem = new MedicalSystem();