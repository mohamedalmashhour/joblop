import { afterEach, describe, expect, it, vi } from "vitest";
import { createTrustedAudienceRegistry, createTrustedServiceIdentityHeaders } from "./index";
import {
  createGoogleIdentityTokenProvider,
  createGoogleIdentityTokenVerifier,
  type GoogleIdTokenClientFactory,
  type GoogleIdentityVerificationClient
} from "./google";

const limiterAudience = "https://rwos-limiter-opaquehash-nn.a.run.app";
const candidateAudience = "https://rwos-candidate-opaquehash-nn.a.run.app";
const now = new Date("2026-07-28T12:00:00.000Z");
const syntheticToken = "synthetic.google.identity.token.for.local.testing.only";

afterEach(() => {
  vi.restoreAllMocks();
});

function clientFactory(options: {
  token?: string;
  expiresAt?: number;
  fail?: Error;
  calls?: string[];
}): GoogleIdTokenClientFactory {
  return {
    async getIdTokenClient(audience) {
      options.calls?.push(audience);
      if (options.fail) throw options.fail;
      const token = options.token ?? syntheticToken;
      return {
        credentials: {
          id_token: token,
          expiry_date: options.expiresAt ?? now.getTime() + 60 * 60_000
        },
        async getRequestHeaders() {
          return new Headers({ authorization: `Bearer ${token}` });
        }
      };
    }
  };
}

