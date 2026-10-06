// Signed share-link tokens for party-scoped transaction statements.
// A token is `base64url(JSON payload)` + "." + `base64url(HMAC-SHA256)`.
// The payload embeds an already-masked Snapshot + an expiry; the signature
// (keyed by CONTROL_ROOM_SHARE_SECRET) prevents tampering. Verification is
// fail-closed: no secret, bad signature, or past expiry => null.
//
// The secret is read from the environment and is NEVER committed. If it is
// unset, minting and verification both refuse — sharing is simply disabled.
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { Snapshot } from "./controlRoomLedger";

// A token carries the masked snapshot plus: exp (expiry), jti (unique link id
// for audit + revocation), and iat (issued-at).
type Payload = Snapshot & { exp: number; jti: string; iat: number };

export type MintResult = { token: string; jti: string; exp: number };

function secret(): string | null {
  const s = process.env.CONTROL_ROOM_SHARE_SECRET;
  return s && s.length >= 32 ? s : null;
}

// Revocation denylist. Operator-driven today: set CONTROL_ROOM_REVOKED_JTIS to
// a comma/space-separated list of link ids to kill specific links without
// rotating the whole secret. Swap this function's body for a KV/DB lookup when
// a datastore-backed revoke button is added — the call site does not change.
function revokedSet(): Set<string> {
  const raw = process.env.CONTROL_ROOM_REVOKED_JTIS ?? "";
  return new Set(raw.split(/[\s,]+/).map((s) => s.trim().toLowerCase()).filter(Boolean));
}
export function isRevoked(jti: string): boolean {
  return revokedSet().has(jti.toLowerCase());
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function sign(payloadB64: string, key: string): string {
  return b64url(createHmac("sha256", key).update(payloadB64).digest());
}

export function isShareConfigured(): boolean {
  return secret() !== null;
}

/** Mint a token for an already-masked snapshot. Returns null if sharing is unconfigured. */
export function signShare(snapshot: Snapshot, ttlHours: number): MintResult | null {
  const key = secret();
  if (!key) return null;
  const ttl = Math.min(Math.max(ttlHours, 1), 24 * 30); // 1h..30d
  const now = Date.now();
  const jti = randomUUID();
  const exp = now + ttl * 3_600_000;
  const payload: Payload = { ...snapshot, exp, jti, iat: now };
  const payloadB64 = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  return { token: `${payloadB64}.${sign(payloadB64, key)}`, jti, exp };
}

/** Verify + decode a token. Returns the snapshot only if signature and expiry are valid. */
export function verifyShare(token: string): Snapshot | null {
  const key = secret();
  if (!key) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);
  const expected = sign(payloadB64, key);
  const a = Buffer.from(sigB64);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(fromB64url(payloadB64).toString("utf8")) as Payload;
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
    if (payload.view !== "employer" && payload.view !== "worker") return null;
    if (typeof payload.jti === "string" && isRevoked(payload.jti)) return null;
    const { exp, jti, iat, ...snapshot } = payload;
    void exp; void jti; void iat;
    return snapshot;
  } catch {
    return null;
  }
}
