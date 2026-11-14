// Generadores de rompecabezas cooperativos.
//
// Regla de diseño: NADIE tiene toda la información. Cada especialidad recibe un dato
// distinto y ese dato es imprescindible para encontrar la mejor decisión. Los números
// cambian por tripulación (semilla distinta), así que copiar a otro equipo no sirve.

import { ROLES, ROLE_ORDER } from './content';
import { makeRng, pick, randInt, randStep, shuffle, type Rng } from './rng';
import type {
  Difficulty,
  IntelCard,
  IntelLine,
  Meters,
  MissionId,
  Puzzle,
  PuzzleOption,
  PuzzleOptionResult,
  RoleId,
  Tier,
} from './types';

interface PoolOption {
  id: string;
  emoji: string;
  label: string;
  detail: string;
  fixed?: Record<string, number>;
}

interface ElimAttr {
  role: RoleId;
  key: string;
  label: string;
  unit: string;
  totalUnit?: string;
  dir: 'max' | 'min';
  limitLabel: string;
  limitText?: string;
  range: [number, number];
  step?: number;
  rate?: boolean;
  fixedLimit?: number;
  signed?: boolean;
  intro: string;
  tip: string;
  fail: { tier: Tier; effects: Partial<Meters>; why: string };
}

interface ElimConfig {
  title: string;
  question: string;
  pool: PoolOption[];
  attrs: ElimAttr[];
  best: { effects: Partial<Meters>; why: string };
  details?: Partial<Record<RoleId | 'best', string[]>>;
}

const fill = (tpl: string, map: Record<string, string>) => tpl.replace(/\{(\w+)\}/g, (_, k) => map[k] ?? '');

