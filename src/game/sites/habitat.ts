// M-05 · Zona de construcción. Problemática: la nave con colonos viene en camino y el
// terreno está vacío y agrietado. Minijuego "Constructor de módulos": acomodar todas las
// piezas del hábitat sobre el suelo firme, conectadas con la esclusa (pensamiento espacial).

import * as THREE from 'three';
import { makeRng, shuffle, type Rng } from '../../../shared/rng';
import { sfx } from '../../lib/sound';
import { toast } from '../store';
import { at, makeDome, makeEmojiSprite, makeLabel, makeTubeModule, mat, mesh, ownMat } from '../models';
import { DX, DZ, Site, type IncidentSpot, type MgContext, type Minigame } from './base';

interface PieceDef {
  id: string;
  label: string;
  emoji: string;
  color: string;
  cells: [number, number][];
}

const PIECES: PieceDef[] = [
  { id: 'dorm', label: 'Dormitorios', emoji: '🛏️', color: '#4C6FFF', cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  { id: 'lab', label: 'Laboratorio', emoji: '🔬', color: '#A57CFF', cells: [[0, 0], [1, 0], [2, 0]] },
  { id: 'kitchen', label: 'Cocina', emoji: '🍲', color: '#FF9A3C', cells: [[0, 0], [1, 0]] },
  { id: 'farm', label: 'Huerto', emoji: '🌱', color: '#55DB7A', cells: [[0, 0], [1, 0], [0, 1]] },
  { id: 'gym', label: 'Gimnasio', emoji: '🏋️', color: '#FF7EB6', cells: [[0, 0], [1, 0], [2, 0], [1, 1]] },
  { id: 'store', label: 'Bodega', emoji: '📦', color: '#FFC93C', cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
];

function rotateCells(cells: [number, number][], rot: number): [number, number][] {
  let out = cells.map(([c, r]) => [c, r] as [number, number]);
  for (let i = 0; i < rot; i++) out = out.map(([c, r]) => [-r, c]);
  const minC = Math.min(...out.map((p) => p[0]));
  const minR = Math.min(...out.map((p) => p[1]));
  return out.map(([c, r]) => [c - minC, r - minR]);
}

export class HabitatSite extends Site {
  readonly cs = 1.45;
  readonly cz = 0.5;
  private pad!: THREE.Mesh;
  private cracks: THREE.Group = new THREE.Group();
  private finished: THREE.Group | null = null;
  lander = new THREE.Group();
  private warn!: THREE.Mesh;
  private building: THREE.Group | null = null;
  keptBoard: THREE.Group | null = null;

  build() {
    this.pad = mesh(new THREE.BoxGeometry(12.4, 0.12, 12.4), mat('#8C8577', { rough: 0.95 }));
    this.pad.position.set(0, 0.06, this.cz);
    this.group.add(this.pad);
    // Grietas decorativas del estado "roto"
    const crackM = mat('#3A1A10');
    for (let i = 0; i < 9; i++) {
      const crack = mesh(new THREE.BoxGeometry(0.12, 0.05, 2 + (i % 3)), crackM, false);
      crack.position.set(-5 + ((i * 37) % 10), 0.14, this.cz - 5 + ((i * 53) % 10));
      crack.rotation.y = i * 0.9;
      this.cracks.add(crack);
    }
    this.group.add(this.cracks);
    // Impresora 3D (pórtico)
    const gantryM = mat('#FFC93C', { rough: 0.5 });
    for (const x of [-7.5, 7.5]) {
      const post = mesh(new THREE.BoxGeometry(0.4, 6, 0.4), gantryM);
      post.position.set(x, 3, -8);
      this.group.add(post);
      this.addCollider(x, -8, 0.6);
    }
    const beam = mesh(new THREE.BoxGeometry(15.4, 0.5, 0.5), gantryM);
    beam.position.set(0, 6, -8);
    const head = mesh(new THREE.BoxGeometry(1, 1, 1), mat('#4B4675'));
    head.position.set(2, 5.3, -8);
    const nozzle = mesh(new THREE.ConeGeometry(0.3, 0.7, 8), mat('#FF6B5B', { emissive: '#FF6B5B', ei: 0.6 }));
    nozzle.rotation.x = Math.PI;
    nozzle.position.set(2, 4.5, -8);
    this.group.add(beam, head, nozzle);
    // Cajas de carga
    for (let i = 0; i < 4; i++) {
      const crate = mesh(new THREE.BoxGeometry(1.4, 1.2, 1.4), mat(i % 2 ? '#D9D4CC' : '#B7C4D6'));
      crate.position.set(-10 + (i % 2) * 1.6, 0.6 + Math.floor(i / 2) * 1.2, -10);
      this.group.add(crate);
    }
    this.addCollider(-9.2, -10, 1.6);
    const sign = makeLabel('Zona de construcción', { emoji: '🏗️', size: 1, color: '#FF7A59' });
    sign.position.set(0, 8.6, -8);
    this.group.add(sign);
    const post = mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 6), mat('#8C8577'));
    post.position.set(7.6, 1.6, 6);
    this.group.add(post);
    this.warn = mesh(new THREE.SphereGeometry(0.28, 10, 8), ownMat('#FF3B30', { emissive: '#FF3B30', ei: 1 }), false);
    this.warn.position.set(7.6, 3.4, 6);
    this.group.add(this.warn);

    // Nave de colonos (espera en el cielo hasta que haya refugio)
    const hull = mesh(new THREE.CylinderGeometry(1.6, 2.2, 3, 10), mat('#F4F1EA'));
    const top = mesh(new THREE.ConeGeometry(1.6, 1.6, 10), mat('#FF7A59'));
    top.position.y = 2.3;
    const flame = mesh(new THREE.ConeGeometry(0.9, 2.4, 10), mat('#FFC93C', { emissive: '#FF9A3C', ei: 1.5, opacity: 0.8 }), false);
    flame.rotation.x = Math.PI;
    flame.position.y = -2.6;
    flame.name = 'flame';
    for (let i = 0; i < 3; i++) {
      const leg = mesh(new THREE.CylinderGeometry(0.08, 0.08, 2, 5), mat('#8C8577'));
      const a = (i / 3) * Math.PI * 2;
      leg.position.set(Math.cos(a) * 1.9, -1.8, Math.sin(a) * 1.9);
      this.lander.add(leg);
    }
    this.lander.add(hull, top, flame);
    this.group.add(this.lander);
  }

  setFixed(fixed: boolean) {
    this.fixed = fixed;
    this.cracks.visible = !fixed;
    this.warn.visible = !fixed;
    if (fixed && !this.keptBoard && !this.finished) {
      const g = new THREE.Group();
      const d = makeDome(2.4, { color: '#D9A27E' });
      at(d.group, -2, 0, this.cz - 1.2);
      const t = makeTubeModule(5, 1.2, '#EDEAE4', '#FF7A59');
      at(t, 2.2, 0, this.cz + 2.4, 0.2);
      g.add(d.group, t);
      this.group.add(g);
      this.finished = g;
    }
    if (this.finished) this.finished.visible = fixed;
    this.lander.position.set(10, fixed ? 2.1 : 40, -2);
    const flame = this.lander.getObjectByName('flame');
    if (flame) flame.visible = !fixed;
  }

  update(_dt: number, t: number) {
    if (!this.fixed) {
      this.lander.position.y = 40 + Math.sin(t * 0.8) * 1.2;
      (this.warn.material as THREE.MeshStandardMaterial).emissiveIntensity = Math.sin(t * 5) > 0 ? 1.5 : 0.1;
    }
  }

  landShip() {
    const from = this.lander.position.y;
    void this.game.animate(3, (k) => (this.lander.position.y = from + (2.1 - from) * k)).then(() => {
      const flame = this.lander.getObjectByName('flame');
      if (flame) flame.visible = false;
      sfx.success();
    });
  }

  showBuilding(animated: boolean) {
    if (this.building) return;
    const g = new THREE.Group();
    const m = makeTubeModule(6, 1.5, '#D9A27E', '#FF7A59');
    g.add(m);
    at(g, -12.5, 0, -15, 0.3);
    this.group.add(g);
    this.addCollider(-12.5, -15, 3.2);
    const lbl = makeLabel('Módulo impreso en 3D', { emoji: '🏗️', size: 0.8, color: '#FF7A59' });
    lbl.position.set(-12.5, 5.2, -15);
    this.group.add(lbl);
    this.building = g;
    if (animated) {
      g.scale.setScalar(0.01);
      void this.game.animate(1.4, (k) => g.scale.setScalar(Math.max(0.01, k)));
    }
  }

  incidentSpots(): IncidentSpot[] {
    return [
      { pos: this.local(0, 7.5), system: 'habitat', text: 'Fuga de aire en el módulo', emoji: '🫧' },
      { pos: this.local(-9, -6.5), system: 'habitat', text: 'Grieta en el terreno', emoji: '🧱' },
    ];
  }

  standSpot() {
    return this.local(0, 10.5);
  }

  createMinigame(ctx: MgContext): Minigame {
    return new BuilderGame(this, ctx);
  }
}

