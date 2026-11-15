// HUD del juego: medidores de la colonia, objetivo, minimapa, controles táctiles,
// avisos y la interfaz de cada minijuego.

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { MISSION_ORDER, MISSIONS, SYSTEMS, SYSTEM_ORDER } from '../../shared/content';
import { Icon } from '../components/ui';
import type { Game } from '../game/engine';
import { getUi, useUi, type MgUi } from '../game/store';
import { DISCOVERY_SPOTS, LAYOUT, SPAWN, WORLD_RADIUS } from '../game/world';
import { isMuted, setMuted, sfx } from '../lib/sound';
import { DataPanel, JournalPanel, MenuPanel } from './Panels';

type PanelId = 'data' | 'journal' | 'menu' | null;

export function Hud({ game }: { game: Game }) {
  const [panel, setPanel] = useState<PanelId>(null);
  const mg = useUi((s) => s.mg);
  const touch = useUi((s) => s.touch);
  const dialog = useUi((s) => s.dialog);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (getUi().dialog) return;
      if (k === 'tab' || k === 'i') {
        e.preventDefault();
        setPanel((p) => (p === 'data' ? null : 'data'));
      } else if (k === 'j') setPanel((p) => (p === 'journal' ? null : 'journal'));
      else if (k === 'escape') setPanel((p) => (p ? null : 'menu'));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Mientras un panel está abierto, el jugador no se mueve
  useEffect(() => {
    game.input.enabled = !panel;
  }, [panel, game]);

  return (
    <div className={`hud ${mg ? 'in-mg' : ''}`}>
      <div className="hud-top">
        <MetersBar />
        {!mg && <Objective />}
        <div className="hud-buttons">
          <button className="hud-btn" onClick={() => setPanel('data')} aria-label="Mis datos">
            <span>🗂️</span>
            <b>Datos</b>
          </button>
          <button className="hud-btn" onClick={() => setPanel('journal')} aria-label="Bitácora">
            <span>📓</span>
            <b>Bitácora</b>
          </button>
          <button className="hud-btn" onClick={() => setPanel('menu')} aria-label="Menú">
            <span>⚙️</span>
            <b>Menú</b>
          </button>
        </div>
      </div>

      {mg ? <MinigameHud game={game} mg={mg} /> : <Prompt game={game} />}
      {(!mg || mg.markers) && <Minimap game={game} />}
      <Toasts />

      {touch && !dialog && !panel && (!mg || mg.joystick || mg.markers) && <TouchControls game={game} showAction={!mg || !!mg.markers} />}

      {panel === 'data' && <DataPanel game={game} onClose={() => setPanel(null)} />}
      {panel === 'journal' && <JournalPanel onClose={() => setPanel(null)} />}
      {panel === 'menu' && <MenuPanel game={game} onClose={() => setPanel(null)} onHelp={() => { setPanel(null); game.missions.controlsHelp(); }} />}
    </div>
  );
}

function MetersBar() {
  const meters = useUi((s) => s.meters);
  const sol = useUi((s) => s.sol);
  const day = useUi((s) => s.dayPhase);
  const isDay = day > 0.23 && day < 0.77;
  return (
    <div className="hud-meters">
      <div className="hud-sol">
        <span>{isDay ? '☀️' : '🌙'}</span> Sol {sol}
      </div>
      {SYSTEM_ORDER.map((s) => {
        const v = meters[s];
        return (
          <div key={s} className={`mini-meter ${v < 30 ? 'low' : ''}`} style={{ '--c': SYSTEMS[s].color } as CSSProperties} title={`${SYSTEMS[s].name}: ${v}%`}>
            <span>{SYSTEMS[s].emoji}</span>
            <i>
              <em style={{ width: `${Math.max(3, v)}%` }} />
            </i>
            <b>{v}</b>
          </div>
        );
      })}
    </div>
  );
}

function Objective() {
  const obj = useUi((s) => s.objective);
  if (!obj) return null;
  return (
    <div className="objective" style={{ '--c': obj.color } as CSSProperties}>
      <div className="objective-head">
        <span>{obj.emoji}</span>
        <b>{obj.title}</b>
        {obj.step && <em>Paso {obj.step}</em>}
      </div>
      <p>{obj.text}</p>
    </div>
  );
}

function Prompt({ game }: { game: Game }) {
  const prompt = useUi((s) => s.prompt);
  const touch = useUi((s) => s.touch);
  if (!prompt) return null;
  return (
    <button
      className="prompt"
      onPointerDown={() => game.pressAction(true)}
      onPointerUp={() => game.pressAction(false)}
      onPointerLeave={() => game.pressAction(false)}
    >
      {!touch && <kbd>E</kbd>}
      <span>{prompt.text}</span>
      {prompt.hold != null && (
        <i className="prompt-hold">
          <em style={{ width: `${Math.round(prompt.hold * 100)}%` }} />
        </i>
      )}
    </button>
  );
}

