// M-01 · Invernaderos. Problemática: los domos se quedaron sin luz por la tormenta y
// las plantas se marchitan. Minijuego "Espejos de luz": girar espejos para llevar el
// rayo del colector solar a cada cama de cultivo (reflexión de la luz).

import * as THREE from 'three';
import { makeRng, randInt, shuffle, type Rng } from '../../../shared/rng';
import { sfx } from '../../lib/sound';
import { at, makeDome, makeLabel, makePlant, makeTubeModule, mat, mesh, ownMat } from '../models';
import { glowTexture } from '../world';
import { DX, DZ, Site, type IncidentSpot, type MgContext, type Minigame } from './base';

export class GreenhouseSite extends Site {
  private healthy: THREE.Group[] = [];
  private wilted: THREE.Group[] = [];
  private glassMats: THREE.MeshStandardMaterial[] = [];
  private growLights: THREE.MeshStandardMaterial[] = [];
  private alarm!: THREE.Mesh;
  private building: THREE.Group | null = null;

  build() {
    const domes: [number, number, number][] = [
      [0, -11, 5.2],
      [-9.5, -8.5, 3.4],
      [9.5, -8.5, 3.4],
    ];
    for (const [x, z, r] of domes) {
      const d = makeDome(r, { glass: true });
      const glass = ownMat('#BFF3FF', { opacity: 0.32, rough: 0.1, metal: 0.2 });
      glass.side = THREE.DoubleSide;
      d.dome.material = glass;
      this.glassMats.push(glass);
      at(d.group, x, 0, z);
      this.group.add(d.group);
      this.addCollider(x, z, r + 0.3);
      // Camas de cultivo dentro del domo
      const rows = r > 4 ? 3 : 2;
      for (let i = 0; i < rows; i++) {
        const bz = z - r * 0.45 + (i * r * 0.9) / Math.max(1, rows - 1);
        const bed = mesh(new THREE.BoxGeometry(r * 1.2, 0.5, 0.9), mat('#6E3A22'));
        bed.position.set(x, 0.85, bz);
        this.group.add(bed);
        const h = new THREE.Group();
        const w = new THREE.Group();
        const count = Math.floor(r * 1.2);
        for (let k = 0; k < count; k++) {
          const px = x - r * 0.5 + (k / Math.max(1, count - 1)) * r;
          const p = makePlant(k + i, 1.1);
          p.position.set(px, 1.1, bz);
          h.add(p);
          const wp = makePlant(k + i, 0.7);
          wp.traverse((c) => {
            const m = c as THREE.Mesh;
            if (m.isMesh) m.material = mat(k % 2 ? '#8A6A3A' : '#6E5530');
          });
          wp.position.set(px, 1.1, bz);
          wp.rotation.z = 0.6 * (k % 2 ? 1 : -1);
          w.add(wp);
        }
        this.group.add(h, w);
        this.healthy.push(h);
        this.wilted.push(w);
      }
      // Luces de cultivo (LED rojo + azul)
      const led = ownMat('#552244', { emissive: '#FF4FB0', ei: 0 });
      this.growLights.push(led);
      const bar = mesh(new THREE.BoxGeometry(r * 1.3, 0.1, 0.3), led, false);
      bar.position.set(x, r * 0.75 + 0.6, z);
      this.group.add(bar);
    }
    const sign = makeLabel('Invernaderos', { emoji: '🌱', size: 1, color: '#55DB7A' });
    sign.position.set(0, 9, -11);
    this.group.add(sign);
    const post = mesh(new THREE.CylinderGeometry(0.08, 0.08, 4, 6), mat('#8C8577'));
    post.position.set(6, 2, -3);
    this.group.add(post);
    this.alarm = mesh(new THREE.SphereGeometry(0.3, 10, 8), ownMat('#FF3B30', { emissive: '#FF3B30', ei: 1 }), false);
    this.alarm.position.set(6, 4.2, -3);
    this.group.add(this.alarm);
  }

  setFixed(fixed: boolean) {
    this.fixed = fixed;
    this.healthy.forEach((g) => (g.visible = fixed));
    this.wilted.forEach((g) => (g.visible = !fixed));
    this.glassMats.forEach((m) => {
      m.color.set(fixed ? '#BFF3FF' : '#8A6A55');
      m.opacity = fixed ? 0.3 : 0.55;
    });
    this.growLights.forEach((m) => (m.emissiveIntensity = fixed ? 1.4 : 0));
    this.alarm.visible = !fixed;
  }

