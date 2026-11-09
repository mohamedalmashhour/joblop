import * as SecureStore from "expo-secure-store";
import { SHIFT_OVERLAP_ERROR_CODE, parsePayOfferedView, parseWorkerCalendarDto, type PayOfferedView, type PublicCalendarJob, type WorkerCalendarDto } from "@rwos/shared";

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
      input: Readonly<{ email: string; password?: string; phone?: string; displayName?: string | null; acceptedLegalVersion?: string }>
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
            // The "Where?" box: a city (accents optional) or a postal code, same as the website.
            place: input.postalCode,
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
      | Readonly<{ status: "not_found" | "denied" | "error" }>
      | Readonly<{ status: "ineligible"; reasons: readonly string[] }>
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
        if (response.status === 409 || response.status === 422) {
          // The reasons say why (e.g. "missing_certificate:pab"), so the screen can name the certificate.
          const body = (await response.json().catch(() => ({}))) as { reasons?: unknown };
          return { status: "ineligible", reasons: stringList(body.reasons) };
        }
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
      let payload: { status?: unknown; reasons?: unknown; error?: unknown; messages?: unknown } = {};
      try {
        payload = ((await response.json()) ?? {}) as typeof payload;
      } catch {
        payload = {};
      }
      if (response.ok) return { status: "assigned" };
      if (response.status === 409 && payload.error === SHIFT_OVERLAP_ERROR_CODE) {
        return { status: "shift_overlap", messages: overlapMessages(payload.messages) };
      }
      if (response.status === 409 && payload.error === "RWOS_CLASSIFICATION_ELECTION_REQUIRED") return { status: "election_required" };
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
      | Readonly<{ status: "shift_overlap"; messages: Readonly<Partial<Record<"en" | "fr" | "ar", string>>> }>
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
        if (response.status === 409) {
          // Already holding a shift at that time: the API names it in EN / FR / AR.
          const body = (await response.json().catch(() => ({}))) as { error?: unknown; messages?: unknown };
          if (body.error === SHIFT_OVERLAP_ERROR_CODE) return { status: "shift_overlap", messages: overlapMessages(body.messages) };
          return { status: "stale" };
        }
        if (response.status === 412) return { status: "stale" };
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
    // The worker's interest / application on one job and whether they may apply
    // (GET /marketplace/jobs/:id/interest). Long-term jobs carry the employer's choice.
    async jobInterest(jobRequestId: string): Promise<
      Readonly<{ status: "ready"; data: JobInterestState }> | Readonly<{ status: "not_found" | "denied" | "offline" | "error" }>
    > {
      if (!isOperationalReference(jobRequestId)) return { status: "error" };
      const result = await workerCall(`/marketplace/jobs/${encodeURIComponent(jobRequestId)}/interest`, "GET");
      if (result.status === "denied" || result.status === "offline") return result;
      if (result.code === 404) return { status: "not_found" };
      if (result.status !== "ok") return { status: "error" };
      const p = (result.payload ?? {}) as { interest?: unknown; lastEmployerDecision?: unknown; eligibility?: unknown };
      const i = p.interest && typeof p.interest === "object" ? (p.interest as Record<string, unknown>) : null;
      const e = p.eligibility && typeof p.eligibility === "object" ? (p.eligibility as Record<string, unknown>) : {};
      return {
        status: "ready",
        data: {
          interest: i && typeof i.status === "string" ? { status: i.status, employerDecision: typeof i.employerDecision === "string" ? i.employerDecision : null } : null,
          lastEmployerDecision: typeof p.lastEmployerDecision === "string" ? p.lastEmployerDecision : null,
          eligibility: { eligible: e.eligible !== false, reasons: stringList(e.reasons) }
        }
      };
    },
    // Withdraw an interest / application (DELETE /marketplace/jobs/:id/interest). Never undoes an offer.
    async withdrawInterest(jobRequestId: string): Promise<Readonly<{ status: "ready" | "denied" | "offline" | "error" }>> {
      if (!isOperationalReference(jobRequestId)) return { status: "error" };
      const result = await workerCall(`/marketplace/jobs/${encodeURIComponent(jobRequestId)}/interest`, "DELETE");
      if (result.status === "denied" || result.status === "offline") return result;
      return result.status === "ok" ? { status: "ready" } : { status: "error" };
    },
    // The worker's own documents (GET /hr/documents): type, status and the expiry staff set. No review
    // notes and no storage references. 403 = signed in but not set up as a worker yet.
    async workerDocuments(): Promise<
      Readonly<{ status: "ready"; data: readonly WorkerDocument[] }> | Readonly<{ status: "denied" | "needs_setup" | "offline" | "error" }>
    > {
      const result = await workerCall("/hr/documents", "GET");
      if (result.status === "offline") return result;
      if (result.status === "denied") return result.code === 403 ? { status: "needs_setup" } : { status: "denied" };
      if (result.status !== "ok") return { status: "error" };
      const list = (result.payload as { documents?: unknown } | null)?.documents;
      if (!Array.isArray(list)) return { status: "error" };
      return { status: "ready", data: list.map(parseWorkerDocument).filter((d): d is WorkerDocument => d !== null) };
    },
    // Upload one document the same way the website does: a signed upload reference, the file bytes,
    // then the submission (a replacement supersedes the old one). Joblop staff review it; the worker
    // can never approve their own document.
    async uploadWorkerDocument(input: Readonly<{
      documentType: string;
      fileName: string;
      contentType: string;
      dataBase64: string;
      replace?: boolean;
    }>): Promise<Readonly<{ status: "ready" | "denied" | "offline" | "start_failed" | "upload_failed" | "submit_failed" }>> {
      const documentType = input.documentType.trim();
      if (!documentType || !input.dataBase64) return { status: "start_failed" };
      const ref = await workerCall("/hr/documents/upload-reference", "POST", { documentType });
      if (ref.status === "denied" || ref.status === "offline") return { status: ref.status };
      if (ref.status !== "ok") return { status: "start_failed" };
      const payload = (ref.payload ?? {}) as { storageReference?: unknown; uploadUrl?: unknown };
      const storageReference = typeof payload.storageReference === "string" ? payload.storageReference : "";
      if (!storageReference) return { status: "start_failed" };
      const signed = readUploadSignature(typeof payload.uploadUrl === "string" ? payload.uploadUrl : "");
      if (signed) {
        const blob = await workerCall("/hr/documents/blob", "POST", {
          ref: signed.ref,
          sig: signed.sig,
          contentType: input.contentType,
          fileName: input.fileName.slice(0, 200),
          dataBase64: input.dataBase64
        });
        if (blob.status === "denied" || blob.status === "offline") return { status: blob.status };
        if (blob.status !== "ok") return { status: "upload_failed" };
      }
      const submit = await workerCall(input.replace ? "/hr/documents/replace" : "/hr/documents", "POST", { documentType, storageReference });
      if (submit.status === "denied" || submit.status === "offline") return { status: submit.status };
      return submit.status === "ok" ? { status: "ready" } : { status: "submit_failed" };
    },
    // The worker deletes one of their own documents (revoked + logged); they can upload again.
    async removeWorkerDocument(documentId: string): Promise<Readonly<{ status: "ready" | "denied" | "offline" | "error" }>> {
      if (!isOperationalReference(documentId)) return { status: "error" };
      const result = await workerCall(`/hr/documents/${encodeURIComponent(documentId)}/remove`, "POST", {});
      if (result.status === "denied" || result.status === "offline") return { status: result.status };
      return result.status === "ok" ? { status: "ready" } : { status: "error" };
    },
    // The worker's own HR profile (GET /hr/worker): standing, credentials and their editable details.
    async workerProfile(): Promise<
      Readonly<{ status: "ready"; data: WorkerProfile }> | Readonly<{ status: "denied" | "needs_setup" | "offline" | "error" }>
    > {
      const result = await workerCall("/hr/worker", "GET");
      if (result.status === "offline") return result;
      if (result.status === "denied") return result.code === 403 ? { status: "needs_setup" } : { status: "denied" };
      if (result.status !== "ok") return { status: "error" };
      const profile = parseWorkerProfile(result.payload);
      return profile ? { status: "ready", data: profile } : { status: "error" };
    },
    // Save the worker's own details (PUT /hr/worker). Standing and credentials are never writable.
    async saveWorkerIntake(intake: Readonly<Record<string, string | boolean | null>>): Promise<Readonly<{ status: "ready" | "denied" | "offline" | "error" }>> {
      const result = await workerCall("/hr/worker", "PUT", intake);
      if (result.status === "denied" || result.status === "offline") return { status: result.status };
      return result.status === "ok" ? { status: "ready" } : { status: "error" };
    },
    // "Jobs I want" (GET/PUT /worker/job-categories). Each tap saves the whole choice.
    async jobCategories(): Promise<Readonly<{ status: "ready"; data: readonly JobCategoryChoice[] }> | Readonly<{ status: "denied" | "offline" | "error" }>> {
      const result = await workerCall("/worker/job-categories", "GET");
      if (result.status === "denied" || result.status === "offline") return { status: result.status };
      if (result.status !== "ok") return { status: "error" };
      return { status: "ready", data: parseJobCategories(result.payload) };
    },
    async saveJobCategories(keys: readonly string[]): Promise<Readonly<{ status: "ready"; data: readonly JobCategoryChoice[] }> | Readonly<{ status: "denied" | "offline" | "error" }>> {
      const result = await workerCall("/worker/job-categories", "PUT", { keys: keys.slice(0, 50) });
      if (result.status === "denied" || result.status === "offline") return { status: result.status };
      if (result.status !== "ok") return { status: "error" };
      return { status: "ready", data: parseJobCategories(result.payload) };
    },
    // Build the worker's CV (POST /worker/cv). The API decides everything: Worker Pro gets the AI writer
    // within its daily limit; anyone else, or any AI failure, gets the basic CV with a note in EN/FR/AR.
    async buildCv(input: Readonly<{ profile: Readonly<Record<string, unknown>>; jobTitle: string }>): Promise<
      Readonly<{ status: "ready"; data: CvResult }> | Readonly<{ status: "denied" | "invalid" | "offline" | "error" }>
    > {
      const result = await workerCall("/worker/cv", "POST", { profile: input.profile, job: { title: input.jobTitle } });
      if (result.status === "denied" || result.status === "offline") return { status: result.status };
      if (result.code === 400) return { status: "invalid" };
      if (result.status !== "ok") return { status: "error" };
      const cv = parseCvResult(result.payload);
      return cv ? { status: "ready", data: cv } : { status: "error" };
    },
    // Worker Pro status (GET /worker/cv/plan). Read-only: the app never sells or starts Pro.
    async cvPlan(): Promise<Readonly<{ status: "ready"; data: CvPlan }> | Readonly<{ status: "denied" | "offline" | "error" }>> {
      const result = await workerCall("/worker/cv/plan", "GET");
      if (result.status === "denied" || result.status === "offline") return { status: result.status };
      if (result.status !== "ok") return { status: "error" };
      const p = (result.payload ?? {}) as { pro?: unknown; entitlement?: unknown };
      const e = p.entitlement && typeof p.entitlement === "object" ? (p.entitlement as Record<string, unknown>) : null;
      return {
        status: "ready",
        data: {
          pro: p.pro === true,
          source: e && typeof e.source === "string" ? e.source : null,
          expiresAt: e && typeof e.expiresAt === "string" ? e.expiresAt : null
        }
      };
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
    // Save the worker's language (EN / FR / AR) on their account, so job offers, texts, emails and
    // push notices reach them in the language they use in the app. Best-effort: false on failure.
    async saveLanguage(language: "en" | "fr" | "ar"): Promise<boolean> {
      const token = await options.vault.read();
      if (!token || (language !== "en" && language !== "fr" && language !== "ar")) return false;
      try {
        const response = await request(`${origin}/worker/language`, {
          method: "PUT",
          headers: { accept: "application/json", authorization: `Bearer ${token}`, "content-type": "application/json" },
          body: JSON.stringify({ language }),
          cache: "no-store"
        });
        return response.ok;
      } catch {
        return false;
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
    },
    // "Contact Joblop" (GET /contact/worker/conversations): the worker's conversations with Joblop.
    // The AI assistant answers first; a staff member takes over when needed.
    async listContactConversations(): Promise<ContactListResult> {
      const result = await contactCall("/contact/worker/conversations", "GET");
      if (result.status !== "ok") return result;
      const payload = (result.payload ?? {}) as { conversations?: unknown; unread?: unknown };
      if (!Array.isArray(payload.conversations)) return { status: "error" };
      const conversations = payload.conversations
        .map(parseContactConversation)
        .filter((v): v is ContactConversation => v !== null);
      const unread = typeof payload.unread === "number" && Number.isFinite(payload.unread) ? Math.max(0, Math.floor(payload.unread)) : 0;
      return { status: "ready", conversations, unread };
    },
    // Start a conversation (POST /contact/worker/conversations). An assignmentId links it to one of
    // the worker's own shifts; "urgent" goes straight to a person.
    async startContactConversation(input: Readonly<{
      text: string;
      topic?: ContactTopic;
      assignmentId?: string | null;
      urgent?: boolean;
      locale?: string;
    }>): Promise<ContactStartResult> {
      const text = input.text.trim();
      if (!text || text.length > CONTACT_MAX_MESSAGE_LENGTH) return { status: "error" };
      if (input.assignmentId && !isOperationalReference(input.assignmentId)) return { status: "error" };
      const result = await contactCall("/contact/worker/conversations", "POST", {
        topic: input.topic ?? "other",
        body: text,
        urgent: input.urgent === true,
        ...(input.locale ? { locale: input.locale.slice(0, 2) } : {}),
        ...(input.assignmentId ? { relatedType: "assignment", relatedId: input.assignmentId } : {})
      });
      if (result.status !== "ok") return result;
      const id = (result.payload as { id?: unknown } | null)?.id;
      return typeof id === "string" && id.length > 0 ? { status: "ready", id } : { status: "error" };
    },
    // PUBLIC job board (GET /public/jobs) — no sign-in, no token. Area-level, privacy-safe Joblop
    // jobs for the signed-out first screen. A network failure is "offline".
    // `city` is the "Where?" box (a city, accents optional, or a postal code); `q` is the job word.
    async listPublicJobs(params: Readonly<{ q?: string; city?: string; limit?: number }> = {}): Promise<PublicJobsResult> {
      const result = await publicGet("/public/jobs", params);
      if (result.status !== "ok") return result;
      const payload = (result.payload ?? {}) as { jobs?: unknown };
      if (!Array.isArray(payload.jobs)) return { status: "error" };
      const jobs = payload.jobs.map(parsePublicJob).filter((v): v is PublicJob => v !== null);
      return { status: "ready", jobs };
    },
    // PUBLIC jobs calendar (GET /public/jobs/calendar) — no sign-in, no token. Open Joblop jobs for the
    // signed-out first screen's month calendar: role, city and province, time, places left and the
    // worker's own pay. A network failure is "offline".
    async listPublicCalendarJobs(params: Readonly<{ from: string; to: string }>): Promise<PublicCalendarJobsResult> {
      const result = await publicGet("/public/jobs/calendar", { from: params.from, to: params.to });
      if (result.status !== "ok") return result;
      const payload = (result.payload ?? {}) as { jobs?: unknown };
      if (!Array.isArray(payload.jobs)) return { status: "error" };
      const jobs = payload.jobs.map(parsePublicCalendarJob).filter((v): v is PublicCalendarJob => v !== null);
      return { status: "ready", jobs };
    },
    // PUBLIC partner job leads (GET /public/jobscanner/leads) — no sign-in, no token. Stored leads
    // only (apply on the source site).
    async listPublicLeads(params: Readonly<{ q?: string; city?: string; limit?: number }> = {}): Promise<PublicLeadsResult> {
      const result = await publicGet("/public/jobscanner/leads", params);
      if (result.status !== "ok") return result;
      const payload = (result.payload ?? {}) as { leads?: unknown; total?: unknown };
      if (!Array.isArray(payload.leads)) return { status: "error" };
      const leads = payload.leads.map(parsePublicLead).filter((v): v is PublicLead => v !== null);
      const total =
        typeof payload.total === "number" && Number.isFinite(payload.total) && payload.total >= leads.length
          ? Math.floor(payload.total)
          : leads.length;
      return { status: "ready", leads, total };
    },
    // One conversation with its messages (GET /contact/worker/conversations/:id). Marks it read.
    async getContactConversation(id: string): Promise<ContactThreadResult> {
      if (!isOperationalReference(id)) return { status: "error" };
      const result = await contactCall(`/contact/worker/conversations/${encodeURIComponent(id)}`, "GET");
      if (result.status !== "ok") return result;
      const payload = (result.payload ?? {}) as { conversation?: unknown; messages?: unknown };
      const conversation = parseContactConversation(payload.conversation);
      if (!conversation || !Array.isArray(payload.messages)) return { status: "error" };
      const messages = payload.messages.map(parseContactMessage).filter((v): v is ContactMessage => v !== null);
      return { status: "ready", conversation, messages };
    },
    // Add a message (POST /contact/worker/conversations/:id/messages).
    async sendContactMessage(id: string, text: string, locale?: string): Promise<ContactActionResult> {
      const body = text.trim();
      if (!isOperationalReference(id) || !body || body.length > CONTACT_MAX_MESSAGE_LENGTH) return { status: "error" };
      const result = await contactCall(`/contact/worker/conversations/${encodeURIComponent(id)}/messages`, "POST", {
        body,
        ...(locale ? { locale: locale.slice(0, 2) } : {})
      });
      return result.status === "ok" ? { status: "ready" } : result;
    },
    // "Talk to a person" (POST /contact/worker/conversations/:id/person): hands the conversation to staff.
    async askForPerson(id: string, locale?: string): Promise<ContactActionResult> {
      if (!isOperationalReference(id)) return { status: "error" };
      const result = await contactCall(
        `/contact/worker/conversations/${encodeURIComponent(id)}/person`,
        "POST",
        locale ? { locale: locale.slice(0, 2) } : {}
      );
      return result.status === "ok" ? { status: "ready" } : result;
    }
  };

  // Shared Bearer call for the worker routes added for website parity. A network exception is
  // "offline"; 401/403 "denied" (with the code, since 403 means "not set up as a worker yet").
  async function workerCall(
    path: string,
    method: "GET" | "POST" | "PUT" | "DELETE",
    body?: Readonly<Record<string, unknown>>
  ): Promise<
    | Readonly<{ status: "ok" | "failed"; code: number; payload: unknown }>
    | Readonly<{ status: "denied"; code: number }>
    | Readonly<{ status: "offline" }>
  > {
    const token = await options.vault.read();
    if (!token) return { status: "denied", code: 401 };
    const withBody = method === "POST" || method === "PUT";
    let response: Response;
    try {
      response = await request(`${origin}${path}`, {
        method,
        headers: withBody
          ? { accept: "application/json", "content-type": "application/json", authorization: `Bearer ${token}` }
          : { accept: "application/json", authorization: `Bearer ${token}` },
        ...(withBody ? { body: JSON.stringify(body ?? {}) } : {}),
        cache: "no-store"
      });
    } catch {
      return { status: "offline" };
    }
    if (response.status === 401 || response.status === 403) return { status: "denied", code: response.status };
    const payload = await response.json().catch(() => null);
    return { status: response.ok ? "ok" : "failed", code: response.status, payload };
  }

  // Shared token-free GET for the public routes. Never sends the session token.
  async function publicGet(
    path: string,
    params: Readonly<{ q?: string; city?: string; limit?: number; from?: string; to?: string }>
  ): Promise<Readonly<{ status: "ok"; payload: unknown }> | Readonly<{ status: "offline" | "error" }>> {
    const search: string[] = [];
    for (const key of ["from", "to"] as const) {
      const value = params[key];
      if (value && Number.isFinite(Date.parse(value))) search.push(`${key}=${encodeURIComponent(value)}`);
    }
    const q = (params.q ?? "").trim().slice(0, 80);
    if (q) search.push(`q=${encodeURIComponent(q)}`);
    const city = (params.city ?? "").trim().slice(0, 60);
    if (city) search.push(`city=${encodeURIComponent(city)}`);
    if (typeof params.limit === "number" && Number.isFinite(params.limit) && params.limit > 0) {
      search.push(`limit=${Math.floor(params.limit)}`);
    }
    let response: Response;
    try {
      response = await request(`${origin}${path}${search.length ? `?${search.join("&")}` : ""}`, {
        method: "GET",
        headers: { accept: "application/json" },
        cache: "no-store"
      });
    } catch {
      return { status: "offline" };
    }
    if (!response.ok) return { status: "error" };
    try {
      return { status: "ok", payload: await response.json() };
    } catch {
      return { status: "error" };
    }
  }

  // Shared Bearer call for the contact routes. A network exception is "offline"; 401/403 "denied".
  async function contactCall(
    path: string,
    method: "GET" | "POST",
    body?: Readonly<Record<string, unknown>>
  ): Promise<Readonly<{ status: "ok"; payload: unknown }> | Readonly<{ status: "denied" | "offline" | "error" }>> {
    const token = await options.vault.read();
    if (!token) return { status: "denied" };
    let response: Response;
    try {
      response = await request(`${origin}${path}`, {
        method,
        headers:
          method === "POST"
            ? { accept: "application/json", "content-type": "application/json", authorization: `Bearer ${token}` }
            : { accept: "application/json", authorization: `Bearer ${token}` },
        ...(method === "POST" ? { body: JSON.stringify(body ?? {}) } : {}),
        cache: "no-store"
      });
    } catch {
      return { status: "offline" };
    }
    if (response.status === 401 || response.status === 403) return { status: "denied" };
    if (!response.ok) return { status: "error" };
    try {
      return { status: "ok", payload: await response.json() };
    } catch {
      return { status: "error" };
    }
  }
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

// ── Documents, profile, CV (website parity) ─────────────────────────────────────

/** One of the worker's own documents. `expiresAt` is set by Joblop staff when they verify it. */
export type WorkerDocument = Readonly<{
  id: string;
  documentType: string;
  fileName: string | null;
  expiresAt: string | null;
  effectiveStatus: string;
}>;

function parseWorkerDocument(input: unknown): WorkerDocument | null {
  if (!input || typeof input !== "object") return null;
  const d = input as Record<string, unknown>;
  if (typeof d.id !== "string" || typeof d.documentType !== "string") return null;
  return {
    id: d.id,
    documentType: d.documentType,
    fileName: typeof d.fileName === "string" && d.fileName ? d.fileName : null,
    expiresAt: typeof d.expiresAt === "string" && d.expiresAt ? d.expiresAt : null,
    effectiveStatus: typeof d.effectiveStatus === "string" ? d.effectiveStatus : "submitted"
  };
}

/** ref + sig from the API's signed upload URL ("/api/documents/blob?ref=…&sig=…"). */
export function readUploadSignature(uploadUrl: string): Readonly<{ ref: string; sig: string }> | null {
  const query = uploadUrl.split("?")[1];
  if (!query) return null;
  const values: Record<string, string> = {};
  for (const part of query.split("&")) {
    const [key, value = ""] = part.split("=");
    if (!key) continue;
    try {
      values[key] = decodeURIComponent(value);
    } catch {
      return null;
    }
  }
  return values.ref && values.sig ? { ref: values.ref, sig: values.sig } : null;
}

export type WorkerCredential = Readonly<{ id: string; credentialType: string; expiresAt: string | null; effectiveStatus: string }>;

export type WorkerIntake = Readonly<{
  legalFirstName: string;
  legalLastName: string;
  phone: string;
  addressLine: string;
  city: string;
  province: string;
  postalCode: string;
  hasDrivingLicence: boolean;
  licenceClass: string;
  licenceExpiry: string;
  hasVehicle: boolean;
  transportNotes: string;
  marketingEmailOptIn: boolean;
}>;

export type WorkerProfile = Readonly<{ standing: string; credentials: readonly WorkerCredential[]; intake: WorkerIntake | null }>;

function parseWorkerProfile(input: unknown): WorkerProfile | null {
  if (!input || typeof input !== "object") return null;
  const p = input as Record<string, unknown>;
  const credentials = Array.isArray(p.credentials)
    ? p.credentials.flatMap((c): WorkerCredential[] => {
        if (!c || typeof c !== "object") return [];
        const r = c as Record<string, unknown>;
        if (typeof r.id !== "string" || typeof r.credentialType !== "string") return [];
        return [{
          id: r.id,
          credentialType: r.credentialType,
          expiresAt: typeof r.expiresAt === "string" ? r.expiresAt : null,
          effectiveStatus: typeof r.effectiveStatus === "string" ? r.effectiveStatus : "valid"
        }];
      })
    : [];
  const i = p.intake && typeof p.intake === "object" ? (p.intake as Record<string, unknown>) : null;
  const text = (key: string) => (i && typeof i[key] === "string" ? (i[key] as string) : "");
  const intake: WorkerIntake | null = i
    ? {
        legalFirstName: text("legalFirstName"),
        legalLastName: text("legalLastName"),
        phone: text("phone"),
        addressLine: text("addressLine"),
        city: text("city"),
        province: text("province"),
        postalCode: text("postalCode"),
        hasDrivingLicence: i.hasDrivingLicence === true,
        licenceClass: text("licenceClass"),
        licenceExpiry: text("licenceExpiry").slice(0, 10),
        hasVehicle: i.hasVehicle === true,
        transportNotes: text("transportNotes"),
        marketingEmailOptIn: i.marketingEmailOptIn === true
      }
    : null;
  return { standing: typeof p.standing === "string" ? p.standing : "inactive", credentials, intake };
}

export type JobCategoryChoice = Readonly<{ key: string; label: string; selected: boolean }>;

function parseJobCategories(input: unknown): JobCategoryChoice[] {
  const list = (input as { categories?: unknown } | null)?.categories;
  if (!Array.isArray(list)) return [];
  return list.flatMap((c): JobCategoryChoice[] => {
    if (!c || typeof c !== "object") return [];
    const r = c as Record<string, unknown>;
    return typeof r.key === "string" ? [{ key: r.key, label: typeof r.label === "string" ? r.label : r.key, selected: r.selected === true }] : [];
  });
}

/** The API's note when the AI writer was not used (busy, over today's limit, off): EN / FR / AR. */
export type CvFallbackNote = Readonly<{ reason: string; message: Readonly<{ en: string; fr: string; ar: string }> }>;

export type CvResult = Readonly<{
  headline: string;
  cvMarkdown: string;
  coverLetterMarkdown: string;
  aiWritten: boolean;
  saved: boolean;
  pro: boolean;
  fallback: CvFallbackNote | null;
}>;

function parseCvResult(input: unknown): CvResult | null {
  if (!input || typeof input !== "object") return null;
  const p = input as Record<string, unknown>;
  const cv = p.cv && typeof p.cv === "object" ? (p.cv as Record<string, unknown>) : null;
  if (!cv || typeof cv.cvMarkdown !== "string") return null;
  const f = p.fallback && typeof p.fallback === "object" ? (p.fallback as Record<string, unknown>) : null;
  const m = f && f.message && typeof f.message === "object" ? (f.message as Record<string, unknown>) : null;
  const fallback =
    f && m && typeof m.en === "string"
      ? {
          reason: typeof f.reason === "string" ? f.reason : "unavailable",
          message: { en: m.en, fr: typeof m.fr === "string" ? m.fr : m.en, ar: typeof m.ar === "string" ? m.ar : m.en }
        }
      : null;
  return {
    headline: typeof cv.headline === "string" ? cv.headline : "",
    cvMarkdown: cv.cvMarkdown,
    coverLetterMarkdown: typeof cv.coverLetterMarkdown === "string" ? cv.coverLetterMarkdown : "",
    aiWritten: typeof p.providerKind === "string" && p.providerKind.startsWith("claude"),
    saved: p.saved === true,
    pro: p.pro === true,
    fallback
  };
}

/** Worker Pro status only. Source: "trial" | "purchase" | "admin_grant". */
export type CvPlan = Readonly<{ pro: boolean; source: string | null; expiresAt: string | null }>;

// ── Contact Joblop ─────────────────────────────────────────────────────────────
// Same limits and values as the API (apps/api/src/instantContact.ts).
export const CONTACT_MAX_MESSAGE_LENGTH = 2000;
export const CONTACT_TOPICS = ["shift", "pay", "documents", "account", "other"] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];
export type ContactStatus = "ai" | "needs_admin" | "admin_replied" | "solved";
export type ContactAuthor = "requester" | "ai" | "admin" | "system";