function Toasts() {
  const toasts = useUi((s) => s.toasts);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone ?? 'info'}`}>
          {t.emoji && <span>{t.emoji}</span>}
          {t.text}
        </div>
      ))}
    </div>
  );
}

/* ---------------- minimapa ---------------- */

function Minimap({ game }: { game: Game }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const c = ref.current;
      if (!c) return;
      const ctx = c.getContext('2d')!;
      const size = c.width;
      const scale = size / 2 / (WORLD_RADIUS * 0.92);
      const ui = getUi();
      const { x: px, z: pz, camYaw } = game.mapInfo();
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = 'rgba(122,46,22,0.85)';
      ctx.fillRect(0, 0, size, size);
      const toMap = (x: number, z: number) => [size / 2 + x * scale, size / 2 + z * scale] as const;
      // caminos
      ctx.strokeStyle = 'rgba(255,214,170,0.45)';
      ctx.lineWidth = 3;
      for (const l of Object.values(LAYOUT)) {
        ctx.beginPath();
        ctx.moveTo(...toMap(0, 0));
        ctx.lineTo(...toMap(l.x, l.z));
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(...toMap(0, 0));
      ctx.lineTo(...toMap(SPAWN.x, SPAWN.z));
      ctx.stroke();
      // sitios
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const t = performance.now() / 1000;
      for (const id of MISSION_ORDER) {
        const l = LAYOUT[id];
        const [mx, my] = toMap(l.x, l.z);
        const done = ui.progress[id]?.done;
        const locked = id === 'final' && !MISSION_ORDER.slice(0, 5).every((m) => ui.progress[m]?.done);
        ctx.fillStyle = done ? '#55DB7A' : locked ? 'rgba(255,255,255,0.25)' : MISSIONS[id].color;
        const pulse = !done && !locked ? 1 + Math.sin(t * 4) * 0.15 : 1;
        ctx.beginPath();
        ctx.arc(mx, my, 9 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '11px sans-serif';
        ctx.fillText(done ? '✓' : MISSIONS[id].emoji, mx, my + 1);
      }
      // descubrimientos ya encontrados
      for (const d of ui.discoveries) {
        const [mx, my] = toMap(...DISCOVERY_SPOTS[d]);
        ctx.fillStyle = '#B69CFF';
        ctx.beginPath();
        ctx.arc(mx, my, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // fallas del minijuego final
      for (const m of ui.mg?.markers ?? []) {
        const [mx, my] = toMap(m.x, m.z);
        ctx.fillStyle = Math.sin(t * 8) > 0 ? '#FF3B30' : '#FFC93C';
        ctx.beginPath();
        ctx.arc(mx, my, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '10px sans-serif';
        ctx.fillText(m.emoji, mx, my + 1);
      }
      // jugador + cono de visión
      const [ux, uy] = toMap(px, pz);
      const look = Math.atan2(-Math.cos(camYaw), -Math.sin(camYaw));
      ctx.fillStyle = 'rgba(255,244,220,0.18)';
      ctx.beginPath();
      ctx.moveTo(ux, uy);
      ctx.arc(ux, uy, 34, look - 0.5, look + 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FFF4DC';
      ctx.strokeStyle = '#211A4A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ux, uy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,244,220,0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#FFF4DC';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('N', size / 2, 10);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [game]);
  return <canvas ref={ref} className="minimap" width={176} height={176} aria-label="Mapa de la colonia" />;
}

/* ---------------- controles táctiles ---------------- */

function TouchControls({ game, showAction }: { game: Game; showAction: boolean }) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const pid = useRef<number | null>(null);
  const prompt = useUi((s) => s.prompt);

  const update = (e: React.PointerEvent) => {
    const el = base.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const max = r.width / 2;
    let dx = (e.clientX - cx) / max;
    let dy = (e.clientY - cy) / max;
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }
    setKnob({ x: dx, y: dy });
    game.input.joy.x = dx;
    game.input.joy.y = -dy;
  };
  const end = () => {
    pid.current = null;
    setKnob({ x: 0, y: 0 });
    game.input.joy.x = 0;
    game.input.joy.y = 0;
  };
  useEffect(() => () => end(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div
        ref={base}
        className="joystick"
        onPointerDown={(e) => {
          pid.current = e.pointerId;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          update(e);
        }}
        onPointerMove={(e) => e.pointerId === pid.current && update(e)}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <i style={{ transform: `translate(${knob.x * 38}px, ${knob.y * 38}px)` }} />
      </div>
      {showAction && (
        <div className="touch-actions">
          <button
            className="touch-jump"
            onPointerDown={() => {
              game.input.jumpPressed = true;
            }}
            aria-label="Saltar"
          >
            ⤴
          </button>
          <button
            className={`touch-act ${prompt ? 'ready' : ''}`}
            onPointerDown={(e) => {
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              game.pressAction(true);
            }}
            onPointerUp={() => game.pressAction(false)}
            onPointerCancel={() => game.pressAction(false)}
            aria-label="Acción"
          >
            {prompt ? '✋' : '•'}
          </button>
        </div>
      )}
    </>
  );
}

/* ---------------- interfaz de minijuegos ---------------- */

function MinigameHud({ game, mg }: { game: Game; mg: MgUi }) {
  const [helpOpen, setHelpOpen] = useState(true);
  const m = MISSIONS[mg.missionId];
  useEffect(() => {
    setHelpOpen(true);
    const id = setTimeout(() => setHelpOpen(false), 9000);
    return () => clearTimeout(id);
  }, [mg.missionId, mg.title]);
  return (
    <>
      <div className="mg-panel" style={{ '--c': m.color } as CSSProperties}>
        <div className="mg-head">
          <b>{mg.title}</b>
          {mg.timeLeft != null && <span className="mg-time mono">{mg.timeLeft}s</span>}
          <button className="icon-btn" onClick={() => setHelpOpen((v) => !v)} aria-label="Ayuda">
            <Icon name="info" size={18} />
          </button>
          {mg.canExit !== false && (
            <button
              className="icon-btn"
              onClick={() => {
                sfx.pop();
                game.missions.leaveMinigame();
              }}
              aria-label="Salir del minijuego"
            >
              <Icon name="x" size={18} />
            </button>
          )}
        </div>
        {mg.stage && <p className="mg-stage">{mg.stage}</p>}
        {helpOpen && <p className="mg-help">{mg.help}</p>}
        {mg.bars?.map((b) => (
          <div key={b.label} className="mg-bar" style={{ '--c': b.color } as CSSProperties}>
            <span>{b.label}</span>
            <i>
              <em style={{ width: `${Math.round(Math.max(0, Math.min(1, b.value)) * 100)}%` }} />
              {b.target != null && <u style={{ left: `${b.target * 100}%` }} />}
            </i>
            <b>{b.text}</b>
          </div>
        ))}
      </div>

      {mg.wave && <WaveView wave={mg.wave} />}

      {(mg.sliders?.length || mg.buttons?.length || mg.pieces?.length) && (
        <div className="mg-controls">
          {mg.pieces && (
            <div className="mg-pieces">
              {mg.pieces.map((p) => (
                <button key={p.id} className={`mg-piece ${p.selected ? 'on' : ''} ${p.placed ? 'placed' : ''}`} onClick={() => game.mgPiece(p.id)}>
                  <span>{p.emoji}</span>
                  <b>{p.label}</b>
                  {p.placed && <em>✓</em>}
                </button>
              ))}
            </div>
          )}
          {mg.sliders?.map((s) => (
            <label key={s.id} className="mg-slider">
              <span>
                {s.label} <b className="mono">{s.value}{s.unit ? ` ${s.unit}` : ''}</b>
              </span>
              <input type="range" min={s.min} max={s.max} step={s.step} value={s.value} onChange={(e) => game.mgSlider(s.id, Number(e.target.value))} />
            </label>
          ))}
          {mg.buttons?.map((b) => (
            <button
              key={b.id}
              className={`btn ${b.primary ? '' : 'cream'}`}
              disabled={b.disabled}
              onPointerDown={() => game.mgButton(b.id, true)}
              onPointerUp={() => game.mgButton(b.id, false)}
            >
              {b.icon && <Icon name={b.icon} size={20} />} {b.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function WaveView({ wave }: { wave: NonNullable<MgUi['wave']> }) {
  const w = 300;
  const h = 110;
  const path = (f: number, a: number) => {
    let d = '';
    for (let x = 0; x <= w; x += 3) {
      const y = h / 2 + Math.sin((x / w) * Math.PI * 2 * f) * a * 9;
      d += `${x === 0 ? 'M' : 'L'}${x} ${y.toFixed(1)} `;
    }
    return d;
  };
  return (
    <div className="wave-view" aria-label="Comparación de ondas">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%">
        <line x1="0" x2={w} y1={h / 2} y2={h / 2} stroke="rgba(255,255,255,.15)" />
        <path d={path(wave.target.f, wave.target.a)} stroke="#FF4FB0" strokeWidth="8" fill="none" opacity=".7" strokeLinecap="round" />
        <path d={path(wave.mine.f, wave.mine.a)} stroke="#38E1FF" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
      <div className="wave-legend">
        <span style={{ color: '#FF4FB0' }}>● Señal</span>
        <span style={{ color: '#38E1FF' }}>● Tu onda</span>
      </div>
    </div>
  );
}

export function MuteButton() {
  const [m, setM] = useState(isMuted());
  return (
    <button
      className="btn ghost"
      onClick={() => {
        setMuted(!m);
        setM(!m);
      }}
    >
      <Icon name={m ? 'mute' : 'volume'} /> {m ? 'Sonido apagado' : 'Sonido encendido'}
    </button>
  );
}

