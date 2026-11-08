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

/** Phone code request: why it did not go through, so the screen can say something useful. */
export type PhoneCodeRequestResult = "requested" | "rate_limited" | "offline" | "error";
/** Phone code check: the session states plus "too many tries" and "no connection". */
export type PhoneVerifyState = MobileSessionState | Readonly<{ status: "rate_limited" }> | Readonly<{ status: "offline" }>;

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
    // Phone sign-in, step 1: ask for a texted code. The answer is the same whether or not the number
    // has an account, so this never reveals who is registered.
    async requestPhoneCode(phone: string): Promise<PhoneCodeRequestResult> {
      let response: Response;
      try {
        response = await request(`${origin}/auth/worker-phone/request`, {
          method: "POST",
          headers: { accept: "application/json", "content-type": "application/json" },
          body: JSON.stringify({ phone }),
          cache: "no-store"
        });
      } catch {
        // The request never reached Joblop (no internet, or blocked).
        return "offline";
      }
      if (response.ok) return "requested";
      if (response.status === 429) return "rate_limited";
      return "error";
    },
    // Phone sign-in, step 2: trade the code for a session kept in the device's secure store.
    async verifyPhoneCode(phone: string, code: string): Promise<PhoneVerifyState> {
      if (await options.vault.read()) return { status: "sign_out_required" };
      let response: Response;
      try {
        response = await request(`${origin}/auth/worker-phone/verify`, {
          method: "POST",
          headers: { accept: "application/json", "content-type": "application/json" },
          body: JSON.stringify({ phone, code }),
          cache: "no-store"
        });
      } catch {
        return { status: "offline" };
      }
      try {
        if (response.status === 429) return { status: "rate_limited" };
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
      input: Readonly<{ email: string; password?: string; phone?: string; displayName?: string | null }>
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
    // Open Joblop jobs in a time window (GET /marketplace/open-jobs?from&to) for the jobs calendar.
    // Real server data only. A network failure is "offline" so the screen can say so plainly.
    async listOpenJobs(window: Readonly<{ from: string; to: string }>): Promise<OpenJobsResult> {
      const token = await options.vault.read();
      if (!token) return { status: "denied" };
      const query = `?from=${encodeURIComponent(window.from)}&to=${encodeURIComponent(window.to)}`;
      let response: Response;
      try {
        response = await request(`${origin}/marketplace/open-jobs${query}`, {
          method: "GET",
          headers: { accept: "application/json", authorization: `Bearer ${token}` },
          cache: "no-store"
        });
      } catch {
        return { status: "offline" };
      }
      if (response.status === 401 || response.status === 403) return { status: "denied" };
      if (!response.ok) return { status: "error" };
      try {
        const payload = (await response.json()) as { jobs?: unknown };
        if (!Array.isArray(payload.jobs)) return { status: "error" };
        const jobs = payload.jobs.map(parseOpenJob).filter((v): v is OpenJob => v !== null);
        return { status: "ready", jobs };
      } catch {
        return { status: "error" };
      }
    },
    // Accept (claim) an open job (POST /marketplace/jobs/:id/claim). 201 → assigned; 409 → full or
    // no longer open; 422 → the worker is not eligible yet (reasons say what setup is missing).
    async claimOpenJob(jobRequestId: string): Promise<ClaimOpenJobResult> {
      const token = await options.vault.read();
      if (!token) return { status: "denied" };
      if (!isOperationalReference(jobRequestId)) return { status: "error" };
      let response: Response;
      try {
        response = await request(`${origin}/marketplace/jobs/${encodeURIComponent(jobRequestId)}/claim`, {
          method: "POST",
          headers: { accept: "application/json", "content-type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify({}),
          cache: "no-store"
        });
      } catch {
        return { status: "offline" };
      }
      if (response.status === 401 || response.status === 403) return { status: "denied" };
      let payload: { status?: unknown; reasons?: unknown } = {};
      try {
        payload = ((await response.json()) ?? {}) as typeof payload;
      } catch {
        payload = {};
      }
      if (response.ok) return { status: "assigned" };
      if (response.status === 409) return { status: payload.status === "full" ? "full" : "not_open" };
      if (response.status === 422) {
        const reasons = Array.isArray(payload.reasons) ? payload.reasons.filter((r): r is string => typeof r === "string") : [];
        return { status: "ineligible", reasons };
      }
      return { status: "error" };
    },
    // The worker's calendar hub (GET /worker/calendar-hub?from&to): open jobs to accept, own
    // shifts, cancelled shifts, pay days and the "Today" list. Real server data only; items that
    // are malformed are dropped rather than guessed. A network failure is "offline".
    async getCalendarHub(window: Readonly<{ from: string; to: string }>): Promise<CalendarHubResult> {
      const token = await options.vault.read();
      if (!token) return { status: "denied" };
      const query = `?from=${encodeURIComponent(window.from)}&to=${encodeURIComponent(window.to)}`;
      let response: Response;
      try {
        response = await request(`${origin}/worker/calendar-hub${query}`, {
          method: "GET",
          headers: { accept: "application/json", authorization: `Bearer ${token}` },
          cache: "no-store"
        });
      } catch {
        return { status: "offline" };
      }
      if (response.status === 401 || response.status === 403) return { status: "denied" };
      if (!response.ok) return { status: "error" };
      try {
        const payload = (await response.json()) as { items?: unknown; today?: unknown };
        if (!Array.isArray(payload.items)) return { status: "error" };
        const items = payload.items.map(parseHubItem).filter((v): v is CalendarHubItem => v !== null);
        const today = Array.isArray(payload.today)
          ? payload.today.map(parseHubToday).filter((v): v is CalendarHubToday => v !== null)
          : [];
        return { status: "ready", items, today };
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
    // The worker's own attendance schedule from GET /worker/attendance — their shifts with check-in/out
    // state. Worker-scoped read; the backend returns only this worker's records (no other worker data,
    // no home location).
    async workerAttendance(): Promise<
      | Readonly<{ status: "ready"; data: readonly WorkerAttendanceRecord[] }>
      | Readonly<{ status: "empty" | "denied" | "error" }>
    > {
      const token = await options.vault.read();
      if (!token) return { status: "denied" };
      try {
        const response = await request(`${origin}/worker/attendance`, {
          method: "GET",
          headers: { accept: "application/json", authorization: `Bearer ${token}` },
          cache: "no-store"
        });
        if (response.status === 401 || response.status === 403) return { status: "denied" };
        if (!response.ok) return { status: "error" };
        const payload = (await response.json()) as { items?: unknown };
        if (!Array.isArray(payload.items)) return { status: "error" };
        const data = payload.items.map(parseWorkerAttendanceRecord).filter((v): v is WorkerAttendanceRecord => v !== null);
        return data.length === 0 ? { status: "empty" } : { status: "ready", data };
      } catch {
        return { status: "error" };
      }
    },
    // Worker check-in / check-out on an attendance record. Optimistic-concurrency guarded by
    // expectedVersion (the value from the attendance list). The backend enforces the attendance-window
    // policy and state machine; the client reloads the schedule on success. No money moves.
    async attendanceCheckIn(attendanceRecordId: string, expectedVersion: number): Promise<AttendanceMutationResult> {
      const token = await options.vault.read();
      if (!token) return { status: "denied" };
      try {
        const response = await request(`${origin}/worker/attendance/${encodeURIComponent(attendanceRecordId)}/check-in`, {
          method: "POST",
          headers: { accept: "application/json", "content-type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify({ expectedVersion, method: "worker_app" }),
          cache: "no-store"
        });
        if (response.status === 401 || response.status === 403) return { status: "denied" };
        if (response.status === 404) return { status: "not_found" };
        if (response.status === 409 || response.status === 412) return { status: "conflict" };
        if (!response.ok) return { status: "error" };
        return { status: "ready" };
      } catch {
        return { status: "error" };
      }
    },
    async attendanceCheckOut(attendanceRecordId: string, expectedVersion: number): Promise<AttendanceMutationResult> {
      const token = await options.vault.read();
      if (!token) return { status: "denied" };
      try {
        const response = await request(`${origin}/worker/attendance/${encodeURIComponent(attendanceRecordId)}/check-out`, {
          method: "POST",
          headers: { accept: "application/json", "content-type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify({ expectedVersion, method: "worker_app" }),
          cache: "no-store"
        });
        if (response.status === 401 || response.status === 403) return { status: "denied" };
        if (response.status === 404) return { status: "not_found" };
        if (response.status === 409 || response.status === 412) return { status: "conflict" };
        if (!response.ok) return { status: "error" };
        return { status: "ready" };
      } catch {
        return { status: "error" };
      }
    },
    // The worker's own timesheets from GET /worker/timesheets — their shifts' recorded time with review
    // status. Worker-scoped read; safe projection (no employer economics). Confirm/dispute below are the
    // worker's governed review actions on a timesheet in worker-review; they compute no payroll and move
    // no money.
    async workerTimesheets(): Promise<
      | Readonly<{ status: "ready"; data: readonly WorkerTimesheet[] }>
      | Readonly<{ status: "empty" | "denied" | "error" }>
    > {
      const token = await options.vault.read();
      if (!token) return { status: "denied" };
      try {
        const response = await request(`${origin}/worker/timesheets`, {
          method: "GET",
          headers: { accept: "application/json", authorization: `Bearer ${token}` },
          cache: "no-store"
        });
        if (response.status === 401 || response.status === 403) return { status: "denied" };
        if (!response.ok) return { status: "error" };
        const payload = (await response.json()) as { items?: unknown };
        if (!Array.isArray(payload.items)) return { status: "error" };
        const data = payload.items.map(parseWorkerTimesheet).filter((v): v is WorkerTimesheet => v !== null);
        return data.length === 0 ? { status: "empty" } : { status: "ready", data };
      } catch {
        return { status: "error" };
      }
    },
    async timesheetConfirm(timesheetId: string, expectedVersion: number): Promise<TimesheetMutationResult> {
      const token = await options.vault.read();
      if (!token) return { status: "denied" };
      try {
        const response = await request(`${origin}/worker/timesheets/${encodeURIComponent(timesheetId)}/confirm`, {
          method: "POST",
          headers: { accept: "application/json", "content-type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify({ expectedVersion }),
          cache: "no-store"
        });
        if (response.status === 401 || response.status === 403) return { status: "denied" };
        if (response.status === 404) return { status: "not_found" };
        if (response.status === 409 || response.status === 412) return { status: "conflict" };
        if (!response.ok) return { status: "error" };
        return { status: "ready" };
      } catch {
        return { status: "error" };
      }
    },
    async timesheetDispute(timesheetId: string, expectedVersion: number, reason: string): Promise<TimesheetMutationResult> {
      const token = await options.vault.read();
      if (!token) return { status: "denied" };
      if (reason.trim().length === 0) return { status: "invalid" };
      try {
        const response = await request(`${origin}/worker/timesheets/${encodeURIComponent(timesheetId)}/dispute`, {
          method: "POST",
          headers: { accept: "application/json", "content-type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify({ expectedVersion, reason: reason.trim() }),
          cache: "no-store"
        });
        if (response.status === 401 || response.status === 403) return { status: "denied" };
        if (response.status === 404) return { status: "not_found" };
        if (response.status === 400) return { status: "invalid" };
        if (response.status === 409 || response.status === 412) return { status: "conflict" };
        if (!response.ok) return { status: "error" };
        return { status: "ready" };
      } catch {
        return { status: "error" };
      }
    },
    // The worker's pay-channel classification state from GET /worker/profile/classification. `election`
    // is null until the worker has elected (and signed); `agreementVersions` names the current signed
    // agreement per channel. Read-only.
    async workerClassification(): Promise<
      | Readonly<{ status: "ready"; election: WorkerElection | null; agreementVersions: Readonly<{ employee: string; contractor: string }> }>
      | Readonly<{ status: "denied" | "error" }>
    > {
      const token = await options.vault.read();
      if (!token) return { status: "denied" };
      try {
        const response = await request(`${origin}/worker/profile/classification`, {
          method: "GET",
          headers: { accept: "application/json", authorization: `Bearer ${token}` },
          cache: "no-store"
        });
        if (response.status === 401 || response.status === 403) return { status: "denied" };
        if (!response.ok) return { status: "error" };
        const payload = (await response.json()) as { election?: unknown; agreementVersions?: unknown };
        const av = payload.agreementVersions as Record<string, unknown> | undefined;
        const agreementVersions = {
          employee: typeof av?.employee === "string" ? av.employee : "",
          contractor: typeof av?.contractor === "string" ? av.contractor : ""
        };
        return { status: "ready", election: parseWorkerElection(payload.election), agreementVersions };
      } catch {
        return { status: "error" };
      }
    },
    // The worker elects their pay channel and SIGNS the matching agreement. This creates their worker
    // identity (if new) and records a signed, append-only election — the gate that lets them apply to
    // and receive offers. It computes no payroll and moves no money.
    async electClassification(input: Readonly<{ classification: "employee" | "contractor"; agreementVersion: string; agreementAccepted: boolean }>): Promise<
      | Readonly<{ status: "ready"; election: WorkerElection | null; unchanged: boolean }>
      | Readonly<{ status: "denied" | "invalid" | "stale" | "error" }>
    > {
      const token = await options.vault.read();
      if (!token) return { status: "denied" };
      if (!input.agreementAccepted) return { status: "invalid" };
      try {
        const response = await request(`${origin}/worker/profile/classification-election`, {
          method: "POST",
          headers: { accept: "application/json", "content-type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify({ classification: input.classification, agreementVersion: input.agreementVersion, agreementAccepted: true }),
          cache: "no-store"
        });
        if (response.status === 401 || response.status === 403) return { status: "denied" };
        if (response.status === 400) return { status: "invalid" };
        if (response.status === 409) return { status: "stale" };
        if (!response.ok) return { status: "error" };
        const payload = (await response.json()) as { election?: unknown; unchanged?: unknown };
        return { status: "ready", election: parseWorkerElection(payload.election), unchanged: payload.unchanged === true };
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
    },
    // True only when a real session token is stored (a guest who skipped sign-in has none).
    async hasSession(): Promise<boolean> {
      try {
        return Boolean(await options.vault.read());
      } catch {
        return false;
      }
    },
    // Push notifications: tell the API which device token to send shift notices to.
    async registerPushToken(
      input: Readonly<{ token: string; platform: PushPlatform }>
    ): Promise<PushTokenResult> {
      const token = await options.vault.read();
      if (!token) return { status: "denied" };
      if (!isExpoPushToken(input.token) || !pushPlatforms.includes(input.platform)) {
        return { status: "invalid" };
      }
      try {
        const response = await request(`${origin}/worker/push-tokens`, {
          method: "POST",
          headers: {
            accept: "application/json",
            authorization: `Bearer ${token}`,
            "content-type": "application/json"
          },
          body: JSON.stringify({ token: input.token, platform: input.platform }),
          cache: "no-store"
        });
        return pushTokenStatus(response.status);
      } catch {
        return { status: "error" };
      }
    },
    // Called before sign-out so this device stops getting the worker's notices.
    async unregisterPushToken(pushToken: string): Promise<PushTokenResult> {
      const token = await options.vault.read();
      if (!token) return { status: "denied" };
      if (!isExpoPushToken(pushToken)) return { status: "invalid" };
      try {
        const response = await request(`${origin}/worker/push-tokens`, {
          method: "DELETE",
          headers: {
            accept: "application/json",
            authorization: `Bearer ${token}`,
            "content-type": "application/json"
          },
          body: JSON.stringify({ token: pushToken }),
          cache: "no-store"
        });
        return pushTokenStatus(response.status);
      } catch {
        return { status: "error" };
      }
    }
  };
}

export type PushPlatform = "ios" | "android" | "web";
const pushPlatforms: readonly PushPlatform[] = ["ios", "android", "web"];
export type PushTokenResult = Readonly<{ status: "ready" | "denied" | "invalid" | "unavailable" | "error" }>;

export function isExpoPushToken(value: string): boolean {
  return /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{8,200}\]$/.test(value);
}

function pushTokenStatus(status: number): PushTokenResult {
  if (status === 401 || status === 403) return { status: "denied" };
  if (status === 400 || status === 422) return { status: "invalid" };
  if (status === 404 || status === 503) return { status: "unavailable" };
  if (status < 200 || status >= 300) return { status: "error" };
  return { status: "ready" };
}

export type MobileSessionTransport = ReturnType<typeof createMobileSessionTransport>;

// One open job from GET /marketplace/open-jobs. Rates are cents per hour; null when not shared.
export type OpenJob = Readonly<{
  jobRequestId: string;
  role: string;
  areaLabel: string;
  startAt: string;
  endAt: string;
  urgency: string;
  placesLeft: number;
  workerRateMinor: number | null;
  // Extra pay Joblop added to fill the job faster; absent when there is none. Amount in cents.
  bonus?: OpenJobBonus;
}>;

export type OpenJobBonus = Readonly<{ kind: "hourly" | "transport" | "one_time"; amountMinor: number }>;

export type OpenJobsResult =
  | Readonly<{ status: "ready"; jobs: readonly OpenJob[] }>
  | Readonly<{ status: "denied" | "offline" | "error" }>;

export type ClaimOpenJobResult =
  | Readonly<{ status: "assigned" | "full" | "not_open" | "denied" | "offline" | "error" }>
  | Readonly<{ status: "ineligible"; reasons: readonly string[] }>;

function parseOpenJob(input: unknown): OpenJob | null {
  if (!input || typeof input !== "object") return null;
  const v = input as Record<string, unknown>;
  const str = (key: string) => (typeof v[key] === "string" ? (v[key] as string) : null);
  const jobRequestId = str("jobRequestId");
  const startAt = str("startAt");
  const endAt = str("endAt");
  if (!jobRequestId || !startAt || !endAt) return null;
  if (!Number.isFinite(Date.parse(startAt)) || !Number.isFinite(Date.parse(endAt))) return null;
  const placesLeft = typeof v.placesLeft === "number" && Number.isFinite(v.placesLeft) ? Math.max(0, Math.floor(v.placesLeft)) : 0;
  const rate = v.workerRateMinor;
  const bonus = parseOpenJobBonus(v.bonus);
  return {
    jobRequestId,
    role: str("role") ?? "",
    areaLabel: str("areaLabel") ?? "",
    startAt,
    endAt,
    urgency: str("urgency") ?? "standard",
    placesLeft,
    workerRateMinor: typeof rate === "number" && Number.isFinite(rate) && rate >= 0 ? rate : null,
    ...(bonus ? { bonus } : {})
  };
}

function parseOpenJobBonus(input: unknown): OpenJobBonus | null {
  if (!input || typeof input !== "object") return null;
  const v = input as Record<string, unknown>;
  const kind = v.kind;
  const amount = v.amountMinor;
  if (kind !== "hourly" && kind !== "transport" && kind !== "one_time") return null;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) return null;
  return { kind, amountMinor: Math.round(amount) };
}

// One dated item from GET /worker/calendar-hub. Amounts are integer cents CAD.
// type: available_job | my_shift | cancelled_shift | pay_day (unknown types are kept but not shown).
export type CalendarHubItem = Readonly<{
  id: string;
  type: string;
  startAt: string;
  endAt: string | null;
  title: string;
  subtitle: string | null;
  status: string | null;
  amountMinor: number | null;
  bonus: OpenJobBonus | null;
  placesLeft: number | null;
  placesAsked: number | null;
  placesTaken: number | null;
  jobRequestId: string | null;
  refId: string | null;
}>;

export type CalendarHubToday = Readonly<{
  type: string;
  title: string;
  detail: string | null;
  severity: "info" | "attention" | "urgent";
  startAt: string | null;
  jobRequestId: string | null;
  refId: string | null;
}>;

export type CalendarHubResult =
  | Readonly<{ status: "ready"; items: readonly CalendarHubItem[]; today: readonly CalendarHubToday[] }>
  | Readonly<{ status: "denied" | "offline" | "error" }>;

function parseHubItem(input: unknown): CalendarHubItem | null {
  if (!input || typeof input !== "object") return null;
  const v = input as Record<string, unknown>;
  const str = (key: string) => (typeof v[key] === "string" && (v[key] as string).length > 0 ? (v[key] as string) : null);
  const num = (key: string) => (typeof v[key] === "number" && Number.isFinite(v[key]) ? (v[key] as number) : null);
  const id = str("id");
  const type = str("type");
  const startAt = str("startAt");
  if (!id || !type || !startAt || !Number.isFinite(Date.parse(startAt))) return null;
  const endAt = str("endAt");
  return {
    id,
    type,
    startAt,
    endAt: endAt && Number.isFinite(Date.parse(endAt)) ? endAt : null,
    title: str("title") ?? "",
    subtitle: str("subtitle"),
    status: str("status"),
    amountMinor: num("amountMinor"),
    bonus: parseOpenJobBonus(v.bonus),
    placesLeft: num("placesLeft"),
    placesAsked: num("placesAsked"),
    placesTaken: num("placesTaken"),
    jobRequestId: str("jobRequestId"),
    refId: str("refId")
  };
}

function parseHubToday(input: unknown): CalendarHubToday | null {
  if (!input || typeof input !== "object") return null;
  const v = input as Record<string, unknown>;
  const str = (key: string) => (typeof v[key] === "string" && (v[key] as string).length > 0 ? (v[key] as string) : null);
  const title = str("title");
  if (!title) return null;
  const severity = v.severity === "urgent" || v.severity === "attention" ? v.severity : "info";
  const startAt = str("startAt");
  return {
    type: str("type") ?? "info",
    title,
    detail: str("detail"),
    severity,
    startAt: startAt && Number.isFinite(Date.parse(startAt)) ? startAt : null,
    jobRequestId: str("jobRequestId"),
    refId: str("refId")
  };
}

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

// Safe worker-facing projection of one attendance record (the worker's own shift). No other worker
// data, no exact address — only the area label the backend already returns.
export type WorkerAttendanceRecord = Readonly<{
  attendanceRecordId: string;
  assignmentId: string;
  status: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  timezone: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  exceptionCategory: string | null;
  version: number;
  employerName: string;
  areaLabel: string | null;
  // The exact address, sent only for the worker's own shift while it is still to be worked.
  worksiteAddress: string | null;
}>;

export type AttendanceMutationResult = Readonly<{ status: "ready" | "denied" | "not_found" | "conflict" | "error" }>;

function parseWorkerAttendanceRecord(input: unknown): WorkerAttendanceRecord | null {
  if (typeof input !== "object" || input === null) return null;
  const r = input as Record<string, unknown>;
  const attendanceRecordId = str(r.attendanceRecordId);
  if (!attendanceRecordId) return null;
  return {
    attendanceRecordId,
    assignmentId: str(r.assignmentId),
    status: str(r.status),
    scheduledStartAt: str(r.scheduledStartAt),
    scheduledEndAt: str(r.scheduledEndAt),
    timezone: str(r.timezone),
    checkInAt: typeof r.checkInAt === "string" ? r.checkInAt : null,
    checkOutAt: typeof r.checkOutAt === "string" ? r.checkOutAt : null,
    exceptionCategory: typeof r.exceptionCategory === "string" ? r.exceptionCategory : null,
    version: num(r.version) ?? 0,
    employerName: str(r.employerName),
    areaLabel: typeof r.areaLabel === "string" ? r.areaLabel : null,
    worksiteAddress: typeof r.worksiteAddress === "string" ? r.worksiteAddress : null
  };
}

// Safe worker-facing projection of one of the worker's timesheets. No employer economics; only the
// worker's own recorded time + review status.
export type WorkerTimesheet = Readonly<{
  timesheetId: string;
  assignmentId: string;
  status: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  payableMinutes: number | null;
  billableMinutes: number | null;
  breakMinutes: number;
  workerReviewStatus: string;
  version: number;
  employerName: string;
  areaLabel: string | null;
}>;

export type TimesheetMutationResult = Readonly<{ status: "ready" | "denied" | "not_found" | "conflict" | "invalid" | "error" }>;

function parseWorkerTimesheet(input: unknown): WorkerTimesheet | null {
  if (typeof input !== "object" || input === null) return null;
  const r = input as Record<string, unknown>;
  const timesheetId = str(r.timesheetId);
  if (!timesheetId) return null;
  return {
    timesheetId,
    assignmentId: str(r.assignmentId),
    status: str(r.status),
    scheduledStartAt: str(r.scheduledStartAt),
    scheduledEndAt: str(r.scheduledEndAt),
    payableMinutes: num(r.payableMinutes),
    billableMinutes: num(r.billableMinutes),
    breakMinutes: num(r.breakMinutes) ?? 0,
    workerReviewStatus: str(r.workerReviewStatus),
    version: num(r.version) ?? 0,
    employerName: str(r.employerName),
    areaLabel: typeof r.areaLabel === "string" ? r.areaLabel : null
  };
}

// The worker's active pay-channel election (safe projection: no other-party user ids beyond their own
// signer, which the backend already returns).
export type WorkerElection = Readonly<{
  classification: "employee" | "contractor";
  status: string;
  agreementVersion: string | null;
  effectiveFrom: string;
}>;

function parseWorkerElection(input: unknown): WorkerElection | null {
  if (typeof input !== "object" || input === null) return null;
  const e = input as Record<string, unknown>;
  const classification = e.classification;
  if (classification !== "employee" && classification !== "contractor") return null;
  return {
    classification,
    status: str(e.status),
    agreementVersion: typeof e.agreementVersion === "string" ? e.agreementVersion : null,
    effectiveFrom: str(e.effectiveFrom)
  };
}
