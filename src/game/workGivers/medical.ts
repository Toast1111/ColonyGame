import type { WorkCandidate, WorkGiver, WorkGiverContext } from './types';
import { medicalWorkGiver, type MedicalJob } from '../health/medicalWorkGiver';

/**
 * Medical Work Giver
 *
 * Bridges the existing medical job system into the unified WorkGiver pipeline so
 * colonists receive doctor/feeding/surgery tasks through standard work scanning.
 */
export const MedicalWorkGiver: WorkGiver = {
  getCandidates(ctx: WorkGiverContext): WorkCandidate[] {
    const { game, colonist, getWorkPriority, canDoWork } = ctx;
    const out: WorkCandidate[] = [];

    // Respect work priority settings
    if (!canDoWork('Doctor')) return out;
    if (!colonist.alive) return out;

    // Use the medical work giver to find an available job for this colonist
    const now = (colonist as any).t ?? game.t;
    if (now === undefined) return out;
    const job: MedicalJob | null = medicalWorkGiver.scanForMedicalWork(
      colonist,
      game.colonists,
      now,
      game.buildings
    );

    if (!job) return out;
    const colonistId = (colonist as any).id;
    if (job.reservedBy && job.reservedBy !== colonistId) return out;

    const target =
      job.targetBed ??
      job.patient ??
      null;

    const tx = target && typeof (target as any).x === 'number' ? (target as any).x + ((target as any).w || 0) / 2 : colonist.x;
    const ty = target && typeof (target as any).y === 'number' ? (target as any).y + ((target as any).h || 0) / 2 : colonist.y;
    const distance = Math.hypot(colonist.x - tx, colonist.y - ty);

    const task =
      job.type === 'surgery'
        ? 'performingSurgery'
        : job.type === 'feedPatient'
          ? 'feedingPatient'
          : 'doctoring';

    // Combine job urgency with colonist work preference (lower numbers win)
    const priority = Math.min(job.priority ?? 5, getWorkPriority('Doctor'));

    out.push({
      workType: 'Doctor',
      task,
      target: target ?? colonist,
      distance,
      priority,
      extraData: { medicalJob: job }
    });

    return out;
  }
};
