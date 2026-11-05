# Chapinvilla

La vida es difícil. El juego también.

Arcade de una sola pantalla para el nivel 1, **La hora pico**: salís en moto desde tu casa a las 5:00 y tenés que llegar a Build & Pitch antes de las 8:00 sin quedarte sin gasolina. El tráfico va subiendo con la mañana. El link `?viaje=` repite la misma calle; no cambia el lugar.

## Jugar

```bash
npm install
npm run build
npm start
```

Abrí http://127.0.0.1:8741 . El archivo que sirve el navegador es `index.html` (copia de `dist/index.html`). No descarga nada más.

Controles: flechas o WASD, Espacio acelera, S o flecha abajo frena, Esc pausa. En el teléfono, deslizá o usá IZQ / ACELERA / DER.

## Publicación

`npm run build` deja un único `dist/index.html`. `npm run size` imprime el tamaño sin comprimir y el Brotli. El build falla en CI si `dist/` pasa de **32768** bytes. La meta interna de Brotli es ~24 KB.

GitHub Pages: rama `main`, carpeta `/` (raíz). El `index.html` de la raíz es el artefacto publicado y tiene que ser idéntico a `dist/index.html` (`npm run stage` lo copia).

El repo público ya tiene el juego: `origin` es `git@github.com:loconluis/chapinvilla.git` y `main` está sincronizado. El push se hace desde una máquina con sesión de GitHub como `loconluis`.

GitHub Pages **sigue sin funcionar**: `loconluis.github.io/chapinvilla/` redirige a `resume.luislocon.dev/chapinvilla/` (404) porque el sitio de usuario tiene un CNAME a Vercel, y encenderlo por API respondió 403 (al token le falta `pages=write`). El link jugable del challenge es https://chapinvilla.vercel.app , que sirve el mismo `index.html` de la raíz.

## Medición

Hecho con Node 22, Brotli calidad 11:

- sin comprimir: 31979 bytes (97.6 % del tope de 32768)
- Brotli: ~11600 bytes

El lienzo lógico es 480×270 y la simulación trabaja en unidades de mundo (factor `Z = 1.5` en `geom.js`). Los sprites se publican empaquetados a 3 bits por píxel: el arte ASCII se queda en `src/data.js` y solo `dist/` lleva el blob.
