import { GoogleAuth } from "google-auth-library";
import type { Credentials } from "google-auth-library";
import {
  createCachingIdentityTokenProvider,
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

export function createDefaultGoogleIdTokenClientFactory(): GoogleIdTokenClientFactory {
  const auth = new GoogleAuth();
  return {
    async getIdTokenClient(audience) {
      return auth.getIdTokenClient(audience);
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
