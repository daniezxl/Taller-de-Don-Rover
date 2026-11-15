// M-02 · Planta de agua. Problemática: el tanque principal tiene una fuga y pierde agua.
// Minijuego "Ruta del agua": girar tubos para llevar el agua del pozo de hielo, a través
// del filtro de percloratos, hasta el tanque; después, tapar las fugas a tiempo.

import * as THREE from 'three';
import { makeRng, randInt, shuffle, type Rng } from '../../../shared/rng';
import { sfx } from '../../lib/sound';
import { at, makeLabel, makeTank, mat, mesh, ownMat, makeEmojiSprite } from '../models';
import { DX, DZ, opposite, Site, type IncidentSpot, type MgContext, type Minigame } from './base';

export class WaterSite extends Site {
  private spray!: THREE.Points;
  private puddle!: THREE.Mesh;
  private bandMat!: THREE.MeshStandardMaterial;
  private building: THREE.Group | null = null;

  build() {
    const tank = makeTank(3, 5.5);
    at(tank, 0, 0, -11);
    this.group.add(tank);
    this.bandMat = ownMat('#FF6B5B', { emissive: '#FF6B5B', ei: 0.6 });
    const band = mesh(new THREE.CylinderGeometry(3.06, 3.06, 0.4, 20, 1, true), this.bandMat, false);
    band.position.set(0, 4.6, -11);
    this.group.add(band);
    this.addCollider(0, -11, 3.3);
    // Perforadora de hielo
    const drill = new THREE.Group();
    const frame = mesh(new THREE.CylinderGeometry(0.3, 1.6, 6, 4, 1, true), mat('#8C8577'));
    frame.position.y = 3;
    const bit = mesh(new THREE.ConeGeometry(0.6, 1.4, 8), mat('#B7C4D6', { metal: 0.6, rough: 0.3 }));
    bit.position.y = 0.6;
    bit.rotation.x = Math.PI;
    const ice = mesh(new THREE.DodecahedronGeometry(1.2, 0), mat('#CDEFFF', { emissive: '#7FDBFF', ei: 0.3, rough: 0.2 }));
    ice.position.set(1.6, 0.6, 1);
    drill.add(frame, bit, ice);
    at(drill, -11, 0, -10);
    this.group.add(drill);
    this.addCollider(-11, -10, 1.8);
    const drillLbl = makeLabel('Pozo de hielo', { emoji: '🧊', size: 0.7 });
    drillLbl.position.set(-11, 7, -10);
    this.group.add(drillLbl);
    // Tubos que salen del tanque
    const pipeM = mat('#C9D3E0', { metal: 0.4, rough: 0.4 });
    const p1 = mesh(new THREE.CylinderGeometry(0.25, 0.25, 8, 8), pipeM);
    p1.rotation.z = Math.PI / 2;
    p1.position.set(6.5, 0.6, -11);
    this.group.add(p1);
    const sign = makeLabel('Planta de agua', { emoji: '💧', size: 1, color: '#3CC8FF' });
    sign.position.set(0, 10.5, -11);
    this.group.add(sign);

    // Chorro de la fuga (partículas)
    const n = 160;
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(n * 3);
    const vel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) this.resetDrop(arr, vel, i, true);
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    geo.userData.vel = vel;
    this.spray = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#7FDBFF', size: 0.18, transparent: true, opacity: 0.85 }));
    this.spray.frustumCulled = false;
    this.group.add(this.spray);
    this.puddle = mesh(new THREE.CircleGeometry(3.2, 20), mat('#3C9FD0', { rough: 0.1, metal: 0.3, opacity: 0.75 }), false);
    this.puddle.rotation.x = -Math.PI / 2;
    this.puddle.position.set(2.6, 0.05, -7.5);
    this.group.add(this.puddle);
  }

  private resetDrop(arr: Float32Array, vel: Float32Array, i: number, randomT = false) {
    arr[i * 3] = 2.2;
    arr[i * 3 + 1] = 2.2;
    arr[i * 3 + 2] = -8.4;
    vel[i * 3] = 1.2 + Math.random() * 1.6;
    vel[i * 3 + 1] = 1.5 + Math.random() * 2;
    vel[i * 3 + 2] = 1.4 + Math.random() * 1.5;
    if (randomT) {
      const t = Math.random() * 0.8;
      arr[i * 3] += vel[i * 3] * t;
      arr[i * 3 + 1] += vel[i * 3 + 1] * t - 4.9 * t * t;
      arr[i * 3 + 2] += vel[i * 3 + 2] * t;
    }
  }

  setFixed(fixed: boolean) {
    this.fixed = fixed;
    this.spray.visible = !fixed;
    this.puddle.visible = !fixed;
    this.bandMat.color.set(fixed ? '#3CC8FF' : '#FF6B5B');
    this.bandMat.emissive.set(fixed ? '#3CC8FF' : '#FF6B5B');
  }

  update(dt: number, t: number) {
    if (!this.fixed) {
      const geo = this.spray.geometry;
      const arr = (geo.attributes.position as THREE.BufferAttribute).array as Float32Array;
      const vel = geo.userData.vel as Float32Array;
      for (let i = 0; i < arr.length / 3; i++) {
        vel[i * 3 + 1] -= 9.8 * dt;
        arr[i * 3] += vel[i * 3] * dt;
        arr[i * 3 + 1] += vel[i * 3 + 1] * dt;
        arr[i * 3 + 2] += vel[i * 3 + 2] * dt;
        if (arr[i * 3 + 1] < 0.05) this.resetDrop(arr, vel, i);
      }
      (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      this.bandMat.emissiveIntensity = 0.4 + Math.abs(Math.sin(t * 3)) * 0.8;
    }
  }

  showBuilding(animated: boolean) {
    if (this.building) return;
    const g = new THREE.Group();
    const body = mesh(new THREE.BoxGeometry(5, 3, 3.4), mat('#E9E6DF', { rough: 0.5 }));
    body.position.y = 1.5;
    const top = mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.4, 12), mat('#3CC8FF', { emissive: '#3CC8FF', ei: 0.4 }));
    top.position.set(-1, 3.6, 0);
    const icon = makeEmojiSprite('♻️', 1.4, '#3CC8FF');
    icon.position.set(1.2, 4.2, 0);
    g.add(body, top, icon);
    at(g, 12, 0, -13, -0.4);
    this.group.add(g);
    this.addCollider(12, -13, 3);
    const lbl = makeLabel('Recicladora de agua', { emoji: '♻️', size: 0.8, color: '#3CC8FF' });
    lbl.position.set(12, 6.4, -13);
    this.group.add(lbl);
    this.building = g;
    if (animated) {
      g.scale.setScalar(0.01);
      void this.game.animate(1.4, (k) => g.scale.setScalar(Math.max(0.01, k)));
    }
  }

  incidentSpots(): IncidentSpot[] {
    return [
      { pos: this.local(2.5, -6.5), system: 'water', text: 'Filtro tapado', emoji: '🧪' },
      { pos: this.local(-10, -6), system: 'water', text: 'Perforadora congelada', emoji: '🧊' },
    ];
  }

  standSpot() {
    return this.local(0, 11.5);
  }

  createMinigame(ctx: MgContext): Minigame {
    return new PipeGame(this, ctx);
  }
}

