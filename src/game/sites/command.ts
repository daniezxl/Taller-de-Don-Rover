// M-06 · Centro de mando (la prueba final). Problemática: la Tierra no enviará
// suministros en 10 sols. Minijuego "10 sols": correr por toda la colonia reparando
// fallas antes de que algún sistema llegue a cero (pensamiento sistémico).

import * as THREE from 'three';
import { SYSTEMS, SYSTEM_ORDER } from '../../../shared/content';
import { makeRng, type Rng } from '../../../shared/rng';
import type { Meters, MissionId, SystemId } from '../../../shared/types';
import { sfx } from '../../lib/sound';
import { setUi, toast } from '../store';
import { makeBeacon, makeDome, makeEmojiSprite, makeLabel, mat, mesh, ownMat } from '../models';
import { glowTexture } from '../world';
import { Site, type IncidentSpot, type MgContext, type Minigame } from './base';

export class CommandSite extends Site {
  private holo!: THREE.Group;
  private towerLight!: THREE.MeshStandardMaterial;
  private building: THREE.Group | null = null;
  private cityLights: THREE.Sprite[] = [];

  npcSpots(): [number, number][] {
    return [
      [-9, 3],
      [9, 3],
      [-9, -4],
      [9, -4],
    ];
  }

  pedestalSpots(): [number, number][] {
    return [
      [-8, 9.5],
      [-4, 11],
      [0, 11.6],
      [4, 11],
      [8, 9.5],
    ];
  }

  standSpot() {
    return this.local(0, 8);
  }

  build() {
    const dome = makeDome(6, { color: '#EDEAE4' });
    this.group.add(dome.group);
    this.addCollider(0, 0, 6.3);
    const tower = mesh(new THREE.CylinderGeometry(0.8, 1.2, 12, 10), mat('#D9D4CC'));
    tower.position.y = 6;
    this.group.add(tower);
    this.towerLight = ownMat('#FF6B5B', { emissive: '#FF6B5B', ei: 1 });
    const beaconTop = mesh(new THREE.SphereGeometry(0.7, 12, 8), this.towerLight, false);
    beaconTop.position.y = 12.6;
    this.group.add(beaconTop);
    // Holograma de IX sobre la torre
    this.holo = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const ring = mesh(new THREE.TorusGeometry(2.2 + i * 0.5, 0.06, 6, 40), mat('#B69CFF', { emissive: '#B69CFF', ei: 1.2, opacity: 0.8 }), false);
      ring.rotation.x = Math.PI / 2 + i * 0.4;
      ring.rotation.y = i * 0.7;
      this.holo.add(ring);
    }
    this.holo.position.y = 14.5;
    this.group.add(this.holo);
    // Ventanas
    const winM = mat('#7FDBFF', { emissive: '#3CC8FF', ei: 0.5 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const w = mesh(new THREE.CircleGeometry(0.5, 10), winM, false);
      w.position.set(Math.sin(a) * 5.75, 2.4, Math.cos(a) * 5.75);
      w.rotation.y = a;
      this.group.add(w);
    }
    const sign = makeLabel('Centro de mando', { emoji: '🛰️', size: 1.1, color: '#FFB703' });
    sign.position.set(0, 18, 0);
    this.group.add(sign);
  }

  setFixed(fixed: boolean) {
    this.fixed = fixed;
    this.towerLight.color.set(fixed ? '#55DB7A' : '#FFB703');
    this.towerLight.emissive.set(fixed ? '#55DB7A' : '#FFB703');
  }

  update(dt: number, t: number) {
    this.holo.rotation.y += dt * 0.6;
    this.holo.children.forEach((r, i) => (r.rotation.z += dt * (0.5 + i * 0.3)));
    for (const [i, s] of this.cityLights.entries()) (s.material as THREE.SpriteMaterial).opacity = 0.6 + Math.sin(t * 2 + i) * 0.3;
  }

