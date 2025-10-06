/**
 * RimWorld-style Medical Work Giver System
 * 
 * This system implements RimWorld's job scanning and priority architecture:
 * 1. Work givers scan for available work when a pawn needs a job
 * 2. Jobs are prioritized based on urgency (bleeding > infection > pain)
 * 3. Jobs can be player-forced (higher priority) or automatic
 * 4. Jobs are claimed/reserved to prevent multiple pawns from doing the same work
 */

import type { Colonist, Injury, Building } from '../types';
import { MEDICAL_TREATMENTS, type MedicalTreatment, MedicalPriority } from './medicalSystem';
import { skillLevel } from '../skills/skills';

export interface MedicalJob {
  id: string;
  type: 'doctor' | 'patient';
  patientId: string;
  patient: Colonist;
  treatment?: MedicalTreatment;
  targetInjury?: Injury;
  targetBed?: Building;
  priority: number; // Lower = higher priority (1 = emergency, 10 = routine)
  playerForced: boolean; // Player manually assigned this job
  reservedBy?: string; // Colonist ID who claimed this job
  createdAt: number;
  expiresAt?: number; // Auto-cancel if not started by this time
}

export class MedicalWorkGiver {
  private jobs: Map<string, MedicalJob> = new Map();
  private jobCounter = 0;
  private lastScanTime = 0;
  private scanInterval = 0.5; // Scan every 0.5 seconds

  /**
   * Main entry point - finds medical work for a colonist
   * Called from colonist FSM during work scanning phase
   */
  public scanForMedicalWork(doctor: Colonist, allColonists: Colonist[], currentTime: number): MedicalJob | null {
    // Throttle scanning to avoid performance issues
    if (currentTime - this.lastScanTime < this.scanInterval) {
      // Check if doctor already has a reserved job
      return this.getReservedJob(doctor);
    }
    this.lastScanTime = currentTime;

    // Clean up expired and invalid jobs
    this.cleanupJobs(allColonists, currentTime);

    // First, check for player-forced jobs
    const forcedJob = this.findPlayerForcedJob(doctor);
    if (forcedJob) {
      return forcedJob;
    }

    // Scan for emergency medical work (bleeding out, downed, etc.)
    const emergencyJob = this.scanEmergencyMedical(doctor, allColonists);
    if (emergencyJob) {
      return emergencyJob;
    }

    // Scan for normal medical work (injuries, infections, etc.)
    const normalJob = this.scanNormalMedical(doctor, allColonists);
    if (normalJob) {
      return normalJob;
    }

    return null;
  }

  /**
   * Scan for emergency medical work (life-threatening conditions)
   */
  private scanEmergencyMedical(doctor: Colonist, allColonists: Colonist[]): MedicalJob | null {
    const doctorId = this.getColonistId(doctor);
    const doctorSkill = this.getDoctorSkill(doctor);

    // Find patients who need emergency care
    const emergencyPatients = allColonists.filter(c => {
      if (!c.alive || c === doctor) return false;
      if (!c.health || !c.health.injuries.length) return false;

      // Emergency conditions
      const isDowned = c.state === 'downed';
      const isBleeding = c.health.injuries.some(inj => inj.bleeding > 0.3 && !inj.bandaged);
      const criticalInjury = c.health.injuries.some(inj => inj.severity > 0.85);
      const lowBlood = c.health.bloodLevel < 0.4;

      return isDowned || isBleeding || criticalInjury || lowBlood;
    });

    if (!emergencyPatients.length) return null;

    // Sort by urgency (most critical first)
    emergencyPatients.sort((a, b) => {
      const urgencyA = this.calculatePatientUrgency(a);
      const urgencyB = this.calculatePatientUrgency(b);
      return urgencyB - urgencyA; // Higher urgency first
    });

    // Find the best emergency job
    for (const patient of emergencyPatients) {
      const job = this.createMedicalJobForPatient(doctor, patient, doctorSkill, true);
      if (job && !job.reservedBy) {
        return job;
      }
    }

    return null;
  }

  /**
   * Scan for normal medical work (non-emergency injuries)
   */
  private scanNormalMedical(doctor: Colonist, allColonists: Colonist[]): MedicalJob | null {
    const doctorId = this.getColonistId(doctor);
    const doctorSkill = this.getDoctorSkill(doctor);

    // Find patients who need care
    const patients = allColonists.filter(c => {
      if (!c.alive || c === doctor) return false;
      if (!c.health || !c.health.injuries.length) return false;
      
      // Already being treated by someone
      const patientId = this.getColonistId(c);
      if (this.isPatientReserved(patientId)) return false;

      // Has untreated injuries
      return c.health.injuries.some(inj => !inj.bandaged || inj.infected || inj.pain > 0.3);
    });

    if (!patients.length) return null;

    // Sort by priority (most urgent first)
    patients.sort((a, b) => {
      const priorityA = this.calculatePatientPriority(a);
      const priorityB = this.calculatePatientPriority(b);
      return priorityA - priorityB; // Lower number = higher priority
    });

    // Find the best normal job
    for (const patient of patients) {
      const job = this.createMedicalJobForPatient(doctor, patient, doctorSkill, false);
      if (job && !job.reservedBy) {
        return job;
      }
    }

    return null;
  }

