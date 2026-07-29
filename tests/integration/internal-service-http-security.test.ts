import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const internalServices = [
  "apps/auth-limiter/src/http.ts",
  "apps/candidate-source/src/http.ts",
  "apps/offer-delivery/src/http.ts",
  "apps/qa-reset/src/http.ts"
] as const;

describe("internal service HTTP security parity", () => {
  for (const file of internalServices) {
    it(`${file} emits unique request IDs and conservative response headers`, () => {
      const source = readFileSync(file, "utf8");
      expect(source).toContain("randomUUID");
      expect(source).toContain('response.setHeader("x-request-id", correlationId)');
      expect(source).toContain('"content-security-policy"');
      expect(source).toContain("frame-ancestors 'none'");
      expect(source).toContain('"permissions-policy"');
      expect(source).not.toContain('? value : "generated"');
    });
  }
});
