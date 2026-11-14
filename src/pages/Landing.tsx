// Presentación de IXCHEL: la propuesta completa, pulida y diseñada como una página.

import type { CSSProperties, ReactNode } from 'react';
import { CLASS_PLAN, CREWS, MISSIONS, MISSION_ORDER, ROLES, ROLE_ORDER, SECTORS, SYSTEM_ORDER } from '../../shared/content';
import type { AvatarConfig, MissionId, RoleId } from '../../shared/types';
import { Astronaut, IXOrb, MissionPatch } from '../components/art';
import { ColonyMap } from '../components/ColonyMap';
import { Icon, Logo, SystemMeter } from '../components/ui';
import { useInstall } from '../lib/pwa';

const HERO_SECTORS = { greenhouse: 88, solar: 74, waterplant: 66, habitat: 81, oxygen: 70, battery: 58, algae: 77, shield: 69 };
const HERO_CREWS = Object.fromEntries(CREWS.slice(0, 4).map((c) => [c.sector, c.name]));

const ROLE_AVATARS: Record<RoleId, AvatarConfig> = {
  power: { suit: 2, helmet: 1, visor: 1, accessory: 1 },
  life: { suit: 4, helmet: 2, visor: 2, accessory: 4 },
  bio: { suit: 3, helmet: 0, visor: 2, accessory: 2 },
  habitat: { suit: 0, helmet: 4, visor: 0, accessory: 0 },
};

const STORM_INFO: Record<RoleId, string> = {
  power: 'la predicción de energía disponible',
  life: 'el estado de las reservas de agua y oxígeno',
  bio: 'el estado de los cultivos',
  habitat: 'cuánto protegerá el refugio',
};

const PUZZLE_KIND: Record<MissionId, string> = {
  greenhouse: 'Cuatro datos, cinco cultivos: cada rol descarta uno',
  water: 'Energía, cantidad, distancia y pureza del agua',
  darkness: 'Presupuesto de energía: sumar, comparar y priorizar',
  signal: 'Ruta, batería, clima y tiempo de muestras',
  habitat: 'Terreno, energía, capacidad y radiación',
  final: 'Cuatro balances que deben quedar en positivo',
};

const OBJECTS: { emoji: string; obj: string; mission: MissionId; text: string }[] = [
  { emoji: '🪴', obj: 'Una planta', mission: 'greenhouse', text: 'Crear un ecosistema agrícola en Marte' },
  { emoji: '🧴', obj: 'Una botella', mission: 'water', text: 'Resolver una crisis de agua' },
  { emoji: '💡', obj: 'Una lámpara', mission: 'darkness', text: 'Superar una falla energética' },
  { emoji: '🪟', obj: 'Una ventana', mission: 'darkness', text: 'Optimizar la iluminación de la base' },
  { emoji: '🌳', obj: 'Un árbol', mission: 'greenhouse', text: 'Investigar cómo funcionan los ecosistemas' },
  { emoji: '🫙', obj: 'Un recipiente', mission: 'water', text: 'Diseñar un sistema de almacenamiento' },
  { emoji: '♻️', obj: 'Material reciclable', mission: 'habitat', text: 'Construir un módulo virtual de hábitat' },
  { emoji: '📱', obj: 'Un celular o radio', mission: 'signal', text: 'Investigar una señal desconocida' },
];

/* ---------------- piezas visuales ---------------- */

function Weave({ flip = false }: { flip?: boolean }) {
  const colors = ['#FFC93C', '#3CC8FF', '#55DB7A', '#FF6B5B'];
  return (
    <svg className={`weave ${flip ? 'flip' : ''}`} viewBox="0 0 1200 60" preserveAspectRatio="none" aria-hidden="true">
      {colors.map((c, i) => {
        const phase = i * 75;
        const d = Array.from({ length: 13 }, (_, k) => {
          const x = k * 100;
          const y = 30 + Math.sin(((x + phase) / 300) * Math.PI * 2) * (14 - i * 2);
          return `${k === 0 ? 'M' : 'L'}${x} ${y.toFixed(1)}`;
        }).join(' ');
        return <path key={c} d={d} stroke={c} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity=".9" />;
      })}
    </svg>
  );
}

