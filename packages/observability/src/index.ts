export type LogLevel = "info" | "warn" | "error";
export type LogValue = string | number | boolean | null;
export type LogFields = Readonly<Record<string, LogValue>>;

type LogRecord = Readonly<{
  timestamp: string;
  level: LogLevel;
  service: string;
  event: string;
}> &
  LogFields;

const sensitiveField = /authorization|cookie|credential|email|password|secret|token/i;

export function createLogger(
  service: string,
  options: Readonly<{
    write?: (record: string) => void;
    now?: () => Date;
  }> = {}
) {
  const write =
    options.write ??
    (process.env.NODE_ENV === "test"
      ? () => undefined
      : (record: string) => {
          console.info(record);
        });
  const now = options.now ?? (() => new Date());

  function emit(level: LogLevel, event: string, fields: LogFields = {}) {
    const safeFields = Object.fromEntries(
      Object.entries(fields).filter(
        ([key, value]) => !sensitiveField.test(key) && isLogValue(value)
      )
    );
    const record: LogRecord = {
      timestamp: now().toISOString(),
      level,
      service,
      event,
      ...safeFields
    };
    write(JSON.stringify(record));
  }

  return {
    info: (event: string, fields?: LogFields) => emit("info", event, fields),
    warn: (event: string, fields?: LogFields) => emit("warn", event, fields),
    error: (event: string, fields?: LogFields) => emit("error", event, fields)
  };
}

function isLogValue(value: unknown): value is LogValue {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}
