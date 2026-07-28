import { describe, expect, it } from "vitest";
import { createLogger } from "./index";

describe("structured logger", () => {
  it("writes machine-readable severity, service, event, time, and safe scalar fields", () => {
    const records: string[] = [];
    const logger = createLogger("api", {
      write: (record) => records.push(record),
      now: () => new Date("2026-07-27T12:00:00.000Z")
    });

    logger.warn("api.request.completed", {
      requestId: "req-1",
      statusCode: 503,
      durationMs: 12,
      ready: false
    });

    expect(records).toHaveLength(1);
    expect(JSON.parse(records[0]!)).toEqual({
      timestamp: "2026-07-27T12:00:00.000Z",
      level: "warn",
      service: "api",
      event: "api.request.completed",
      requestId: "req-1",
      statusCode: 503,
      durationMs: 12,
      ready: false
    });
  });

  it("drops fields whose names could contain credentials or direct contact data", () => {
    const records: string[] = [];
    const logger = createLogger("api", { write: (record) => records.push(record) });

    logger.error("api.request.failed", {
      requestId: "req-2",
      authorization: "Bearer secret",
      sessionToken: "secret",
      email: "person@example.com",
      cookieValue: "secret"
    });

    expect(JSON.parse(records[0]!)).toEqual(
      expect.objectContaining({
        level: "error",
        service: "api",
        event: "api.request.failed",
        requestId: "req-2"
      })
    );
    expect(records[0]).not.toContain("secret");
    expect(records[0]).not.toContain("person@example.com");
  });
});
