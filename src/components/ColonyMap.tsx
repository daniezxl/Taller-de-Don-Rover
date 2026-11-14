// Mapa vivo de la colonia MARS-01: diorama 2.5D en SVG. Cada sector cambia según su salud,
// aparecen edificios nuevos con cada misión y el clima reacciona a los eventos globales.

import { useId, type ReactNode } from 'react';
import { BUILDINGS, SECTORS, SECTOR_ORDER, SYSTEMS } from '../../shared/content';
import type { BuildingId, SectorId, SystemId } from '../../shared/types';

const INK = '#211A4A';
const W = '#F4F5FB';
const G = '#C9CCE0';

const HUB = { x: 500, y: 398 };

export const SECTOR_POS: Record<SectorId, { x: number; y: number }> = (() => {
  const out = {} as Record<SectorId, { x: number; y: number }>;
  SECTOR_ORDER.forEach((s, i) => {
    const a = ((-112.5 + i * 45) * Math.PI) / 180;
    out[s] = { x: Math.round(HUB.x + 330 * Math.cos(a)), y: Math.round(HUB.y + 138 * Math.sin(a)) };
  });
  return out;
})();

const BUILD_POS: Record<Exclude<BuildingId, 'city'>, { x: number; y: number }> = {
  hydroponics: { x: 268, y: 292 },
  recycler: { x: 738, y: 288 },
  antenna: { x: 500, y: 262 },
  reactor: { x: 742, y: 540 },
  module: { x: 256, y: 548 },
};

const depth = (y: number) => 1.22 * (0.74 + 0.36 * ((y - 250) / 300));

/* ---------------- edificios ---------------- */

const shadowE = (rx = 46) => <ellipse cx="0" cy="2" rx={rx} ry={rx * 0.28} fill="#6E2412" opacity=".35" />;
const win = (lit: boolean) => (lit ? '#FFE7A0' : '#2A3570');

function Greenhouse({ lit, glass }: { lit: boolean; glass: string }) {
  return (
    <g>
      {shadowE(48)}
      <ellipse cx="0" cy="-2" rx="43" ry="11" fill={G} stroke={INK} strokeWidth="2" />
      <path d="M-40 -4 A40 40 0 0 1 40 -4 Z" fill={`url(#${glass})`} stroke={INK} strokeWidth="2.2" />
      <g fill="#3FCF6E" stroke="#1E6B3A" strokeWidth="1">
        <circle cx="-24" cy="-10" r="5" />
        <circle cx="-12" cy="-12" r="6" />
        <circle cx="0" cy="-11" r="5.5" />
        <circle cx="12" cy="-12" r="6" />
        <circle cx="24" cy="-10" r="5" />
        <circle cx="-15" cy="-21" r="4.5" fill="#7BE896" />
        <circle cx="0" cy="-23" r="5" fill="#7BE896" />
        <circle cx="15" cy="-21" r="4.5" fill="#7BE896" />
      </g>
      <path d="M-40 -4 Q0 -16 40 -4 M-33 -24 Q0 -34 33 -24 M0 -44 L-22 -4 M0 -44 L22 -4 M-21 -37 L-38 -14 M21 -37 L38 -14" stroke="#fff" strokeWidth="1.3" opacity=".65" fill="none" />
      <path d="M-26 -30 Q-18 -38 -6 -40" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".7" />
      {lit && <ellipse className="map-glow" cx="0" cy="-18" rx="30" ry="18" fill="#BFFFE0" opacity=".28" />}
    </g>
  );
}

