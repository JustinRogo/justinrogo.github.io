// Read-only source-tree preview; no backend or form submission handlers.
import http from "node:http";
import path from "node:path";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { buildV2 } from "./build.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
await buildV2({ watch: process.argv.includes("--watch") });
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
};
http
  .createServer(async (req, res) => {
    try {
      if (!["GET", "HEAD"].includes(req.method)) {
        res.writeHead(405).end();
        return;
      }
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      if (pathname === "/v2") {
        res.writeHead(301, { Location: "/v2/" }).end();
        return;
      }
      let file = path.resolve(root, `.${pathname}`);
      const relative = path.relative(root, file);
      if (
        relative.startsWith("..") ||
        path.isAbsolute(relative) ||
        relative.split(path.sep).some((p) => p.startsWith(".")) ||
        /\.(?:mjs|jsx|md|sql)$/i.test(file)
      ) {
        res.writeHead(404).end();
        return;
      }
      if ((await stat(file)).isDirectory())
        file = path.join(file, "index.html");
      const data = await readFile(file);
      res.writeHead(200, {
        "Content-Type": `${types[path.extname(file)] || "application/octet-stream"}; charset=utf-8`,
        "Cache-Control": "no-store",
      });
      res.end(req.method === "HEAD" ? undefined : data);
    } catch {
      res.writeHead(404).end();
    }
  })
  .listen(4392, "127.0.0.1", () =>
    console.log("V2 preview: http://127.0.0.1:4392/v2/"),
  );