  update(_dt: number, t: number) {
    if (!this.fixed) (this.alarm.material as THREE.MeshStandardMaterial).emissiveIntensity = Math.sin(t * 6) > 0 ? 1.6 : 0.1;
  }

  showBuilding(animated: boolean) {
    if (this.building) return;
    const g = makeTubeModule(8, 1.8, '#E8FFF0', '#55DB7A');
    at(g, -13, 0, -17, 0.5);
    this.group.add(g);
    const lbl = makeLabel('Invernadero hidropónico', { emoji: '🌿', size: 0.8, color: '#55DB7A' });
    lbl.position.set(-13, 6, -17);
    this.group.add(lbl);
    this.addCollider(-13, -17, 3.6);
    this.building = g;
    if (animated) {
      g.scale.setScalar(0.01);
      void this.game.animate(1.4, (k) => g.scale.setScalar(Math.max(0.01, k)));
    }
  }

  incidentSpots(): IncidentSpot[] {
    return [
      { pos: this.local(0, -4.5), system: 'food', text: 'Plaga en los cultivos', emoji: '🐛' },
      { pos: this.local(-9.5, -3.5), system: 'food', text: 'Riego atascado', emoji: '🚿' },
    ];
  }

  standSpot() {
    return this.local(0, 11);
  }

  createMinigame(ctx: MgContext): Minigame {
    return new MirrorGame(this, ctx);
  }
}

/* ------------------------------------------------------------------ */
/* Minijuego: Espejos de luz                                            */
/* ------------------------------------------------------------------ */

type Cell = { kind: 'empty' } | { kind: 'mirror'; slash: boolean; mesh: THREE.Group; panel: THREE.Mesh } | { kind: 'rock' } | { kind: 'planter'; lit: boolean; plant: THREE.Group; glow: THREE.Sprite };

