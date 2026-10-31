import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { GoogleProfile } from "@rwos/auth";

// Google OAuth 2.0 + Calendar integration for Joblop. Flag-gated: nothing is reachable unless a
// client id/secret are configured AND GOOGLE_OAUTH_ENABLED=enabled. Calendar sync is a further gate.
// The refresh token (returned by Google only on first consent) is stored encrypted at rest.

export const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
export const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";
export const GOOGLE_CALENDAR_EVENTS_ENDPOINT =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";
// Scope needed to create/update events on the user's own calendar.
export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
export const GOOGLE_IDENTITY_SCOPES = ["openid", "email", "profile"] as const;

export class GoogleOAuthError extends Error {
  constructor(public readonly reason: string) {
    super(`google_oauth_${reason}`);
    this.name = "GoogleOAuthError";
  }
}

export interface GoogleOAuthConfig {
  enabled: boolean;
  calendarSyncEnabled: boolean;
  clientId: string;
  clientSecret: string;
  // 32-byte AES key (base64) for refresh-token encryption; null when unset/invalid.
  tokenEncKey: Buffer | null;
}

export function googleOAuthConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env
): GoogleOAuthConfig {
  const clientId = (env.GOOGLE_OAUTH_CLIENT_ID ?? "").trim();
  const clientSecret = (env.GOOGLE_OAUTH_CLIENT_SECRET ?? "").trim();
  const rawKey = (env.GOOGLE_TOKEN_ENC_KEY ?? "").trim();
  let tokenEncKey: Buffer | null = null;
  if (rawKey) {
    try {
      const buf = Buffer.from(rawKey, "base64");
      if (buf.length === 32) tokenEncKey = buf;
    } catch {
      tokenEncKey = null;
    }
  }
  const enabled =
    env.GOOGLE_OAUTH_ENABLED === "enabled" && clientId.length > 0 && clientSecret.length > 0;
  // Calendar sync additionally needs an encryption key to persist the refresh token safely.
  const calendarSyncEnabled =
    enabled && env.GOOGLE_CALENDAR_SYNC_ENABLED === "enabled" && tokenEncKey !== null;
  return { enabled, calendarSyncEnabled, clientId, clientSecret, tokenEncKey };
}

// AES-256-GCM. Output: iv.tag.ciphertext (all base64). Returns null if no key is configured.
export function encryptSecret(plaintext: string, key: Buffer | null): string | null {
  if (!key) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(".");
}

export function decryptSecret(blob: string | null | undefined, key: Buffer | null): string | null {
  if (!blob || !key) return null;
  const [ivB64, tagB64, encB64] = blob.split(".");
  if (!ivB64 || !tagB64 || !encB64) return null;
  try {
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const enc = Buffer.from(encB64, "base64");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}

// Build the Google authorization URL. `withCalendar` adds the calendar.events scope and, with
// access_type=offline + prompt=consent, makes Google return a refresh token.
export function buildAuthUrl(input: {
  config: GoogleOAuthConfig;
  redirectUri: string;
  state: string;
  withCalendar: boolean;
}): string {
  const scopes = [
    ...GOOGLE_IDENTITY_SCOPES,
    ...(input.withCalendar ? [GOOGLE_CALENDAR_SCOPE] : [])
  ];
  const params = new URLSearchParams({
    client_id: input.config.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    state: input.state,
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent"
  });
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

export interface GoogleTokenResponse {
  accessToken: string;
  refreshToken: string | null;
  scope: string;
  expiresIn: number;
  idToken: string | null;
}

// Exchange an authorization code for tokens (raw HTTPS; no SDK). Google validates the code against
// the same client credentials + redirect_uri, so a successful response is trustworthy.
export async function exchangeCode(input: {
  config: GoogleOAuthConfig;
  code: string;
  redirectUri: string;
}): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code: input.code,
    client_id: input.config.clientId,
    client_secret: input.config.clientSecret,
    redirect_uri: input.redirectUri,
    grant_type: "authorization_code"
  });
  let res: Response;
  try {
    res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });
  } catch {
    throw new GoogleOAuthError("token_request_failed");
  }
  if (!res.ok) throw new GoogleOAuthError("token_exchange_failed");
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!json || typeof json.access_token !== "string") {
    throw new GoogleOAuthError("token_malformed");
  }
  return {
    accessToken: json.access_token,
    refreshToken: typeof json.refresh_token === "string" ? json.refresh_token : null,
    scope: typeof json.scope === "string" ? json.scope : "",
    expiresIn: typeof json.expires_in === "number" ? json.expires_in : 0,
    idToken: typeof json.id_token === "string" ? json.id_token : null
  };
}

// Fetch the verified profile with the access token we just received from Google over TLS.
export async function fetchUserInfo(accessToken: string): Promise<GoogleProfile> {
  let res: Response;
  try {
    res = await fetch(GOOGLE_USERINFO_ENDPOINT, {
      headers: { authorization: `Bearer ${accessToken}` }
    });
  } catch {
    throw new GoogleOAuthError("userinfo_request_failed");
  }
  if (!res.ok) throw new GoogleOAuthError("userinfo_failed");
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  const sub = json && typeof json.sub === "string" ? json.sub : "";
  const email = json && typeof json.email === "string" ? json.email.toLowerCase() : "";
  if (!sub || !email) throw new GoogleOAuthError("userinfo_incomplete");
  return {
    sub,
    email,
    emailVerified: json ? json.email_verified === true : false,
    name: json && typeof json.name === "string" ? json.name : null
  };
}

// Exchange a stored refresh token for a fresh access token (used by calendar sync).
export async function refreshAccessToken(input: {
  config: GoogleOAuthConfig;
  refreshToken: string;
}): Promise<string> {
  const body = new URLSearchParams({
    client_id: input.config.clientId,
    client_secret: input.config.clientSecret,
    refresh_token: input.refreshToken,
    grant_type: "refresh_token"
  });
  let res: Response;
  try {
    res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });
  } catch {
    throw new GoogleOAuthError("refresh_request_failed");
  }
  if (!res.ok) throw new GoogleOAuthError("refresh_failed");
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!json || typeof json.access_token !== "string") throw new GoogleOAuthError("refresh_malformed");
  return json.access_token;
}
