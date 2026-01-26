export type ColonistBioFamily = {
  parents: string[];
  siblings: string[];
  spouse?: string;
  children: string[];
};

export type ColonistBioProfile = {
  name: string;
  background: string;
  age: number;
  birthplace?: string;
  favoriteFood?: string;
  personality: string[];
  family?: ColonistBioFamily;
  skills?: string[];
  backstory?: string;
};

export type ColonistSkill = {
  name: string;
  level: number;
  passion?: string;
  xp: number;
  needed: number;
  pct: number;
  recentGain?: number;
  workSpeed?: number;
};

export type ColonistGearItem = {
  name: string;
  quantity: number;
  quality?: string;
  durability?: number;
};

export type ColonistGearEquipment = {
  slot: string;
  name?: string;
  quality?: string;
  durability?: number;
};

export type ColonistGearState = {
  equipment: ColonistGearEquipment[];
  items: ColonistGearItem[];
  carrying: Array<{ name: string; qty: number }>;
  hasInventory: boolean;
};

export type ColonistSocialEntry = {
  name: string;
  relationship: string;
  color: string;
};

export type ColonistLogEntry = {
  stamp: string;
  label: string;
  type?: string;
};

export interface ColonistProfileState {
  visible: boolean;
  activeTab: 'bio' | 'health' | 'gear' | 'social' | 'skills' | 'log';
  healthSubTab: 'overview' | 'operations' | 'injuries';
  rect: { x: number; y: number; w: number; h: number } | null;
  contentRect: { x: number; y: number; w: number; h: number } | null;
  avatarRect: { x: number; y: number; w: number; h: number } | null;
  closeRect?: { x: number; y: number; w: number; h: number } | null;
  tabRects?: Array<{ id: string; label: string; icon: string; x: number; y: number; w: number; h: number }>;
  uiScale: number;
  dpr: number;
  isTouch: boolean;
  follow: boolean;
  colonist?: any;
  profile?: ColonistBioProfile;
  skills?: ColonistSkill[];
  gear?: ColonistGearState;
  social?: ColonistSocialEntry[];
  log?: ColonistLogEntry[];
}

const listeners = new Set<() => void>();

let state: ColonistProfileState = {
  visible: false,
  activeTab: 'bio',
  healthSubTab: 'overview',
  rect: null,
  contentRect: null,
  avatarRect: null,
  closeRect: null,
  tabRects: undefined,
  uiScale: 1,
  dpr: 1,
  isTouch: false,
  follow: false,
  colonist: undefined,
  profile: undefined,
  skills: undefined,
  gear: undefined,
  social: undefined,
  log: undefined
};

export function getColonistProfileState(): ColonistProfileState {
  return state;
}

export function subscribeColonistProfile(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setColonistProfileState(partial: Partial<ColonistProfileState>): void {
  state = { ...state, ...partial };
  listeners.forEach((listener) => listener());
}