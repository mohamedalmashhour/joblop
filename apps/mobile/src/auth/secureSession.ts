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

/**
 * Browser staging uses a tab-scoped, memory-only session. The token is never
 * written to cookies or any durable browser storage surface. Native builds
 * continue to use the platform secure store above.
 */
export function createVolatileSessionVault(): SecureSessionVault {
  let token: string | null = null;
  return {
    read: async () => token,
    write: async (nextToken) => {
      token = nextToken;
    },
    clear: async () => {
      token = null;
    }
  };
}

export type MobileSessionState =
  | Readonly<{ status: "authenticated" }>
  | Readonly<{ status: "sign_out_required" }>
  | Readonly<{ status: "denied" }>
  | Readonly<{ status: "error" }>;

export type MobileRegisterState =
  | Readonly<{ status: "authenticated" }>
  | Readonly<{ status: "sign_out_required" }>
  | Readonly<{ status: "registration_closed" }>
  | Readonly<{ status: "conflict" }>
  | Readonly<{ status: "invalid" }>
  | Readonly<{ status: "rate_limited"; retryAfterSeconds: number }>
  | Readonly<{ status: "denied" }>
  | Readonly<{ status: "error" }>;

export type MobileEmailCodeState =
  | Readonly<{ status: "sent"; devCode?: string }>
  | Readonly<{ status: "denied" }>
  | Readonly<{ status: "unavailable" }>
  | Readonly<{ status: "rate_limited"; retryAfterSeconds: number }>
  | Readonly<{ status: "error" }>;

type MobileSessionFetch = typeof fetch;

export const workerAssignmentStatuses = [
  "pending_validation",
  "confirmed",
  "worker_acknowledged",
  "ready_for_attendance",
  "in_attendance_window",
  "attendance_handoff",
  "worker_withdrawn",
  "employer_cancelled",
  "platform_cancelled",
  "replacement_required",
  "expired_before_start",
  "closed"
] as const;

export type WorkerAssignmentDto = Readonly<{
  assignmentId: string;
  workerOfferId: string;
  status: (typeof workerAssignmentStatuses)[number];
  title: string;
  roleSummary: string | null;
  worksiteSummary: string | null;
  departmentSummary: string | null;
  startAt: string;
  endAt: string;
  timezone: string;
  attendanceBoundary: "not_started" | "handoff_ready" | "handoff_completed";
  versionToken: number;
  updatedAt: string;
  visibility: "worker_authorized_assignment";
}>;

