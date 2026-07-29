export type LimiterLogger = ReturnType<typeof createLimiterLogger>;

export function createLimiterLogger(options: { write?: (record: string) => void } = {}) {
  const write =
    options.write ??
    ((record: string) => {
      process.stdout.write(`${record}\n`);
    });
  const emit = (
    level: "info" | "warn" | "error",
    event: string,
    fields: Readonly<Record<string, string | number | boolean | null>> = {}
  ) => {
    const safeFields = Object.fromEntries(
      Object.entries(fields).filter(
        ([key]) => !/authorization|cookie|credential|email|password|secret|token|key/i.test(key)
      )
    );
    write(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        service: "auth-limiter",
        event,
        ...safeFields
      })
    );
  };
  return {
    info: (event: string, fields?: Readonly<Record<string, string | number | boolean | null>>) =>
      emit("info", event, fields),
    warn: (event: string, fields?: Readonly<Record<string, string | number | boolean | null>>) =>
      emit("warn", event, fields),
    error: (event: string, fields?: Readonly<Record<string, string | number | boolean | null>>) =>
      emit("error", event, fields)
  };
}
