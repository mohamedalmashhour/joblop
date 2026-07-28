export const secureFrontendSessionCookieName = "__Host-rwos_frontend_session";
export const localFrontendSessionCookieName = "rwos_local_frontend_session";
export const secureEmployerSessionCookieName = "__Host-rwos_employer_session";
export const localEmployerSessionCookieName = "rwos_local_employer_session";
export const secureAdminSessionCookieName = "__Host-rwos_admin_session";
export const localAdminSessionCookieName = "rwos_local_admin_session";

export type FrontendSessionFetch = (
  input: string,
  init: Readonly<{
    method: "GET" | "POST" | "PUT" | "PATCH";
    headers: Readonly<Record<string, string>>;
    body?: string;
    cache: "no-store";
  }>
) => Promise<
  Readonly<{
    ok: boolean;
    status: number;
    headers?: Readonly<{ get(name: string): string | null }>;
    json(): Promise<unknown>;
  }>
>;

export type FrontendSessionResult =
  | Readonly<{ status: "ok"; payload: unknown }>
  | Readonly<{ status: "denied" }>
  | Readonly<{ status: "stale" }>
  | Readonly<{ status: "unavailable" }>
  | Readonly<{ status: "error" }>;

export type FrontendSignInResult =
  FrontendSessionResult | Readonly<{ status: "rate_limited"; retryAfterSeconds: number }>;

export function createFrontendSessionGateway(options: {
  apiOrigin: string;
  fetch: FrontendSessionFetch;
}) {
  const origin = trustedApiOrigin(options.apiOrigin);

  async function request(
    path: string,
    method: "GET" | "POST" | "PUT" | "PATCH",
    sessionToken: string | null,
    body?: unknown
  ): Promise<FrontendSessionResult> {
    if (!sessionToken) return { status: "denied" };
    try {
      const response = await options.fetch(`${origin}${path}`, {
        method,
        headers: {
          accept: "application/json",
          authorization: `Bearer ${sessionToken}`,
          ...(body === undefined ? {} : { "content-type": "application/json" })
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        cache: "no-store"
      });
      if (response.status === 401 || response.status === 403) return { status: "denied" };
      if (response.status === 409 || response.status === 412) return { status: "stale" };
      if (response.status === 502 || response.status === 503 || response.status === 504) {
        return { status: "unavailable" };
      }
      if (!response.ok) return { status: "error" };
      return { status: "ok", payload: response.status === 204 ? null : await response.json() };
    } catch {
      return { status: "error" };
    }
  }

  return {
    async signIn(
      credentials: Readonly<{ email: string; password: string }>,
      persistToken: (token: string) => void
    ): Promise<FrontendSignInResult> {
      try {
        const response = await options.fetch(`${origin}/auth/sign-in`, {
          method: "POST",
          headers: { accept: "application/json", "content-type": "application/json" },
          body: JSON.stringify(credentials),
          cache: "no-store"
        });
        if (response.status === 401 || response.status === 403) return { status: "denied" };
        if (response.status === 429) {
          return {
            status: "rate_limited",
            retryAfterSeconds: readRetryAfter(response.headers?.get("retry-after"))
          } as const;
        }
        if (response.status === 502 || response.status === 503 || response.status === 504) {
          return { status: "unavailable" };
        }
        if (!response.ok) return { status: "error" };
        const payload = await response.json();
        const token = readToken(payload);
        if (!token) return { status: "error" };
        persistToken(token);
        return { status: "ok", payload: sanitizeSessionPayload(payload) };
      } catch {
        return { status: "error" };
      }
    },
    async validate(token: string | null) {
      const result = await request("/auth/session", "GET", token);
      return result.status === "ok"
        ? ({ status: "ok", payload: sanitizeSessionPayload(result.payload) } as const)
        : result;
    },
    signOut: (token: string | null) =>
      token
        ? request("/auth/sign-out", "POST", token)
        : Promise.resolve({ status: "ok", payload: null } as const),
    request
  };
}

function readRetryAfter(value: string | null | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 3600 ? parsed : 60;
}

function trustedApiOrigin(value: string) {
  const url = new URL(value);
  const local = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("RWOS_UNTRUSTED_INTERNAL_API_ORIGIN");
  }
  return url.origin;
}

function readToken(input: unknown) {
  if (typeof input !== "object" || input === null || !("token" in input)) return null;
  const value = (input as { token?: unknown }).token;
  return typeof value === "string" && value.length >= 20 ? value : null;
}

function sanitizeSessionPayload(input: unknown) {
  const source = asRecord(input);
  const user = asRecord(source.user);
  const session = asRecord(source.session);
  return {
    authenticated: source.authenticated === true,
    user: source.user
      ? pickScalar(user, ["id", "publicId", "emailNormalized", "displayName", "status"])
      : null,
    session: source.session ? pickScalar(session, ["id", "userId", "expiresAt"]) : null
  };
}

function asRecord(input: unknown): Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
}

function pickScalar(input: Record<string, unknown>, keys: readonly string[]) {
  return Object.fromEntries(
    keys.flatMap((key) => {
      const value = input[key];
      return value === null || ["string", "number", "boolean"].includes(typeof value)
        ? [[key, value]]
        : [];
    })
  );
}