export type ContactConversation = Readonly<{
  id: string;
  topic: string;
  status: ContactStatus;
  urgent: boolean;
  unread: boolean;
  lastMessageAt: string;
  createdAt: string;
}>;

export type ContactMessage = Readonly<{ id: string; authorKind: ContactAuthor; body: string; createdAt: string }>;

type ContactFailure = Readonly<{ status: "denied" | "offline" | "error" }>;
export type ContactListResult =
  | Readonly<{ status: "ready"; conversations: readonly ContactConversation[]; unread: number }>
  | ContactFailure;
export type ContactStartResult = Readonly<{ status: "ready"; id: string }> | ContactFailure;
export type ContactThreadResult =
  | Readonly<{ status: "ready"; conversation: ContactConversation; messages: readonly ContactMessage[] }>
  | ContactFailure;
export type ContactActionResult = Readonly<{ status: "ready" }> | ContactFailure;

const CONTACT_STATUSES: readonly ContactStatus[] = ["ai", "needs_admin", "admin_replied", "solved"];
const CONTACT_AUTHORS: readonly ContactAuthor[] = ["requester", "ai", "admin", "system"];

function parseContactConversation(input: unknown): ContactConversation | null {
  if (!input || typeof input !== "object") return null;
  const v = input as Record<string, unknown>;
  const str = (key: string) => (typeof v[key] === "string" && (v[key] as string).length > 0 ? (v[key] as string) : null);
  const id = str("id");
  const status = str("status");
  if (!id || !status || !(CONTACT_STATUSES as readonly string[]).includes(status)) return null;
  const lastMessageAt = str("lastMessageAt") ?? "";
  const createdAt = str("createdAt") ?? lastMessageAt;
  return {
    id,
    topic: str("topic") ?? "other",
    status: status as ContactStatus,
    urgent: v.urgent === true,
    unread: v.unread === true,
    lastMessageAt,
    createdAt
  };
}