/* ------------------------------------------------------------------ */
/* Minijuego: Ruta del agua                                             */
/* ------------------------------------------------------------------ */

interface Tile {
  c: number;
  r: number;
  open: boolean[]; // aberturas en rotación 0 (índice = Dir)
  rot: number; // 0..3
  group: THREE.Group;
  pipeMats: THREE.MeshStandardMaterial[];
  filter: boolean;
  wet: boolean;
}

const BASE_SHAPES: Record<'I' | 'L' | 'T', boolean[]> = {
  I: [true, false, true, false],
  L: [true, true, false, false],
  T: [true, true, true, false],
};

function rotated(open: boolean[], rot: number) {
  const out = [false, false, false, false];
  for (let d = 0; d < 4; d++) if (open[d]) out[(d + rot) % 4] = true;
  return out;
}

class PipeGame implements Minigame {
  private site: WaterSite;
  private ctx: MgContext;
  private rng: Rng;
  private n: number;
  private cs = 1.5;
  private cz = 3;
  private board = new THREE.Group();
  private tiles: Tile[][] = [];
  private srcRow = 0;
  private dstRow = 0;
  private filter: [number, number] = [0, 0];
  private stage: 'route' | 'leaks' | 'done' = 'route';
  private elapsed = 0;
  private pickables: THREE.Object3D[] = [];
  private tankFill = 0;
  private leaks: { tile: Tile; t: number; sprite: THREE.Sprite; spray: THREE.Mesh }[] = [];
  private leakTimer = 1.2;
  private leaksMissed = 0;
  private leaksFixed = 0;
  private path: [number, number][] = [];
  private warned = false;

