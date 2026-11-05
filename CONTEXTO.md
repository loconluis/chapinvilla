# Chapinvilla — contexto del proyecto

> Documento vivo para cualquier agente o persona que retome este trabajo. Actualizalo al cerrar cada etapa.
> Última actualización: 5 nov 2026, tarde (hora de Guatemala).

## Qué es
Chapinvilla es un juego arcade web de Luis Locon (GitHub `loconluis`) para el challenge **Build & Play** de Build & Pitch.
Tagline: «La vida es difícil. El juego también.»
Une dos ideas:
- **Chapinvilla** (el PRD de Luis) pone el nombre, el tono de humor social chapín y los atributos.
- **«Llegá a la UVG»** pone el loop: salís de un punto al azar y tenés que llegar a la UVG, donde es el hackatón, antes de que se acabe el tiempo.

Fuente original: `Chapinvilla_PRD_TDD_v1.docx`.

## Reglas del challenge (https://www.open2.io/build-and-pitch/play)
- Un juego arcade «difícil».
- **32 KB como máximo** en total, contando todo lo que descarga el navegador. Se mide **sin comprimir**: el build tiene que fallar si `dist/` pasa de **32 768 bytes**.
- Prohibidas las librerías, los frameworks y los motores (Phaser, Three.js, React y similares).
- **Cero assets**: ni imágenes, ni audio, ni fuentes externas, ni emojis como gráficos. Todo se dibuja y se genera con código.
- El repo de GitHub tiene que ser **público y nuevo**, creado durante el challenge, con un link jugable (GitHub Pages, Vercel o itch.io).
- La obra tiene que ser original, y hay un juego por cuenta de Open2.
- Fechas:
  - Envíos: del 04/11 al **18/11 a las 23:59** (hora de Guatemala).
  - Votación: desde el 19/11.
  - Ganador: el 21/11 en Build & Pitch. El premio es de USD 50.
- **Entrega interna: 15/11.**

## Corte acordado: MVP con solo el nivel 1, «La hora pico»
- Arcade de **3 carriles**: vas en moto y esquivás camionetas, motoristas, hoyos y vehículos que cambian de carril. Son 4 tipos de obstáculo.
- Atributos: **energía**, **estrés** y **tiempo**.
  - El estrés sube con cada choque. La música va más rápido y la calle tiembla. El temblor no toca las barras (el HUD está fuera del canvas). A partir de 75 de estrés la energía baja un poco más rápido. No hay modo desesperación completo.
- Objetos (3): café chapín (energía), tamal (baja estrés y da un poco de energía) y quetzales (puntos).
- El origen sale al azar entre Villa Nueva, Mixco, Antigua y zona 18, y el destino es la UVG. Lo decide una **semilla en el link** (`?viaje=4821`): `origen = semilla % 4` en ese orden. El mismo link da la misma calle.
- La dificultad sube cada 15 s (la moto va más rápido, con tope). En el jefe la velocidad se contiene para que se pueda leer.
- Al final aparece el jefe **«El tráfico eterno»**: buses que tapan 2 carriles. El carril libre cambia en cada oleada.
- Pantallas:
  - Inicio, con «Hoy salís de: X» y el botón JUGAR.
  - Juego.
  - **«Llegaste a la UVG a las … con Q…»**.
  - **«No llegaste»**.
  - Las dos pantallas finales tienen OTRA VEZ (misma semilla) y RETAR A UN CUATE (share nativo; si no hay, copia texto y link; si tampoco, muestra el texto).
- Mensajes de humor según lo que pasa. Nunca se repite el mismo dos veces seguidas. Están en `src/data.js` (`LINES`), incluidas las seis frases del corte.
- El récord se guarda en `localStorage` (`chapinvilla.v1`). No hay backend ni cuentas.
- Una corrida limpia dura ~84 s reales. El límite es 90 s. 1 segundo real = 1 minuto en el reloj (Mixco sale 6:30 y el plazo es 8:00).

### Fuera del MVP (para después)
- Los niveles 2 a 5: La quincena, Invierno chapín, Hoy no se pasa y Trámite pendiente.
  - Si sobra tiempo antes del 18/11, el primer candidato es el nivel 3 (Invierno chapín), porque reusa los carriles con lluvia y charcos.
- Los logros, los tres finales y el modo desesperación completo.

