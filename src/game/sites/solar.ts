// M-03 · Granja solar. Problemática: la tormenta cubrió de polvo los paneles y la
// colonia se queda sin energía. Minijuego "Rover limpiador": manejar un rover con
// cepillo sobre los paneles hasta que produzcan la energía que pide el plan elegido.

import * as THREE from 'three';
import { makeRng, type Rng } from '../../../shared/rng';
import { sfx } from '../../lib/sound';
import { toast } from '../store';
import { at, makeLabel, makeRover, mat, mesh, ownMat } from '../models';
import { Site, type IncidentSpot, type MgContext, type Minigame } from './base';

const COLS = 12;
const ROWS = 8;
const CELL = 1.5;

function panelPos(c: number, r: number) {
  // Grupos de 3×2 paneles con pasillos entre ellos
  const x = -10.4 + c * CELL + Math.floor(c / 3) * 0.9;
  const z = -10.6 + r * CELL + Math.floor(r / 2) * 0.9;
  return { x, z };
}

export class SolarSite extends Site {
  panels!: THREE.InstancedMesh;
  dust = new Float32Array(COLS * ROWS);
  private batteryLights: THREE.MeshStandardMaterial[] = [];
  private building: THREE.Group | null = null;
  private dusty = new THREE.Color('#B8794F');
  private clean = new THREE.Color('#2349A8');
  private tmp = new THREE.Color();

  npcSpots(): [number, number][] {
    return [
      [-16, -6],
      [16, -6],
      [-16, 8],
      [16, 8],
    ];
  }

  pedestalSpots(): [number, number][] {
    return [
      [-8, 14],
      [-4, 15.6],
      [0, 16.2],
      [4, 15.6],
      [8, 14],
    ];
  }

  standSpot() {
    return this.local(0, 11.5);
  }

