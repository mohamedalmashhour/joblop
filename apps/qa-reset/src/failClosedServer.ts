import { createServer } from "node:http";

export function startQaResetFailClosedServer(port: number) {
  return createServer((request, response) => {
    response.setHeader("cache-control", "no-store");
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.setHeader("x-content-type-options", "nosniff");
    if (request.method === "GET" && request.url === "/health") {
      response.writeHead(200).end('{"status":"alive"}');
      return;
    }
    response.writeHead(503).end('{"status":"unavailable"}');
  }).listen(port, "0.0.0.0");
}
