// Controlador de misiones: cada problemática vive en su sitio del mundo.
// Flujo de una misión: llegar al sitio → IX explica el problema → hablar con los
// 4 especialistas (cada quien tiene un dato) → elegir la solución en los pedestales
// → minijuego que repara el sitio → la colonia cambia y se aprende algo nuevo.

import * as THREE from 'three';
import { BUILDINGS, CREW_NAMES, DISCOVERIES, DISCOVERY_ORDER, MISSION_ORDER, MISSION_WORLD, MISSIONS, ROLE_ORDER, ROLES, SYSTEM_ORDER } from '../../shared/content';
import { generatePuzzle } from '../../shared/puzzles';
import { hashString } from '../../shared/rng';
import type { DiscoveryId, Meters, MissionId, Puzzle, RoleId } from '../../shared/types';
import { sfx } from '../lib/sound';
import type { Game } from './engine';
import { animateAstronaut, makeAstronaut, makeBeacon, makeEmojiSprite, makeLabel, makePedestal, mat, mesh, type AstronautRig } from './models';
import type { MissionState } from './save';
import type { Site } from './sites/base';
import { createSites } from './sites';
import { getUi, setUi, toast, type MgUi } from './store';
import { DISCOVERY_SPOTS, groundHeight, glowTexture } from './world';

interface Npc {
  role: RoleId;
  name: string;
  rig: AstronautRig;
  marker: THREE.Sprite;
  label: THREE.Sprite;
  pos: THREE.Vector3;
  baseYaw: number;
}

interface Pedestal {
  optionId: string;
  group: THREE.Group;
  holo: THREE.Sprite;
  label: THREE.Sprite;
  cross: THREE.Sprite;
  pos: THREE.Vector3;
}

const FIVE: MissionId[] = ['greenhouse', 'water', 'darkness', 'signal', 'habitat'];

export class Missions {
  game: Game;
  sites: Record<MissionId, Site>;
  private puzzles: Partial<Record<MissionId, Puzzle>> = {};
  private npcs: Partial<Record<MissionId, Npc[]>> = {};
  private pedestals: Partial<Record<MissionId, Pedestal[]>> = {};
  private beacons: Partial<Record<MissionId, ReturnType<typeof makeBeacon>>> = {};
  private discoveryObjs: Partial<Record<DiscoveryId, THREE.Group>> = {};
  private objTimer = 0;
  private loaded = false;

  constructor(game: Game) {
    this.game = game;
    this.sites = createSites(game);
    for (const id of MISSION_ORDER) {
      const s = this.sites[id];
      s.build();
      s.setFixed(false);
      const b = makeBeacon(MISSIONS[id].color, id === 'final' ? 60 : 44);
      const c = s.local(0, id === 'final' ? 0 : -2);
      b.group.position.copy(c);
      game.scene.add(b.group);
      this.beacons[id] = b;
    }
    this.buildDiscoveries();
  }

  /* ---------------- carga de partida ---------------- */

  load() {
    const save = this.game.save;
    // Limpia lo de una partida anterior
    for (const id of MISSION_ORDER) this.clearCrew(id);
    this.puzzles = {};
    for (const id of MISSION_ORDER) {
      const done = !!save.missions[id];
      const s = this.sites[id];
      s.setFixed(done);
      if (done) s.showBuilding(false);
      if (!done && this.isUnlocked(id)) this.spawnCrew(id);
    }
    for (const d of DISCOVERY_ORDER) {
      const o = this.discoveryObjs[d];
      if (o) o.visible = !save.discoveries.includes(d);
    }
    this.loaded = true;
    if (!save.introDone) this.intro();
  }

  isUnlocked(id: MissionId) {
    if (id !== 'final') return true;
    return FIVE.every((m) => this.game.save?.missions[m]);
  }

  isDone(id: MissionId) {
    return !!this.game.save?.missions[id];
  }

  state(id: MissionId): MissionState {
    const save = this.game.save;
    let st = save.progress[id];
    if (!st) {
      st = { briefed: false, intel: [], discarded: [], wrong: 0, decided: null };
      save.progress[id] = st;
    }
    return st;
  }