export function createMobileSessionTransport(options: {
  apiOrigin: string;
  vault: SecureSessionVault;
  fetch?: MobileSessionFetch;
}) {
  const origin = trustedMobileApiOrigin(options.apiOrigin);
  const request = options.fetch ?? fetch;

  return {
    async signIn(
      credentials: Readonly<{ email: string; password: string }>
    ): Promise<MobileSessionState> {
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
    async signUp(
      input: Readonly<{ email: string; password: string; displayName?: string | null }>
    ): Promise<MobileRegisterState> {
      if (await options.vault.read()) return { status: "sign_out_required" };
      try {
        const response = await request(`${origin}/auth/register`, {
          method: "POST",
          headers: { accept: "application/json", "content-type": "application/json" },
          body: JSON.stringify(input),
          cache: "no-store"
        });
        // The API gates registration to non-production (404), rejects a taken email (409) and a weak
        // password (400), and rate-limits (429). Surface each so the screen can speak plainly.
        if (response.status === 404) return { status: "registration_closed" };
        if (response.status === 409) return { status: "conflict" };
        if (response.status === 400) return { status: "invalid" };
        if (response.status === 401 || response.status === 403) return { status: "denied" };
        if (response.status === 429) {
          return {
            status: "rate_limited",
            retryAfterSeconds: readRetryAfter(response.headers.get("retry-after"))
          };
        }
        if (!response.ok) return { status: "error" };
        const token = readToken(await response.json());
        if (!token) return { status: "error" };
        await options.vault.write(token);
        return { status: "authenticated" };
      } catch {
        return { status: "error" };
      }
    },
    async sendEmailCode(): Promise<MobileEmailCodeState> {
      const token = await options.vault.read();
      if (!token) return { status: "denied" };
      try {
        const response = await request(`${origin}/auth/email/send-code`, {
          method: "POST",
          headers: { accept: "application/json", authorization: `Bearer ${token}` },
          cache: "no-store"
        });
        if (response.status === 401 || response.status === 403) return { status: "denied" };
        if ([404, 502, 503, 504].includes(response.status)) return { status: "unavailable" };
        if (response.status === 429) {
          return {
            status: "rate_limited",
            retryAfterSeconds: readRetryAfter(response.headers.get("retry-after"))
          };
        }
        if (!response.ok) return { status: "error" };
        // In development the backend may return the code so it can be surfaced without a live mailer.
        const payload = (await response.json().catch(() => ({}))) as { code?: unknown };
        return typeof payload.code === "string"
          ? { status: "sent", devCode: payload.code }
          : { status: "sent" };
      } catch {
        return { status: "error" };
      }
    },
    async verifyEmailCode(
      code: string
    ): Promise<
      Readonly<{ status: "verified" | "denied" | "invalid" | "unavailable" | "error" }>
    > {
      const token = await options.vault.read();
      if (!token) return { status: "denied" };
      if (!/^\d{6}$/.test(code.trim())) return { status: "invalid" };
      try {
        const response = await request(`${origin}/auth/email/verify-code`, {
          method: "POST",
          headers: {
            accept: "application/json",
            authorization: `Bearer ${token}`,
            "content-type": "application/json"
          },
          body: JSON.stringify({ code: code.trim() }),
          cache: "no-store"
        });
        if (response.status === 401 || response.status === 403) return { status: "denied" };
        if ([404, 502, 503, 504].includes(response.status)) return { status: "unavailable" };
        if (response.ok) return { status: "verified" };
        return { status: "invalid" };
      } catch {
        return { status: "error" };
      }
    },
    async signOut(): Promise<
      | Readonly<{ status: "signed_out" }>
      | Readonly<{ status: "local_session_cleared"; remoteRevocation: "unavailable" }>
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
    async workerOffer(
      offerId: string
    ): Promise<
      | Readonly<{ status: "ready"; data: WorkerCalendarDto }>
      | Readonly<{ status: "empty" | "denied" | "error" | "unavailable" | "stale" }>
    > {
      const token = await options.vault.read();
      if (!token) return { status: "denied" };
      if (!isOperationalReference(offerId)) return { status: "error" };
      try {
        const response = await request(`${origin}/worker/offers/${encodeURIComponent(offerId)}`, {
          method: "GET",
          headers: { accept: "application/json", authorization: `Bearer ${token}` },
          cache: "no-store"
        });
        if (response.status === 401 || response.status === 403) return { status: "denied" };
        if (response.status === 404) return { status: "empty" };
        if (response.status === 409 || response.status === 412) return { status: "stale" };
        if (response.status === 503) return { status: "unavailable" };
        if (!response.ok) return { status: "error" };
        const payload = (await response.json()) as { workerOffer?: unknown };
        const workerOffer = parseWorkerCalendarDto(payload.workerOffer);
        if (workerOffer.workerOfferId !== offerId) return { status: "error" };
        return { status: "ready", data: workerOffer };
      } catch {
        return { status: "error" };
      }
    },
    async workerOffers(): Promise<
      | Readonly<{ status: "ready"; data: readonly WorkerCalendarDto[] }>
      | Readonly<{ status: "empty" | "denied" | "error" | "unavailable" }>
    > {
      const token = await options.vault.read();
      if (!token) return { status: "denied" };
      try {
        const response = await request(`${origin}/worker/offers`, {
          method: "GET",
          headers: { accept: "application/json", authorization: `Bearer ${token}` },
          cache: "no-store"
        });
        if (response.status === 401 || response.status === 403) return { status: "denied" };
        if (response.status === 503) return { status: "unavailable" };
        if (!response.ok) return { status: "error" };
        const payload = (await response.json()) as { workerOffers?: unknown };
        if (!Array.isArray(payload.workerOffers)) return { status: "error" };
        const workerOffers = payload.workerOffers.map(parseWorkerCalendarDto);
        return workerOffers.length === 0
          ? { status: "empty" }
          : { status: "ready", data: workerOffers };
      } catch {
        return { status: "error" };
      }
    },
    async workerAssignments(): Promise<
      | Readonly<{ status: "ready"; data: readonly WorkerAssignmentDto[] }>
      | Readonly<{ status: "empty" | "denied" | "error" | "unavailable" }>
    > {
      const token = await options.vault.read();
      if (!token) return { status: "denied" };
      try {
        const response = await request(`${origin}/worker/assignments`, {
          method: "GET",
          headers: { accept: "application/json", authorization: `Bearer ${token}` },
          cache: "no-store"
        });
        if (response.status === 401 || response.status === 403) return { status: "denied" };
        if (response.status === 503) return { status: "unavailable" };
        if (!response.ok) return { status: "error" };
        const payload = (await response.json()) as { assignments?: unknown };
        if (!Array.isArray(payload.assignments)) return { status: "error" };
        const assignments = payload.assignments.map(parseWorkerAssignment);
        return assignments.length === 0
          ? { status: "empty" }
          : { status: "ready", data: assignments };
      } catch {
        return { status: "error" };
      }
    },
    // The worker's own payout ledger from GET /worker/payouts — a worker-scoped read that returns only
    // the amounts the worker is owed (to-pay) and has been sent (paid). It NEVER moves money; the
    // backend is authoritative and gates everything. The mobile client keeps only the safe aggregate
    // projection (currency + minor-unit totals + counts), never employer economics.
    async workerPayouts(): Promise<
      | Readonly<{ status: "ready"; data: WorkerPayoutsSummary }>
      | Readonly<{ status: "empty" | "denied" | "error" | "unavailable" }>
    > {
      const token = await options.vault.read();
      if (!token) return { status: "denied" };
      try {
        const response = await request(`${origin}/worker/payouts`, {
          method: "GET",
          headers: { accept: "application/json", authorization: `Bearer ${token}` },
          cache: "no-store"
        });
        if (response.status === 401 || response.status === 403) return { status: "denied" };
        if (response.status === 503) return { status: "unavailable" };
        if (!response.ok) return { status: "error" };
        const summary = parseWorkerPayoutsSummary(await response.json());
        if (!summary) return { status: "error" };
        return summary.toPayCount === 0 && summary.paidCount === 0
          ? { status: "empty" }
          : { status: "ready", data: summary };
      } catch {
        return { status: "error" };
      }
    },
    // Open-shift marketplace: browse published job postings near the worker's postal code via
    // POST /marketplace/jobs/search. The backend is authoritative — it returns only the safe,
    // sensitive-field-stripped projection (role, employer public name, area-level city/province,
    // date/time, openings; worker rate is policy-gated and currently null). No money moves.
    async marketplaceSearch(
      input: Readonly<{ postalCode: string; role?: string; radiusKm?: number; verifiedOnly?: boolean; sort?: "nearest" | "soonest" | "highest_rate"; limit?: number }>
    ): Promise<
      | Readonly<{ status: "ready"; data: Readonly<{ jobs: readonly MarketplaceJob[]; total: number; origin: MarketplaceOrigin | null }> }>
      | Readonly<{ status: "empty" | "denied" | "invalid_location" | "unavailable" | "error" }>
    > {
      const token = await options.vault.read();
      if (!token) return { status: "denied" };
      try {
        const response = await request(`${origin}/marketplace/jobs/search`, {
          method: "POST",
          headers: { accept: "application/json", "content-type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify({
            postalCode: input.postalCode,
            ...(input.role ? { role: input.role } : {}),
            ...(input.radiusKm ? { radiusKm: input.radiusKm } : {}),
            ...(input.verifiedOnly ? { verifiedOnly: true } : {}),
            ...(input.sort ? { sort: input.sort } : {}),
            ...(input.limit ? { limit: input.limit } : {})
          }),
          cache: "no-store"
        });
        if (response.status === 401 || response.status === 403) return { status: "denied" };
        if (response.status === 400 || response.status === 422) return { status: "invalid_location" };
        if (response.status === 503) return { status: "unavailable" };
        if (!response.ok) return { status: "error" };
        const parsed = parseMarketplaceSearch(await response.json());
        if (!parsed) return { status: "error" };
        return parsed.jobs.length === 0 ? { status: "empty" } : { status: "ready", data: parsed };
      } catch {
        return { status: "error" };
      }
    },
    // A single open posting's public detail via GET /marketplace/jobs/:id. 404 → not_found (a
    // non-visible job is indistinguishable from a missing one, by design).
    async marketplaceJob(
      jobRequestId: string,
      postalCode?: string
    ): Promise<
      | Readonly<{ status: "ready"; data: MarketplaceJobDetail }>
      | Readonly<{ status: "not_found" | "denied" | "unavailable" | "error" }>
    > {
      const token = await options.vault.read();
      if (!token) return { status: "denied" };
      try {
        const query = postalCode ? `?postalCode=${encodeURIComponent(postalCode)}` : "";
        const response = await request(`${origin}/marketplace/jobs/${encodeURIComponent(jobRequestId)}${query}`, {
          method: "GET",
          headers: { accept: "application/json", authorization: `Bearer ${token}` },
          cache: "no-store"
        });
        if (response.status === 401 || response.status === 403) return { status: "denied" };
        if (response.status === 404) return { status: "not_found" };
        if (response.status === 503) return { status: "unavailable" };
        if (!response.ok) return { status: "error" };
        const payload = (await response.json()) as { job?: unknown };
        const detail = parseMarketplaceJobDetail(payload.job);
        return detail ? { status: "ready", data: detail } : { status: "error" };
      } catch {
        return { status: "error" };
      }
    },
    // Apply to an open posting by expressing interest (POST /marketplace/jobs/:id/interest). This
    // records intent ONLY — it never creates an offer, assignment or payment. Idempotent: a repeat
    // returns alreadyInterested. 404 → the job is not available.
    async expressInterest(
      jobRequestId: string,
      postalCode?: string
    ): Promise<
      | Readonly<{ status: "ready"; interestStatus: string; alreadyInterested: boolean }>
      | Readonly<{ status: "not_found" | "denied" | "ineligible" | "error" }>
    > {
      const token = await options.vault.read();
      if (!token) return { status: "denied" };
      try {
        const response = await request(`${origin}/marketplace/jobs/${encodeURIComponent(jobRequestId)}/interest`, {
          method: "POST",
          headers: { accept: "application/json", "content-type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify(postalCode ? { postalCode } : {}),
          cache: "no-store"
        });
        if (response.status === 401 || response.status === 403) return { status: "denied" };
        if (response.status === 404) return { status: "not_found" };
        if (response.status === 409 || response.status === 422) return { status: "ineligible" };
        if (!response.ok) return { status: "error" };
        const payload = (await response.json()) as { interest?: { status?: unknown }; alreadyInterested?: unknown };
        const interestStatus = typeof payload.interest?.status === "string" ? payload.interest.status : "submitted";
        return { status: "ready", interestStatus, alreadyInterested: payload.alreadyInterested === true };
      } catch {
        return { status: "error" };
      }
    },
    // The worker's own applications ("My interests") from GET /marketplace/my-interests — each with a
    // privacy-safe job summary and the linked governed-offer status when one exists. Read-only; it
    // reflects intent the worker already expressed, never creating an offer or assignment.
    async myInterests(): Promise<
      | Readonly<{ status: "ready"; data: readonly MarketplaceInterest[] }>
      | Readonly<{ status: "empty" | "denied" | "error" }>
    > {
      const token = await options.vault.read();
      if (!token) return { status: "denied" };
      try {
        const response = await request(`${origin}/marketplace/my-interests`, {
          method: "GET",
          headers: { accept: "application/json", authorization: `Bearer ${token}` },
          cache: "no-store"
        });
        if (response.status === 401 || response.status === 403) return { status: "denied" };
        if (!response.ok) return { status: "error" };
        const payload = (await response.json()) as { interests?: unknown };
        if (!Array.isArray(payload.interests)) return { status: "error" };
        const data = payload.interests.map(parseMarketplaceInterest).filter((v): v is MarketplaceInterest => v !== null);
        return data.length === 0 ? { status: "empty" } : { status: "ready", data };
      } catch {
        return { status: "error" };
      }
    },
    async respondToWorkerOffer(
      input: Readonly<{
        offerId: string;
        decision: "accept" | "decline";
        expectedVersion: number;
        expectedTermsVersionId: string;
      }>
    ): Promise<
      | Readonly<{ status: "ready"; data: WorkerCalendarDto }>
      | Readonly<{ status: "denied" | "error" | "unavailable" | "stale" }>
    > {
      const token = await options.vault.read();
      if (!token) return { status: "denied" };
      if (
        !isOperationalReference(input.offerId) ||
        !Number.isInteger(input.expectedVersion) ||
        input.expectedVersion < 1 ||
        !isOperationalReference(input.expectedTermsVersionId)
      ) {
        return { status: "error" };
      }
      try {
        const response = await request(
          `${origin}/worker/offers/${encodeURIComponent(input.offerId)}/${input.decision}`,
          {
            method: "POST",
            headers: {
              accept: "application/json",
              authorization: `Bearer ${token}`,
              "content-type": "application/json"
            },
            body: JSON.stringify({
              expectedVersion: input.expectedVersion,
              expectedTermsVersionId: input.expectedTermsVersionId
            }),
            cache: "no-store"
          }
        );
        if (response.status === 401 || response.status === 403) return { status: "denied" };
        if (response.status === 409 || response.status === 412) return { status: "stale" };
        if (response.status === 404) return { status: "unavailable" };
        if (response.status === 503) return { status: "unavailable" };
        if (!response.ok) return { status: "error" };
        const payload = (await response.json()) as { workerOffer?: unknown };
        const workerOffer = parseWorkerCalendarDto(payload.workerOffer);
        if (workerOffer.workerOfferId !== input.offerId) return { status: "error" };
        return { status: "ready", data: workerOffer };
      } catch {
        return { status: "error" };
      }
    }
  };
}

export type MobileSessionTransport = ReturnType<typeof createMobileSessionTransport>;

export function tryCreateMobileSessionTransport(options: {
  apiOrigin: string | undefined;
  vault: SecureSessionVault;
  fetch?: MobileSessionFetch;
}) {
  if (!options.apiOrigin) return null;
  try {
    return createMobileSessionTransport({
      apiOrigin: options.apiOrigin,
      vault: options.vault,
      ...(options.fetch ? { fetch: options.fetch } : {})
    });
  } catch {
    return null;
  }
}

function trustedMobileApiOrigin(value: string) {
  const url = new URL(value);
  const local = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("RWOS_UNTRUSTED_MOBILE_API_ORIGIN");
  }
  return url.origin;
}

