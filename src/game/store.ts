// Estado de interfaz compartido entre el motor 3D y React (patrón "store" mínimo).
// El motor escribe con setUi(); los componentes leen con useUi(selector).

import { useSyncExternalStore } from 'react';
import type { IntelCard, Meters, MissionId, PuzzleOption, RoleId, Tier, DiscoveryId } from '../../shared/types';

export interface DialogAction {
  label: string;
  kind?: 'primary' | 'ghost' | 'danger';
  onClick: () => void;
}

export type Dialog =
  | { kind: 'ix'; title?: string; text: string; mood?: 'idle' | 'talk' | 'alert' | 'happy'; actions?: DialogAction[] }
  | { kind: 'intel'; card: IntelCard; npcName: string; actions?: DialogAction[] }
  | { kind: 'option'; missionId: MissionId; option: PuzzleOption; question: string; discarded: boolean; ready: boolean; actions?: DialogAction[] }
  | { kind: 'result'; missionId: MissionId; tier: Tier; option: PuzzleOption; why: string; effects: Partial<Meters>; actions?: DialogAction[] }
  | { kind: 'mgIntro'; missionId: MissionId; actions?: DialogAction[] }
  | { kind: 'debrief'; missionId: MissionId; stars: number; decisionStars: number; gameStars: number; xp: number; actions?: DialogAction[] }
  | { kind: 'discovery'; id: DiscoveryId; actions?: DialogAction[] };

/** Controles que un minijuego puede pedirle a la interfaz. */
export interface MgButton {
  id: string;
  label: string;
  icon?: string;
  hold?: boolean;
  disabled?: boolean;
  primary?: boolean;
}
export interface MgSlider {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit?: string;
}
export interface MgBar {
  label: string;
  value: number; // 0..1
  target?: number; // 0..1, línea de meta
  color: string;
  text?: string;
}
export interface MgUi {
  missionId: MissionId;
  title: string;
  help: string;
  stage?: string;
  timeLeft?: number | null;
  bars?: MgBar[];
  buttons?: MgButton[];
  sliders?: MgSlider[];
  joystick?: boolean; // el minijuego usa el joystick (rover, etc.)
  pieces?: { id: string; label: string; emoji: string; placed: boolean; selected: boolean }[];
  wave?: { target: { f: number; a: number }; mine: { f: number; a: number }; match: number } | null;
  canExit?: boolean;
  markers?: { x: number; z: number; emoji: string }[];
}

export interface Toast {
  id: number;
  text: string;
  emoji?: string;
  tone?: 'good' | 'bad' | 'info';
}

export interface MissionProgressUi {
  stars: number;
  done: boolean;
}

export interface UiState {
  screen: 'title' | 'game';
  ready: boolean;
  meters: Meters;
  sol: number;
  dayPhase: number; // 0..1 (0.5 = mediodía)
  objective: { title: string; text: string; color: string; emoji: string; step?: string } | null;
  prompt: { text: string; hold?: number | null } | null;
  dialog: Dialog | null;
  toasts: Toast[];
  mg: MgUi | null;
  activeMission: MissionId | null;
  intel: { missionId: MissionId; question: string; cards: IntelCard[]; options: PuzzleOption[]; discarded: string[]; missing: RoleId[] } | null;
  progress: Partial<Record<MissionId, MissionProgressUi>>;
  discoveries: DiscoveryId[];
  xp: number;
  name: string;
  cinematic: string | null;
  storm: number; // 0..1, intensidad de polvo
  touch: boolean;
}

type Listener = () => void;

let state: UiState = {
  screen: 'title',
  ready: false,
  meters: { energy: 72, water: 64, food: 60, habitat: 70 },
  sol: 1,
  dayPhase: 0.4,
  objective: null,
  prompt: null,
  dialog: null,
  toasts: [],
  mg: null,
  activeMission: null,
  intel: null,
  progress: {},
  discoveries: [],
  xp: 0,
  name: '',
  cinematic: null,
  storm: 0,
  touch: typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0),
};

const listeners = new Set<Listener>();

export function getUi(): UiState {
  return state;
}

export function setUi(patch: Partial<UiState> | ((s: UiState) => Partial<UiState>)) {
  const p = typeof patch === 'function' ? patch(state) : patch;
  let changed = false;
  for (const k in p) {
    if ((state as unknown as Record<string, unknown>)[k] !== (p as Record<string, unknown>)[k]) {
      changed = true;
      break;
    }
  }
  if (!changed) return;
  state = { ...state, ...p };
  listeners.forEach((l) => l());
}

export function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useUi<T>(selector: (s: UiState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}

let toastId = 1;
export function toast(text: string, emoji?: string, tone: Toast['tone'] = 'info') {
  const t: Toast = { id: toastId++, text, emoji, tone };
  setUi((s) => ({ toasts: [...s.toasts, t].slice(-4) }));
  setTimeout(() => setUi((s) => ({ toasts: s.toasts.filter((x) => x.id !== t.id) })), 3800);
}
