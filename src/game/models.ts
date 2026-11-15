// Modelos 3D procedurales de estilo "low-poly": todo se construye con geometría simple,
// sin archivos externos, para que el juego cargue rápido y funcione sin conexión.

import * as THREE from 'three';

const matCache = new Map<string, THREE.Material>();
const shared = new WeakSet<THREE.Material>();

export function mat(color: string | number, opts: { emissive?: string | number; ei?: number; rough?: number; metal?: number; opacity?: number; flat?: boolean; side?: THREE.Side } = {}) {
  const key = JSON.stringify([color, opts]);
  let m = matCache.get(key);
  if (!m) {
    const sm = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.rough ?? 0.85,
      metalness: opts.metal ?? 0.05,
      flatShading: opts.flat ?? true,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.ei ?? 1,
      side: opts.side ?? THREE.FrontSide,
    });
    if (opts.opacity !== undefined && opts.opacity < 1) {
      sm.transparent = true;
      sm.opacity = opts.opacity;
      sm.depthWrite = false;
    }
    m = sm;
    matCache.set(key, m);
    shared.add(m);
  }
  return m;
}

/** Material único (no compartido) para objetos cuyo color cambia en tiempo real. */
export function ownMat(color: string | number, opts: { emissive?: string | number; ei?: number; rough?: number; metal?: number; opacity?: number } = {}) {
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough ?? 0.8,
    metalness: opts.metal ?? 0.05,
    flatShading: true,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.ei ?? 1,
  });
  if (opts.opacity !== undefined && opts.opacity < 1) {
    m.transparent = true;
    m.opacity = opts.opacity;
    m.depthWrite = false;
  }
  return m;
}