  puzzle(id: MissionId): Puzzle {
    let p = this.puzzles[id];
    if (!p) {
      const save = this.game.save;
      p = generatePuzzle(id, save.difficulty, (save.seed + hashString(id)) >>> 0);
      this.puzzles[id] = p;
    }
    return p;
  }

  private intro() {
    const name = this.game.save.name || 'astronauta';
    setUi({
      dialog: {
        kind: 'ix',
        title: `¡Bienvenida, bienvenido, ${name}!`,
        mood: 'talk',
        text:
          'Soy IX, la inteligencia de la colonia IXCHEL en Marte. Llegaste en el peor momento: hay cinco problemas al mismo tiempo. ' +
          'Cada columna de luz marca un lugar en problemas. Ve, habla con los especialistas, elige la mejor solución y repara la colonia con tus propias manos.',
        actions: [
          {
            label: '¿Cómo me muevo?',
            kind: 'ghost',
            onClick: () => this.controlsHelp(),
          },
          {
            label: '¡Vamos!',
            kind: 'primary',
            onClick: () => {
              this.game.save.introDone = true;
              this.game.persist();
              setUi({ dialog: null });
            },
          },
        ],
      },
    });
  }

  controlsHelp() {
    const touch = getUi().touch;
    setUi({
      dialog: {
        kind: 'ix',
        title: 'Controles',
        mood: 'happy',
        text: touch
          ? 'Usa el joystick de la izquierda para caminar (empújalo hasta el borde para correr). Arrastra el dedo en la pantalla para girar la cámara. El botón grande hace la acción (hablar, examinar, reparar) y el pequeño salta. ¡En Marte la gravedad es menor: los saltos son largos!'
          : 'W A S D o flechas para caminar, Shift para correr, Espacio para saltar (¡en Marte la gravedad es menor!). Arrastra con el mouse para girar la cámara y usa la rueda para acercarte. Presiona E para hablar, examinar o reparar.',
        actions: [
          {
            label: 'Entendido',
            kind: 'primary',
            onClick: () => {
              this.game.save.introDone = true;
              this.game.persist();
              setUi({ dialog: null });
            },
          },
        ],
      },
    });
  }

  /* ---------------- especialistas y pedestales ---------------- */