  showBuilding(animated: boolean) {
    if (this.building) return;
    const g = new THREE.Group();
    const moon = mesh(new THREE.SphereGeometry(1.4, 16, 12), mat('#FFF4DC', { emissive: '#FFE7B8', ei: 0.8 }), false);
    moon.position.y = 20.5;
    g.add(moon);
    const lbl = makeLabel('Ciudad IXCHEL', { emoji: '🌙', size: 1.1, color: '#FFB703' });
    lbl.position.y = 23;
    g.add(lbl);
    this.group.add(g);
    // Luces festivas alrededor de la colonia
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: ['#FFC93C', '#3CC8FF', '#55DB7A', '#FF6B5B'][i % 4], transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      s.scale.set(2.2, 2.2, 1);
      s.position.set(Math.sin(a) * 16, 3.5, Math.cos(a) * 16);
      g.add(s);
      this.cityLights.push(s);
    }
    this.building = g;
    if (animated) {
      g.scale.setScalar(0.01);
      void this.game.animate(1.6, (k) => g.scale.setScalar(Math.max(0.01, k)));
    }
  }

  incidentSpots(): IncidentSpot[] {
    return [
      { pos: this.local(-3, 8), system: 'water', text: 'Reciclador de aire saturado', emoji: '🫧' },
      { pos: this.local(7, -7), system: 'energy', text: 'Red eléctrica sobrecargada', emoji: '⚡' },
    ];
  }

  createMinigame(ctx: MgContext): Minigame {
    return new SurvivalGame(this, ctx);
  }
}

/* ------------------------------------------------------------------ */
/* Minijuego: 10 sols                                                   */
/* ------------------------------------------------------------------ */

interface Incident {
  spot: IncidentSpot;
  id: string;
  beacon: ReturnType<typeof makeBeacon>;
  icon: THREE.Sprite;
  label: THREE.Sprite;
  t: number;
}

class SurvivalGame implements Minigame {
  controlsPlayer = true;
  private site: CommandSite;
  private ctx: MgContext;
  private rng: Rng;
  private spots: IncidentSpot[] = [];
  private incidents: Incident[] = [];
  private meters: Meters;
  private minMeter = 100;
  private damaged = false;
  private sol = 1;
  private solT = 0;
  private solLen: number;
  private spawnEvery: number;
  private maxActive: number;
  private drain: number;
  private spawnT = 2;
  private nextId = 1;
  private done = false;
  private fixedCount = 0;

  constructor(site: CommandSite, ctx: MgContext) {
    this.site = site;
    this.ctx = ctx;
    this.rng = makeRng(ctx.seed);
    const d = ctx.difficulty;
    this.solLen = d === 'explorer' ? 16 : d === 'cadet' ? 14 : 12;
    this.spawnEvery = d === 'explorer' ? 4.6 : d === 'cadet' ? 3.8 : 3.1;
    this.maxActive = d === 'explorer' ? 2 : 3;
    this.drain = d === 'explorer' ? 1.5 : d === 'cadet' ? 2 : 2.5;
    const m = ctx.game.save.meters;
    this.meters = { energy: Math.max(60, m.energy), water: Math.max(60, m.water), food: Math.max(60, m.food), habitat: Math.max(60, m.habitat) };
  }

  start() {
    const sites = this.ctx.game.missions.sites;
    for (const id of Object.keys(sites) as MissionId[]) this.spots.push(...sites[id].incidentSpots());
    this.ctx.game.speedBoost = 1.35;
    sfx.alarm();
    this.publish();
  }

  private spawn() {
    const busy = new Set(this.incidents.map((i) => i.spot));
    // Preferir sistemas que aún no tienen una falla activa
    const activeSystems = new Set(this.incidents.map((i) => i.spot.system));
    let free = this.spots.filter((s) => !busy.has(s) && !activeSystems.has(s.system));
    if (!free.length) free = this.spots.filter((s) => !busy.has(s));
    if (!free.length) return;
    const spot = free[Math.floor(this.rng() * free.length)];
    const id = `inc-${this.nextId++}`;
    const beacon = makeBeacon('#FF3B30', 30);
    beacon.group.position.copy(spot.pos);
    const icon = makeEmojiSprite(spot.emoji, 1.4, SYSTEMS[spot.system].color);
    icon.position.copy(spot.pos).add(new THREE.Vector3(0, 2.4, 0));
    const label = makeLabel(spot.text, { emoji: SYSTEMS[spot.system].emoji, size: 0.6, color: SYSTEMS[spot.system].color });
    label.position.copy(spot.pos).add(new THREE.Vector3(0, 3.8, 0));
    this.ctx.game.scene.add(beacon.group, icon, label);
    const inc: Incident = { spot, id, beacon, icon, label, t: 0 };
    this.incidents.push(inc);
    this.ctx.game.addInteractable({
      id,
      pos: spot.pos,
      radius: 3.2,
      hold: 1,
      label: () => `Mantén presionado para reparar: ${spot.text}`,
      onUse: () => this.fix(inc),
    });
    toast(`${spot.text} (${SYSTEMS[spot.system].short})`, spot.emoji, 'bad');
    sfx.alarm();
  }