function parseContactMessage(input: unknown): ContactMessage | null {
  if (!input || typeof input !== "object") return null;
  const v = input as Record<string, unknown>;
  const id = typeof v.id === "string" ? v.id : null;
  const authorKind = typeof v.authorKind === "string" ? v.authorKind : null;
  const body = typeof v.body === "string" ? v.body : null;
  if (!id || !authorKind || body === null || !(CONTACT_AUTHORS as readonly string[]).includes(authorKind)) return null;
  return { id, authorKind: authorKind as ContactAuthor, body, createdAt: typeof v.createdAt === "string" ? v.createdAt : "" };
}

// One Joblop job from the PUBLIC board (GET /public/jobs). Area-level only; urgency is the
// job's urgency ("normal" | "urgent" | "immediate").
export type PublicJob = Readonly<{
  jobCode: string;
  role: string;
  city: string | null;
  province: string | null;
  areaLabel: string;
  openings: number;
  startAt: string;
  urgency: string;
}>;

// One partner job lead from GET /public/jobscanner/leads. Salaries are integer cents; null when unknown.
export type PublicLead = Readonly<{
  title: string;
  employer: string;
  areaLabel: string;
  salaryMinMinor: number | null;
  salaryMaxMinor: number | null;
  salaryPeriod: string | null;
  category: string | null;
  postedAt: string | null;
  url: string | null;
  source: string;
}>;

