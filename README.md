# Chapinvilla

La vida es difícil. El juego también.

Arcade de una sola pantalla para el nivel 1, **La hora pico**: salís en moto de Villa Nueva, Mixco, Antigua o zona 18 y tenés que llegar a la UVG antes de que se acabe el tiempo. El link `?viaje=` repite la misma calle.

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

El repo público ya existe y está vacío: https://github.com/loconluis/chapinvilla . Esta máquina no tiene sesión de GitHub, así que el push hay que hacerlo donde `gh` esté autenticado como `loconluis`:

```bash
git remote add github https://github.com/loconluis/chapinvilla.git
git push -u github main
gh api --method POST repos/loconluis/chapinvilla/pages \
  -f source[branch]=main \
  -f source[path]=/
```

`git ls-remote` no devolvió ramas: un push normal alcanza, sin `--force`. Si más adelante la rama remota tuviera solo el commit inicial vacío y el push normal fallara por historias distintas, recién ahí `git push --force-with-lease github main`.

En la web: Settings → Pages → Deploy from a branch → `main` → `/ (root)`. El juego queda en https://loconluis.github.io/chapinvilla/

## Medición

Hecho con Node 22, Brotli calidad 11:

- sin comprimir: 27652 bytes
- Brotli: 9415 bytes