function readRetryAfter(value: string | null | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 3600 ? parsed : 60;
}

function readToken(input: unknown) {
  if (typeof input !== "object" || input === null || !("token" in input)) return null;
  const value = (input as { token?: unknown }).token;
  return typeof value === "string" && value.length >= 20 ? value : null;
}

function isOperationalReference(input: string) {
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u.test(input);
}

function parseWorkerAssignment(input: unknown): WorkerAssignmentDto {
  if (!input || typeof input !== "object") throw new Error("RWOS_INVALID_WORKER_ASSIGNMENT");
  const value = input as Record<string, unknown>;
  const required = (key: string) => {
    const item = value[key];
    if (typeof item !== "string" || !item) throw new Error("RWOS_INVALID_WORKER_ASSIGNMENT");
    return item;
  };
  const optional = (key: string) => {
    const item = value[key];
    if (item === null) return null;
    if (typeof item !== "string") throw new Error("RWOS_INVALID_WORKER_ASSIGNMENT");
    return item;
  };
  const attendanceBoundary = required("attendanceBoundary");
  if (!["not_started", "handoff_ready", "handoff_completed"].includes(attendanceBoundary)) {
    throw new Error("RWOS_INVALID_WORKER_ASSIGNMENT");
  }
  const versionToken = value.versionToken;
  if (!Number.isInteger(versionToken) || (versionToken as number) < 0) {
    throw new Error("RWOS_INVALID_WORKER_ASSIGNMENT");
  }
  if (value.visibility !== "worker_authorized_assignment") {
    throw new Error("RWOS_INVALID_WORKER_ASSIGNMENT");
  }
  const status = required("status");
  if (!workerAssignmentStatuses.includes(status as WorkerAssignmentDto["status"])) {
    throw new Error("RWOS_INVALID_WORKER_ASSIGNMENT");
  }
  const startAt = required("startAt");
  const endAt = required("endAt");
  const updatedAt = required("updatedAt");
  const startTime = Date.parse(startAt);
  const endTime = Date.parse(endAt);
  if (
    !Number.isFinite(startTime) ||
    !Number.isFinite(endTime) ||
    !Number.isFinite(Date.parse(updatedAt)) ||
    startTime >= endTime
  ) {
    throw new Error("RWOS_INVALID_WORKER_ASSIGNMENT");
  }
  const timezone = required("timezone");
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format(new Date(startTime));
  } catch {
    throw new Error("RWOS_INVALID_WORKER_ASSIGNMENT");
  }
  return {
    assignmentId: required("assignmentId"),
    workerOfferId: required("workerOfferId"),
    status: status as WorkerAssignmentDto["status"],
    title: required("title"),
    roleSummary: optional("roleSummary"),
    worksiteSummary: optional("worksiteSummary"),
    departmentSummary: optional("departmentSummary"),
    startAt,
    endAt,
    timezone,
    attendanceBoundary: attendanceBoundary as WorkerAssignmentDto["attendanceBoundary"],
    versionToken: versionToken as number,
    updatedAt,
    visibility: "worker_authorized_assignment"
  };
}