  private remove(inc: Incident) {
    this.ctx.game.scene.remove(inc.beacon.group, inc.icon, inc.label);
    this.ctx.game.removeInteractable(inc.id);
    this.incidents = this.incidents.filter((i) => i !== inc);
  }

  private fix(inc: Incident) {
    this.remove(inc);
    this.meters[inc.spot.system] = Math.min(100, this.meters[inc.spot.system] + 12);
    this.fixedCount++;
    sfx.success();
    toast(`¡Reparado! ${SYSTEMS[inc.spot.system].short} +12`, '🔧', 'good');
  }

  private publish() {
    this.ctx.setUi({
      title: '10 sols',
      stage: `Sol ${this.sol} de 10 · Fallas reparadas: ${this.fixedCount}`,
      help: 'Corre hasta cada columna roja y mantén presionada la acción para reparar. Si una falla sigue activa, su sistema baja. ¡Ningún sistema debe llegar a cero!',
      timeLeft: Math.max(0, Math.ceil(this.solLen - this.solT)),
      bars: SYSTEM_ORDER.map((s: SystemId) => ({
        label: SYSTEMS[s].short,
        value: this.meters[s] / 100,
        color: SYSTEMS[s].color,
        text: `${Math.round(this.meters[s])}%`,
      })),
      markers: this.incidents.map((i) => ({ x: i.spot.pos.x, z: i.spot.pos.z, emoji: i.spot.emoji })),
    });
  }

  private pubT = 0;
  update(dt: number, t: number) {
    if (this.done) return;
    this.solT += dt;
    this.ctx.game.world.setDayPhase(0.27 + (this.solT / this.solLen) * 0.96);
    if (this.solT >= this.solLen) {
      this.solT = 0;
      this.sol++;
      sfx.join();
      if (this.sol > 10) return this.end();
      toast(`Amanece el sol ${this.sol}`, '🌅', 'info');
      this.ctx.game.save.sol++;
      setUi({ sol: this.ctx.game.save.sol });
    }
    this.spawnT -= dt;
    if (this.spawnT <= 0 && this.incidents.length < this.maxActive) {
      this.spawn();
      this.spawnT = this.spawnEvery * (0.8 + this.rng() * 0.4);
    }
    for (const s of SYSTEM_ORDER) this.meters[s] = Math.max(0, this.meters[s] - dt * 0.25);
    for (const inc of this.incidents) {
      inc.t += dt;
      this.meters[inc.spot.system] = Math.max(0, this.meters[inc.spot.system] - dt * this.drain);
      inc.icon.position.y = inc.spot.pos.y + 2.4 + Math.sin(t * 5) * 0.2;
      inc.beacon.beamMat.opacity = 0.25 + Math.sin(t * 6) * 0.12;
    }
    for (const s of SYSTEM_ORDER) {
      this.minMeter = Math.min(this.minMeter, this.meters[s]);
      if (this.meters[s] <= 0 && !this.damaged) {
        this.damaged = true;
        sfx.fail();
        toast(`¡${SYSTEMS[s].name} llegó a cero! La reserva de emergencia lo salva, pero hubo daños.`, '⚠️', 'bad');
        this.meters[s] = 15;
      } else if (this.meters[s] <= 0) this.meters[s] = 10;
    }
    this.pubT += dt;
    if (this.pubT > 0.2) {
      this.pubT = 0;
      this.publish();
    }
  }

  private end() {
    this.done = true;
    for (const inc of [...this.incidents]) this.remove(inc);
    const stars = this.damaged ? 1 : this.minMeter >= 35 ? 3 : 2;
    const save = this.ctx.game.save;
    for (const s of SYSTEM_ORDER) save.meters[s] = Math.round(Math.max(save.meters[s], this.meters[s]));
    setUi({ meters: { ...save.meters } });
    this.ctx.game.world.setDayPhase(0.42);
    sfx.success();
    this.ctx.finish(stars);
  }

  camera() {
    return null;
  }

  exit() {
    for (const inc of [...this.incidents]) this.remove(inc);
    this.ctx.game.speedBoost = 1;
  }
}