  constructor(site: WaterSite, ctx: MgContext) {
    this.site = site;
    this.ctx = ctx;
    this.rng = makeRng(ctx.seed);
    this.n = ctx.difficulty === 'explorer' ? 5 : ctx.difficulty === 'cadet' ? 6 : 7;
  }

  private pos(c: number, r: number, y = 0) {
    const x0 = -((this.n - 1) / 2) * this.cs;
    const z0 = this.cz - ((this.n - 1) / 2) * this.cs;
    return new THREE.Vector3(x0 + c * this.cs, y, z0 + r * this.cs);
  }

  start() {
    this.site.group.add(this.board);
    this.ctx.game.playerVisible = false;
    this.generate();
    this.flow();
    this.publish();
  }

  /** Camino aleatorio simple (sin repetir celdas) de a → b evitando `block`. */
  private findPath(a: [number, number], b: [number, number], block: Set<string>): [number, number][] | null {
    const n = this.n;
    const key = (c: number, r: number) => `${c},${r}`;
    const visited = new Set<string>(block);
    const stack: [number, number][] = [a];
    visited.add(key(...a));
    let iterations = 0;
    const dfs = (c: number, r: number): boolean => {
      if (++iterations > 6000) return false;
      if (c === b[0] && r === b[1]) return true;
      const dirs = shuffle(this.rng, [0, 1, 2, 3]);
      for (const d of dirs) {
        const nc = c + DX[d];
        const nr = r + DZ[d];
        if (nc < 0 || nr < 0 || nc >= n || nr >= n || visited.has(key(nc, nr))) continue;
        visited.add(key(nc, nr));
        stack.push([nc, nr]);
        if (dfs(nc, nr)) return true;
        stack.pop();
      }
      return false;
    };
    return dfs(a[0], a[1]) ? [...stack] : null;
  }

  private generate() {
    const n = this.n;
    let path: [number, number][] | null = null;
    for (let attempt = 0; attempt < 200 && !path; attempt++) {
      this.srcRow = randInt(this.rng, 0, n - 1);
      this.dstRow = randInt(this.rng, 0, n - 1);
      this.filter = [randInt(this.rng, 1, n - 2), randInt(this.rng, 0, n - 1)];
      const p1 = this.findPath([0, this.srcRow], this.filter, new Set([`${n - 1},${this.dstRow}`]));
      if (!p1) continue;
      const p2 = this.findPath(this.filter, [n - 1, this.dstRow], new Set(p1.slice(0, -1).map(([c, r]) => `${c},${r}`)));
      if (!p2) continue;
      const full = [...p1, ...p2.slice(1)];
      if (full.length < n + 1 || full.length > n * n * 0.75) continue;
      path = full;
    }
    if (!path) {
      // Respaldo: línea recta
      this.srcRow = this.dstRow = Math.floor(n / 2);
      this.filter = [Math.floor(n / 2), this.srcRow];
      path = Array.from({ length: n }, (_, c) => [c, this.srcRow] as [number, number]);
    }
    this.path = path;
    const shapes: Record<string, boolean[]> = {};
    path.forEach(([c, r], i) => {
      const prev = i === 0 ? [-1, this.srcRow] : path![i - 1];
      const next = i === path!.length - 1 ? [n, this.dstRow] : path![i + 1];
      const open = [false, false, false, false];
      for (const [pc, pr] of [prev, next]) {
        const d = DX.findIndex((dx, k) => dx === pc - c && DZ[k] === pr - r);
        if (d >= 0) open[d] = true;
      }
      shapes[`${c},${r}`] = open;
    });

    // Base del tablero
    const plate = mesh(new THREE.BoxGeometry(n * this.cs + 0.3, 0.06, n * this.cs + 0.3), mat('#5A3A2E'));
    plate.position.copy(this.pos((n - 1) / 2, (n - 1) / 2, 0.02));
    this.board.add(plate);
    // Entrada (pozo) y salida (tanque)
    const inlet = this.endpoint('#CDEFFF', '🧊');
    inlet.position.copy(this.pos(-1, this.srcRow));
    const outlet = this.endpoint('#3CC8FF', '🛢️');
    outlet.position.copy(this.pos(n, this.dstRow));
    this.board.add(inlet, outlet);

    for (let c = 0; c < n; c++) {
      this.tiles[c] = [];
      for (let r = 0; r < n; r++) {
        let open = shapes[`${c},${r}`];
        let baseRot = 0;
        let baseOpen: boolean[];
        if (open) {
          // Encontrar forma base + rotación equivalente
          const count = open.filter(Boolean).length;
          const straight = count === 2 && open[0] === open[2];
          baseOpen = straight ? BASE_SHAPES.I : BASE_SHAPES.L;
          for (let k = 0; k < 4; k++) if (rotated(baseOpen, k).every((v, i) => v === open[i])) baseRot = k;
        } else {
          const pick = this.rng();
          baseOpen = pick < 0.4 ? BASE_SHAPES.I : pick < 0.8 ? BASE_SHAPES.L : BASE_SHAPES.T;
          open = baseOpen;
        }
        let rot = randInt(this.rng, 0, 3);
        if (shapes[`${c},${r}`] && rot === baseRot && this.rng() < 0.8) rot = (rot + 1 + randInt(this.rng, 0, 1)) % 4;
        const isFilter = c === this.filter[0] && r === this.filter[1];
        const tile = this.makeTile(c, r, baseOpen, rot, isFilter);
        this.tiles[c][r] = tile;
      }
    }
  }

