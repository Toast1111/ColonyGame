import type { WorkGiver, WorkGiverContext, WorkCandidate } from './types';
import type { Colonist } from '../types';

/**
 * Patient Work Giver
 * 
 * Scans for patient work - when a colonist needs to receive medical treatment.
 * This creates work candidates for:
 * - PatientEmergency: Critical injuries requiring immediate bed rest
 * - PatientBedRest: Non-critical injuries that benefit from rest
 * 
 * Integrates with the medical system to ensure injured colonists prioritize
 * getting treatment over other work.
 */
export const PatientWorkGiver: WorkGiver = {
  getCandidates(ctx: WorkGiverContext): WorkCandidate[] {
    const { game, colonist, getWorkPriority, canDoWork } = ctx;
    const out: WorkCandidate[] = [];

    // Check if this colonist has health data
    if (!colonist.health) return out;

    // Check if colonist is already being treated (avoid duplicate assignment)
    if ((colonist as any).isBeingTreated) return out;

    // Determine if colonist needs medical treatment
    const needsMedical = (colonist as any).needsMedical;
    if (!needsMedical && !colonist.health.injuries.length) return out;

    // Calculate injury severity
    const hasInjuries = colonist.health.injuries.length > 0;
    const isBleeding = colonist.health.injuries.some((i: any) => i.bleeding > 0.2 && !i.bandaged);
    const hasCriticalInjury = colonist.health.injuries.some((i: any) => i.severity > 0.6);
    const lowBlood = colonist.health.bloodLevel < 0.5;
    const isDowned = colonist.state === 'downed';
    const hasQueuedSurgery = colonist.health.queuedOperations && colonist.health.queuedOperations.length > 0;

    // Emergency patient work - critical conditions
    const isEmergency = isDowned || 
                       (isBleeding && colonist.health.bloodLevel < 0.4) || 
                       hasCriticalInjury || 
                       lowBlood ||
                       hasQueuedSurgery;

    if (isEmergency && canDoWork('PatientEmergency')) {
      // Emergency patient - needs immediate bed rest
      let urgency = getWorkPriority('PatientEmergency');
      
      // Adjust priority based on severity
      if (isDowned) urgency = Math.min(1, urgency);
      else if (lowBlood) urgency = Math.min(1, urgency);
      else if (isBleeding) urgency = Math.min(2, urgency);
      
      out.push({
        workType: 'PatientEmergency',
        task: 'beingTreated',
        target: colonist, // Target is self
        distance: 0, // Already at location (self)
        priority: urgency,
        extraData: { isEmergency: true }
      });
    } 
    // Non-emergency patient work - benefits from bed rest
    else if (hasInjuries && canDoWork('PatientBedRest')) {
      // Calculate overall injury severity for priority
      const totalSeverity = colonist.health.injuries.reduce((sum: number, i: any) => sum + i.severity, 0);
      const avgSeverity = totalSeverity / colonist.health.injuries.length;
      
      // Adjust priority based on injury severity
      let priority = getWorkPriority('PatientBedRest');
      if (avgSeverity > 0.4) {
        priority = Math.max(1, priority - 1);
      }
      
      out.push({
        workType: 'PatientBedRest',
        task: 'beingTreated',
        target: colonist, // Target is self
        distance: 0, // Already at location (self)
        priority: priority,
        extraData: { isEmergency: false }
      });
    }

    return out;
  }
};
