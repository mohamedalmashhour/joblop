import { afterEach, describe, expect, it, vi } from "vitest";
import { publicOrigin } from "./state";

const internal = "https://0.0.0.0:10000/api/auth/google/start";

afterEach(() => vi.unstubAllEnvs());

describe("publicOrigin", () => {
  it("uses the proxy's public host, not the server's internal address", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    const request = new Request(internal, {
      headers: { "x-forwarded-host": "joblop-employer.onrender.com", "x-forwarded-proto": "https" }
    });
    expect(publicOrigin(request)).toBe("https://joblop-employer.onrender.com");
  });

  it("takes the first host when the proxy sends a list", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    const request = new Request(internal, {
      headers: { "x-forwarded-host": "a.example.com, b.example.com" }
    });
    expect(publicOrigin(request)).toBe("https://a.example.com");
  });

  it("prefers a configured site address", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://employers.example.com/");
    const request = new Request(internal, { headers: { "x-forwarded-host": "other.example.com" } });
    expect(publicOrigin(request)).toBe("https://employers.example.com");
  });

  it("ignores a malformed forwarded host", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    const request = new Request("http://127.0.0.1:8081/x", {
      headers: { "x-forwarded-host": "evil.example.com/path?" }
    });
    expect(publicOrigin(request)).toBe("http://127.0.0.1:8081");
  });

  it("falls back to the request address for local development", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(publicOrigin(new Request("http://127.0.0.1:8081/x"))).toBe("http://127.0.0.1:8081");
  });
});
