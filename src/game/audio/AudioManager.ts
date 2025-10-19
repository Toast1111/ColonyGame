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
  /** Optional listener zoom override for spatial falloff */
  listenerZoom?: number;
}

interface CachedBuffer {
  buffer: AudioBuffer;
  url: string;
}

interface ActiveSound {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  pannerNode?: PannerNode;
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

  // Spatial audio constants based on game scale
  private static readonly T = 32;                          // tile size (px)
  private static readonly REF_DIST = 6 * AudioManager.T;   // ~6 tiles feels "near" (192px)
  private static readonly ROLLOFF = 0.95;                  // 0.85–1.1 tweak here for taste
  private static readonly MAX_DIST_HARD = 100 * AudioManager.T; // cull beyond ~100 tiles (~3200px)
  private static readonly PAN_NEAR_PAD = 3 * AudioManager.T;     // avoids hard L/R near center (~96px)
  private static readonly PAN_MAX_AT = 12 * AudioManager.T;      // reach full pan by ~12 tiles (~384px)
  private static readonly ALT_DENOM = 20 * AudioManager.T;       // pan dampening scale for zoom Z (~640px)
  private static readonly SMOOTH_TAU = 0.03;                     // ~30ms smoothing for gain/pan

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
  private listenerPosition: Readonly<{ x: number; y: number }> = Object.freeze({ x: 0, y: 0 });
  private listenerZoom = 1;

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
    const baseGain = this.computeVolume(category, baseVolume);
    gainNode.gain.value = baseGain;

    // Determine whether to use spatial audio (never for UI sounds)
    const shouldUseSpatial = Boolean(options.position) && category !== 'ui';
    let pannerNode: PannerNode | null = null;
    if (shouldUseSpatial) {
      pannerNode = new PannerNode(this.audioContext, {
        panningModel: 'HRTF',
        distanceModel: 'exponential',
        refDistance: AudioManager.REF_DIST,
        rolloffFactor: AudioManager.ROLLOFF,
        maxDistance: AudioManager.MAX_DIST_HARD,
      });

      pannerNode.positionX.value = options.position!.x;
      pannerNode.positionY.value = options.position!.y;
      pannerNode.positionZ.value = 0;
    }

    // Connect the audio graph
    if (pannerNode) {
      source.connect(pannerNode);
      pannerNode.connect(gainNode);
    } else {
      source.connect(gainNode);
    }
    gainNode.connect(this.masterGainNode);

    // Track active sounds
    const activeSound: ActiveSound = {
      source,
      gainNode,
      pannerNode: pannerNode ?? undefined,
      baseVolume: clamp(baseVolume, 0, 1.5),
      key,
      isLooping: source.loop,
      position: shouldUseSpatial ? options.position : undefined
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
      if (pannerNode) {
        pannerNode.disconnect();
      }
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
          sound.pannerNode?.disconnect();
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
  setListenerPosition(x: number, y: number, zoom = this.listenerZoom): void {
    // Only update if transform changed to avoid redundant work
    if (
      this.listenerPosition.x === x &&
      this.listenerPosition.y === y &&
      this.listenerZoom === zoom
    ) {
      return;
    }
    this.listenerPosition = Object.freeze({ x, y });
    this.listenerZoom = zoom;
    this.updateSpatialAudio();
  }

  /** Get current listener position (returns frozen readonly object - safe to use) */
  getListenerPosition(): Readonly<{ x: number; y: number }> {
    return this.listenerPosition;
  }

  /** Get current listener zoom (used for spatial falloff calculations) */
  getListenerZoom(): number {
    return this.listenerZoom;
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

  private zoomToAltitude(zoom: number): number {
    // zoom=1 -> 0; zoom=0.6 -> ~ (1/0.6-1)=0.666... * 600 ≈ 400px
    // only adds "Z" when zoomed OUT (<=1), so zooming IN keeps spatial detail lively
    const z = clamp(zoom, 0.6, 2.2);
    const normalized = Math.max(0, (1 / z) - 1);
    const altitudeScale = 600; // feel free to try 500–700
    return normalized * altitudeScale;
  }

  private updateSpatialAudio(): void {
    if (!this.audioContext) return;
    const t = this.audioContext.currentTime;

    // Update listener position and orientation
    const altitude = this.zoomToAltitude(this.listenerZoom);
    this.audioContext.listener.positionX.setValueAtTime(this.listenerPosition.x, t);
    this.audioContext.listener.positionY.setValueAtTime(this.listenerPosition.y, t);
    this.audioContext.listener.positionZ.setValueAtTime(altitude, t);
    this.audioContext.listener.forwardX.setValueAtTime(0, t);
    this.audioContext.listener.forwardY.setValueAtTime(1, t);
    this.audioContext.listener.forwardZ.setValueAtTime(0, t);
    this.audioContext.listener.upX.setValueAtTime(0, t);
    this.audioContext.listener.upY.setValueAtTime(0, t);
    this.audioContext.listener.upZ.setValueAtTime(1, t);

    for (const sounds of this.activeSounds.values()) {
      for (const sound of sounds) {
        if (!sound.position || !sound.pannerNode) {
          continue;
        }

        // early out hard-cull (optional)
        const dx = sound.position.x - this.listenerPosition.x;
        const dy = sound.position.y - this.listenerPosition.y;
        if (Math.hypot(dx, dy) > AudioManager.MAX_DIST_HARD) {
          sound.gainNode.gain.setTargetAtTime(0, t, AudioManager.SMOOTH_TAU);
          continue;
        }

        // Update sound position
        sound.pannerNode.positionX.setValueAtTime(sound.position.x, t);
        sound.pannerNode.positionY.setValueAtTime(sound.position.y, t);
        sound.pannerNode.positionZ.setValueAtTime(0, t);

        // Ensure gain is set (for category volume and floor)
        const category = deriveCategory(sound.key);
        const base = this.computeVolume(category, sound.baseVolume);
        const floor = 0.02;
        const finalGain = base < floor ? 0 : base;
        sound.gainNode.gain.setTargetAtTime(finalGain, t, AudioManager.SMOOTH_TAU);
      }
    }
  }
}

export type { AudioKey } from '../../assets/audio/manifest';