// Safe aggregate projection of GET /worker/payouts. Only worker-facing totals — never employer
// economics, invoices or individual payment references.
export type WorkerPayoutsSummary = Readonly<{
  currency: string;
  toPayMinor: number;
  paidMinor: number;
  toPayCount: number;
  paidCount: number;
}>;

function parseWorkerPayoutsSummary(input: unknown): WorkerPayoutsSummary | null {
  if (typeof input !== "object" || input === null) return null;
  const payload = input as { toPay?: unknown; paid?: unknown; summary?: unknown };
  if (!Array.isArray(payload.toPay) || !Array.isArray(payload.paid)) return null;
  const summary = (typeof payload.summary === "object" && payload.summary !== null ? payload.summary : {}) as {
    currency?: unknown;
    toPayMinor?: unknown;
    paidMinor?: unknown;
  };
  const currency = typeof summary.currency === "string" ? summary.currency : "CAD";
  const toPayMinor = Number.isFinite(summary.toPayMinor) ? Number(summary.toPayMinor) : 0;
  const paidMinor = Number.isFinite(summary.paidMinor) ? Number(summary.paidMinor) : 0;
  return {
    currency,
    toPayMinor,
    paidMinor,
    toPayCount: payload.toPay.length,
    paidCount: payload.paid.length
  };
}

