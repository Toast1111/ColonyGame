/**
 * MusicManager - Manages background music playback
 * 
 * Responsibilities:
 * - Play/stop day music during peaceful daytime
 * - Play/stop raid music during combat
 * - Handle music priorities (raid > day)
 * - Stop music when game is paused or ended
 */

import { AudioManager } from '../audio/AudioManager';
import { playDayMusic, playRaidMusic, stopDayMusic, stopRaidMusic } from '../audio/helpers/musicAudio';

export class MusicManager {
  private audioManager = AudioManager.getInstance();
  private raidMusicActive = false;
  private dayMusicActive = false;
  
  /**
   * Update music based on game state
   * Should be called every frame
   */
  updateMusic(
    hasEnemies: boolean,
    hqExists: boolean,
    isDay: boolean,
    isGameActive: boolean
  ): void {
    // Priority order: Raid music > Day music > No music
    
    // RAID MUSIC: Takes priority during combat
    const shouldPlayRaidMusic = hasEnemies && hqExists && isGameActive;
    
    if (shouldPlayRaidMusic && !this.raidMusicActive) {
      // Stop day music and start raid music
      if (this.dayMusicActive) {
        stopDayMusic(this.audioManager);
        this.dayMusicActive = false;
      }
      
      playRaidMusic(this.audioManager);
      this.raidMusicActive = true;
      console.log('[MusicManager] Started raid music - enemies attacking HQ');
      
    } else if (!shouldPlayRaidMusic && this.raidMusicActive) {
      // Stop raid music
      stopRaidMusic(this.audioManager);
      this.raidMusicActive = false;
      
      if (hasEnemies) {
        console.log('[MusicManager] Stopped raid music - HQ destroyed or game paused');
      } else {
        console.log('[MusicManager] Stopped raid music - all enemies defeated');
      }
    }
    
    // DAY MUSIC: Plays during daytime when no enemies are present
    const shouldPlayDayMusic = isDay && !hasEnemies && hqExists && isGameActive && !this.raidMusicActive;
    
    if (shouldPlayDayMusic && !this.dayMusicActive) {
      // Start day music
      playDayMusic(this.audioManager);
      this.dayMusicActive = true;
      console.log('[MusicManager] Started day music - peaceful daytime');
      
    } else if (!shouldPlayDayMusic && this.dayMusicActive) {
      // Stop day music
      stopDayMusic(this.audioManager);
      this.dayMusicActive = false;
      
      if (!isDay) {
        console.log('[MusicManager] Stopped day music - night has fallen');
      } else if (hasEnemies) {
        console.log('[MusicManager] Stopped day music - enemies detected');
      } else {
        console.log('[MusicManager] Stopped day music - game paused or ended');
      }
    }
  }
  
  /**
   * Stop all music (for game over, etc.)
   */
  stopAllMusic(): void {
    if (this.raidMusicActive) {
      stopRaidMusic(this.audioManager);
      this.raidMusicActive = false;
    }
    if (this.dayMusicActive) {
      stopDayMusic(this.audioManager);
      this.dayMusicActive = false;
    }
  }
  
  /**
   * Check if raid music is currently playing
   */
  isRaidMusicActive(): boolean {
    return this.raidMusicActive;
  }
  
  /**
   * Check if day music is currently playing
   */
  isDayMusicActive(): boolean {
    return this.dayMusicActive;
  }
}
