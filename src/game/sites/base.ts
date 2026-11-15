// Base de cada sitio de misión: un grupo 3D colocado en el mundo que muestra la
// problemática (estado "roto"), su versión reparada y el minijuego que la resuelve.

import * as THREE from 'three';
import type { Difficulty, MissionId, Puzzle, SystemId } from '../../../shared/types';
import type { Game } from '../engine';
import type { MgUi } from '../store';
import { groundHeight, type Collider, type SiteLayout } from '../world';

export interface MgContext {
  game: Game;
  site: Site;
  puzzle: Puzzle;
  choice: string;
  difficulty: Difficulty;
  seed: number;
  /** Termina el minijuego con 1 a 3 estrellas. */
  finish: (stars: number) => void;
  setUi: (ui: Partial<MgUi>) => void;
}

export interface Minigame {
  /** Si es verdadero, el jugador camina libremente (la cámara normal lo sigue). */
  controlsPlayer?: boolean;
  start(): void;
  update(dt: number, t: number): void;
  tap?(ray: THREE.Raycaster): void;
  hover?(ray: THREE.Raycaster): void;
  button?(id: string, down: boolean): void;
  slider?(id: string, value: number): void;
  piece?(id: string): void;
  /** Cámara fija del minijuego (en coordenadas del mundo) o null para la cámara normal. */
  camera(): { pos: THREE.Vector3; target: THREE.Vector3 } | null;
  /** Limpia objetos temporales. `completed` indica si se ganó. */
  exit(completed: boolean): void;
}

export interface IncidentSpot {
  pos: THREE.Vector3;
  system: SystemId;
  text: string;
  emoji: string;
}

export abstract class Site {
  readonly id: MissionId;
  readonly layout: SiteLayout;
  readonly game: Game;
  readonly group = new THREE.Group();
  readonly colliders: Collider[] = [];
  fixed = false;
  y0: number;

  constructor(game: Game, layout: SiteLayout) {
    this.game = game;
    this.id = layout.id;
    this.layout = layout;
    this.y0 = groundHeight(layout.x, layout.z);
    this.group.position.set(layout.x, this.y0, layout.z);
    this.group.rotation.y = layout.face;
    game.scene.add(this.group);
  }

  /** Convierte coordenadas locales del sitio (x a la derecha, z hacia el centro de la colonia) al mundo. */
  local(x: number, z: number, y = 0): THREE.Vector3 {
    const c = Math.cos(this.layout.face);
    const s = Math.sin(this.layout.face);
    return new THREE.Vector3(this.layout.x + x * c + z * s, this.y0 + y, this.layout.z - x * s + z * c);
  }

  /** Ángulo en el mundo correspondiente a un ángulo local. */
  worldYaw(localYaw: number) {
    return this.layout.face + localYaw;
  }

  addCollider(x: number, z: number, r: number, tag?: string) {
    const p = this.local(x, z);
    const c = { x: p.x, z: p.z, r, tag };
    this.colliders.push(c);
    this.game.world.colliders.push(c);
    return c;
  }

  removeCollider(c: Collider) {
    const i = this.game.world.colliders.indexOf(c);
    if (i >= 0) this.game.world.colliders.splice(i, 1);
    const j = this.colliders.indexOf(c);
    if (j >= 0) this.colliders.splice(j, 1);
  }

  /** Puntos (locales) donde se paran los 4 especialistas. */
  npcSpots(): [number, number][] {
    return [
      [-11, -3],
      [11, -3],
      [-12, 8],
      [12, 8],
    ];
  }

  /** Puntos (locales) de los 5 pedestales de decisión. */
  pedestalSpots(): [number, number][] {
    return [
      [-8, 13],
      [-4, 14.6],
      [0, 15.2],
      [4, 14.6],
      [8, 13],
    ];
  }

  /** Dónde se para el jugador al empezar el minijuego. */
  standSpot(): THREE.Vector3 {
    return this.local(0, 10);
  }

  abstract build(): void;
  /** Cambia entre la problemática visible (roto) y la colonia reparada. */
  abstract setFixed(fixed: boolean): void;
  abstract createMinigame(ctx: MgContext): Minigame;
  /** Edificio que se desbloquea al completar la misión. */
  abstract showBuilding(animated: boolean): void;
  abstract incidentSpots(): IncidentSpot[];

  update(_dt: number, _t: number): void {}

  /** Cámara cenital estándar para tableros en el suelo del sitio. */
  boardCamera(cx: number, cz: number, size: number) {
    return {
      pos: this.local(cx, cz + size * 0.95, size * 1.25),
      target: this.local(cx, cz + size * 0.08, 0),
    };
  }
}

/* ---------------- utilidades para tableros en cuadrícula ---------------- */

export type Dir = 0 | 1 | 2 | 3; // 0: +x (este), 1: +z (sur), 2: -x (oeste), 3: -z (norte)
export const DX = [1, 0, -1, 0];
export const DZ = [0, 1, 0, -1];
export const opposite = (d: number) => ((d + 2) % 4) as Dir;
