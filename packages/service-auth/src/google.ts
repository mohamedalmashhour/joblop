import { GoogleAuth, OAuth2Client } from "google-auth-library";
import type { Credentials, TokenPayload } from "google-auth-library";
import {
  createCachingIdentityTokenProvider,
  type IdentityTokenVerifier,
  type IdentityTokenProvider,
  type TrustedAudienceRegistry
} from "./index";

export interface GoogleIdTokenClient {
  credentials: Credentials;
  getRequestHeaders(): Promise<Headers>;
}

export interface GoogleIdTokenClientFactory {
  getIdTokenClient(audience: string): Promise<GoogleIdTokenClient>;
}

export interface GoogleIdentityVerificationClient {
  verifyIdToken(input: Readonly<{ idToken: string; audience: string }>): Promise<
    Readonly<{
      getPayload(): TokenPayload | undefined;
    }>
  >;
}

export function createDefaultGoogleIdTokenClientFactory(): GoogleIdTokenClientFactory {
  const auth = new GoogleAuth();
  return {
    async getIdTokenClient(audience) {
      return auth.getIdTokenClient(audience);
    }
  };
}

export function createGoogleIdentityTokenVerifier(options: {
  runtimeEnvironment: "local" | "test" | "staging" | "production";
  client?: GoogleIdentityVerificationClient;
  now?: () => Date;
}): IdentityTokenVerifier {
  if (
    process.env.NODE_ENV === "test" &&
    (options.runtimeEnvironment === "staging" || options.runtimeEnvironment === "production") &&
    !options.client
  ) {
    throw new Error("RWOS_GOOGLE_PRODUCTION_LIKE_TEST_CONFIGURATION_DENIED");
  }
  if (
    (options.runtimeEnvironment === "local" || options.runtimeEnvironment === "test") &&
    !options.client
  ) {
    throw new Error("RWOS_GOOGLE_IDENTITY_VERIFICATION_CLIENT_REQUIRED");
  }
  const client = options.client ?? new OAuth2Client();
  const now = options.now ?? (() => new Date());
  return {
    async verify({ token, audience }) {
      if (!token || /\s/u.test(token) || !audience.startsWith("https://")) {
        throw new Error("RWOS_GOOGLE_IDENTITY_TOKEN_INVALID");
      }
      try {
        const ticket = await client.verifyIdToken({ idToken: token, audience });
        const payload = ticket.getPayload();
        const nowSeconds = Math.floor(now().getTime() / 1_000);
        if (
          !payload ||
          payload.aud !== audience ||
          !payload.sub ||
          !payload.email ||
          payload.email_verified !== true ||
          !Number.isInteger(payload.iat) ||
          !Number.isInteger(payload.exp) ||
          payload.iat! > nowSeconds + 60 ||
          payload.exp! <= nowSeconds
        ) {
          throw new Error("RWOS_GOOGLE_IDENTITY_TOKEN_INVALID");
        }
        return Object.freeze({
          subject: payload.sub,
          serviceAccountEmail: payload.email,
          audience,
          issuedAt: new Date(payload.iat! * 1_000),
          expiresAt: new Date(payload.exp! * 1_000)
        });
      } catch {
        throw new Error("RWOS_GOOGLE_IDENTITY_TOKEN_INVALID");
      }
    }
  };
}

export function createGoogleIdentityTokenProvider(options: {
  registry: TrustedAudienceRegistry;
  runtimeEnvironment: "local" | "test" | "staging" | "production";
  clientFactory?: GoogleIdTokenClientFactory;
  now?: () => Date;
  refreshMarginMs?: number;
}): IdentityTokenProvider {
  if (
    process.env.NODE_ENV === "test" &&
    (options.runtimeEnvironment === "staging" || options.runtimeEnvironment === "production")
  ) {
    throw new Error("RWOS_GOOGLE_PRODUCTION_LIKE_TEST_CONFIGURATION_DENIED");
  }
  if (
    (options.runtimeEnvironment === "local" || options.runtimeEnvironment === "test") &&
    !options.clientFactory
  ) {
    throw new Error("RWOS_GOOGLE_IDENTITY_CLIENT_FACTORY_REQUIRED");
  }
  const clientFactory = options.clientFactory ?? createDefaultGoogleIdTokenClientFactory();

  return createCachingIdentityTokenProvider({
    registry: options.registry,
    ...(options.now ? { now: options.now } : {}),
    ...(options.refreshMarginMs ? { refreshMarginMs: options.refreshMarginMs } : {}),
    async acquire({ audience }) {
      try {
        const client = await clientFactory.getIdTokenClient(audience);
        const headers = await client.getRequestHeaders();
        const authorization = headers.get("authorization");
        const token = client.credentials.id_token;
        const expiry = client.credentials.expiry_date;
        if (
          typeof authorization !== "string" ||
          typeof token !== "string" ||
          authorization !== `Bearer ${token}` ||
          typeof expiry !== "number" ||
          !Number.isFinite(expiry)
        ) {
          throw new Error("RWOS_GOOGLE_IDENTITY_TOKEN_INVALID");
        }
        return { value: token, expiresAt: new Date(expiry) };
      } catch {
        throw new Error("RWOS_IDENTITY_TOKEN_UNAVAILABLE");
      }
    }
  });
}
