# Chapinvilla — contexto del proyecto

> Documento vivo para cualquier agente o persona que retome este trabajo. Actualizalo al cerrar cada etapa.
> Última actualización: 5 nov 2026, claridad del viaje y del sonido.

## Qué es
Chapinvilla es un juego arcade web de Luis Locon (GitHub `loconluis`) para el challenge **Build & Play** de Build & Pitch.
Tagline: «La vida es difícil. El juego también.»
Une dos ideas:
- **Chapinvilla** (el PRD de Luis) pone el nombre, el tono de humor social chapín y los atributos.
- El loop: salís **desde tu casa** y tenés que llegar a **Build & Pitch** antes de que se acabe el tiempo, sin quedarte sin energía y sin que el estrés llegue al máximo.

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
- Atributos: **gasolina**, **estrés**, **tiempo** y **turbo**.
  - El estrés sube con cada choque. La calle tiembla y el motor sube de tono. El temblor no toca las barras (el HUD está fuera del canvas). A partir de 75 de estrés la gasolina baja un poco más rápido. No hay modo desesperación completo.
  - **El turbo es su propia barra** y vive dentro del botón ACELERA: se llena sola (9/s) y cada esquive limpio suma 10 más. Acelerar cuesta 40 y da 1.7× por 0.8 s. El botón se marca con borde naranja y la palabra LISTO cuando alcanza. Así se ve cuándo se puede acelerar sin adivinar.
- Objetos (3), cada uno con un rol distinto y sin ambigüedad:
  - **gasolina** (bidón rojo, +34): llena el tanque. Es lo único que evita que la moto se pare. Una moto no anda con café.
  - **café** (taza, +2.2 s de velocidad): acelera. Sirve para llegar antes de las 8:00, que vale puntos.
  - **tamal** (bulto verde, −40 de estrés): baja el estrés y por eso el tanque dura más.
  - Lo que se agarra lleva **marco amarillo**; lo que choca no. Así se distingue de un vistazo.
  - El puntaje sale de esquivar limpio (+3), dejar pasar al peatón (+8), llegar antes de las 8:00 y con el tanque entero; chocar resta 15.
- El viaje es siempre **desde tu casa** (salís a las **5:00**) hasta **Build & Pitch** (plazo a las 8:00). Son 180 s reales: arrancás con la calle casi vacía y el tráfico va subiendo hasta la hora pico. Los huecos entre obstáculos se cierran de 250 a 92 y la luz pasa de azul de madrugada a sol de mañana. No hay orígenes al azar. La semilla del link (`?viaje=`) cambia los obstáculos, no los nombres de los lugares. El mismo link da la misma calle.
- La dificultad sube cada 15 s (la moto va más rápido, con tope). En el jefe la velocidad se contiene para que se pueda leer.
- Al final aparece el jefe **«El tráfico eterno»**: buses que tapan 2 carriles. El carril libre cambia en cada oleada.
- Pantallas:
  - Inicio: la ruta y la hora, y el botón JUGAR. Café, tamal, obstáculos y el peatón se explican la primera vez que aparecen.
  - Juego.
  - **«Llegaste a Build & Pitch a las …»** y los puntos por dejar pasar peatones.
  - **«No llegaste»**.
  - Las dos pantallas finales tienen OTRA VEZ (misma semilla) y RETAR A UN CUATE (share nativo; si no hay, copia texto y link; si tampoco, muestra el texto).
- Mensajes de humor según lo que pasa. Nunca se repite el mismo dos veces seguidas. Están en `src/data.js` (`LINES`), incluidas las seis frases del corte.
- El récord se guarda en `localStorage` (`chapinvilla.v1`). No hay backend ni cuentas.
- Una corrida limpia dura ~84 s reales. El límite es 90 s. 1 segundo real = 1 minuto en el reloj (salís de tu casa a las 6:30 y el plazo es las 8:00). Si el estrés se llena, la energía baja más rápido; el tamal lo baja y además da un poco de energía.

### Fuera del MVP (para después)
- Los niveles 2 a 5: La quincena, Invierno chapín, Hoy no se pasa y Trámite pendiente.
  - Si sobra tiempo antes del 18/11, el primer candidato es el nivel 3 (Invierno chapín), porque reusa los carriles con lluvia y charcos.
