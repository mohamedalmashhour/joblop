import type {
  IdentityToken,
  IdentityTokenProvider,
  IdentityTokenVerifier,
  TrustedService,
  VerifiedServiceIdentity
} from "./index";

export function createFakeIdentityTokenProvider(options: {
  tokens: Readonly<Record<string, IdentityToken>>;
  failAudiences?: readonly string[];
}): IdentityTokenProvider {
  return {
    async getToken({ audience }) {
      if (options.failAudiences?.includes(audience)) {
        throw new Error("RWOS_IDENTITY_TOKEN_UNAVAILABLE");
      }
      const token = options.tokens[audience];
      if (!token) throw new Error("RWOS_IDENTITY_TOKEN_UNAVAILABLE");
      return token;
    }
  };
}

export function createFakeIdentityTokenVerifier(options: {
  identities: Readonly<Record<string, VerifiedServiceIdentity>>;
  rejectTokens?: readonly string[];
}): IdentityTokenVerifier {
  return {
    async verify({ token, audience }) {
      if (options.rejectTokens?.includes(token)) throw new Error("RWOS_IDENTITY_TOKEN_DENIED");
      const identity = options.identities[token];
      if (!identity || identity.audience !== audience) {
        throw new Error("RWOS_IDENTITY_TOKEN_DENIED");
      }
      return identity;
    }
  };
}

export function fakeIdentity(input: {
  service: TrustedService;
  audience: string;
  now: Date;
  ttlMs?: number;
}): VerifiedServiceIdentity {
  return {
    subject: `subject:${input.service}`,
    serviceAccountEmail: `${input.service}@staging.invalid`,
    audience: input.audience,
    issuedAt: input.now,
    expiresAt: new Date(input.now.getTime() + (input.ttlMs ?? 60 * 60_000))
  };
}
