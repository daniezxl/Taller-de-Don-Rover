// Tipos compartidos del juego: colonia, misiones, rompecabezas de datos y partida guardada.

export type SystemId = 'energy' | 'water' | 'food' | 'habitat';
export type RoleId = 'power' | 'life' | 'bio' | 'habitat';
export type Difficulty = 'explorer' | 'cadet' | 'commander';
export type MissionId = 'greenhouse' | 'water' | 'darkness' | 'signal' | 'habitat' | 'final';
export type BuildingId = 'hydroponics' | 'recycler' | 'reactor' | 'antenna' | 'module' | 'city';
export type DiscoveryId = 'meteorite' | 'lavatube' | 'ice' | 'dustdevil' | 'layers' | 'blueberries';
export type Tier = 'best' | 'ok' | 'bad' | 'critical';
export type Meters = Record<SystemId, number>;

export interface AvatarConfig {
  suit: number;
  helmet: number;
  visor: number;
  accessory: number;
}

/* ---------- Problemática de cada misión: datos repartidos entre especialistas ---------- */

export interface IntelLine {
  label: string;
  value: string;
  emoji?: string;
  strong?: boolean;
}
export interface IntelCard {
  role: RoleId;
  title: string;
  intro: string;
  lines: IntelLine[];
  tip: string;
}
export interface PuzzleOption {
  id: string;
  emoji: string;
  label: string;
  detail: string;
}
export interface PuzzleOptionResult {
  tier: Tier;
  effects: Partial<Meters>;
  why: string;
}
export interface Puzzle {
  kind: 'elimination' | 'budget' | 'route';
  title: string;
  question: string;
  intel: Record<RoleId, IntelCard>;
  options: PuzzleOption[];
  results: Record<string, PuzzleOptionResult>;
  bestId: string;
  hints: [string, string];
  solution: string;
}
