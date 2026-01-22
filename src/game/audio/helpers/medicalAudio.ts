import type { AudioKey } from '../AudioManager';

interface MedicalAudioState {
  activeKey?: AudioKey;
  tendStarted?: boolean;
}

function getMedicalAudioState(doctor: any): MedicalAudioState {
  if (!doctor.medicalAudioState) {
    doctor.medicalAudioState = {} as MedicalAudioState;
  }
  return doctor.medicalAudioState as MedicalAudioState;
}

function stopActiveAudio(game: any, state: MedicalAudioState): void {
  if (state.activeKey && game?.audioManager) {
    game.audioManager.stop(state.activeKey);
  }
  state.activeKey = undefined;
}

export function stopMedicalAudio(game: any, doctor: any, resetTend: boolean = true): void {
  const state = getMedicalAudioState(doctor);
  stopActiveAudio(game, state);
  if (resetTend) {
    state.tendStarted = false;
  }
}

export function startTendingAudio(game: any, doctor: any, patient: { x: number; y: number }): void {
  const state = getMedicalAudioState(doctor);

  if (!state.tendStarted) {
    game?.playAudio?.('medical.tend.start', {
      categoryOverride: 'medical',
      volume: 0.8,
      position: { x: patient.x, y: patient.y },
      listenerPosition: game?.audioManager?.getListenerPosition()
    });
    state.tendStarted = true;
  }

  if (state.activeKey !== 'medical.tend.loop') {
    stopActiveAudio(game, state);
    game?.playAudio?.('medical.tend.loop', {
      categoryOverride: 'medical',
      volume: 0.6,
      loop: true,
      replaceExisting: true,
      position: { x: patient.x, y: patient.y },
      listenerPosition: game?.audioManager?.getListenerPosition()
    });
    state.activeKey = 'medical.tend.loop';
  }
}

export function startSurgeryAudio(game: any, doctor: any, position: { x: number; y: number }): void {
  const state = getMedicalAudioState(doctor);

  if (state.activeKey !== 'medical.surgery.loop') {
    stopActiveAudio(game, state);
    game?.playAudio?.('medical.surgery.loop', {
      categoryOverride: 'medical',
      volume: 0.55,
      loop: true,
      replaceExisting: true,
      position: { x: position.x, y: position.y },
      listenerPosition: game?.audioManager?.getListenerPosition()
    });
    state.activeKey = 'medical.surgery.loop';
  }
}