  /**
   * Create a medical job for a patient
   */
  private createMedicalJobForPatient(
    doctor: Colonist,
    patient: Colonist,
    doctorSkill: number,
    emergency: boolean
  ): MedicalJob | null {
    if (!patient.health) return null;

    const patientId = this.getColonistId(patient);
    
    // Check if patient already has a job
    const existingJob = Array.from(this.jobs.values()).find(j => j.patientId === patientId && !j.reservedBy);
    if (existingJob) {
      return existingJob;
    }

    // Find the best treatment for this patient
    const treatment = this.findBestTreatment(patient, doctorSkill);
    if (!treatment) return null;

    const targetInjury = this.findTargetInjury(patient, treatment);
    if (!targetInjury) return null;

    // Create the job
    const job: MedicalJob = {
      id: `medical_${this.jobCounter++}`,
      type: 'doctor',
      patientId,
      patient,
      treatment,
      targetInjury,
      priority: emergency ? 1 : this.calculateTreatmentPriority(targetInjury, treatment),
      playerForced: false,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30000, // 30 second expiry
    };

    this.jobs.set(job.id, job);
    return job;
  }

  /**
   * Find the best treatment for a patient based on their injuries
   */
  private findBestTreatment(patient: Colonist, doctorSkill: number): MedicalTreatment | null {
    if (!patient.health) return null;

    // Prioritize bleeding, infection, then pain
    const bleeding = patient.health.injuries.find(inj => inj.bleeding > 0.2 && !inj.bandaged);
    if (bleeding) {
      const treatment = MEDICAL_TREATMENTS.find(t => 
        t.id === 'bandage_wound' && 
        t.canTreatInjuryTypes.includes(bleeding.type) &&
        t.skillRequired <= doctorSkill
      );
      if (treatment) return treatment;
    }

    const infection = patient.health.injuries.find(inj => inj.infected);
    if (infection) {
      const treatment = MEDICAL_TREATMENTS.find(t => 
        t.id === 'treat_infection' && 
        t.skillRequired <= doctorSkill
      );
      if (treatment) return treatment;
    }

    // Find most severe untreated injury
    const sortedInjuries = [...patient.health.injuries].sort((a, b) => b.severity - a.severity);
    for (const injury of sortedInjuries) {
      const applicable = MEDICAL_TREATMENTS.filter(t => 
        t.canTreatInjuryTypes.includes(injury.type) &&
        t.canTreatBodyParts.includes(injury.bodyPart) &&
        t.skillRequired <= doctorSkill
      );

      if (applicable.length) {
        // Pick the most effective treatment
        const best = applicable.sort((a, b) => b.healingBonus - a.healingBonus)[0];
        return best;
      }
    }

    return null;
  }

  /**
   * Find target injury for a treatment
   */
  private findTargetInjury(patient: Colonist, treatment: MedicalTreatment): Injury | null {
    if (!patient.health) return null;

    return patient.health.injuries.find(inj =>
      treatment.canTreatInjuryTypes.includes(inj.type) &&
      treatment.canTreatBodyParts.includes(inj.bodyPart)
    ) || null;
  }

  /**
   * Calculate patient urgency for emergency triage
   */
  private calculatePatientUrgency(patient: Colonist): number {
    if (!patient.health) return 0;

    let urgency = 0;

    // Downed = critical
    if (patient.state === 'downed') urgency += 100;

    // Blood level
    urgency += (1 - patient.health.bloodLevel) * 80;

    // Bleeding
    const maxBleeding = Math.max(...patient.health.injuries.map(inj => inj.bleeding), 0);
    urgency += maxBleeding * 60;

    // Severity
    const maxSeverity = Math.max(...patient.health.injuries.map(inj => inj.severity), 0);
    urgency += maxSeverity * 40;

    // Consciousness
    urgency += (1 - patient.health.consciousness) * 50;

    return urgency;
  }

  /**
   * Calculate patient priority for normal work
   */
  private calculatePatientPriority(patient: Colonist): number {
    if (!patient.health) return 10;

    let priority = 5; // Base priority

    // Infections are urgent
    if (patient.health.injuries.some(inj => inj.infected)) priority -= 2;

    // Pain reduces quality of life
    priority += patient.health.totalPain * 3;

    // High severity injuries
    const maxSeverity = Math.max(...patient.health.injuries.map(inj => inj.severity), 0);
    priority -= maxSeverity * 2;

    return Math.max(1, Math.min(10, Math.round(priority)));
  }

  /**
   * Calculate treatment priority
   */
  private calculateTreatmentPriority(injury: Injury, treatment: MedicalTreatment): number {
    let score = treatment.priority * 2;
    
    const effBleed = injury.bandaged ? injury.bleeding * 0.15 : injury.bleeding;
    score -= injury.severity * 3;
    score -= effBleed * 5;
    
    if (injury.infected) score -= 3;
    else if (injury.infectionChance > 0.2 && !injury.bandaged) score -= 2;
    
    score -= injury.pain * 1;
    if (injury.bodyPart === 'head') score -= 1;
    
    return Math.max(1, Math.min(10, Math.round(score)));
  }