  private spawnCrew(id: MissionId) {
    const site = this.sites[id];
    const puzzle = this.puzzle(id);
    const st = this.state(id);
    const spots = site.npcSpots();
    const list: Npc[] = [];
    ROLE_ORDER.forEach((role, i) => {
      const r = ROLES[role];
      const [lx, lz] = spots[i];
      const pos = site.local(lx, lz);
      pos.y = groundHeight(pos.x, pos.z);
      const rig = makeAstronaut({ suit: r.color, visor: '#1B2A6B', accent: r.dark, helmet: r.helmet, accessory: i % 3 === 0 ? 0 : i });
      rig.root.position.copy(pos);
      const baseYaw = Math.atan2(site.layout.x - pos.x + Math.sin(site.layout.face) * 12, site.layout.z - pos.z + Math.cos(site.layout.face) * 12);
      rig.root.rotation.y = baseYaw;
      const name = CREW_NAMES[(hashString(`${this.game.save.seed}-${id}-${role}`) >>> 0) % CREW_NAMES.length];
      const label = makeLabel(name, { emoji: r.emoji, sub: r.es, color: r.color, size: 0.75 });
      label.position.set(pos.x, pos.y + 3.05, pos.z);
      const marker = makeEmojiSprite(st.intel.includes(role) ? '✅' : '💬', 0.8, r.color);
      marker.position.set(pos.x, pos.y + 3.9, pos.z);
      this.game.scene.add(rig.root, label, marker);
      const npc: Npc = { role, name, rig, marker, label, pos, baseYaw };
      list.push(npc);
      this.game.addInteractable({
        id: `npc-${id}-${role}`,
        pos,
        radius: 3.2,
        label: () => (this.isDone(id) ? null : `Hablar con ${name} · ${r.es}`),
        onUse: () => this.talk(id, npc, puzzle),
      });
    });
    this.npcs[id] = list;
    this.game.world.colliders.push(...list.map((n) => ({ x: n.pos.x, z: n.pos.z, r: 0.6, tag: `npc-${id}` })));

    const pspots = site.pedestalSpots();
    const peds: Pedestal[] = [];
    puzzle.options.forEach((opt, i) => {
      const [lx, lz] = pspots[i] ?? [0, 12 + i];
      const pos = site.local(lx, lz);
      pos.y = groundHeight(pos.x, pos.z);
      const g = makePedestal(MISSIONS[id].color);
      g.position.copy(pos);
      const holo = makeEmojiSprite(opt.emoji, 1.25, MISSIONS[id].color);
      holo.position.set(0, 2, 0);
      const label = makeLabel(opt.label, { size: 0.55, color: MISSIONS[id].color });
      label.position.set(0, 3.05, 0);
      const cross = makeEmojiSprite('❌', 0.9, '#FF6B5B');
      cross.position.set(0, 2, 0.15);
      cross.visible = st.discarded.includes(opt.id);
      g.add(holo, label, cross);
      const beam = mesh(new THREE.CylinderGeometry(0.5, 0.7, 1.1, 10, 1, true), mat(MISSIONS[id].color, { emissive: MISSIONS[id].color, ei: 0.8, opacity: 0.18 }), false);
      beam.position.y = 1.55;
      g.add(beam);
      this.game.scene.add(g);
      peds.push({ optionId: opt.id, group: g, holo, label, cross, pos });
      this.game.world.colliders.push({ x: pos.x, z: pos.z, r: 0.85, tag: `ped-${id}` });
      this.game.addInteractable({
        id: `ped-${id}-${opt.id}`,
        pos,
        radius: 2.6,
        label: () => (this.isDone(id) ? null : this.state(id).decided ? null : `Examinar: ${opt.label}`),
        onUse: () => this.examine(id, opt.id),
      });
    });
    this.pedestals[id] = peds;

    // Punto para (re)iniciar la reparación una vez elegida la solución
    const stand = site.standSpot();
    this.game.addInteractable({
      id: `repair-${id}`,
      pos: stand,
      radius: 4,
      label: () => (this.isDone(id) || !this.state(id).decided ? null : `Reparar: ${MISSION_WORLD[id].game.emoji} ${MISSION_WORLD[id].game.name}`),
      onUse: () => this.minigameIntro(id),
    });
  }

  private clearCrew(id: MissionId) {
    for (const n of this.npcs[id] ?? []) this.game.scene.remove(n.rig.root, n.label, n.marker);
    for (const p of this.pedestals[id] ?? []) this.game.scene.remove(p.group);
    this.npcs[id] = [];
    this.pedestals[id] = [];
    this.game.world.colliders = this.game.world.colliders.filter((c) => c.tag !== `npc-${id}` && c.tag !== `ped-${id}`);
    this.game.interactables = this.game.interactables.filter((i) => i.id !== `repair-${id}` && !i.id.startsWith(`npc-${id}-`) && !i.id.startsWith(`ped-${id}-`));
  }

  /* ---------------- flujo de la misión ---------------- */

  private brief(id: MissionId) {
    const m = MISSIONS[id];
    const w = MISSION_WORLD[id];
    const st = this.state(id);
    st.briefed = true;
    sfx.alarm();
    setUi({
      dialog: {
        kind: 'ix',
        title: `${m.code} · ${m.titleEs}`,
        mood: 'alert',
        text: `${w.problem} ${m.hook} ${m.story}${m.disclaimer ? ` (${m.disclaimer})` : ''}`,
        actions: [
          {
            label: 'Hablaré con los especialistas',
            kind: 'primary',
            onClick: () => {
              setUi({ dialog: null });
              toast('Habla con los 4 especialistas (💬)', '🧑‍🚀');
            },
          },
        ],
      },
    });
    this.game.persist();
  }

  private talk(id: MissionId, npc: Npc, puzzle: Puzzle) {
    const st = this.state(id);
    if (!st.briefed) this.brief(id);
    const first = !st.intel.includes(npc.role);
    if (first) st.intel.push(npc.role);
    this.updateMarker(npc, true);
    const card = puzzle.intel[npc.role];
    setUi({
      dialog: {
        kind: 'intel',
        card,
        npcName: npc.name,
        actions: [
          {
            label: first ? 'Dato guardado ✔' : 'Cerrar',
            kind: 'primary',
            onClick: () => {
              setUi({ dialog: null });
              if (first) {
                sfx.unlock();
                const n = st.intel.length;
                if (n >= 4) toast('¡Tienes los 4 datos! Elige la solución en los pedestales.', '🧩', 'good');
                else toast(`Dato guardado (${n}/4)`, ROLES[npc.role].emoji, 'good');
              }
              this.refreshUi();
            },
          },
        ],
      },
    });
    this.game.persist();
    this.refreshUi();
  }

