import type { Server } from "node:http";

export function createWorkerWebServer(
  options?: Readonly<{ root?: string; productionHttps?: boolean; apiOrigin?: string }>
): Server;

export function parseRange(
  header: string | undefined,
  size: number
): { start: number; end: number } | "invalid" | null;
