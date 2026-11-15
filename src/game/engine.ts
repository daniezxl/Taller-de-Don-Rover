// Motor del juego: renderizado con Three.js, jugador en tercera persona, cámara,
// interacción con objetos del mundo, minijuegos y ciclo de día y noche.

import * as THREE from 'three';
import { SUIT_COLORS, VISORS } from '../../shared/content';
import type { MissionId } from '../../shared/types';
import { sfx } from '../lib/sound';
import { Input } from './input';
import { Missions } from './missions';
import { animateAstronaut, makeAstronaut, makeIxDrone, type AstronautRig } from './models';
import { loadSettings, writeSave, writeSettings, type SaveData, type Settings } from './save';
import type { Minigame } from './sites/base';
import { getUi, setUi } from './store';
import { groundHeight, SPAWN, World, WORLD_RADIUS } from './world';

export interface Interactable {
  id: string;
  pos: THREE.Vector3;
  radius: number;
  label: () => string | null;
  /** Segundos que hay que mantener presionado (0 = un toque). */
  hold?: number;
  onUse: () => void;
}

interface Tween {
  t: number;
  dur: number;
  fn: (k: number) => void;
  done?: () => void;
}

const easeInOut = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

export class Game {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  world: World;
  input: Input;
  settings: Settings;
  save!: SaveData;
  missions: Missions;
  container: HTMLElement;

  rig: AstronautRig | null = null;
  player = new THREE.Vector3(SPAWN.x, 0, SPAWN.z);
  playerVel = new THREE.Vector3();
  playerYaw = 0;
  onGround = true;
  walkPhase = 0;
  playerVisible = true;
  speedBoost = 1;

  camYaw = Math.PI * 0.75;
  camPitch = 0.42;
  camDist = 10;
  camPos = new THREE.Vector3();
  camTarget = new THREE.Vector3();
  camOverride: { pos: THREE.Vector3; target: THREE.Vector3 } | null = null;
  menuMode = true;

  ix = makeIxDrone();
  interactables: Interactable[] = [];
  private nearest: Interactable | null = null;
  private holdTime = 0;
  private tweens: Tween[] = [];
  minigame: Minigame | null = null;
  raycaster = new THREE.Raycaster();
  private last = 0;
  private raf = 0;
  private running = false;
  time = 0;
  dayScale = 1 / 480; // un sol de juego dura 8 minutos
  private saveTimer = 0;
  private uiTimer = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.settings = loadSettings();
    const high = this.settings.quality === 'high';
    this.renderer = new THREE.WebGLRenderer({ antialias: high, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, high ? 1.75 : 1.1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = high;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.className = 'game-canvas';

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 900);
    this.world = new World(this.scene, this.settings.quality);
    this.scene.add(this.ix.group);
    this.input = new Input(this.renderer.domElement);
    this.input.onTap = (x, y) => this.handleTap(x, y);
    this.input.onKeyAction = (k) => this.handleKey(k);
    this.input.blocked = () => this.paused;
    this.renderer.domElement.addEventListener('pointermove', this.onHover);

    window.addEventListener('resize', this.resize);
    this.resize();
    this.camPos.set(60, 30, 60);
    this.missions = new Missions(this);
  }

  /* ---------------- ciclo de vida ---------------- */

