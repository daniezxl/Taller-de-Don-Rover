// Contenido del juego: roles, misiones, problemáticas, minijuegos y datos científicos.
// Todo el texto científico está pensado para niñas y niños de 8 a 14 años y se basa en
// hechos publicados por la NASA. Los valores de los medidores son valores de juego.

import type { BuildingId, Difficulty, DiscoveryId, Meters, MissionId, RoleId, SystemId } from './types';

/* ------------------------------------------------------------------ */
/* Sistemas de la colonia                                               */
/* ------------------------------------------------------------------ */

export const SYSTEM_ORDER: SystemId[] = ['energy', 'water', 'food', 'habitat'];

export const SYSTEMS: Record<
  SystemId,
  { id: SystemId; name: string; short: string; color: string; dark: string; emoji: string }
> = {
  energy: { id: 'energy', name: 'Energía global', short: 'Energía', color: '#FFC93C', dark: '#B07400', emoji: '⚡' },
  water: { id: 'water', name: 'Agua y oxígeno', short: 'Agua', color: '#3CC8FF', dark: '#0A78B0', emoji: '💧' },
  food: { id: 'food', name: 'Producción de alimentos', short: 'Alimentos', color: '#55DB7A', dark: '#17914A', emoji: '🌱' },
  habitat: { id: 'habitat', name: 'Protección de hábitats', short: 'Hábitat', color: '#FF6B5B', dark: '#C13628', emoji: '🛡️' },
};

/* ------------------------------------------------------------------ */
/* Roles de la tripulación                                              */
/* ------------------------------------------------------------------ */

export interface RoleDef {
  id: RoleId;
  num: string;
  name: string;
  es: string;
  specialty: string;
  system: SystemId;
  color: string;
  dark: string;
  soft: string;
  emoji: string;
  ability: string;
  secret: string;
  helmet: number;
}

export const ROLE_ORDER: RoleId[] = ['power', 'life', 'bio', 'habitat'];

export const ROLES: Record<RoleId, RoleDef> = {
  power: {
    id: 'power',
    num: '01',
    name: 'Power Engineer',
    es: 'Ingeniería de Energía',
    specialty: 'Energía',
    system: 'energy',
    color: '#FFC93C',
    dark: '#9A6500',
    soft: '#FFF3CC',
    emoji: '⚡',
    ability: 'Optimizar y redistribuir la energía',
    secret: 'Recibe la predicción de energía disponible',
    helmet: 1,
  },
  life: {
    id: 'life',
    num: '02',
    name: 'Life Support Officer',
    es: 'Soporte Vital',
    specialty: 'Agua y oxígeno',
    system: 'water',
    color: '#3CC8FF',
    dark: '#076A9E',
    soft: '#D9F4FF',
    emoji: '💧',
    ability: 'Recuperar recursos y resolver crisis',
    secret: 'Recibe el estado de las reservas',
    helmet: 2,
  },
  bio: {
    id: 'bio',
    num: '03',
    name: 'Astro-Biologist',
    es: 'Astrobiología',
    specialty: 'Alimentos',
    system: 'food',
    color: '#55DB7A',
    dark: '#137A3C',
    soft: '#DDF8E5',
    emoji: '🌱',
    ability: 'Crear cultivos y desarrollar ecosistemas',
    secret: 'Recibe el estado de los cultivos',
    helmet: 0,
  },
  habitat: {
    id: 'habitat',
    num: '04',
    name: 'Habitat Engineer',
    es: 'Ingeniería de Hábitat',
    specialty: 'Protección',
    system: 'habitat',
    color: '#FF6B5B',
    dark: '#A82A1E',
    soft: '#FFE1DD',
    emoji: '🛡️',
    ability: 'Diseñar y mejorar refugios',
    secret: 'Recibe la información de protección del refugio',
    helmet: 4,
  },
};

/* ------------------------------------------------------------------ */
/* Edificios que se desbloquean (progresión de la colonia)              */
/* ------------------------------------------------------------------ */