export function mesh(geo: THREE.BufferGeometry, material: THREE.Material, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

export function at<T extends THREE.Object3D>(o: T, x: number, y: number, z: number, ry = 0): T {
  o.position.set(x, y, z);
  o.rotation.y = ry;
  return o;
}

/* ------------------------------------------------------------------ */
/* Astronauta                                                           */
/* ------------------------------------------------------------------ */

export interface AstronautRig {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
}

export function makeAstronaut(opts: { suit: string; visor: string; accent?: string; helmet?: number; accessory?: number; scale?: number }): AstronautRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const suitM = mat(opts.suit, { rough: 0.7 });
  const white = mat('#F4F1EA', { rough: 0.6 });
  const dark = mat('#2B2550', { rough: 0.6 });
  const accent = mat(opts.accent ?? opts.suit, { rough: 0.6 });
  const visorM = mat(opts.visor, { rough: 0.15, metal: 0.6, emissive: opts.visor, ei: 0.25, flat: false });

  // Torso
  const torso = mesh(new THREE.CapsuleGeometry(0.42, 0.45, 4, 10), suitM);
  torso.position.y = 1.15;
  body.add(torso);
  const belt = mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.12, 12), dark);
  belt.position.y = 0.92;
  body.add(belt);
  const chest = mesh(new THREE.BoxGeometry(0.42, 0.26, 0.12), white);
  chest.position.set(0, 1.2, 0.38);
  body.add(chest);
  const light = mesh(new THREE.BoxGeometry(0.12, 0.08, 0.04), mat(opts.accent ?? '#55DB7A', { emissive: opts.accent ?? '#55DB7A', ei: 0.8 }));
  light.position.set(0.1, 1.24, 0.45);
  body.add(light);
  const stripe = mesh(new THREE.TorusGeometry(0.43, 0.05, 6, 16), accent);
  stripe.rotation.x = Math.PI / 2;
  stripe.position.y = 1.38;
  body.add(stripe);
  // Mochila
  const pack = mesh(new THREE.BoxGeometry(0.62, 0.7, 0.3), white);
  pack.position.set(0, 1.2, -0.42);
  body.add(pack);
  const tank = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8), accent);
  tank.position.set(0.2, 1.22, -0.6);
  body.add(tank);
  const tank2 = tank.clone();
  tank2.position.x = -0.2;
  body.add(tank2);

  // Cabeza / casco
  const head = new THREE.Group();
  head.position.y = 1.85;
  body.add(head);
  const helmet = mesh(new THREE.SphereGeometry(0.44, 16, 12), white);
  head.add(helmet);
  const visor = mesh(new THREE.SphereGeometry(0.36, 16, 10, -Math.PI * 0.42, Math.PI * 0.84, Math.PI * 0.28, Math.PI * 0.42), visorM, false);
  visor.position.set(0, 0.02, 0.12);
  visor.rotation.y = 0;
  head.add(visor);
  const ring = mesh(new THREE.TorusGeometry(0.3, 0.06, 6, 16), accent);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.38;
  head.add(ring);
  const hv = opts.helmet ?? 0;
  if (hv === 1) {
    const cap = mesh(new THREE.SphereGeometry(0.46, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.32), suitM);
    head.add(cap);
  } else if (hv === 2) {
    const band = mesh(new THREE.TorusGeometry(0.45, 0.05, 6, 18), dark);
    band.position.y = 0.12;
    band.rotation.x = Math.PI / 2;
    head.add(band);
  } else if (hv === 3) {
    const ant = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 5), dark);
    ant.position.set(0.25, 0.5, 0);
    head.add(ant);
    const bulb = mesh(new THREE.SphereGeometry(0.07, 8, 6), mat(opts.visor, { emissive: opts.visor, ei: 1 }));
    bulb.position.set(0.25, 0.72, 0);
    head.add(bulb);
  } else if (hv === 4) {
    const fin = mesh(new THREE.BoxGeometry(0.06, 0.22, 0.6), suitM);
    fin.position.set(0, 0.45, -0.05);
    head.add(fin);
  }
  const acc = opts.accessory ?? 0;
  if (acc === 2) {
    const sprout = mesh(new THREE.ConeGeometry(0.1, 0.25, 5), mat('#55DB7A'));
    sprout.position.set(-0.18, 0.5, 0);
    head.add(sprout);
  } else if (acc === 3) {
    for (const s of [-1, 1]) {
      const ear = mesh(new THREE.ConeGeometry(0.12, 0.22, 4), suitM);
      ear.position.set(0.26 * s, 0.4, 0);
      head.add(ear);
    }
  } else if (acc === 4) {
    for (const s of [-1, 1]) {
      const ph = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 10), dark);
      ph.rotation.z = Math.PI / 2;
      ph.position.set(0.44 * s, 0, 0);
      head.add(ph);
    }
  } else if (acc === 5) {
    const halo = mesh(new THREE.TorusGeometry(0.62, 0.035, 6, 24), mat('#FFC93C', { emissive: '#FFC93C', ei: 0.6 }));
    halo.rotation.x = Math.PI / 2.4;
    head.add(halo);
  } else if (acc === 1) {
    const ant = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 5), dark);
    ant.position.set(-0.2, 0.5, 0);
    head.add(ant);
    const ball = mesh(new THREE.SphereGeometry(0.06, 8, 6), mat('#FF4FB0', { emissive: '#FF4FB0', ei: 0.8 }));
    ball.position.set(-0.2, 0.7, 0);
    head.add(ball);
  }

  // Brazos y piernas (pivotan en el hombro / cadera)
  const limb = (len: number, r: number) => {
    const g = new THREE.Group();
    const seg = mesh(new THREE.CapsuleGeometry(r, len, 3, 8), suitM);
    seg.position.y = -len / 2 - r * 0.4;
    g.add(seg);
    const cuff = mesh(new THREE.CylinderGeometry(r * 1.12, r * 1.12, 0.1, 8), white);
    cuff.position.y = -len - r * 0.5;
    g.add(cuff);
    return g;
  };
  const armL = limb(0.42, 0.13);
  armL.position.set(0.55, 1.45, 0);
  const armR = limb(0.42, 0.13);
  armR.position.set(-0.55, 1.45, 0);
  const gloveM = mat('#F4F1EA');
  for (const a of [armL, armR]) {
    const glove = mesh(new THREE.SphereGeometry(0.15, 8, 6), gloveM);
    glove.position.y = -0.72;
    a.add(glove);
  }
  const legL = limb(0.38, 0.16);
  legL.position.set(0.2, 0.82, 0);
  const legR = limb(0.38, 0.16);
  legR.position.set(-0.2, 0.82, 0);
  const bootM = mat('#3C3566');
  for (const l of [legL, legR]) {
    const boot = mesh(new THREE.BoxGeometry(0.3, 0.2, 0.42), bootM);
    boot.position.set(0, -0.68, 0.06);
    l.add(boot);
  }
  body.add(armL, armR, legL, legR);
  const s = opts.scale ?? 1;
  root.scale.setScalar(s);
  return { root, body, head, armL, armR, legL, legR };
}

