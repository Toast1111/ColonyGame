import { AUDIO_MANIFEST, type AudioKey, pickAudioVariant, resolveAudioSrc, type RandomFn } from '../../assets/audio/manifest';
import { clamp } from '../../core/utils';

export interface PlayAudioOptions {
  volume?: number;
  loop?: boolean;
  playbackRate?: number;
  startAt?: number;
  rng?: RandomFn;
  replaceExisting?: boolean;
  categoryOverride?: string;
  /** Spatial audio position {x, y} in world coordinates */
  position?: { x: number; y: number };
  /** Camera/listener position for spatial audio calculations */
  listenerPosition?: { x: number; y: number };
}

interface CachedBuffer {
  buffer: AudioBuffer;
  url: string;
}

interface ActiveSound {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  panNode: StereoPannerNode;
  baseVolume: number;
  key: AudioKey;
  isLooping: boolean;
  /** For spatial audio updates */
  position?: { x: number; y: number };
}

function deriveCategory(key: AudioKey, override?: string): string {
  if (override) return override;
  return key.split('.')[0];
}

export class AudioManager {
  private static instance: AudioManager | null = null;

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private masterVolume = 1;
  private muted = false;
  private readonly categoryVolumes = new Map<string, number>();
  private readonly bufferCache = new Map<string, CachedBuffer>();
  private readonly activeSounds = new Map<AudioKey, ActiveSound[]>();
  private listenerPosition = { x: 0, y: 0 };

  private constructor() {
    // Sensible category defaults (can be tweaked in the options menu later)
    this.categoryVolumes.set('ambient', 0.5);
    this.categoryVolumes.set('buildings', 0.8);
    this.categoryVolumes.set('cooking', 0.8);
    this.categoryVolumes.set('medical', 0.9);
    this.categoryVolumes.set('ui', 0.7);
    this.categoryVolumes.set('weapons', 1.0);
  }

  private initAudioContext(): void {
    if (this.audioContext) return;
    
    // Create AudioContext on first use (helps with autoplay restrictions)
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGainNode = this.audioContext.createGain();
    this.masterGainNode.connect(this.audioContext.destination);
    this.masterGainNode.gain.value = this.muted ? 0 : this.masterVolume;
  }

  async preload(key: AudioKey): Promise<void> {
    this.initAudioContext();
    const variants = AUDIO_MANIFEST[key];
    await Promise.all(variants.map((variant) => this.loadBuffer(variant.file)));
  }

  async play(key: AudioKey, options: PlayAudioOptions = {}): Promise<AudioBufferSourceNode | null> {
    this.initAudioContext();
    if (!this.audioContext || !this.masterGainNode) {
      console.warn('[AudioManager] AudioContext not initialized');
      return null;
    }

    const variant = pickAudioVariant(key, options.rng ?? Math.random);
    if (!variant) {
      return null;
    }

    if (options.replaceExisting) {
      this.stop(key);
    }

    const buffer = await this.loadBuffer(variant.file);
    if (!buffer) {
      return null;
    }

    // Create audio source
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer.buffer;
    source.loop = options.loop ?? variant.loop ?? false;
    if (options.playbackRate) {
      source.playbackRate.value = options.playbackRate;
    }

    // Create gain node for volume control
    const gainNode = this.audioContext.createGain();
    const category = deriveCategory(key, options.categoryOverride);
    const baseVolume = options.volume ?? variant.volume ?? 1;
    gainNode.gain.value = this.computeVolume(category, baseVolume);

    // Create panner node for spatial audio
    const panNode = this.audioContext.createStereoPanner();
    
    // Calculate spatial audio if position is provided
    if (options.position && options.listenerPosition) {
      const { pan, volume } = this.calculateSpatialAudio(
        options.position,
        options.listenerPosition
      );
      panNode.pan.value = clamp(pan, -1, 1);
      gainNode.gain.value *= volume;
    }

    // Connect the audio graph: source -> gain -> pan -> master -> destination
    source.connect(gainNode);
    gainNode.connect(panNode);
    panNode.connect(this.masterGainNode);

    // Track active sounds
    const activeSound: ActiveSound = {
      source,
      gainNode,
      panNode,
      baseVolume: clamp(baseVolume, 0, 1.5),
      key,
      isLooping: source.loop,
      position: options.position
    };

    if (!this.activeSounds.has(key)) {
      this.activeSounds.set(key, []);
    }
    this.activeSounds.get(key)!.push(activeSound);

    // Clean up when sound ends
    source.addEventListener('ended', () => {
      const sounds = this.activeSounds.get(key);
      if (sounds) {
        const index = sounds.indexOf(activeSound);
        if (index !== -1) {
          sounds.splice(index, 1);
        }
        if (sounds.length === 0) {
          this.activeSounds.delete(key);
        }
      }
      // Disconnect nodes to free resources
      gainNode.disconnect();
      panNode.disconnect();
    });

    // Start playback
    const startTime = options.startAt ?? 0;
    source.start(0, startTime);

    return source;
  }