class MirrorGame implements Minigame {
  private site: GreenhouseSite;
  private ctx: MgContext;
  private rng: Rng;
  private n: number;
  private cs = 1.5;
  private cz = 3;
  private board = new THREE.Group();
  private cells: Cell[][] = [];
  private srcRow = 0;
  private beamGroup = new THREE.Group();
  private beamMat = new THREE.MeshBasicMaterial({ color: '#FFE38A', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  private round = 0;
  private rounds = 3;
  private planters = 0;
  private elapsed = 0;
  private taps = 0;
  private locked = false;
  private pickables: THREE.Object3D[] = [];

  constructor(site: GreenhouseSite, ctx: MgContext) {
    this.site = site;
    this.ctx = ctx;
    this.rng = makeRng(ctx.seed);
    this.n = ctx.difficulty === 'explorer' ? 5 : ctx.difficulty === 'cadet' ? 6 : 7;
  }

  start() {
    this.board.position.set(0, 0.02, 0);
    this.site.group.add(this.board);
    this.board.add(this.beamGroup);
    this.ctx.game.playerVisible = false;
    this.newRound();
  }

  private pos(c: number, r: number, y = 0) {
    const x0 = -((this.n - 1) / 2) * this.cs;
    const z0 = this.cz - ((this.n - 1) / 2) * this.cs;
    return new THREE.Vector3(x0 + c * this.cs, y, z0 + r * this.cs);
  }

  private clearBoard() {
    for (const ch of [...this.board.children]) if (ch !== this.beamGroup) this.board.remove(ch);
    this.pickables = [];
  }

  private newRound() {
    this.round += 1;
    this.clearBoard();
    const n = this.n;
    const wantPlanters = Math.min(3, this.round);
    const wantMirrors = 1 + this.round + (this.ctx.difficulty === 'commander' ? 1 : 0);
    let path: { c: number; r: number; turn: boolean }[] = [];
    for (let attempt = 0; attempt < 400; attempt++) {
      path = this.randomPath(n);
      const turns = path.filter((p) => p.turn).length;
      const ft = path.findIndex((p) => p.turn);
      const straight = path.filter((p, i) => !p.turn && i > ft).length;
      if (turns >= wantMirrors && straight >= wantPlanters + 1) break;
    }
    this.cells = Array.from({ length: n }, () => Array.from({ length: n }, () => ({ kind: 'empty' }) as Cell));
    // Espejos en las vueltas: orientación correcta según la dirección
    const solution: { c: number; r: number; slash: boolean }[] = [];
    for (let i = 0; i < path.length; i++) {
      const p = path[i];
      if (!p.turn) continue;
      const prev = i === 0 ? { c: -1, r: this.srcRow } : path[i - 1];
      const next = path[i + 1];
      const din = [p.c - prev.c, p.r - prev.r];
      const dout = [next.c - p.c, next.r - p.r];
      // '/' : (dx,dz) → (-dz,-dx)
      const slash = dout[0] === -din[1] && dout[1] === -din[0];
      solution.push({ c: p.c, r: p.r, slash });
    }
    // Las camas van después de la primera vuelta: así el rayo nunca las ilumina desde el inicio
    const firstTurn = path.findIndex((p) => p.turn);
    const straightCells = shuffle(
      this.rng,
      path.filter((p, i) => !p.turn && i > firstTurn),
    );
    const planterCells = straightCells.slice(0, wantPlanters);
    const onPath = new Set(path.map((p) => `${p.c},${p.r}`));
    const free: [number, number][] = [];
    for (let c = 0; c < n; c++) for (let r = 0; r < n; r++) if (!onPath.has(`${c},${r}`)) free.push([c, r]);
    const freeShuffled = shuffle(this.rng, free);
    const decoys = freeShuffled.slice(0, Math.max(1, n - 3 + this.round - 1));
    const rocks = freeShuffled.slice(decoys.length, decoys.length + Math.max(1, n - 4 + this.round));

    // Colector solar (fuente del rayo)
    const src = this.pos(-1, this.srcRow);
    const tower = new THREE.Group();
    const base = mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.2, 8), mat('#D9D4CC'));
    base.position.y = 0.6;
    const lens = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.18, 16), mat('#FFE38A', { emissive: '#FFC93C', ei: 1.2 }), false);
    lens.rotation.z = Math.PI / 2;
    lens.position.set(0.15, 1, 0);
    tower.add(base, lens);
    tower.position.copy(src);
    const sunLbl = makeLabel('Colector solar', { emoji: '☀️', size: 0.5 });
    sunLbl.position.set(src.x - 0.4, 2.1, src.z);
    this.board.add(tower, sunLbl);

    // Base del tablero
    const plate = mesh(new THREE.BoxGeometry(n * this.cs + 0.3, 0.06, n * this.cs + 0.3), mat('#7A3F27'));
    plate.position.copy(this.pos((n - 1) / 2, (n - 1) / 2, 0.01));
    this.board.add(plate);
    for (let c = 0; c < n; c++)
      for (let r = 0; r < n; r++) {
        const tile = mesh(new THREE.BoxGeometry(this.cs - 0.1, 0.05, this.cs - 0.1), mat((c + r) % 2 ? '#B85A36' : '#A9502F'));
        tile.position.copy(this.pos(c, r, 0.05));
        this.board.add(tile);
      }

    const addMirror = (c: number, r: number, slash: boolean) => {
      const g = new THREE.Group();
      const post = mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.7, 6), mat('#8C8577'));
      post.position.y = 0.35;
      const panel = mesh(new THREE.BoxGeometry(1.15, 0.85, 0.08), mat('#DDEBFF', { metal: 0.9, rough: 0.12, emissive: '#6FA8FF', ei: 0.15 }));
      panel.position.y = 0.95;
      panel.rotation.y = slash ? Math.PI / 4 : -Math.PI / 4;
      const back = mesh(new THREE.BoxGeometry(1.2, 0.9, 0.04), mat('#4B4675'));
      back.position.set(0, 0, -0.06);
      panel.add(back);
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.6, 8), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.y = 0.8;
      g.add(post, panel, hit);
      g.position.copy(this.pos(c, r, 0.05));
      g.userData.cell = [c, r];
      this.board.add(g);
      this.pickables.push(g);
      this.cells[c][r] = { kind: 'mirror', slash, mesh: g, panel };
    };
    solution.forEach((s, i) => {
      // El primer espejo siempre empieza mal orientado; los demás, casi siempre
      const flip = i === 0 || this.rng() < 0.7;
      addMirror(s.c, s.r, flip ? !s.slash : s.slash);
    });
    for (const [c, r] of decoys) addMirror(c, r, this.rng() < 0.5);
    for (const [c, r] of rocks) {
      const rock = mesh(new THREE.DodecahedronGeometry(0.55, 0), mat('#8E3F25'));
      rock.scale.y = 0.7;
      rock.position.copy(this.pos(c, r, 0.4));
      const dust = mesh(new THREE.ConeGeometry(0.7, 0.5, 7), mat('#C98A62'));
      dust.position.copy(this.pos(c, r, 0.3));
      this.board.add(rock, dust);
      this.cells[c][r] = { kind: 'rock' };
    }
    for (const p of planterCells) {
      const g = new THREE.Group();
      const box = mesh(new THREE.BoxGeometry(1.1, 0.4, 1.1), mat('#6E3A22'));
      box.position.y = 0.2;
      const plant = makePlant(p.c + p.r, 1);
      plant.position.y = 0.4;
      plant.scale.setScalar(0.8);
      plant.rotation.z = 0.5;
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#FFE38A', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
      glow.scale.set(2.6, 2.6, 1);
      glow.position.y = 0.8;
      g.add(box, plant, glow);
      g.position.copy(this.pos(p.c, p.r, 0.05));
      this.board.add(g);
      this.cells[p.c][p.r] = { kind: 'planter', lit: false, plant, glow };
    }
    this.planters = planterCells.length;
    this.locked = false;
    // Si por casualidad ya estaba resuelto, desordenar otro espejo del camino
    for (let tries = 0; tries < 8 && this.planters > 0 && this.trace() === this.planters; tries++) {
      const s = solution[Math.floor(this.rng() * solution.length)];
      const cell = this.cells[s.c][s.r];
      if (cell.kind === 'mirror') {
        cell.slash = !cell.slash;
        cell.panel.rotation.y = cell.slash ? Math.PI / 4 : -Math.PI / 4;
      }
    }
    this.trace();
    this.publish();
    if (this.round > 1) sfx.join();
  }

  /** Camino aleatorio que entra por el oeste y sale por cualquier borde. */
  private randomPath(n: number) {
    this.srcRow = randInt(this.rng, 0, n - 1);
    const path: { c: number; r: number; turn: boolean }[] = [];
    const seen = new Set<string>();
    let c = -1;
    let r = this.srcRow;
    let d = 0;
    for (let steps = 0; steps < n * n; steps++) {
      const nc = c + DX[d];
      const nr = r + DZ[d];
      if (nc < 0 || nr < 0 || nc >= n || nr >= n) break;
      if (seen.has(`${nc},${nr}`)) break;
      c = nc;
      r = nr;
      seen.add(`${c},${r}`);
      const options: number[] = [];
      for (const nd of [(d + 1) % 4, (d + 3) % 4]) {
        const tc = c + DX[nd];
        const tr = r + DZ[nd];
        if (tc >= 0 && tr >= 0 && tc < n && tr < n && !seen.has(`${tc},${tr}`)) options.push(nd);
      }
      const ahead = c + DX[d];
      const aheadR = r + DZ[d];
      const aheadOk = ahead >= 0 && aheadR >= 0 && ahead < n && aheadR < n && !seen.has(`${ahead},${aheadR}`);
      const wantTurn = steps > 0 && options.length > 0 && (this.rng() < 0.42 || (!aheadOk && path.length < n * 2));
      if (wantTurn) {
        d = options[Math.floor(this.rng() * options.length)];
        path.push({ c, r, turn: true });
      } else {
        path.push({ c, r, turn: false });
      }
    }
    // La última celda no puede ser vuelta (no tendría salida definida)
    if (path.length && path[path.length - 1].turn) path[path.length - 1].turn = false;
    return path;
  }

  private trace() {
    for (const ch of [...this.beamGroup.children]) this.beamGroup.remove(ch);
    const pts: THREE.Vector3[] = [this.pos(-1, this.srcRow, 1)];
    pts[0].x += 0.3;
    let c = -1;
    let r = this.srcRow;
    let dx = 1;
    let dz = 0;
    const litNow = new Set<string>();
    for (let guard = 0; guard < this.n * this.n * 4; guard++) {
      c += dx;
      r += dz;
      if (c < 0 || r < 0 || c >= this.n || r >= this.n) {
        const end = this.pos(c - dx * 0.45, r - dz * 0.45, 1);
        pts.push(end);
        break;
      }
      const cell = this.cells[c][r];
      if (cell.kind === 'rock') {
        pts.push(this.pos(c - dx * 0.35, r - dz * 0.35, 1));
        break;
      }
      if (cell.kind === 'planter') litNow.add(`${c},${r}`);
      if (cell.kind === 'mirror') {
        pts.push(this.pos(c, r, 1));
        if (cell.slash) [dx, dz] = [-dz, -dx];
        else [dx, dz] = [dz, dx];
      }
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const len = a.distanceTo(b);
      if (len < 0.01) continue;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, len), this.beamMat);
      seg.position.copy(a).add(b).multiplyScalar(0.5);
      seg.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
      this.beamGroup.add(seg);
      const glow = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, len), new THREE.MeshBasicMaterial({ color: '#FFC93C', transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.position.copy(seg.position);
      glow.rotation.y = seg.rotation.y;
      this.beamGroup.add(glow);
    }
    let lit = 0;
    for (let cc = 0; cc < this.n; cc++)
      for (let rr = 0; rr < this.n; rr++) {
        const cell = this.cells[cc][rr];
        if (cell.kind !== 'planter') continue;
        const on = litNow.has(`${cc},${rr}`);
        if (on && !cell.lit) sfx.pop();
        cell.lit = on;
        if (on) lit++;
      }
    return lit;
  }

  private publish() {
    const lit = this.countLit();
    this.ctx.setUi({
      title: 'Espejos de luz',
      stage: `Ronda ${this.round} de ${this.rounds}`,
      help: 'Toca un espejo para girarlo. Lleva el rayo del ☀️ colector a todas las camas de cultivo 🌱. Las rocas con polvo bloquean la luz.',
      bars: [{ label: 'Camas con luz', value: this.planters ? lit / this.planters : 0, color: '#55DB7A', text: `${lit}/${this.planters}` }],
      buttons: [],
    });
  }

  private countLit() {
    let lit = 0;
    for (const col of this.cells) for (const cell of col) if (cell.kind === 'planter' && cell.lit) lit++;
    return lit;
  }

  tap(ray: THREE.Raycaster) {
    if (this.locked) return;
    const hits = ray.intersectObjects(this.pickables, true);
    if (!hits.length) return;
    let o: THREE.Object3D | null = hits[0].object;
    while (o && !o.userData.cell) o = o.parent;
    if (!o) return;
    const [c, r] = o.userData.cell as [number, number];
    const cell = this.cells[c][r];
    if (cell.kind !== 'mirror') return;
    cell.slash = !cell.slash;
    this.taps++;
    sfx.select();
    const from = cell.panel.rotation.y;
    const to = cell.slash ? Math.PI / 4 : -Math.PI / 4;
    void this.ctx.game.animate(0.18, (k) => (cell.panel.rotation.y = from + (to - from) * k));
    const lit = this.trace();
    this.publish();
    if (lit === this.planters) {
      this.locked = true;
      sfx.success();
      for (const col of this.cells)
        for (const cl of col)
          if (cl.kind === 'planter') {
            const p = cl.plant;
            void this.ctx.game.animate(0.8, (k) => {
              p.scale.setScalar(0.8 + k * 0.8);
              p.rotation.z = 0.5 * (1 - k);
            });
          }
      setTimeout(() => {
        if (this.round >= this.rounds) this.done();
        else this.newRound();
      }, 1500);
    }
  }

  private done() {
    const par = this.ctx.difficulty === 'explorer' ? 70 : this.ctx.difficulty === 'cadet' ? 90 : 110;
    const stars = this.elapsed < par ? 3 : this.elapsed < par * 2 ? 2 : 1;
    this.ctx.finish(stars);
  }

  update(dt: number, t: number) {
    if (!this.locked) this.elapsed += dt;
    this.beamMat.opacity = 0.75 + Math.sin(t * 12) * 0.15;
    for (const col of this.cells)
      for (const cell of col)
        if (cell.kind === 'planter') {
          const m = cell.glow.material as THREE.SpriteMaterial;
          m.opacity += ((cell.lit ? 0.9 : 0) - m.opacity) * Math.min(1, dt * 6);
        }
  }

  camera() {
    return this.site.boardCamera(0, this.cz, this.n * this.cs);
  }

  exit() {
    this.site.group.remove(this.board);
    this.ctx.game.playerVisible = true;
  }
}