function Solar() {
  const panel = (dx: number, dy: number, s = 1) => (
    <g transform={`translate(${dx} ${dy}) scale(${s})`}>
      <rect x="-2" y="-14" width="4" height="14" fill={G} stroke={INK} strokeWidth="1" />
      <path d="M-15 -27 L14 -31 L16 -14 L-13 -10 Z" fill="#2449B0" stroke={INK} strokeWidth="1.8" />
      <path d="M-0.5 -29 L1.5 -12 M-14 -18.5 L15 -22.5" stroke="#7FB2FF" strokeWidth="1" />
      <path d="M-11 -25 L5 -27.5" stroke="#CFE6FF" strokeWidth="2" opacity=".8" />
    </g>
  );
  return (
    <g>
      {shadowE(50)}
      {panel(-16, -14, 0.82)}
      {panel(16, -16, 0.82)}
      {panel(-30, 0)}
      {panel(0, -2)}
      {panel(30, 0)}
    </g>
  );
}

function WaterPlant({ level }: { level: number }) {
  const h = Math.max(3, Math.round(26 * level));
  return (
    <g>
      {shadowE(44)}
      <path d="M4 -10 H20" stroke={G} strokeWidth="6" strokeLinecap="round" />
      <rect x="-32" y="-48" width="36" height="48" rx="7" fill={W} stroke={INK} strokeWidth="2.2" />
      <ellipse cx="-14" cy="-48" rx="18" ry="5" fill={G} stroke={INK} strokeWidth="2" />
      <rect x="-27" y="-38" width="9" height="28" rx="3" fill="#1B1640" />
      <rect x="-27" y={-10 - h} width="9" height={h} rx="3" fill="#3CC8FF" />
      <rect x="-32" y="-16" width="36" height="5" fill="#3CC8FF" />
      <path d="M14 0 L24 -42 L34 0 M24 -42 V-8" stroke={INK} strokeWidth="2.4" fill="none" strokeLinejoin="round" />
      <rect x="19" y="-12" width="10" height="13" rx="2" fill="#FFC93C" stroke={INK} strokeWidth="1.6" />
    </g>
  );
}

function Habitat({ lit }: { lit: boolean }) {
  return (
    <g>
      {shadowE(46)}
      <rect x="-38" y="-30" width="76" height="30" rx="15" fill={W} stroke={INK} strokeWidth="2.2" />
      <rect x="-36" y="-12" width="72" height="5" fill="#FF6B5B" />
      {[-20, -4, 12].map((x) => (
        <circle key={x} cx={x} cy="-20" r="4.6" fill={win(lit)} stroke={INK} strokeWidth="1.6" />
      ))}
      <rect x="-20" y="-55" width="44" height="27" rx="13.5" fill={W} stroke={INK} strokeWidth="2.2" />
      <circle cx="-6" cy="-42" r="4.2" fill={win(lit)} stroke={INK} strokeWidth="1.6" />
      <circle cx="9" cy="-42" r="4.2" fill={win(lit)} stroke={INK} strokeWidth="1.6" />
      <path d="M18 -55 V-70" stroke={INK} strokeWidth="2.2" />
      <circle className="map-blink" cx="18" cy="-72" r="3.4" fill="#FF6B5B" />
    </g>
  );
}

function Oxygen() {
  return (
    <g>
      {shadowE(44)}
      <rect x="-38" y="-27" width="58" height="25" rx="12.5" fill={W} stroke={INK} strokeWidth="2.2" />
      <rect x="-36" y="-16" width="54" height="5" fill="#3CC8FF" />
      <text x="-9" y="-19" textAnchor="middle" fontFamily="Space Mono, monospace" fontWeight="700" fontSize="9" fill={INK}>
        O₂
      </text>
      <rect x="20" y="-50" width="13" height="48" rx="4" fill={G} stroke={INK} strokeWidth="2" />
      <g className="map-bubbles" fill="#D8F6FF" stroke="#fff" strokeWidth="1">
        <circle cx="26" cy="-58" r="3.6" />
        <circle cx="31" cy="-68" r="2.8" />
        <circle cx="24" cy="-78" r="3.2" />
      </g>
    </g>
  );
}