export type PublicCalendarJobsResult =
  | Readonly<{ status: "ready"; jobs: readonly PublicCalendarJob[] }>
  | Readonly<{ status: "offline" | "error" }>;

export type PublicJobsResult =
  | Readonly<{ status: "ready"; jobs: readonly PublicJob[] }>
  | Readonly<{ status: "offline" | "error" }>;

export type PublicLeadsResult =
  | Readonly<{ status: "ready"; leads: readonly PublicLead[]; total: number }>
  | Readonly<{ status: "offline" | "error" }>;

function parsePublicJob(input: unknown): PublicJob | null {
  if (!input || typeof input !== "object") return null;
  const v = input as Record<string, unknown>;
  const s = (key: string) => (typeof v[key] === "string" && (v[key] as string).trim() ? (v[key] as string) : null);
  const jobCode = s("jobCode");
  const role = s("role");
  const startAt = s("startAt");
  if (!jobCode || !role || !startAt || !Number.isFinite(Date.parse(startAt))) return null;
  const openings = typeof v.openings === "number" && Number.isFinite(v.openings) ? Math.max(0, Math.floor(v.openings)) : 0;
  return {
    jobCode,
    role,
    city: s("city"),
    province: s("province"),
    areaLabel: s("areaLabel") ?? "Canada",
    openings,
    startAt,
    urgency: s("urgency") ?? "normal"
  };
}

