export type DeliveryLogger = Readonly<{
  info(event: string, fields?: Record<string, unknown>): void;
  warn(event: string, fields?: Record<string, unknown>): void;
  error(event: string, fields?: Record<string, unknown>): void;
}>;

const allowedFields = new Set([
  "attempt",
  "cleanupCount",
  "correlationId",
  "deliveryRecordHash",
  "durationMs",
  "eventType",
  "idempotencyHash",
  "manifestVersion",
  "operation",
  "organizationId",
  "releaseSha",
  "scenario",
  "serviceId",
  "status"
]);

export function createDeliveryLogger(write: (line: string) => void = console.log): DeliveryLogger {
  const log = (level: string, event: string, fields: Record<string, unknown> = {}) =>
    write(
      JSON.stringify({
        time: new Date().toISOString(),
        level,
        event,
        ...Object.fromEntries(Object.entries(fields).filter(([field]) => allowedFields.has(field)))
      })
    );
  return {
    info: (event, fields) => log("info", event, fields),
    warn: (event, fields) => log("warn", event, fields),
    error: (event, fields) => log("error", event, fields)
  };
}