/* ------------------------------------------------------------------ */
/* Minijuego: Constructor de módulos                                    */
/* ------------------------------------------------------------------ */

interface PieceState {
  def: PieceDef;
  rot: number;
  at: [number, number] | null; // celda de origen (esquina mínima)
  group: THREE.Group | null;
}

class BuilderGame implements Minigame {
  private site: HabitatSite;
  private ctx: MgContext;
  private rng: Rng;
  private n: number;
  private board = new THREE.Group();
  private stable: boolean[][] = [];
  private occ: (string | null)[][] = [];
  private airlock: [number, number] = [0, 0];
  private pieces: PieceState[] = [];
  private selected: string | null = null;
  private tiles: THREE.Object3D[] = [];
  private ghost = new THREE.Group();
  private elapsed = 0;
  private mistakes = 0;
  private done = false;

  constructor(site: HabitatSite, ctx: MgContext) {
    this.site = site;
    this.ctx = ctx;
    this.rng = makeRng(ctx.seed);
    this.n = ctx.difficulty === 'explorer' ? 6 : ctx.difficulty === 'cadet' ? 7 : 8;
  }

  private pos(c: number, r: number, y = 0) {
    const cs = this.cs;
    const x0 = -((this.n - 1) / 2) * cs;
    const z0 = this.site.cz - ((this.n - 1) / 2) * cs;
    return new THREE.Vector3(x0 + c * cs, y, z0 + r * cs);
  }
  private get cs() {
    return this.site.cs * (8 / Math.max(8, this.n + 1)) * (this.n <= 6 ? 1.25 : this.n === 7 ? 1.1 : 1);
  }

