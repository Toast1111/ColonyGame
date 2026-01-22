import type { AudioManager } from '../AudioManager';

function safePlayLoop(audioManager: AudioManager, key: 'music.raid.combat' | 'music.day.ambient' | 'music.gameover.sad', volume: number): void {
  audioManager
    .play(key, { volume, loop: true, replaceExisting: true })
    .catch((err) => {
      console.warn('[MusicAudio] Failed to start music:', key, err);
    });
}

export function playRaidMusic(audioManager: AudioManager): void {
  safePlayLoop(audioManager, 'music.raid.combat', 0.6);
}

export function stopRaidMusic(audioManager: AudioManager): void {
  audioManager.stop('music.raid.combat');
}

export function playDayMusic(audioManager: AudioManager): void {
  safePlayLoop(audioManager, 'music.day.ambient', 0.4);
}

export function stopDayMusic(audioManager: AudioManager): void {
  audioManager.stop('music.day.ambient');
}

export function playGameOverMusic(audioManager: AudioManager): void {
  safePlayLoop(audioManager, 'music.gameover.sad', 0.4);
}

export function stopGameOverMusic(audioManager: AudioManager): void {
  audioManager.stop('music.gameover.sad');
}
