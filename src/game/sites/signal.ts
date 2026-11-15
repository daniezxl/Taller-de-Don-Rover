// M-04 · Antena de espacio profundo. Problemática: llega una señal que se repite pero
// revuelta. Minijuego "Sintoniza la señal": apuntar el plato (más fuerte = más cerca)
// y después igualar frecuencia y amplitud de la onda (ondas y frecuencias).

import * as THREE from 'three';
import { makeRng, randInt, type Rng } from '../../../shared/rng';
import { sfx, beep } from '../../lib/sound';
import { toast } from '../store';
import { at, makeLabel, mat, mesh, ownMat } from '../models';
import { Site, type IncidentSpot, type MgContext, type Minigame } from './base';

const Z_AXIS = new THREE.Vector3(0, 0, 1);

export class SignalSite extends Site {
  yoke = new THREE.Group();
  dishPivot = new THREE.Group();
  az = 0.6;
  el = -0.25;
  screenCanvas = document.createElement('canvas');
  screenTex: THREE.CanvasTexture;
  private warn!: THREE.Mesh;
  private rings: THREE.Mesh[] = [];
  private building: THREE.Group | null = null;
  /** El minijuego toma control de la pantalla. */
  screenOwner: 'site' | 'game' = 'site';

  constructor(...args: ConstructorParameters<typeof Site>) {
    super(...args);
    this.screenCanvas.width = 512;
    this.screenCanvas.height = 224;
    this.screenTex = new THREE.CanvasTexture(this.screenCanvas);
    this.screenTex.colorSpace = THREE.SRGBColorSpace;
  }