export const BUILDINGS: Record<BuildingId, { name: string; desc: string; emoji: string; missionId: MissionId }> = {
  hydroponics: { name: 'Invernadero hidropónico', desc: 'Cultiva sin tierra usando agua con nutrientes.', emoji: '🌿', missionId: 'greenhouse' },
  recycler: { name: 'Recicladora de agua', desc: 'Recupera casi toda el agua de la colonia.', emoji: '♻️', missionId: 'water' },
  reactor: { name: 'Reactor compacto', desc: 'Energía estable aunque no haya Sol.', emoji: '⚛️', missionId: 'darkness' },
  antenna: { name: 'Antena de espacio profundo', desc: 'Comunicación directa con la Tierra.', emoji: '📡', missionId: 'signal' },
  module: { name: 'Módulo impreso en 3D', desc: 'Un nuevo hogar hecho con regolito.', emoji: '🏗️', missionId: 'habitat' },
  city: { name: 'Ciudad IXCHEL', desc: 'La colonia es autosuficiente. ¡Rumbo a la Luna!', emoji: '🌙', missionId: 'final' },
};

/* ------------------------------------------------------------------ */
/* Personalización del astronauta                                       */
/* ------------------------------------------------------------------ */

export const SUIT_COLORS = ['#FF5A4E', '#FF9A3C', '#FFC93C', '#55DB7A', '#3CC8FF', '#4C6FFF', '#A57CFF', '#FF7EB6'];
export const SUIT_NAMES = ['Rojo Marte', 'Naranja', 'Sol', 'Brote', 'Hielo', 'Cosmos', 'Nebulosa', 'Chicle'];
export const HELMETS = ['Burbuja', 'Gorra', 'Goggles', 'Robot', 'Buzo'];
export const VISORS = ['#1B2A6B', '#FFB703', '#38E1FF', '#FF4FB0'];
export const VISOR_NAMES = ['Noche', 'Oro', 'Hielo', 'Neón'];
export const ACCESSORIES = ['Nada', 'Antena', 'Brote', 'Orejitas', 'Audífonos', 'Anillo'];

/* ------------------------------------------------------------------ */
/* Dificultad                                                           */
/* ------------------------------------------------------------------ */

export const DIFFICULTIES: Record<Difficulty, { label: string; age: string; desc: string }> = {
  explorer: { label: 'Explorador', age: '7 a 9 años', desc: 'Números pequeños y pistas muy claras.' },
  cadet: { label: 'Cadete', age: '10 a 12 años', desc: 'Comparar y sumar los datos de los cuatro especialistas.' },
  commander: { label: 'Comandante', age: '12 a 15 años', desc: 'Multiplicar por sols y razonar con varias condiciones.' },
};

/* ------------------------------------------------------------------ */
/* Misiones                                                             */
/* ------------------------------------------------------------------ */

export interface MissionDef {
  id: MissionId;
  code: string;
  title: string;
  titleEs: string;
  color: string;
  deep: string;
  emoji: string;
  hook: string;
  story: string;
  objective: string;
  twist: string;
  learning: string[];
  focus: SystemId;
  conceptHint: string;
  twists: [string, string, string];
  debrief: { learnings: string[]; nasaFact: string; reflection: string; teaser: string };
  unlock: BuildingId;
  requires?: number;
  disclaimer?: string;
}

export const MISSION_ORDER: MissionId[] = ['greenhouse', 'water', 'darkness', 'signal', 'habitat', 'final'];

