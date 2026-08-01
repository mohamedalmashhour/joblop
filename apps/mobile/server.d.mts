import type { Server } from "node:http";

export function createWorkerWebServer(
  options?: Readonly<{ root?: string; productionHttps?: boolean; apiOrigin?: string }>
): Server;