  stop(key: AudioKey): void {
    const sounds = this.activeSounds.get(key);
    if (sounds) {
      // Stop all instances of this sound
      for (const sound of sounds) {
        try {
          sound.source.stop();
          sound.gainNode.disconnect();
          sound.panNode.disconnect();
        } catch (e) {
          // Source may already be stopped
        }
      }
      this.activeSounds.delete(key);
    }
  }

  stopAll(): void {
    for (const [key] of this.activeSounds) {
      this.stop(key);
    }
  }

  setMasterVolume(value: number): void {
    this.masterVolume = clamp(value, 0, 1);
    if (this.masterGainNode) {
      this.masterGainNode.gain.value = this.muted ? 0 : this.masterVolume;
    }
    this.refreshSoundVolumes();
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  setCategoryVolume(category: string, value: number): void {
    this.categoryVolumes.set(category, clamp(value, 0, 1));
    this.refreshSoundVolumes();
  }

  getCategoryVolume(category: string): number {
    return this.categoryVolumes.get(category) ?? 1;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGainNode) {
      this.masterGainNode.gain.value = this.muted ? 0 : this.masterVolume;
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  /** Update listener position for spatial audio calculations */
  setListenerPosition(x: number, y: number): void {
    this.listenerPosition = { x, y };
    this.updateSpatialAudio();
  }

  /** Get current listener position (returns internal reference - do not modify) */
  getListenerPosition(): { x: number; y: number } {
    return this.listenerPosition;
  }

  private async loadBuffer(file: string): Promise<CachedBuffer | null> {
    let cached = this.bufferCache.get(file);
    if (cached) {
      return cached;
    }

    if (!this.audioContext) {
      console.warn('[AudioManager] AudioContext not initialized');
      return null;
    }

    try {
      const url = resolveAudioSrc(file);
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      cached = { buffer: audioBuffer, url };
      this.bufferCache.set(file, cached);
      return cached;
    } catch (error) {
      console.warn('[AudioManager] Failed to load audio buffer:', file, error);
      return null;
    }
  }

  private computeVolume(category: string, baseVolume: number): number {
    if (this.muted) {
      return 0;
    }
    const catVolume = this.categoryVolumes.get(category) ?? 1;
    return clamp(baseVolume * catVolume, 0, 1);
  }

  private refreshSoundVolumes(): void {
    for (const [key, sounds] of this.activeSounds) {
      const category = deriveCategory(key);
      for (const sound of sounds) {
        sound.gainNode.gain.value = this.computeVolume(category, sound.baseVolume);
      }
    }
  }

  private calculateSpatialAudio(
    soundPos: { x: number; y: number },
    listenerPos: { x: number; y: number }
  ): { pan: number; volume: number } {
    const dx = soundPos.x - listenerPos.x;
    const dy = soundPos.y - listenerPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Pan based on horizontal position (-1 = left, 1 = right)
    const maxPanDistance = 800; // pixels
    const pan = clamp(dx / maxPanDistance, -1, 1);

    // Volume falloff based on distance
    const maxHearingDistance = 1500; // pixels
    const volume = Math.max(0, 1 - (distance / maxHearingDistance));

    return { pan, volume };
  }

  private updateSpatialAudio(): void {
    for (const sounds of this.activeSounds.values()) {
      for (const sound of sounds) {
        if (sound.position) {
          const { pan, volume } = this.calculateSpatialAudio(
            sound.position,
            this.listenerPosition
          );
          sound.panNode.pan.value = clamp(pan, -1, 1);
          const category = deriveCategory(sound.key);
          sound.gainNode.gain.value = this.computeVolume(category, sound.baseVolume) * volume;
        }
      }
    }
  }
}

export type { AudioKey } from '../../assets/audio/manifest';