export function animateAstronaut(rig: AstronautRig, phase: number, speed01: number, t: number, airborne = false) {
  const swing = Math.sin(phase) * 0.8 * speed01;
  rig.legL.rotation.x = airborne ? -0.5 : swing;
  rig.legR.rotation.x = airborne ? 0.3 : -swing;
  rig.armL.rotation.x = airborne ? -1.2 : -swing * 0.9;
  rig.armR.rotation.x = airborne ? -1.2 : swing * 0.9;
  rig.armL.rotation.z = airborne ? 0.4 : 0.12;
  rig.armR.rotation.z = airborne ? -0.4 : -0.12;
  rig.body.position.y = Math.abs(Math.sin(phase)) * 0.08 * speed01 + (1 - speed01) * Math.sin(t * 2) * 0.02;
  rig.head.rotation.z = Math.sin(t * 1.3) * 0.03;
}

/* ------------------------------------------------------------------ */
/* IX: dron compañero                                                    */
/* ------------------------------------------------------------------ */

export function makeIxDrone() {
  const g = new THREE.Group();
  const core = mesh(new THREE.IcosahedronGeometry(0.42, 1), mat('#FFF1D6', { emissive: '#FFE7B8', ei: 0.35, rough: 0.5 }), false);
  g.add(core);
  const eyeM = mat('#211A4A');
  for (const s of [-1, 1]) {
    const eye = mesh(new THREE.SphereGeometry(0.07, 8, 6), eyeM, false);
    eye.scale.set(1, 1.5, 0.6);
    eye.position.set(0.13 * s, 0.04, 0.38);
    g.add(eye);
  }
  const ring = mesh(new THREE.TorusGeometry(0.68, 0.035, 6, 32), mat('#B69CFF', { emissive: '#B69CFF', ei: 1 }), false);
  ring.rotation.x = Math.PI / 2.3;
  g.add(ring);
  const sat = mesh(new THREE.SphereGeometry(0.09, 8, 6), mat('#FFC93C', { emissive: '#FFC93C', ei: 1 }), false);
  sat.position.set(0.68, 0, 0);
  const satPivot = new THREE.Group();
  satPivot.add(sat);
  satPivot.rotation.x = Math.PI / 2.3;
  g.add(satPivot);
  const glow = new THREE.PointLight('#B69CFF', 1.2, 6, 2);
  g.add(glow);
  return { group: g, ring, satPivot };
}

/* ------------------------------------------------------------------ */
/* Edificios                                                            */
/* ------------------------------------------------------------------ */

export function makeDome(r: number, opts: { glass?: boolean; color?: string; ribs?: boolean } = {}) {
  const g = new THREE.Group();
  const base = mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.06, 0.6, 24), mat('#D9D4CC'));
  base.position.y = 0.3;
  g.add(base);
  const domeGeo = new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const dome = mesh(domeGeo, opts.glass ? mat('#BFF3FF', { opacity: 0.35, rough: 0.1, metal: 0.2, side: THREE.DoubleSide }) : mat(opts.color ?? '#EDEAE4', { rough: 0.7 }), !opts.glass);
  dome.position.y = 0.6;
  g.add(dome);
  if (opts.ribs !== false) {
    const ribM = mat('#F7F5F0');
    for (let i = 0; i < 6; i++) {
      const rib = mesh(new THREE.TorusGeometry(r, 0.06, 4, 24, Math.PI), ribM);
      rib.position.y = 0.6;
      rib.rotation.y = (i / 6) * Math.PI;
      g.add(rib);
    }
    const ring = mesh(new THREE.TorusGeometry(r * 0.7, 0.06, 4, 24), ribM);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.6 + r * 0.71;
    g.add(ring);
  }
  return { group: g, dome };
}

