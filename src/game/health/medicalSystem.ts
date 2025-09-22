import type { Colonist, Injury, BodyPartType, InjuryType } from '../types';
import { damageBodyPart, createInjury, initializeColonistHealth } from './healthSystem';
import { itemDatabase } from '../../data/itemDatabase';

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
    canTreatInjuryTypes: ['cut', 'gunshot'],
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

// Medical job for the work system
export interface MedicalJob {
  id: string;
  patientId: string;
  doctorId?: string;
  treatment: MedicalTreatment;
  targetInjury: Injury;
  priority: MedicalPriority;
  assignedAt: number;
  estimatedDuration: number;
  requiredItems: string[];
  location?: { x: number; y: number }; // Where to perform treatment
}

// Medical work assignment system
export class MedicalSystem {
  private activeJobs: Map<string, MedicalJob> = new Map();
  private jobCounter = 0;

  // Find the most urgent medical work for a colonist
  findMedicalWork(doctor: Colonist, allColonists: Colonist[]): MedicalJob | null {
    const doctorSkill = this.getDoctorSkill(doctor);
    let bestJob: MedicalJob | null = null;
    let bestPriority = Infinity;

    for (const patient of allColonists) {
      if (!patient.health || patient === doctor) continue;
      
      // Skip if already being treated
      if (this.isPatientBeingTreated(patient)) continue;

      const jobs = this.findAvailableTreatments(patient, doctorSkill);
      for (const job of jobs) {
        if (job.priority < bestPriority) {
          bestJob = job;
          bestPriority = job.priority;
        }
      }
    }

    return bestJob;
  }

  // Find all available treatments for a patient
  findAvailableTreatments(patient: Colonist, doctorSkill: number): MedicalJob[] {
    if (!patient.health) return [];

    const jobs: MedicalJob[] = [];
    
    for (const injury of patient.health.injuries) {
      const treatments = this.getApplicableTreatments(injury, doctorSkill);
      
      for (const treatment of treatments) {
        const priority = this.calculateTreatmentPriority(injury, treatment);
        
        jobs.push({
          id: `medical_${this.jobCounter++}`,
          patientId: this.getColonistId(patient),
          treatment,
          targetInjury: injury,
          priority,
          assignedAt: Date.now(),
          estimatedDuration: treatment.duration,
          requiredItems: treatment.requiredMedicine || []
        });
      }
    }

    return jobs.sort((a, b) => a.priority - b.priority);
  }

  // Get applicable treatments for an injury
  private getApplicableTreatments(injury: Injury, doctorSkill: number): MedicalTreatment[] {
    return MEDICAL_TREATMENTS.filter(treatment => {
      // Check if treatment can handle this injury type
      if (!treatment.canTreatInjuryTypes.includes(injury.type)) return false;
      
      // Check if treatment can handle this body part
      if (!treatment.canTreatBodyParts.includes(injury.bodyPart)) return false;
      
      // Check if doctor has enough skill
      if (treatment.skillRequired > doctorSkill) return false;
      
      // Check if already infected and this isn't infection treatment
      if (injury.infected && treatment.id !== 'treat_infection') return false;
      
      return true;
    });
  }

  // Calculate treatment priority based on injury severity and type
  private calculateTreatmentPriority(injury: Injury, treatment: MedicalTreatment): MedicalPriority {
    let priority = treatment.priority;
    
    // Increase priority for severe injuries
    if (injury.severity > 0.8) priority -= 1;
    if (injury.severity > 0.6) priority -= 0.5;
    
    // Bleeding injuries are more urgent
    if (injury.bleeding > 0.3) priority -= 1;
    if (injury.bleeding > 0.1) priority -= 0.5;
    
    // Infected injuries are urgent
    if (injury.infected) priority -= 1;
    
    // High pain is urgent for quality of life
    if (injury.pain > 0.5) priority -= 0.5;
    
    // Head injuries are more critical
    if (injury.bodyPart === 'head') priority -= 0.5;
    
    return Math.max(1, Math.min(5, Math.round(priority))) as MedicalPriority;
  }

