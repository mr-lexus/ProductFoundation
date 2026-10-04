import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const dist = path.resolve(import.meta.dirname, "../dist");
let sequence = 0;
const contentTypes = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png"
};

createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1:4173");
  response.setHeader("Cache-Control", "no-store");
  if (/^\/(rpc|health|metrics)(\/|$)/.test(url.pathname)) {
    sequence += 1;
    response.setHeader("Content-Type", "application/json");
    if (url.pathname === "/rpc/v1/system-ping" && request.method === "POST") {
      response.end(
        JSON.stringify({
          ok: true,
          data: { message: "Foundation is ready.", platform: "web", status: "ready" },
          meta: { requestId: `test-${sequence}`, servedAt: new Date().toISOString() }
        })
      );
    } else response.end(JSON.stringify({ sequence }));
    return;
  }
  const filename = path.resolve(dist, `.${decodeURIComponent(url.pathname)}`);
  if (!filename.startsWith(`${dist}${path.sep}`) && filename !== dist) {
    response.writeHead(403).end();
    return;
  }
  try {
    const data = await readFile(filename);
    response.setHeader(
      "Content-Type",
      contentTypes[path.extname(filename)] ?? "application/octet-stream"
    );
    response.end(data);
  } catch {
    if (request.headers["sec-fetch-mode"] === "navigate" || url.pathname === "/") {
      response.setHeader("Content-Type", "text/html");
      response.end(await readFile(path.join(dist, "index.html")));
    } else response.writeHead(404).end();
  }
}).listen(4173, "127.0.0.1");