export const MISSIONS: Record<MissionId, MissionDef> = {
  greenhouse: {
    id: 'greenhouse',
    code: 'M-01',
    title: 'GREENHOUSE RESCUE',
    titleEs: 'Rescate del invernadero',
    color: '#3FCF6E',
    deep: '#0D5A33',
    emoji: '🌱',
    hook: '¡El invernadero principal perdió sus condiciones de operación! Los cultivos que alimentan a toda la colonia tienen pocas horas.',
    story:
      'Un invernadero de la colonia acaba de fallar. Sin luz, agua y calor estables, los cultivos están en peligro. Tienes que hablar con los cuatro especialistas del invernadero, decidir qué cultivo rescatar y devolverles la luz.',
    objective: 'Rescatar el cultivo que pueda sobrevivir a la tormenta de polvo que se acerca.',
    twist: 'Una tormenta de polvo reduce la energía solar y obliga a decidir qué cultivos conservar.',
    learning: ['Fotosíntesis', 'Ecosistemas', 'Recursos', 'Agricultura espacial'],
    focus: 'food',
    conceptHint: 'Recuerden: la fotosíntesis necesita luz, agua y CO₂. Cada especialidad tiene un dato que descarta un cultivo.',
    twists: [
      'Datos nuevos: los sensores detectan polvo acercándose al invernadero.',
      'Emergencia global: una tormenta de polvo cubre toda la colonia.',
      'Descubrimiento: algo brilla bajo la arena del invernadero…',
    ],
    debrief: {
      learnings: [
        'Las plantas hacen fotosíntesis: usan luz, agua y dióxido de carbono para fabricar su alimento y liberar oxígeno.',
        'En Marte un invernadero debe proteger a las plantas del frío extremo, la radiación y el aire tan delgado.',
        'Elegir un cultivo es equilibrar recursos: energía para la luz, agua para el riego, calor y tiempo de cosecha.',
      ],
      nasaFact:
        'En 2021 la tripulación de la Estación Espacial Internacional cosechó chiles cultivados en órbita… ¡y con ellos prepararon tacos espaciales!',
      reflection: '¿Qué cultivo plantarían primero en Marte y por qué?',
      teaser: 'El agua de los cultivos salió de algún lado… ¿y si la reserva tiene una fuga?',
    },
    unlock: 'hydroponics',
  },

  water: {
    id: 'water',
    code: 'M-02',
    title: 'THE WATER CRISIS',
    titleEs: 'La crisis del agua',
    color: '#2FB9F5',
    deep: '#0A4A78',
    emoji: '💧',
    hook: '¡Alarma! Se detectó una fuga en el depósito principal. Cada sol perdemos agua que la colonia necesita para vivir.',
    story:
      'Una fuga vació parte de la reserva de agua. Hay que elegir una nueva fuente de agua segura… sin gastar toda la energía ni poner en riesgo a los rovers, y después llevarla hasta el tanque.',
    objective: 'Elegir la fuente de agua que cubra lo que necesita la colonia de forma segura.',
    twist: 'Una zona de cultivo consume más agua de lo esperado y la red pierde presión.',
    learning: ['Ciclo del agua', 'Conservación', 'Reciclaje', 'Gestión de recursos'],
    focus: 'water',
    conceptHint: 'En Marte el agua está congelada y el suelo tiene sales tóxicas. Revisen energía, cantidad, distancia y pureza.',
    twists: [
      'Datos nuevos: el radar encontró hielo enterrado cerca de la colonia.',
      'Emergencia global: una zona de cultivo bebe más agua de lo previsto.',
      'Descubrimiento: el radar detecta una cueva de hielo…',
    ],
    debrief: {
      learnings: [
        'El agua se mueve en un ciclo: se evapora, se condensa y vuelve a usarse. En una base espacial ese ciclo se cierra con máquinas.',
        'En Marte hay hielo en los polos y bajo el suelo, pero hay que derretirlo y filtrarlo porque el suelo contiene percloratos.',
        'Conservar y reciclar agua es tan importante como encontrar agua nueva.',
      ],
      nasaFact:
        'En 2023 la Estación Espacial Internacional logró recuperar cerca del 98% de su agua: el sudor, el vapor de la respiración y hasta la orina se purifican para volver a beberse.',
      reflection: '¿Qué harían en su escuela para cerrar el ciclo del agua como en una base espacial?',
      teaser: 'Las bombas de agua necesitan energía… ¿qué pasa si el Sol desaparece por días?',
    },
    unlock: 'recycler',
  },

  darkness: {
    id: 'darkness',
    code: 'M-03',
    title: 'DARKNESS PROTOCOL',
    titleEs: 'Protocolo Oscuridad',
    color: '#8B7BFF',
    deep: '#231A63',
    emoji: '🌑',
    hook: '¡Se ha perdido el 40% de la energía de la colonia! Tenemos poco tiempo antes de que se agoten las reservas.',
    story:
      'Una tormenta de polvo tapó el Sol. Los paneles producen muy poca energía y la colonia debe reorganizar sus prioridades: hay que diseñar un plan de ahorro sin apagar lo que nos mantiene vivos y limpiar los paneles.',
    objective: 'Crear un plan que no gaste más energía de la que producen los paneles.',
    twist: 'La tormenta dura más de lo previsto.',
    learning: ['Energía solar', 'Almacenamiento', 'Consumo', 'Toma de decisiones'],
    focus: 'energy',
    conceptHint: 'Sumen lo que gasta cada sistema y compárenlo con lo que producen los paneles. El soporte vital nunca se apaga.',
    twists: [
      'Datos nuevos: el polvo bloquea gran parte de la luz solar.',
      'Emergencia global: la tormenta durará más de lo previsto.',
      'Descubrimiento: un remolino de polvo limpió algunos paneles…',
    ],
    debrief: {
      learnings: [
        'Marte recibe menos de la mitad de la luz solar que la Tierra porque está más lejos del Sol; las tormentas de polvo la reducen todavía más.',
        'Las baterías guardan energía para usarla cuando no hay Sol: de noche o durante una tormenta.',
        'Ahorrar energía significa decidir prioridades. El soporte vital siempre va primero.',
      ],
      nasaFact:
        'En 2018 una tormenta de polvo que cubrió casi todo Marte dejó sin energía al rover Opportunity, que funcionaba con paneles solares. Nunca volvió a comunicarse.',
      reflection: '¿Qué aparatos de su casa podrían apagar si tuvieran que ahorrar energía como en Marte?',
      teaser: 'Durante la tormenta, una antena captó algo extraño… una señal que se repite.',
    },
    unlock: 'reactor',
  },

  signal: {
    id: 'signal',
    code: 'M-04',
    title: 'THE UNKNOWN SIGNAL',
    titleEs: 'La señal desconocida',
    color: '#D06BFF',
    deep: '#4A1670',
    emoji: '📡',
    hook: 'Una estación de investigación capta una señal desconocida que se repite cada pocos minutos desde un cañón cercano.',
    story:
      '¿Enviamos un rover a investigar? Hay que planear la expedición con los datos del equipo (distancia, batería, clima y tiempo para muestras) y sintonizar la antena.',
    objective: 'Planear una expedición segura que consiga la mayor cantidad de información.',
    twist: 'La señal cambia de frecuencia y la comunicación con el rover se vuelve intermitente.',
    learning: ['Comunicación', 'Ondas', 'Observación', 'Análisis de información'],
    focus: 'habitat',
    conceptHint: 'Calculen ida y vuelta: la batería debe alcanzar y el rover debe volver antes de que llegue la tormenta.',
    twists: [
      'Datos nuevos: la señal se repite cada 7 minutos.',
      'Emergencia global: la señal cambia de frecuencia y la comunicación se corta.',
      'Descubrimiento: ¡la señal venía de una vieja sonda perdida!',
    ],
    debrief: {
      learnings: [
        'Las ondas de radio viajan a la velocidad de la luz y, aun así, un mensaje entre la Tierra y Marte tarda entre 3 y 22 minutos.',
        'Por eso los rovers deben ser autónomos: no pueden esperar instrucciones para cada paso.',
        'Una buena expedición se planea con datos: distancia, energía, clima y tiempo.',
      ],
      nasaFact:
        'Los rovers en Marte casi siempre envían sus datos a la Tierra a través de orbitadores, como el Mars Reconnaissance Orbiter, que funcionan como antenas de relevo.',
      reflection: 'Si cada mensaje tardara 20 minutos en llegar, ¿cómo cambiaría su forma de comunicarse?',
      teaser: 'La sonda perdida traía planos de un hábitat… ¡y llegan nuevos colonos!',
    },
    unlock: 'antenna',
    disclaimer: 'La señal es un recurso ficticio de la historia, no una afirmación sobre señales extraterrestres reales.',
  },

  habitat: {
    id: 'habitat',
    code: 'M-05',
    title: 'HABITAT ZERO',
    titleEs: 'Hábitat Cero',
    color: '#FF7A59',
    deep: '#7A2414',
    emoji: '🏗️',
    hook: '¡Una nave con nuevos colonos está por aterrizar y no hay dónde alojarlos!',
    story:
      'La colonia necesita crecer. Hay que elegir el diseño del nuevo módulo (debe caber en el terreno, usar poca energía, alojar a todos y proteger de la radiación) y construirlo.',
    objective: 'Elegir el diseño de módulo que cumpla todas las condiciones.',
    twist: 'El espacio protegido es limitado y habrá que negociar cómo repartirlo.',
    learning: ['Diseño', 'Arquitectura', 'Sostenibilidad', 'Planificación'],
    focus: 'habitat',
    conceptHint: 'Un buen hábitat equilibra espacio, energía, capacidad y protección. Cada especialidad revisa una condición.',
    twists: [
      'Datos nuevos: el terreno estable es más pequeño de lo esperado.',
      'Emergencia global: no hay espacio protegido para todos los módulos.',
      'Descubrimiento: el radar encontró un tubo de lava gigante…',
    ],
    debrief: {
      learnings: [
        'Las formas redondeadas, como domos y cilindros, resisten mejor la presión del aire dentro de un hábitat.',
        'Marte no tiene un campo magnético global ni una atmósfera gruesa: los hábitats necesitan blindaje, por ejemplo con regolito o agua.',
        'Diseñar es equilibrar: no existe un módulo perfecto, sino el que mejor cumple las condiciones.',
      ],
      nasaFact:
        'En la misión CHAPEA de la NASA, cuatro voluntarios vivieron 378 días en Mars Dune Alpha, un hábitat impreso en 3D en Houston que simula una base en Marte.',
      reflection: 'Si diseñaran su propio módulo, ¿qué no podría faltar?',
      teaser: 'Con todos los sistemas funcionando… ¿podrá la colonia sobrevivir sola una misión larga?',
    },
    unlock: 'module',
  },

  final: {
    id: 'final',
    code: 'M-06',
    title: 'THE FINAL COLONY',
    titleEs: 'La colonia final',
    color: '#FFB703',
    deep: '#6B4100',
    emoji: '🌕',
    hook: 'La Tierra no podrá enviar suministros durante 10 sols. La colonia tiene que funcionar sola.',
    story:
      'Llegó la prueba final. Cada plan ayuda a un sistema, pero puede dañar a otro. Solo un plan mantiene en equilibrio la energía, el agua, los alimentos y la protección.',
    objective: 'Encontrar el plan que deja los cuatro sistemas con balance positivo.',
    twist: 'El sistema genera una emergencia conjunta.',
    learning: ['Pensamiento sistémico', 'Colaboración', 'Equilibrio', 'Planeación'],
    focus: 'energy',
    conceptHint: 'Cada plan cambia los cuatro sistemas. Descarten los planes que dejen algún sistema en negativo.',
    twists: [
      'Datos nuevos: la Tierra no enviará suministros en 10 sols.',
      'Emergencia global: tormenta solar y fuga de aire al mismo tiempo.',
      'Descubrimiento: la colonia es autosuficiente… ¡y la Luna nos llama!',
    ],
    debrief: {
      learnings: [
        'En una colonia todos los sistemas están conectados: si la energía falla, también fallan el agua, el aire y los cultivos.',
        'Un sistema que gasta más de lo que produce agota sus reservas; el equilibrio es la clave para sobrevivir.',
        'Las mejores decisiones salen de combinar la información de todas las especialidades.',
      ],
      nasaFact:
        'En 2021 el experimento MOXIE del rover Perseverance produjo oxígeno a partir del CO₂ de la atmósfera marciana por primera vez: una tecnología clave para futuras colonias.',
      reflection: '¿Qué aprendieron de trabajar como una sola colonia?',
      teaser: 'Capítulo 2 desbloqueado: la Luna. Nuevos retos te esperan.',
    },
    unlock: 'city',
    requires: 5,
  },
};