  // Assign a medical job to a doctor
  assignMedicalJob(doctor: Colonist, job: MedicalJob): boolean {
    // Check if doctor has required items
    if (!this.hasRequiredItems(doctor, job.requiredItems)) {
      return false;
    }

    job.doctorId = this.getColonistId(doctor);
    this.activeJobs.set(job.id, job);
    return true;
  }

  // Perform medical treatment
  performTreatment(doctor: Colonist, patient: Colonist, job: MedicalJob, deltaTime: number): boolean {
    const doctorSkill = this.getDoctorSkill(doctor);
    const treatment = job.treatment;
    
    // Calculate success rate based on doctor skill
    const skillBonus = Math.max(0, (doctorSkill - treatment.skillRequired) * 0.05);
    const successRate = Math.min(0.95, treatment.baseSuccessRate + skillBonus);
    
    const success = Math.random() < successRate;
    
    if (success) {
      this.applySuccessfulTreatment(patient, job.targetInjury, treatment);
      this.consumeItems(doctor, job.requiredItems);
      return true;
    } else {
      this.applyFailedTreatment(patient, job.targetInjury, treatment);
      this.consumeItems(doctor, job.requiredItems);
      return false;
    }
  }

  // Apply successful treatment effects
  private applySuccessfulTreatment(patient: Colonist, injury: Injury, treatment: MedicalTreatment): void {
    if (!patient.health) return;

    // Reduce pain
    injury.pain = Math.max(0, injury.pain - treatment.painReduction);
    
    // Increase healing rate
    injury.healRate *= treatment.healingBonus;
    
    // Reduce bleeding
    if (treatment.id === 'bandage_wound') {
      injury.bleeding = Math.max(0, injury.bleeding * 0.2);
    }
    
    // Remove infection
    if (treatment.id === 'treat_infection') {
      injury.infected = false;
      injury.infectionChance = 0;
    }
    
    // Mark as treated
    injury.treatedBy = treatment.id;
    
    console.log(`Successfully treated ${injury.description} with ${treatment.name}`);
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

  // Get doctor's medical skill level
  private getDoctorSkill(doctor: Colonist): number {
    // Check for "First Aid" skill in profile
    const firstAidSkill = doctor.profile?.detailedInfo.skills.includes('First Aid');
    const medicBackground = doctor.profile?.background === 'Medic';
    
    let skill = 0;
    if (firstAidSkill) skill += 3;
    if (medicBackground) skill += 5;
    
    // Add random skill variation
    skill += Math.floor(Math.random() * 3);
    
    return Math.max(0, Math.min(20, skill));
  }

  // Get colonist ID (create if needed)
  private getColonistId(colonist: Colonist): string {
    if (!(colonist as any).id) {
      (colonist as any).id = `colonist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return (colonist as any).id;
  }

  // Check if patient is already being treated
  private isPatientBeingTreated(patient: Colonist): boolean {
    const patientId = this.getColonistId(patient);
    for (const job of this.activeJobs.values()) {
      if (job.patientId === patientId) return true;
    }
    return false;
  }

  // Complete a medical job
  completeMedicalJob(jobId: string): void {
    this.activeJobs.delete(jobId);
  }

  // Get active medical jobs
  getActiveMedicalJobs(): MedicalJob[] {
    return Array.from(this.activeJobs.values());
  }

  // Force assign specific treatment (from context menu)
  forceAssignTreatment(patient: Colonist, treatmentId: string): MedicalJob | null {
    if (!patient.health) return null;

    const treatment = MEDICAL_TREATMENTS.find(t => t.id === treatmentId);
    if (!treatment) return null;

    // Find an applicable injury
    const injury = patient.health.injuries.find(inj => 
      treatment.canTreatInjuryTypes.includes(inj.type) &&
      treatment.canTreatBodyParts.includes(inj.bodyPart)
    );

    if (!injury) return null;

    const job: MedicalJob = {
      id: `forced_medical_${this.jobCounter++}`,
      patientId: this.getColonistId(patient),
      treatment,
      targetInjury: injury,
      priority: MedicalPriority.URGENT,
      assignedAt: Date.now(),
      estimatedDuration: treatment.duration,
      requiredItems: treatment.requiredMedicine || []
    };

    return job;
  }
}

// Singleton instance
export const medicalSystem = new MedicalSystem();