export function makeTubeModule(len: number, r: number, color = '#EDEAE4', stripe = '#FF6B5B') {
  const g = new THREE.Group();
  const body = mesh(new THREE.CylinderGeometry(r, r, len, 16), mat(color, { rough: 0.6 }));
  body.rotation.z = Math.PI / 2;
  body.position.y = r + 0.3;
  g.add(body);
  for (const s of [-1, 1]) {
    const cap = mesh(new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(color, { rough: 0.6 }));
    cap.rotation.z = (-Math.PI / 2) * s;
    cap.position.set((len / 2) * s, r + 0.3, 0);
    g.add(cap);
  }
  const band = mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.01, 0.3, 16, 1, true), mat(stripe));
  band.rotation.z = Math.PI / 2;
  band.position.y = r + 0.3;
  g.add(band);
  const winM = mat('#7FDBFF', { emissive: '#3CC8FF', ei: 0.3, rough: 0.2 });
  for (let i = -1; i <= 1; i++) {
    const w = mesh(new THREE.CircleGeometry(0.28, 10), winM, false);
    w.position.set(i * (len / 3.2), r + 0.5, r + 0.01);
    g.add(w);
  }
  const legM = mat('#8C8577');
  for (const s of [-1, 1]) {
    const leg = mesh(new THREE.BoxGeometry(0.3, 0.6, r * 1.6), legM);
    leg.position.set((len / 3) * s, 0.3, 0);
    g.add(leg);
  }
  return g;
}

export function makeSolarPanel(w = 2.4, d = 1.4, tilt = 0.35) {
  const g = new THREE.Group();
  const post = mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 6), mat('#8C8577'));
  post.position.y = 0.5;
  g.add(post);
  const panel = mesh(new THREE.BoxGeometry(w, 0.08, d), mat('#1F3A8A', { rough: 0.25, metal: 0.5, emissive: '#16307A', ei: 0.25 }));
  panel.position.y = 1.05;
  panel.rotation.x = -tilt;
  g.add(panel);
  const frame = mesh(new THREE.BoxGeometry(w + 0.1, 0.05, 0.08), mat('#D9D4CC'));
  frame.position.set(0, 1.05 + Math.sin(tilt) * (d / 2), -Math.cos(tilt) * (d / 2));
  g.add(frame);
  return g;
}

export function makeTank(r = 1.4, h = 3, color = '#E9E6DF') {
  const g = new THREE.Group();
  const body = mesh(new THREE.CylinderGeometry(r, r, h, 16), mat(color, { rough: 0.5, metal: 0.2 }));
  body.position.y = h / 2 + 0.4;
  g.add(body);
  const top = mesh(new THREE.SphereGeometry(r, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(color, { rough: 0.5, metal: 0.2 }));
  top.position.y = h + 0.4;
  g.add(top);
  const band = mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, 0.25, 16, 1, true), mat('#3CC8FF'));
  band.position.y = h * 0.7;
  g.add(band);
  const legM = mat('#8C8577');
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), legM);
    leg.position.set(Math.cos(a) * r * 0.8, 0.3, Math.sin(a) * r * 0.8);
    g.add(leg);
  }
  return g;
}

