export type CandidateLogger = Readonly<{
  info(event: string, fields?: Record<string, unknown>): void;
  warn(event: string, fields?: Record<string, unknown>): void;
  error(event: string, fields?: Record<string, unknown>): void;
}>;

const safeFields = new Set([
  "correlationId",
  "durationMs",
  "manifestVersion",
  "operation",
  "organizationId",
  "releaseSha",
  "resultCount",
  "serviceId",
  "status"
]);

export function createCandidateLogger(
  write: (line: string) => void = console.log
): CandidateLogger {
  const log = (level: string, event: string, fields: Record<string, unknown> = {}) => {
    write(
      JSON.stringify({
        time: new Date().toISOString(),
        level,
        event,
        ...Object.fromEntries(Object.entries(fields).filter(([key]) => safeFields.has(key)))
      })
    );
  };
  return {
    info: (event, fields) => log("info", event, fields),
    warn: (event, fields) => log("warn", event, fields),
    error: (event, fields) => log("error", event, fields)
  };
}