  private endpoint(color: string, emoji: string) {
    const g = new THREE.Group();
    const base = mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.9, 10), mat(color, { emissive: color, ei: 0.3 }));
    base.position.y = 0.45;
    const icon = makeEmojiSprite(emoji, 0.9, color);
    icon.position.y = 1.6;
    g.add(base, icon);
    return g;
  }

  private makeTile(c: number, r: number, open: boolean[], rot: number, filter: boolean): Tile {
    const g = new THREE.Group();
    g.position.copy(this.pos(c, r, 0.05));
    const plate = mesh(new THREE.BoxGeometry(this.cs - 0.12, 0.12, this.cs - 0.12), mat(filter ? '#3B4C7A' : '#7A4A35'));
    plate.position.y = 0.06;
    g.add(plate);
    const inner = new THREE.Group();
    inner.rotation.y = -rot * (Math.PI / 2);
    g.add(inner);
    const pipeMats: THREE.MeshStandardMaterial[] = [];
    const pm = ownMat('#C9D3E0', { metal: 0.4, rough: 0.35 });
    pipeMats.push(pm);
    const joint = mesh(new THREE.SphereGeometry(0.26, 10, 8), pm);
    joint.position.y = 0.45;
    inner.add(joint);
    for (let d = 0; d < 4; d++) {
      if (!open[d]) continue;
      const arm = mesh(new THREE.CylinderGeometry(0.2, 0.2, this.cs / 2, 10), pm);
      arm.rotation.z = Math.PI / 2;
      const ang = Math.atan2(DZ[d], DX[d]);
      const holder = new THREE.Group();
      holder.rotation.y = -ang;
      arm.position.set(this.cs / 4, 0.45, 0);
      holder.add(arm);
      inner.add(holder);
    }
    if (filter) {
      const box = mesh(new THREE.BoxGeometry(0.75, 0.75, 0.75), ownMat('#FFFFFF', { emissive: '#7FDBFF', ei: 0.2, rough: 0.3 }));
      box.position.y = 0.55;
      g.add(box);
      pipeMats.push(box.material as THREE.MeshStandardMaterial);
      const lbl = makeLabel('Filtro', { emoji: '🧪', size: 0.42 });
      lbl.position.y = 1.5;
      g.add(lbl);
    }
    const hit = new THREE.Mesh(new THREE.BoxGeometry(this.cs, 1, this.cs), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.5;
    g.add(hit);
    g.userData.cell = [c, r];
    g.userData.inner = inner;
    this.board.add(g);
    this.pickables.push(g);
    return { c, r, open, rot, group: g, pipeMats, filter, wet: false };
  }

  private openings(t: Tile) {
    return rotated(t.open, t.rot);
  }

  /** Recorre el agua desde el pozo. Devuelve celdas mojadas y si llega al tanque. */
  private reach(blockFilter: boolean) {
    const n = this.n;
    const wet = new Set<string>();
    const start = this.tiles[0][this.srcRow];
    if (!this.openings(start)[2]) return { wet, tank: false };
    const q: Tile[] = [start];
    wet.add(`0,${this.srcRow}`);
    let tank = false;
    while (q.length) {
      const t = q.shift()!;
      if (blockFilter && t.filter) continue;
      const o = this.openings(t);
      for (let d = 0; d < 4; d++) {
        if (!o[d]) continue;
        const nc = t.c + DX[d];
        const nr = t.r + DZ[d];
        if (nc === n && nr === this.dstRow && d === 0) {
          tank = true;
          continue;
        }
        if (nc < 0 || nr < 0 || nc >= n || nr >= n) continue;
        const nt = this.tiles[nc][nr];
        if (!this.openings(nt)[opposite(d)]) continue;
        const k = `${nc},${nr}`;
        if (wet.has(k)) continue;
        wet.add(k);
        q.push(nt);
      }
    }
    return { wet, tank };
  }

  private flow() {
    const full = this.reach(false);
    const unfiltered = this.reach(true);
    for (const col of this.tiles)
      for (const t of col) {
        const w = full.wet.has(`${t.c},${t.r}`);
        t.wet = w;
        for (const m of t.pipeMats) {
          if (t.filter && m !== t.pipeMats[0]) {
            m.emissiveIntensity = w ? 1 : 0.2;
            continue;
          }
          m.color.set(w ? '#5FD0FF' : '#C9D3E0');
          m.emissive.set(w ? '#2A9FD6' : '#000000');
          m.emissiveIntensity = w ? 0.6 : 0;
        }
      }
    const filterWet = full.wet.has(`${this.filter[0]},${this.filter[1]}`);
    if (full.tank && !unfiltered.tank && filterWet) return 'ok';
    if (full.tank) return 'dirty';
    return 'none';
  }

  private publish() {
    if (this.stage === 'route') {
      const wet = this.reach(false).wet.size;
      this.ctx.setUi({
        title: 'Ruta del agua',
        stage: 'Fase 1 · Conecta la tubería',
        help: 'Toca un tubo para girarlo. El agua debe ir del 🧊 pozo, pasar por el 🧪 filtro y llegar al 🛢️ tanque.',
        bars: [{ label: 'Tubería con agua', value: Math.min(1, wet / this.path.length), color: '#3CC8FF', text: `${wet} tramos` }],
        buttons: [],
      });
    } else if (this.stage === 'leaks') {
      this.ctx.setUi({
        stage: 'Fase 2 · ¡Tapa las fugas!',
        help: 'La presión revienta algunos tubos. Toca rápido cada fuga 💦 antes de que se pierda el agua.',
        bars: [
          { label: 'Tanque', value: this.tankFill, color: '#3CC8FF', text: `${Math.round(this.tankFill * 100)}%` },
          { label: 'Fugas tapadas', value: this.leaksFixed / Math.max(1, this.leaksFixed + this.leaksMissed), color: '#55DB7A', text: `${this.leaksFixed}` },
        ],
      });
    }
  }

  tap(ray: THREE.Raycaster) {
    if (this.stage === 'leaks') {
      const hits = ray.intersectObjects(
        this.leaks.map((l) => l.sprite),
        false,
      );
      const hitsTiles = ray.intersectObjects(this.pickables, true);
      let leak = hits.length ? this.leaks.find((l) => l.sprite === hits[0].object) : undefined;
      if (!leak && hitsTiles.length) {
        let o: THREE.Object3D | null = hitsTiles[0].object;
        while (o && !o.userData.cell) o = o.parent;
        if (o) leak = this.leaks.find((l) => l.tile.group === o);
      }
      if (leak) this.fixLeak(leak);
      return;
    }
    if (this.stage !== 'route') return;
    const hits = ray.intersectObjects(this.pickables, true);
    if (!hits.length) return;
    let o: THREE.Object3D | null = hits[0].object;
    while (o && !o.userData.cell) o = o.parent;
    if (!o) return;
    const [c, r] = o.userData.cell as [number, number];
    const t = this.tiles[c][r];
    t.rot = (t.rot + 1) % 4;
    sfx.select();
    const inner = o.userData.inner as THREE.Group;
    const from = inner.rotation.y;
    const to = -t.rot * (Math.PI / 2);
    const target = to > from ? to - Math.PI * 2 : to;
    void this.ctx.game.animate(0.16, (k) => (inner.rotation.y = from + (target - from) * k)).then(() => (inner.rotation.y = to));
    const res = this.flow();
    if (res === 'dirty' && !this.warned) {
      this.warned = true;
      sfx.fail();
      this.ctx.setUi({ stage: '⚠️ ¡El agua llega sin pasar por el filtro! Tiene percloratos.' });
    } else {
      this.publish();
    }
    if (res === 'ok') {
      sfx.success();
      this.stage = 'leaks';
      this.tankFill = 0.2;
      this.publish();
    }
  }

  private spawnLeak() {
    const wetTiles = this.tiles.flat().filter((t) => t.wet && !t.filter && !this.leaks.some((l) => l.tile === t));
    if (!wetTiles.length) return;
    const tile = wetTiles[Math.floor(this.rng() * wetTiles.length)];
    const sprite = makeEmojiSprite('💦', 0.9, '#FF6B5B');
    sprite.position.copy(tile.group.position).add(new THREE.Vector3(0, 1.4, 0));
    const spray = mesh(new THREE.ConeGeometry(0.3, 1.2, 8, 1, true), mat('#7FDBFF', { opacity: 0.6, emissive: '#3CC8FF', ei: 0.5 }), false);
    spray.position.copy(tile.group.position).add(new THREE.Vector3(0, 0.9, 0));
    this.board.add(sprite, spray);
    this.leaks.push({ tile, t: 0, sprite, spray });
    sfx.tap();
  }

  private fixLeak(leak: (typeof this.leaks)[number]) {
    this.board.remove(leak.sprite, leak.spray);
    this.leaks = this.leaks.filter((l) => l !== leak);
    this.leaksFixed++;
    sfx.lock();
    this.publish();
  }

  update(dt: number, t: number) {
    this.elapsed += dt;
    if (this.stage !== 'leaks') return;
    this.leakTimer -= dt;
    const life = this.ctx.difficulty === 'explorer' ? 3.6 : this.ctx.difficulty === 'cadet' ? 3 : 2.4;
    if (this.leakTimer <= 0) {
      this.spawnLeak();
      this.leakTimer = 0.9 + this.rng() * 1.2;
    }
    for (const l of [...this.leaks]) {
      l.t += dt;
      l.spray.scale.setScalar(1 + Math.sin(t * 20) * 0.15);
      l.sprite.scale.setScalar(0.9 + Math.sin(t * 10) * 0.1);
      if (l.t > life) {
        this.board.remove(l.sprite, l.spray);
        this.leaks = this.leaks.filter((x) => x !== l);
        this.leaksMissed++;
        this.tankFill = Math.max(0, this.tankFill - 0.06);
        sfx.fail();
      }
    }
    this.tankFill = Math.min(1, this.tankFill + dt * (0.055 - this.leaks.length * 0.012));
    this.publish();
    if (this.tankFill >= 1) {
      this.stage = 'done';
      for (const l of this.leaks) this.board.remove(l.sprite, l.spray);
      this.leaks = [];
      sfx.success();
      const ratio = this.leaksFixed / Math.max(1, this.leaksFixed + this.leaksMissed);
      const stars = ratio >= 0.85 ? 3 : ratio >= 0.6 ? 2 : 1;
      setTimeout(() => this.ctx.finish(stars), 900);
    }
  }

  camera() {
    return this.site.boardCamera(0, this.cz, (this.n + 1.5) * this.cs);
  }

  exit() {
    this.site.group.remove(this.board);
    this.ctx.game.playerVisible = true;
  }
}
