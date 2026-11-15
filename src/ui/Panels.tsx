// Paneles: datos reunidos de la misión activa, bitácora y menú de ajustes.

import { useState, type CSSProperties, type ReactNode } from 'react';
import { DIFFICULTIES, DISCOVERIES, DISCOVERY_ORDER, MISSION_ORDER, MISSION_WORLD, MISSIONS, ROLES, levelFromXp } from '../../shared/content';
import { MissionPatch } from '../components/art';
import { Icon, Stars } from '../components/ui';
import type { Game } from '../game/engine';
import { clearSave } from '../game/save';
import { setUi, useUi } from '../game/store';
import { toggleFullscreen } from '../lib/pwa';
import { MuteButton } from './Hud';

function Sheet({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="sheet-back" onClick={onClose} role="presentation">
      <div className={`sheet ${wide ? 'wide' : ''}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn dark" onClick={onClose} aria-label="Cerrar">
            <Icon name="x" />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function DataPanel({ game, onClose }: { game: Game; onClose: () => void }) {
  const intel = useUi((s) => s.intel);
  if (!intel) {
    return (
      <Sheet title="🗂️ Mis datos" onClose={onClose}>
        <p className="muted">Acércate a un lugar con problemas (sigue las columnas de luz) para reunir los datos de sus especialistas.</p>
      </Sheet>
    );
  }
  const m = MISSIONS[intel.missionId];
  return (
    <Sheet title={`🗂️ Datos · ${m.titleEs}`} onClose={onClose} wide>
      <p className="data-q" style={{ '--c': m.color } as CSSProperties}>
        <b>Problema:</b> {intel.question}
      </p>
      {intel.missing.length > 0 && (
        <p className="data-missing">
          Te faltan datos de: {intel.missing.map((r) => `${ROLES[r].emoji} ${ROLES[r].es}`).join(' · ')}. Búscalos junto a los íconos 💬.
        </p>
      )}
      <div className="data-cards">
        {intel.cards.map((c) => {
          const r = ROLES[c.role];
          return (
            <div key={c.role} className="data-card" style={{ '--c': r.color } as CSSProperties}>
              <h4>
                {r.emoji} {c.title}
              </h4>
              <table>
                <tbody>
                  {c.lines.map((l, i) => (
                    <tr key={i} className={l.strong ? 'strong' : ''}>
                      <td>
                        {l.emoji ? `${l.emoji} ` : ''}
                        {l.label}
                      </td>
                      <td className="mono">{l.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>💡 {c.tip}</p>
            </div>
          );
        })}
      </div>
      <h3 className="data-sub">Opciones (toca para descartar ❌)</h3>
      <div className="data-options">
        {intel.options.map((o) => {
          const off = intel.discarded.includes(o.id);
          return (
            <button key={o.id} className={`data-opt ${off ? 'off' : ''}`} onClick={() => game.missions.toggleDiscard(intel.missionId, o.id)}>
              <span>{off ? '❌' : o.emoji}</span>
              <b>{o.label}</b>
              <small>{o.detail}</small>
            </button>
          );
        })}
      </div>
      <p className="muted">Cuando sepas cuál es la mejor, ve a su pedestal y elígela.</p>
    </Sheet>
  );
}

export function JournalPanel({ onClose }: { onClose: () => void }) {
  const progress = useUi((s) => s.progress);
  const discoveries = useUi((s) => s.discoveries);
  const xp = useUi((s) => s.xp);
  const name = useUi((s) => s.name);
  const [open, setOpen] = useState<string | null>(null);
  const lvl = levelFromXp(xp);
  const stars = MISSION_ORDER.reduce((n, m) => n + (progress[m]?.stars ?? 0), 0);
  return (
    <Sheet title="📓 Bitácora" onClose={onClose} wide>
      <div className="journal-top">
        <div>
          <b>{name}</b>
          <span>
            Nivel {lvl.level} · {lvl.title}
          </span>
        </div>
        <div className="xp-bar">
          <i style={{ width: `${lvl.progress * 100}%` }} />
        </div>
        <span className="chip">
          ⭐ {stars}/18 · ✨ {xp} XP
        </span>
      </div>
      <div className="journal-missions">
        {MISSION_ORDER.map((id) => {
          const m = MISSIONS[id];
          const p = progress[id];
          const isOpen = open === id;
          return (
            <div key={id} className={`jm ${p?.done ? 'done' : ''}`}>
              <button className="jm-head" onClick={() => setOpen(isOpen ? null : id)}>
                <MissionPatch id={id} size={58} locked={!p?.done} />
                <div>
                  <b>
                    {m.code} · {m.titleEs}
                  </b>
                  <span>
                    {MISSION_WORLD[id].place} · {MISSION_WORLD[id].game.emoji} {MISSION_WORLD[id].game.name}
                  </span>
                </div>
                {p?.done ? <Stars value={p.stars} /> : <span className="chip warn">Pendiente</span>}
              </button>
              {isOpen && (
                <div className="jm-body">
                  {p?.done ? (
                    <>
                      <ul>
                        {m.debrief.learnings.map((l) => (
                          <li key={l}>{l}</li>
                        ))}
                      </ul>
                      <p className="nasa">🚀 {m.debrief.nasaFact}</p>
                    </>
                  ) : (
                    <p className="muted">{MISSION_WORLD[id].problem}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <h3 className="data-sub">
        Descubrimientos ({discoveries.length}/{DISCOVERY_ORDER.length})
      </h3>
      <div className="journal-disc">
        {DISCOVERY_ORDER.map((d) => {
          const found = discoveries.includes(d);
          return (
            <div key={d} className={`jd ${found ? 'on' : ''}`}>
              <span>{found ? DISCOVERIES[d].emoji : '❔'}</span>
              <b>{found ? DISCOVERIES[d].label : 'Sin descubrir'}</b>
              {found && <small>{DISCOVERIES[d].text}</small>}
            </div>
          );
        })}
      </div>
      <p className="muted">Pista: los descubrimientos brillan en morado lejos de la colonia.</p>
    </Sheet>
  );
}

export function MenuPanel({ game, onClose, onHelp }: { game: Game; onClose: () => void; onHelp: () => void }) {
  const [settings, setSettings] = useState(game.settings);
  const [confirm, setConfirm] = useState(false);
  const update = (s: Partial<typeof settings>) => {
    game.updateSettings(s);
    setSettings({ ...game.settings });
  };
  return (
    <Sheet title="⚙️ Menú" onClose={onClose}>
      <div className="menu-list">
        <button className="btn block" onClick={onClose}>
          <Icon name="play" /> Seguir jugando
        </button>
        <button className="btn ghost block" onClick={onHelp}>
          <Icon name="info" /> Controles
        </button>
        <MuteButton />
        <button className="btn ghost block" onClick={() => toggleFullscreen()}>
          <Icon name="expand" /> Pantalla completa
        </button>
        <div className="menu-row">
          <span>Calidad gráfica</span>
          <div className="seg-row">
            {(['high', 'low'] as const).map((q) => (
              <button
                key={q}
                className={`seg-btn ${settings.quality === q ? 'on' : ''}`}
                onClick={() => {
                  update({ quality: q });
                }}
              >
                {q === 'high' ? 'Alta' : 'Ligera'}
              </button>
            ))}
          </div>
        </div>
        {settings.quality !== game.world.quality && <p className="muted">La calidad cambia al recargar la página.</p>}
        <label className="menu-row">
          <span>Sensibilidad de cámara</span>
          <input type="range" min={0.4} max={2} step={0.1} value={settings.sensitivity} onChange={(e) => update({ sensitivity: Number(e.target.value) })} />
        </label>
        <label className="menu-row">
          <span>Invertir cámara vertical</span>
          <input type="checkbox" checked={settings.invertY} onChange={(e) => update({ invertY: e.target.checked })} />
        </label>
        <p className="muted">
          Dificultad: <b>{DIFFICULTIES[game.save.difficulty].label}</b> ({DIFFICULTIES[game.save.difficulty].age}). Tu partida se guarda sola en este dispositivo.
        </p>
        <button
          className="btn ghost block"
          onClick={() => {
            game.persist();
            game.endMinigame(false);
            game.menuMode = true;
            setUi({ screen: 'title', dialog: null, prompt: null, mg: null });
          }}
        >
          <Icon name="home" /> Pantalla de inicio
        </button>
        {!confirm ? (
          <button className="btn ghost block" onClick={() => setConfirm(true)}>
            <Icon name="refresh" /> Borrar partida
          </button>
        ) : (
          <button
            className="btn coral block"
            onClick={() => {
              clearSave();
              window.location.reload();
            }}
          >
            ¿Seguro? Toca para borrar todo
          </button>
        )}
      </div>
    </Sheet>
  );
}