function Battery({ charge }: { charge: number }) {
  return (
    <g>
      {shadowE(44)}
      {[0, 1, 2].map((i) => {
        const c = Math.max(0.12, Math.min(1, charge - (i === 2 ? 0.15 : 0)));
        return (
          <g key={i}>
            <rect x={-37 + i * 25} y="-38" width="10" height="6" rx="2" fill={G} stroke={INK} strokeWidth="1.2" transform="translate(5 0)" />
            <rect x={-37 + i * 25} y="-34" width="21" height="34" rx="5" fill="#2B2552" stroke={INK} strokeWidth="2" />
            <rect x={-34 + i * 25} y={-31 + (1 - c) * 28} width="15" height={c * 28} rx="3" fill="#FFC93C" />
          </g>
        );
      })}
      <path d="M2 -46 L-6 -34 L0 -34 L-4 -24 L6 -38 L0 -38 L4 -46Z" fill="#FFC93C" stroke={INK} strokeWidth="1.4" />
    </g>
  );
}

function Algae() {
  return (
    <g>
      {shadowE(44)}
      <rect x="-38" y="-8" width="76" height="8" rx="4" fill={G} stroke={INK} strokeWidth="2" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={-32 + i * 17} y="-50" width="12" height="44" rx="6" fill="#DFFFF0" fillOpacity=".55" stroke={INK} strokeWidth="1.8" />
          <rect x={-31 + i * 17} y={-40 + (i % 2) * 7} width="10" height={33 - (i % 2) * 7} rx="5" fill="#2FBF6A" />
          <circle className="map-bubbles" cx={-26 + i * 17} cy={-30 + (i % 2) * 5} r="1.8" fill="#DFFFF0" />
        </g>
      ))}
    </g>
  );
}

function Shield({ lit }: { lit: boolean }) {
  return (
    <g>
      {shadowE(48)}
      <path d="M-47 0 Q-42 -48 0 -50 Q42 -48 47 0 Z" fill="#B9542F" stroke={INK} strokeWidth="2.2" />
      <path d="M-30 -30 q4 -2 8 0 M18 -36 q4 -2 8 0 M-8 -42 q3 -2 6 0 M26 -16 q4 -2 8 0 M-36 -12 q4 -2 8 0" stroke="#7A2E18" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M-11 0 V-15 A11 11 0 0 1 11 -15 V0 Z" fill={W} stroke={INK} strokeWidth="2" />
      <circle cx="0" cy="-14" r="3.2" fill={win(lit)} />
      <path d="M0 -44 l10 4.5 v7 c0 6.5 -4.5 10 -10 12 c-5.5 -2 -10 -5.5 -10 -12 v-7z" fill="#FF6B5B" stroke={INK} strokeWidth="1.6" />
    </g>
  );
}

function Hub({ city }: { city: boolean }) {
  return (
    <g>
      <ellipse cx="0" cy="4" rx="78" ry="24" fill="#6E2412" opacity=".35" />
      <ellipse cx="0" cy="0" rx="72" ry="21" fill="#DCDEEC" stroke={INK} strokeWidth="2.4" />
      {city && (
        <g>
          {[-52, 52].map((x) => (
            <g key={x} transform={`translate(${x} -6)`}>
              <rect x="-11" y="-62" width="22" height="62" rx="11" fill={W} stroke={INK} strokeWidth="2.2" />
              {[-48, -34, -20].map((y) => (
                <circle key={y} cx="0" cy={y} r="3.6" fill="#FFE7A0" stroke={INK} strokeWidth="1.2" />
              ))}
            </g>
          ))}
        </g>
      )}
      <path d="M-54 -2 A54 52 0 0 1 54 -2 Z" fill="url(#hubglass)" stroke={INK} strokeWidth="2.6" />
      <path d="M-54 -2 Q0 -18 54 -2 M-46 -28 Q0 -42 46 -28 M0 -54 L-30 -2 M0 -54 L30 -2 M-27 -46 L-50 -16 M27 -46 L50 -16" stroke="#fff" strokeWidth="1.4" opacity=".55" fill="none" />
      <g transform="translate(0 -26)">
        <circle cx="0" cy="0" r="14" fill="#FFF4DC" stroke={INK} strokeWidth="2" />
        <circle cx="6" cy="-4" r="12" fill="#1C2470" />
      </g>
      <path d="M0 -54 V-78" stroke={INK} strokeWidth="2.6" />
      <circle className="map-blink" cx="0" cy="-80" r="4.5" fill="#B69CFF" stroke={INK} strokeWidth="1.4" />
    </g>
  );
}

