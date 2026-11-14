// Identidad del astronauta en el celular del alumno (sin cuentas: se guarda en el dispositivo).

import type { AvatarConfig, BadgeId } from '../../shared/types';

export interface PlayerProfile {
  name: string;
  avatar: AvatarConfig;
  xp: number;
  badges: BadgeId[];
  missions: number;
  sessions: Record<string, { token: string; at: number; credited: string[] }>;
}

const KEY = 'ixchel.profile';

export function loadProfile(): PlayerProfile {
  const base: PlayerProfile = { name: '', avatar: { suit: 0, helmet: 0, visor: 0, accessory: 0 }, xp: 0, badges: [], missions: 0, sessions: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      base.avatar = {
        suit: Math.floor(Math.random() * 8),
        helmet: Math.floor(Math.random() * 5),
        visor: Math.floor(Math.random() * 4),
        accessory: Math.floor(Math.random() * 6),
      };
      return base;
    }
    return { ...base, ...JSON.parse(raw) };
  } catch {
    return base;
  }
}

export function saveProfile(p: PlayerProfile) {
  try {
    // Solo guardamos las sesiones de las últimas 12 horas.
    const cutoff = Date.now() - 12 * 3600_000;
    p.sessions = Object.fromEntries(Object.entries(p.sessions).filter(([, s]) => s.at > cutoff));
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* almacenamiento no disponible */
  }
}