- Los logros, los tres finales y el modo desesperación completo.

## Arquitectura (Arquitecto)
- JS vanilla, Canvas 2D y Web Audio. El navegador solo recibe **`index.html`**.
- El build usa esbuild y Terser como dependencias de desarrollo. No entran al archivo publicado.
- Resolución lógica de **480×270**. La simulación sigue en **unidades de mundo** (calle de 108, carril de 36, jugador en 142) y `geom.js` traduce a píxeles con un factor `Z = 1.5`: la física no cambió, solo la densidad de píxeles. Así el carril pasa de 36 a 54 px de lienzo y entran **27 columnas de arte** por carril en vez de 18.
- Los sprites se dibujan con `SCALE = 2`, así que cada píxel de arte son 2×2 de lienzo y nada queda borroso. El alto de cada sprite en filas es `alto_de_colisión × 2 / 1.5`, para que el dibujo y la caja de choque coincidan.
- En la página el canvas se agranda para llenar el ancho; desde el doble queda en múltiplos enteros, con `imageSmoothingEnabled = false` y `image-rendering: pixelated` / `crisp-edges`.
- Loop con `requestAnimationFrame` y paso fijo de 1/60. Pausa con Esc, al ocultar la pestaña, al reiniciar y en game over.
- Sprites en matrices de caracteres en `src/data.js`, **vista de arriba para todo** (calles, edificios, vehículos, gente): el frente mira hacia arriba de la pantalla. Antes los vehículos estaban dibujados de espaldas sobre un mundo visto desde arriba, y por eso todo se leía como un cuadrado. Se dibujan a escala 2; el jugador ocupa las 18 columnas del carril (36 px) porque es lo más cercano a la cámara.
  - Paleta con un rol por color: 0 tinta (contornos), 1 verde, 2 ámbar, 3 naranja, 4 azul, 5 crema, 6 asfalto, 7 piel. El asfalto y los contornos eran el mismo `#282B35`, así que ningún vehículo tenía borde visible.
  - **Vista de arriba para todo**: el frente mira hacia arriba de la pantalla. Antes los vehículos estaban dibujados de espaldas sobre un mundo cenital, y por eso todo se leía como un cuadrado.
  - **Los sprites se empaquetan en el build** (`scripts/pack.js` + `scripts/pack-plugin.js`): 3 bits por píxel, 4 caracteres base64 por 8 píxeles. El arte ASCII se queda legible en `src/data.js`; solo `dist/` lleva el blob. Ahorra ~1 200 bytes. El índice 7 empaquetado significa aire.
- Los niveles se definen como **datos** (`LEVELS` en `src/data.js`). El simulador no tiene un `if` por número de nivel.
- El choque compara el carril comprometido (`laneT`) y la posición en Z. Cambiar de carril es inmediato para la colisión; el dibujo se desliza.
- Una GitHub Action (`.github/workflows/size.yml`) falla si `dist/` pasa de 32 768 bytes sin comprimir, si hay más de un archivo, o si `index.html` no coincide con `dist/index.html`. También imprime el tamaño Brotli.

## Mapa del repo
- `src/data.js` — paleta, sprites, catálogo, frases, nivel 1, rangos.
- `src/sim.js` — semilla, generación y paso de la simulación. Sin DOM.
- `src/geom.js` — 320×180, carriles, carril ocupado.
- `src/render.js` — canvas.
- `src/audio.js` — Web Audio. **Solo motor y efectos**: no hay música (salió para pagar bytes). El motor sube con la velocidad y el turbo y se calla al pausar, al perder y en mudo. El primer `pointerdown`, `touchstart` o `keydown` llama a `unlock()`, reproduce un wav mudo en un `<audio>` (data URI) para el switch de silencio del iPhone y abre el contexto. El master es 0.9. El mudo se guarda en `localStorage` y no arranca en true.
- `src/humor.js` — rota frases sin repetir la anterior.
- `src/main.js` — pantallas, input, loop.
- `src/shell.html` + `src/style.css` — se inlinean en el build.
- `scripts/build.js`, `scripts/size.js`, `scripts/serve.js`.
- `scripts/pack.js`, `scripts/pack-plugin.js` — empaquetado de sprites del build; `test/pack.test.js` verifica el viaje de ida y vuelta.
- `test/sim.test.js` — semilla, fairness, piloto, frases.
- `index.html` — artefacto que sirve GitHub Pages (raíz).
- `dist/index.html` — salida del build. Está en `.gitignore`; CI lo regenera.

