/**
 * MedicalManager - Handles colonist medical care and treatment coordination
 * 
 * Extracted from Game.ts lines 3185-3455 as part of the manager architecture refactor.
 * This manager handles medical actions, doctor assignment, and treatment coordination.
 */

import type { Colonist, Building } from '../types';
import type { Game } from '../Game';
import { medicalWorkGiver } from '../health/medicalWorkGiver';
import { basicFieldTreatment, calculateOverallHealth, getInjurySummary } from '../health/healthSystem';

export class MedicalManager {
  constructor(private game: Game) {}

  /**
   * Handle medical context menu actions
   */
  handleMedicalAction(actionId: string, patient: Colonist, selectedDoctor?: Colonist | null): void {
    switch (actionId) {
      case 'medical_bandage':
        this.assignMedicalTreatment(patient, 'bandage_wound');
        break;
      case 'medical_treat_infection':
        this.assignMedicalTreatment(patient, 'treat_infection');
        break;
      case 'medical_surgery':
        this.assignMedicalTreatment(patient, 'remove_bullet');
        break;
      case 'medical_pain_relief':
        this.assignMedicalTreatment(patient, 'pain_management');
        break;
      case 'medical_treat_all':
        this.assignComprehensiveMedicalCare(patient);
        break;
      case 'medical_treat':
        this.treatColonist(patient);
        break;
      case 'medical_rest':
        // Use the existing forceColonistToRest method temporarily
        (this.game as any).forceColonistToRest?.(patient);
        this.game.msg(`${patient.profile?.name || 'Colonist'} ordered to bed rest`, 'info');
        break;
      case 'medical_injury_summary':
        if (patient.health) {
          const summary = getInjurySummary(patient.health);
          this.game.msg(`${patient.profile?.name || 'Colonist'}: ${summary}`, 'info');
        } else {
          this.game.msg('No health data', 'warn');
        }
        break;
      case 'medical_bandage_all_bleeding':
        if (patient.health) {
          let count = 0;
          for (const inj of patient.health.injuries) {
            if (inj.bleeding > 0 && !inj.bandaged) { 
              inj.bandaged = true; 
              inj.bleeding *= 0.2; 
              inj.infectionChance *= 0.5; 
              count++; 
            }
          }
          this.game.msg(count ? `Applied bandages to ${count} wound${count > 1 ? 's' : ''}` : 'No bleeding wounds', count ? 'good' : 'info');
        }
        break;
      case 'prioritize_treat_patient':
        if (selectedDoctor && selectedDoctor !== patient) {
          // Ensure doctor has some medical capability
          (selectedDoctor as any).assignedMedicalPatientId = (patient as any).id || ((patient as any).id = `colonist_${Date.now()}_${Math.random().toString(36).slice(2,9)}`);
          (selectedDoctor as any).medicalPriorityUntil = selectedDoctor.t + 60; // expires in ~60s game time
          this.game.msg(`${selectedDoctor.profile?.name || 'Doctor'} will prioritize treating ${patient.profile?.name || 'Patient'}`, 'info');
        }
        break;
      case 'clear_prioritize_treat':
        if (selectedDoctor && (selectedDoctor as any).assignedMedicalPatientId) {
          (selectedDoctor as any).assignedMedicalPatientId = undefined;
          (selectedDoctor as any).medicalPriorityUntil = undefined;
          this.game.msg(`${selectedDoctor.profile?.name || 'Doctor'} cleared treatment priority`, 'info');
        }
        break;
      case 'medical_rescue':
        this.rescueColonist(patient);
        break;
    }
  }

  /**
   * Check if a colonist needs a medical bed based on their condition
   */
  colonistNeedsMedicalBed(colonist: Colonist): boolean {
    if (colonist.state === 'downed') return true;
    if (colonist.hp < 60) return true;
    const injuries = colonist.health?.injuries ?? [];
    return injuries.some((inj) => inj.bleeding > 0 || inj.severity > 0.25 || inj.infected);
  }

  /**
   * Set colonist medical work priority
   */
  setColonistMedicalPriority(colonist: Colonist, highPriority: boolean): void {
    (colonist as any).medicalPriority = highPriority;
    if (highPriority) {
      // Clear current task to seek medical work
      this.game.taskManager.setTask(colonist, 'seekMedical', null);
    }
  }

  /**
   * Assign specific medical treatment to a patient
   */
  assignMedicalTreatment(patient: Colonist, treatmentId: string): void {
    // Find a suitable doctor
    const doctor = this.findBestDoctor(patient);
    if (!doctor) {
      this.game.msg(`No available doctor for treatment`, 'warn');
      return;
    }
    
    const job = medicalWorkGiver.createForcedJob(doctor, patient, treatmentId);
    if (job) {
      // Reserve the job and assign it to the doctor
      medicalWorkGiver.reserveJob(job, doctor);
      (doctor as any).medicalJob = job;
      
      // Force the doctor into doctoring state immediately
      // Clear their current task and path
      doctor.task = null;
      doctor.target = null;
      this.game.taskManager.clearPath(doctor);
      
      // The FSM will pick up the medicalJob on next update and enter doctoring state
      this.game.msg(`${doctor.profile?.name || 'Doctor'} treating ${patient.profile?.name || 'patient'} with ${job.treatment?.name || 'treatment'}`, 'info');
    } else {
      this.game.msg(`Cannot apply ${treatmentId} treatment`, 'warn');
    }
  }