/* ------------------------------------------------------------------ */
/* Valores iniciales y utilidades                                       */
/* ------------------------------------------------------------------ */

export const START_METERS: Meters = { energy: 72, water: 64, food: 60, habitat: 70 };

export const CREW_NAMES = [
  'Sofía', 'Mateo', 'Valentina', 'Santiago', 'Camila', 'Leonardo', 'Ximena', 'Regina',
  'Emiliano', 'Renata', 'Iker', 'Fernanda', 'Gael', 'Mía', 'Sebastián', 'Itzel',
  'Kenji', 'Zoe', 'Tadeo', 'Naomi', 'Bruno', 'Maya', 'Luca', 'Danna',
  'Thiago', 'Aitana', 'Elías', 'Julia', 'Andrés', 'Lía', 'Pablo', 'Nicole',
];

export function levelFromXp(xp: number): { level: number; title: string; progress: number; next: number } {
  const per = 400;
  const level = Math.floor(xp / per) + 1;
  const titles = ['Cadete', 'Exploradora/or', 'Piloto', 'Especialista', 'Comandante', 'Leyenda espacial'];
  return { level, title: titles[Math.min(titles.length - 1, level - 1)], progress: (xp % per) / per, next: per - (xp % per) };
}

/* ------------------------------------------------------------------ */
/* Cada misión en el mundo 3D: lugar, problemática visible y minijuego  */
/* ------------------------------------------------------------------ */