## UI (Lienzo)
- El HUD va en una sola franja arriba del canvas: ENERGÍA, ESTRÉS (en naranja), TIEMPO (reloj + barra) y PUNTOS. Los nombres van en 14px y negrita para que se lean. En el teléfono el HUD es una grilla 2×2.
- El texto de humor va en una línea debajo del canvas.
- El título CHAPINVILLA va solo, centrado y grande (26 px en el teléfono, 30 en compu), con SONIDO y PAUSA debajo. Antes compartía fila con los botones y quedaba corrido.
- Los botones táctiles son **flechas dibujadas con CSS** (bordes), sin texto y sin imágenes: `aria-label` los nombra para lectores de pantalla. La barra de turbo vive dentro del botón de acelerar.
- Las pantallas de inicio, pausa, victoria y derrota son un **`<dialog>` modal** con `::backdrop`: tapan el juego en vez de empujarlo. Ojo con la trampa: una regla propia `#panel{display:flex}` le gana al `dialog:not([open]){display:none}` del navegador y el diálogo cerrado se sigue pintando; por eso el selector es `#panel[open]`.
- Los botones táctiles (IZQ, ACELERA, DER) son grandes y quedan debajo del humor.
- En compu: flechas o WASD, Espacio (o W / flecha arriba) acelera, S / flecha abajo frena, Esc pausa. En el teléfono: swipe y botones. Arriba, el botón CON SONIDO / EN MUDO.
- Ningún efecto de estrés tapa las barras.

## Datos (Pulso)
Energía, estrés y tiempo son medidores del juego, no datos reales. El reloj es ficción: un segundo de juego es un minuto de la mañana.

## Spec cerrado: puntaje unificado (Etapa 1)
**Intención.** Luis juega y no sabe qué persigue: el puntaje no se entiende y ganar no tiene consecuencia. Hoy `run.q` solo sube al frenar por un peatón (+8, seis por corrida → máximo 48), el verbo principal (esquivar, ~38 veces por corrida) no paga nada, y llegar temprano tampoco. Ganar y puntuar son cosas separadas. La intención es que sean la misma cosa: **ganar es llegar; el puntaje es qué tan bien llegaste**, y que la pantalla final responda «¿cómo me fue?» contra una referencia.

**Medido antes de diseñar** (pilotos sobre 24 semillas, `/tmp/medir*.mjs`): el tiempo de llegada es casi constante (84.3 s sin choques) porque la velocidad no la manda el jugador, la mandan los choques y el boost; frenar por los seis peatones cuesta solo 0.75 s. O sea que «llegar temprano» no es un gradiente de habilidad grande: el gradiente real es **no chocar**. Con `dodge×2` un piloto golpeado (3.5 choques) superaba al limpio que ignora peatones (160 vs 151) — inaceptable, por eso `dodge×3` y choque `−15`.

**Contrato observable.**
- Un solo número en el HUD: **PUNTOS** (antes CRUCE). Sube durante la partida, no solo al final.
- Cuatro fuentes visibles y una penalización:
  - esquivar limpio un obstáculo: **+3** (`dodgePoint`). El peatón ignorado no cuenta como esquive.
  - dejar pasar al peatón: **+8** (`crossBonus`, ya existía).
  - chocar: **−15** (`hitPenalty`), con piso en 0.
  - al llegar: minutos antes de las 8:00 **×6** (`earlyPoint`) + energía restante **×0.5** (`motoFactor`).
- La pantalla de victoria muestra el **desglose** fuente por fuente, el total, el récord y un **rango**.
- Rangos (`RANKS`, de mayor a menor): **205 Leyenda de la hora pico** · **170 Chapín apurado** · **120 Trafiqueado** · **0 Peatón con moto**. El rango máximo exige haber dejado pasar gente, no solo manejar rápido: los nombres enseñan los valores del juego sin tutorial.
- `localStorage` guarda el mejor **puntaje** total (antes, mejor cruce). Los récords viejos (≤48) se superan solos; no hace falta migrar.

