import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildAuthUrl,
  decryptSecret,
  encryptSecret,
  googleOAuthConfigFromEnv,
  GOOGLE_CALENDAR_SCOPE
} from "./googleOAuth";

const key = () => randomBytes(32);

describe("googleOAuthConfigFromEnv", () => {
  it("is disabled unless enabled flag + client id + secret are all present", () => {
    expect(googleOAuthConfigFromEnv({}).enabled).toBe(false);
    expect(
      googleOAuthConfigFromEnv({ GOOGLE_OAUTH_ENABLED: "enabled", GOOGLE_OAUTH_CLIENT_ID: "x" })
        .enabled
    ).toBe(false);
    expect(
      googleOAuthConfigFromEnv({
        GOOGLE_OAUTH_ENABLED: "enabled",
        GOOGLE_OAUTH_CLIENT_ID: "x",
        GOOGLE_OAUTH_CLIENT_SECRET: "y"
      }).enabled
    ).toBe(true);
  });

  it("gates calendar sync on its own flag plus a valid 32-byte key", () => {
    const base = {
      GOOGLE_OAUTH_ENABLED: "enabled",
      GOOGLE_OAUTH_CLIENT_ID: "x",
      GOOGLE_OAUTH_CLIENT_SECRET: "y"
    };
    // Flag on but no key → sync stays off.
    expect(
      googleOAuthConfigFromEnv({ ...base, GOOGLE_CALENDAR_SYNC_ENABLED: "enabled" }).calendarSyncEnabled
    ).toBe(false);
    // Flag on + valid key → on.
    expect(
      googleOAuthConfigFromEnv({
        ...base,
        GOOGLE_CALENDAR_SYNC_ENABLED: "enabled",
        GOOGLE_TOKEN_ENC_KEY: key().toString("base64")
      }).calendarSyncEnabled
    ).toBe(true);
    // Wrong-length key → rejected (off).
    expect(
      googleOAuthConfigFromEnv({
        ...base,
        GOOGLE_CALENDAR_SYNC_ENABLED: "enabled",
        GOOGLE_TOKEN_ENC_KEY: Buffer.from("short").toString("base64")
      }).calendarSyncEnabled
    ).toBe(false);
  });
});

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a refresh token", () => {
    const k = key();
    const token = "1//refresh-token-value-abc123";
    const blob = encryptSecret(token, k);
    expect(blob).toBeTruthy();
    expect(blob).not.toContain(token);
    expect(decryptSecret(blob, k)).toBe(token);
  });

  it("returns null without a key and fails closed on a wrong key or tampered blob", () => {
    const k = key();
    expect(encryptSecret("x", null)).toBeNull();
    const blob = encryptSecret("secret", k);
    expect(decryptSecret(blob, randomBytes(32))).toBeNull();
    expect(decryptSecret("not.valid.blob", k)).toBeNull();
    expect(decryptSecret(null, k)).toBeNull();
  });
});

describe("buildAuthUrl", () => {
  const config = googleOAuthConfigFromEnv({
    GOOGLE_OAUTH_ENABLED: "enabled",
    GOOGLE_OAUTH_CLIENT_ID: "client-123",
    GOOGLE_OAUTH_CLIENT_SECRET: "secret"
  });

  it("requests offline access + consent and omits calendar scope by default", () => {
    const url = new URL(
      buildAuthUrl({ config, redirectUri: "https://joblop.com/api/auth/google/callback", state: "s1", withCalendar: false })
    );
    expect(url.searchParams.get("client_id")).toBe("client-123");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("state")).toBe("s1");
    expect(url.searchParams.get("scope")).not.toContain(GOOGLE_CALENDAR_SCOPE);
  });

  it("adds the calendar.events scope when calendar sync is requested", () => {
    const url = new URL(
      buildAuthUrl({ config, redirectUri: "https://joblop.com/cb", state: "s2", withCalendar: true })
    );
    expect(url.searchParams.get("scope")).toContain(GOOGLE_CALENDAR_SCOPE);
  });
});