function SectionHead({ kicker, title, children, center = false }: { kicker: string; title: string; children?: ReactNode; center?: boolean }) {
  return (
    <header className={`sec-head ${center ? 'center' : ''}`}>
      <p className="eyebrow">{kicker}</p>
      <h2>{title}</h2>
      {children && <p className="sec-lead">{children}</p>}
    </header>
  );
}

function RoleLineup() {
  return (
    <div className="lineup" aria-label="Las cuatro especialidades">
      {ROLE_ORDER.map((r, i) => (
        <div key={r} className="lineup-item" style={{ '--c': ROLES[r].color, animationDelay: `${i * 0.12}s` } as CSSProperties}>
          <span className="lineup-tag">
            {ROLES[r].num}
            <i />
          </span>
          <Astronaut avatar={ROLE_AVATARS[r]} role={r} size={96} pose={i % 2 ? 'wave' : 'idle'} />
        </div>
      ))}
    </div>
  );
}

function DependencyDiagram() {
  const nodes = [
    { id: 'energy', x: 150, y: 46, label: 'Energía', emoji: '⚡', c: '#FFC93C' },
    { id: 'water', x: 46, y: 170, label: 'Agua', emoji: '💧', c: '#3CC8FF' },
    { id: 'food', x: 150, y: 294, label: 'Alimentos', emoji: '🌱', c: '#55DB7A' },
    { id: 'habitat', x: 254, y: 170, label: 'Hábitat', emoji: '🛡️', c: '#FF6B5B' },
  ];
  return (
    <svg viewBox="0 0 300 340" className="deps" role="img" aria-label="Dependencias entre los sistemas de la colonia">
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10z" fill="#FFF4DC" />
        </marker>
      </defs>
      <g stroke="#FFF4DC" strokeWidth="3" fill="none" markerEnd="url(#arr)" opacity=".85">
        <path d="M150 82 L150 254" strokeDasharray="6 6" />
        <path d="M125 66 L66 140" />
        <path d="M66 200 L126 270" />
        <path d="M234 200 L176 270" strokeDasharray="2 6" />
      </g>
      {nodes.map((n) => (
        <g key={n.id} transform={`translate(${n.x} ${n.y})`}>
          <circle r="34" fill={n.c} stroke="#211A4A" strokeWidth="3.5" />
          <text y="2" textAnchor="middle" dominantBaseline="middle" fontSize="26">
            {n.emoji}
          </text>
          <text y="52" textAnchor="middle" fill="#FFF4DC" fontFamily="Fredoka Variable, Fredoka, sans-serif" fontWeight="700" fontSize="15">
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function ScannerMock() {
  return (
    <div className="scanmock">
      <div className="scanmock-cam">
        <svg viewBox="0 0 320 240" className="scanmock-scene" aria-hidden="true">
          <rect width="320" height="240" fill="#2B2F6E" />
          <rect y="170" width="320" height="70" fill="#C98A5E" />
          <rect x="18" y="20" width="96" height="78" rx="6" fill="#7FB2FF" opacity=".45" stroke="#FFF4DC" strokeWidth="3" />
          <path d="M126 220 L140 160 L190 160 L204 220Z" fill="#E2683C" stroke="#211A4A" strokeWidth="3" />
          <rect x="134" y="150" width="62" height="16" rx="5" fill="#C2512E" stroke="#211A4A" strokeWidth="3" />
          <g fill="#55DB7A" stroke="#1E6B3A" strokeWidth="2.5">
            <path d="M165 150 C150 120 120 110 108 92 C140 92 160 112 165 150Z" />
            <path d="M165 150 C175 112 200 92 228 88 C214 116 188 126 165 150Z" />
            <path d="M165 150 C158 110 160 80 170 56 C186 82 180 118 165 150Z" fill="#7BE896" />
          </g>
        </svg>
        <div className="scanmock-box">
          <span>Planta 97%</span>
        </div>
        <i className="sm-c1" />
        <i className="sm-c2" />
        <i className="sm-c3" />
        <i className="sm-c4" />
        <div className="scanmock-sweep" />
        <span className="scanmock-title">IXCHEL AI SCANNER</span>
      </div>
      <div className="scanmock-result card">
        <p className="eyebrow dark">Object discovered</p>
        <h3>🪴 Categoría: Planta</h3>
        <blockquote>
          <IXOrb size={38} mood="talk" /> «¡Hemos descubierto un organismo vegetal! Necesitamos aprender a crear un ecosistema capaz de producir alimentos en Marte.»
        </blockquote>
        <div className="scanmock-unlock">
          <MissionPatch id="greenhouse" size={74} />
          <div>
            <small>New mission unlocked</small>
            <b>GREENHOUSE RESCUE</b>
            <span>Mantener un invernadero vivo durante una tormenta de polvo</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- página ---------------- */

export function Landing() {
  const install = useInstall();
  return (
    <div className="landing">
      {/* HERO */}
      <section className="hero space-bg">
        <div className="starfield" />
        <div className="starfield far" />
        <nav className="hero-nav">
          <Logo size="sm" sub={false} />
          <div className="row">
            {install.canInstall && (
              <button className="btn small cream" onClick={install.install}>
                <Icon name="install" size={16} /> Instalar app
              </button>
            )}
            <a className="btn small ghost" href="#/jugar">
              Unirme
            </a>
            <a className="btn small" href="#/profe">
              Crear misión
            </a>
          </div>
        </nav>
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Plataforma de aprendizaje multijugador nativa de IA</p>
            <Logo size="xl" />
            <h1 className="hero-tag">
              Un salón. Varias tripulaciones. <span>Un planeta por salvar.</span>
            </h1>
            <p className="hero-lead">
              IXCHEL convierte cualquier salón en una colonia espacial que debe sobrevivir. Cada alumno tiene un rol y una pieza secreta de información, la IA
              convierte objetos del salón en misiones y las decisiones de cada tripulación cambian un planeta que comparte toda la clase.
            </p>
            <div className="hero-ctas">
              <a className="btn huge" href="#/profe">
                🚀 Soy profe: crear misión
              </a>
              <a className="btn huge water" href="#/jugar">
                🧑‍🚀 Soy alumno: unirme
              </a>
            </div>
            <p className="hero-pwa">
              <Icon name="check" size={16} /> PWA: corre en el navegador, se instala como app y funciona sin servidor
            </p>
          </div>
          <div className="hero-visual">
            <div className="hero-frame">
              <ColonyMap sectors={HERO_SECTORS} buildings={[{ id: 'hydroponics', level: 1 }, { id: 'antenna', level: 1 }]} crewBySector={HERO_CREWS} highlight="food" />
              <div className="hero-status panel">
                <span className="dot" style={{ '--c': 'var(--food)' } as CSSProperties} /> MARS-01 · Colonia operativa · Sol 47
              </div>
            </div>
            <RoleLineup />
          </div>
        </div>
        <ul className="hero-stats">
          <li>
            <b>4</b> especialidades
          </li>
          <li>
            <b>8</b> tripulaciones
          </li>
          <li>
            <b>1</b> colonia compartida
          </li>
          <li>
            <b>40</b> minutos
          </li>
          <li>
            <b>0</b> materiales
          </li>
        </ul>
      </section>

      <Weave />

      {/* NO ES OTRO QUIZ */}
      <section className="sec sec-paper">
        <SectionHead kicker="El nuevo concepto" title="No es otro quiz con temática espacial" center>
          Quitamos la construcción física para reducir la fricción: más participación, partidas más dinámicas y nada que preparar. Pero no queríamos otro Kahoot
          con cohetes. La innovación está en que los niños exploran su mundo, usan IA para descubrir, reciben misiones personalizadas y colaboran para resolver
          emergencias.
        </SectionHead>
        <div className="versus">
          <div className="vs-card vs-old">
            <h3>Quiz tradicional</h3>
            <ul>
              <li>32 alumnos contestan la misma pregunta</li>
              <li>Gana quien responde más rápido</li>
              <li>Nadie depende de nadie</li>
              <li>Termina la partida y se olvida</li>
            </ul>
          </div>
          <div className="vs-mid">VS</div>
          <div className="vs-card vs-new card">
            <h3>
              <span className="logo-x">IX</span>CHEL
            </h3>
            <ul>
              <li>Cada quien tiene información que nadie más tiene</li>
              <li>Se gana en eficiencia, cooperación y creatividad</li>
              <li>Ocho tripulaciones dependen unas de otras</li>
              <li>La colonia crece y se recuerda clase tras clase</li>
            </ul>
          </div>
        </div>
        <div className="changes">
          {[
            { icon: '🧰', t: 'Cero materiales', d: 'Nada de construir robots ni medir voltajes: el profesor abre la app y empieza.' },
            { icon: '📱', t: 'Cualquier dispositivo', d: 'Celular, tableta o computadora, directo desde el navegador y sin cuentas.' },
            { icon: '📷', t: 'Cámara + IA', d: 'Los objetos cotidianos del salón se convierten en misiones científicas.' },
            { icon: '🪐', t: 'Consecuencias compartidas', d: 'Cada decisión de una tripulación afecta a la colonia de toda la clase.' },
          ].map((c) => (
            <div key={c.t} className="change card">
              <span className="change-icon">{c.icon}</span>
              <h3>{c.t}</h3>
              <p>{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      <Weave flip />

      {/* PLANETA VIVO */}
      <section className="sec sec-dusk">
        <SectionHead kicker="La gran innovación · Living Planet" title="Un planeta que evoluciona con toda la clase">
          En lugar de que cada equipo juegue en un mundo aparte, todas las tripulaciones construyen y mantienen viva la misma colonia. En un salón de 32
          alumnos se forman ocho tripulaciones de cuatro, y cada una administra un sector de MARS-01.
        </SectionHead>
        <div className="planet-grid">
          <div className="status-demo panel">
            <div className="status-head">
              <div>
                <p className="eyebrow">Global planet status</p>
                <h3>MARS-01</h3>
              </div>
              <span className="chip">Sol 47</span>
            </div>
            <div className="status-meters">
              {SYSTEM_ORDER.map((s, i) => (
                <SystemMeter key={s} system={s} value={[78, 64, 85, 71][i]} size="lg" />
              ))}
            </div>
            <div className="status-line ok">
              <span className="dot" /> Colonia operativa
            </div>
            <p className="fine">Ejemplo de interfaz: los porcentajes son valores de juego.</p>
          </div>
          <div className="deps-card">
            <DependencyDiagram />
            <ul className="deps-notes">
              <li>⚡→🌱 Los invernaderos necesitan energía para sus luces.</li>
              <li>💧→🌱 El agua abastece a los cultivos.</li>
              <li>⚡→💧 Las recicladoras de agua funcionan con energía.</li>
              <li>🛡️ Los refugios protegen a toda la tripulación.</li>
            </ul>
          </div>
          <div className="sectors-list">
            {CREWS.map((c) => (
              <div key={c.id} className="sector-row">
                <b>{c.name}</b>
                <span>
                  {SECTORS[c.sector].emoji} {SECTORS[c.sector].name}
                </span>
              </div>
            ))}
          </div>
        </div>
        <blockquote className="big-quote">
          Si un equipo toma una mala decisión, puede afectar a toda la colonia. <b>No solo quieres ganar tú: quieres que toda la clase mantenga viva su colonia.</b>
        </blockquote>
      </section>

      <Weave />

      {/* ROLES */}
      <section className="sec sec-night">
        <SectionHead kicker="Cuatro roles por tripulación" title="Cuatro especialidades. Ninguna sobra." center>
          Cada especialidad tiene una mecánica distinta y, sobre todo, información secreta: nadie tiene el panorama completo.
        </SectionHead>
        <div className="roles-grid">
          {ROLE_ORDER.map((r, i) => {
            const role = ROLES[r];
            return (
              <article key={r} className="role-card card" style={{ '--c': role.color, '--cs': role.soft, animationDelay: `${i * 0.08}s` } as CSSProperties}>
                <span className="role-card-num mono">{role.num}</span>
                <div className="role-card-art">
                  <Astronaut avatar={ROLE_AVATARS[r]} role={r} size={120} pose="wave" />
                </div>
                <h3>{role.name}</h3>
                <p className="role-card-es">
                  {role.emoji} {role.es} · {role.specialty}
                </p>
                <p className="role-card-ability">{role.ability}</p>
                <p className="role-card-secret">
                  <b>En una tormenta de polvo recibe:</b> {STORM_INFO[r]}.
                </p>
              </article>
            );
          })}
        </div>
        <div className="mechanics-row">
          <div className="mech panel">
            <span>🔐</span>
            <p>
              <b>Información secreta por jugador.</b> Los cuatro deben comunicar sus datos y decidir juntos: resolución cooperativa de problemas.
            </p>
          </div>
          <div className="mech panel">
            <span>🗳️</span>
            <p>
              <b>Votación interna.</b> Cada tripulación decide desde sus celulares: nadie queda fuera por no querer hablar en público.
            </p>
          </div>
          <div className="mech panel">
            <span>🎲</span>
            <p>
              <b>Números distintos por equipo.</b> Copiar a otra tripulación no sirve; dialogar con la tuya, sí.
            </p>
          </div>
        </div>
      </section>

      <Weave flip />

      {/* SCAN TO MISSION */}
      <section className="sec sec-indigo">
        <SectionHead kicker="Nuestro principal diferenciador de IA" title="SCAN TO MISSION">
          El profesor presiona <b>SCAN THE WORLD</b> y fotografía un objeto del salón, o deja que la clase vote. La IA identifica la categoría, consulta una
          biblioteca de misiones científicamente revisadas y personaliza el desafío. Una sola fotografía desencadena una actividad para todo el salón.
        </SectionHead>
        <ScannerMock />
        <div className="objects">
          {OBJECTS.map((o) => (
            <div key={o.obj} className="object-tile">
              <span className="object-emoji">{o.emoji}</span>
              <div>
                <b>{o.obj}</b>
                <p>{o.text}</p>
                <small>{MISSIONS[o.mission].title}</small>
              </div>
            </div>
          ))}
        </div>
        <p className="honest panel">
          <IXOrb size={44} mood="idle" />
          <span>
            <b>La fotografía no genera propiedades científicas mágicamente:</b> es la llave que activa contenido educativo revisado. Con la IA local, la foto se
            analiza en el navegador y nunca sale del dispositivo; con Claude, IX reconoce cualquier objeto y narra con más detalle.
          </span>
        </p>
      </section>

      <Weave />

      {/* MISIONES */}
      <section className="sec sec-mars">
        <SectionHead kicker="Las misiones" title="Tienen que sentirse como videojuego, no como ejercicio escolar">
          No decimos «resuelve este problema de energía». Decimos: <b>«¡Se ha perdido el 40% de la energía de la colonia! Tenemos poco tiempo antes de que se
          agoten las reservas»</b>. Cada misión tiene narrativa, eventos, objetivos, decisiones y consecuencias.
        </SectionHead>
        <div className="missions-grid">
          {MISSION_ORDER.map((id, i) => {
            const m = MISSIONS[id];
            return (
              <article key={id} className="mission-card card" style={{ '--mc': m.color, animationDelay: `${i * 0.06}s` } as CSSProperties}>
                <div className="mission-card-top">
                  <MissionPatch id={id} size={104} />
                  <div>
                    <span className="mono mission-code">Misión {m.code.slice(2)}</span>
                    <h3>{m.title}</h3>
                    <p className="mission-es">{m.titleEs}</p>
                  </div>
                </div>
                <p className="mission-story">{m.story}</p>
                <p className="mission-twist">
                  <b>Giro inesperado:</b> {m.twist}
                </p>
                <p className="mission-puzzle">🧩 {PUZZLE_KIND[id]}</p>
                <div className="chips">
                  {m.learning.map((l) => (
                    <span key={l} className="chip dark">
                      {l}
                    </span>
                  ))}
                </div>
                {m.disclaimer && <p className="fine">{m.disclaimer}</p>}
                {id === 'final' && <p className="fine">Se desbloquea al completar tres misiones distintas.</p>}
              </article>
            );
          })}
        </div>
      </section>

      <Weave flip />

      {/* RETENCIÓN */}
      <section className="sec sec-paper">
        <SectionHead kicker="Retención" title="Mecánicas para querer volver a jugar" center>
          No basta con tener buenas misiones: necesitamos que la clase quiera regresar.
        </SectionHead>
        <div className="mechanics">
          {[
            { n: '01', t: 'Colony Progression', d: 'Cada misión completada desbloquea un edificio, una región o una tecnología para la colonia.', fav: true },
            { n: '02', t: 'Astronaut Identity', d: 'Cada alumno tiene un astronauta personalizable, nivel, insignias y logros.' },
            { n: '03', t: 'Mystery Discoveries', d: 'Las fotografías y las decisiones desbloquean descubrimientos e historias especiales.' },
            { n: '04', t: 'Crew Rivalry', d: 'Las tripulaciones compiten en eficiencia, creatividad y cooperación, no solo en velocidad.' },
            { n: '05', t: 'The Space Campaign', d: 'La clase avanza por capítulos y desbloquea nuevos destinos: Marte, la Luna y estaciones orbitales.' },
          ].map((m) => (
            <div key={m.n} className={`mechanic card ${m.fav ? 'fav' : ''}`}>
              <span className="mechanic-n mono">{m.n}</span>
              <h3>{m.t}</h3>
              <p>{m.d}</p>
              {m.fav && <span className="fav-tag">★ Nuestra favorita</span>}
            </div>
          ))}
        </div>
        <div className="campaign-path">
          <div className="cp-stop on">
            <span>🔴</span>
            <b>Capítulo 1 · Marte</b>
            <small>6 misiones</small>
          </div>
          <i />
          <div className="cp-stop">
            <span>🌙</span>
            <b>Capítulo 2 · Luna</b>
            <small>Próximamente</small>
          </div>
          <i />
          <div className="cp-stop">
            <span>🛰️</span>
            <b>Capítulo 3 · Estación orbital</b>
            <small>Próximamente</small>
          </div>
        </div>
        <blockquote className="big-quote dark">
          Después de varias clases, el grupo mira su planeta y dice: <b>«Nosotros construimos esto».</b> Eso genera continuidad y sentido de pertenencia.
        </blockquote>
      </section>

      <Weave />

      {/* EVENT GENERATOR */}
      <section className="sec sec-night">
        <SectionHead kicker="Un giro todavía más original" title="The Classroom Event Generator">
          La IA no solo genera misiones a partir de objetos: también genera acontecimientos a partir de lo que ocurre en la clase. Cada grupo vive una
          experiencia diferente con el mismo motor de juego.
        </SectionHead>
        <div className="generator">
          <div className="gen-input card">
            <p className="eyebrow dark">El profesor elige</p>
            <dl>
              <div>
                <dt>Objeto descubierto</dt>
                <dd>🪴 Planta</dd>
              </div>
              <div>
                <dt>Tripulaciones</dt>
                <dd>8</dd>
              </div>
              <div>
                <dt>Dificultad</dt>
                <dd>Primaria alta</dd>
              </div>
              <div>
                <dt>Objetivo</dt>
                <dd>Producción de alimentos</dd>
              </div>
            </dl>
          </div>
          <div className="gen-arrow">
            <IXOrb size={70} mood="talk" />
            <Icon name="arrow" size={34} />
          </div>
          <div className="gen-output card">
            <p className="eyebrow dark">IX genera</p>
            <ul>
              <li>🎬 El escenario y la historia de la misión</li>
              <li>🧩 Un reto distinto para cada sector</li>
              <li>📡 Acontecimiento 1: datos nuevos</li>
              <li>🚨 Acontecimiento 2: emergencia global</li>
              <li>🔭 Acontecimiento 3: descubrimiento misterioso</li>
            </ul>
          </div>
        </div>
        <div className="rules">
          {[
            { when: 'Si la mayoría tiene dificultades', then: 'IX envía una pista del concepto a toda la clase.' },
            { when: 'Si todos resuelven con facilidad', then: 'Se desbloquea una EMERGENCIA BONUS más difícil.' },
            { when: 'Si una tripulación participa poco', then: 'Se activa el Protocolo de Tripulación: cada especialidad aporta algo sencillo e imprescindible.' },
          ].map((r) => (
            <div key={r.when} className="rule panel">
              <small>{r.when}</small>
              <p>→ {r.then}</p>
            </div>
          ))}
        </div>
        <p className="guardrail">
          <b>La IA narra; el motor decide.</b> El modelo escribe historias, pistas, evaluaciones y debriefs dentro de plantillas con salidas estructuradas. Los
          recursos, las puntuaciones y las consecuencias los controla un motor determinista.
        </p>
      </section>

      <Weave flip />

      {/* CLASE DE 40 MINUTOS */}
      <section className="sec sec-dusk">
        <SectionHead kicker="Cómo se juega" title="Una clase completa en 40 minutos" center>
          El profesor controla todo desde una sola pantalla.
        </SectionHead>
        <ol className="timeline">
          {CLASS_PLAN.map((s, i) => (
            <li key={s.stage} style={{ animationDelay: `${i * 0.06}s` }}>
              <span className="tl-time mono">
                {s.from}–{s.to}
              </span>
              <div className="tl-dot" />
              <b>{s.stage}</b>
              <small>{s.es}</small>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <Weave />

      {/* MVP Y ARQUITECTURA */}
      <section className="sec sec-paper">
        <SectionHead kicker="IXCHEL MVP · versión competitiva" title="Construido para el hackathon y listo para el salón" center>
          No construimos un juego enorme: construimos una experiencia completa que se puede probar con varias tripulaciones al mismo tiempo.
        </SectionHead>
        <div className="build-grid">
          <ol className="mvp card">
            {[
              'Sala con código de acceso y QR',
              'Formación automática de tripulaciones de cuatro',
              'Cuatro roles con información diferente',
              'Escáner que reconoce plantas, agua, iluminación, materiales y señales',
              'Misión generada a partir del objeto seleccionado',
              'Actividad cooperativa por tripulación',
              'Evento global simultáneo para todas las tripulaciones',
              'Mapa de la colonia que cambia según los resultados',
              'Debrief con IA y reporte educativo',
            ].map((t, i) => (
              <li key={t}>
                <span className="mvp-n">{i + 1}</span>
                {t}
                <Icon name="check" size={18} className="mvp-check" />
              </li>
            ))}
          </ol>
          <div className="arch card">
            <h3>Arquitectura</h3>
            <table>
              <tbody>
                {[
                  ['Aula en tiempo real', 'WebRTC entre navegadores (PeerJS): el navegador del profesor es el anfitrión'],
                  ['Interfaz de juego', 'React + TypeScript como PWA instalable'],
                  ['Escáner', 'TensorFlow.js (COCO-SSD) en el dispositivo + Claude multimodal opcional'],
                  ['Generador de misiones', 'Claude con salidas estructuradas y plantillas revisadas'],
                  ['Motor del juego', 'TypeScript determinista: recursos, dependencias y consecuencias'],
                  ['Mapa de colonia', 'Escenas SVG animadas'],
                  ['Panel del profesor', 'Pantalla de proyector + reporte descargable'],
                  ['Panel de alumnos', 'Interfaz móvil ligera, sin cuentas'],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <th>{k}</th>
                    <td>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="fine">
              Sin simulación física ni cálculos aeroespaciales en tiempo real: un modelo de recursos, dependencias y consecuencias sustentado en conceptos y
              datos de la NASA. Más fácil de construir, de probar en un salón y de mantener al ritmo de una clase.
            </p>
          </div>
        </div>
      </section>

      <Weave flip />

      {/* DIFERENCIADORES */}
      <section className="sec sec-night">
        <SectionHead kicker="The IXCHEL experience" title="Lo que nos hace diferentes" center />
        <div className="pillars">
          {[
            { e: '👩‍🚀', t: 'Classroom Multiplayer', d: 'Toda la clase participa al mismo tiempo.' },
            { e: '🧑‍🤝‍🧑', t: 'Four-Person Crews', d: 'Cada alumno tiene información y habilidades exclusivas.' },
            { e: '📷', t: 'AI World Scanner', d: 'El entorno cotidiano activa misiones.' },
            { e: '🪐', t: 'Living Planet', d: 'Las decisiones de los equipos cambian una colonia compartida.' },
          ].map((p) => (
            <div key={p.t} className="pillar">
              <span>{p.e}</span>
              <b>{p.t}</b>
              <p>{p.d}</p>
            </div>
          ))}
        </div>
        <p className="manifesto sticker">THE CLASSROOM BECOMES THE MISSION.</p>
        <p className="manifesto-sub">
          No son 32 alumnos contestando las mismas preguntas: son ocho tripulaciones que dependen unas de otras para mantener viva una civilización en Marte.
          La IA convierte el entorno de los niños en misiones nuevas y el sistema de roles garantiza que todos tengan algo importante que aportar.
        </p>
      </section>

      {/* CIERRE */}
      <section className="closing space-bg">
        <div className="starfield" />
        <div className="closing-moon" aria-hidden="true" />
        <div className="closing-inner">
          <p className="eyebrow">¿Por qué IXCHEL?</p>
          <p className="ixchel-name">
            Ixchel es la diosa maya de la Luna y del tejido. Como ella, IXCHEL teje: cada tripulación es un hilo y, juntas, forman la colonia.
          </p>
          <blockquote className="closing-quote">
            «En IXCHEL, cada clase se convierte en una tripulación, cada niño tiene una misión y cada decisión puede cambiar el destino de un planeta. Porque la
            próxima generación de exploradores espaciales no debería limitarse a aprender sobre el universo: debería tener la oportunidad de explorarlo.»
          </blockquote>
          <div className="hero-ctas center">
            <a className="btn huge" href="#/profe">
              🚀 Crear misión
            </a>
            <a className="btn huge water" href="#/jugar">
              🧑‍🚀 Unirme
            </a>
          </div>
        </div>
        <footer className="foot">
          <Logo size="sm" />
          <p>
            PWA que corre 100% en el navegador · Datos científicos basados en publicaciones de la NASA · La señal de la Misión 04 es ficticia · Hecho para el
            hackathon
          </p>
        </footer>
      </section>
    </div>
  );
}