function Unlock({ id, level }: { id: BuildingId; level: number }) {
  switch (id) {
    case 'hydroponics':
      return (
        <g>
          {shadowE(30)}
          <rect x="-24" y="-56" width="48" height="56" rx="6" fill="#DFFFF0" fillOpacity=".4" stroke={INK} strokeWidth="2" />
          {[-46, -30, -14].map((y) => (
            <g key={y}>
              <rect x="-22" y={y} width="44" height="5" rx="2" fill={G} stroke={INK} strokeWidth="1.2" />
              <path d={`M-18 ${y} q4 -8 8 0 q4 -8 8 0 q4 -8 8 0 q4 -8 8 0`} fill="#55DB7A" stroke="#1E6B3A" strokeWidth="1" />
            </g>
          ))}
        </g>
      );
    case 'recycler':
      return (
        <g>
          {shadowE(32)}
          <rect x="-26" y="-40" width="52" height="40" rx="10" fill={W} stroke={INK} strokeWidth="2.2" />
          <path d="M-9 -26 a10 10 0 1 1 -1 12 M-10 -14 l-4 -1 3 -4" stroke="#3CC8FF" strokeWidth="3" fill="none" strokeLinecap="round" />
          <rect x="-26" y="-10" width="52" height="5" fill="#3CC8FF" />
        </g>
      );
    case 'reactor':
      return (
        <g>
          {shadowE(32)}
          <path d="M-30 -30 L0 -20 L30 -30 L28 -36 L0 -27 L-28 -36Z" fill="#9AA0C2" stroke={INK} strokeWidth="1.6" />
          <rect x="-12" y="-46" width="24" height="46" rx="8" fill={W} stroke={INK} strokeWidth="2.2" />
          <ellipse className="map-glow" cx="0" cy="-22" rx="16" ry="5" fill="none" stroke="#7FDBFF" strokeWidth="3.5" />
        </g>
      );
    case 'antenna':
      return (
        <g>
          {shadowE(30)}
          <path d="M-14 0 L0 -30 L14 0" stroke={INK} strokeWidth="2.6" fill="none" />
          <ellipse cx="0" cy="-44" rx="30" ry="12" transform="rotate(-24 0 -44)" fill={W} stroke={INK} strokeWidth="2.4" />
          <path d="M2 -42 L16 -60" stroke={INK} strokeWidth="2.2" />
          <circle className="map-blink" cx="17" cy="-62" r="3.5" fill="#D06BFF" />
        </g>
      );
    case 'module':
      return (
        <g>
          {shadowE(36)}
          <path d="M-34 0 A34 34 0 0 1 34 0 Z" fill="#E8A577" stroke={INK} strokeWidth="2.2" />
          {[6, 12, 18, 24].map((d) => (
            <path key={d} d={`M${-34 + d * 0.4} ${-d} Q0 ${-d - 4} ${34 - d * 0.4} ${-d}`} stroke="#B9542F" strokeWidth="1.4" fill="none" />
          ))}
          <path d="M-8 0 V-12 A8 8 0 0 1 8 -12 V0Z" fill={W} stroke={INK} strokeWidth="1.8" />
        </g>
      );
    default:
      return level ? null : null;
  }
}

/* ---------------- mapa ---------------- */