// Only the public calendar fields are kept (whatever else an answer carries is dropped).
function parsePublicCalendarJob(input: unknown): PublicCalendarJob | null {
  if (!input || typeof input !== "object") return null;
  const v = input as Record<string, unknown>;
  const s = (key: string) => (typeof v[key] === "string" && (v[key] as string).trim() ? (v[key] as string) : null);
  const jobCode = s("jobCode");
  const role = s("role");
  const startAt = s("startAt");
  const endAt = s("endAt");
  if (!jobCode || !role || !startAt || !endAt || !Number.isFinite(Date.parse(startAt)) || !Number.isFinite(Date.parse(endAt))) return null;
  const placesLeft = typeof v.placesLeft === "number" && Number.isFinite(v.placesLeft) ? Math.max(0, Math.floor(v.placesLeft)) : 0;
  const rate = typeof v.workerRateMinor === "number" && Number.isFinite(v.workerRateMinor) && v.workerRateMinor > 0 ? Math.round(v.workerRateMinor) : null;
  const payOffered = "payOffered" in v ? parsePayOfferedView(v.payOffered) : undefined;
  return {
    jobCode,
    role,
    city: s("city"),
    province: s("province"),
    areaLabel: s("areaLabel") ?? "Canada",
    startAt,
    endAt,
    timezone: s("timezone"),
    placesLeft,
    workerRateMinor: rate,
    currency: s("currency"),
    ...(payOffered !== undefined ? { payOffered } : {})
  };
}

