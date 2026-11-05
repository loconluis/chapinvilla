import * as esbuild from "esbuild";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { minify } from "terser";
import { packSprites } from "./pack-plugin.js";

const css = (
  await esbuild.transform(readFileSync("src/style.css", "utf8"), {
    loader: "css",
    minify: true,
    target: "es2020",
  })
).code.trim();

const bundled = await esbuild.build({
  entryPoints: ["src/main.js"],
  bundle: true,
  format: "iife",
  write: false,
  minify: true,
  legalComments: "none",
  target: "es2020",
  plugins: [packSprites],
});

let js = bundled.outputFiles[0].text;
const tersed = await minify(js, {
  compress: { passes: 4, ecma: 2020, unsafe: true, unsafe_arrows: true, unsafe_methods: true, booleans_as_integers: true },
  mangle: { toplevel: true },
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