// Safe worker-facing projection of an open marketplace posting (list item). Mirrors the backend
// select — area-level location only, no exact address, no employer economics (workerRateMinor is the
// only rate and is policy-gated to null for now).
export type MarketplaceJob = Readonly<{
  jobRequestId: string;
  role: string;
  employerName: string;
  verifiedEmployer: boolean;
  city: string;
  province: string;
  startAt: string;
  endAt: string;
  openings: number;
  workerRateMinor: number | null;
  currency: string;
  distanceKm: number | null;
  saved: boolean;
}>;

export type MarketplaceOrigin = Readonly<{ province: string; city: string; postalCode: string }>;

export type MarketplaceJobDetail = MarketplaceJob &
  Readonly<{ title: string; employerId: string; description: string | null; duties: string | null; qualifications: readonly string[] }>;

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseMarketplaceJob(input: unknown): MarketplaceJob | null {
  if (typeof input !== "object" || input === null) return null;
  const j = input as Record<string, unknown>;
  const jobRequestId = str(j.jobRequestId);
  const role = str(j.role);
  if (!jobRequestId || !role) return null;
  return {
    jobRequestId,
    role,
    employerName: str(j.employerName),
    verifiedEmployer: j.verifiedEmployer === true,
    city: str(j.city),
    province: str(j.province),
    startAt: str(j.startAt),
    endAt: str(j.endAt),
    openings: num(j.openings) ?? 1,
    workerRateMinor: num(j.workerRateMinor),
    currency: str(j.currency, "CAD"),
    distanceKm: num(j.distanceKm),
    saved: j.saved === true
  };
}

