import { getRuntimeConfig } from "@rwos/config";
import { sessionFailure } from "../sessionBoundary";

export const privateHeaders = { "cache-control": "private, no-store" };

export type BonusKind = "hourly" | "transport" | "one_time";

// Bonus mutations need the API's exact refusal (422 over Joblop's share, 409 an active bonus
// already exists) so staff see a plain-words reason. The shared session gateway folds both
// into generic failures, so this forwards the staff session directly and maps only those two.
export async function forwardBonusMutation(path: string, token: string, body?: unknown): Promise<Response> {
  let origin: string;
  try {
    const url = new URL(getRuntimeConfig().internalApiOrigin);
    const local = url.hostname === "127.0.0.1" || url.hostname === "localhost";
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return sessionFailure("unavailable");
    origin = url.origin;
  } catch {
    return sessionFailure("unavailable");
  }
  let response: Response;
  try {
    response = await fetch(`${origin}${path}`, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "content-type": "application/json" })
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: "no-store"
    });
  } catch {
    return sessionFailure("unavailable");
  }
  if (response.status === 401 || response.status === 403) return sessionFailure("denied");
  if (response.status === 404) return sessionFailure("not_found");
  if (response.status === 422) {
    const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;
    const code = payload?.error === "RWOS_BONUS_OVER_PLATFORM_SHARE" ? "over_platform_share" : "invalid";
    return Response.json({ status: code }, { status: 422, headers: privateHeaders });
  }
  if (response.status === 409) {
    return Response.json({ status: "active_bonus_exists" }, { status: 409, headers: privateHeaders });
  }
  if (response.status === 502 || response.status === 503 || response.status === 504) return sessionFailure("unavailable");
  if (!response.ok) return sessionFailure("error");
  const payload = (await response.json().catch(() => null)) as unknown;
  return Response.json(payload ?? {}, { status: response.status === 201 ? 201 : 200, headers: privateHeaders });
}

export function readBonusKind(value: unknown): BonusKind | null {
  return value === "hourly" || value === "transport" || value === "one_time" ? value : null;
}

export function readAmountMinor(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 1_000_000 ? value : null;
}
