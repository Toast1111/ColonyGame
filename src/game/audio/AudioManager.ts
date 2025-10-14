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
}

interface CachedClip {
  element: HTMLAudioElement;
  url: string;
}

interface ActiveLoop {
  element: HTMLAudioElement;
  baseVolume: number;
  key: AudioKey;
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

  private masterVolume = 1;
  private muted = false;
  private readonly categoryVolumes = new Map<string, number>();
  private readonly clipCache = new Map<string, CachedClip>();
  private readonly activeLoops = new Map<AudioKey, ActiveLoop>();

  private constructor() {
    // Sensible category defaults (can be tweaked in the options menu later)
    this.categoryVolumes.set('ambient', 0.5);
    this.categoryVolumes.set('buildings', 0.8);
    this.categoryVolumes.set('cooking', 0.8);
    this.categoryVolumes.set('medical', 0.9);
    this.categoryVolumes.set('ui', 0.7);
    this.categoryVolumes.set('weapons', 1.0);
  }

  async preload(key: AudioKey): Promise<void> {
    const variants = AUDIO_MANIFEST[key];
    await Promise.all(variants.map((variant) => this.prepareClip(variant.file)));
  }

  async play(key: AudioKey, options: PlayAudioOptions = {}): Promise<HTMLAudioElement | null> {
    const variant = pickAudioVariant(key, options.rng ?? Math.random);
    if (!variant) {
      return null;
    }

    if (options.replaceExisting) {
      this.stop(key);
    }

    const clip = await this.prepareClip(variant.file);
    const element = clip.element.cloneNode(true) as HTMLAudioElement;
    element.src = clip.url;
    element.preload = 'auto';
    element.loop = options.loop ?? variant.loop ?? false;
    if (options.playbackRate) {
      element.playbackRate = options.playbackRate;
    }
    if (options.startAt !== undefined) {
      element.currentTime = options.startAt;
    }

    const category = deriveCategory(key, options.categoryOverride);
    const baseVolume = options.volume ?? variant.volume ?? 1;
    element.volume = this.computeVolume(category, baseVolume);

    // Track looped sounds so we can stop or retune their volume later.
    if (element.loop) {
      const finalBaseVolume = clamp(baseVolume, 0, 1.5);
      this.activeLoops.set(key, { element, baseVolume: finalBaseVolume, key });
      element.addEventListener('ended', () => {
        // In some browsers looped audio fires ended when explicitly stopped.
        this.activeLoops.delete(key);
      });
    }

    if (this.muted) {
      element.volume = 0;
    }

    element.play().catch((err) => {
      console.warn('[AudioManager] Failed to play HTMLAudioElement:', key, err);
    });

    return element;
  }

  stop(key: AudioKey): void {
    const handle = this.activeLoops.get(key);
    if (handle) {
      handle.element.pause();
      handle.element.currentTime = 0;
      this.activeLoops.delete(key);
    }
  }

  stopAll(): void {
    for (const [key, handle] of this.activeLoops) {
      handle.element.pause();
      handle.element.currentTime = 0;
      this.activeLoops.delete(key);
    }
  }

  setMasterVolume(value: number): void {
    this.masterVolume = clamp(value, 0, 1);
    this.refreshLoopVolumes();
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  setCategoryVolume(category: string, value: number): void {
    this.categoryVolumes.set(category, clamp(value, 0, 1));
    this.refreshLoopVolumes();
  }

  getCategoryVolume(category: string): number {
    return this.categoryVolumes.get(category) ?? 1;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.refreshLoopVolumes();
  }

  isMuted(): boolean {
    return this.muted;
  }

  private async prepareClip(file: string): Promise<CachedClip> {
    let cached = this.clipCache.get(file);
    if (cached) {
      return cached;
    }
    const url = resolveAudioSrc(file);
    const element = new Audio(url);
    element.preload = 'auto';
    try {
      await element.play();
      element.pause();
      element.currentTime = 0;
    } catch {
      // Ignore autoplay restrictions during preload; playback will retry later.
    }
    cached = { element, url };
    this.clipCache.set(file, cached);
    return cached;
  }

  private computeVolume(category: string, baseVolume: number): number {
    if (this.muted) {
      return 0;
    }
    const catVolume = this.categoryVolumes.get(category) ?? 1;
    return clamp(baseVolume * catVolume * this.masterVolume, 0, 1);
  }

  private refreshLoopVolumes(): void {
    for (const [key, handle] of this.activeLoops) {
      const category = deriveCategory(key);
      handle.element.volume = this.computeVolume(category, handle.baseVolume);
    }
  }
}

export type { AudioKey } from '../../assets/audio/manifest';