  build() {
    const geo = new THREE.BoxGeometry(CELL - 0.12, 0.12, CELL - 0.12);
    this.panels = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.4, flatShading: true }), COLS * ROWS);
    this.panels.receiveShadow = true;
    const dummy = new THREE.Object3D();
    for (let c = 0; c < COLS; c++)
      for (let r = 0; r < ROWS; r++) {
        const { x, z } = panelPos(c, r);
        dummy.position.set(x, 0.12, z);
        dummy.updateMatrix();
        this.panels.setMatrixAt(c * ROWS + r, dummy.matrix);
        this.dust[c * ROWS + r] = 1;
      }
    this.group.add(this.panels);
    this.refreshPanels();
    // Marcos de los grupos de paneles
    const frameM = mat('#D9D4CC');
    for (let gc = 0; gc < 4; gc++)
      for (let gr = 0; gr < 4; gr++) {
        const a = panelPos(gc * 3, gr * 2);
        const frame = mesh(new THREE.BoxGeometry(CELL * 3 + 0.2, 0.08, CELL * 2 + 0.2), frameM);
        frame.position.set(a.x + CELL, 0.04, a.z + CELL / 2);
        this.group.add(frame);
      }
    // Banco de baterías
    for (let i = 0; i < 5; i++) {
      const x = -8 + i * 4;
      const bat = mesh(new THREE.CylinderGeometry(1.2, 1.2, 3.4, 12), mat('#E9E6DF', { rough: 0.5, metal: 0.2 }));
      bat.position.set(x, 1.7, -16);
      const cap = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 10), mat('#8C8577'));
      cap.position.set(x, 3.6, -16);
      const lm = ownMat('#FF6B5B', { emissive: '#FF6B5B', ei: 0.8 });
      this.batteryLights.push(lm);
      const light = mesh(new THREE.BoxGeometry(0.5, 1.6, 0.1), lm, false);
      light.position.set(x, 1.8, -14.8);
      this.group.add(bat, cap, light);
      this.addCollider(x, -16, 1.3);
    }
    const sign = makeLabel('Granja solar', { emoji: '☀️', size: 1, color: '#FFC93C' });
    sign.position.set(0, 7, -16);
    this.group.add(sign);
  }

  refreshPanels() {
    for (let i = 0; i < COLS * ROWS; i++) {
      this.tmp.copy(this.clean).lerp(this.dusty, Math.min(1, this.dust[i]));
      this.panels.setColorAt(i, this.tmp);
    }
    if (this.panels.instanceColor) this.panels.instanceColor.needsUpdate = true;
  }

  production() {
    let s = 0;
    for (let i = 0; i < this.dust.length; i++) s += 1 - Math.min(1, this.dust[i]);
    return s / this.dust.length;
  }

  setFixed(fixed: boolean) {
    this.fixed = fixed;
    this.dust.fill(fixed ? 0 : 1);
    this.refreshPanels();
    for (const m of this.batteryLights) {
      m.color.set(fixed ? '#55DB7A' : '#FF6B5B');
      m.emissive.set(fixed ? '#55DB7A' : '#FF6B5B');
    }
  }

  update(_dt: number, t: number) {
    if (!this.fixed) for (const m of this.batteryLights) m.emissiveIntensity = Math.sin(t * 4) > 0 ? 1 : 0.15;
  }

  showBuilding(animated: boolean) {
    if (this.building) return;
    const g = new THREE.Group();
    const core = mesh(new THREE.CylinderGeometry(1.8, 2.2, 4, 12), mat('#E9E6DF', { rough: 0.4, metal: 0.3 }));
    core.position.y = 2;
    const ring = mesh(new THREE.TorusGeometry(2.3, 0.18, 8, 24), mat('#8B7BFF', { emissive: '#8B7BFF', ei: 1.2 }), false);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 2.6;
    const top = mesh(new THREE.SphereGeometry(1.8, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat('#D9D4CC'));
    top.position.y = 4;
    g.add(core, ring, top);
    at(g, 15, 0, -15);
    this.group.add(g);
    this.addCollider(15, -15, 2.4);
    const lbl = makeLabel('Reactor compacto', { emoji: '⚛️', size: 0.8, color: '#8B7BFF' });
    lbl.position.set(15, 7.4, -15);
    this.group.add(lbl);
    this.building = g;
    if (animated) {
      g.scale.setScalar(0.01);
      void this.game.animate(1.4, (k) => g.scale.setScalar(Math.max(0.01, k)));
    }
  }

  incidentSpots(): IncidentSpot[] {
    return [
      { pos: this.local(0, -1), system: 'energy', text: 'Paneles con polvo', emoji: '🌪️' },
      { pos: this.local(-6, -12.5), system: 'energy', text: 'Batería sobrecalentada', emoji: '🔋' },
    ];
  }

  createMinigame(ctx: MgContext): Minigame {
    return new RoverGame(this, ctx);
  }
}

/* ------------------------------------------------------------------ */
/* Minijuego: Rover limpiador                                           */
/* ------------------------------------------------------------------ */

class RoverGame implements Minigame {
  private site: SolarSite;
  private ctx: MgContext;
  private rng: Rng;
  private rover = makeRover('#F4F1EA', '#FFC93C');
  private brush: THREE.Mesh;
  private lx = 0;
  private lz = 9;
  private heading = Math.PI; // mirando hacia los paneles (-z)
  private speed = 0;
  private charge = 0;
  private target: number;
  private elapsed = 0;
  private gustTimer = 8;
  private devil: THREE.Group;
  private devilPos = new THREE.Vector2(-8, -4);
  private devilVel = new THREE.Vector2(2.4, 1.2);
  private gust: THREE.Mesh | null = null;
  private gustT = 0;
  private gustRow = 0;
  private done = false;
  private tick = 0;
  private sideHint: THREE.Sprite;

