import * as SecureStore from "expo-secure-store";
import { parseWorkerCalendarDto, type WorkerCalendarDto } from "@rwos/shared";

const sessionKey = "rwos.mobile.session";

export interface SecureSessionVault {
  read(): Promise<string | null>;
  write(token: string): Promise<void>;
  clear(): Promise<void>;
}

export const nativeSecureSessionVault: SecureSessionVault = {
  read: () => SecureStore.getItemAsync(sessionKey),
  write: (token) =>
    SecureStore.setItemAsync(sessionKey, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
    }),
  clear: () => SecureStore.deleteItemAsync(sessionKey)
};

export type MobileSessionState =
  | Readonly<{ status: "authenticated" }>
  | Readonly<{ status: "sign_out_required" }>
  | Readonly<{ status: "denied" }>
  | Readonly<{ status: "error" }>;

type MobileSessionFetch = typeof fetch;

export function createMobileSessionTransport(options: {
  apiOrigin: string;
  vault: SecureSessionVault;
  fetch?: MobileSessionFetch;
}) {
  const origin = trustedMobileApiOrigin(options.apiOrigin);
  const request = options.fetch ?? fetch;

  return {
    async signIn(credentials: Readonly<{ email: string; password: string }>): Promise<MobileSessionState> {
      if (await options.vault.read()) return { status: "sign_out_required" };
      try {
        const response = await request(`${origin}/auth/sign-in`, {
          method: "POST",
          headers: { accept: "application/json", "content-type": "application/json" },
          body: JSON.stringify(credentials),
          cache: "no-store"
        });
        if (response.status === 401 || response.status === 403) return { status: "denied" };
        if (!response.ok) return { status: "error" };
        const token = readToken(await response.json());
        if (!token) return { status: "error" };
        await options.vault.write(token);
        return { status: "authenticated" };
      } catch {
        return { status: "error" };
      }
    },
    async signOut(): Promise<
      Readonly<{ status: "signed_out" }> |
      Readonly<{ status: "local_session_cleared"; remoteRevocation: "unavailable" }>
    > {
      const token = await options.vault.read();
      try {
        if (token) {
          const response = await request(`${origin}/auth/sign-out`, {
            method: "POST",
            headers: { accept: "application/json", authorization: `Bearer ${token}` },
            cache: "no-store"
          });
          if (!response.ok) {
            return { status: "local_session_cleared", remoteRevocation: "unavailable" };
          }
        }
        return { status: "signed_out" };
      } catch {
        return { status: "local_session_cleared", remoteRevocation: "unavailable" };
      } finally {
        await options.vault.clear();
      }
    },
    async workerOffer(offerId: string): Promise<
      | Readonly<{ status: "ready"; data: WorkerCalendarDto }>
      | Readonly<{ status: "empty" | "denied" | "error" | "unavailable" | "stale" }>
    > {
      const token = await options.vault.read();
      if (!token) return { status: "denied" };
      try {
        const response = await request(
          `${origin}/worker/calendar/offers/${encodeURIComponent(offerId)}`,
          {
            method: "GET",
            headers: { accept: "application/json", authorization: `Bearer ${token}` },
            cache: "no-store"
          }
        );
        if (response.status === 401 || response.status === 403) return { status: "denied" };
        if (response.status === 404) return { status: "empty" };
        if (response.status === 409 || response.status === 412) return { status: "stale" };
        if (response.status === 503) return { status: "unavailable" };
        if (!response.ok) return { status: "error" };
        const payload = await response.json() as { offer?: unknown };
        return { status: "ready", data: parseWorkerCalendarDto(payload.offer) };
      } catch {
        return { status: "error" };
      }
    }
  };
}

function trustedMobileApiOrigin(value: string) {
  const url = new URL(value);
  const local = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("RWOS_UNTRUSTED_MOBILE_API_ORIGIN");
  }
  return url.origin;
}

function readToken(input: unknown) {
  if (typeof input !== "object" || input === null || !("token" in input)) return null;
  const value = (input as { token?: unknown }).token;
  return typeof value === "string" && value.length >= 20 ? value : null;
}
