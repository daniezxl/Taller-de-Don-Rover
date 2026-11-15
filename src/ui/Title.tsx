// Pantalla de inicio: continuar la partida o crear un astronauta nuevo.

import { useState, type CSSProperties } from 'react';
import { ACCESSORIES, DIFFICULTIES, HELMETS, MISSION_ORDER, MISSIONS, SUIT_COLORS, SUIT_NAMES, VISOR_NAMES, VISORS } from '../../shared/content';
import type { AvatarConfig, Difficulty } from '../../shared/types';
import { Astronaut } from '../components/art';
import { Icon, Logo } from '../components/ui';
import type { Game } from '../game/engine';
import { clearSave, loadSave, newSave, randomAvatar, writeSave } from '../game/save';
import { primeAudio, sfx } from '../lib/sound';

export function TitleScreen({ game }: { game: Game }) {
  const existing = loadSave();
  const [mode, setMode] = useState<'home' | 'new'>(existing ? 'home' : 'new');
  const [name, setName] = useState(existing?.name ?? '');
  const [avatar, setAvatar] = useState<AvatarConfig>(existing?.avatar ?? randomAvatar());
  const [difficulty, setDifficulty] = useState<Difficulty>(existing?.difficulty ?? 'cadet');

  const done = existing ? MISSION_ORDER.filter((m) => existing.missions[m]).length : 0;

  const go = () => {
    primeAudio();
    sfx.join();
    const save = newSave(name.trim().slice(0, 16) || 'Astronauta', avatar, difficulty);
    clearSave();
    if (game.save) {
      // Ya había una partida en este mundo: recargar para empezar con la colonia limpia
      writeSave(save);
      try {
        sessionStorage.setItem('ixchel3d.autostart', '1');
      } catch {
        /* nada */
      }
      window.location.reload();
      return;
    }
    game.begin(save);
  };

  const cont = () => {
    if (!existing) return;
    primeAudio();
    sfx.join();
    game.begin(existing);
  };

  const cycle = (key: keyof AvatarConfig, len: number, dir = 1) => {
    sfx.select();
    setAvatar((a) => ({ ...a, [key]: (a[key] + dir + len) % len }));
  };

  return (
    <div className="title-screen">
      <div className="title-card">
        <Logo size="lg" />
        <p className="title-tag">Una colonia en Marte con seis problemas al mismo tiempo. Explórala en 3D, habla con los especialistas, decide con datos y repara todo con tus manos.</p>

        {mode === 'home' && existing && (
          <div className="title-home">
            <div className="title-save">
              <Astronaut avatar={existing.avatar} size={96} pose="wave" />
              <div>
                <b>{existing.name}</b>
                <span>
                  {DIFFICULTIES[existing.difficulty].label} · {done}/6 misiones · Sol {existing.sol}
                </span>
                <div className="title-patches">
                  {MISSION_ORDER.map((m) => (
                    <span key={m} className={existing.missions[m] ? 'on' : ''} title={MISSIONS[m].titleEs}>
                      {MISSIONS[m].emoji}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button className="btn huge block" onClick={cont}>
              <Icon name="play" /> Continuar
            </button>
            <button className="btn ghost block" onClick={() => setMode('new')}>
              <Icon name="plus" /> Nueva partida
            </button>
          </div>
        )}

        {mode === 'new' && (
          <div className="title-new">
            <div className="builder">
              <div className="builder-preview">
                <Astronaut avatar={avatar} size={150} pose="wave" />
                <button className="btn small ghost" onClick={() => setAvatar(randomAvatar())}>
                  <Icon name="dice" size={18} /> Al azar
                </button>
              </div>
              <div className="builder-opts">
                <Picker label="Traje" value={SUIT_NAMES[avatar.suit]} onPrev={() => cycle('suit', SUIT_COLORS.length, -1)} onNext={() => cycle('suit', SUIT_COLORS.length)} swatch={SUIT_COLORS[avatar.suit]} />
                <Picker label="Casco" value={HELMETS[avatar.helmet]} onPrev={() => cycle('helmet', HELMETS.length, -1)} onNext={() => cycle('helmet', HELMETS.length)} />
                <Picker label="Visor" value={VISOR_NAMES[avatar.visor]} onPrev={() => cycle('visor', VISORS.length, -1)} onNext={() => cycle('visor', VISORS.length)} swatch={VISORS[avatar.visor]} />
                <Picker label="Accesorio" value={ACCESSORIES[avatar.accessory]} onPrev={() => cycle('accessory', ACCESSORIES.length, -1)} onNext={() => cycle('accessory', ACCESSORIES.length)} />
              </div>
            </div>
            <label className="field">
              <span className="label">Tu nombre de astronauta</span>
              <input className="input dark" value={name} maxLength={16} placeholder="Ej. Itzel" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} />
            </label>
            <div className="field">
              <span className="label">Dificultad</span>
              <div className="diff-row">
                {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => (
                  <button key={d} className={`diff ${difficulty === d ? 'on' : ''}`} onClick={() => setDifficulty(d)}>
                    <b>{DIFFICULTIES[d].label}</b>
                    <span>{DIFFICULTIES[d].age}</span>
                    <small>{DIFFICULTIES[d].desc}</small>
                  </button>
                ))}
              </div>
            </div>
            {existing && <p className="title-warn">Empezar una partida nueva reemplaza la que tienes guardada.</p>}
            <div className="title-actions">
              {existing && (
                <button className="btn ghost" onClick={() => setMode('home')}>
                  <Icon name="back" /> Volver
                </button>
              )}
              <button className="btn huge" onClick={go}>
                🚀 ¡Despegar!
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="title-foot">Datos científicos basados en publicaciones de la NASA · Los valores de la colonia son de juego · Funciona sin conexión</p>
    </div>
  );
}

function Picker({ label, value, onPrev, onNext, swatch }: { label: string; value: string; onPrev: () => void; onNext: () => void; swatch?: string }) {
  return (
    <div className="picker">
      <span className="label">{label}</span>
      <div className="picker-row">
        <button className="icon-btn" onClick={onPrev} aria-label={`${label} anterior`}>
          <Icon name="back" size={18} />
        </button>
        <span className="picker-val">
          {swatch && <i style={{ '--sw': swatch } as CSSProperties} />}
          {value}
        </span>
        <button className="icon-btn" onClick={onNext} aria-label={`${label} siguiente`}>
          <Icon name="arrow" size={18} />
        </button>
      </div>
    </div>
  );
}
