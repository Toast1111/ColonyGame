import type { AudioManager } from '../AudioManager';
import { getAudioVariants, type AudioVariant } from '../../../assets/audio/manifest';

type MusicKey = 'music.raid.combat' | 'music.day.ambient' | 'music.gameover.sad';

interface ShuffleState {
  order: number[];
  cursor: number;
  lastIndex: number | null;
}

interface ShuffleSession {
  token: number;
  active: boolean;
}

const shuffleStates = new Map<MusicKey, ShuffleState>();
const shuffleSessions = new Map<MusicKey, ShuffleSession>();

function safePlayLoop(audioManager: AudioManager, key: MusicKey, volume: number): void {
  audioManager
    .play(key, { volume, loop: true, replaceExisting: true })
    .catch((err) => {
      console.warn('[MusicAudio] Failed to start music:', key, err);
    });
}

function getShuffleState(key: MusicKey, variants: readonly AudioVariant[]): ShuffleState {
  let state = shuffleStates.get(key);
  if (!state) {
    state = { order: [], cursor: 0, lastIndex: null };
    shuffleStates.set(key, state);
  }
  if (state.order.length !== variants.length) {
    state.order = [];
    state.cursor = 0;
  }
  return state;
}

function getShuffleSession(key: MusicKey): ShuffleSession {
  let session = shuffleSessions.get(key);
  if (!session) {
    session = { token: 0, active: false };
    shuffleSessions.set(key, session);
  }
  return session;
}

function shuffleOrder(length: number, lastIndex: number | null): number[] {
  const order = Array.from({ length }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (order.length > 1 && lastIndex != null && order[0] === lastIndex) {
    const swapIndex = 1 + Math.floor(Math.random() * (order.length - 1));
    [order[0], order[swapIndex]] = [order[swapIndex], order[0]];
  }
  return order;
}

function nextShuffledIndex(state: ShuffleState, length: number): number {
  if (state.order.length !== length || state.cursor >= state.order.length) {
    state.order = shuffleOrder(length, state.lastIndex);
    state.cursor = 0;
  }
  const index = state.order[state.cursor] ?? 0;
  state.cursor += 1;
  state.lastIndex = index;
  return index;
}

function rngForVariantIndex(variants: readonly AudioVariant[], index: number): () => number {
  if (variants.length <= 1) {
    return () => 0;
  }
  const weights = variants.map((variant) => Math.max(0.0001, variant.weight ?? 1));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let before = 0;
  for (let i = 0; i < index; i += 1) {
    before += weights[i];
  }
  const weight = weights[index] ?? 1;
  const epsilon = Math.min(weight * 0.5, weight - 1e-6);
  const roll = (before + Math.max(1e-6, epsilon)) / total;
  return () => Math.min(0.999999, Math.max(0, roll));
}

function playShuffledLoop(audioManager: AudioManager, key: MusicKey, volume: number): void {
  const variants = getAudioVariants(key);
  if (variants.length <= 1) {
    safePlayLoop(audioManager, key, volume);
    return;
  }

  const state = getShuffleState(key, variants);
  const session = getShuffleSession(key);
  session.active = true;
  session.token += 1;
  const token = session.token;

  const playNext = () => {
    if (!session.active || session.token !== token) {
      return;
    }
    const index = nextShuffledIndex(state, variants.length);
    const rng = rngForVariantIndex(variants, index);

    audioManager
      .play(key, { volume, loop: false, replaceExisting: true, rng })
      .then((source) => {
        if (!source || !session.active || session.token !== token) {
          return;
        }
        source.addEventListener('ended', () => {
          if (!session.active || session.token !== token) {
            return;
          }
          playNext();
        });
      })
      .catch((err) => {
        console.warn('[MusicAudio] Failed to start shuffled music:', key, err);
      });
  };

  playNext();
}

function stopShuffledLoop(audioManager: AudioManager, key: MusicKey): void {
  const session = getShuffleSession(key);
  session.active = false;
  session.token += 1;
  audioManager.stop(key);
}

export function playRaidMusic(audioManager: AudioManager): void {
  safePlayLoop(audioManager, 'music.raid.combat', 0.6);
}

export function stopRaidMusic(audioManager: AudioManager): void {
  stopShuffledLoop(audioManager, 'music.raid.combat');
}

export function playDayMusic(audioManager: AudioManager): void {
  playShuffledLoop(audioManager, 'music.day.ambient', 0.4);
}

export function stopDayMusic(audioManager: AudioManager): void {
  stopShuffledLoop(audioManager, 'music.day.ambient');
}

export function playGameOverMusic(audioManager: AudioManager): void {
  safePlayLoop(audioManager, 'music.gameover.sad', 0.4);
}

export function stopGameOverMusic(audioManager: AudioManager): void {
  stopShuffledLoop(audioManager, 'music.gameover.sad');
}