  /**
   * Get a job that's already reserved by this doctor
   */
  private getReservedJob(doctor: Colonist): MedicalJob | null {
    const doctorId = this.getColonistId(doctor);
    return Array.from(this.jobs.values()).find(j => j.reservedBy === doctorId) || null;
  }

  /**
   * Find player-forced jobs
   */
  private findPlayerForcedJob(doctor: Colonist): MedicalJob | null {
    return Array.from(this.jobs.values()).find(j => j.playerForced && !j.reservedBy) || null;
  }

  /**
   * Reserve a job for a doctor
   */
  public reserveJob(job: MedicalJob, doctor: Colonist): boolean {
    if (job.reservedBy) return false;
    
    const doctorId = this.getColonistId(doctor);
    job.reservedBy = doctorId;
    
    // Also mark patient as being treated
    (job.patient as any).isBeingTreated = true;
    (job.patient as any).doctorId = doctorId;
    
    return true;
  }

  /**
   * Release a job reservation
   */
  public releaseJob(job: MedicalJob, doctor: Colonist): void {
    const doctorId = this.getColonistId(doctor);
    if (job.reservedBy === doctorId) {
      job.reservedBy = undefined;
      (job.patient as any).isBeingTreated = false;
      (job.patient as any).doctorId = undefined;
    }
  }

  /**
   * Complete a job (remove it)
   */
  public completeJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      (job.patient as any).isBeingTreated = false;
      (job.patient as any).doctorId = undefined;
      this.jobs.delete(jobId);
    }
  }

  /**
   * Check if patient is already reserved
   */
  private isPatientReserved(patientId: string): boolean {
    return Array.from(this.jobs.values()).some(j => j.patientId === patientId && j.reservedBy);
  }

  /**
   * Clean up invalid and expired jobs
   */
  private cleanupJobs(allColonists: Colonist[], currentTime: number): void {
    const toDelete: string[] = [];

    for (const [jobId, job] of this.jobs.entries()) {
      // Job expired
      if (job.expiresAt && currentTime > job.expiresAt) {
        toDelete.push(jobId);
        continue;
      }

      // Patient no longer exists or is healthy
      const patient = allColonists.find(c => this.getColonistId(c) === job.patientId);
      if (!patient || !patient.alive || !patient.health || !patient.health.injuries.length) {
        toDelete.push(jobId);
        continue;
      }

      // Doctor no longer exists
      if (job.reservedBy) {
        const doctor = allColonists.find(c => this.getColonistId(c) === job.reservedBy);
        if (!doctor || !doctor.alive) {
          toDelete.push(jobId);
          continue;
        }
      }
    }

    for (const jobId of toDelete) {
      this.completeJob(jobId);
    }
  }

  /**
   * Create a player-forced job
   */
  public createForcedJob(
    doctor: Colonist,
    patient: Colonist,
    treatmentId?: string
  ): MedicalJob | null {
    if (!patient.health) return null;

    const doctorId = this.getColonistId(doctor);
    const patientId = this.getColonistId(patient);
    const doctorSkill = this.getDoctorSkill(doctor);

    let treatment: MedicalTreatment | null = null;
    let targetInjury: Injury | null = null;

    if (treatmentId) {
      treatment = MEDICAL_TREATMENTS.find(t => t.id === treatmentId) || null;
      if (treatment) {
        targetInjury = this.findTargetInjury(patient, treatment);
      }
    } else {
      treatment = this.findBestTreatment(patient, doctorSkill);
      if (treatment) {
        targetInjury = this.findTargetInjury(patient, treatment);
      }
    }

    if (!treatment || !targetInjury) return null;

    const job: MedicalJob = {
      id: `forced_${this.jobCounter++}`,
      type: 'doctor',
      patientId,
      patient,
      treatment,
      targetInjury,
      priority: 0, // Highest priority
      playerForced: true,
      reservedBy: doctorId,
      createdAt: Date.now(),
    };

    this.jobs.set(job.id, job);
    
    // Mark patient as being treated
    (patient as any).isBeingTreated = true;
    (patient as any).doctorId = doctorId;

    return job;
  }

  /**
   * Get doctor's medical skill
   */
  private getDoctorSkill(doctor: Colonist): number {
    return doctor.skills ? skillLevel(doctor, 'Medicine') : 0;
  }

  /**
   * Get or create colonist ID
   */
  private getColonistId(colonist: Colonist): string {
    if (!(colonist as any).id) {
      (colonist as any).id = `colonist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return (colonist as any).id;
  }

  /**
   * Get all active jobs (for debugging)
   */
  public getActiveJobs(): MedicalJob[] {
    return Array.from(this.jobs.values());
  }
}

// Singleton instance
export const medicalWorkGiver = new MedicalWorkGiver();