describe("Google trusted-service identity-token acquisition", () => {
  it("acquires the exact allowlisted audience and constructs identity headers", async () => {
    const calls: string[] = [];
    const registry = createTrustedAudienceRegistry({ "auth-limiter": limiterAudience });
    const provider = createGoogleIdentityTokenProvider({
      registry,
      runtimeEnvironment: "test",
      clientFactory: clientFactory({ calls }),
      now: () => now
    });

    await expect(
      createTrustedServiceIdentityHeaders({
        provider,
        registry,
        receiver: "auth-limiter"
      })
    ).resolves.toEqual({
      authorization: `Bearer ${syntheticToken}`
    });
    expect(calls).toEqual([limiterAudience]);
  });

  it("rejects unknown, malformed, insecure and non-origin audiences", async () => {
    expect(() => createTrustedAudienceRegistry({ api: "not a URL" })).toThrow(
      "RWOS_TRUSTED_AUDIENCE_INVALID"
    );
    for (const audience of [
      "http://rwos-api-opaquehash-nn.a.run.app",
      "https://rwos-api-opaquehash-nn.a.run.app/path",
      "https://rwos-api-opaquehash-nn.a.run.app?query=yes",
      "https://rwos-api-opaquehash-nn.a.run.app#fragment",
      "https://localhost",
      "https://127.0.0.1",
      "https://*.run.app"
    ]) {
      expect(() => createTrustedAudienceRegistry({ api: audience })).toThrow(
        "RWOS_TRUSTED_AUDIENCE_INVALID"
      );
    }

    const registry = createTrustedAudienceRegistry({ "auth-limiter": limiterAudience });
    const provider = createGoogleIdentityTokenProvider({
      registry,
      runtimeEnvironment: "test",
      clientFactory: clientFactory({}),
      now: () => now
    });
    await expect(
      provider.getToken({ audience: candidateAudience, receiver: "candidate-source" })
    ).rejects.toThrow("RWOS_TRUSTED_AUDIENCE_MISSING");
  });

  it("does not permit implicit ADC discovery in local or test execution", () => {
    const registry = createTrustedAudienceRegistry({ "auth-limiter": limiterAudience });
    expect(() =>
      createGoogleIdentityTokenProvider({ registry, runtimeEnvironment: "local" })
    ).toThrow("RWOS_GOOGLE_IDENTITY_CLIENT_FACTORY_REQUIRED");
    expect(() =>
      createGoogleIdentityTokenProvider({ registry, runtimeEnvironment: "test" })
    ).toThrow("RWOS_GOOGLE_IDENTITY_CLIENT_FACTORY_REQUIRED");
    expect(() =>
      createGoogleIdentityTokenProvider({
        registry,
        runtimeEnvironment: "production",
        clientFactory: clientFactory({})
      })
    ).toThrow("RWOS_GOOGLE_PRODUCTION_LIKE_TEST_CONFIGURATION_DENIED");
  });

  it("caches per audience, coalesces refresh and refreshes before expiry", async () => {
    let clock = now;
    let release: (() => void) | undefined;
    let acquisitions = 0;
    const registry = createTrustedAudienceRegistry({
      "auth-limiter": limiterAudience,
      "candidate-source": candidateAudience
    });
    const factory: GoogleIdTokenClientFactory = {
      async getIdTokenClient() {
        acquisitions += 1;
        if (acquisitions === 1) await new Promise<void>((resolve) => (release = resolve));
        const token = `${syntheticToken}.${acquisitions}`;
        return {
          credentials: {
            id_token: token,
            expiry_date: clock.getTime() + 60 * 60_000
          },
          async getRequestHeaders() {
            return new Headers({ authorization: `Bearer ${token}` });
          }
        };
      }
    };
    const provider = createGoogleIdentityTokenProvider({
      registry,
      runtimeEnvironment: "test",
      clientFactory: factory,
      now: () => clock
    });
    const first = provider.getToken({ audience: limiterAudience, receiver: "auth-limiter" });
    const concurrent = provider.getToken({ audience: limiterAudience, receiver: "auth-limiter" });
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    release!();
    expect(await first).toEqual(await concurrent);
    expect(acquisitions).toBe(1);
    await provider.getToken({ audience: candidateAudience, receiver: "candidate-source" });
    expect(acquisitions).toBe(2);
    clock = new Date(now.getTime() + 56 * 60_000);
    await provider.getToken({ audience: limiterAudience, receiver: "auth-limiter" });
    expect(acquisitions).toBe(3);
  });

  it("fails closed without leaking acquisition details or contacting the network", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const registry = createTrustedAudienceRegistry({ "auth-limiter": limiterAudience });
    const missingAdc = createGoogleIdentityTokenProvider({
      registry,
      runtimeEnvironment: "test",
      clientFactory: clientFactory({ fail: new Error(`missing ADC ${syntheticToken}`) }),
      now: () => now
    });
    await expect(
      missingAdc.getToken({ audience: limiterAudience, receiver: "auth-limiter" })
    ).rejects.toThrow("RWOS_IDENTITY_TOKEN_UNAVAILABLE");

    const malformed = createGoogleIdentityTokenProvider({
      registry,
      runtimeEnvironment: "test",
      clientFactory: clientFactory({ token: "short", expiresAt: Number.NaN }),
      now: () => now
    });
    await expect(
      malformed.getToken({ audience: limiterAudience, receiver: "auth-limiter" })
    ).rejects.toThrow("RWOS_IDENTITY_TOKEN_UNAVAILABLE");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe("Google trusted-service identity-token verification", () => {
  const payload = {
    aud: limiterAudience,
    sub: "synthetic-service-subject",
    email: "rwos-stg-browser-e2e@local-test.invalid",
    email_verified: true,
    iat: Math.floor(now.getTime() / 1_000) - 30,
    exp: Math.floor(now.getTime() / 1_000) + 300
  };

  it("returns only the verified identity bound to the exact audience", async () => {
    const calls: Array<{ idToken: string; audience: string }> = [];
    const verifier = createGoogleIdentityTokenVerifier({
      runtimeEnvironment: "test",
      client: verificationClient(payload, calls),
      now: () => now
    });
    await expect(
      verifier.verify({ token: syntheticToken, audience: limiterAudience })
    ).resolves.toEqual({
      subject: payload.sub,
      serviceAccountEmail: payload.email,
      audience: limiterAudience,
      issuedAt: new Date(payload.iat * 1_000),
      expiresAt: new Date(payload.exp * 1_000)
    });
    expect(calls).toEqual([{ idToken: syntheticToken, audience: limiterAudience }]);
  });

  it.each([
    ["wrong audience", { ...payload, aud: candidateAudience }],
    ["unverified email", { ...payload, email_verified: false }],
    ["expired", { ...payload, exp: Math.floor(now.getTime() / 1_000) }],
    ["future-issued", { ...payload, iat: Math.floor(now.getTime() / 1_000) + 61 }]
  ])("fails closed for %s", async (_label, invalidPayload) => {
    const verifier = createGoogleIdentityTokenVerifier({
      runtimeEnvironment: "test",
      client: verificationClient(invalidPayload),
      now: () => now
    });
    await expect(
      verifier.verify({ token: syntheticToken, audience: limiterAudience })
    ).rejects.toThrow("RWOS_GOOGLE_IDENTITY_TOKEN_INVALID");
  });

  it("does not allow implicit external verification in local tests", () => {
    expect(() => createGoogleIdentityTokenVerifier({ runtimeEnvironment: "test" })).toThrow(
      "RWOS_GOOGLE_IDENTITY_VERIFICATION_CLIENT_REQUIRED"
    );
  });
});

function verificationClient(
  payload: Record<string, unknown>,
  calls: Array<{ idToken: string; audience: string }> = []
): GoogleIdentityVerificationClient {
  return {
    async verifyIdToken(input) {
      calls.push(input);
      return { getPayload: () => payload as never };
    }
  };
}