export interface MissionWorld {
  place: string;
  problem: string;
  game: { name: string; emoji: string; howTo: string; science: string };
}

export const MISSION_WORLD: Record<MissionId, MissionWorld> = {
  greenhouse: {
    place: 'Invernaderos',
    problem: 'Los domos están a oscuras y las plantas se marchitan: el polvo de la tormenta tapa la luz.',
    game: {
      name: 'Espejos de luz',
      emoji: '🪞',
      howTo: 'Toca los espejos para girarlos y guía el rayo del colector solar hasta cada cama de cultivo.',
      science: 'La luz viaja en línea recta y un espejo la refleja con el mismo ángulo con el que llega.',
    },
  },
  water: {
    place: 'Planta de agua',
    problem: 'El tanque principal tiene una fuga y el medidor de agua baja cada minuto.',
    game: {
      name: 'Ruta del agua',
      emoji: '🚰',
      howTo: 'Gira los tubos para llevar el agua del pozo de hielo, a través del filtro, hasta el tanque. Luego tapa las fugas.',
      science: 'El agua de Marte trae percloratos: siempre debe pasar por el filtro antes de usarse.',
    },
  },
  darkness: {
    place: 'Granja solar',
    problem: 'Los paneles están cubiertos de polvo y la colonia se queda sin luz.',
    game: {
      name: 'Rover limpiador',
      emoji: '🧹',
      howTo: 'Maneja el rover limpiador sobre los paneles sucios hasta que la producción alcance lo que necesita tu plan.',
      science: 'Un panel solar cubierto de polvo recibe menos luz y produce menos electricidad.',
    },
  },
  signal: {
    place: 'Antena de espacio profundo',
    problem: 'La antena capta una señal que se repite, pero llega revuelta y llena de ruido.',
    game: {
      name: 'Sintoniza la señal',
      emoji: '📡',
      howTo: 'Apunta el plato hasta que la señal suene más fuerte y ajusta frecuencia y amplitud hasta que tu onda coincida con la señal.',
      science: 'A mayor frecuencia, las ondas están más juntas (longitud de onda más corta).',
    },
  },
  habitat: {
    place: 'Zona de construcción',
    problem: 'La nave de colonos viene en camino y el terreno de construcción está vacío y lleno de grietas.',
    game: {
      name: 'Constructor de módulos',
      emoji: '🏗️',
      howTo: 'Coloca todas las piezas del módulo sobre el terreno firme, evitando grietas, y conéctalas con la esclusa.',
      science: 'Construir sobre suelo estable y con módulos conectados evita fugas de aire.',
    },
  },
  final: {
    place: 'Centro de mando',
    problem: 'La Tierra no enviará suministros en 10 sols: la colonia entera tiene que resistir sola.',
    game: {
      name: '10 sols',
      emoji: '🌗',
      howTo: 'Corre por la colonia y repara cada falla antes de que algún sistema llegue a cero. ¡Resiste 10 sols!',
      science: 'En una colonia todos los sistemas están conectados: si uno falla, arrastra a los demás.',
    },
  },
};