  build() {
    // Torre y plato
    const base = mesh(new THREE.CylinderGeometry(1.4, 2.2, 4, 8), mat('#D9D4CC'));
    base.position.set(0, 2, -9);
    this.group.add(base);
    this.addCollider(0, -9, 2.4);
    this.yoke.position.set(0, 4.2, -9);
    this.group.add(this.yoke);
    const arm = mesh(new THREE.BoxGeometry(3.6, 0.4, 0.6), mat('#8C8577'));
    arm.position.y = 0.4;
    this.yoke.add(arm);
    this.dishPivot.position.y = 1.4;
    this.yoke.add(this.dishPivot);
    const dish = mesh(new THREE.SphereGeometry(4.6, 24, 6, 0, Math.PI * 2, Math.PI * 0.72, Math.PI * 0.28), mat('#F4F1EA', { rough: 0.4, metal: 0.3, side: THREE.DoubleSide }));
    dish.rotation.x = Math.PI / 2;
    dish.position.z = 4.2;
    this.dishPivot.add(dish);
    const feed = mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 6), mat('#8C8577'));
    feed.rotation.x = Math.PI / 2;
    feed.position.z = 1.4;
    this.dishPivot.add(feed);
    const horn = mesh(new THREE.ConeGeometry(0.35, 0.6, 8), mat('#D06BFF', { emissive: '#D06BFF', ei: 0.6 }));
    horn.rotation.x = -Math.PI / 2;
    horn.position.z = 2.9;
    this.dishPivot.add(horn);
    this.applyAim();

    // Consola con pantalla holográfica
    const console = mesh(new THREE.BoxGeometry(4, 1.1, 1.4), mat('#4B4675'));
    console.position.set(0, 0.55, 3.5);
    this.group.add(console);
    this.addCollider(-1.2, 3.5, 1);
    this.addCollider(1.2, 3.5, 1);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.8), new THREE.MeshBasicMaterial({ map: this.screenTex, transparent: true, opacity: 0.92, side: THREE.DoubleSide, depthWrite: false }));
    screen.position.set(0, 3.4, 3.4);
    this.group.add(screen);
    this.warn = mesh(new THREE.SphereGeometry(0.28, 10, 8), ownMat('#FF3B30', { emissive: '#FF3B30', ei: 1 }), false);
    this.warn.position.set(2.2, 1.3, 3.5);
    this.group.add(this.warn);
    const sign = makeLabel('Antena de espacio profundo', { emoji: '📡', size: 1, color: '#D06BFF' });
    sign.position.set(0, 12, -9);
    this.group.add(sign);

    for (let i = 0; i < 3; i++) {
      const r = mesh(new THREE.TorusGeometry(1.5, 0.06, 6, 28), ownMat('#D06BFF', { emissive: '#D06BFF', ei: 1, opacity: 0.6 }), false);
      r.visible = false;
      this.group.add(r);
      this.rings.push(r);
    }
  }

  applyAim() {
    this.yoke.rotation.y = Math.PI + this.az;
    this.dishPivot.rotation.x = -this.el;
  }

  boresight() {
    const a = Math.PI + this.az;
    return new THREE.Vector3(Math.sin(a) * Math.cos(this.el), Math.sin(this.el), Math.cos(a) * Math.cos(this.el));
  }

  setFixed(fixed: boolean) {
    this.fixed = fixed;
    this.warn.visible = !fixed;
    if (fixed) {
      this.az = -0.3;
      this.el = 0.75;
    } else {
      this.az = 0.6;
      this.el = -0.25;
    }
    this.applyAim();
    this.rings.forEach((r) => (r.visible = fixed));
  }

  drawStatic(t: number) {
    const c = this.screenCanvas.getContext('2d')!;
    const w = this.screenCanvas.width;
    const h = this.screenCanvas.height;
    c.clearRect(0, 0, w, h);
    c.fillStyle = 'rgba(20,10,50,0.85)';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = this.fixed ? '#55DB7A' : '#FF6B5B';
    c.lineWidth = 3;
    c.beginPath();
    for (let x = 0; x < w; x += 4) {
      const y = this.fixed ? h / 2 + Math.sin(x * 0.05 + t * 4) * 40 : h / 2 + (Math.random() - 0.5) * 120 * (0.5 + Math.random() * 0.5);
      if (x === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
    c.font = '700 30px "Space Mono", monospace';
    c.fillStyle = this.fixed ? '#55DB7A' : '#FF6B5B';
    c.fillText(this.fixed ? 'CONECTADO · TIERRA ↔ IXCHEL' : 'SEÑAL DESCONOCIDA · RUIDO', 16, 38);
    this.screenTex.needsUpdate = true;
  }

  private drawT = 0;
  update(dt: number, t: number) {
    if (this.screenOwner === 'site') {
      this.drawT += dt;
      if (this.drawT > 0.12) {
        this.drawT = 0;
        this.drawStatic(t);
      }
    }
    if (!this.fixed) (this.warn.material as THREE.MeshStandardMaterial).emissiveIntensity = Math.sin(t * 5) > 0 ? 1.5 : 0.1;
    else {
      const dir = this.boresight();
      const origin = new THREE.Vector3(0, 5.6, -9);
      this.rings.forEach((r, i) => {
        const k = (t * 0.5 + i / 3) % 1;
        r.position.copy(origin).addScaledVector(dir, 3 + k * 14);
        r.quaternion.setFromUnitVectors(Z_AXIS, dir);
        r.scale.setScalar(1 + k * 2);
        (r.material as THREE.MeshStandardMaterial).opacity = 0.7 * (1 - k);
      });
    }
  }

  showBuilding(animated: boolean) {
    if (this.building) return;
    const g = new THREE.Group();
    const legM = mat('#B7C4D6', { metal: 0.5, rough: 0.4 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const leg = mesh(new THREE.CylinderGeometry(0.1, 0.16, 10, 5), legM);
      leg.position.set(Math.cos(a) * 0.9, 5, Math.sin(a) * 0.9);
      leg.rotation.z = Math.cos(a) * 0.08;
      leg.rotation.x = -Math.sin(a) * 0.08;
      g.add(leg);
    }
    const mini = mesh(new THREE.SphereGeometry(1.6, 16, 4, 0, Math.PI * 2, Math.PI * 0.7, Math.PI * 0.3), mat('#F4F1EA', { side: THREE.DoubleSide }));
    mini.position.y = 10.6;
    mini.rotation.x = 0.6;
    const tip = mesh(new THREE.SphereGeometry(0.25, 8, 6), mat('#D06BFF', { emissive: '#D06BFF', ei: 1.4 }), false);
    tip.position.y = 11.6;
    g.add(mini, tip);
    at(g, 13, 0, -13);
    this.group.add(g);
    this.addCollider(13, -13, 1.4);
    const lbl = makeLabel('Antena de relevo', { emoji: '🛰️', size: 0.8, color: '#D06BFF' });
    lbl.position.set(13, 13, -13);
    this.group.add(lbl);
    this.building = g;
    if (animated) {
      g.scale.setScalar(0.01);
      void this.game.animate(1.4, (k) => g.scale.setScalar(Math.max(0.01, k)));
    }
  }

  incidentSpots(): IncidentSpot[] {
    return [
      { pos: this.local(0, -5.5), system: 'habitat', text: 'Antena desalineada', emoji: '📡' },
      { pos: this.local(-4, 4), system: 'habitat', text: 'Escudo de la consola dañado', emoji: '🛡️' },
    ];
  }

  standSpot() {
    return this.local(0, 9);
  }

  createMinigame(ctx: MgContext): Minigame {
    return new SignalGame(this, ctx);
  }
}

/* ------------------------------------------------------------------ */
/* Minijuego: Sintoniza la señal                                        */
/* ------------------------------------------------------------------ */

class SignalGame implements Minigame {
  private site: SignalSite;
  private ctx: MgContext;
  private rng: Rng;
  private stage: 'aim' | 'tune' | 'done' = 'aim';
  private src = new THREE.Vector3();
  private strength = 0;
  private lockT = 0;
  private beepT = 0;
  private round = 0;
  private rounds = 3;
  private target = { f: 3, a: 2 };
  private mine = { f: 1, a: 1 };
  private elapsed = 0;
  private drawT = 0;
  private matchedT = 0;

  constructor(site: SignalSite, ctx: MgContext) {
    this.site = site;
    this.ctx = ctx;
    this.rng = makeRng(ctx.seed);
  }

  start() {
    this.site.screenOwner = 'game';
    this.site.az = 0;
    this.site.el = 0.05;
    this.site.applyAim();
    const az = (this.rng() * 2 - 1) * 1.3;
    const el = 0.35 + this.rng() * 0.75;
    const a = Math.PI + az;
    this.src.set(Math.sin(a) * Math.cos(el), Math.sin(el), Math.cos(a) * Math.cos(el));
    if (this.src.angleTo(this.site.boresight()) < 0.6) this.src.set(-this.src.x, this.src.y, this.src.z);
    this.ctx.game.playerVisible = false;
    this.publish();
  }

  private publish() {
    if (this.stage === 'aim') {
      this.ctx.setUi({
        title: 'Sintoniza la señal',
        stage: 'Fase 1 · Apunta el plato',
        help: 'Mueve el plato con el joystick o W A S D (o las flechas). Escucha: entre más rápido el pitido, más cerca estás de la señal.',
        joystick: true,
        bars: [{ label: 'Fuerza de la señal', value: this.strength, target: 0.96, color: '#D06BFF', text: `${Math.round(this.strength * 100)}%` }],
        sliders: undefined,
        wave: null,
      });
    } else if (this.stage === 'tune') {
      const match = this.match();
      this.ctx.setUi({
        stage: `Fase 2 · Iguala la onda (${this.round}/${this.rounds})`,
        help: 'Mueve los controles hasta que tu onda (azul) quede encima de la señal (rosa). Más frecuencia = ondas más juntas; más amplitud = ondas más altas.',
        joystick: false,
        bars: [{ label: 'Coincidencia', value: match, target: 1, color: '#D06BFF', text: `${Math.round(match * 100)}%` }],
        sliders: [
          { id: 'f', label: 'Frecuencia', min: 1, max: 8, step: 1, value: this.mine.f, unit: 'Hz' },
          { id: 'a', label: 'Amplitud', min: 1, max: 5, step: 1, value: this.mine.a },
        ],
        wave: { target: this.target, mine: this.mine, match },
      });
    }
  }

  private match() {
    return Math.max(0, 1 - Math.abs(this.mine.f - this.target.f) / 7 * 0.6 - Math.abs(this.mine.a - this.target.a) / 4 * 0.4);
  }

  private newTarget() {
    let f = this.target.f;
    let a = this.target.a;
    while (f === this.target.f || Math.abs(f - this.mine.f) < 2) f = randInt(this.rng, 1, 8);
    while (a === this.target.a && this.round > 1) a = randInt(this.rng, 1, 5);
    if (this.round === 1) a = randInt(this.rng, 2, 5);
    this.target = { f, a };
  }

  slider(id: string, v: number) {
    if (this.stage !== 'tune') return;
    if (id === 'f') this.mine.f = v;
    if (id === 'a') this.mine.a = v;
    sfx.tick();
    this.publish();
  }

  update(dt: number, t: number) {
    this.elapsed += dt;
    if (this.stage === 'aim') {
      const mv = this.ctx.game.input.move();
      this.site.az -= mv.x * dt * 0.9;
      this.site.el = Math.max(0.02, Math.min(1.35, this.site.el + mv.y * dt * 0.7));
      this.site.applyAim();
      const cos = this.site.boresight().dot(this.src);
      this.strength = Math.pow((cos + 1) / 2, 10);
      this.beepT -= dt;
      if (this.beepT <= 0) {
        beep(300 + this.strength * 900);
        this.beepT = 0.12 + (1 - this.strength) * 0.9;
      }
      if (this.strength > 0.96) {
        this.lockT += dt;
        if (this.lockT > 1) {
          this.stage = 'tune';
          sfx.success();
          toast('¡Señal captada! Ahora sintonízala.', '📡', 'good');
          this.round = 1;
          this.newTarget();
        }
      } else this.lockT = 0;
      this.publish();
    } else if (this.stage === 'tune') {
      if (this.match() >= 0.999) {
        this.matchedT += dt;
        if (this.matchedT > 0.6) {
          this.matchedT = 0;
          sfx.unlock();
          if (this.round >= this.rounds) {
            this.stage = 'done';
            this.ctx.setUi({ stage: 'Mensaje decodificado: «Sonda perdida… enviando planos de un hábitat…»', bars: [{ label: 'Coincidencia', value: 1, color: '#55DB7A', text: '100%' }] });
            const par = 75;
            const stars = this.elapsed < par ? 3 : this.elapsed < par * 1.8 ? 2 : 1;
            setTimeout(() => this.ctx.finish(stars), 1800);
          } else {
            this.round++;
            toast('¡La señal cambió de frecuencia!', '〰️', 'info');
            this.newTarget();
            this.publish();
          }
        }
      } else this.matchedT = 0;
    }
    this.drawT += dt;
    if (this.drawT > 0.06) {
      this.drawT = 0;
      this.draw(t);
    }
  }

  private draw(t: number) {
    const c = this.site.screenCanvas.getContext('2d')!;
    const w = this.site.screenCanvas.width;
    const h = this.site.screenCanvas.height;
    c.clearRect(0, 0, w, h);
    c.fillStyle = 'rgba(20,10,50,0.88)';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,0.1)';
    c.lineWidth = 1;
    for (let x = 0; x < w; x += 32) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, h);
      c.stroke();
    }
    const mid = h / 2 + 12;
    const wave = (f: number, a: number, color: string, lw: number, noise: number) => {
      c.strokeStyle = color;
      c.lineWidth = lw;
      c.beginPath();
      for (let x = 0; x <= w; x += 3) {
        const y = mid + Math.sin((x / w) * Math.PI * 2 * f - t * 3) * a * 16 + (Math.random() - 0.5) * noise;
        if (x === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    };
    if (this.stage === 'aim') {
      wave(3, 3, '#FF4FB0', 3, (1 - this.strength) * 140);
    } else {
      wave(this.target.f, this.target.a, 'rgba(255,79,176,0.85)', 9, 0);
      wave(this.mine.f, this.mine.a, '#38E1FF', 3, 0);
    }
    c.font = '700 26px "Space Mono", monospace';
    c.fillStyle = '#FFF4DC';
    c.fillText(this.stage === 'aim' ? `SEÑAL ${Math.round(this.strength * 100)}%` : `FRECUENCIA ${this.mine.f} · AMPLITUD ${this.mine.a}`, 14, 32);
    this.site.screenTex.needsUpdate = true;
  }

  camera() {
    return { pos: this.site.local(7, 15, 7.5), target: this.site.local(0, -2, 4) };
  }

  exit(completed: boolean) {
    this.site.screenOwner = 'site';
    this.ctx.game.playerVisible = true;
    if (!completed) this.site.setFixed(false);
  }
}