  private updateMarker(npc: Npc, done: boolean) {
    this.game.scene.remove(npc.marker);
    const m = makeEmojiSprite(done ? '✅' : '💬', 0.8, ROLES[npc.role].color);
    m.position.copy(npc.marker.position);
    npc.marker = m;
    this.game.scene.add(m);
  }

  examine(id: MissionId, optionId: string) {
    const puzzle = this.puzzle(id);
    const st = this.state(id);
    if (!st.briefed) this.brief(id);
    const option = puzzle.options.find((o) => o.id === optionId)!;
    const ready = st.intel.length >= 4;
    const discarded = st.discarded.includes(optionId);
    setUi({
      dialog: {
        kind: 'option',
        missionId: id,
        option,
        question: puzzle.question,
        discarded,
        ready,
        actions: [
          { label: 'Cerrar', kind: 'ghost', onClick: () => setUi({ dialog: null }) },
          {
            label: discarded ? 'Quitar la ❌' : 'Descartar ❌',
            kind: 'ghost',
            onClick: () => {
              this.toggleDiscard(id, optionId);
              setUi({ dialog: null });
            },
          },
          ...(ready
            ? [
                {
                  label: 'Elegir esta solución',
                  kind: 'primary' as const,
                  onClick: () => this.choose(id, optionId),
                },
              ]
            : []),
        ],
      },
    });
  }

  toggleDiscard(id: MissionId, optionId: string) {
    const st = this.state(id);
    if (st.discarded.includes(optionId)) st.discarded = st.discarded.filter((x) => x !== optionId);
    else st.discarded.push(optionId);
    for (const p of this.pedestals[id] ?? []) p.cross.visible = st.discarded.includes(p.optionId);
    sfx.select();
    this.refreshUi();
    this.game.persist();
  }

  private applyEffects(effects: Partial<Meters>, scale = 1) {
    const m = this.game.save.meters;
    for (const k of SYSTEM_ORDER) {
      const v = effects[k];
      if (v) m[k] = Math.max(0, Math.min(100, Math.round(m[k] + v * scale)));
    }
    setUi({ meters: { ...m } });
  }

  private choose(id: MissionId, optionId: string) {
    const puzzle = this.puzzle(id);
    const st = this.state(id);
    const option = puzzle.options.find((o) => o.id === optionId)!;
    const res = puzzle.results[optionId];
    const best = optionId === puzzle.bestId;
    if (best) {
      st.decided = optionId;
      sfx.success();
      this.applyEffects(res.effects, 0.5);
    } else {
      st.wrong += 1;
      if (!st.discarded.includes(optionId)) st.discarded.push(optionId);
      for (const p of this.pedestals[id] ?? []) p.cross.visible = st.discarded.includes(p.optionId);
      sfx.fail();
      this.applyEffects(res.effects, 0.4);
    }
    this.game.persist();
    setUi({
      dialog: {
        kind: 'result',
        missionId: id,
        tier: best ? 'best' : res.tier,
        option,
        why: res.why,
        effects: res.effects,
        actions: best
          ? [{ label: `¡A reparar! ${MISSION_WORLD[id].game.emoji}`, kind: 'primary', onClick: () => this.minigameIntro(id) }]
          : [
              {
                label: 'Revisar mis datos',
                kind: 'ghost',
                onClick: () => setUi({ dialog: null }),
              },
              { label: 'Intentar otra solución', kind: 'primary', onClick: () => setUi({ dialog: null }) },
            ],
      },
    });
    this.refreshUi();
  }

  minigameIntro(id: MissionId) {
    setUi({
      dialog: {
        kind: 'mgIntro',
        missionId: id,
        actions: [
          { label: 'Más tarde', kind: 'ghost', onClick: () => setUi({ dialog: null }) },
          {
            label: '¡Empezar!',
            kind: 'primary',
            onClick: () => {
              setUi({ dialog: null });
              this.startMinigame(id);
            },
          },
        ],
      },
    });
  }

