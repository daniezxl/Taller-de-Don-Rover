// Ilustraciones vectoriales de IXCHEL: astronautas, IX (la IA de la colonia) y parches de misión.

import { useId, type ReactNode } from 'react';
import { MISSIONS, ROLES, SUIT_COLORS, VISORS } from '../../shared/content';
import type { AvatarConfig, MissionId, RoleId } from '../../shared/types';

const INK = '#211A4A';

export function shade(hex: string, amt: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  r = Math.round((t - r) * p + r);
  g = Math.round((t - g) * p + g);
  b = Math.round((t - b) * p + b);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/* ------------------------------------------------------------------ */
/* Astronauta                                                           */
/* ------------------------------------------------------------------ */

export function Astronaut({
  avatar,
  role,
  size = 120,
  pose = 'idle',
  className = '',
  title,
}: {
  avatar: AvatarConfig;
  role?: RoleId | null;
  size?: number;
  pose?: 'idle' | 'cheer' | 'wave' | 'still';
  className?: string;
  title?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const suit = SUIT_COLORS[avatar.suit] ?? SUIT_COLORS[0];
  const dark = shade(suit, -0.3);
  const light = shade(suit, 0.3);
  const visor = VISORS[avatar.visor] ?? VISORS[0];
  const glow = shade(visor, 0.45);
  const roleColor = role ? ROLES[role].color : '#FFFFFF';
  const vg = `url(#v${uid})`;
  const armL = pose === 'cheer' ? 'rotate(150 27 84)' : undefined;
  const armR = pose === 'cheer' ? 'rotate(-150 93 84)' : undefined;

  const neck = <rect x="35" y="73" width="50" height="9" rx="4.5" fill={dark} stroke={INK} strokeWidth="2.2" />;
  let helmet: ReactNode;
  switch (avatar.helmet) {
    case 1: // Gorra
      helmet = (
        <>
          <circle cx="60" cy="48" r="36" fill={suit} stroke={INK} strokeWidth="2.6" />
          <path d="M27 40 Q31 10 61 10 Q90 10 93 38 Z" fill={dark} stroke={INK} strokeWidth="2.4" />
          <path d="M18 38 Q58 26 104 40 L100 49 Q60 37 21 47 Z" fill={light} stroke={INK} strokeWidth="2.2" />
          <rect x="48" y="16" width="25" height="9" rx="3" fill="#EEF0F8" stroke={INK} strokeWidth="1.6" />
          <rect x="29" y="50" width="62" height="21" rx="10.5" fill="#1B1640" stroke={INK} strokeWidth="2.4" />
          <rect className="eye" x="40" y="57" width="15" height="6" rx="3" fill={glow} />
          <rect className="eye" x="65" y="57" width="15" height="6" rx="3" fill={glow} />
          {neck}
        </>
      );
      break;
    case 2: // Goggles
      helmet = (
        <>
          <circle cx="60" cy="48" r="36" fill={suit} stroke={INK} strokeWidth="2.6" />
          <path d="M34 22 Q60 6 86 22" stroke={dark} strokeWidth="7" fill="none" strokeLinecap="round" />
          <rect x="24" y="40" width="72" height="8" rx="4" fill={dark} />
          <circle cx="46" cy="44" r="12.5" fill="#EEF0F8" stroke={INK} strokeWidth="2.4" />
          <circle cx="74" cy="44" r="12.5" fill="#EEF0F8" stroke={INK} strokeWidth="2.4" />
          <circle className="eye" cx="46" cy="44" r="8" fill={vg} />
          <circle className="eye" cx="74" cy="44" r="8" fill={vg} />
          <circle cx="43" cy="41" r="2.4" fill="#fff" opacity=".9" />
          <circle cx="71" cy="41" r="2.4" fill="#fff" opacity=".9" />
          <rect x="43" y="59" width="34" height="16" rx="7.5" fill="#EEF0F8" stroke={INK} strokeWidth="2.2" />
          <path d="M51 63v8M57 63v8M63 63v8M69 63v8" stroke="#9AA0C2" strokeWidth="2" strokeLinecap="round" />
          {neck}
        </>
      );
      break;
    case 3: // Robot
      helmet = (
        <>
          <rect x="54" y="2" width="12" height="13" rx="3" fill={dark} stroke={INK} strokeWidth="2" />
          <rect x="24" y="12" width="72" height="68" rx="17" fill={suit} stroke={INK} strokeWidth="2.6" />
          <rect x="31" y="28" width="58" height="23" rx="9" fill="#1B1640" stroke={INK} strokeWidth="2.2" />
          <circle className="eye" cx="46" cy="39.5" r="5" fill={glow} />
          <circle className="eye" cx="74" cy="39.5" r="5" fill={glow} />
          <rect x="41" y="57" width="38" height="16" rx="4" fill="#EEF0F8" stroke={INK} strokeWidth="2" />
          <path d="M49 60v10M56 60v10M63 60v10M70 60v10" stroke="#9AA0C2" strokeWidth="2.2" strokeLinecap="round" />
          <rect x="30" y="16" width="16" height="5" rx="2.5" fill={light} opacity=".7" />
        </>
      );
      break;
    case 4: // Buzo
      helmet = (
        <>
          <rect x="53" y="5" width="14" height="9" rx="3" fill="#C9CCE0" stroke={INK} strokeWidth="2" />
          <circle cx="60" cy="47" r="37" fill={suit} stroke={INK} strokeWidth="2.6" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return <circle key={i} cx={60 + Math.cos(a) * 29} cy={49 + Math.sin(a) * 29} r="2.6" fill="#D6D9EA" stroke={INK} strokeWidth="1" />;
          })}
          <circle cx="60" cy="49" r="22" fill="#F2C462" stroke={INK} strokeWidth="2.6" />
          <circle cx="60" cy="49" r="16" fill={vg} stroke={INK} strokeWidth="2" />
          <circle className="eye" cx="54.5" cy="50" r="2.8" fill="#fff" />
          <circle className="eye" cx="65.5" cy="50" r="2.8" fill="#fff" />
          <path d="M50 41 q5 -5 12 -4" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity=".7" />
          {neck}
        </>
      );
      break;
    default: // Burbuja
      helmet = (
        <>
          <circle cx="60" cy="47" r="37" fill={`url(#h${uid})`} stroke={INK} strokeWidth="2.6" />
          <ellipse cx="60" cy="49" rx="27" ry="23" fill={vg} stroke={INK} strokeWidth="2.4" />
          <ellipse className="eye" cx="51" cy="51" rx="3.8" ry="5.2" fill="#fff" />
          <ellipse className="eye" cx="69" cy="51" rx="3.8" ry="5.2" fill="#fff" />
          <path d="M41 40 q8 -11 22 -9" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" opacity=".55" />
          <rect x="35" y="73" width="50" height="9" rx="4.5" fill={suit} stroke={INK} strokeWidth="2.2" />
        </>
      );
  }

  const acc = avatar.accessory;
  const back: ReactNode =
    acc === 5 ? <path d="M8 56 A52 13 0 0 1 112 42" stroke="#FFD27A" strokeWidth="5" fill="none" strokeLinecap="round" /> : null;
  let front: ReactNode = null;
  if (acc === 1)
    front = (
      <g className="acc-antenna">
        <path d="M60 12 L60 -4" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="60" cy="-6" r="5.5" fill="#FF4FB0" stroke={INK} strokeWidth="2" />
      </g>
    );
  if (acc === 2)
    front = (
      <g className="acc-sprout">
        <path d="M60 12 C60 4 61 -1 60 -6" stroke="#2F9E52" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M60 -2 C52 -10 44 -6 46 0 C50 3 56 2 60 -2Z" fill="#55DB7A" stroke={INK} strokeWidth="1.8" />
        <path d="M60 -5 C67 -14 77 -10 74 -3 C70 0 64 -1 60 -5Z" fill="#7BE896" stroke={INK} strokeWidth="1.8" />
      </g>
    );
  if (acc === 3)
    front = (
      <>
        <path d="M30 26 L32 2 L50 16 Z" fill={suit} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M90 26 L88 2 L70 16 Z" fill={suit} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M34 20 L35 8 L44 15 Z" fill="#FF9EC7" />
        <path d="M86 20 L85 8 L76 15 Z" fill="#FF9EC7" />
      </>
    );
  if (acc === 4)
    front = (
      <>
        <path d="M22 46 Q22 4 60 4 Q98 4 98 46" stroke={INK} strokeWidth="6.5" fill="none" strokeLinecap="round" />
        <path d="M22 46 Q22 4 60 4 Q98 4 98 46" stroke="#FF4FB0" strokeWidth="3" fill="none" strokeLinecap="round" />
        <rect x="12" y="36" width="13" height="24" rx="6" fill="#FF4FB0" stroke={INK} strokeWidth="2.2" />
        <rect x="95" y="36" width="13" height="24" rx="6" fill="#FF4FB0" stroke={INK} strokeWidth="2.2" />
      </>
    );
  if (acc === 5) front = <path d="M8 56 A52 13 0 0 0 112 42" stroke="#FFD27A" strokeWidth="5" fill="none" strokeLinecap="round" />;

  return (
    <svg
      viewBox="0 -14 120 164"
      width={size}
      height={(size * 164) / 120}
      className={`astro astro-${pose} ${className}`}
      role="img"
      aria-label={title ?? 'Astronauta'}
    >
      <defs>
        <linearGradient id={`v${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={shade(visor, 0.35)} />
          <stop offset="1" stopColor={shade(visor, -0.4)} />
        </linearGradient>
        <radialGradient id={`h${uid}`} cx="35%" cy="28%" r="85%">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#CDD1E6" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="146" rx="30" ry="4.5" fill="#000" opacity=".25" />
      <g className="astro-all">
        <g className="astro-body">
          <rect x="27" y="76" width="66" height="44" rx="14" fill={dark} stroke={INK} strokeWidth="2.2" />
          <rect x="40" y="112" width="16" height="27" rx="7" fill={suit} stroke={INK} strokeWidth="2.2" />
          <rect x="64" y="112" width="16" height="27" rx="7" fill={suit} stroke={INK} strokeWidth="2.2" />
          <rect x="37" y="131" width="21" height="12" rx="6" fill="#EEF0F8" stroke={INK} strokeWidth="2" />
          <rect x="62" y="131" width="21" height="12" rx="6" fill="#EEF0F8" stroke={INK} strokeWidth="2" />
          <rect x="32" y="73" width="56" height="51" rx="20" fill={suit} stroke={INK} strokeWidth="2.4" />
          <path d="M40 84 q10 -6 22 -6" stroke={light} strokeWidth="3.5" strokeLinecap="round" fill="none" opacity=".7" />
          <rect x="33.5" y="107" width="53" height="8" rx="4" fill="#2B2552" />
          <rect x="54.5" y="107.5" width="11" height="7" rx="2" fill="#C9CCE0" />
          <circle cx="60" cy="93" r="9.5" fill="#fff" stroke={INK} strokeWidth="2.2" />
          <circle cx="60" cy="93" r="6" fill={roleColor} />
          <g className="arm arm-l" transform={armL}>
            <rect x="18" y="80" width="17" height="31" rx="8.5" fill={suit} stroke={INK} strokeWidth="2.2" transform="rotate(14 27 84)" />
            <circle cx="21" cy="111" r="7.5" fill="#EEF0F8" stroke={INK} strokeWidth="2" />
          </g>
          <g className="arm arm-r" transform={armR}>
            <rect x="85" y="80" width="17" height="31" rx="8.5" fill={suit} stroke={INK} strokeWidth="2.2" transform="rotate(-14 93 84)" />
            <circle cx="99" cy="111" r="7.5" fill="#EEF0F8" stroke={INK} strokeWidth="2" />
          </g>
        </g>
        <g className="astro-head">
          {back}
          {helmet}
          {front}
        </g>
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* IX · la IA de la colonia (una pequeña luna con ojos)                 */
/* ------------------------------------------------------------------ */

export function IXOrb({ size = 96, mood = 'idle', className = '' }: { size?: number; mood?: 'idle' | 'talk' | 'alert' | 'happy'; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={`ix-orb ix-${mood} ${className}`} role="img" aria-label="IX, la IA de la colonia">
      <defs>
        <radialGradient id={`halo${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0.45" stopColor={mood === 'alert' ? '#FF6B5B' : '#B69CFF'} stopOpacity=".55" />
          <stop offset="1" stopColor={mood === 'alert' ? '#FF6B5B' : '#B69CFF'} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`moon${uid}`} cx="36%" cy="30%" r="80%">
          <stop offset="0" stopColor="#FFFDF6" />
          <stop offset="0.7" stopColor="#FFE7B8" />
          <stop offset="1" stopColor="#F2C98A" />
        </radialGradient>
      </defs>
      <circle className="ix-halo" cx="60" cy="60" r="58" fill={`url(#halo${uid})`} />
      <g className="ix-ring-back">
        <path d="M10 66 A52 15 -14 0 1 110 54" stroke="#C9B6FF" strokeWidth="3" fill="none" opacity=".75" />
      </g>
      <circle cx="60" cy="60" r="34" fill={`url(#moon${uid})`} stroke={INK} strokeWidth="2.6" />
      <circle cx="44" cy="43" r="5" fill="#EBC888" opacity=".7" />
      <circle cx="78" cy="76" r="6.5" fill="#EBC888" opacity=".6" />
      <circle cx="74" cy="40" r="3" fill="#EBC888" opacity=".7" />
      <g className="ix-face">
        <ellipse className="eye" cx="49" cy="58" rx="5.2" ry={mood === 'happy' ? 3.5 : 7.2} fill={INK} />
        <ellipse className="eye" cx="71" cy="58" rx="5.2" ry={mood === 'happy' ? 3.5 : 7.2} fill={INK} />
        <circle cx="51" cy="55" r="1.8" fill="#fff" />
        <circle cx="73" cy="55" r="1.8" fill="#fff" />
        {mood === 'talk' && <ellipse className="ix-mouth" cx="60" cy="74" rx="5" ry="3.4" fill={INK} />}
        {mood === 'happy' && <path d="M51 71 Q60 79 69 71" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />}
        {mood === 'alert' && <ellipse cx="60" cy="74" rx="3.2" ry="4" fill={INK} />}
        {mood === 'idle' && <path d="M54 73 Q60 76 66 73" stroke={INK} strokeWidth="2.6" strokeLinecap="round" fill="none" />}
        <ellipse cx="41" cy="67" rx="5" ry="3" fill="#FF9EC7" opacity=".55" />
        <ellipse cx="79" cy="67" rx="5" ry="3" fill="#FF9EC7" opacity=".55" />
      </g>
      <path d="M10 66 A52 15 -14 0 0 110 54" stroke="#C9B6FF" strokeWidth="3" fill="none" opacity=".9" />
      <g className="ix-sat">
        <circle cx="108" cy="52" r="4.5" fill="#FFC93C" stroke={INK} strokeWidth="1.6" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Parches de misión (estilo bordado de misiones de la NASA)            */
/* ------------------------------------------------------------------ */

function PatchScene({ id }: { id: MissionId }) {
  switch (id) {
    case 'greenhouse':
      return (
        <g>
          <circle cx="30" cy="-30" r="9" fill="#FFD166" />
          <path d="M-46 22 Q0 12 46 22 L46 30 L-46 30Z" fill="#C2512E" />
          <path d="M-36 22 A36 36 0 0 1 36 22 Z" fill="#BFFFE0" fillOpacity=".35" stroke="#fff" strokeWidth="3" />
          <path d="M-25 -3 L25 -3 M-34 10 L34 10 M0 -14 L-17 22 M0 -14 L17 22 M-26 -1 L-30 22 M26 -1 L30 22" stroke="#fff" strokeWidth="1.6" opacity=".7" />
          <path d="M0 22 V2" stroke="#2F9E52" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M0 8 C-12 0 -16 -8 -9 -10 C-3 -10 -1 -2 0 8Z" fill="#55DB7A" stroke="#1E6B3A" strokeWidth="1.5" />
          <path d="M0 4 C10 -6 16 -6 15 0 C13 6 6 6 0 4Z" fill="#7BE896" stroke="#1E6B3A" strokeWidth="1.5" />
        </g>
      );
    case 'water':
      return (
        <g>
          <path d="M0 -40 C14 -20 26 -6 26 10 A26 26 0 0 1 -26 10 C-26 -6 -14 -20 0 -40Z" fill="#7FDBFF" stroke="#fff" strokeWidth="3" />
          <path d="M-12 4 C-12 -6 -6 -14 -2 -20" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" opacity=".8" />
          <path d="M-44 30 q11 -8 22 0 t22 0 t22 0 t22 0" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M-38 40 q9 -6 19 0 t19 0 t19 0 t19 0" stroke="#7FDBFF" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'darkness':
      return (
        <g>
          <circle cx="0" cy="-2" r="30" fill="#FFD166" opacity=".9" />
          <circle cx="8" cy="-8" r="28" fill="#1A1340" />
          <path d="M6 -26 L-12 4 L2 4 L-6 30 L18 -6 L4 -6 L14 -26Z" fill="#FFC93C" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
          <circle cx="-30" cy="-30" r="2" fill="#fff" />
          <circle cx="32" cy="24" r="2.4" fill="#fff" />
        </g>
      );
    case 'signal':
      return (
        <g>
          <path d="M-8 30 L4 2 L16 30Z" fill="#E9EBF5" stroke="#1A1340" strokeWidth="2" />
          <ellipse cx="-4" cy="-6" rx="24" ry="11" transform="rotate(-35 -4 -6)" fill="#E9EBF5" stroke="#1A1340" strokeWidth="2.4" />
          <path d="M4 -4 L16 -18" stroke="#1A1340" strokeWidth="2.4" />
          <circle cx="17" cy="-19" r="3.5" fill="#FF4FB0" />
          <path d="M24 -26 A12 12 0 0 1 28 -12 M30 -34 A22 22 0 0 1 38 -8 M36 -42 A32 32 0 0 1 48 -4" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'habitat':
      return (
        <g>
          <path d="M-46 26 Q0 16 46 26 L46 34 L-46 34Z" fill="#9C3B22" />
          <rect x="-40" y="-6" width="52" height="30" rx="15" fill="#F4F5FB" stroke="#1A1340" strokeWidth="2.4" />
          <rect x="-36" y="10" width="44" height="5" fill="#FF6B5B" />
          <circle cx="-26" cy="3" r="4.5" fill="#7FDBFF" stroke="#1A1340" strokeWidth="1.6" />
          <circle cx="-12" cy="3" r="4.5" fill="#7FDBFF" stroke="#1A1340" strokeWidth="1.6" />
          <circle cx="2" cy="3" r="4.5" fill="#7FDBFF" stroke="#1A1340" strokeWidth="1.6" />
          <path d="M8 26 A20 20 0 0 1 44 26Z" fill="#FFD9B8" stroke="#1A1340" strokeWidth="2.4" />
          <path d="M20 -30 V-8 M20 -30 H38 M38 -30 V-18" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'final':
      return (
        <g>
          <circle cx="0" cy="4" r="28" fill="#E86A3A" stroke="#1A1340" strokeWidth="2.4" />
          <path d="M-46 12 A46 12 -12 0 0 46 -6" stroke="#FFF4DC" strokeWidth="4" fill="none" />
          <path d="M-14 -10 A10 10 0 0 1 6 -10Z" fill="#BFFFE0" stroke="#1A1340" strokeWidth="1.8" />
          <path d="M2 -6 A8 8 0 0 1 18 -6Z" fill="#BFFFE0" stroke="#1A1340" strokeWidth="1.8" />
          <circle cx="-10" cy="16" r="4" fill="#C4502A" />
          <path d="M30 -36 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill="#FFF4DC" />
        </g>
      );
  }
}

export function MissionPatch({ id, size = 160, locked = false, className = '' }: { id: MissionId; size?: number; locked?: boolean; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const m = MISSIONS[id];
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={`patch ${locked ? 'patch-locked' : ''} ${className}`} role="img" aria-label={`Parche de ${m.title}`}>
      <defs>
        <path id={`t${uid}`} d="M 30 100 A 70 70 0 0 1 170 100" />
        <path id={`b${uid}`} d="M 16 100 A 84 84 0 0 0 184 100" />
        <radialGradient id={`g${uid}`} cx="40%" cy="35%" r="75%">
          <stop offset="0" stopColor={shade(m.deep, 0.25)} />
          <stop offset="1" stopColor={m.deep} />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="98" fill={INK} />
      <circle cx="100" cy="100" r="93" fill={m.color} />
      <circle cx="100" cy="100" r="89" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="5 4" opacity=".75" />
      <circle cx="100" cy="100" r="63" fill={`url(#g${uid})`} stroke={INK} strokeWidth="3" />
      <circle cx="100" cy="100" r="58" fill="none" stroke="#fff" strokeWidth="1.2" strokeDasharray="3 4" opacity=".45" />
      <text fontFamily="Fredoka Variable, Fredoka, sans-serif" fontWeight="700" fontSize={m.title.length > 15 ? 14 : 16} fill={INK} letterSpacing="1.2">
        <textPath href={`#t${uid}`} startOffset="50%" textAnchor="middle">
          {m.title}
        </textPath>
      </text>
      <text fontFamily="Space Mono, monospace" fontWeight="700" fontSize="11" fill={INK} letterSpacing="2">
        <textPath href={`#b${uid}`} startOffset="50%" textAnchor="middle">
          {`IXCHEL · ${m.code}`}
        </textPath>
      </text>
      <path d="M14 100 l3 -6 3 6 -3 6z" fill={INK} />
      <path d="M180 100 l3 -6 3 6 -3 6z" fill={INK} />
      <g transform="translate(100 100)">
        <PatchScene id={id} />
      </g>
      {locked && (
        <g>
          <circle cx="100" cy="100" r="98" fill="#0B0F38" opacity=".6" />
          <rect x="82" y="96" width="36" height="28" rx="6" fill="#FFF4DC" stroke={INK} strokeWidth="3" />
          <path d="M89 96 V86 A11 11 0 0 1 111 86 V96" stroke="#FFF4DC" strokeWidth="5" fill="none" />
          <circle cx="100" cy="109" r="4" fill={INK} />
        </g>
      )}
    </svg>
  );
}