function parsePublicLead(input: unknown): PublicLead | null {
  if (!input || typeof input !== "object") return null;
  const v = input as Record<string, unknown>;
  const s = (key: string) => (typeof v[key] === "string" && (v[key] as string).trim() ? (v[key] as string) : null);
  const cents = (key: string) => {
    const n = v[key];
    return typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  };
  const title = s("title");
  if (!title) return null;
  const url = s("url");
  return {
    title,
    employer: s("employer") ?? "",
    areaLabel: s("areaLabel") ?? "Canada",
    salaryMinMinor: cents("salaryMinMinor"),
    salaryMaxMinor: cents("salaryMaxMinor"),
    salaryPeriod: s("salaryPeriod"),
    category: s("category"),
    postedAt: s("postedAt"),
    url: url && /^https:\/\//i.test(url) ? url : null,
    source: s("source") ?? ""
  };
}

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
  // Long-term listing only: the employer's own pay offer, paid directly.
  payOffered?: PayOfferedView | null;
}>;

export type OpenJobBonus = Readonly<{ kind: "hourly" | "transport" | "one_time"; amountMinor: number }>;

// Long-term listing only (employer plans flag): the API sends `payOffered` (the pay the employer offers
// and pays directly) instead of a Joblop rate. Absent key = not a long-term job.
function payOfferedField(record: Record<string, unknown>): Readonly<{ payOffered?: PayOfferedView | null }> {
  return "payOffered" in record ? { payOffered: parsePayOfferedView(record.payOffered) } : {};
}