  begin(save: SaveData) {
    this.save = save;
    if (this.rig) {
      this.scene.remove(this.rig.root);
    }
    const av = save.avatar;
    this.rig = makeAstronaut({ suit: SUIT_COLORS[av.suit] ?? SUIT_COLORS[0], visor: VISORS[av.visor] ?? VISORS[0], helmet: av.helmet, accessory: av.accessory, accent: '#FFC93C' });
    this.scene.add(this.rig.root);
    const p = save.pos ?? [SPAWN.x + 4, SPAWN.z + 4];
    this.player.set(p[0], groundHeight(p[0], p[1]), p[1]);
    this.playerYaw = Math.atan2(-this.player.x, -this.player.z);
    this.camYaw = this.playerYaw + Math.PI;
    this.world.setDayPhase(0.38);
    this.missions.load();
    this.menuMode = false;
    setUi({ screen: 'game', meters: { ...save.meters }, sol: save.sol, name: save.name, xp: save.xp, discoveries: [...save.discoveries] });
    this.missions.refreshUi();
    this.persist();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
      this.last = now;
      this.time += dt;
      this.update(dt);
      this.renderer.render(this.scene, this.camera);
    };
    this.raf = requestAnimationFrame(loop);
    setUi({ ready: true });
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.running = false;
    window.removeEventListener('resize', this.resize);
    this.renderer.domElement.removeEventListener('pointermove', this.onHover);
    this.input.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private resize = () => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 68 : 55;
    this.camera.updateProjectionMatrix();
  };

  setQuality(q: Settings['quality']) {
    this.settings = { ...this.settings, quality: q };
    writeSettings(this.settings);
  }

  updateSettings(s: Partial<Settings>) {
    this.settings = { ...this.settings, ...s };
    writeSettings(this.settings);
  }

  persist() {
    if (!this.save) return;
    this.save.pos = [Math.round(this.player.x * 10) / 10, Math.round(this.player.z * 10) / 10];
    writeSave(this.save);
  }

  /* ---------------- utilidades ---------------- */

  animate(dur: number, fn: (k: number) => void, ease = true): Promise<void> {
    return new Promise((resolve) => {
      this.tweens.push({ t: 0, dur, fn: ease ? (k) => fn(easeInOut(k)) : fn, done: resolve });
    });
  }

  addInteractable(i: Interactable) {
    this.interactables.push(i);
    return i;
  }

  removeInteractable(id: string) {
    this.interactables = this.interactables.filter((i) => i.id !== id);
  }

  teleport(p: THREE.Vector3, faceTo?: THREE.Vector3) {
    this.player.set(p.x, groundHeight(p.x, p.z), p.z);
    this.playerVel.set(0, 0, 0);
    if (faceTo) {
      this.playerYaw = Math.atan2(faceTo.x - p.x, faceTo.z - p.z);
      this.camYaw = this.playerYaw + Math.PI;
    }
  }

  get paused() {
    const ui = getUi();
    return !!ui.dialog || ui.screen !== 'game' || !!ui.cinematic;
  }

  /* ---------------- minijuegos ---------------- */

  startMinigame(mg: Minigame) {
    this.minigame = mg;
    this.holdTime = 0;
    mg.start();
  }

  endMinigame(completed: boolean) {
    const mg = this.minigame;
    if (!mg) return;
    this.minigame = null;
    mg.exit(completed);
    this.camOverride = null;
    this.playerVisible = true;
    this.speedBoost = 1;
    setUi({ mg: null });
  }

  mgButton(id: string, down: boolean) {
    this.minigame?.button?.(id, down);
  }
  mgSlider(id: string, v: number) {
    this.minigame?.slider?.(id, v);
  }
  mgPiece(id: string) {
    this.minigame?.piece?.(id);
  }

  private setRayFromNdc(x: number, y: number) {
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
  }

  private handleTap(x: number, y: number) {
    if (this.paused) return;
    if (this.minigame?.tap) {
      this.setRayFromNdc(x, y);
      this.minigame.tap(this.raycaster);
    }
  }

  private onHover = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || !this.minigame?.hover || this.paused) return;
    const r = this.renderer.domElement.getBoundingClientRect();
    this.setRayFromNdc(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.minigame.hover(this.raycaster);
  };

  private handleKey(k: string) {
    if (this.paused || !this.minigame) return;
    if (k === 'r') this.minigame.button?.('rotate', true);
  }

  /* ---------------- bucle principal ---------------- */

  private update(dt: number) {
    const paused = this.paused;
    // Tweens
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      tw.fn(k);
      if (k >= 1) {
        this.tweens.splice(i, 1);
        tw.done?.();
      }
    }

    if (this.menuMode) {
      // Cámara orbitando la colonia detrás del menú
      const a = this.time * 0.05;
      this.camera.position.set(Math.sin(a) * 75, 26, Math.cos(a) * 75);
      this.camera.lookAt(0, 4, 0);
      this.world.update(dt, new THREE.Vector3(0, 0, 0), this.camera.position);
      this.missions.update(dt, this.time);
      this.input.consume();
      return;
    }

    // Día y noche (el minijuego final controla su propio reloj)
    if (!paused && !this.minigame?.controlsPlayer) {
      const before = this.world.dayPhase;
      this.world.setDayPhase(before + dt * this.dayScale);
      if (this.world.dayPhase < before) {
        this.save.sol += 1;
        setUi({ sol: this.save.sol });
      }
    }

    if (!paused && (!this.minigame || this.minigame.controlsPlayer)) this.updatePlayer(dt);
    else this.playerVel.multiplyScalar(0.8);

    if (this.minigame && !paused) this.minigame.update(dt, this.time);
    this.missions.update(dt, this.time);
    this.updateInteraction(dt, paused);
    this.updateIx(dt);
    this.updateCamera(dt);

    if (this.rig) {
      this.rig.root.visible = this.playerVisible;
      this.rig.root.position.copy(this.player);
      this.rig.root.rotation.y = this.playerYaw;
      const sp = Math.hypot(this.playerVel.x, this.playerVel.z);
      this.walkPhase += dt * sp * 1.6;
      animateAstronaut(this.rig, this.walkPhase, Math.min(1, sp / 6), this.time, !this.onGround);
    }

    this.world.update(dt, this.player, this.camera.position);

    this.saveTimer += dt;
    if (this.saveTimer > 5) {
      this.saveTimer = 0;
      this.persist();
    }
    this.uiTimer += dt;
    if (this.uiTimer > 0.5) {
      this.uiTimer = 0;
      setUi({ dayPhase: this.world.dayPhase, storm: this.world.storm });
    }
    this.input.consume();
  }

  private updatePlayer(dt: number) {
    const mv = this.input.move();
    // Giro de cámara con arrastre
    const sens = 0.005 * this.settings.sensitivity;
    this.camYaw -= this.input.look.dx * sens;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + this.input.look.dy * sens * (this.settings.invertY ? -1 : 1), 0.08, 1.2);
    this.camDist = THREE.MathUtils.clamp(this.camDist + this.input.zoom * 0.8, 5, 18);
    if (this.input.keys.has('q')) this.camYaw += dt * 1.8;
    if (this.input.keys.has('z')) this.camYaw -= dt * 1.8;

    const fwdX = -Math.sin(this.camYaw);
    const fwdZ = -Math.cos(this.camYaw);
    const rightX = Math.cos(this.camYaw);
    const rightZ = -Math.sin(this.camYaw);
    const speed = (mv.run ? 10 : 6) * this.speedBoost;
    const tx = (fwdX * mv.y + rightX * mv.x) * speed;
    const tz = (fwdZ * mv.y + rightZ * mv.x) * speed;
    const accel = this.onGround ? 12 : 3;
    this.playerVel.x += (tx - this.playerVel.x) * Math.min(1, accel * dt);
    this.playerVel.z += (tz - this.playerVel.z) * Math.min(1, accel * dt);

    if (this.input.jumpPressed && this.onGround) {
      this.playerVel.y = 7.5;
      this.onGround = false;
      sfx.whoosh();
    }
    this.playerVel.y -= 9 * dt; // gravedad "marciana" de juego: saltos largos y lentos

    const nx = this.player.x + this.playerVel.x * dt;
    const nz = this.player.z + this.playerVel.z * dt;
    const res = this.collide(nx, nz, 0.55);
    this.player.x = res.x;
    this.player.z = res.z;
    this.player.y += this.playerVel.y * dt;
    const g = groundHeight(this.player.x, this.player.z);
    if (this.player.y <= g) {
      this.player.y = g;
      this.playerVel.y = 0;
      this.onGround = true;
    }
    if (Math.hypot(tx, tz) > 0.5) {
      const target = Math.atan2(tx, tz);
      let d = target - this.playerYaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.playerYaw += d * Math.min(1, dt * 12);
    }
  }

  /** Resuelve colisiones contra círculos y el borde del mundo. */
  collide(x: number, z: number, r: number) {
    for (let it = 0; it < 2; it++) {
      for (const c of this.world.colliders) {
        const dx = x - c.x;
        const dz = z - c.z;
        const min = c.r + r;
        const d2 = dx * dx + dz * dz;
        if (d2 < min * min && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          x = c.x + (dx / d) * min;
          z = c.z + (dz / d) * min;
        }
      }
    }
    const d = Math.hypot(x, z);
    if (d > WORLD_RADIUS) {
      x *= WORLD_RADIUS / d;
      z *= WORLD_RADIUS / d;
    }
    return { x, z };
  }

  private updateInteraction(dt: number, paused: boolean) {
    let best: Interactable | null = null;
    let bestD = Infinity;
    let bestLabel: string | null = null;
    if (!paused && (!this.minigame || this.minigame.controlsPlayer)) {
      for (const it of this.interactables) {
        const d = Math.hypot(it.pos.x - this.player.x, it.pos.z - this.player.z);
        if (d < it.radius && d < bestD) {
          const label = it.label();
          if (!label) continue;
          best = it;
          bestD = d;
          bestLabel = label;
        }
      }
    }
    if (best !== this.nearest) {
      this.nearest = best;
      this.holdTime = 0;
    }
    if (best && bestLabel) {
      const need = best.hold ?? 0;
      if (need > 0) {
        if (this.input.actionHeld) this.holdTime += dt;
        else this.holdTime = Math.max(0, this.holdTime - dt * 2);
        if (this.holdTime >= need) {
          this.holdTime = 0;
          best.onUse();
        }
        setUi({ prompt: { text: bestLabel, hold: this.holdTime / need } });
      } else {
        setUi({ prompt: { text: bestLabel, hold: null } });
        if (this.input.actionPressed) {
          sfx.pop();
          best.onUse();
        }
      }
    } else if (getUi().prompt) {
      setUi({ prompt: null });
    }
  }

  /** Para la interfaz táctil: el botón de acción. */
  pressAction(down: boolean) {
    if (down) this.input.actionPressed = true;
    this.input.actionHeld = down;
  }

  private updateIx(dt: number) {
    const g = this.ix.group;
    const side = new THREE.Vector3(Math.cos(this.playerYaw) * 1.4, 0, -Math.sin(this.playerYaw) * 1.4);
    const back = new THREE.Vector3(Math.sin(this.playerYaw) * -1.2, 0, Math.cos(this.playerYaw) * -1.2);
    const target = this.player.clone().add(side).add(back);
    target.y = this.player.y + 2.6 + Math.sin(this.time * 2) * 0.18;
    if (this.menuMode) target.set(0, 9 + Math.sin(this.time) * 0.4, 0);
    g.position.lerp(target, Math.min(1, dt * 3));
    g.lookAt(this.camera.position.x, g.position.y, this.camera.position.z);
    this.ix.ring.rotation.z += dt * 0.8;
    this.ix.satPivot.rotation.z += dt * 2.2;
  }

  private updateCamera(dt: number) {
    let pos: THREE.Vector3;
    let target: THREE.Vector3;
    const override = this.camOverride ?? this.minigame?.camera() ?? null;
    if (override) {
      pos = override.pos;
      target = override.target;
    } else {
      target = this.player.clone();
      target.y += 1.8;
      const horiz = Math.cos(this.camPitch) * this.camDist;
      pos = new THREE.Vector3(target.x + Math.sin(this.camYaw) * horiz, target.y + Math.sin(this.camPitch) * this.camDist, target.z + Math.cos(this.camYaw) * horiz);
      const gy = groundHeight(pos.x, pos.z) + 0.8;
      if (pos.y < gy) pos.y = gy;
    }
    const k = Math.min(1, dt * (override ? 3.5 : 8));
    this.camPos.lerp(pos, k);
    this.camTarget.lerp(target, k);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camTarget);
  }

  /** Coloca la cámara de inmediato (sin interpolar). */
  snapCamera() {
    this.updateCamera(10);
  }

  /** Distancia del jugador a un sitio. */
  distTo(x: number, z: number) {
    return Math.hypot(this.player.x - x, this.player.z - z);
  }

  /** Para el minimapa. */
  mapInfo(): { x: number; z: number; yaw: number; camYaw: number } {
    return { x: this.player.x, z: this.player.z, yaw: this.playerYaw, camYaw: this.camYaw };
  }

  activeMissionId(): MissionId | null {
    return getUi().activeMission;
  }
}
