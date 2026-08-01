import { createReadStream, existsSync, realpathSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { basename, extname, join, normalize, resolve, sep } from "node:path";
import process from "node:process";
import { URL } from "node:url";
import { fileURLToPath } from "node:url";

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".gif", "image/gif"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".ttf", "font/ttf"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"]
]);

/**
 * @param {{ root?: string; productionHttps?: boolean; apiOrigin?: string }} [options]
 */
export function createWorkerWebServer(options = {}) {
  const root = resolve(options.root ?? join(fileURLToPath(new URL(".", import.meta.url)), "dist"));
  const entry = join(root, "index.html");
  const apiOrigin = options.apiOrigin ? trustedApiOrigin(options.apiOrigin) : null;

  return createServer((request, response) => {
    applySecurityHeaders(response, options.productionHttps === true, apiOrigin);
    const pathname = safePathname(request.url);
    if (pathname === null) return sendText(response, 400, "Bad Request");
    if (pathname === "/health") {
      return sendJson(response, 200, {
        ok: true,
        service: "resident-workforce-os-worker-web",
        check: "liveness"
      });
    }
    if (pathname === "/ready") {
      const ready = existsSync(entry);
      return sendJson(response, ready ? 200 : 503, {
        ready,
        service: "resident-workforce-os-worker-web",
        check: "readiness"
      });
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.setHeader("allow", "GET, HEAD");
      return sendText(response, 405, "Method Not Allowed");
    }

    const requested = resolve(root, `.${normalize(pathname)}`);
    if (requested !== root && !requested.startsWith(`${root}${sep}`)) {
      return sendText(response, 400, "Bad Request");
    }
    const requestedExists = existsSync(requested) && statSync(requested).isFile();
    if (requestedExists && !isApprovedStaticFile(root, requested)) {
      return sendText(response, 404, "Not Found");
    }
    const file = requestedExists ? requested : entry;
    if (!existsSync(file)) return sendText(response, 503, "Service Unavailable");
    if (!isApprovedStaticFile(root, file)) return sendText(response, 503, "Service Unavailable");

    response.statusCode = 200;
    response.setHeader(
      "content-type",
      contentTypes.get(extname(file)) ?? "application/octet-stream"
    );
    response.setHeader(
      "cache-control",
      file === entry ? "no-store" : "public, max-age=31536000, immutable"
    );
    if (request.method === "HEAD") return response.end();
    createReadStream(file).pipe(response);
  });
}

function isApprovedStaticFile(root, file) {
  const relativeName = file.slice(root.length + 1);
  if (!relativeName || relativeName.split(sep).some((part) => part.startsWith("."))) return false;
  if (basename(file).startsWith(".") || !contentTypes.has(extname(file).toLowerCase()))
    return false;
  try {
    const resolvedFile = realpathSync(file);
    const resolvedRoot = realpathSync(root);
    return resolvedFile.startsWith(`${resolvedRoot}${sep}`);
  } catch {
    return false;
  }
}

function applySecurityHeaders(response, productionHttps, apiOrigin) {
  const connectSources = apiOrigin ? `'self' ${apiOrigin}` : "'self'";
  response.setHeader(
    "content-security-policy",
    `default-src 'self'; connect-src ${connectSources}; font-src 'self' data:; frame-ancestors 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'`
  );
  response.setHeader("permissions-policy", "camera=(), geolocation=(), microphone=(), payment=()");
  response.setHeader("referrer-policy", "strict-origin-when-cross-origin");
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("x-frame-options", "DENY");
  if (productionHttps) {
    response.setHeader("strict-transport-security", "max-age=31536000; includeSubDomains");
  }
}

function safePathname(value) {
  try {
    const pathname = decodeURIComponent(new URL(value ?? "/", "http://worker.local").pathname);
    return pathname.includes("\0") || pathname.split("/").includes("..") ? null : pathname;
  } catch {
    return null;
  }
}

function sendJson(response, status, body) {
  response.statusCode = status;
  response.setHeader("cache-control", "no-store");
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function sendText(response, status, body) {
  response.statusCode = status;
  response.setHeader("cache-control", "no-store");
  response.setHeader("content-type", "text/plain; charset=utf-8");
  response.end(body);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = readPort(process.env.PORT);
  const server = createWorkerWebServer({
    apiOrigin: process.env.WORKER_API_ORIGIN,
    productionHttps: process.env.RWOS_WORKER_HTTPS_BOUNDARY === "enabled"
  });
  const shutdown = () => server.close(() => process.exit(0));
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
  server.listen(port, "0.0.0.0", () => {
    process.stdout.write(`worker-web.started port=${port}\n`);
  });
}

function trustedApiOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.origin !== value || url.pathname !== "/") {
    throw new Error("RWOS_WORKER_API_ORIGIN_INVALID");
  }
  return url.origin;
}

function readPort(value) {
  const port = Number(value ?? "8080");
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("RWOS_WORKER_WEB_PORT_INVALID");
  }
  return port;
}
