import { createServer } from "http";
import { readFile } from "fs/promises";
import { extname, join } from "path";

const port = Number(process.env.PORT) || 8741;
const root = process.cwd();
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    let path = decodeURIComponent(url.pathname);
    if (path === "/") path = "/index.html";
    if (path.includes("..")) {
      res.writeHead(400);
      res.end();
      return;
    }
    const body = await readFile(join(root, path));
    res.writeHead(200, {
      "content-type": types[extname(path)] || "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("no");
  }
}).listen(port, "127.0.0.1", () => {
  console.log("http://127.0.0.1:" + port);
});