  /**
   * Assign comprehensive medical care to a patient
   */
  assignComprehensiveMedicalCare(patient: Colonist): void {
    if (!patient.health?.injuries?.length) {
      this.game.msg(`${patient.profile?.name || 'Colonist'} has no injuries to treat`, 'info');
      return;
    }

    // Find most urgent injury and create a forced job for it
    const doctor = this.findBestDoctor(patient);
    if (!doctor) {
      this.game.msg('No available doctor for comprehensive care', 'warn');
      return;
    }

    // Prioritize most severe/urgent injury first
    const sortedInjuries = [...patient.health.injuries].sort((a, b) => {
      // Bleeding + severity combo
      const urgencyA = (a.bleeding || 0) * 2 + (a.severity || 0);
      const urgencyB = (b.bleeding || 0) * 2 + (b.severity || 0);
      return urgencyB - urgencyA;
    });

    const mostUrgentInjury = sortedInjuries[0];
    
    // Determine best treatment for this injury
    let treatmentId = 'bandage_wound';
    if (mostUrgentInjury.infected) {
      treatmentId = 'treat_infection';
    } else if (mostUrgentInjury.type === 'gunshot') {
      treatmentId = 'surgical_repair';
    } else if (mostUrgentInjury.bleeding > 0) {
      treatmentId = 'bandage_wound';
    } else if (mostUrgentInjury.severity > 0.6) {
      treatmentId = 'advanced_treatment';
    }

    // Create forced job for the most urgent injury
    const job = medicalWorkGiver.createForcedJob(doctor, patient, treatmentId);
    if (job) {
      medicalWorkGiver.reserveJob(job, doctor);
      (doctor as any).medicalJob = job;
      
      // Clear doctor's current task
      doctor.task = null;
      doctor.target = null;
      this.game.taskManager.clearPath(doctor);
      
      this.game.msg(`${doctor.profile?.name || 'Doctor'} providing comprehensive care to ${patient.profile?.name || 'patient'}`, 'info');
    } else {
      this.game.msg('Failed to create medical job', 'warn');
    }
  }

  /**
   * Find the best available doctor for a patient
   */
  findBestDoctor(patient: Colonist): Colonist | null {
    const availableDoctors = this.game.colonists.filter(c => {
      if (c === patient) return false; // Can't treat self
      if (!c.alive) return false;
      if (c.task && c.task !== 'idle' && c.task !== 'seekTask') return false; // Must be available
      return true;
    });

    if (availableDoctors.length === 0) return null;

    // Sort by medical skill (prioritize medics and those with First Aid)
    availableDoctors.sort((a, b) => {
      const skillA = this.getColonistMedicalSkill(a);
      const skillB = this.getColonistMedicalSkill(b);
      return skillB - skillA;
    });

    return availableDoctors[0];
  }

  /**
   * Get colonist's medical skill level
   */
  getColonistMedicalSkill(colonist: Colonist): number {
    const firstAidSkill = colonist.profile?.detailedInfo.skills.includes('First Aid');
    const medicBackground = colonist.profile?.background === 'Medic';
    
    let skill = 0;
    if (firstAidSkill) skill += 3;
    if (medicBackground) skill += 5;
    
    return skill;
  }

  /**
   * Treat a colonist with available medical facilities
   */
  treatColonist(colonist: Colonist): void {
    const infirmary = this.game.buildings.find(b => b.kind === 'infirmary' && b.done);
    
    if (infirmary) {
      this.game.taskManager.setTask(colonist, 'medical', infirmary);
      this.game.msg(`${colonist.profile?.name || 'Colonist'} going for medical treatment`, 'info');
    } else {
      if (colonist.health) {
        const result = basicFieldTreatment(colonist.health);
        colonist.hp = Math.min(100, calculateOverallHealth(colonist.health));
        this.game.msg(`${colonist.profile?.name || 'Colonist'} field-treated (${result.bandaged} bandaged, pain -${result.painReduced.toFixed(2)})`, 'good');
      } else {
        colonist.hp = Math.min(100, colonist.hp + 10);
        this.game.msg(`${colonist.profile?.name || 'Colonist'} received crude aid`, 'info');
      }
    }
  }

  /**
   * Rescue a downed colonist to the nearest bed
   */
  private rescueColonist(patient: Colonist): void {
    // Find best doctor or nearest healthy colonist to rescue
    const rescuer = this.findBestDoctor(patient) || this.game.colonists.find(c => c !== patient && c.alive && c.state !== 'downed');
    if (rescuer) {
      // Placeholder: just move colonist to nearest bed instantly for now
      const bed = (this.game as any).findBestRestBuilding?.(patient, { preferMedical: true, allowShelterFallback: true });
      if (bed) {
        patient.x = bed.x + bed.w / 2;
        patient.y = bed.y + bed.h / 2;
        const bedLabel = bed.kind === 'bed' ? (bed.isMedicalBed ? 'medical bed' : 'bed') : bed.name || 'shelter';
        this.game.msg(`${patient.profile?.name || 'Colonist'} rescued to ${bedLabel}`, bed.isMedicalBed ? 'good' : 'info');
      } else {
        this.game.msg('No bed available for rescue', 'warn');
      }
    } else {
      this.game.msg('No rescuer available', 'warn');
    }
  }
}