**Criterios de aceptación.**
1. Esquivar un obstáculo sin chocarlo suma `dodgePoint`; la misma semilla da la misma calle y el mismo puntaje.
2. Chocar resta `hitPenalty` y el puntaje nunca queda en negativo.
3. Llegar más temprano da más puntos de tiempo, con la misma semilla y el mismo resto.
4. Frenar por el peatón sigue sumando `crossBonus`; atropellarlo no suma y además resta.
5. Un piloto limpio que deja pasar peatones puntúa **más** que uno igual de limpio que los ignora, y ese más que uno golpeado (regresión de balance sobre 16 semillas).
6. `rankOf` devuelve el rango correcto en los cuatro umbrales.
7. Todo cabe en ≤ 32 768 bytes sin comprimir y `index.html` sigue idéntico a `dist/index.html`.

**Fuera de alcance.** Niveles 2 y 3 (Etapa 2, solo si sobran bytes y el rango queda como llave de desbloqueo), logros, tres finales, modo desesperación.

**Resultado (5 nov 2026).** Cerrado con los siete criterios en verde. Verificado en Chrome headless vía CDP (capturas en `/tmp/shots`, arnés desechable en `/tmp/shoot.mjs` con un build de depuración que expone `__chapin()`; el hook no existe en el repo): el inicio muestra la tabla de valores, durante el juego cada esquive suelta un `+3` flotante y el HUD suma, la victoria desglosa las cuatro fuentes alineadas con total y rango, la derrota muestra lo acumulado, y a 320 px no hay overflow ni errores de consola. `localStorage.chapinvilla.v1.best` ahora guarda el puntaje total; los récords viejos (≤48) se superan solos.

**El muro de bytes.** Quedan **1 192 bytes** de los 32 768. La Etapa 2 no cabe así. Medido: los sprites son ~3 180 bytes del bundle (las matrices ASCII con `\n` de 2 bytes por fila). La palanca es empaquetarlos a 3 bits por píxel **en el build** (el arte ASCII se queda legible en `src/data.js`, solo `dist/` lleva el blob) con un decodificador de ~4 líneas: ~1 400 bytes libres sin tocar un píxel. Eso más recortes menores es lo que habilita los niveles 2 y 3.

## Cuándo está listo (Producto)
- [x] Pesa ≤ 32 768 bytes sin comprimir, medido en CI (script + Action).
- [x] Se juega en el teléfono (botones y swipe) y en la compu (teclado). Verificado en viewport 390×844 y 1100×920.
- [x] Una partida limpia dura ~165 s; el tope es 180 s.
- [x] Al perder está «OTRA VEZ» sin buscarlo.
- [x] El link `?viaje=` reproduce la misma calle. El origen y el destino no cambian con la semilla: siempre desde tu casa hasta Build & Pitch.
- [x] No hay requests de red externas ni excepciones en consola (Chrome headless).

## Responsables
- **Construcción:** Forja, el agente ingeniero de Luis.
- **Coordinación:** G.
- **Consultas:** Dev Team (Arquitecto, Producto, Lienzo y Pulso).

