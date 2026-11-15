// Partida guardada en el dispositivo (sin cuentas ni servidores).

import { START_METERS } from '../../shared/content';
import type { AvatarConfig, Difficulty, DiscoveryId, Meters, MissionId, RoleId } from '../../shared/types';

export interface MissionRecord {
  stars: number;
  decisionStars: number;
  gameStars: number;
  at: number;
}

export interface MissionState {
  briefed: boolean;
  intel: RoleId[];
  discarded: string[];
  wrong: number;
  decided: string | null;
}

export interface SaveData {
  v: 2;
  name: string;
  avatar: AvatarConfig;
  difficulty: Difficulty;
  seed: number;
  meters: Meters;
  missions: Partial<Record<MissionId, MissionRecord>>;
  discoveries: DiscoveryId[];
  xp: number;
  sol: number;
  pos: [number, number] | null;
  progress: Partial<Record<MissionId, MissionState>>;
  introDone: boolean;
}

export interface Settings {
  quality: 'high' | 'low';
  invertY: boolean;
  sensitivity: number;
}

const KEY = 'ixchel3d.save';
const SETTINGS_KEY = 'ixchel3d.settings';

export function newSave(name: string, avatar: AvatarConfig, difficulty: Difficulty): SaveData {
  return {
    v: 2,
    name,
    avatar,
    difficulty,
    seed: Math.floor(Math.random() * 1e9),
    meters: { ...START_METERS },
    missions: {},
    discoveries: [],
    xp: 0,
    sol: 1,
    pos: null,
    progress: {},
    introDone: false,
  };
}

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    if (data.v !== 2) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* almacenamiento no disponible: la partida sigue en memoria */
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nada */
  }
}

export function loadSettings(): Settings {
  const base: Settings = { quality: isLowEnd() ? 'low' : 'high', invertY: false, sensitivity: 1 };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...base, ...JSON.parse(raw) } : base;
  } catch {
    return base;
  }
}

export function writeSettings(s: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* nada */
  }
}

function isLowEnd() {
  if (typeof navigator === 'undefined') return false;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
  return (mem !== undefined && mem <= 3) || /android/i.test(navigator.userAgent);
}

export function randomAvatar(): AvatarConfig {
  return {
    suit: Math.floor(Math.random() * 8),
    helmet: Math.floor(Math.random() * 5),
    visor: Math.floor(Math.random() * 4),
    accessory: Math.floor(Math.random() * 6),
  };
}
