# IXCHEL — Colonia Marte 3D

Juego educativo en 3D (navegador, PC y celular) para niñas y niños de 8 a 14 años. Llegas a una colonia en Marte que tiene **seis problemas al mismo tiempo**. Cada problema vive en su propio lugar del mundo: caminas hasta él, ves la problemática con tus ojos, hablas con los especialistas, decides con datos y lo reparas con un minijuego.

## Cómo se juega

1. **Explora**: camina por la colonia en tercera persona. Las columnas de luz marcan los lugares con problemas.
2. **Problemática**: al llegar, IX (la IA de la colonia) explica qué está fallando (domos a oscuras, fuga de agua, paneles con polvo…).
3. **Investiga**: habla con los 4 especialistas del lugar (💬). Cada quien tiene un dato distinto e imprescindible.
4. **Decide**: examina los pedestales con las posibles soluciones, descarta (❌) las que no cumplen y elige la mejor.
5. **Repara**: un minijuego en 3D pone en marcha tu decisión. Al terminar, el lugar se repara, aparece un edificio nuevo y la bitácora guarda lo aprendido.

No hay preguntas tipo quiz ni cámara/visión artificial: todo ocurre dentro del mundo.

## Misiones y minijuegos

| Lugar | Problemática | Minijuego |
| --- | --- | --- |
| 🌱 Invernaderos | El polvo tapa la luz y las plantas se marchitan | **Espejos de luz**: gira espejos para llevar el rayo de sol a cada cultivo (reflexión) |
| 💧 Planta de agua | Fuga en el tanque principal | **Ruta del agua**: gira tubos para llevar agua del pozo, por el filtro de percloratos, al tanque; luego tapa fugas |
| ☀️ Granja solar | Paneles cubiertos de polvo, apagón | **Rover limpiador**: maneja un rover con cepillo; los remolinos ayudan y las ráfagas ensucian |
| 📡 Antena | Señal desconocida llena de ruido | **Sintoniza la señal**: apunta el plato guiándote por el sonido e iguala frecuencia y amplitud de la onda |
| 🏗️ Zona de construcción | Llegan colonos y no hay refugio | **Constructor de módulos**: acomoda las piezas sobre suelo firme, conectadas con la esclusa |
| 🌕 Centro de mando (final) | 10 sols sin ayuda de la Tierra | **10 sols**: corre por toda la colonia reparando fallas antes de que un sistema llegue a cero |

Además hay 6 **descubrimientos** escondidos lejos de la colonia, ciclo de día y noche, y tres dificultades (Explorador, Cadete, Comandante). Los números de cada problema cambian en cada partida.

## Controles

- **Computadora**: W A S D / flechas para caminar, Shift para correr, Espacio para saltar, arrastrar con el mouse para girar la cámara, rueda para acercar, **E** para interactuar, **Tab** datos, **J** bitácora, **Esc** menú.
- **Celular/tableta**: joystick a la izquierda, botón de acción y salto a la derecha, arrastrar para girar la cámara.

## Cómo correrlo

Requisitos: Node.js 20 o más reciente.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # genera dist/ para cualquier hosting estático con HTTPS
npm run typecheck
```

La partida se guarda en el dispositivo. Es una PWA: después de la primera visita funciona sin conexión.

## Estructura

```
shared/            Contenido (misiones, roles, datos NASA) y generadores de problemas con datos
src/game/          Motor 3D (Three.js): mundo, jugador, cámara, misiones, guardado
src/game/sites/    Cada lugar del mundo con su problemática y su minijuego
src/ui/            Interfaz en React: título, HUD, diálogos, paneles
src/components/    Ilustraciones SVG e íconos
```

Tecnología: React + TypeScript + Vite · Three.js · Web Audio · PWA.

## Notas

- Los datos científicos se basan en publicaciones de la NASA; los porcentajes de la colonia son valores de juego.
- La señal de la antena es un recurso ficticio de la historia, no una afirmación sobre señales extraterrestres reales.