export interface ColonyMapProps {
  sectors: Record<SectorId, number>;
  buildings: { id: BuildingId; level: number }[];
  crewBySector?: Partial<Record<SectorId, string>>;
  storm?: boolean;
  dark?: boolean;
  highlight?: SystemId | null;
  newBuilding?: BuildingId | null;
  labels?: boolean;
  cover?: boolean;
  className?: string;
}

const STARS = Array.from({ length: 46 }, (_, i) => ({
  x: (i * 211.7) % 1000,
  y: ((i * 97.3) % 190) + 6,
  r: 0.8 + ((i * 7) % 5) * 0.35,
  d: (i % 7) * 0.6,
}));

export function ColonyMap({ sectors, buildings, crewBySector = {}, storm, dark, highlight, newBuilding, labels = true, cover = false, className = '' }: ColonyMapProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const built = new Map(buildings.map((b) => [b.id, b.level]));
  const id = (s: string) => `${s}${uid}`;

  type Item = { key: string; x: number; y: number; node: ReactNode; front?: ReactNode };
  const items: Item[] = [];

  for (const s of SECTOR_ORDER) {
    const { x, y } = SECTOR_POS[s];
    const health = sectors[s] ?? 65;
    const crew = crewBySector[s];
    const sys = SECTORS[s].system;
    const lit = health >= 45 && !(dark && health < 70);
    const sc = depth(y);
    let art: ReactNode;
    switch (s) {
      case 'greenhouse':
        art = <Greenhouse lit={lit} glass={id('glass')} />;
        break;
      case 'solar':
        art = <Solar />;
        break;
      case 'waterplant':
        art = <WaterPlant level={health / 100} />;
        break;
      case 'habitat':
        art = <Habitat lit={lit} />;
        break;
      case 'oxygen':
        art = <Oxygen />;
        break;
      case 'battery':
        art = <Battery charge={health / 100} />;
        break;
      case 'algae':
        art = <Algae />;
        break;
      case 'shield':
        art = <Shield lit={lit} />;
        break;
    }
    const color = health >= 60 ? '#55DB7A' : health >= 35 ? '#FFC93C' : '#FF6B5B';
    items.push({
      key: s,
      x,
      y,
      node: (
        <g transform={`translate(${x} ${y}) scale(${sc})`} className={`map-sector ${crew ? '' : 'is-auto'} ${health < 35 ? 'is-hurt' : ''}`}>
          {highlight === sys && <ellipse className="map-pulse" cx="0" cy="0" rx="58" ry="17" fill={SYSTEMS[sys].color} opacity=".45" />}
          {art}
          {health < 35 && (
            <g className="map-smoke" fill="#4B4675">
              <circle cx="-8" cy="-50" r="6" />
              <circle cx="4" cy="-62" r="8" />
              <circle cx="-2" cy="-78" r="9" />
            </g>
          )}
          {health >= 80 && <path className="map-twinkle" d="M30 -52 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5z" fill="#FFF4DC" />}
        </g>
      ),
      front: labels ? (
        <g transform={`translate(${x} ${y})`} key={`l-${s}`}>
          <g transform={`translate(0 ${16 * sc})`}>
            <rect x="-34" y="0" width="68" height="11" rx="5.5" fill="#1A1340" opacity=".82" />
            <rect x="-32" y="2" width={(64 * health) / 100} height="7" rx="3.5" fill={color} />
          </g>
          {crew && (
            <g transform={`translate(0 ${-92 * sc})`}>
              <rect x={-(crew.length * 5 + 16)} y="-15" width={crew.length * 10 + 32} height="26" rx="13" fill="#FFF8EC" stroke={INK} strokeWidth="2.4" />
              <text x="0" y="3.5" textAnchor="middle" fontFamily="Fredoka Variable, Fredoka, sans-serif" fontWeight="700" fontSize="15" fill={INK}>
                {crew}
              </text>
              <path d="M-6 11 L0 18 L6 11Z" fill="#FFF8EC" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
            </g>
          )}
        </g>
      ) : null,
    });
  }

  for (const [b, pos] of Object.entries(BUILD_POS) as [Exclude<BuildingId, 'city'>, { x: number; y: number }][]) {
    const level = built.get(b);
    if (!level) continue;
    items.push({
      key: b,
      x: pos.x,
      y: pos.y,
      node: (
        <g transform={`translate(${pos.x} ${pos.y}) scale(${depth(pos.y)})`} className={`map-unlock ${newBuilding === b ? 'is-new' : ''}`}>
          <Unlock id={b} level={level} />
          {newBuilding === b && (
            <g transform="translate(0 -78)">
              <g className="map-new">
                <rect x="-26" y="-12" width="52" height="22" rx="11" fill="#FFC93C" stroke={INK} strokeWidth="2.2" />
                <text x="0" y="4" textAnchor="middle" fontFamily="Fredoka Variable, Fredoka, sans-serif" fontWeight="700" fontSize="12" fill={INK}>
                  ¡NUEVO!
                </text>
              </g>
            </g>
          )}
        </g>
      ),
    });
  }

  items.push({
    key: 'hub',
    x: HUB.x,
    y: HUB.y,
    node: (
      <g transform={`translate(${HUB.x} ${HUB.y}) scale(1.15)`} className={`map-hub ${newBuilding === 'city' ? 'is-new' : ''}`}>
        <Hub city={built.has('city')} />
      </g>
    ),
  });

  items.sort((a, b) => a.y - b.y);

  const unlockedTitle = newBuilding ? BUILDINGS[newBuilding].name : '';

  return (
    <svg
      viewBox="0 0 1000 620"
      preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
      className={`colony-map ${storm ? 'is-storm' : ''} ${dark ? 'is-dark' : ''} ${className}`}
      role="img" aria-label={`Mapa de la colonia${unlockedTitle ? ` con ${unlockedTitle}` : ''}`}>
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0B0F38" />
          <stop offset="0.55" stopColor="#3A2468" />
          <stop offset="0.85" stopColor="#B4553A" />
          <stop offset="1" stopColor="#E58A55" />
        </linearGradient>
        <radialGradient id={id('ground')} cx="50%" cy="40%" r="65%">
          <stop offset="0" stopColor="#F29A62" />
          <stop offset="0.6" stopColor="#DE7444" />
          <stop offset="1" stopColor="#B9502C" />
        </radialGradient>
        <linearGradient id={id('glass')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E9FFF6" stopOpacity=".85" />
          <stop offset="1" stopColor="#7FDBB6" stopOpacity=".35" />
        </linearGradient>
        <linearGradient id="hubglass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F1EBFF" stopOpacity=".95" />
          <stop offset="1" stopColor="#B69CFF" stopOpacity=".5" />
        </linearGradient>
        <pattern id={id('hex')} width="56" height="32.3" patternUnits="userSpaceOnUse" patternTransform="scale(1 .55)">
          <path d="M14 0 L42 0 L56 16.15 L42 32.3 L14 32.3 L0 16.15 Z" fill="none" stroke="#FFE3C8" strokeWidth="1.6" />
        </pattern>
        <clipPath id={id('clip')}>
          <ellipse cx="500" cy="410" rx="478" ry="200" />
        </clipPath>
      </defs>

      <rect width="1000" height="620" fill={`url(#${id('sky')})`} />
      <g className="map-stars">
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFF4DC" style={{ animationDelay: `${s.d}s` }} />
        ))}
      </g>
      <circle cx="840" cy="70" r="16" fill="#C9B9A8" />
      <circle cx="846" cy="66" r="4" fill="#A8968A" />
      <circle cx="160" cy="110" r="7" fill="#B8A898" />
      <circle cx="610" cy="54" r="2.8" fill="#7FB2FF" />
      <path d="M0 236 L60 214 L120 228 L190 196 L260 222 L330 205 L420 226 L500 210 L590 230 L660 200 L740 224 L820 198 L900 220 L1000 204 L1000 260 L0 260Z" fill="#6E2A1A" opacity=".85" />
      <path d="M0 250 L80 236 L170 246 L250 230 L350 246 L450 234 L560 248 L650 232 L760 247 L860 230 L1000 244 L1000 280 L0 280Z" fill="#8E3A20" />

      <ellipse cx="500" cy="430" rx="480" ry="202" fill="#6E2412" />
      <ellipse cx="500" cy="410" rx="478" ry="200" fill={`url(#${id('ground')})`} />
      <rect width="1000" height="620" fill={`url(#${id('hex')})`} clipPath={`url(#${id('clip')})`} opacity=".22" />
      <g fill="#C2512E" opacity=".7">
        <ellipse cx="160" cy="390" rx="26" ry="8" />
        <ellipse cx="860" cy="400" rx="20" ry="6" />
        <ellipse cx="610" cy="585" rx="30" ry="8" />
        <ellipse cx="420" cy="300" rx="16" ry="5" />
      </g>
      <g fill="#8E3A20">
        <path d="M90 470 q12 -18 26 -4 q6 8 -4 10 h-22z" />
        <path d="M920 470 q10 -14 22 -3 q4 7 -4 8 h-18z" />
        <path d="M470 600 q8 -12 18 -2 q3 5 -3 6 h-14z" />
      </g>

      <g className="map-tubes">
        {SECTOR_ORDER.map((s) => {
          const p = SECTOR_POS[s];
          const mx = (p.x + HUB.x) / 2;
          const my = (p.y + HUB.y) / 2 + 14;
          const d = `M${HUB.x} ${HUB.y} Q${mx} ${my} ${p.x} ${p.y}`;
          const sys = SECTORS[s].system;
          return (
            <g key={s}>
              <path d={d} stroke="#8D93B5" strokeWidth="14" fill="none" strokeLinecap="round" />
              <path d={d} stroke="#ECEEF7" strokeWidth="9" fill="none" strokeLinecap="round" />
              <path className="map-flow" d={d} stroke={SYSTEMS[sys].color} strokeWidth="3.4" fill="none" strokeDasharray="5 15" strokeLinecap="round" />
            </g>
          );
        })}
      </g>

      <path id={id('route')} d="M120 470 Q500 640 880 470 Q960 400 820 300 Q500 220 180 300 Q40 400 120 470Z" fill="none" />
      <g className="map-rover">
        <g>
          <rect x="-12" y="-14" width="24" height="10" rx="3" fill={W} stroke={INK} strokeWidth="1.6" />
          <rect x="-2" y="-22" width="4" height="8" fill={INK} />
          <circle cx="0" cy="-23" r="3" fill="#FFC93C" />
          <circle cx="-8" cy="-2" r="4" fill={INK} />
          <circle cx="8" cy="-2" r="4" fill={INK} />
          <animateMotion dur="38s" repeatCount="indefinite" rotate="auto">
            <mpath href={`#${id('route')}`} />
          </animateMotion>
        </g>
      </g>

      {items.map((it) => (
        <g key={it.key}>{it.node}</g>
      ))}
      {items.map((it) => (it.front ? <g key={`f-${it.key}`}>{it.front}</g> : null))}

      {dark && <rect className="map-darkness" width="1000" height="620" fill="#050720" opacity=".45" />}
      {storm && (
        <g className="map-storm">
          <rect width="1000" height="620" fill="#D9733F" opacity=".38" />
          <g className="map-dust" stroke="#FFD9B5" strokeWidth="2.2" strokeLinecap="round" opacity=".55">
            {Array.from({ length: 34 }, (_, i) => {
              const y = (i * 53) % 620;
              const x = (i * 137) % 1100 - 100;
              return <path key={i} d={`M${x} ${y} l${60 + (i % 4) * 20} ${-6 - (i % 3) * 3}`} />;
            })}
          </g>
        </g>
      )}
    </svg>
  );
}
