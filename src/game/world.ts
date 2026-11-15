// El mundo: terreno de Marte, cielo con ciclo de día y noche, luces, polvo, caminos
// y el trazado de la colonia (dónde está cada misión).

import * as THREE from 'three';
import type { DiscoveryId, MissionId } from '../../shared/types';
import { at, makeDome, makeLabel, makeRock, makeRocket, makeTubeModule, mat, mesh } from './models';

/* ------------------------------------------------------------------ */
/* Trazado de la colonia                                                */
/* ------------------------------------------------------------------ */

export interface SiteLayout {
  id: MissionId;
  x: number;
  z: number;
  /** Ángulo (rad) hacia el que "mira" el sitio: apunta al centro de la colonia. */
  face: number;
  radius: number;
}

function ring(id: MissionId, angleDeg: number, dist: number, radius = 17): SiteLayout {
  const a = (angleDeg * Math.PI) / 180;
  const x = Math.sin(a) * dist;
  const z = -Math.cos(a) * dist;
  return { id, x, z, face: Math.atan2(-x, -z), radius };
}

export const LAYOUT: Record<MissionId, SiteLayout> = {
  greenhouse: ring('greenhouse', 0, 50),
  water: ring('water', 62, 50),
  darkness: ring('darkness', 124, 52, 20),
  signal: ring('signal', 186, 50),
  habitat: ring('habitat', 252, 50),
  final: { id: 'final', x: 0, z: 0, face: Math.PI, radius: 15 },
};

export const SPAWN = { x: -30, z: -32 };
export const WORLD_RADIUS = 125;

export const DISCOVERY_SPOTS: Record<DiscoveryId, [number, number]> = {
  meteorite: [62, -66],
  lavatube: [-86, -18],
  ice: [26, -98],
  dustdevil: [92, 52],
  layers: [-48, 86],
  blueberries: [-78, -78],
};

/* ------------------------------------------------------------------ */
/* Altura del terreno                                                   */
/* ------------------------------------------------------------------ */

function hash(x: number, z: number) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x: number, z: number) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi);
  const b = hash(xi + 1, zi);
  const c = hash(xi, zi + 1);
  const d = hash(xi + 1, zi + 1);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const FLAT_SPOTS: [number, number, number][] = [
  ...Object.values(LAYOUT).map((l) => [l.x, l.z, l.radius + 2] as [number, number, number]),
  [SPAWN.x, SPAWN.z, 9],
];

export function groundHeight(x: number, z: number): number {
  const d = Math.hypot(x, z);
  let h = vnoise(x * 0.035, z * 0.035) * 1.4 + vnoise(x * 0.11, z * 0.11) * 0.35;
  h *= 0.35 + smooth(60, 100, d) * 1.4;
  let flat = 1;
  for (const [fx, fz, r] of FLAT_SPOTS) flat = Math.min(flat, smooth(r, r + 8, Math.hypot(x - fx, z - fz)));
  h *= flat;
  // Cráter decorativo
  const cd = Math.hypot(x + 70, z - 40);
  if (cd < 16) h += -Math.cos((cd / 16) * Math.PI) * 1.6 - 0.4;
  // Montañas en el horizonte
  h += smooth(115, 210, d) * (16 + vnoise(x * 0.02, z * 0.02) * 14 + vnoise(x * 0.06, z * 0.06) * 4);
  return h;
}

/* ------------------------------------------------------------------ */
/* Colisiones                                                           */
/* ------------------------------------------------------------------ */

export interface Collider {
  x: number;
  z: number;
  r: number;
  tag?: string;
}

/* ------------------------------------------------------------------ */
/* Cielo                                                                */
/* ------------------------------------------------------------------ */

const SKY_VERT = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const SKY_FRAG = `
uniform vec3 top;
uniform vec3 horizon;
uniform vec3 sunColor;
uniform vec3 sunDir;
varying vec3 vDir;
void main() {
  float h = clamp(vDir.y, -0.2, 1.0);
  vec3 col = mix(horizon, top, pow(max(h, 0.0), 0.55));
  float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
  col += sunColor * (pow(s, 600.0) * 2.0 + pow(s, 12.0) * 0.35);
  gl_FragColor = vec4(col, 1.0);
}`;