/* ------------------------------------------------------------------ */
/* Descubrimientos escondidos en el mundo                               */
/* ------------------------------------------------------------------ */

export const DISCOVERIES: Record<DiscoveryId, { label: string; emoji: string; text: string }> = {
  meteorite: { label: 'Meteorito de hierro', emoji: '☄️', text: 'Un meteorito metálico, como el que encontró el rover Opportunity en 2005.' },
  lavatube: { label: 'Tubo de lava', emoji: '🕳️', text: 'Un túnel natural de lava antigua: un refugio perfecto contra la radiación.' },
  ice: { label: 'Hielo bajo el suelo', emoji: '🧊', text: 'Hielo escondido a pocos centímetros, como el que descubrió la sonda Phoenix en 2008.' },
  dustdevil: { label: 'Remolino de polvo', emoji: '🌪️', text: 'Un remolino que limpia paneles solares, como les pasó a los rovers Spirit y Opportunity.' },
  layers: { label: 'Roca con capas', emoji: '🪨', text: 'Capas de sedimento que cuentan que hace mucho tiempo hubo agua líquida en Marte.' },
  blueberries: { label: 'Arándanos marcianos', emoji: '🫐', text: 'Esferitas de hematita como las que encontró Opportunity en 2004; se formaron con ayuda del agua.' },
};
export const DISCOVERY_ORDER: DiscoveryId[] = ['meteorite', 'lavatube', 'ice', 'dustdevil', 'layers', 'blueberries'];
