import { useEffect, useRef, useState } from 'react';
import { Game } from './game/engine';
import { useUi } from './game/store';
import { loadSave } from './game/save';
import { IXOrb } from './components/art';
import { TitleScreen } from './ui/Title';
import { Hud } from './ui/Hud';
import { DialogLayer } from './ui/Dialogs';

export function App() {
  const host = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState<string | null>(null);
  const screen = useUi((s) => s.screen);
  const ready = useUi((s) => s.ready);

  useEffect(() => {
    if (!host.current) return;
    let g: Game | null = null;
    try {
      g = new Game(host.current);
      g.start();
      setGame(g);
      if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = g;
      let auto = false;
      try {
        auto = sessionStorage.getItem('ixchel3d.autostart') === '1';
        sessionStorage.removeItem('ixchel3d.autostart');
      } catch {
        /* nada */
      }
      const saved = auto ? loadSave() : null;
      if (saved) g.begin(saved);
    } catch (e) {
      console.error(e);
      setError('Tu navegador no pudo iniciar los gráficos 3D (WebGL). Prueba con Chrome, Edge, Firefox o Safari actualizados.');
    }
    return () => g?.dispose();
  }, []);

  return (
    <div className="app">
      <div ref={host} className="game-host" />
      {error && (
        <div className="boot">
          <IXOrb size={110} mood="alert" />
          <p>{error}</p>
        </div>
      )}
      {!error && !ready && (
        <div className="boot">
          <IXOrb size={120} mood="talk" />
          <p className="eyebrow">Encendiendo la colonia…</p>
        </div>
      )}
      {game && ready && screen === 'title' && <TitleScreen game={game} />}
      {game && screen === 'game' && <Hud game={game} />}
      {game && <DialogLayer game={game} />}
    </div>
  );
}
