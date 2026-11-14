// Ajustes del profesor (se guardan solo en este navegador).

export interface Signaling {
  host: string;
  port: number;
  path: string;
  secure: boolean;
}

export interface HostSettings {
  apiKey: string;
  model: string;
  joinBase: string;
  signaling: Signaling | null;
  sound: boolean;
}

const KEY = 'ixchel.settings';

export const DEFAULT_SETTINGS: HostSettings = {
  apiKey: '',
  model: 'claude-opus-5-5',
  joinBase: '',
  signaling: null,
  sound: true,
};

export function loadSettings(): HostSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: HostSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* almacenamiento no disponible */
  }
}

/** URL base que se codifica en el QR (la app publicada; por defecto, esta misma página). */
export function joinBaseUrl(s: HostSettings = loadSettings()): string {
  if (s.joinBase.trim()) return s.joinBase.trim().replace(/#.*$/, '').replace(/\/?$/, '/');
  const { origin, pathname } = window.location;
  return origin + pathname.replace(/[^/]*$/, '');
}

export function joinUrl(code: string, s?: HostSettings) {
  return `${joinBaseUrl(s)}#/jugar?c=${code}`;
}