  private startMinigame(id: MissionId) {
    const site = this.sites[id];
    const st = this.state(id);
    const save = this.game.save;
    const stand = site.standSpot();
    this.game.teleport(stand, site.local(0, 0));
    let finished = false;
    const mg = site.createMinigame({
      game: this.game,
      site,
      puzzle: this.puzzle(id),
      choice: st.decided ?? this.puzzle(id).bestId,
      difficulty: save.difficulty,
      seed: (save.seed + hashString(`mg-${id}-${st.wrong}-${Date.now() % 100000}`)) >>> 0,
      finish: (stars) => {
        if (finished) return;
        finished = true;
        this.game.endMinigame(true);
        this.complete(id, stars);
      },
      setUi: (ui: Partial<MgUi>) => setUi((s) => ({ mg: { ...(s.mg ?? { missionId: id, title: '', help: '' }), ...ui, missionId: id } })),
    });
    setUi({ mg: { missionId: id, title: MISSION_WORLD[id].game.name, help: MISSION_WORLD[id].game.howTo, canExit: true }, prompt: null });
    this.game.startMinigame(mg);
  }

  leaveMinigame() {
    this.game.endMinigame(false);
    toast('Puedes volver a intentarlo cuando quieras en el mismo lugar.', '🔧');
    this.refreshUi();
  }

  private complete(id: MissionId, gameStars: number) {
    const save = this.game.save;
    const st = this.state(id);
    const decisionStars = Math.max(1, 3 - st.wrong);
    const stars = Math.max(1, Math.min(3, Math.round((decisionStars + gameStars) / 2)));
    save.missions[id] = { stars, decisionStars, gameStars, at: Date.now() };
    delete save.progress[id];
    const xp = 100 + stars * 60;
    save.xp += xp;
    const m = MISSIONS[id];
    this.applyEffects({ [m.focus]: 10 + stars * 2 });
    this.applyEffects(this.puzzle(id).results[this.puzzle(id).bestId].effects, 0.5);
    const site = this.sites[id];
    site.setFixed(true);
    site.showBuilding(true);
    this.clearCrew(id);
    sfx.unlock();
    this.game.persist();
    setUi({ xp: save.xp });
    setUi({
      dialog: {
        kind: 'debrief',
        missionId: id,
        stars,
        decisionStars,
        gameStars,
        xp,
        actions: [
          {
            label: 'Continuar',
            kind: 'primary',
            onClick: () => {
              setUi({ dialog: null });
              this.afterComplete(id);
            },
          },
        ],
      },
    });
    this.refreshUi();
  }

  private afterComplete(id: MissionId) {
    if (id === 'final') {
      const total = MISSION_ORDER.reduce((n, m) => n + (this.game.save.missions[m]?.stars ?? 0), 0);
      setUi({
        dialog: {
          kind: 'ix',
          title: '¡La colonia IXCHEL es autosuficiente!',
          mood: 'happy',
          text: `Resolviste las seis misiones con ${total} de 18 estrellas. La colonia brilla de noche, los cultivos crecen, el agua circula y la antena habla con la Tierra. Puedes seguir explorando, buscar los descubrimientos que falten o empezar una partida nueva con otra dificultad.`,
          actions: [{ label: 'Seguir explorando', kind: 'primary', onClick: () => setUi({ dialog: null }) }],
        },
      });
      return;
    }
    const left = FIVE.filter((m) => !this.isDone(m));
    if (left.length === 0) {
      this.spawnCrew('final');
      sfx.alarm();
      setUi({
        dialog: {
          kind: 'ix',
          title: 'Prueba final desbloqueada',
          mood: 'alert',
          text: `${MISSIONS.final.hook} Ve al Centro de mando, en medio de la colonia: ahí te esperan los especialistas para planear los 10 sols.`,
          actions: [{ label: 'Voy para allá', kind: 'primary', onClick: () => setUi({ dialog: null }) }],
        },
      });
    } else {
      toast(`Quedan ${left.length} problema${left.length > 1 ? 's' : ''} en la colonia. Sigue las columnas de luz.`, '🧭');
    }
  }

  /* ---------------- descubrimientos ---------------- */

