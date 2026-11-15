// Diálogos del juego: IX, especialistas, pedestales de decisión, resultados,
// instrucciones de minijuegos, cierre de misión y descubrimientos.

import { useEffect, type CSSProperties } from 'react';
import { BUILDINGS, DISCOVERIES, MISSION_WORLD, MISSIONS, ROLES, SYSTEMS, SYSTEM_ORDER } from '../../shared/content';
import { Confetti, Stars, Typewriter } from '../components/ui';
import { IXOrb, MissionPatch } from '../components/art';
import type { Game } from '../game/engine';
import { useUi, type Dialog, type DialogAction } from '../game/store';

export function DialogLayer({ game }: { game: Game }) {
  const dialog = useUi((s) => s.dialog);
  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key.toLowerCase() === 'e') {
        const acts = dialog.actions ?? [];
        const primary = acts.find((a) => a.kind === 'primary') ?? acts[acts.length - 1];
        if (primary) {
          e.preventDefault();
          primary.onClick();
        }
      }
    };
    // Pequeña espera para que la misma tecla que abrió el diálogo no lo cierre
    const id = setTimeout(() => window.addEventListener('keydown', onKey), 350);
    return () => {
      clearTimeout(id);
      window.removeEventListener('keydown', onKey);
    };
  }, [dialog]);
  if (!dialog) return null;
  void game;
  return (
    <div className="dlg-back" role="presentation">
      <div className={`dlg kind-${dialog.kind}`} role="dialog" aria-modal="true">
        <DialogBody d={dialog} />
        <Actions actions={dialog.actions} />
      </div>
    </div>
  );
}

function Actions({ actions }: { actions?: DialogAction[] }) {
  if (!actions?.length) return null;
  return (
    <div className="dlg-actions">
      {actions.map((a) => (
        <button key={a.label} className={`btn ${a.kind === 'ghost' ? 'ghost' : a.kind === 'danger' ? 'coral' : ''}`} onClick={a.onClick}>
          {a.label}
        </button>
      ))}
    </div>
  );
}

function Effects({ effects }: { effects: Partial<Record<string, number>> }) {
  const list = SYSTEM_ORDER.filter((s) => effects[s]);
  if (!list.length) return null;
  return (
    <div className="effects">
      {list.map((s) => {
        const v = effects[s]!;
        return (
          <span key={s} className={`effect ${v > 0 ? 'up' : 'down'}`}>
            {SYSTEMS[s].emoji} {SYSTEMS[s].short} {v > 0 ? `+${v}` : v}
          </span>
        );
      })}
    </div>
  );
}

function DialogBody({ d }: { d: Dialog }) {
  const intel = useUi((s) => s.intel);
  switch (d.kind) {
    case 'ix':
      return (
        <div className="dlg-ix">
          <IXOrb size={92} mood={d.mood ?? 'talk'} />
          <div>
            <span className="eyebrow">IX · Inteligencia de la colonia</span>
            {d.title && <h2>{d.title}</h2>}
            <p>
              <Typewriter text={d.text} speed={14} />
            </p>
          </div>
        </div>
      );
    case 'intel': {
      const r = ROLES[d.card.role];
      return (
        <div className="dlg-intel" style={{ '--c': r.color, '--cs': r.soft } as CSSProperties}>
          <div className="intel-head">
            <span className="intel-emoji">{r.emoji}</span>
            <div>
              <span className="eyebrow">
                {d.npcName} · {r.es}
              </span>
              <h2>{d.card.title}</h2>
            </div>
          </div>
          <p className="intel-intro">«{d.card.intro}»</p>
          <table className="intel-table">
            <tbody>
              {d.card.lines.map((l, i) => (
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
          <p className="intel-tip">💡 {d.card.tip}</p>
        </div>
      );
    }
    case 'option': {
      const m = MISSIONS[d.missionId];
      return (
        <div className="dlg-option" style={{ '--c': m.color } as CSSProperties}>
          <div className="option-big">{d.option.emoji}</div>
          <span className="eyebrow">{d.question}</span>
          <h2>
            {d.option.label} {d.discarded && <span className="chip bad">Descartada</span>}
          </h2>
          {d.option.detail && <p>{d.option.detail}</p>}
          {!d.ready && intel && (
            <p className="option-need">
              🔒 Para elegir necesitas los datos de los 4 especialistas. Te faltan: {intel.missing.map((r) => `${ROLES[r].emoji} ${ROLES[r].es}`).join(', ')}.
            </p>
          )}
          {d.ready && <p className="option-ready">Compara con tus datos (botón 🗂️ Datos) antes de decidir. Puedes marcar con ❌ las opciones que no cumplen.</p>}
        </div>
      );
    }
    case 'result': {
      const good = d.tier === 'best';
      return (
        <div className={`dlg-result ${good ? 'good' : 'bad'}`}>
          <div className="result-icon">{good ? '✅' : d.tier === 'ok' ? '🤔' : '⚠️'}</div>
          <h2>{good ? '¡Gran decisión!' : d.tier === 'ok' ? 'Funciona… pero no es la mejor' : 'Esa opción no funciona'}</h2>
          <p className="result-opt">
            {d.option.emoji} {d.option.label}
          </p>
          <p>{d.why}</p>
          <Effects effects={d.effects} />
          {good ? (
            <p className="result-next">Ahora hay que ponerlo en marcha: {MISSION_WORLD[d.missionId].game.emoji} {MISSION_WORLD[d.missionId].game.name}.</p>
          ) : (
            <p className="result-next">La marqué con ❌. Revisa los datos de los especialistas y elige otra.</p>
          )}
        </div>
      );
    }
    case 'mgIntro': {
      const w = MISSION_WORLD[d.missionId];
      return (
        <div className="dlg-mg">
          <MissionPatch id={d.missionId} size={110} />
          <div>
            <span className="eyebrow">Reparación · {w.place}</span>
            <h2>
              {w.game.emoji} {w.game.name}
            </h2>
            <p>{w.game.howTo}</p>
            <p className="science">🔬 {w.game.science}</p>
          </div>
        </div>
      );
    }
    case 'debrief': {
      const m = MISSIONS[d.missionId];
      const b = BUILDINGS[m.unlock];
      return (
        <div className="dlg-debrief">
          <Confetti count={50} />
          <div className="debrief-head">
            <MissionPatch id={d.missionId} size={120} />
            <div>
              <span className="eyebrow">{m.code} · Misión cumplida</span>
              <h2>{m.titleEs}</h2>
              <div className="debrief-stars">
                <Stars value={d.stars} />
                <span>
                  Decisión {'★'.repeat(d.decisionStars)} · Reparación {'★'.repeat(d.gameStars)} · +{d.xp} XP
                </span>
              </div>
              <p className="debrief-unlock">
                Nuevo edificio: <b>{b.emoji} {b.name}</b> — {b.desc}
              </p>
            </div>
          </div>
          <h3>Lo que aprendiste</h3>
          <ul>
            {m.debrief.learnings.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <p className="nasa">🚀 <b>Dato NASA:</b> {m.debrief.nasaFact}</p>
          <p className="reflect">💭 {m.debrief.reflection}</p>
          <p className="teaser">{m.debrief.teaser}</p>
        </div>
      );
    }
    case 'discovery': {
      const info = DISCOVERIES[d.id];
      return (
        <div className="dlg-discovery">
          <div className="option-big">{info.emoji}</div>
          <span className="eyebrow">Descubrimiento · +50 XP</span>
          <h2>{info.label}</h2>
          <p>{info.text}</p>
        </div>
      );
    }
  }
}