function fmt(n: number, signed?: boolean): string {
  if (!signed) return String(n);
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${Math.abs(n)}`;
  return '0';
}

/* ------------------------------------------------------------------ */
/* Tipo 1 · Eliminación: cada rol descarta exactamente una opción        */
/* ------------------------------------------------------------------ */

function genElimination(cfg: ElimConfig, difficulty: Difficulty, rng: Rng): Puzzle {
  const gapMul = difficulty === 'explorer' ? 3 : difficulty === 'cadet' ? 2 : 1;
  const sols = difficulty === 'commander' ? randInt(rng, 3, 5) : 1;

  for (let attempt = 0; attempt < 500; attempt++) {
    const chosen = shuffle(rng, cfg.pool).slice(0, 5);
    const survivor = chosen[0];
    const roles = shuffle(rng, ROLE_ORDER);
    const violatorByRole = {} as Record<RoleId, PoolOption>;
    let valid = true;
    chosen.slice(1).forEach((o, i) => {
      const role = roles[i];
      const attr = cfg.attrs.find((a) => a.role === role)!;
      if (o.fixed && attr.key in o.fixed) valid = false; // un valor fijo siempre es "bueno"
      violatorByRole[role] = o;
    });
    if (!valid) continue;

    const values: Record<string, Record<string, number>> = {};
    for (const o of chosen) values[o.id] = {};
    const limits: Record<string, number> = {};

    for (const a of cfg.attrs) {
      const st = a.step ?? 1;
      const gap = gapMul * st;
      const [lo, hi] = a.range;
      const L =
        a.fixedLimit !== undefined
          ? a.fixedLimit
          : a.dir === 'max'
            ? randStep(rng, lo + 2 * st, hi - gap - st, st)
            : randStep(rng, lo + gap + st, hi - 2 * st, st);
      limits[a.key] = L;
      for (const o of chosen) {
        const fixed = o.fixed?.[a.key];
        if (fixed !== undefined) {
          values[o.id][a.key] = fixed;
          continue;
        }
        if (o === violatorByRole[a.role]) {
          values[o.id][a.key] =
            a.dir === 'max'
              ? randStep(rng, L + gap, Math.min(hi, L + gap + 3 * st), st)
              : randStep(rng, Math.max(lo, L - gap - 3 * st), L - gap, st);
        } else {
          values[o.id][a.key] =
            a.dir === 'max'
              ? randStep(rng, Math.max(lo, L - 6 * st), L - st, st)
              : randStep(rng, L + st, Math.min(hi, L + 6 * st), st);
        }
      }
    }

    // Validación estricta: el sobreviviente cumple todo; cada otra opción falla solo "su" condición.
    const passes = (a: ElimAttr, v: number) => (a.dir === 'max' ? v <= limits[a.key] : v >= limits[a.key]);
    let consistent = true;
    for (const o of chosen) {
      for (const a of cfg.attrs) {
        const shouldFail = violatorByRole[a.role] === o;
        if (passes(a, values[o.id][a.key]) === shouldFail) consistent = false;
      }
    }
    if (!consistent) continue;

    // Textos (en dificultad Comandante, los recursos por sol se comparan contra un total).
    const limitText = (a: ElimAttr) => {
      if (a.limitText) return a.limitText;
      const L = limits[a.key];
      if (a.rate && sols > 1) return `${L * sols} ${a.totalUnit ?? a.unit}`;
      return `${fmt(L, a.signed)} ${a.unit}`;
    };
    const limitLabel = (a: ElimAttr) => (a.rate && sols > 1 ? `${a.limitLabel} (total para ${sols} sols)` : a.limitLabel);
    const valueText = (a: ElimAttr, v: number) => `${fmt(v, a.signed)} ${a.unit}`;
    const whyValue = (a: ElimAttr, v: number) =>
      a.rate && sols > 1 ? `${v} ${a.unit} × ${sols} sols = ${v * sols} ${a.totalUnit ?? a.unit}` : valueText(a, v);

    const display = shuffle(rng, chosen);
    const options: PuzzleOption[] = display.map((o) => {
      let detail = o.detail;
      if (cfg.details) {
        const violRole = (Object.keys(violatorByRole) as RoleId[]).find((r) => violatorByRole[r] === o);
        detail = pick(rng, cfg.details[violRole ?? 'best'] ?? [o.detail]);
      }
      return { id: o.id, emoji: o.emoji, label: o.label, detail };
    });

    const intel = {} as Record<RoleId, IntelCard>;
    for (const a of cfg.attrs) {
      const lines: IntelLine[] = [{ label: limitLabel(a), value: limitText(a), strong: true }];
      for (const o of display) lines.push({ emoji: o.emoji, label: o.label, value: valueText(a, values[o.id][a.key]) });
      intel[a.role] = {
        role: a.role,
        title: a.label,
        intro: a.intro,
        lines,
        tip: fill(a.tip, { L: limitText(a) }),
      };
    }

    const results: Record<string, PuzzleOptionResult> = {};
    results[survivor.id] = { tier: 'best', effects: cfg.best.effects, why: fill(cfg.best.why, { opt: survivor.label }) };
    for (const a of cfg.attrs) {
      const o = violatorByRole[a.role];
      results[o.id] = {
        tier: a.fail.tier,
        effects: a.fail.effects,
        why: fill(a.fail.why, { opt: o.label, v: whyValue(a, values[o.id][a.key]), L: limitText(a) }),
      };
    }

    const hintAttr = pick(rng, cfg.attrs);
    return {
      kind: 'elimination',
      title: cfg.title,
      question: cfg.question,
      intel,
      options,
      results,
      bestId: survivor.id,
      hints: [
        'Cada especialidad puede descartar una opción con su dato. ¡Díganlo en voz alta y descarten juntos!',
        `Empiecen con ${ROLES[hintAttr.role].name}: ${hintAttr.limitLabel.toLowerCase()} es ${limitText(hintAttr)}. ¿Qué opción no cumple?`,
      ],
      solution: `${survivor.emoji} ${survivor.label} era la única opción que cumplía las cuatro condiciones.`,
    };
  }
  throw new Error('No se pudo generar el rompecabezas de eliminación');
}

const GREENHOUSE: ElimConfig = {
  title: 'Rescate de cultivos',
  question: '¿Qué cultivo debe rescatar su tripulación?',
  pool: [
    { id: 'lechuga', emoji: '🥬', label: 'Lechuga', detail: 'Crece rápido. Ya se cultivó en la Estación Espacial.' },
    { id: 'papa', emoji: '🥔', label: 'Papa', detail: 'Mucha energía en cada planta.' },
    { id: 'frijol', emoji: '🫘', label: 'Frijol', detail: 'Proteína y además enriquece el suelo.' },
    { id: 'tomate', emoji: '🍅', label: 'Tomate enano', detail: 'Variedad pequeña para espacios reducidos.' },
    { id: 'chile', emoji: '🌶️', label: 'Chile', detail: 'Ya se cosechó en órbita en 2021.' },
    { id: 'fresa', emoji: '🍓', label: 'Fresa', detail: 'Vitaminas y mucho ánimo para la tripulación.' },
    { id: 'trigo', emoji: '🌾', label: 'Trigo enano', detail: 'Para hacer pan en Marte.' },
  ],
  attrs: [
    {
      role: 'power', key: 'luz', label: 'Luz LED que necesita cada cultivo', unit: '⚡/sol', totalUnit: '⚡', dir: 'max',
      limitLabel: 'Energía para las luces del invernadero', range: [3, 16], rate: true,
      intro: 'Tu medidor calcula cuánta energía quedará para las luces durante la tormenta.',
      tip: 'Descarta el cultivo que necesita más luz de la que hay ({L}).',
      fail: { tier: 'bad', effects: { energy: -9, food: 4 }, why: '{opt} necesitaba {v} de luz y solo había {L}: las luces vaciaron la batería del sector.' },
    },
    {
      role: 'life', key: 'agua', label: 'Agua que necesita cada cultivo', unit: 'L/sol', totalUnit: 'L', dir: 'max',
      limitLabel: 'Agua disponible para el riego', range: [2, 14], rate: true,
      intro: 'Revisaste las reservas: esta es el agua que se puede usar para regar.',
      tip: 'Descarta el cultivo que bebe más agua de la que hay ({L}).',
      fail: { tier: 'bad', effects: { water: -9, food: 4 }, why: '{opt} necesitaba {v} de agua y solo había {L}: hubo que tomar agua de la reserva de la colonia.' },
    },
    {
      role: 'habitat', key: 'temp', label: 'Temperatura mínima que soporta cada cultivo', unit: '°C', dir: 'max',
      limitLabel: 'Temperatura que mantendrá el invernadero', range: [4, 24],
      intro: 'Calculaste cuánto calor conservará la estructura del invernadero durante la tormenta.',
      tip: 'Descarta el cultivo que necesita más calor del que habrá ({L}).',
      fail: { tier: 'bad', effects: { food: -6, habitat: -3 }, why: '{opt} necesitaba al menos {v} y el invernadero solo llegó a {L}: las plantas se congelaron.' },
    },
    {
      role: 'bio', key: 'cosecha', label: 'Tiempo hasta la cosecha', unit: 'sols', dir: 'max',
      limitLabel: 'La comida de reserva alcanza para', range: [20, 95], step: 5,
      intro: 'Conoces cada cultivo: sabes cuántos sols tarda en estar listo para comer.',
      tip: 'Descarta el cultivo que tarda más de lo que dura la reserva ({L}).',
      fail: { tier: 'ok', effects: { food: 3 }, why: '{opt} tarda {v} en cosecharse y la reserva solo duraba {L}: la comida llegó tarde.' },
    },
  ],
  best: { effects: { food: 14, habitat: 2 }, why: '{opt} cumplía las cuatro condiciones: luz, agua, temperatura y tiempo. ¡Cosecha asegurada!' },
};

const WATER: ElimConfig = {
  title: 'Nueva fuente de agua',
  question: '¿Qué fuente de agua debe usar su sector?',
  pool: [
    { id: 'korolev', emoji: '🧊', label: 'Cráter Korolev', detail: 'Un cráter lleno de hielo.' },
    { id: 'arcadia', emoji: '🏔️', label: 'Glaciar de Arcadia', detail: 'Hielo enterrado bajo el polvo.' },
    { id: 'polo', emoji: '❄️', label: 'Casquete polar', detail: 'La mayor reserva de hielo a la vista.' },
    { id: 'jezero', emoji: '🪨', label: 'Arcillas de Jezero', detail: 'Minerales que guardan agua en su interior.' },
    { id: 'humedad', emoji: '🌫️', label: 'Recicladora de humedad', detail: 'Recupera el vapor del aire de la base.', fixed: { distancia: 0, sales: 1 } },
    { id: 'orina', emoji: '♻️', label: 'Recicladora de orina', detail: '¡Como en la Estación Espacial!', fixed: { distancia: 0, sales: 1 } },
  ],
  attrs: [
    {
      role: 'power', key: 'energia', label: 'Energía para extraer y limpiar el agua', unit: '⚡/sol', totalUnit: '⚡', dir: 'max',
      limitLabel: 'Energía libre para el agua', range: [3, 16], rate: true,
      intro: 'Calculaste cuánta energía puede prestar la colonia para conseguir agua.',
      tip: 'Descarta la fuente que gasta más energía de la que hay ({L}).',
      fail: { tier: 'bad', effects: { energy: -9, water: 5 }, why: '{opt} necesitaba {v} y solo había {L}: la colonia se quedó sin energía para otras cosas.' },
    },
    {
      role: 'life', key: 'litros', label: 'Agua que produce cada fuente', unit: 'L/sol', totalUnit: 'L', dir: 'min',
      limitLabel: 'La colonia necesita al menos', range: [10, 60], step: 2, rate: true,
      intro: 'Sabes cuánta agua consume la colonia entre bebida, higiene y cultivos.',
      tip: 'Descarta la fuente que da menos agua de la necesaria ({L}).',
      fail: { tier: 'ok', effects: { water: 4 }, why: '{opt} solo daba {v} y la colonia necesitaba {L}: hubo que racionar.' },
    },
    {
      role: 'habitat', key: 'distancia', label: 'Distancia desde la base', unit: 'km', dir: 'max',
      limitLabel: 'Distancia segura para el rover', range: [2, 30],
      intro: 'Revisaste el mapa y la seguridad de los caminos para el rover de carga.',
      tip: 'Descarta la fuente que está más lejos de lo seguro ({L}).',
      fail: { tier: 'bad', effects: { habitat: -7, water: 2 }, why: '{opt} estaba a {v} y el rover solo podía viajar {L} con seguridad: se quedó atascado.' },
    },
    {
      role: 'bio', key: 'sales', label: 'Sales tóxicas (percloratos)', unit: 'nivel', dir: 'max',
      limitLabel: 'Los filtros limpian hasta el nivel', range: [1, 10],
      intro: 'Analizaste muestras: el suelo marciano tiene sales que dañan a personas y plantas.',
      tip: 'Descarta la fuente con más sales de las que pueden limpiar los filtros ({L}).',
      fail: { tier: 'bad', effects: { food: -8, water: 4 }, why: 'El agua de {opt} tenía {v} de percloratos y los filtros solo limpian hasta {L}: los cultivos se dañaron.' },
    },
  ],
  best: { effects: { water: 14, food: 2 }, why: '{opt} daba suficiente agua, limpia, cerca y con la energía disponible. ¡Reserva recuperada!' },
};

const HABITAT: ElimConfig = {
  title: 'Diseño del nuevo módulo',
  question: '¿Qué diseño de módulo debe construir su tripulación?',
  pool: [
    { id: 'domo', emoji: '🔮', label: 'Domo geodésico', detail: 'Triángulos que reparten la presión.' },
    { id: 'inflable', emoji: '🎈', label: 'Cilindro inflable', detail: 'Ligero de transportar; se infla al llegar.' },
    { id: 'impreso', emoji: '🖨️', label: 'Módulo impreso en 3D', detail: 'Paredes de regolito impresas en el lugar.' },
    { id: 'lava', emoji: '🕳️', label: 'Base en tubo de lava', detail: 'Bajo tierra, dentro de un túnel natural.' },
    { id: 'hielo', emoji: '🧊', label: 'Casa de hielo', detail: 'Paredes de hielo que dejan pasar la luz.' },
    { id: 'torre', emoji: '🗼', label: 'Torre vertical', detail: 'Ocupa poco terreno y crece hacia arriba.' },
  ],
  attrs: [
    {
      role: 'habitat', key: 'area', label: 'Terreno que ocupa cada diseño', unit: 'm²', dir: 'max',
      limitLabel: 'Terreno estable disponible', range: [40, 220], step: 10,
      intro: 'Mediste el terreno firme donde se puede construir sin riesgo.',
      tip: 'Descarta el diseño que no cabe en el terreno ({L}).',
      fail: { tier: 'bad', effects: { habitat: -8 }, why: '{opt} ocupaba {v} y solo había {L} de terreno estable: hubo que construir en suelo inestable.' },
    },
    {
      role: 'power', key: 'energia', label: 'Energía para calefacción y aire', unit: '⚡/sol', totalUnit: '⚡', dir: 'max',
      limitLabel: 'Energía disponible para el módulo', range: [4, 18], rate: true,
      intro: 'Calculaste cuánta energía puede darle la colonia al nuevo módulo.',
      tip: 'Descarta el diseño que gasta más energía de la que hay ({L}).',
      fail: { tier: 'bad', effects: { energy: -9, habitat: 4 }, why: '{opt} necesitaba {v} y solo había {L}: el módulo dejó sin energía a otros sistemas.' },
    },
    {
      role: 'life', key: 'capacidad', label: 'Personas que puede alojar', unit: 'personas', dir: 'min',
      limitLabel: 'Nuevos colonos que llegan', range: [4, 20],
      intro: 'Tienes la lista de pasajeros de la nave que está por aterrizar.',
      tip: 'Descarta el diseño donde no caben todos ({L}).',
      fail: { tier: 'ok', effects: { habitat: 5 }, why: '{opt} aloja {v} y llegaron {L}: algunos colonos siguen durmiendo en la nave.' },
    },
    {
      role: 'bio', key: 'blindaje', label: 'Protección contra la radiación', unit: 'nivel', dir: 'min',
      limitLabel: 'Protección mínima para personas y plantas', range: [1, 10],
      intro: 'Sabes cuánta protección necesitan los seres vivos frente a la radiación de Marte.',
      tip: 'Descarta el diseño que protege menos de lo necesario ({L}).',
      fail: { tier: 'bad', effects: { habitat: -6, food: -3 }, why: '{opt} tenía protección {v} y se necesitaba al menos {L}: hubo que reforzarlo de emergencia.' },
    },
  ],
  best: { effects: { habitat: 14, energy: 2 }, why: '{opt} cabía en el terreno, usaba poca energía, alojaba a todos y protegía de la radiación. ¡Bienvenidos, colonos!' },
};

const balanceAttr = (role: RoleId, key: string, label: string, unit: string, effects: Partial<Meters>, what: string): ElimAttr => ({
  role,
  key,
  label,
  unit,
  dir: 'min',
  limitLabel: 'Para sobrevivir 10 sols, el balance debe ser',
  limitText: '0 o más',
  range: [-7, 9],
  fixedLimit: 0,
  signed: true,
  intro: `Simulaste los 10 sols con cada plan: este es el balance de ${what}.`,
  tip: 'Descarta el plan que deja tu sistema en negativo.',
  fail: { tier: 'bad', effects, why: `Con {opt} el balance de ${what} quedaba en {v}: la colonia gastaba más de lo que producía.` },
});

const FINAL: ElimConfig = {
  title: 'Plan de 10 sols',
  question: '¿Qué plan mantiene a la colonia en equilibrio?',
  pool: [
    { id: 'quetzal', emoji: '🦜', label: 'Plan Quetzal', detail: '' },
    { id: 'jaguar', emoji: '🐆', label: 'Plan Jaguar', detail: '' },
    { id: 'colibri', emoji: '🐦', label: 'Plan Colibrí', detail: '' },
    { id: 'ceiba', emoji: '🌳', label: 'Plan Ceiba', detail: '' },
    { id: 'obsidiana', emoji: '🔷', label: 'Plan Obsidiana', detail: '' },
    { id: 'ajolote', emoji: '🦎', label: 'Plan Ajolote', detail: '' },
  ],
  attrs: [
    balanceAttr('power', 'energia', 'Balance de energía con cada plan', '⚡', { energy: -10 }, 'energía'),
    balanceAttr('life', 'agua', 'Balance de agua y oxígeno con cada plan', '💧', { water: -10 }, 'agua y oxígeno'),
    balanceAttr('bio', 'comida', 'Balance de alimentos con cada plan', '🌱', { food: -10 }, 'alimentos'),
    balanceAttr('habitat', 'proteccion', 'Balance de protección con cada plan', '🛡️', { habitat: -10 }, 'protección'),
  ],
  best: { effects: { energy: 6, water: 6, food: 6, habitat: 6 }, why: '{opt} dejaba los cuatro sistemas en positivo. ¡La colonia es autosuficiente!' },
  details: {
    power: ['Enciende luces extra día y noche para cosechar el doble.', 'Pone a trabajar todas las impresoras 3D sin descanso.'],
    life: ['Riega todos los cultivos al máximo para que crezcan más rápido.', 'Usa agua extra para enfriar las máquinas.'],
    bio: ['Convierte un invernadero en taller de robots.', 'Cambia los cultivos por baterías extra.'],
    habitat: ['Quita blindaje de los refugios para fabricar más paneles.', 'Usa el regolito de los muros para construir una pista.'],
    best: ['Instala espejos que llevan la luz del Sol a los cultivos.', 'Recicla el agua de los cultivos y apaga máquinas de noche.'],
  },
};

/* ------------------------------------------------------------------ */
/* Tipo 2 · Presupuesto: sumar consumos y compararlos con la producción  */
/* ------------------------------------------------------------------ */

function genBudget(difficulty: Difficulty, rng: Rng): Puzzle {
  const sols = difficulty === 'commander' ? randInt(rng, 3, 5) : 1;
  const small = difficulty === 'explorer';
  for (let attempt = 0; attempt < 500; attempt++) {
    const life = small ? randInt(rng, 3, 6) : randInt(rng, 8, 14);
    const bioN = small ? randInt(rng, 5, 8) : randInt(rng, 9, 16);
    const habN = small ? randInt(rng, 5, 8) : randInt(rng, 9, 16);
    const bioS = small ? randInt(rng, 1, 4) : randInt(rng, 2, 7);
    const habS = small ? randInt(rng, 1, 4) : randInt(rng, 2, 7);
    if (Math.abs(bioS - habS) < 2) continue;
    if (bioS >= bioN - 2 || habS >= habN - 2) continue;
    const N = life + bioN + habN;
    const big = Math.max(bioS, habS);
    const sm = Math.min(bioS, habS);
    const P = randInt(rng, N - big, N - sm - 1);
    const bestId = bioS > habS ? 'bioeco' : 'habeco';
    const t = (perSol: number) => (sols > 1 ? `${perSol} × ${sols} = ${perSol * sols} ⚡` : `${perSol} ⚡`);
    const prod = sols > 1 ? `${P * sols} ⚡` : `${P} ⚡`;

    const options: PuzzleOption[] = [
      { id: 'normal', emoji: '🔆', label: 'Todo normal', detail: 'Nada se apaga ni se reduce.' },
      { id: 'bioeco', emoji: '🌱', label: 'Invernadero en ahorro', detail: 'Luces de cultivo al mínimo.' },
      { id: 'habeco', emoji: '🔥', label: 'Calefacción en ahorro', detail: 'Un poco más de frío en los refugios.' },
      { id: 'alleco', emoji: '🌙', label: 'Todo en ahorro', detail: 'Invernadero y calefacción al mínimo.' },
      { id: 'battery', emoji: '🔋', label: 'Gastar la batería de reserva', detail: 'Todo normal usando la reserva de emergencia.' },
    ];
    const fits = (perSol: number) => perSol <= P;
    const results: Record<string, PuzzleOptionResult> = {
      normal: { tier: 'bad', effects: { energy: -10, food: -2, habitat: -2 }, why: `Todo normal gastaba ${t(N)} y los paneles daban ${prod}: hubo apagones.` },
      bioeco: fits(N - bioS)
        ? { tier: 'best', effects: { energy: 12, food: -2 }, why: `Con el invernadero en ahorro se gastaban ${t(N - bioS)} y los paneles daban ${prod}. ¡El plan alcanzó!` }
        : { tier: 'bad', effects: { energy: -7 }, why: `Con el invernadero en ahorro se gastaban ${t(N - bioS)}, pero los paneles solo daban ${prod}.` },
      habeco: fits(N - habS)
        ? { tier: 'best', effects: { energy: 12, habitat: -2 }, why: `Con la calefacción en ahorro se gastaban ${t(N - habS)} y los paneles daban ${prod}. ¡El plan alcanzó!` }
        : { tier: 'bad', effects: { energy: -7 }, why: `Con la calefacción en ahorro se gastaban ${t(N - habS)}, pero los paneles solo daban ${prod}.` },
      alleco: { tier: 'ok', effects: { energy: 8, food: -4, habitat: -4 }, why: `Todo en ahorro alcanzaba (${t(N - bioS - habS)}), pero apagaron más de lo necesario: cultivos y refugios sufrieron.` },
      battery: { tier: 'bad', effects: { energy: -8 }, why: 'La batería de emergencia aguantó unas horas… pero la tormenta siguió y la colonia se quedó sin reserva.' },
    };
    const bestLabel = options.find((o) => o.id === bestId)!.label;
    const intel: Record<RoleId, IntelCard> = {
      power: {
        role: 'power',
        title: 'Producción de energía en la tormenta',
        intro: 'Tu predicción muestra cuánta energía darán los paneles con el cielo lleno de polvo.',
        lines: [
          { label: sols > 1 ? `Energía total de los paneles en ${sols} sols` : 'Energía de los paneles por sol', value: prod, strong: true },
          { label: 'Batería de reserva', value: 'Solo emergencias' },
        ],
        tip: 'Sumen lo que gasta cada sistema y compárenlo con esta producción.',
      },
      life: {
        role: 'life',
        title: 'Consumo del soporte vital',
        intro: 'Vigilas el oxígeno y el aire de toda la tripulación.',
        lines: [
          { label: 'Oxígeno y aire', value: `${life} ⚡/sol`, strong: true },
          { label: '¿Se puede apagar?', value: '¡Nunca!' },
        ],
        tip: 'Tu número se suma en cualquier plan.',
      },
      bio: {
        role: 'bio',
        title: 'Consumo del invernadero',
        intro: 'Conoces cuánta luz necesitan los cultivos en cada modo.',
        lines: [
          { label: 'Invernadero normal', value: `${bioN} ⚡/sol`, strong: true },
          { label: 'Invernadero en ahorro', value: `${bioN - bioS} ⚡/sol` },
        ],
        tip: 'En ahorro las plantas crecen más lento, pero sobreviven.',
      },
      habitat: {
        role: 'habitat',
        title: 'Consumo de la calefacción',
        intro: 'Sabes cuánta energía usan los refugios para no congelarse.',
        lines: [
          { label: 'Calefacción normal', value: `${habN} ⚡/sol`, strong: true },
          { label: 'Calefacción en ahorro', value: `${habN - habS} ⚡/sol` },
        ],
        tip: 'En ahorro hace más frío, pero sigue siendo seguro.',
      },
    };
    return {
      kind: 'budget',
      title: 'Plan de energía',
      question: '¿Qué plan de energía debe seguir su sector durante la tormenta?',
      intel,
      options: shuffle(rng, options),
      results,
      bestId,
      hints: [
        'Sumen el gasto de los tres sistemas y compárenlo con la producción de los paneles.',
        `Con todo normal la colonia gasta ${N} ⚡ por sol. ¿Qué sistema ahorra lo suficiente?`,
      ],
      solution: `La mejor opción era ${bestLabel}: ahorraba ${big} ⚡ por sol y bastaba sin apagar nada más.`,
    };
  }
  throw new Error('No se pudo generar el rompecabezas de presupuesto');
}

/* ------------------------------------------------------------------ */
/* Tipo 3 · Ruta: distancia, batería, tiempo y clima                    */
/* ------------------------------------------------------------------ */

function genRoute(difficulty: Difficulty, rng: Rng): Puzzle {
  const explorer = difficulty === 'explorer';
  const v = explorer ? 2 : randInt(rng, 2, 5);
  const t0 = explorer ? randInt(rng, 2, 4) : randInt(rng, 2, 6);
  const W = v * t0;
  const h = explorer ? 1 : randInt(rng, 1, 2);
  const orbiterCase = rng() < 0.22;
  let nStar = -1;
  let R: number;
  let T: number;
  if (!orbiterCase) {
    nStar = pick(rng, [0, 1, 1, 2, 2, 3]);
    R = W + randInt(rng, 1, 6);
    const extra = nStar === 3 ? randInt(rng, 0, 2) : h > 1 ? randInt(rng, 0, h - 1) : 0;
    T = t0 + nStar * h + extra;
  } else {
    R = W - randInt(rng, 2, Math.max(2, Math.min(6, W - 1)));
    T = t0 + randInt(rng, 1, 3) * h;
  }

  const options: PuzzleOption[] = [
    { id: 'n0', emoji: '🚙', label: 'Rover directo', detail: 'Ir y volver sin paradas.' },
    { id: 'n1', emoji: '🧪', label: 'Rover + 1 parada', detail: 'Una parada para tomar muestras.' },
    { id: 'n2', emoji: '⚗️', label: 'Rover + 2 paradas', detail: 'Dos paradas para tomar muestras.' },
    { id: 'n3', emoji: '🔬', label: 'Rover + 3 paradas', detail: 'Tres paradas: ¡máxima ciencia!' },
    { id: 'orb', emoji: '🛰️', label: 'Usar el orbitador', detail: 'Estudiar la señal desde el espacio, sin arriesgar el rover.' },
  ];
  const results: Record<string, PuzzleOptionResult> = {};
  for (let n = 0; n <= 3; n++) {
    const id = `n${n}`;
    const time = t0 + n * h;
    const stops = n === 0 ? 'sin paradas' : `${n} parada${n > 1 ? 's' : ''}`;
    if (orbiterCase) {
      results[id] = { tier: 'bad', effects: { energy: -6, habitat: -8 }, why: `La batería alcanzaba para ${R} km y el viaje de ida y vuelta medía ${W} km: el rover se quedó varado.` };
    } else if (n === nStar) {
      results[id] = { tier: 'best', effects: { habitat: 10, energy: 3 }, why: `Viaje de ${t0} h ${stops} = ${time} h, antes de que llegara la tormenta (${T} h). ¡Expedición perfecta!` };
    } else if (n < nStar) {
      results[id] = { tier: 'ok', effects: { habitat: 5 }, why: `El rover volvió a salvo, pero había tiempo para ${nStar} parada${nStar > 1 ? 's' : ''}: se perdió información valiosa.` };
    } else {
      results[id] = { tier: 'bad', effects: { habitat: -8, energy: -4 }, why: `${t0} h de viaje + ${n * h} h de paradas = ${time} h, pero la tormenta llegó a las ${T} h: el rover quedó atrapado.` };
    }
  }
  results.orb = orbiterCase
    ? { tier: 'best', effects: { habitat: 8, energy: 3 }, why: `Decisión segura: la batería (${R} km) no alcanzaba para ${W} km, así que el orbitador investigó la señal.` }
    : { tier: 'ok', effects: { habitat: 3 }, why: 'El orbitador obtuvo pocos datos: el rover sí podía ir y volver a tiempo.' };

  const intel: Record<RoleId, IntelCard> = {
    power: {
      role: 'power',
      title: 'Batería del rover',
      intro: 'Revisaste la batería del rover explorador.',
      lines: [{ label: 'La batería alcanza para recorrer', value: `${R} km`, strong: true }],
      tip: 'La batería debe alcanzar para ir Y volver.',
    },
    habitat: {
      role: 'habitat',
      title: 'Ruta hacia la señal',
      intro: 'Trazaste la ruta en el mapa del terreno.',
      lines: [
        { label: 'Distancia de ida y vuelta', value: `${W} km`, strong: true },
        explorer
          ? { label: 'Tiempo de viaje de ida y vuelta', value: `${t0} h` }
          : { label: 'Velocidad del rover en este terreno', value: `${v} km/h` },
      ],
      tip: explorer ? 'Compara la distancia con la batería del rover.' : 'Divide la distancia entre la velocidad para saber cuántas horas dura el viaje.',
    },
    life: {
      role: 'life',
      title: 'Pronóstico del clima',
      intro: 'Tus sensores vigilan el clima alrededor de la colonia.',
      lines: [{ label: 'La tormenta de polvo llega en', value: `${T} h`, strong: true }],
      tip: 'El rover debe estar de vuelta antes de la tormenta.',
    },
    bio: {
      role: 'bio',
      title: 'Plan científico',
      intro: 'Quieres traer muestras de rocas y polvo del cañón.',
      lines: [
        { label: 'Cada parada para tomar muestras dura', value: `${h} h`, strong: true },
        { label: 'Valor científico', value: 'Más paradas = más descubrimientos' },
      ],
      tip: 'Suma el tiempo de las paradas al tiempo de viaje.',
    },
  };
  const bestId = orbiterCase ? 'orb' : `n${nStar}`;
  return {
    kind: 'route',
    title: 'Expedición a la señal',
    question: '¿Cómo debe investigar la señal su tripulación?',
    intel,
    options,
    results,
    bestId,
    hints: [
      'Primero revisen si la batería alcanza para ir y volver. Después sumen viaje + paradas y compárenlo con la tormenta.',
      `El viaje de ida y vuelta sin paradas dura ${t0} horas.`,
    ],
    solution: orbiterCase
      ? `La batería (${R} km) no alcanzaba para ${W} km: lo más seguro era usar el orbitador.`
      : `Viaje de ${t0} h + ${nStar} parada(s) de ${h} h = ${t0 + nStar * h} h, antes de la tormenta (${T} h).`,
  };
}

/* ------------------------------------------------------------------ */

export function generatePuzzle(missionId: MissionId, difficulty: Difficulty, seed: number): Puzzle {
  const rng = makeRng(seed);
  switch (missionId) {
    case 'greenhouse':
      return genElimination(GREENHOUSE, difficulty, rng);
    case 'water':
      return genElimination(WATER, difficulty, rng);
    case 'habitat':
      return genElimination(HABITAT, difficulty, rng);
    case 'final':
      return genElimination(FINAL, difficulty, rng);
    case 'darkness':
      return genBudget(difficulty, rng);
    case 'signal':
      return genRoute(difficulty, rng);
  }
}