  private buildDiscoveries() {
    for (const d of DISCOVERY_ORDER) {
      const [x, z] = DISCOVERY_SPOTS[d];
      const y = groundHeight(x, z);
      const g = new THREE.Group();
      g.position.set(x, y, z);
      const info = DISCOVERIES[d];
      const icon = makeEmojiSprite(info.emoji, 1.1, '#B69CFF');
      icon.position.y = 1.6;
      g.add(icon);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#B69CFF', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.scale.set(5, 5, 1);
      glow.position.y = 1.2;
      g.add(glow);
      const rock = mesh(new THREE.DodecahedronGeometry(0.6, 0), mat('#7E3C26'));
      rock.position.y = 0.3;
      g.add(rock);
      this.game.scene.add(g);
      this.discoveryObjs[d] = g;
      this.game.addInteractable({
        id: `disc-${d}`,
        pos: new THREE.Vector3(x, y, z),
        radius: 3,
        label: () => (this.game.save && !this.game.save.discoveries.includes(d) ? `Investigar ${info.emoji}` : null),
        onUse: () => this.discover(d),
      });
    }
  }

  private discover(d: DiscoveryId) {
    const save = this.game.save;
    if (save.discoveries.includes(d)) return;
    save.discoveries.push(d);
    save.xp += 50;
    const o = this.discoveryObjs[d];
    if (o) o.visible = false;
    sfx.unlock();
    this.game.persist();
    setUi({ discoveries: [...save.discoveries], xp: save.xp, dialog: { kind: 'discovery', id: d, actions: [{ label: '¡Genial!', kind: 'primary', onClick: () => setUi({ dialog: null }) }] } });
  }

  /* ---------------- cada frame ---------------- */

  update(dt: number, t: number) {
    for (const id of MISSION_ORDER) this.sites[id].update(dt, t);
    for (const id of MISSION_ORDER) {
      const b = this.beacons[id];
      if (!b) continue;
      const show = this.loaded ? !this.isDone(id) && this.isUnlocked(id) : id !== 'final';
      b.group.visible = show;
      if (show) {
        b.beamMat.opacity = 0.16 + Math.sin(t * 2 + MISSION_ORDER.indexOf(id)) * 0.06;
        b.ring.scale.setScalar(1 + ((t * 0.6) % 1) * 0.6);
        b.ringMat.opacity = 0.6 * (1 - ((t * 0.6) % 1));
      }
    }
    for (const d of DISCOVERY_ORDER) {
      const o = this.discoveryObjs[d];
      if (o?.visible) o.children[0].position.y = 1.6 + Math.sin(t * 2 + o.position.x) * 0.15;
    }
    if (!this.loaded || !this.game.save) return;

    const p = this.game.player;
    for (const id of MISSION_ORDER) {
      for (const n of this.npcs[id] ?? []) {
        const d = Math.hypot(n.pos.x - p.x, n.pos.z - p.z);
        const vis = d < 90;
        n.rig.root.visible = n.label.visible = n.marker.visible = vis;
        if (!vis) continue;
        const target = d < 7 ? Math.atan2(p.x - n.pos.x, p.z - n.pos.z) : n.baseYaw;
        let diff = target - n.rig.root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        n.rig.root.rotation.y += diff * Math.min(1, dt * 4);
        animateAstronaut(n.rig, 0, 0, t + n.pos.x);
        n.rig.armL.rotation.x = d < 7 ? -0.6 + Math.sin(t * 6) * 0.4 : 0;
        n.marker.position.y = n.pos.y + 3.9 + Math.sin(t * 3 + n.pos.z) * 0.12;
      }
      for (const pd of this.pedestals[id] ?? []) {
        pd.holo.position.y = 2 + Math.sin(t * 2 + pd.pos.x) * 0.12;
        pd.group.visible = Math.hypot(pd.pos.x - p.x, pd.pos.z - p.z) < 90 && !this.state(id).decided;
      }
    }

    // Llegar a un sitio activa la misión
    let active: MissionId | null = null;
    for (const id of MISSION_ORDER) {
      const s = this.sites[id];
      if (this.isDone(id) || !this.isUnlocked(id)) continue;
      const d = this.game.distTo(s.layout.x, s.layout.z);
      if (d < s.layout.radius + 6) active = id;
    }
    if (active !== getUi().activeMission) setUi({ activeMission: active });
    if (active && !this.game.paused && !this.game.minigame && !this.state(active).briefed) {
      const s = this.sites[active];
      if (this.game.distTo(s.layout.x, s.layout.z) < s.layout.radius + 2) this.brief(active);
    }

    // Tormenta de polvo alrededor de los sitios con problemas de luz
    let storm = 0;
    for (const id of ['greenhouse', 'darkness'] as MissionId[]) {
      if (this.isDone(id)) continue;
      const s = this.sites[id];
      const d = this.game.distTo(s.layout.x, s.layout.z);
      storm = Math.max(storm, (1 - Math.min(1, Math.max(0, (d - 18) / 40))) * 0.55);
    }
    if (this.game.minigame && (getUi().mg?.missionId === 'greenhouse' || getUi().mg?.missionId === 'darkness')) storm *= 0.5;
    this.game.world.storm += (storm - this.game.world.storm) * Math.min(1, dt * 0.8);

    this.objTimer += dt;
    if (this.objTimer > 0.3) {
      this.objTimer = 0;
      this.refreshUi();
    }
  }