export function makeRover(color = '#F4F1EA', accent = '#FFC93C') {
  const g = new THREE.Group();
  const chassis = mesh(new THREE.BoxGeometry(1.8, 0.45, 2.4), mat(color, { rough: 0.6 }));
  chassis.position.y = 0.85;
  g.add(chassis);
  const deck = mesh(new THREE.BoxGeometry(1.5, 0.2, 1.2), mat(accent));
  deck.position.set(0, 1.18, -0.3);
  g.add(deck);
  const mast = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 6), mat('#8C8577'));
  mast.position.set(0.5, 1.5, 0.8);
  g.add(mast);
  const camHead = mesh(new THREE.BoxGeometry(0.4, 0.22, 0.25), mat('#2B2550'));
  camHead.position.set(0.5, 2, 0.85);
  g.add(camHead);
  const eye = mesh(new THREE.CircleGeometry(0.07, 8), mat('#3CC8FF', { emissive: '#3CC8FF', ei: 1 }), false);
  eye.position.set(0.5, 2, 0.98);
  g.add(eye);
  const wheels: THREE.Mesh[] = [];
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12);
  const wheelM = mat('#3C3566');
  for (const sx of [-1, 1]) {
    for (const sz of [-0.85, 0, 0.85]) {
      const w = mesh(wheelGeo, wheelM);
      w.rotation.z = Math.PI / 2;
      w.position.set(sx * 1.02, 0.4, sz);
      g.add(w);
      wheels.push(w);
    }
  }
  return { group: g, wheels };
}

export function makeRocket() {
  const g = new THREE.Group();
  const white = mat('#F4F1EA', { rough: 0.5 });
  const body = mesh(new THREE.CylinderGeometry(1.4, 1.6, 9, 16), white);
  body.position.y = 6;
  g.add(body);
  const nose = mesh(new THREE.ConeGeometry(1.4, 3.2, 16), mat('#FF6B5B'));
  nose.position.y = 12.1;
  g.add(nose);
  const win = mesh(new THREE.CircleGeometry(0.45, 12), mat('#7FDBFF', { emissive: '#3CC8FF', ei: 0.5 }), false);
  win.position.set(0, 9, 1.42);
  g.add(win);
  for (let i = 0; i < 4; i++) {
    const fin = mesh(new THREE.BoxGeometry(0.2, 3, 2), mat('#FF6B5B'));
    const a = (i / 4) * Math.PI * 2;
    fin.position.set(Math.cos(a) * 1.8, 2.6, Math.sin(a) * 1.8);
    fin.rotation.y = -a;
    g.add(fin);
  }
  const band = mesh(new THREE.CylinderGeometry(1.52, 1.52, 0.5, 16, 1, true), mat('#4C6FFF'));
  band.position.y = 4;
  g.add(band);
  return g;
}

export function makeRock(size: number, seed: number, color = '#A8553A') {
  const geo = new THREE.IcosahedronGeometry(size, 0);
  const pos = geo.attributes.position;
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  for (let i = 0; i < pos.count; i++) {
    const k = 0.75 + rnd() * 0.5;
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k * 0.7, pos.getZ(i) * k);
  }
  geo.computeVertexNormals();
  return mesh(geo, mat(color, { rough: 1 }));
}

export function makeBeacon(color: string, height = 40) {
  const g = new THREE.Group();
  const beamMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.6, height, 16, 1, true), beamMat);
  beam.position.y = height / 2;
  g.add(beam);
  const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.6, 32), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.08;
  g.add(ring);
  return { group: g, beam, ring, beamMat, ringMat };
}

export function makePedestal(color: string) {
  const g = new THREE.Group();
  const base = mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.9, 8), mat('#D9D4CC'));
  base.position.y = 0.45;
  g.add(base);
  const top = mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.1, 8), mat(color, { emissive: color, ei: 0.5 }));
  top.position.y = 0.95;
  g.add(top);
  return g;
}

