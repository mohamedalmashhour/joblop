import { getRuntimeConfig } from "@rwos/config";

// Employer fixed plans — shared BFF helpers. The API answers 404 for every plan route while
// EMPLOYER_PLANS_ENABLED is off; the public status endpoint lets the /plans page show "coming soon"
// without a session.

export const privateHeaders = { "cache-control": "private, no-store" };

export type PublicPlanStatus = Readonly<{ enabled: boolean; trialDays?: number; catalog?: unknown }>;

/** Ask the API whether plans are on (no session needed). Any failure reads as "off". */
export async function fetchPublicPlanStatus(fetcher: typeof fetch = fetch): Promise<PublicPlanStatus> {
  try {
    const origin = new URL(getRuntimeConfig().internalApiOrigin).origin;
    const response = await fetcher(`${origin}/public/employer-plans`, {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) return { enabled: false };
    const payload = (await response.json()) as Record<string, unknown>;
    if (payload.enabled !== true) return { enabled: false };
    return {
      enabled: true,
      ...(typeof payload.trialDays === "number" ? { trialDays: payload.trialDays } : {}),
      ...(Array.isArray(payload.catalog) ? { catalog: payload.catalog } : {})
    };
  } catch {
    return { enabled: false };
  }
}

export function readBody(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
