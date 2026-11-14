// Aplicación del profesor: crea la sala, arranca el motor del juego en este navegador y
// abre el canal WebRTC para que los celulares se unan.

import { useCallback, useEffect, useRef, useState } from 'react';
import { HostEngine, clearSnapshot, loadSnapshot, makeRoomCode } from '../../engine/room';
import { loadSettings } from '../../engine/settings';
import { getColony, newColony, saveColony } from '../../engine/store';
import { HostNet, type NetStatus } from '../../net/hostNet';
import type { Ack, Difficulty, HostAction, HostView, Pace } from '../../../shared/types';
import { Console } from './Console';
import { Setup } from './Setup';

export function HostApp() {
  const [engine, setEngine] = useState<HostEngine | null>(null);
  const [view, setView] = useState<HostView | null>(null);
  const [net, setNet] = useState<NetStatus>({ state: 'starting', detail: 'Abriendo la colonia…', peers: 0 });
  const [snapshot, setSnapshot] = useState(() => loadSnapshot());
  const engineRef = useRef<HostEngine | null>(null);
  const netRef = useRef<HostNet | null>(null);

  const launch = useCallback((e: HostEngine) => {
    engineRef.current = e;
    e.start();
    e.subscribe(() => setView(e.hostView()));
    const n = new HostNet(
      e,
      loadSettings().signaling,
      (s) => setNet({ ...s }),
      () => setNet({ state: 'offline', detail: 'Ese código de sala está ocupado. Sal y crea una sala nueva.', peers: 0 }),
    );
    n.start();
    netRef.current = n;
    setEngine(e);
    setView(e.hostView());
  }, []);

  useEffect(
    () => () => {
      netRef.current?.stop();
      engineRef.current?.stop();
    },
    [],
  );

  const create = (opts: { className: string; difficulty: Difficulty; pace: Pace; colonyId: string | null }) => {
    const colony = (opts.colonyId && getColony(opts.colonyId)) || newColony(opts.className);
    saveColony(colony);
    launch(new HostEngine({ code: makeRoomCode(), className: opts.className.trim() || colony.name, difficulty: opts.difficulty, pace: opts.pace, colony }));
  };

  const act = useCallback((a: HostAction): Ack => engineRef.current?.hostAction(a) ?? { ok: false, error: 'No hay una sala abierta.' }, []);

  const exit = () => {
    netRef.current?.stop();
    engineRef.current?.stop();
    clearSnapshot();
    engineRef.current = null;
    netRef.current = null;
    setEngine(null);
    setView(null);
    setSnapshot(null);
  };

  if (!engine || !view) {
    return (
      <Setup
        snapshot={snapshot}
        onCreate={create}
        onResume={() => snapshot && launch(HostEngine.restore(snapshot))}
        onDiscard={() => {
          clearSnapshot();
          setSnapshot(null);
        }}
      />
    );
  }
  return <Console view={view} net={net} act={act} onExit={exit} />;
}