  /* ---------------- interfaz ---------------- */

  refreshUi() {
    if (!this.game.save) return;
    const save = this.game.save;
    const ui = getUi();
    const active = ui.activeMission;
    const progress: Record<string, { stars: number; done: boolean }> = {};
    for (const id of MISSION_ORDER) progress[id] = { stars: save.missions[id]?.stars ?? 0, done: !!save.missions[id] };

    let objective: NonNullable<typeof ui.objective>;
    let intel: typeof ui.intel = null;
    if (active) {
      const m = MISSIONS[active];
      const st = this.state(active);
      const puzzle = this.puzzle(active);
      intel = {
        missionId: active,
        question: puzzle.question,
        cards: st.intel.map((r) => puzzle.intel[r]),
        options: puzzle.options,
        discarded: [...st.discarded],
        missing: ROLE_ORDER.filter((r) => !st.intel.includes(r)),
      };
      let text: string;
      let step: string;
      if (!st.briefed) {
        text = MISSION_WORLD[active].problem;
        step = '1/3';
      } else if (st.intel.length < 4) {
        text = `Habla con los especialistas 💬 (${st.intel.length}/4) y reúne sus datos.`;
        step = '1/3';
      } else if (!st.decided) {
        text = `${puzzle.question} Examina los pedestales y elige.`;
        step = '2/3';
      } else {
        text = `Repara el sitio: ${MISSION_WORLD[active].game.emoji} ${MISSION_WORLD[active].game.name}. Ve al centro y presiona acción.`;
        step = '3/3';
      }
      objective = { title: `${m.code} · ${m.titleEs}`, text, color: m.color, emoji: m.emoji, step };
    } else {
      const left = FIVE.filter((m) => !this.isDone(m));
      if (left.length > 0) {
        objective = {
          title: 'Explora la colonia',
          text: `Quedan ${left.length} problema${left.length > 1 ? 's' : ''}. Sigue una columna de luz: ${left.map((m) => MISSIONS[m].emoji).join(' ')}`,
          color: '#B69CFF',
          emoji: '🧭',
        };
      } else if (!this.isDone('final')) {
        objective = { title: `${MISSIONS.final.code} · ${MISSIONS.final.titleEs}`, text: 'Ve al Centro de mando, en medio de la colonia.', color: MISSIONS.final.color, emoji: MISSIONS.final.emoji };
      } else {
        const found = save.discoveries.length;
        objective = {
          title: 'Colonia autosuficiente',
          text: found < DISCOVERY_ORDER.length ? `Busca descubrimientos escondidos en Marte (${found}/${DISCOVERY_ORDER.length}).` : '¡Lo lograste todo! Explora libremente.',
          color: '#55DB7A',
          emoji: '🌕',
        };
      }
    }
    setUi({ objective, intel, progress });
  }

  /** Nombre del edificio desbloqueado (para la interfaz). */
  buildingName(id: MissionId) {
    const b = BUILDINGS[MISSIONS[id].unlock];
    return `${b.emoji} ${b.name}`;
  }
}
