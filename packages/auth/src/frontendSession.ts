export const secureFrontendSessionCookieName = "__Host-rwos_frontend_session";
export const localFrontendSessionCookieName = "rwos_local_frontend_session";
export const secureEmployerSessionCookieName = "__Host-rwos_employer_session";
export const localEmployerSessionCookieName = "rwos_local_employer_session";
export const secureAdminSessionCookieName = "__Host-rwos_admin_session";
export const localAdminSessionCookieName = "rwos_local_admin_session";

export type FrontendSessionFetch = (
  input: string,
  init: Readonly<{
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
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
  | Readonly<{ status: "not_found" }>
  | Readonly<{ status: "stale" }>
  | Readonly<{ status: "unavailable" }>
  | Readonly<{ status: "error" }>;

export type FrontendSignInResult =
  FrontendSessionResult | Readonly<{ status: "rate_limited"; retryAfterSeconds: number }>;

export type FrontendRegisterResult =
  | FrontendSessionResult
  | Readonly<{ status: "rate_limited"; retryAfterSeconds: number }>
  | Readonly<{ status: "registration_closed" }>
  | Readonly<{ status: "conflict" }>
  | Readonly<{ status: "invalid" }>;

export function createFrontendSessionGateway(options: {
  apiOrigin: string;
  fetch: FrontendSessionFetch;
}) {
  const origin = trustedApiOrigin(options.apiOrigin);

  async function request(
    path: string,
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
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
      if (response.status === 404) return { status: "not_found" };
      if (response.status === 409 || response.status === 412) return { status: "stale" };
      if (response.status === 502 || response.status === 503 || response.status === 504) {
        return { status: "unavailable" };
      }
      if (!response.ok) return { status: "error" };
      return { status: "ok", payload: response.status === 204 ? null : await response.json() };
    } catch {
      return { status: "unavailable" };
    }
  }

  async function publicRequest(path: string, body: unknown): Promise<FrontendSessionResult> {
    try {
      const response = await options.fetch(`${origin}${path}`, {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store"
      });
      if (response.status === 502 || response.status === 503 || response.status === 504) {
        return { status: "unavailable" };
      }
      if (!response.ok) return { status: "error" };
      return { status: "ok", payload: await response.json() };
    } catch {
      return { status: "unavailable" };
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
        return { status: "unavailable" };
      }
    },
    async register(
      input: Readonly<{ email: string; password: string; displayName?: string | null; phone?: string | null; referralCode?: string | null }>,
      persistToken: (token: string) => void
    ): Promise<FrontendRegisterResult> {
      try {
        const response = await options.fetch(`${origin}/auth/register`, {
          method: "POST",
          headers: { accept: "application/json", "content-type": "application/json" },
          body: JSON.stringify(input),
          cache: "no-store"
        });
        // The API gates registration to non-production (404), rejects a taken email (409) and a weak
        // password (400), and rate-limits (429). Map each so the route can speak plainly to the user.
        if (response.status === 404) return { status: "registration_closed" } as const;
        if (response.status === 409) return { status: "conflict" } as const;
        if (response.status === 400) return { status: "invalid" } as const;
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
        return { status: "unavailable" };
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
    // Google OAuth. `googleConfig` tells the UI whether to show the button; `googleAuthorizeUrl`
    // returns the consent URL to redirect to; `googleExchange` finalizes the callback and, on
    // success, persists the issued session token exactly like password sign-in.
    async googleConfig(): Promise<{ enabled: boolean; calendarSync: boolean }> {
      try {
        const response = await options.fetch(`${origin}/auth/google/config`, {
          method: "GET",
          headers: { accept: "application/json" },
          cache: "no-store"
        });
        if (!response.ok) return { enabled: false, calendarSync: false };
        const json = asRecord(await response.json());
        return { enabled: json.enabled === true, calendarSync: json.calendarSync === true };
      } catch {
        return { enabled: false, calendarSync: false };
      }
    },
    async googleAuthorizeUrl(input: {
      redirectUri: string;
      state: string;
      withCalendar: boolean;
    }): Promise<string | null> {
      try {
        const response = await options.fetch(`${origin}/auth/google/authorize`, {
          method: "POST",
          headers: { accept: "application/json", "content-type": "application/json" },
          body: JSON.stringify(input),
          cache: "no-store"
        });
        if (!response.ok) return null;
        const json = asRecord(await response.json());
        return typeof json.url === "string" ? json.url : null;
      } catch {
        return null;
      }
    },
    async googleExchange(
      input: { code: string; redirectUri: string; withCalendar: boolean },
      persistToken: (token: string) => void
    ): Promise<FrontendSessionResult> {
      try {
        const response = await options.fetch(`${origin}/auth/google/exchange`, {
          method: "POST",
          headers: { accept: "application/json", "content-type": "application/json" },
          body: JSON.stringify(input),
          cache: "no-store"
        });
        if (response.status === 401 || response.status === 403) return { status: "denied" };
        if (response.status === 404) return { status: "not_found" };
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
        return { status: "unavailable" };
      }
    },
    async phoneRequest(audience: PhoneSignInSite, input: { phone: string }): Promise<void> {
      await options
        .fetch(`${origin}/auth/${audience}-phone/request`, {
          method: "POST",
          headers: { accept: "application/json", "content-type": "application/json" },
          body: JSON.stringify(input),
          cache: "no-store"
        })
        .catch(() => undefined);
    },
    async phoneVerify(
      audience: PhoneSignInSite,
      input: { phone: string; code: string },
      persistToken: (token: string) => void
    ): Promise<FrontendSessionResult> {
      try {
        const response = await options.fetch(`${origin}/auth/${audience}-phone/verify`, {
          method: "POST",
          headers: { accept: "application/json", "content-type": "application/json" },
          body: JSON.stringify(input),
          cache: "no-store"
        });
        if (response.status === 401 || response.status === 403 || response.status === 429) return { status: "denied" };
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
        return { status: "unavailable" };
      }
    },
    // Connect Google Calendar for an already-signed-in user (authenticated; no new session).
    googleLinkCalendar(input: { code: string; redirectUri: string }, token: string | null) {
      return request("/worker/google/calendar/link", "POST", token, input);
    },
    publicRequest,
    request
  };
}

export type PhoneSignInSite = "staff" | "employer" | "worker";

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