export class World {
  scene: THREE.Scene;
  colliders: Collider[] = [];
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  sky: THREE.Mesh;
  skyMat: THREE.ShaderMaterial;
  stars: THREE.Points;
  fog: THREE.Fog;
  dust: THREE.Points;
  dustVel: Float32Array;
  lamps: THREE.Sprite[] = [];
  windowMats: THREE.MeshStandardMaterial[] = [];
  dayPhase = 0.38;
  storm = 0;
  quality: 'high' | 'low';
  private tmpColor = new THREE.Color();

  constructor(scene: THREE.Scene, quality: 'high' | 'low') {
    this.scene = scene;
    this.quality = quality;
    this.fog = new THREE.Fog('#D9A27E', 60, 260);
    scene.fog = this.fog;

    this.hemi = new THREE.HemisphereLight('#FFE3C4', '#7A3A22', 1.1);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#FFF1DC', 2.2);
    this.sun.castShadow = quality === 'high';
    if (this.sun.castShadow) {
      this.sun.shadow.mapSize.set(2048, 2048);
      const cam = this.sun.shadow.camera;
      cam.left = -40;
      cam.right = 40;
      cam.top = 40;
      cam.bottom = -40;
      cam.near = 1;
      cam.far = 160;
      this.sun.shadow.bias = -0.0006;
      this.sun.shadow.normalBias = 0.04;
    }
    scene.add(this.sun, this.sun.target);

    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        top: { value: new THREE.Color('#C98A62') },
        horizon: { value: new THREE.Color('#E8B48A') },
        sunColor: { value: new THREE.Color('#FFF1DC') },
        sunDir: { value: new THREE.Vector3(0.3, 0.6, 0.2) },
      },
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), this.skyMat);
    this.sky.renderOrder = -1;
    scene.add(this.sky);

    // Estrellas
    const starGeo = new THREE.BufferGeometry();
    const sp: number[] = [];
    for (let i = 0; i < 900; i++) {
      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const y = Math.abs(u) * 0.95 + 0.05;
      const r = Math.sqrt(1 - y * y);
      sp.push(Math.cos(th) * r * 380, y * 380, Math.sin(th) * r * 380);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#FFFFFF', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    scene.add(this.stars);

    // Lunas de Marte
    const phobos = mesh(new THREE.IcosahedronGeometry(6, 1), mat('#9B8E80', { rough: 1 }), false);
    phobos.position.set(-160, 190, -260);
    phobos.scale.set(1.3, 1, 1);
    (phobos.material as THREE.MeshStandardMaterial).fog = false;
    scene.add(phobos);
    const deimos = mesh(new THREE.IcosahedronGeometry(3, 1), mat('#B0A595', { rough: 1 }), false);
    deimos.position.set(220, 150, 180);
    scene.add(deimos);

    this.buildTerrain();
    this.buildPaths();
    this.buildRocks();
    this.buildHubDecor();

    // Polvo flotante alrededor de la cámara
    const n = quality === 'high' ? 700 : 300;
    const dg = new THREE.BufferGeometry();
    const dp = new Float32Array(n * 3);
    this.dustVel = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      dp[i * 3] = (Math.random() - 0.5) * 60;
      dp[i * 3 + 1] = Math.random() * 14;
      dp[i * 3 + 2] = (Math.random() - 0.5) * 60;
      this.dustVel[i] = 0.5 + Math.random();
    }
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: '#F0C7A4', size: 0.09, map: glowTexture(), transparent: true, opacity: 0.55, depthWrite: false }));
    this.dust.frustumCulled = false;
    scene.add(this.dust);

    this.setDayPhase(this.dayPhase);
  }

  private buildTerrain() {
    const seg = this.quality === 'high' ? 220 : 130;
    const size = 520;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors: number[] = [];
    const c1 = new THREE.Color('#C8643C');
    const c2 = new THREE.Color('#A94E2E');
    const c3 = new THREE.Color('#E08A5C');
    const c4 = new THREE.Color('#8E3F25');
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = groundHeight(x, z);
      pos.setY(i, h);
      const n = vnoise(x * 0.08 + 9, z * 0.08 - 3) * 0.5 + 0.5;
      tmp.copy(c1).lerp(c2, n * 0.7);
      if (h > 6) tmp.lerp(c3, Math.min(1, (h - 6) / 20));
      if (h < -0.6) tmp.lerp(c4, Math.min(1, (-h - 0.6) / 1.5));
      colors.push(tmp.r, tmp.g, tmp.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
    terrain.receiveShadow = true;
    terrain.name = 'terrain';
    this.scene.add(terrain);
  }

  private ribbon(points: THREE.Vector2[], width: number, color: string, lift = 0.04) {
    const verts: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const q = points[Math.min(points.length - 1, i + 1)];
      const o = points[Math.max(0, i - 1)];
      const dir = new THREE.Vector2(q.x - o.x, q.y - o.y).normalize();
      const nx = -dir.y * (width / 2);
      const nz = dir.x * (width / 2);
      for (const s of [-1, 1]) {
        const x = p.x + nx * s;
        const z = p.y + nz * s;
        verts.push(x, groundHeight(x, z) + lift, z);
      }
      if (i < points.length - 1) {
        const a = i * 2;
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.receiveShadow = true;
    this.scene.add(m);
    return m;
  }

  private buildPaths() {
    const color = '#E3A27A';
    const targets = [...Object.values(LAYOUT).filter((l) => l.id !== 'final').map((l) => [l.x, l.z]), [SPAWN.x, SPAWN.z]];
    for (const [tx, tz] of targets) {
      const pts: THREE.Vector2[] = [];
      const len = Math.hypot(tx, tz);
      const steps = Math.ceil(len / 2);
      for (let i = 0; i <= steps; i++) {
        const k = i / steps;
        const wob = Math.sin(k * Math.PI * 2) * 2.2 * Math.sin(k * Math.PI);
        const px = tx * k + (-tz / len) * wob;
        const pz = tz * k + (tx / len) * wob;
        if (Math.hypot(px, pz) < 13) continue;
        pts.push(new THREE.Vector2(px, pz));
      }
      this.ribbon(pts, 3.2, color);
    }
    // Anillo alrededor del centro de mando
    const ringPts: THREE.Vector2[] = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      ringPts.push(new THREE.Vector2(Math.cos(a) * 14, Math.sin(a) * 14));
    }
    this.ribbon(ringPts, 3, color);
  }

  private buildRocks() {
    const variants = [makeRock(1, 11), makeRock(1, 23, '#9C4A30'), makeRock(1, 37, '#B5643F')];
    const per = this.quality === 'high' ? 110 : 60;
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const dummy = new THREE.Object3D();
    for (const v of variants) {
      const inst = new THREE.InstancedMesh(v.geometry, v.material as THREE.Material, per);
      inst.castShadow = true;
      inst.receiveShadow = true;
      let placed = 0;
      let guard = 0;
      while (placed < per && guard++ < 4000) {
        const a = rnd() * Math.PI * 2;
        const d = 18 + rnd() * 160;
        const x = Math.cos(a) * d;
        const z = Math.sin(a) * d;
        if (!this.isFree(x, z, 5)) continue;
        if (this.nearPath(x, z, 3.5)) continue;
        const s = d < 70 ? 0.25 + rnd() * 0.7 : 0.5 + rnd() * 2.6;
        dummy.position.set(x, groundHeight(x, z) + s * 0.2, z);
        dummy.rotation.set(rnd() * 0.4, rnd() * Math.PI * 2, rnd() * 0.4);
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        inst.setMatrixAt(placed++, dummy.matrix);
        if (s > 0.8 && d < WORLD_RADIUS) this.colliders.push({ x, z, r: s * 0.9 });
      }
      inst.count = placed;
      this.scene.add(inst);
    }
  }

  isFree(x: number, z: number, margin: number) {
    for (const l of Object.values(LAYOUT)) if (Math.hypot(x - l.x, z - l.z) < l.radius + margin) return false;
    if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 12 + margin) return false;
    for (const [dx, dz] of Object.values(DISCOVERY_SPOTS)) if (Math.hypot(x - dx, z - dz) < 6) return false;
    return true;
  }

  private nearPath(x: number, z: number, w: number) {
    const targets = [...Object.values(LAYOUT).map((l) => [l.x, l.z]), [SPAWN.x, SPAWN.z]];
    for (const [tx, tz] of targets) {
      const len = Math.hypot(tx, tz) || 1;
      const k = Math.max(0, Math.min(1, (x * tx + z * tz) / (len * len)));
      if (Math.hypot(x - tx * k, z - tz * k) < w + 2.5) return true;
    }
    return false;
  }

  /** Lámpara decorativa con brillo nocturno. */
  addLamp(x: number, z: number, color = '#FFE3A0') {
    const y = groundHeight(x, z);
    const post = mesh(new THREE.CylinderGeometry(0.08, 0.1, 3, 6), mat('#8C8577'));
    post.position.set(x, y + 1.5, z);
    this.scene.add(post);
    const head = mesh(new THREE.SphereGeometry(0.22, 8, 6), mat(color, { emissive: color, ei: 1.2 }), false);
    head.position.set(x, y + 3.1, z);
    this.scene.add(head);
    const glowTex = glowTexture();
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
    glow.scale.set(4, 4, 1);
    glow.position.set(x, y + 3.1, z);
    this.scene.add(glow);
    this.lamps.push(glow);
  }

  private buildHubDecor() {
    // Plataforma de aterrizaje y cohete (punto de inicio)
    const padY = groundHeight(SPAWN.x, SPAWN.z);
    const pad = mesh(new THREE.CylinderGeometry(7, 7.4, 0.3, 8), mat('#8C8577', { rough: 0.9 }));
    pad.position.set(SPAWN.x - 4, padY + 0.15, SPAWN.z - 4);
    this.scene.add(pad);
    const hm = mesh(new THREE.RingGeometry(3, 3.6, 8), mat('#FFC93C', { emissive: '#FFC93C', ei: 0.4 }), false);
    hm.rotation.x = -Math.PI / 2;
    hm.position.set(SPAWN.x - 4, padY + 0.32, SPAWN.z - 4);
    this.scene.add(hm);
    const rocket = makeRocket();
    at(rocket, SPAWN.x - 4, padY + 0.3, SPAWN.z - 4);
    this.scene.add(rocket);
    this.colliders.push({ x: SPAWN.x - 4, z: SPAWN.z - 4, r: 2.6 });
    const lbl = makeLabel('Plataforma de aterrizaje', { emoji: '🚀', size: 0.9 });
    lbl.position.set(SPAWN.x - 4, padY + 16, SPAWN.z - 4);
    this.scene.add(lbl);

    // Módulos habitacionales alrededor del centro
    const mods: [number, number, number][] = [
      [-20, 6, 0.4],
      [20, -8, -0.3],
      [-14, 20, 1.2],
    ];
    for (const [x, z, ry] of mods) {
      const m = makeTubeModule(7, 1.6);
      at(m, x, groundHeight(x, z), z, ry);
      this.scene.add(m);
      this.colliders.push({ x: x + Math.cos(ry) * 2.4, z: z - Math.sin(ry) * 2.4, r: 2.2 }, { x: x - Math.cos(ry) * 2.4, z: z + Math.sin(ry) * 2.4, r: 2.2 }, { x, z, r: 2 });
    }
    const small = makeDome(3, { color: '#EDEAE4' });
    at(small.group, 18, groundHeight(18, 14), 14);
    this.scene.add(small.group);
    this.colliders.push({ x: 18, z: 14, r: 3.3 });

    // Lámparas a lo largo de los caminos
    for (const l of Object.values(LAYOUT)) {
      if (l.id === 'final') continue;
      for (const k of [0.38, 0.62]) {
        const len = Math.hypot(l.x, l.z);
        const nx = -l.z / len;
        const nz = l.x / len;
        this.addLamp(l.x * k + nx * 2.8, l.z * k + nz * 2.8);
      }
    }
  }

  /** p: 0..1 (0 = medianoche, 0.25 amanecer, 0.5 mediodía, 0.75 atardecer). */
  setDayPhase(p: number) {
    this.dayPhase = ((p % 1) + 1) % 1;
    const ang = (this.dayPhase - 0.25) * Math.PI * 2;
    const elev = Math.sin(ang);
    const sunDir = new THREE.Vector3(Math.cos(ang) * 0.8, elev, 0.45).normalize();
    this.skyMat.uniforms.sunDir.value.copy(sunDir);
    const day = smooth(-0.12, 0.35, elev);
    const dusk = Math.max(0, 1 - Math.abs(elev) / 0.3) * (elev > -0.2 ? 1 : 0);
    const storm = this.storm;

    const top = this.tmpColor.set('#0B0F38').lerp(new THREE.Color('#C98A62'), day);
    top.lerp(new THREE.Color('#9C6B52'), storm * 0.6);
    this.skyMat.uniforms.top.value.copy(top);
    const hor = new THREE.Color('#1C2470').lerp(new THREE.Color('#E8B48A'), day);
    // En Marte los atardeceres son azulados cerca del Sol
    hor.lerp(new THREE.Color('#8FB3D9'), dusk * 0.6);
    hor.lerp(new THREE.Color('#B9825F'), storm * 0.7);
    this.skyMat.uniforms.horizon.value.copy(hor);
    this.skyMat.uniforms.sunColor.value.set(dusk > 0.4 ? '#CFE4FF' : '#FFF1DC').multiplyScalar(Math.max(0, day) * (1 - storm * 0.8));

    this.fog.color.copy(hor);
    this.fog.near = 50 - storm * 40;
    this.fog.far = 260 - storm * 170;

    this.sun.intensity = (0.25 + day * 2.1) * (1 - storm * 0.55);
    this.sun.color.set(dusk > 0.4 ? '#DCE8FF' : '#FFF1DC');
    this.hemi.intensity = 0.8 + day * 0.4;
    this.hemi.color.set(day > 0.3 ? '#FFE3C4' : '#7C86D9');
    (this.stars.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - day * 1.6) * (1 - storm);
    const night = 1 - day;
    for (const l of this.lamps) (l.material as THREE.SpriteMaterial).opacity = 0.15 + night * 0.85;
    this.sunDir.copy(sunDir.y < 0.08 ? new THREE.Vector3(sunDir.x, 0.08, sunDir.z).normalize() : sunDir);
  }

  sunDir = new THREE.Vector3(0.3, 0.6, 0.2);

  update(dt: number, focus: THREE.Vector3, camPos: THREE.Vector3) {
    this.sun.position.copy(focus).addScaledVector(this.sunDir, 80);
    this.sun.target.position.copy(focus);
    this.sky.position.copy(camPos);
    this.stars.position.copy(camPos);
    // Polvo
    const pos = this.dust.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const wind = 1.5 + this.storm * 9;
    for (let i = 0; i < this.dustVel.length; i++) {
      let x = arr[i * 3] + wind * this.dustVel[i] * dt;
      let y = arr[i * 3 + 1] - 0.2 * dt;
      let z = arr[i * 3 + 2] + wind * 0.3 * this.dustVel[i] * dt;
      if (x > 30) x -= 60;
      if (z > 30) z -= 60;
      if (y < 0) y += 14;
      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }
    pos.needsUpdate = true;
    this.dust.position.set(focus.x, groundHeight(focus.x, focus.z), focus.z);
    const dm = this.dust.material as THREE.PointsMaterial;
    dm.size = 0.09 + this.storm * 0.16;
    dm.opacity = 0.35 + this.storm * 0.5;
  }
}

let glowTex: THREE.Texture | null = null;
export function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.3, 'rgba(255,255,255,0.5)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}