## Bitácora
- 2026-11-05: Luis manda el PRD de Chapinvilla. El Dev Team lo revisa y dice que cumple con cambios. Se fusiona con «Llegá a la UVG» y se acuerda el nivel 1 como MVP. Luis da el OK para construir solo el nivel 1, «y vamos viendo».
- 2026-11-05 (tarde): Nivel 1 jugable en un solo `index.html`. Sin comprimir **27652** bytes. Brotli **9415** bytes (meta interna ~24576). Action de tamaño en `.github/workflows/size.yml`. Pruebas de simulación en verde: la misma semilla reconstruye la calle, nunca se tapan 3 carriles, un piloto atento llega en ~84 s sin choques y quedarse en un carril pierde. En Chrome: JUGAR, pausa, OTRA VEZ, récord en `localStorage`, humor sin repetición inmediata, y RETAR A UN CUATE arma el texto con el link. El repo https://github.com/loconluis/chapinvilla existe, público y sin commits. Desde esta máquina `git push` a GitHub pide usuario: no hay `gh auth`. El push normal (sin force) y Pages en `main` `/` están escritos en el README. Falta ejecutarlos con la sesión de `loconluis`.
- 2026-11-05 (publicación): Subido a GitHub. `main` de https://github.com/loconluis/chapinvilla tiene el nivel 1 (commit `404c581`, encima del commit inicial `afe5bf9`; push normal, sin force). `CONTEXTO.md` quedó en la raíz. `index.html` publicado: **27652** bytes sin comprimir, Brotli calidad 11: **9415** bytes. Pages no quedó encendido: `POST /repos/loconluis/chapinvilla/pages` con `source.branch=main` y `source.path=/` respondió **403** (`pages=write` y `administration=write`; el token de la integración no los tiene). `has_pages` sigue en false. https://loconluis.github.io/chapinvilla/ responde **301** a http://resume.luislocon.dev/chapinvilla/ porque el sitio de usuario `loconluis/loconluis.github.io` tiene CNAME `resume.luislocon.dev`. Ese host apunta a Vercel (no a las IP de GitHub Pages) y `/chapinvilla` da 404. Aunque alguien encienda Pages en Settings → Deploy from a branch → `main` → `/ (root)`, GitHub va a servir el proyecto bajo ese dominio heredado, salvo que se quite el CNAME del sitio de usuario o este repo tenga su propio dominio.
- 2026-11-05 (claridad, origen y sonido): Luis jugó https://chapinvilla.vercel.app y pidió entender el propósito (también qué pasa si se come el tamal), salir siempre desde su casa hasta Build & Pitch, y poder oír el juego. El inicio ahora dice el objetivo y qué hace cada objeto. La primera vez que se agarra café, tamal o quetzales, el aviso dice qué subió o bajó; las veces siguientes sigue el humor. ENERGÍA, ESTRÉS y TIEMPO quedaron en 14px y negrita (el estrés, en naranja). Se quitaron los orígenes al azar y la UVG: el viaje es siempre desde tu casa (6:30) hasta Build & Pitch (8:00). `?viaje=` sigue cambiando los obstáculos, no el lugar. El final, el compartir y el cartel de la meta dicen Build & Pitch. Sonido: `unlock()` en el primer toque, tap o tecla; el mudo no arranca activado; el master pasó de 0.22 a 0.9 y las voces subieron para que se escuchen sin saturar; en ese gesto también suena un wav mudo para el switch de silencio del iPhone; el botón dice CON SONIDO o EN MUDO. `npm run stage` dejó `index.html` igual a `dist/index.html`: **28890** bytes sin comprimir, Brotli calidad 11: **9761** bytes. Pruebas en verde. No se pudo probar el switch de silencio en un iPhone de verdad.
- 2026-11-05 (puntaje y obstáculos): Luis seguía sin ver para qué juntar quetzales ni qué hacen los obstáculos. El inicio quedó en la ruta y la hora. El medidor se llama PUNTAJE. El primer quetzal dice que suma al puntaje y no decide si llegás; el final y el reto repiten eso. La primera vez que aparece cada obstáculo avisa que baja energía y sube estrés. `index.html`: **29384** bytes sin comprimir, Brotli **9951**. Pruebas en verde.
- 2026-11-05 (peatón y canvas): Luis aclaró que juntar quetzales como puntaje no tiene sentido. Esos pickups salieron. Frenar en el carril de un peatón lo deja pasar y suma 8 (medidor CRUCE). Atropellarlo no suma y baja energía y estrés. El aviso sale al verlo; el final y el reto hablan de esos bonos. Llegar a Build & Pitch sigue siendo ganar. El bitmap queda en 320×180 y en la página se agranda (1100×920 → 960×540). `index.html`: **30124** bytes sin comprimir, Brotli **10228**. Pruebas 9/9.
- 2026-11-05 (sin música): Luis pidió sacar la música y dejar solo los efectos. Se fueron `MEL`, `BASS`, el planificador de notas de `follow()` y `resetMusic()`. Queda el motor (sube con la velocidad y el turbo) y los siete efectos: choque, objeto, bono, turbo, arranque, victoria y derrota. **32049** bytes sin comprimir, Brotli **11375**. Pruebas 18/18. Quedan **719** bytes: los niveles 2 y 3 ya entran si reusan los obstáculos actuales.
- 2026-11-05 (motos, iconos y modal): Luis aprobó camionetas, buses, carros, hoyos y los tres objetos, pero las motos seguían raras; pidió iconos en los botones, el título más grande y centrado, y las pantallas de resultado en un diálogo. La moto estaba cargada: el manubrio naranja la hacía leer como sombrero. Ahora es dos ruedas + manubrio fino oscuro + casco redondo, y el único naranja es la luz trasera; el motorista usa chaqueta azul para no confundirse con el jugador (verde). Los tres botones táctiles son flechas en CSS con `aria-label`; el parlante de sonido se probó dibujado en CSS y costaba ~370 bytes, así que quedó etiqueta corta SONIDO/MUDO. Título a 26/30 px centrado. Las pantallas pasaron a `<dialog>` modal. Dos bugs de especificidad/CSS encontrados mirando el navegador: `#pad button::before` le ganaba a `#bL::before` (las flechas no se dibujaban) y `#panel{display:flex}` le ganaba al `display:none` del diálogo cerrado (un cuadro verde flotando sobre el título). **32284** bytes sin comprimir, Brotli **11500**. Pruebas 18/18.
- 2026-11-05 (resolución y arte): Luis dijo que los assets no se entendían: motos, camionetas, peatón, café, todo leía como cuadrados, y preguntó cómo saber cuándo puede acelerar. Causa raíz: el mundo estaba visto desde arriba pero los vehículos dibujados de espaldas, el asfalto y los contornos compartían el mismo `#282B35` (ningún vehículo tenía borde visible), y el detalle estaba topado a 18 columnas de arte por carril. Se subió el lienzo a **480×270** con factor `Z = 1.5` en `geom.js` (la simulación no se tocó), el carril pasó a 54 px y ahora entran **27 columnas de arte**. Se redibujó todo en vista de arriba: el jugador ocupa el carril entero porque es lo más cercano a la cámara, la camioneta es ancha con parabrisas y luneta, el `cambia` es un **taxi ámbar**, el bus es largo. La paleta tiene un rol por color (tinta / verde / ámbar / naranja / azul / crema / asfalto) y el índice 7 quedó reservado para el aire del empaquetado. Los peatones ahora están parados en **pasos peatonales dibujados**, y lo que se agarra lleva **marco amarillo** para no confundirse con lo que choca. Se quitó la segunda matriz de la moto: el rebote se hace con un desplazamiento. Presupuesto: el arte nuevo costó ~800 bytes y el empaquetado devolvió 1 875; Terser quedó con `toplevel` y `unsafe`. Pruebas 18/18 (se sumaron cuatro del empaquetado, que encontraron dos bugs: la piel pintada con el índice 7 se volvía transparente, y el relleno de bits corrompía la última fila).
- 2026-11-05 (puntaje unificado, Etapa 1): Luis jugó y no entendió ni el puntaje ni para qué ganar: `run.q` solo subía al frenar por un peatón (máximo 48 por corrida), esquivar —el verbo principal, ~38 veces por corrida— no pagaba nada, y llegar temprano tampoco. Se midió primero con pilotos sobre 24 semillas: la llegada es casi constante (84.3 s) porque la velocidad no la manda el jugador, la mandan los choques; frenar por los seis peatones cuesta 0.75 s; y con `dodge×2` un piloto golpeado superaba al limpio que ignora peatones (160 vs 151). Fórmula final: esquive +3, peatón +8, choque −15, al llegar minutos antes de las 8:00 ×6 y energía restante ×0.5; rangos 205 «Leyenda de la hora pico», 170 «Chapín apurado», 120 «Trafiqueado», 0 «Peatón con moto» — el de arriba exige haber dejado pasar gente. El HUD dice PUNTOS y suma en vivo con números flotantes en el canvas; la victoria muestra el desglose fuente por fuente, el total y el rango; la derrota muestra lo acumulado. Salieron el bloque de «oleada limpia» del jefe (redundante ahora que cada bus suma) y el favicon grande. Pruebas 14/14, incluida la regresión de balance (limpio y generoso > apurado > golpeado). `index.html`: **31576** bytes sin comprimir (96.4 % del tope), Brotli **10760**. Verificado en Chrome headless con capturas: inicio, juego con floats, victoria, derrota y 320 px sin overflow ni errores de consola. Quedan 1 192 bytes: la Etapa 2 necesita antes empaquetar los sprites en el build (~1 400 bytes libres).
