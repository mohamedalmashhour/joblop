export function createLogger(scope: string) {
  return {
    info(message: string) {
      if (process.env.NODE_ENV !== "test") {
        console.info(`[${scope}] ${message}`);
      }
    }
  };
}
