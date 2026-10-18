// ─────────────────────────────────────────────────────────────────────────────
// dev-server.mjs
//
// Run the whole project locally with plain Node, no Vercel account needed:
//
//   npm run dev            → uses your ANTHROPIC_API_KEY from .env
//   npm run dev:mock       → no key, no cost: canned answers (lib/mock.js)
//
// It serves public/ as static files and sends POST /api/chat to the same
// handler Vercel runs in production, so what you test is what you ship.
// ─────────────────────────────────────────────────────────────────────────────

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { Readable } from "node:stream";

// Load .env if present (Node 20.6+). Real environment variables win.
try { process.loadEnvFile?.(".env"); } catch { /* no .env file, fine */ }

const { POST } = await import("./api/chat.js");
const PORT = Number(process.env.PORT) || 3000;
const ROOT = join(process.cwd(), "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".pdf": "application/pdf", ".svg": "image/svg+xml", ".png": "image/png" };

createServer(async (req, res) => {
  try {
    if (req.url === "/api/chat") {
      if (req.method !== "POST") return res.writeHead(405).end();
      // Turn Node's request into a standard Request, call the handler, stream its Response back.
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const response = await POST(new Request(`http://localhost${req.url}`, { method: "POST", headers: req.headers, body: Buffer.concat(chunks) }));
      res.writeHead(response.status, Object.fromEntries(response.headers));
      return response.body ? Readable.fromWeb(response.body).pipe(res) : res.end();
    }
    // Static files. normalize() + the startsWith check stop "../" escapes.
    const path = normalize(join(ROOT, req.url === "/" ? "index.html" : decodeURIComponent(req.url.split("?")[0])));
    if (!path.startsWith(ROOT)) return res.writeHead(403).end();
    const file = await readFile(path);
    res.writeHead(200, { "content-type": TYPES[extname(path)] || "application/octet-stream" }).end(file);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(PORT, () => {
  const mode = process.env.ASSISTANT_MOCK === "1" ? "mock mode, no API calls" : "live, using ANTHROPIC_API_KEY";
  console.log(`Assistant running at http://localhost:${PORT} (${mode})`);
});
