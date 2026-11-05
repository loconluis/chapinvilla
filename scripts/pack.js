/**
 * Empaquetado de sprites para el build.
 *
 * El arte vive como matrices ASCII en `src/data.js` (legible, editable, testeable).
 * En `dist/` no se publica ese ASCII: cada píxel son 3 bits (0–6 color, 7 = aire)
 * y 4 caracteres base64 llevan 8 píxeles. Un sprite de 16×16 pasa de ~300 bytes
 * a 128. El decodificador que se inyecta pesa menos que un solo sprite.
 *
 * Dev y tests siguen leyendo ASCII; solo el archivo publicado se empaqueta.
 */

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Matriz ASCII → base64 de 3 bits por píxel. '.' se vuelve 7 (aire). */
export function pack(art) {
  const rows = art.trim().split("\n");
  const w = rows[0].length;
  const vals = [];
  for (const row of rows) {
    if (row.length !== w) throw new Error("sprite irregular: [" + row + "]");
    for (const ch of row) vals.push(ch === "." ? 7 : Number(ch));
  }
  while (vals.length % 8) vals.push(7);
  let out = "";
  for (let i = 0; i < vals.length; i += 8) {
    let n = 0;
    for (let k = 0; k < 8; k++) n = n * 8 + vals[i + k];
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }
  return { data: out, w };
}

/**
 * Fuente del decodificador que se inyecta en el bundle. `pack()` y esto tienen
 * que quedar de acuerdo; `test/pack.test.js` verifica el viaje de ida y vuelta.
 */
export const DECODER = `(p,w)=>{let s="",A="${B64}",r=[];for(let i=0;i<p.length;i+=4){let n=0;for(let k=0;k<4;k++)n=n*64+A.indexOf(p[i+k]);for(let k=7;k>=0;k--)s+=n>>3*k&7}for(let i=0;i<s.length-s.length%w;i+=w)r.push(s.slice(i,i+w).replace(/7/g,"."));return r}`;

/** Referencia al decodificador para el test de ida y vuelta. */
export const decode = (data, w) => {
  let s = "";
  let r = [];
  for (let i = 0; i < data.length; i += 4) {
    let n = 0;
    for (let k = 0; k < 4; k++) n = n * 64 + B64.indexOf(data[i + k]);
    for (let k = 7; k >= 0; k--) s += (n >> (3 * k)) & 7;
  }
  // El relleno del final nunca llega a una fila entera (siempre son <8 y w>=8).
  for (let i = 0; i < s.length - (s.length % w); i += w) r.push(s.slice(i, i + w).replace(/7/g, "."));
  return r;
};