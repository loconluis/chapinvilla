import { DECODER, pack } from "./pack.js";

/**
 * Plugin de esbuild: reemplaza el arte ASCII de `src/data.js` por el blob
 * empaquetado y cambia el helper `S` por el decodificador. Dev, tests y
 * `scripts/build.js` no ven este cambio; solo el archivo publicado.
 */
export const packSprites = {
  name: "pack-sprites",
  setup(build) {
    build.onLoad({ filter: /[\\/]data\.js$/ }, async (args) => {
      const { readFile } = await import("fs/promises");
      let src = await readFile(args.path, "utf8");
      let count = 0;
      let bytes = 0;
      src = src.replace(/S\(`([\s\S]*?)`\)/g, (all, art) => {
        const { data, w } = pack(art);
        count++;
        bytes += all.length - (data.length + String(w).length + 6);
        return `S("${data}",${w})`;
      });
      const helper = /const S = \(art\) => art\.trim\(\)\.split\("\\n"\);/;
      if (!helper.test(src)) throw new Error("no encontré el helper S en data.js");
      src = src.replace(helper, "const S=" + DECODER + ";");
      if (!count) throw new Error("no encontré sprites para empaquetar");
      process.stderr.write(`sprites empaquetados: ${count}, ${bytes} bytes menos\n`);
      return { contents: src, loader: "js" };
    });
  },
};