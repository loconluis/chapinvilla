import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { brotliCompressSync, constants } from "zlib";

function walk(dir) {
  let total = 0;
  const files = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      const sub = walk(path);
      total += sub.total;
      files.push(...sub.files);
    } else {
      total += st.size;
      files.push(path);
    }
  }
  return { total, files };
}

const { total, files } = walk("dist");
const buf = Buffer.concat(files.sort().map((f) => readFileSync(f)));
const br = brotliCompressSync(buf, {
  params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
});
const limit = 32768;
const brotliTarget = 24576;
console.log("files", files.join(", "));
console.log("uncompressed", total);
console.log("brotli", br.length);
console.log("budget", total + "/" + limit, "(" + ((total / limit) * 100).toFixed(1) + "%)");
console.log("brotli-target", br.length + "/" + brotliTarget, "(" + ((br.length / brotliTarget) * 100).toFixed(1) + "%)");
if (files.length !== 1 || !files[0].endsWith("index.html")) {
  console.error("FAIL: la publicación tiene que ser un solo index.html");
  process.exit(1);
}
if (total > limit) {
  console.error("FAIL: el payload sin comprimir pasa de 32768 bytes");
  process.exit(1);
}