  start() {
    this.site.group.add(this.board);
    this.board.add(this.ghost);
    this.ctx.game.playerVisible = false;
    this.generate();
    this.publish();
  }

  private generate() {
    const n = this.n;
    const count = this.ctx.difficulty === 'explorer' ? 4 : this.ctx.difficulty === 'cadet' ? 5 : 6;
    const defs = PIECES.slice(0, count);
    for (let attempt = 0; attempt < 300; attempt++) {
      const occ: (string | null)[][] = Array.from({ length: n }, () => Array(n).fill(null));
      const air: [number, number] = [Math.floor(n / 2) + (this.rng() < 0.5 ? -1 : 0), n - 1];
      occ[air[0]][air[1]] = 'airlock';
      let ok = true;
      for (const def of shuffle(this.rng, defs)) {
        const options: { rot: number; at: [number, number] }[] = [];
        for (let rot = 0; rot < 4; rot++) {
          const cells = rotateCells(def.cells, rot);
          for (let c = 0; c < n; c++)
            for (let r = 0; r < n; r++) {
              let fits = true;
              let touches = false;
              for (const [dc, dr] of cells) {
                const cc = c + dc;
                const rr = r + dr;
                if (cc >= n || rr >= n || occ[cc][rr]) {
                  fits = false;
                  break;
                }
                for (let d = 0; d < 4; d++) {
                  const nc = cc + DX[d];
                  const nr = rr + DZ[d];
                  if (nc >= 0 && nr >= 0 && nc < n && nr < n && occ[nc][nr]) touches = true;
                }
              }
              if (fits && touches) options.push({ rot, at: [c, r] });
            }
        }
        if (!options.length) {
          ok = false;
          break;
        }
        const pick = options[Math.floor(this.rng() * options.length)];
        for (const [dc, dr] of rotateCells(def.cells, pick.rot)) occ[pick.at[0] + dc][pick.at[1] + dr] = def.id;
      }
      if (!ok) continue;
      this.stable = Array.from({ length: n }, (_, c) => Array.from({ length: n }, (_, r) => !!occ[c][r]));
      // Un par de celdas firmes extra para dar opciones
      const extras: [number, number][] = [];
      for (let c = 0; c < n; c++)
        for (let r = 0; r < n; r++) {
          if (this.stable[c][r]) continue;
          for (let d = 0; d < 4; d++) {
            const nc = c + DX[d];
            const nr = r + DZ[d];
            if (nc >= 0 && nr >= 0 && nc < n && nr < n && occ[nc][nr]) {
              extras.push([c, r]);
              break;
            }
          }
        }
      for (const [c, r] of shuffle(this.rng, extras).slice(0, this.ctx.difficulty === 'commander' ? 1 : 2)) this.stable[c][r] = true;
      this.airlock = air;
      break;
    }
    if (!this.stable.length) {
      // Respaldo (muy improbable): todo el terreno firme
      this.stable = Array.from({ length: n }, () => Array(n).fill(true));
      this.airlock = [Math.floor(n / 2), n - 1];
    }
    this.occ = Array.from({ length: n }, () => Array(n).fill(null));
    this.occ[this.airlock[0]][this.airlock[1]] = 'airlock';
    this.pieces = defs.map((def) => ({ def, rot: 0, at: null, group: null }));
    this.selected = this.pieces[0].def.id;

    // Celdas
    const cs = this.cs;
    for (let c = 0; c < n; c++)
      for (let r = 0; r < n; r++) {
        const st = this.stable[c][r];
        const tile = mesh(new THREE.BoxGeometry(cs - 0.08, 0.1, cs - 0.08), mat(st ? '#C9C2B6' : '#7A3424'));
        tile.position.copy(this.pos(c, r, 0.16));
        tile.userData.cell = [c, r];
        this.board.add(tile);
        this.tiles.push(tile);
        if (!st) {
          const crack = mesh(new THREE.BoxGeometry(0.08, 0.04, cs * 0.8), mat('#2A0F08'), false);
          crack.position.copy(this.pos(c, r, 0.23));
          crack.rotation.y = 0.6 + ((c * 7 + r * 3) % 5) * 0.4;
          this.board.add(crack);
          if ((c + r) % 3 === 0) {
            const rock = mesh(new THREE.DodecahedronGeometry(0.25, 0), mat('#5A2A1A'));
            rock.position.copy(this.pos(c, r, 0.35));
            this.board.add(rock);
          }
        }
      }
    // Esclusa
    const air = new THREE.Group();
    const box = mesh(new THREE.BoxGeometry(cs * 0.9, 1.1, cs * 0.9), mat('#F4F1EA'));
    box.position.y = 0.75;
    const door = mesh(new THREE.BoxGeometry(cs * 0.5, 0.8, 0.05), mat('#FF7A59', { emissive: '#FF7A59', ei: 0.3 }));
    door.position.set(0, 0.6, cs * 0.46);
    const icon = makeEmojiSprite('🚪', 0.8, '#FF7A59');
    icon.position.y = 2;
    air.add(box, door, icon);
    air.position.copy(this.pos(this.airlock[0], this.airlock[1]));
    this.board.add(air);
    const lbl = makeLabel('Esclusa (entrada)', { size: 0.42 });
    lbl.position.copy(this.pos(this.airlock[0], this.airlock[1], 2.8));
    this.board.add(lbl);
  }

