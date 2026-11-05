import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { DECODER, decode, pack } from "../scripts/pack.js";
import { SPRITES } from "../src/data.js";

test("empaquetar y desempacar devuelve el mismo sprite", () => {
  for (const [name, rows] of Object.entries(SPRITES)) {
    const art = rows.join("\n");
    const { data, w } = pack(art);
    assert.equal(w, rows[0].length, name);
    const back = decode(data, w);
    assert.deepEqual(back, rows, name);
    // 3 bits por píxel contra 1 byte por carácter: el blob tiene que ser menor
    assert.ok(data.length < art.length * 0.75, name + " " + data.length + " vs " + art.length);
    assert.match(data, /^[A-Za-z0-9+/]+$/, name);
  }
});

test("el decodificador inyectado hace lo mismo que el de desarrollo", () => {
  // Sin esto, un error en la cadena del build rompería el juego sin que ningún test chille.
  const inline = new Function("return " + DECODER)();
  for (const [name, rows] of Object.entries(SPRITES)) {
    const { data, w } = pack(rows.join("\n"));
    assert.deepEqual(inline(data, w), rows, name);
  }
});

test("el arte no usa el índice 7: es el aire empaquetado", () => {
  for (const [name, rows] of Object.entries(SPRITES)) {
    for (const row of rows) assert.doesNotMatch(row, /7/, name);
  }
});

test("el build publica un solo archivo y no lleva el ASCII del arte", () => {
  assert.ok(existsSync("dist"), "falta dist/: corré npm run build antes que npm test");
  const dist = readdirSync("dist");
  assert.deepEqual(dist, ["index.html"]);
  const html = readFileSync("dist/index.html", "utf8");
  assert.equal(html.includes(SPRITES.moto.join("")), false, "el ASCII se filtró al build");
  assert.equal(/src\/[a-z]+\.js/.test(html), false, "el build nombra archivos fuente");
});