  constructor(site: SolarSite, ctx: MgContext) {
    this.site = site;
    this.ctx = ctx;
    this.rng = makeRng(ctx.seed);
    this.target = ctx.difficulty === 'explorer' ? 0.7 : ctx.difficulty === 'cadet' ? 0.78 : 0.85;
    this.brush = mesh(new THREE.CylinderGeometry(0.35, 0.35, 2.4, 10), mat('#FFC93C', { emissive: '#FF9A3C', ei: 0.3 }));
    this.brush.rotation.z = Math.PI / 2;
    this.brush.position.set(0, 0.4, 1.5);
    this.rover.group.add(this.brush);
    this.devil = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const cone = mesh(new THREE.CylinderGeometry(0.4 + i * 0.5, 0.2 + i * 0.4, 1.6, 10, 1, true), mat('#E7B38C', { opacity: 0.35, side: THREE.DoubleSide }), false);
      cone.position.y = 0.8 + i * 1.5;
      this.devil.add(cone);
    }
    this.sideHint = makeLabel('Remolino: ¡limpia paneles!', { emoji: '🌪️', size: 0.55 });
    this.sideHint.position.y = 7.4;
    this.devil.add(this.sideHint);
  }

  start() {
    this.site.group.add(this.rover.group, this.devil);
    this.ctx.game.playerVisible = false;
    this.site.dust.fill(1);
    // Algunos paneles ya tienen un poco menos de polvo
    for (let i = 0; i < this.site.dust.length; i++) this.site.dust[i] = 0.75 + this.rng() * 0.35;
    this.site.refreshPanels();
    this.publish();
  }

  private publish() {
    const prod = this.site.production();
    this.ctx.setUi({
      title: 'Rover limpiador',
      stage: prod >= this.target ? '⚡ ¡Producción suficiente! Cargando baterías…' : 'Limpia los paneles con el cepillo del rover',
      help: 'Maneja con el joystick o W A S D. Pasa el cepillo amarillo sobre los paneles sucios. Los remolinos de polvo también limpian; las ráfagas ensucian.',
      joystick: true,
      bars: [
        { label: 'Producción de los paneles', value: prod, target: this.target, color: '#FFC93C', text: `${Math.round(prod * 100)}%` },
        { label: 'Carga de las baterías', value: this.charge, color: '#55DB7A', text: `${Math.round(this.charge * 100)}%` },
      ],
    });
  }

  private cleanAround(x: number, z: number, radius: number, amount: number) {
    let changed = false;
    for (let c = 0; c < COLS; c++)
      for (let r = 0; r < ROWS; r++) {
        const p = panelPos(c, r);
        const d = Math.hypot(p.x - x, p.z - z);
        if (d < radius) {
          const i = c * ROWS + r;
          if (this.site.dust[i] > 0) {
            this.site.dust[i] = Math.max(0, this.site.dust[i] - amount * (1 - d / (radius * 1.4)));
            changed = true;
          }
        }
      }
    return changed;
  }

  update(dt: number, t: number) {
    if (this.done) return;
    this.elapsed += dt;
    const mv = this.ctx.game.input.move();
    const turn = -mv.x * 2.4;
    this.heading += turn * dt * (Math.abs(this.speed) > 0.3 || mv.y !== 0 ? 1 : 0.8);
    const targetSpeed = mv.y * 7.5;
    this.speed += (targetSpeed - this.speed) * Math.min(1, dt * 4);
    let nx = this.lx + Math.sin(this.heading) * this.speed * dt;
    let nz = this.lz + Math.cos(this.heading) * this.speed * dt;
    nx = Math.max(-16, Math.min(16, nx));
    nz = Math.max(-13, Math.min(14, nz));
    if (nz < -13.2 + 1.5 && Math.abs(nx) < 11) nz = -11.7; // baterías
    this.lx = nx;
    this.lz = nz;
    this.rover.group.position.set(this.lx, 0, this.lz);
    this.rover.group.rotation.y = this.heading;
    for (const w of this.rover.wheels) w.rotation.x += this.speed * dt * 2.4;
    this.brush.rotation.x += dt * 14;

    // Cepillo: delante del rover
    const bx = this.lx + Math.sin(this.heading) * 1.5;
    const bz = this.lz + Math.cos(this.heading) * 1.5;
    let changed = this.cleanAround(bx, bz, 1.6, dt * 2.6);
    if (changed && Math.abs(this.speed) > 0.5) {
      this.tick += dt;
      if (this.tick > 0.12) {
        this.tick = 0;
        sfx.tap();
      }
    }

    // Remolino de polvo (ayuda real: así se limpiaron los paneles de Spirit y Opportunity)
    this.devilPos.addScaledVector(this.devilVel, dt);
    if (Math.abs(this.devilPos.x) > 13) this.devilVel.x *= -1;
    if (this.devilPos.y < -11 || this.devilPos.y > 6) this.devilVel.y *= -1;
    if (this.rng() < dt * 0.3) this.devilVel.rotateAround(new THREE.Vector2(), (this.rng() - 0.5) * 1.5);
    this.devil.position.set(this.devilPos.x, 0, this.devilPos.y);
    this.devil.rotation.y += dt * 6;
    if (this.cleanAround(this.devilPos.x, this.devilPos.y, 1.8, dt * 0.9)) changed = true;

    // Ráfagas que vuelven a ensuciar una fila
    this.gustTimer -= dt;
    if (this.gustTimer <= 0 && !this.gust) {
      this.gustTimer = this.ctx.difficulty === 'explorer' ? 13 : this.ctx.difficulty === 'cadet' ? 10 : 8;
      this.gustRow = Math.floor(this.rng() * (ROWS / 2)) * 2;
      this.gust = mesh(new THREE.BoxGeometry(2, 5, 4), mat('#C98A62', { opacity: 0.45 }), false);
      this.gust.position.set(-20, 2.5, panelPos(0, this.gustRow).z + CELL / 2);
      this.site.group.add(this.gust);
      this.gustT = 0;
      toast('¡Ráfaga de polvo!', '💨', 'bad');
      sfx.whoosh();
    }
    if (this.gust) {
      this.gustT += dt;
      this.gust.position.x = -20 + this.gustT * 16;
      for (let c = 0; c < COLS; c++) {
        const p = panelPos(c, this.gustRow);
        if (Math.abs(p.x - this.gust.position.x) < 1.2)
          for (const r of [this.gustRow, this.gustRow + 1]) {
            const i = c * ROWS + r;
            this.site.dust[i] = Math.min(1, this.site.dust[i] + dt * 2.4);
          }
      }
      changed = true;
      if (this.gust.position.x > 20) {
        this.site.group.remove(this.gust);
        this.gust = null;
      }
    }
    if (changed) this.site.refreshPanels();

    const prod = this.site.production();
    this.charge = Math.min(1, this.charge + dt * (prod >= this.target ? 0.1 : prod * 0.01));
    this.sideHint.visible = Math.sin(t * 2) > -0.3;
    this.publish();
    if (this.charge >= 1) {
      this.done = true;
      sfx.success();
      const par = this.ctx.difficulty === 'explorer' ? 60 : 70;
      const stars = this.elapsed < par ? 3 : this.elapsed < par * 1.6 ? 2 : 1;
      setTimeout(() => this.ctx.finish(stars), 700);
    }
  }

  camera() {
    const back = 10;
    const pos = this.site.local(this.lx - Math.sin(this.heading) * back, this.lz - Math.cos(this.heading) * back, 7.5);
    const target = this.site.local(this.lx + Math.sin(this.heading) * 3, this.lz + Math.cos(this.heading) * 3, 0.5);
    return { pos, target };
  }

  exit(completed: boolean) {
    this.site.group.remove(this.rover.group, this.devil);
    if (this.gust) this.site.group.remove(this.gust);
    this.ctx.game.playerVisible = true;
    if (!completed) this.site.setFixed(false);
  }
}
