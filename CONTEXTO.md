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
- Atributos: **energía**, **estrés** y **tiempo**.
  - El estrés sube con cada choque. La música va más rápido y la calle tiembla. El temblor no toca las barras (el HUD está fuera del canvas). A partir de 75 de estrés la energía baja un poco más rápido. No hay modo desesperación completo.
- Objetos (3): café chapín (energía), tamal (baja estrés y da un poco de energía) y quetzales (puntos).
- El viaje es siempre **desde tu casa** (salís a las 6:30) hasta **Build & Pitch** (plazo a las 8:00). No hay orígenes al azar. La semilla del link (`?viaje=`) cambia los obstáculos, no los nombres de los lugares. El mismo link da la misma calle.
- La dificultad sube cada 15 s (la moto va más rápido, con tope). En el jefe la velocidad se contiene para que se pueda leer.
- Al final aparece el jefe **«El tráfico eterno»**: buses que tapan 2 carriles. El carril libre cambia en cada oleada.
- Pantallas:
  - Inicio: el objetivo (llegar a Build & Pitch a tiempo, sin vaciar la energía ni llenar el estrés), qué hace cada objeto y el botón JUGAR. La primera vez que agarrás café, tamal o quetzales, un aviso dice qué subió o bajó.
  - Juego.
  - **«Llegaste a Build & Pitch a las … con Q…»**.
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
- `src/audio.js` — Web Audio (moto, melodía, efectos). El primer `pointerdown`, `touchstart` o `keydown` llama a `unlock()`, reproduce un wav mudo en un `<audio>` (data URI) para el switch de silencio del iPhone y abre el contexto. El master es 0.9. El mudo se guarda en `localStorage` y no arranca en true.
- `src/humor.js` — rota frases sin repetir la anterior.
- `src/main.js` — pantallas, input, loop.
- `src/shell.html` + `src/style.css` — se inlinean en el build.
- `scripts/build.js`, `scripts/size.js`, `scripts/serve.js`.
- `test/sim.test.js` — semilla, fairness, piloto, frases.
- `index.html` — artefacto que sirve GitHub Pages (raíz).
- `dist/index.html` — salida del build. Está en `.gitignore`; CI lo regenera.

## UI (Lienzo)
- El HUD va en una sola franja arriba del canvas: ENERGÍA, ESTRÉS (en naranja), TIEMPO (reloj + barra) y Q. Los nombres van en 14px y negrita para que se lean.
- El texto de humor va en una línea debajo del canvas.
- Los botones táctiles (IZQ, ACELERA, DER) son grandes y quedan debajo del humor.
- En compu: flechas o WASD, Espacio (o W / flecha arriba) acelera, S / flecha abajo frena, Esc pausa. En el teléfono: swipe y botones. Arriba, el botón CON SONIDO / EN MUDO.
- Ningún efecto de estrés tapa las barras.

## Datos (Pulso)
Energía, estrés y tiempo son medidores del juego, no datos reales. El reloj es ficción: un segundo de juego es un minuto de la mañana.

## Cuándo está listo (Producto)
- [x] Pesa ≤ 32 768 bytes sin comprimir, medido en CI (script + Action).
- [x] Se juega en el teléfono (botones y swipe) y en la compu (teclado). Verificado en viewport 390×844 y 1100×920.
- [x] Una partida limpia dura ~84 s; el tope es 90 s.
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