  private cellsOf(p: PieceState, at: [number, number], rot = p.rot) {
    return rotateCells(p.def.cells, rot).map(([dc, dr]) => [at[0] + dc, at[1] + dr] as [number, number]);
  }

  private check(p: PieceState, at: [number, number], rot = p.rot): string | null {
    for (const [c, r] of this.cellsOf(p, at, rot)) {
      if (c < 0 || r < 0 || c >= this.n || r >= this.n) return 'La pieza se sale del terreno.';
      if (!this.stable[c][r]) return '¡Ahí hay grietas! Busca suelo firme.';
      const o = this.occ[c][r];
      if (o && o !== p.def.id) return 'Ese espacio ya está ocupado.';
    }
    return null;
  }

  /** Busca una posición válida para que la pieza cubra la celda tocada. */
  private fitAt(p: PieceState, cell: [number, number]): { at: [number, number]; err: string | null } {
    const cells = rotateCells(p.def.cells, p.rot);
    let firstErr: string | null = null;
    let firstAt: [number, number] = cell;
    // Preferir que la celda tocada sea la "central" de la pieza
    const cx = cells.reduce((s, c) => s + c[0], 0) / cells.length;
    const cz = cells.reduce((s, c) => s + c[1], 0) / cells.length;
    const ordered = [...cells].sort((a, b) => Math.hypot(a[0] - cx, a[1] - cz) - Math.hypot(b[0] - cx, b[1] - cz));
    for (const [dc, dr] of ordered) {
      const at: [number, number] = [cell[0] - dc, cell[1] - dr];
      const err = this.check(p, at);
      if (!err) return { at, err: null };
      if (firstErr === null) {
        firstErr = err;
        firstAt = at;
      }
    }
    return { at: firstAt, err: firstErr };
  }

