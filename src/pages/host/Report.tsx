// Reporte del profesor: participación y aprendizaje por alumno y por tripulación.

import { BADGES, MISSIONS, ROLES } from '../../../shared/content';
import type { HostView } from '../../../shared/types';
import { Icon, Modal } from '../../components/ui';
import { TIER_LABEL } from './stages';

function download(name: string, text: string) {
  const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function Report({ open, onClose, view }: { open: boolean; onClose: () => void; view: HostView }) {
  const crewName = (id: string | null) => view.crews.find((c) => c.id === id)?.name ?? '—';
  const students = view.players.filter((p) => !p.isBot);
  const rows = (students.length ? students : view.players).map((p) => {
    const pr = view.progress[p.id];
    return {
      p,
      pr,
      crew: crewName(p.crewId),
      roles: p.roles.map((r) => ROLES[r].name).join(' + ') || '—',
    };
  });

  const csv = () => {
    const head = ['Nombre', 'Tripulación', 'Rol', 'Transmisión', 'Votó', 'Acciones en emergencia', 'Bonus', 'XP de la sesión', 'Insignias'];
    const lines = rows.map(({ p, pr, crew, roles }) =>
      [
        p.name,
        crew,
        roles,
        pr?.decoded ? (pr.correct ? 'Correcta' : 'Incorrecta') : 'Sin responder',
        pr?.voted ? 'Sí' : 'No',
        String(pr?.taps ?? 0),
        pr?.bonus === null || pr?.bonus === undefined ? '—' : pr.bonus ? 'Correcta' : 'Incorrecta',
        String(pr?.sessionXp ?? 0),
        (pr?.badges ?? []).map((b) => BADGES[b].name).join(' / '),
      ]
        .map((x) => `"${x.replace(/"/g, '""')}"`)
        .join(','),
    );
    download(`ixchel-${view.code}-${new Date().toISOString().slice(0, 10)}.csv`, [head.join(','), ...lines].join('\n'));
  };

  return (
    <Modal open={open} onClose={onClose} title="Reporte del profesor" wide>
      <div className="report">
        <div className="report-top">
          <span className="chip dark">
            {view.className} · {view.mission ? MISSIONS[view.mission.id].title : 'Sin misión activa'}
          </span>
          <span className="chip dark">
            Transmisiones: {view.stats.quizCorrect}/{view.stats.quizAnswered} correctas
          </span>
          <span className="chip dark">Votos: {view.stats.votes}</span>
          <button className="btn small water" onClick={csv}>
            <Icon name="download" size={16} /> Descargar CSV
          </button>
        </div>

        {view.crews.some((c) => c.outcome) && (
          <>
            <h3>Tripulaciones</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tripulación</th>
                    <th>Decisión</th>
                    <th>Resultado</th>
                    <th>Eficiencia</th>
                    <th>Cooperación</th>
                    <th>Creatividad</th>
                    <th>Bitácora</th>
                  </tr>
                </thead>
                <tbody>
                  {view.crews.map((c) =>
                    c.outcome ? (
                      <tr key={c.id}>
                        <td>
                          <b>{c.name}</b>
                        </td>
                        <td>
                          {c.outcome.optionEmoji} {c.outcome.optionLabel}
                        </td>
                        <td>
                          {TIER_LABEL[c.outcome.tier].emoji} {TIER_LABEL[c.outcome.tier].label}
                        </td>
                        <td>{c.outcome.scores.efficiency}</td>
                        <td>{c.outcome.scores.cooperation}</td>
                        <td>{c.outcome.scores.creativity}</td>
                        <td className="wrap">{c.status.log ?? '—'}</td>
                      </tr>
                    ) : null,
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        <h3>Alumnos</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tripulación</th>
                <th>Rol</th>
                <th>Transmisión</th>
                <th>Votó</th>
                <th>Acciones</th>
                <th>XP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, pr, crew, roles }) => (
                <tr key={p.id} className={p.connected ? '' : 'off'}>
                  <td>
                    <b>{p.name}</b>
                    {p.isBot ? ' 🤖' : ''}
                  </td>
                  <td>{crew}</td>
                  <td>{roles}</td>
                  <td>{pr?.decoded ? (pr.correct ? '✅' : '↺') : '—'}</td>
                  <td>{pr?.voted ? '🗳️' : '—'}</td>
                  <td>{pr?.taps ?? 0}</td>
                  <td>{pr?.sessionXp ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="fine">Los datos viven solo en este navegador mientras la sala está abierta. No se envían a ningún servidor.</p>
      </div>
    </Modal>
  );
}