export function makePlant(kind: number, scale = 1) {
  const g = new THREE.Group();
  const stem = mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.6, 5), mat('#2F9E52'));
  stem.position.y = 0.3;
  g.add(stem);
  const leafM = mat(['#55DB7A', '#7BE896', '#3FCF6E'][kind % 3]);
  for (let i = 0; i < 4; i++) {
    const leaf = mesh(new THREE.SphereGeometry(0.2, 6, 4), leafM);
    leaf.scale.set(1, 0.4, 0.6);
    const a = (i / 4) * Math.PI * 2 + kind;
    leaf.position.set(Math.cos(a) * 0.18, 0.35 + i * 0.08, Math.sin(a) * 0.18);
    leaf.rotation.y = -a;
    g.add(leaf);
  }
  if (kind % 2 === 0) {
    const fruit = mesh(new THREE.SphereGeometry(0.1, 6, 5), mat(['#FF5A4E', '#FFC93C', '#FF9A3C'][kind % 3]));
    fruit.position.set(0.12, 0.5, 0.1);
    g.add(fruit);
  }
  g.scale.setScalar(scale);
  return g;
}

/* ------------------------------------------------------------------ */
/* Etiquetas flotantes (texto + emoji en un sprite)                     */
/* ------------------------------------------------------------------ */

export function makeLabel(text: string, opts: { emoji?: string; color?: string; bg?: string; size?: number; sub?: string } = {}) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const font = '700 44px "Fredoka Variable", Fredoka, system-ui, sans-serif';
  const subFont = '600 28px "Nunito Variable", Nunito, system-ui, sans-serif';
  ctx.font = font;
  const emojiW = opts.emoji ? 64 : 0;
  let w = ctx.measureText(text).width;
  if (opts.sub) {
    ctx.font = subFont;
    w = Math.max(w, ctx.measureText(opts.sub).width);
  }
  const pad = 26;
  canvas.width = Math.ceil(w + emojiW + pad * 2);
  canvas.height = opts.sub ? 120 : 84;
  const c = canvas.getContext('2d')!;
  const r = 30;
  c.fillStyle = opts.bg ?? 'rgba(17,20,64,0.86)';
  c.beginPath();
  c.roundRect(2, 2, canvas.width - 4, canvas.height - 4, r);
  c.fill();
  c.lineWidth = 4;
  c.strokeStyle = opts.color ?? '#FFF4DC';
  c.stroke();
  c.textBaseline = 'middle';
  if (opts.emoji) {
    c.font = '46px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    c.fillText(opts.emoji, pad - 4, opts.sub ? 44 : canvas.height / 2 + 2);
  }
  c.fillStyle = '#FFF8EC';
  c.font = font;
  c.fillText(text, pad + emojiW, opts.sub ? 44 : canvas.height / 2 + 2);
  if (opts.sub) {
    c.font = subFont;
    c.fillStyle = opts.color ?? '#FBD9B5';
    c.fillText(opts.sub, pad + emojiW, 90);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const sm = new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true });
  const sprite = new THREE.Sprite(sm);
  const h = opts.size ?? 0.7;
  sprite.scale.set((canvas.width / canvas.height) * h, h, 1);
  sprite.renderOrder = 10;
  return sprite;
}

/** Sprite circular grande con un emoji (para hologramas e íconos de incidentes). */
export function makeEmojiSprite(emoji: string, size = 1.2, ring = '#FFF4DC') {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const c = canvas.getContext('2d')!;
  c.fillStyle = 'rgba(17,20,64,0.85)';
  c.beginPath();
  c.arc(64, 64, 58, 0, Math.PI * 2);
  c.fill();
  c.lineWidth = 6;
  c.strokeStyle = ring;
  c.stroke();
  c.font = '68px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(emoji, 64, 70);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
  sprite.scale.set(size, size, 1);
  sprite.renderOrder = 10;
  return sprite;
}

export function disposeTree(o: THREE.Object3D) {
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mm = (m as unknown as { material?: THREE.Material | THREE.Material[] }).material;
    const list = Array.isArray(mm) ? mm : mm ? [mm] : [];
    for (const x of list) {
      if (shared.has(x)) continue;
      const map = (x as THREE.SpriteMaterial).map;
      if (map) map.dispose();
      x.dispose();
    }
  });
}