export type OpenJobsResult =
  | Readonly<{ status: "ready"; jobs: readonly OpenJob[] }>
  | Readonly<{ status: "denied" | "offline" | "error" }>;

export type ClaimOpenJobResult =
  | Readonly<{ status: "assigned" | "full" | "not_open" | "election_required" | "denied" | "offline" | "error" }>
  | Readonly<{ status: "ineligible"; reasons: readonly string[] }>
  // The worker already holds a shift at that time (409 RWOS_SHIFT_OVERLAP). `messages` names that
  // shift in EN / FR / AR, as the API wrote it.
  | Readonly<{ status: "shift_overlap"; messages: Readonly<Partial<Record<"en" | "fr" | "ar", string>>> }>;

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
    urgency: str("urgency") ?? "normal",
    placesLeft,
    workerRateMinor: typeof rate === "number" && Number.isFinite(rate) && rate >= 0 ? rate : null,
    ...(bonus ? { bonus } : {}),
    ...payOfferedField(v)
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
  // Long-term listing only: the employer's own pay offer, paid directly.
  payOffered?: PayOfferedView | null;
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
    refId: str("refId"),
    ...payOfferedField(v)
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
  // Long-term listing only: the employer's own pay offer, paid directly.
  payOffered?: PayOfferedView | null;
  // Certificates the employer requires (absent when none).
  requiredCertificates?: RequiredCertificatesView;
}>;