  private place(p: PieceState, at: [number, number]) {
    this.lift(p);
    p.at = at;
    for (const [c, r] of this.cellsOf(p, at)) this.occ[c][r] = p.def.id;
    const g = new THREE.Group();
    const cs = this.cs;
    const cells = this.cellsOf(p, at);
    const m = mat(p.def.color, { rough: 0.6 });
    for (const [c, r] of cells) {
      const block = mesh(new THREE.BoxGeometry(cs * 0.92, 1, cs * 0.92), m);
      block.position.copy(this.pos(c, r, 0.72));
      g.add(block);
      const roof = mesh(new THREE.CylinderGeometry(cs * 0.36, cs * 0.44, 0.25, 8), mat('#F4F1EA'));
      roof.position.copy(this.pos(c, r, 1.34));
      g.add(roof);
      // Uniones con celdas vecinas de la misma pieza
      for (let d = 0; d < 2; d++) {
        const nc = c + DX[d];
        const nr = r + DZ[d];
        if (cells.some(([a, b]) => a === nc && b === nr)) {
          const bridge = mesh(new THREE.BoxGeometry(d === 0 ? cs * 0.3 : cs * 0.6, 0.8, d === 0 ? cs * 0.6 : cs * 0.3), m);
          bridge.position.copy(this.pos(c + DX[d] / 2, r + DZ[d] / 2, 0.62));
          g.add(bridge);
        }
      }
    }
    if (p.def.id === 'dorm') {
      const center = this.pos(at[0] + 0.5, at[1] + 0.5, 1.2);
      const dome = mesh(new THREE.SphereGeometry(cs * 0.85, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), mat('#BFF3FF', { opacity: 0.6, rough: 0.1 }));
      dome.position.copy(center);
      g.add(dome);
    }
    const cx = cells.reduce((s, c) => s + c[0], 0) / cells.length;
    const cz = cells.reduce((s, c) => s + c[1], 0) / cells.length;
    const icon = makeEmojiSprite(p.def.emoji, 0.85, p.def.color);
    icon.position.copy(this.pos(cx, cz, 2.3));
    g.add(icon);
    g.userData.piece = p.def.id;
    g.scale.y = 0.01;
    this.board.add(g);
    void this.ctx.game.animate(0.25, (k) => (g.scale.y = Math.max(0.01, k)));
    p.group = g;
  }

