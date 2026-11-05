import * as esbuild from "esbuild";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { minify } from "terser";

const css = readFileSync("src/style.css", "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\s+/g, " ")
  .replace(/\s*([{}:;,])\s*/g, "$1")
  .trim();

const bundled = await esbuild.build({
  entryPoints: ["src/main.js"],
  bundle: true,
  format: "iife",
  write: false,
  minify: true,
  legalComments: "none",
  target: "es2020",
});

let js = bundled.outputFiles[0].text;
const tersed = await minify(js, {
  compress: { passes: 3, ecma: 2020 },
  mangle: true,
  format: { comments: false },
});
js = tersed.code || js;
js = js.replace(/<\/script/gi, "<\\/script");

const shell = readFileSync("src/shell.html", "utf8")
  .replace("__CHAPIN_CSS__", () => css)
  .replace("__CHAPIN_JS__", () => js);

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
writeFileSync("dist/index.html", shell);
console.log("dist/index.html", Buffer.byteLength(shell), "bytes");