/** The certificates an employer requires on a job: listed keys plus their own text for "other". */
export type RequiredCertificatesView = Readonly<{ keys: readonly string[]; other: string | null }>;

export type JobBonusView = Readonly<{ kind: string; amountMinor: number }>;
export type AllowanceLineView = Readonly<{ provision: string; amountMinor: number | null; note: string | null }>;
export type AllowancesView = Readonly<{ transport: AllowanceLineView | null; meal: AllowanceLineView | null; lodging: AllowanceLineView | null }>;

export type MarketplaceOrigin = Readonly<{ province: string; city: string; postalCode: string }>;

export type MarketplaceJobDetail = MarketplaceJob &
  Readonly<{
    title: string;
    employerId: string;
    description: string | null;
    duties: string | null;
    safetyNotes: string | null;
    qualifications: readonly string[];
    /** Short-term open-claim job the worker can take directly (else they express interest / apply). */
    claimable: boolean;
    /** Long-term listing: workers apply and the employer chooses (never claimed). */
    longTerm: boolean;
    /** Required certificates this worker misses; null when the viewer is not a worker yet. */
    missingCertificates: readonly string[] | null;
    bonus: JobBonusView | null;
    allowances: AllowancesView | null;
  }>;

/** The worker's current interest / application on one job, and whether they may apply. */
export type JobInterestState = Readonly<{
  interest: Readonly<{ status: string; employerDecision: string | null }> | null;
  lastEmployerDecision: string | null;
  eligibility: Readonly<{ eligible: boolean; reasons: readonly string[] }>;
}>;

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function overlapMessages(value: unknown): Partial<Record<"en" | "fr" | "ar", string>> {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const messages: Partial<Record<"en" | "fr" | "ar", string>> = {};
  for (const lang of ["en", "fr", "ar"] as const) {
    if (typeof raw[lang] === "string") messages[lang] = raw[lang] as string;
  }
  return messages;
}

function parseRequiredCertificates(value: unknown): RequiredCertificatesView | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const keys = stringList(v.keys);
  if (keys.length === 0) return null;
  return { keys, other: typeof v.other === "string" && v.other.trim() ? v.other : null };
}

function parseAllowanceLine(value: unknown): AllowanceLineView | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.provision !== "string") return null;
  return { provision: v.provision, amountMinor: num(v.amountMinor), note: typeof v.note === "string" && v.note ? v.note : null };
}

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
    saved: j.saved === true,
    ...payOfferedField(j),
    ...(() => {
      const required = parseRequiredCertificates(j.requiredCertificates);
      return required ? { requiredCertificates: required } : {};
    })()
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
    safetyNotes: typeof j.safetyNotes === "string" ? j.safetyNotes : null,
    qualifications,
    claimable: j.claimable === true,
    longTerm: j.longTerm === true,
    missingCertificates: Array.isArray(j.missingCertificates) ? stringList(j.missingCertificates) : null,
    bonus: (() => {
      const b = j.bonus as Record<string, unknown> | null | undefined;
      const amount = b ? num(b.amountMinor) : null;
      return b && typeof b.kind === "string" && amount !== null && amount > 0 ? { kind: b.kind, amountMinor: amount } : null;
    })(),
    allowances: (() => {
      const a = j.allowances as Record<string, unknown> | null | undefined;
      return a && typeof a === "object"
        ? { transport: parseAllowanceLine(a.transport), meal: parseAllowanceLine(a.meal), lodging: parseAllowanceLine(a.lodging) }
        : null;
    })()
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
  // Long-term job (employer plans flag): no check-in / check-out, the employer pays directly.
  clockInAllowed?: false;
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
    worksiteAddress: typeof r.worksiteAddress === "string" ? r.worksiteAddress : null,
    ...(r.clockInAllowed === false ? { clockInAllowed: false as const } : {})
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