function parseMarketplaceSearch(
  input: unknown
): Readonly<{ jobs: readonly MarketplaceJob[]; total: number; origin: MarketplaceOrigin | null }> | null {
  if (typeof input !== "object" || input === null) return null;
  const payload = input as { jobs?: unknown; total?: unknown; origin?: unknown };
  if (!Array.isArray(payload.jobs)) return null;
  const jobs: MarketplaceJob[] = [];
  for (const row of payload.jobs) {
    const job = parseMarketplaceJob(row);
    if (job) jobs.push(job);
  }
  const o = payload.origin;
  const origin =
    typeof o === "object" && o !== null
      ? { province: str((o as Record<string, unknown>).province), city: str((o as Record<string, unknown>).city), postalCode: str((o as Record<string, unknown>).postalCode) }
      : null;
  return { jobs, total: num(payload.total) ?? jobs.length, origin };
}

function parseMarketplaceJobDetail(input: unknown): MarketplaceJobDetail | null {
  const base = parseMarketplaceJob(input);
  if (!base) return null;
  const j = input as Record<string, unknown>;
  const qualifications = Array.isArray(j.qualifications)
    ? j.qualifications.filter((q): q is string => typeof q === "string")
    : [];
  return {
    ...base,
    title: str(j.title, base.role),
    employerId: str(j.employerId),
    description: typeof j.description === "string" ? j.description : null,
    duties: typeof j.duties === "string" ? j.duties : null,
    qualifications
  };
}