  private lift(p: PieceState) {
    if (p.group) this.board.remove(p.group);
    p.group = null;
    if (p.at) for (const [c, r] of this.cellsOf(p, p.at)) if (this.occ[c]?.[r] === p.def.id) this.occ[c][r] = null;
    p.at = null;
  }

  private connected() {
    const n = this.n;
    const seen = new Set<string>();
    const q: [number, number][] = [this.airlock];
    seen.add(this.airlock.join(','));
    while (q.length) {
      const [c, r] = q.shift()!;
      for (let d = 0; d < 4; d++) {
        const nc = c + DX[d];
        const nr = r + DZ[d];
        if (nc < 0 || nr < 0 || nc >= n || nr >= n || !this.occ[nc][nr]) continue;
        const k = `${nc},${nr}`;
        if (seen.has(k)) continue;
        seen.add(k);
        q.push([nc, nr]);
      }
    }
    let total = 0;
    for (let c = 0; c < n; c++) for (let r = 0; r < n; r++) if (this.occ[c][r]) total++;
    return seen.size === total;
  }

  private publish(msg?: string) {
    const placed = this.pieces.filter((p) => p.at).length;
    this.ctx.setUi({
      title: 'Constructor de módulos',
      stage: msg ?? `Piezas colocadas: ${placed} de ${this.pieces.length}`,
      help: 'Elige una pieza abajo y toca el terreno firme (gris) para colocarla. Gírala con ⟳ (o la tecla R). Toca una pieza puesta para levantarla. Todo debe quedar conectado con la 🚪 esclusa.',
      bars: [{ label: 'Módulo construido', value: placed / this.pieces.length, color: '#FF7A59', text: `${placed}/${this.pieces.length}` }],
      buttons: [{ id: 'rotate', label: 'Girar', icon: 'refresh' }],
      pieces: this.pieces.map((p) => ({ id: p.def.id, label: `${p.def.label} (${p.def.cells.length})`, emoji: p.def.emoji, placed: !!p.at, selected: this.selected === p.def.id })),
    });
  }

  piece(id: string) {
    this.selected = id;
    sfx.select();
    this.ghost.clear();
    this.publish();
  }

  button(id: string, down: boolean) {
    if (id !== 'rotate' || !down || this.done) return;
    const p = this.pieces.find((x) => x.def.id === this.selected);
    if (!p) return;
    sfx.select();
    if (p.at) {
      const at = p.at;
      const newRot = (p.rot + 1) % 4;
      this.lift(p);
      p.rot = newRot;
      const fit = this.fitAt(p, at);
      if (!fit.err) this.place(p, fit.at);
      else this.publish('Al girarla ya no cabía: colócala otra vez.');
    } else {
      p.rot = (p.rot + 1) % 4;
    }
    this.ghost.clear();
    this.publish();
    this.checkWin();
  }

