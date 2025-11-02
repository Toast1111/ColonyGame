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

  // Spatial audio constants based on game scale (bird's-eye view with true 3D)
  private static readonly T = 32;                           // tile size (px)
  private static readonly REF_DIST = 12 * AudioManager.T;   // reference distance ~12 tiles (384px) - doubled for wider center zone
  private static readonly ROLLOFF = 0.7;                    // distance rolloff factor (0.7 = gentler panning transition)
  private static readonly MAX_DIST = 80 * AudioManager.T;   // max distance ~80 tiles (2560px)
  private static readonly ZOOM_ALTITUDE_SCALE = 800;        // altitude scaling for zoom (higher = more dramatic altitude effect)
  private static readonly SMOOTH_TAU = 0.025;               // ~25ms smoothing for listener/sound updates

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
      // Use PannerNode for true 3D spatial audio with bird's-eye view orientation
      // X = East/West (left/right on screen)
      // Y = North/South (up/down on screen) 
      // Z = Altitude (camera height above ground)
      pannerNode = new PannerNode(this.audioContext, {
        panningModel: 'equalpower',  // Use equalpower for smoother, less aggressive panning (better for top-down view)
        distanceModel: 'inverse',  // Natural inverse distance falloff
        refDistance: AudioManager.REF_DIST,
        rolloffFactor: AudioManager.ROLLOFF,
        maxDistance: AudioManager.MAX_DIST,
        coneInnerAngle: 360,  // Omnidirectional sounds
        coneOuterAngle: 360,
        coneOuterGain: 1
      });
      
      // Set sound position in 3D space (sounds are on the ground, Z=0)
      pannerNode.positionX.value = options.position!.x;
      pannerNode.positionY.value = options.position!.y;
      pannerNode.positionZ.value = 0;  // Ground level
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
      
      // FIXED: Better error handling for missing audio files
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`[AudioManager] HTTP ${response.status} for audio file: ${file} (${url})`);
        return null;
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      cached = { buffer: audioBuffer, url };
      this.bufferCache.set(file, cached);
      return cached;
    } catch (error) {
      // FIXED: More detailed error logging without throwing
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.warn(`[AudioManager] Network error loading audio: ${file} - File may not exist or server may be unavailable`);
      } else {
        console.warn('[AudioManager] Failed to load audio buffer:', file, error);
      }
      
      // Cache the failure to avoid repeated attempts for same file
      this.bufferCache.set(file, null as any);
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

  /**
   * Calculate camera altitude based on zoom level
   * Zoom in (larger zoom) = lower altitude = closer to ground = LOUDER sounds
   * Zoom out (smaller zoom) = higher altitude = farther from ground = quieter sounds
   */
  private calculateCameraAltitude(zoom: number): number {
    // zoom typically ranges from ~0.6 (zoomed out) to ~2.2 (zoomed in)
    // We want: zoom=2.2 → low altitude (close/loud), zoom=0.6 → high altitude (far/quiet)
    // Formula: altitude = SCALE / zoom
    // Example: zoom=2.2 → altitude≈364, zoom=1.0 → altitude=800, zoom=0.6 → altitude≈1333
    const z = clamp(zoom, 0.5, 3.0);
    return AudioManager.ZOOM_ALTITUDE_SCALE / z;
  }

  private updateSpatialAudio(): void {
    if (!this.audioContext) return;
    const t = this.audioContext.currentTime;

    // Calculate camera altitude from zoom (listener is above the ground looking down)
    const altitude = this.calculateCameraAltitude(this.listenerZoom);

    // Set listener position and orientation for bird's-eye view
    // Listener is at camera position with altitude based on zoom
    // Looking down at the ground (forward = -Z), up = North (+Y)
    this.audioContext.listener.positionX.setTargetAtTime(this.listenerPosition.x, t, AudioManager.SMOOTH_TAU);
    this.audioContext.listener.positionY.setTargetAtTime(this.listenerPosition.y, t, AudioManager.SMOOTH_TAU);
    this.audioContext.listener.positionZ.setTargetAtTime(altitude, t, AudioManager.SMOOTH_TAU);
    
    // Forward direction: Looking down (-Z axis)
    this.audioContext.listener.forwardX.setTargetAtTime(0, t, AudioManager.SMOOTH_TAU);
    this.audioContext.listener.forwardY.setTargetAtTime(0, t, AudioManager.SMOOTH_TAU);
    this.audioContext.listener.forwardZ.setTargetAtTime(-1, t, AudioManager.SMOOTH_TAU);
    
    // Up direction: North is "up" on screen (+Y axis)
    this.audioContext.listener.upX.setTargetAtTime(0, t, AudioManager.SMOOTH_TAU);
    this.audioContext.listener.upY.setTargetAtTime(1, t, AudioManager.SMOOTH_TAU);
    this.audioContext.listener.upZ.setTargetAtTime(0, t, AudioManager.SMOOTH_TAU);

    // Update all active spatial sounds
    for (const sounds of this.activeSounds.values()) {
      for (const sound of sounds) {
        if (!sound.position || !sound.pannerNode) {
          continue;
        }

        // Sound positions are on the ground (Z=0)
        // PannerNode will automatically handle distance/panning based on 3D positions
        sound.pannerNode.positionX.setTargetAtTime(sound.position.x, t, AudioManager.SMOOTH_TAU);
        sound.pannerNode.positionY.setTargetAtTime(sound.position.y, t, AudioManager.SMOOTH_TAU);
        sound.pannerNode.positionZ.setTargetAtTime(0, t, AudioManager.SMOOTH_TAU);

        // Let the PannerNode handle distance attenuation automatically
        // Just ensure the base volume is set correctly
        const category = deriveCategory(sound.key);
        const finalGain = this.computeVolume(category, sound.baseVolume);
        sound.gainNode.gain.setTargetAtTime(finalGain, t, AudioManager.SMOOTH_TAU);
      }
    }
  }
}

export type { AudioKey } from '../../assets/audio/manifest';