## Arquitectura (Arquitecto)
- JS vanilla, Canvas 2D y Web Audio. El navegador solo recibe **`index.html`**.
- El build usa esbuild y Terser como dependencias de desarrollo. No entran al archivo publicado.
- Resolución lógica de 320×180, escalada en múltiplos enteros con `imageSmoothingEnabled = false` y `image-rendering: pixelated` / `crisp-edges`.
- Loop con `requestAnimationFrame` y paso fijo de 1/60. Pausa con Esc, al ocultar la pestaña, al reiniciar y en game over.
- Sprites en matrices de caracteres en `src/data.js`. Se dibujan a escala 2 para llenar el carril.
  - Paleta: #123B35, #247C68, #E5B94B, #E66A45, #5B83A6, #E7D8B8, #282B35.
- Los niveles se definen como **datos** (`LEVELS` en `src/data.js`). El simulador no tiene un `if` por número de nivel.
- El choque compara el carril comprometido (`laneT`) y la posición en Z. Cambiar de carril es inmediato para la colisión; el dibujo se desliza.
- Una GitHub Action (`.github/workflows/size.yml`) falla si `dist/` pasa de 32 768 bytes sin comprimir, si hay más de un archivo, o si `index.html` no coincide con `dist/index.html`. También imprime el tamaño Brotli.

## Mapa del repo
- `src/data.js` — paleta, sprites, catálogo, frases, nivel 1.
- `src/sim.js` — semilla, generación y paso de la simulación. Sin DOM.
- `src/geom.js` — 320×180, carriles, carril ocupado.
- `src/render.js` — canvas.
- `src/audio.js` — Web Audio (moto, melodía, efectos).
- `src/humor.js` — rota frases sin repetir la anterior.
- `src/main.js` — pantallas, input, loop.
- `src/shell.html` + `src/style.css` — se inlinean en el build.
- `scripts/build.js`, `scripts/size.js`, `scripts/serve.js`.
- `test/sim.test.js` — semilla, fairness, piloto, frases.
- `index.html` — artefacto que sirve GitHub Pages (raíz).
- `dist/index.html` — salida del build. Está en `.gitignore`; CI lo regenera.

## UI (Lienzo)
- El HUD va en una sola franja arriba del canvas: energía, estrés, tiempo (reloj + barra) y Q.
- El texto de humor va en una línea debajo del canvas.
- Los botones táctiles (IZQ, ACELERA, DER) son grandes y quedan debajo del humor.
- En compu: flechas o WASD, Espacio (o W / flecha arriba) acelera, S / flecha abajo frena, Esc pausa. En el teléfono: swipe y botones.
- Ningún efecto de estrés tapa las barras.

## Datos (Pulso)
Energía, estrés y tiempo son medidores del juego, no datos reales. El reloj es ficción: un segundo de juego es un minuto de la mañana.

## Cuándo está listo (Producto)
- [x] Pesa ≤ 32 768 bytes sin comprimir, medido en CI (script + Action).
- [x] Se juega en el teléfono (botones y swipe) y en la compu (teclado). Verificado en viewport 390×844 y 1100×920.
- [x] Una partida limpia dura ~84 s; el tope es 90 s.
- [x] Al perder está «OTRA VEZ» sin buscarlo.
- [x] El link `?viaje=` reproduce la misma calle (4821 → Mixco; 7 → zona 18).
- [x] No hay requests de red externas ni excepciones en consola (Chrome headless).

## Responsables
- **Construcción:** Forja, el agente ingeniero de Luis.
- **Coordinación:** G.
- **Consultas:** Dev Team (Arquitecto, Producto, Lienzo y Pulso).

## Bitácora
- 2026-11-05: Luis manda el PRD de Chapinvilla. El Dev Team lo revisa y dice que cumple con cambios. Se fusiona con «Llegá a la UVG» y se acuerda el nivel 1 como MVP. Luis da el OK para construir solo el nivel 1, «y vamos viendo».
- 2026-11-05 (tarde): Nivel 1 jugable en un solo `index.html`. Sin comprimir **27652** bytes. Brotli **9415** bytes (meta interna ~24576). Action de tamaño en `.github/workflows/size.yml`. Pruebas de simulación en verde: la misma semilla reconstruye la calle, nunca se tapan 3 carriles, un piloto atento llega en ~84 s sin choques y quedarse en un carril pierde. En Chrome: JUGAR, pausa, OTRA VEZ, récord en `localStorage`, humor sin repetición inmediata, y RETAR A UN CUATE arma el texto con el link. El repo https://github.com/loconluis/chapinvilla existe, público y sin commits. Desde esta máquina `git push` a GitHub pide usuario: no hay `gh auth`. El push normal (sin force) y Pages en `main` `/` están escritos en el README. Falta ejecutarlos con la sesión de `loconluis`.