  private cellFromRay(ray: THREE.Raycaster): [number, number] | null {
    const placedGroups = this.pieces.filter((p) => p.group).map((p) => p.group!) as THREE.Object3D[];
    const hits = ray.intersectObjects([...placedGroups, ...this.tiles], true);
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o && !o.userData.cell && !o.userData.piece) o = o.parent;
      if (!o) continue;
      if (o.userData.piece) {
        const p = this.pieces.find((x) => x.def.id === o!.userData.piece);
        if (p?.at) {
          // Celda más cercana de esa pieza al punto tocado
          const local = this.board.worldToLocal(h.point.clone());
          let best: [number, number] = p.at;
          let bd = Infinity;
          for (const cell of this.cellsOf(p, p.at)) {
            const d = this.pos(cell[0], cell[1]).distanceTo(new THREE.Vector3(local.x, 0, local.z));
            if (d < bd) {
              bd = d;
              best = cell;
            }
          }
          return best;
        }
      }
      if (o.userData.cell) return o.userData.cell as [number, number];
    }
    return null;
  }

  tap(ray: THREE.Raycaster) {
    if (this.done) return;
    const cell = this.cellFromRay(ray);
    if (!cell) return;
    const occupant = this.occ[cell[0]][cell[1]];
    if (occupant && occupant !== 'airlock') {
      const p = this.pieces.find((x) => x.def.id === occupant)!;
      this.lift(p);
      this.selected = p.def.id;
      sfx.pop();
      this.publish(`Levantaste: ${p.def.emoji} ${p.def.label}`);
      return;
    }
    const p = this.pieces.find((x) => x.def.id === this.selected) ?? this.pieces.find((x) => !x.at);
    if (!p) return;
    const fit = this.fitAt(p, cell);
    if (fit.err) {
      this.mistakes++;
      sfx.fail();
      this.publish(fit.err);
      return;
    }
    this.place(p, fit.at);
    sfx.lock();
    this.ghost.clear();
    const next = this.pieces.find((x) => !x.at);
    this.selected = next ? next.def.id : null;
    this.publish();
    this.checkWin();
  }

  hover(ray: THREE.Raycaster) {
    this.ghost.clear();
    if (this.done) return;
    const p = this.pieces.find((x) => x.def.id === this.selected);
    if (!p || p.at) return;
    const hits = ray.intersectObjects(this.tiles, false);
    if (!hits.length) return;
    const cell = hits[0].object.userData.cell as [number, number];
    const fit = this.fitAt(p, cell);
    const color = fit.err ? '#FF6B5B' : '#55DB7A';
    for (const [c, r] of this.cellsOf(p, fit.at)) {
      if (c < 0 || r < 0 || c >= this.n || r >= this.n) continue;
      const g = mesh(new THREE.BoxGeometry(this.cs * 0.9, 0.9, this.cs * 0.9), mat(color, { opacity: 0.45, emissive: color, ei: 0.4 }), false);
      g.position.copy(this.pos(c, r, 0.65));
      this.ghost.add(g);
    }
  }

  private checkWin() {
    if (this.pieces.some((p) => !p.at)) return;
    if (!this.connected()) {
      sfx.fail();
      this.publish('Hay piezas que no se conectan con la esclusa: ¡el aire no llegaría!');
      toast('Todas las piezas deben tocarse para formar un solo módulo.', '🔗', 'bad');
      return;
    }
    this.done = true;
    sfx.success();
    this.publish('¡Módulo completo! Imprimiendo el escudo de regolito…');
    // Escudo de regolito impreso encima de cada pieza
    const shell = new THREE.Group();
    for (let c = 0; c < this.n; c++)
      for (let r = 0; r < this.n; r++) {
        if (!this.occ[c][r]) continue;
        const s = mesh(new THREE.SphereGeometry(this.cs * 0.62, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat('#B8693E', { rough: 1 }));
        s.position.copy(this.pos(c, r, 1.3));
        s.scale.y = 0.01;
        shell.add(s);
      }
    this.board.add(shell);
    void this.ctx.game.animate(2, (k) => shell.children.forEach((s, i) => (s.scale.y = Math.max(0.01, Math.min(1, k * 2 - (i / shell.children.length) * 0.9)))));
    this.site.landShip();
    const par = this.ctx.difficulty === 'explorer' ? 80 : this.ctx.difficulty === 'cadet' ? 110 : 140;
    const stars = this.elapsed < par && this.mistakes < 4 ? 3 : this.elapsed < par * 1.8 ? 2 : 1;
    setTimeout(() => this.ctx.finish(stars), 3200);
  }

  update(dt: number) {
    if (!this.done) this.elapsed += dt;
  }

  camera() {
    const size = this.n * this.cs;
    return { pos: this.site.local(0, this.site.cz + size * 0.85, size * 1.3), target: this.site.local(0, this.site.cz + size * 0.05, 0) };
  }

  exit(completed: boolean) {
    this.ghost.clear();
    if (completed) this.site.keptBoard = this.board;
    else this.site.group.remove(this.board);
    this.ctx.game.playerVisible = true;
  }
}