// The worker's own application to an open posting: their interest status + the linked governed-offer
// status (when dispatch has created one), plus a privacy-safe job summary.
export type MarketplaceInterest = Readonly<{
  jobRequestId: string;
  status: string;
  createdAt: string;
  offerStatus: string | null;
  summary: Readonly<{ role: string; title: string; employerName: string; areaLabel: string | null; startAt: string; endAt: string }> | null;
}>;

function parseMarketplaceInterest(input: unknown): MarketplaceInterest | null {
  if (typeof input !== "object" || input === null) return null;
  const i = input as Record<string, unknown>;
  const jobRequestId = str(i.jobRequestId);
  if (!jobRequestId) return null;
  const s = i.summary;
  const summary =
    typeof s === "object" && s !== null
      ? (() => {
          const sr = s as Record<string, unknown>;
          const employer = (typeof sr.employer === "object" && sr.employer !== null ? sr.employer : {}) as Record<string, unknown>;
          return {
            role: str(sr.role),
            title: str(sr.title, str(sr.role)),
            employerName: str(employer.name),
            areaLabel: typeof sr.areaLabel === "string" ? sr.areaLabel : null,
            startAt: str(sr.startAt),
            endAt: str(sr.endAt)
          };
        })()
      : null;
  return {
    jobRequestId,
    status: str(i.status, "submitted"),
    createdAt: str(i.createdAt),
    offerStatus: typeof i.offerStatus === "string" ? i.offerStatus : null,
    summary
  };
}
