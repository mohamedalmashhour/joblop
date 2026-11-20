import type {
  CandidateSourceSearchResult,
  DispatchCandidateSource,
  PublicDispatchCandidate,
  PublicDispatchReview
} from "./index";

type Fetch = typeof fetch;

export class ProductionIntegrationError extends Error {
  constructor() {
    super("Production integration unavailable.");
    this.name = "ProductionIntegrationError";
  }
}

export type WorkerOfferDeliveryResult = Readonly<{
  status: "sent" | "delivered" | "failed";
  providerReference: string | null;
  retryable: boolean;
}>;

export interface WorkerOfferDeliveryProvider {
  deliver(input: {
    organizationId: string;
    workerOfferId: string;
    workerIdentityId: string;
    idempotencyKey: string;
  }): Promise<WorkerOfferDeliveryResult>;
}

type HttpOptions = {
  origin: string;
  token: string;
  timeoutMs?: number;
  fetch?: Fetch;
  trustedIdentityHeaders?: () => Promise<Readonly<Record<string, string>>>;
};

export function createHttpCandidateSource(
  options: HttpOptions & { maxCandidateAgeMs?: number }
): DispatchCandidateSource {
  const boundary = createHttpBoundary(options);
  const maxCandidateAgeMs = options.maxCandidateAgeMs ?? 15 * 60 * 1000;

  return {
    async getStatus() {
      try {
        const response = await boundary("/ready", { method: "GET" });
        return {
          status: response.ok ? ("available" as const) : ("candidate_source_unavailable" as const)
        };
      } catch {
        return { status: "candidate_source_unavailable" as const };
      }
    },
    async searchCandidates(input) {
      const payload = await requestCandidates(boundary, "/v1/candidates/search", input);
      return {
        status: "available",
        candidates: parseCandidateList(
          payload,
          input.dispatchReview,
          input.requestedAt,
          maxCandidateAgeMs,
          undefined
        )
      } satisfies CandidateSourceSearchResult;
    },
    async evaluateCandidate(input) {
      const response = await boundary("/v1/candidates/evaluate", {
        method: "POST",
        headers: candidateAuthorizationHeaders(
          input.dispatchReview.organizationId,
          "candidates:evaluate"
        ),
        body: JSON.stringify({
          dispatchReviewId: input.dispatchReview.id,
          organizationId: input.dispatchReview.organizationId,
          workGroupId: input.dispatchReview.workGroupId,
          roleDefinitionId: input.dispatchReview.roleDefinitionId,
          candidateSourceReference: input.candidateSourceReference,
          startAt: input.staffingWindow.startAt.toISOString(),
          endAt: input.staffingWindow.endAt.toISOString(),
          timezone: input.staffingWindow.timezone
        })
      });
      if (!response.ok) throw new ProductionIntegrationError();
      const payload: unknown = await response.json().catch(() => null);
      const record = asRecord(payload);
      return {
        status: "available",
        candidate: parseCandidate(
          record.candidate,
          input.dispatchReview,
          input.requestedAt,
          maxCandidateAgeMs,
          input.candidateSourceReference
        )
      };
    }
  };
}

export function createHttpWorkerOfferDeliveryProvider(
  options: HttpOptions
): WorkerOfferDeliveryProvider {
  const boundary = createHttpBoundary(options);
  return {
    async deliver(input) {
      try {
        const response = await boundary("/v1/worker-offers/deliver", {
          method: "POST",
          headers: {
            "idempotency-key": input.idempotencyKey,
            "x-rwos-service-id": "rwos-api",
            "x-rwos-tenant-id": input.organizationId,
            "x-rwos-operation": "worker-offers:deliver"
          },
          body: JSON.stringify({
            organizationId: input.organizationId,
            workerOfferId: input.workerOfferId,
            workerIdentityId: input.workerIdentityId
          })
        });
        if (!response.ok) return failedDelivery();
        const record = asRecord(await response.json().catch(() => null));
        if (!["sent", "delivered", "failed"].includes(String(record.status))) {
          return failedDelivery();
        }
        const status = record.status as WorkerOfferDeliveryResult["status"];
        const providerReference =
          typeof record.providerReference === "string" && record.providerReference.length <= 200
            ? record.providerReference
            : null;
        return {
          status,
          providerReference,
          retryable: status === "failed" ? record.retryable === true : false
        };
      } catch {
        return failedDelivery();
      }
    }
  };
}

async function requestCandidates(
  boundary: ReturnType<typeof createHttpBoundary>,
  path: string,
  input: {
    dispatchReview: PublicDispatchReview;
    staffingWindow: { startAt: Date; endAt: Date; timezone: string };
    requestedAt: Date;
  }
) {
  const response = await boundary(path, {
    method: "POST",
    headers: candidateAuthorizationHeaders(
      input.dispatchReview.organizationId,
      "candidates:search"
    ),
    body: JSON.stringify({
      dispatchReviewId: input.dispatchReview.id,
      organizationId: input.dispatchReview.organizationId,
      workGroupId: input.dispatchReview.workGroupId,
      roleDefinitionId: input.dispatchReview.roleDefinitionId,
      startAt: input.staffingWindow.startAt.toISOString(),
      endAt: input.staffingWindow.endAt.toISOString(),
      timezone: input.staffingWindow.timezone,
      requestedAt: input.requestedAt.toISOString()
    })
  });
  if (!response.ok) throw new ProductionIntegrationError();
  return response.json().catch(() => {
    throw new ProductionIntegrationError();
  });
}

function candidateAuthorizationHeaders(
  organizationId: string,
  operation: "candidates:search" | "candidates:evaluate"
) {
  return {
    "x-rwos-service-id": "rwos-api",
    "x-rwos-tenant-id": organizationId,
    "x-rwos-operation": operation
  };
}

function parseCandidateList(
  input: unknown,
  dispatchReview: PublicDispatchReview,
  requestedAt: Date,
  maxCandidateAgeMs: number,
  expectedCandidateSourceReference: string | undefined
) {
  const candidates = asRecord(input).candidates;
  if (!Array.isArray(candidates) || candidates.length > 100) throw new ProductionIntegrationError();
  const parsed = candidates.map((candidate) =>
    parseCandidate(
      candidate,
      dispatchReview,
      requestedAt,
      maxCandidateAgeMs,
      expectedCandidateSourceReference
    )
  );
  if (
    new Set(parsed.map((candidate) => candidate.candidateSourceReference)).size !== parsed.length ||
    new Set(parsed.map((candidate) => candidate.workerIdentityId)).size !== parsed.length
  ) {
    throw new ProductionIntegrationError();
  }
  return parsed;
}

function parseCandidate(
  input: unknown,
  dispatchReview: PublicDispatchReview,
  requestedAt: Date,
  maxCandidateAgeMs: number,
  expectedCandidateSourceReference: string | undefined
): PublicDispatchCandidate {
  const record = asRecord(input);
  if (record.organizationId !== dispatchReview.organizationId)
    throw new ProductionIntegrationError();
  const workerIdentityId = requiredUuid(record.workerIdentityId);
  const candidateSourceReference = requiredString(record.candidateSourceReference, 200);
  if (
    expectedCandidateSourceReference !== undefined &&
    candidateSourceReference !== expectedCandidateSourceReference
  ) {
    throw new ProductionIntegrationError();
  }
  const approvedDisplayName = requiredString(record.approvedDisplayName, 160);
  const sourceFreshnessAt = new Date(requiredString(record.sourceFreshnessAt, 40));
  if (
    !Number.isFinite(sourceFreshnessAt.getTime()) ||
    sourceFreshnessAt > requestedAt ||
    requestedAt.getTime() - sourceFreshnessAt.getTime() > maxCandidateAgeMs
  ) {
    throw new ProductionIntegrationError();
  }
  const now = requestedAt;
  return {
    id: `external:${candidateSourceReference}`,
    dispatchReviewId: dispatchReview.id,
    workerIdentityId,
    candidateSourceType: enumValue(record.candidateSourceType, [
      "internal_worker_profile",
      "invited_worker",
      "staffing_partner",
      "enterprise_employee_pool",
      "external_integration"
    ]),
    candidateSourceReference,
    approvedDisplayName,
    workGroupMatch: enumValue(record.workGroupMatch, [
      "match",
      "partial_match",
      "no_match",
      "not_evaluated"
    ]),
    roleDefinitionMatch: enumValue(record.roleDefinitionMatch, [
      "match",
      "partial_match",
      "no_match",
      "not_evaluated"
    ]),
    qualificationSummaryState: summaryState(record.qualificationSummaryState),
    verificationSummaryState: summaryState(record.verificationSummaryState),
    availabilityState: enumValue(record.availabilityState, [
      "available",
      "partially_available",
      "unavailable",
      "not_evaluated",
      "source_unavailable"
    ]),
    scheduleConflictState: enumValue(record.scheduleConflictState, [
      "conflict_free",
      "conflict_detected",
      "not_evaluated",
      "source_unavailable"
    ]),
    serviceAreaState: enumValue(record.serviceAreaState, [
      "inside_service_area",
      "outside_service_area",
      "not_evaluated",
      "source_unavailable"
    ]),
    travelSuitabilityState: enumValue(record.travelSuitabilityState, [
      "suitable",
      "unsuitable",
      "unknown",
      "not_evaluated",
      "source_unavailable"
    ]),
    transportConstraintState: enumValue(record.transportConstraintState, [
      "available",
      "unavailable",
      "unknown",
      "not_evaluated",
      "source_unavailable"
    ]),
    recommendationState: enumValue(record.recommendationState, [
      "not_evaluated",
      "recommended",
      "not_recommended",
      "alternative",
      "unavailable"
    ]),
    shortlistState: "not_shortlisted",
    shortlistOrder: null,
    sourceFreshnessAt,
    lastEvaluatedAt: now,
    evaluationVersion:
      Number.isInteger(record.evaluationVersion) && Number(record.evaluationVersion) > 0
        ? Number(record.evaluationVersion)
        : 1,
    addedByUserId: null,
    removedByUserId: null,
    createdAt: now,
    updatedAt: now,
    version: 1,
    versionToken: 1
  };
}

function createHttpBoundary(options: HttpOptions) {
  const origin = new URL(options.origin);
  if (origin.protocol !== "https:" || !options.token.trim()) throw new ProductionIntegrationError();
  const fetcher = options.fetch ?? fetch;
  const timeoutMs = Math.min(10_000, Math.max(100, options.timeoutMs ?? 3_000));
  return async (path: string, init: RequestInit) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const trustedIdentityHeaders = options.trustedIdentityHeaders
        ? await options.trustedIdentityHeaders()
        : {};
      return await fetcher(new URL(path, origin), {
        ...init,
        signal: controller.signal,
        headers: {
          ...(options.trustedIdentityHeaders
            ? { "x-rwos-app-authorization": `Bearer ${options.token}` }
            : { authorization: `Bearer ${options.token}` }),
          "cache-control": "no-store",
          "content-type": "application/json",
          ...init.headers,
          ...trustedIdentityHeaders
        }
      });
    } finally {
      clearTimeout(timeout);
    }
  };
}

function failedDelivery(): WorkerOfferDeliveryResult {
  return { status: "failed", providerReference: null, retryable: true };
}

function asRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ProductionIntegrationError();
  }
  return input as Record<string, unknown>;
}

function requiredString(input: unknown, max: number) {
  if (typeof input !== "string" || !input.trim() || input.length > max) {
    throw new ProductionIntegrationError();
  }
  return input;
}

function requiredUuid(input: unknown) {
  const value = requiredString(input, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new ProductionIntegrationError();
  }
  return value;
}

function enumValue<const T extends string>(input: unknown, values: readonly T[]): T {
  if (typeof input !== "string" || !values.includes(input as T))
    throw new ProductionIntegrationError();
  return input as T;
}

function summaryState(input: unknown) {
  return enumValue(input, [
    "meets_requirements",
    "partially_meets",
    "missing_required",
    "verification_pending",
    "expired",
    "not_evaluated"
  ]);
}

// ── Brevo email offer delivery ───────────────────────────────────────────────
// A direct worker-offer delivery channel over Brevo's transactional email API. Implements
// the same WorkerOfferDeliveryProvider seam as the HTTP provider. The worker's contact + offer summary are resolved via an injected
// resolveRecipient (the API layer supplies a Prisma-backed one), so this stays free of
// any database dependency. Fail-closed: no key / no deliverable email => a failed result
// (non-retryable when retrying cannot help, e.g. the worker has no email on file).
export type OfferEmailRecipient = Readonly<{
  email: string;
  name: string | null;
  language: "en" | "fr" | "ar"; // the worker's own language
  title: string; // worker-visible role/title
  summary: string | null; // worker-visible summary
  compensation: string | null; // compensation summary (already worker-safe)
  whenLabel: string | null; // formatted shift window
  areaLabel: string | null; // "City, PROV" (never the exact address)
  ctaUrl: string | null; // deep link into the worker app
}>;

export type BrevoOfferDeliveryOptions = Readonly<{
  apiKey: string;
  fromAddress: string; // e.g. "Joblop <offers@mail.yourdomain.ca>"
  replyTo?: string;
  fetch?: Fetch;
  baseUrl?: string;
  resolveRecipient(input: {
    organizationId: string;
    workerOfferId: string;
    workerIdentityId: string;
  }): Promise<OfferEmailRecipient | null>;
}>;

function isEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function composeOfferEmail(r: OfferEmailRecipient): { subject: string; html: string; text: string } {
  const L = (en: string, frl: string, ar: string) => (r.language === "fr" ? frl : r.language === "ar" ? ar : en);
  const rtl = r.language === "ar";
  const hello = r.name ? L(`Hi ${r.name},`, `Bonjour ${r.name},`, `مرحبًا ${r.name}،`) : L("Hi,", "Bonjour,", "مرحبًا،");
  const subject = L(`New shift offer: ${r.title}`, `Nouvelle offre de quart : ${r.title}`, `عرض مناوبة جديد: ${r.title}`);
  const intro = L("You've received a shift offer on Joblop.", "Vous avez reçu une offre de quart sur Joblop.", "وصلك عرض مناوبة على Joblop.");
  const rows: Array<[string, string | null]> = [
    [L("Role", "Poste", "الوظيفة"), r.title],
    [L("When", "Quand", "متى"), r.whenLabel],
    [L("Area", "Secteur", "المنطقة"), r.areaLabel],
    [L("Pay", "Rémunération", "الأجر"), r.compensation],
    [L("Details", "Détails", "التفاصيل"), r.summary]
  ];
  const ctaText = L("View and respond to the offer", "Voir et répondre à l'offre", "اطّلع على العرض وردّ عليه");
  const closing = L(
    "Please respond before the offer expires.",
    "Veuillez répondre avant l'expiration de l'offre.",
    "يُرجى الرد قبل انتهاء صلاحية العرض."
  );

  const textLines = [
    hello,
    "",
    intro,
    "",
    ...rows.filter(([, v]) => v && v.trim().length > 0).map(([k, v]) => `${k}: ${v}`),
    "",
    r.ctaUrl ? `${ctaText}: ${r.ctaUrl}` : "",
    "",
    closing,
    "",
    "— Joblop"
  ].filter((line, i, arr) => !(line === "" && arr[i - 1] === ""));
  const text = textLines.join("\n");

  const rowHtml = rows
    .filter(([, v]) => v && v.trim().length > 0)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:${rtl ? "6px 0 6px 12px" : "6px 12px 6px 0"};color:#5c749c;font-size:13px;white-space:nowrap;vertical-align:top">${escapeHtml(
          k
        )}</td><td style="padding:6px 0;color:#0f1d33;font-size:14px">${escapeHtml(v as string)}</td></tr>`
    )
    .join("");
  const button = r.ctaUrl
    ? `<p style="margin:22px 0 8px"><a href="${escapeHtml(
        r.ctaUrl
      )}" style="display:inline-block;background:#1f9bf0;color:#fff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:10px;font-size:14px">${escapeHtml(
        ctaText
      )}</a></p>`
    : "";
  const html = `<!doctype html><html${rtl ? ' lang="ar" dir="rtl"' : ""}><body style="margin:0;background:#f4f7fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:24px 16px"${rtl ? ' dir="rtl"' : ""}>
  <div style="background:#fff;border:1px solid #e3eaf4;border-radius:14px;padding:22px 22px 10px">
    <p style="font-weight:700;font-size:18px;color:#0f1d33;margin:0 0 14px">Joblop</p>
    <p style="font-size:15px;color:#0f1d33;margin:0 0 6px">${escapeHtml(hello)}</p>
    <p style="font-size:14px;color:#32496e;margin:0 0 14px">${escapeHtml(intro)}</p>
    <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%">${rowHtml}</table>
    ${button}
    <p style="font-size:13px;color:#5c749c;margin:14px 0 0">${escapeHtml(closing)}</p>
  </div>
  <p style="font-size:11px;color:#8aa0c2;text-align:center;margin:14px 0 0">Joblop</p>
</div></body></html>`;
  return { subject, html, text };
}

// "Name <email@domain>" or a bare address, in the structured sender shape Brevo requires.
function brevoSender(from: string): { email: string; name?: string } {
  const match = /^\s*(.+?)\s*<([^>]+)>\s*$/.exec(from);
  const name = match?.[1];
  const email = match?.[2];
  return name && email ? { email: email.trim(), name: name.trim() } : { email: from.trim() };
}

// No idempotency header is sent, so a retry after a lost reply could repeat the email; the offer
// itself is unaffected.
export function createBrevoWorkerOfferDeliveryProvider(
  options: BrevoOfferDeliveryOptions
): WorkerOfferDeliveryProvider {
  const fetcher = options.fetch ?? fetch;
  const baseUrl = options.baseUrl ?? "https://api.brevo.com/v3/smtp/email";
  return {
    async deliver(input) {
      if (!options.apiKey || options.apiKey.trim().length < 10 || !options.fromAddress) {
        return { status: "failed", providerReference: null, retryable: false };
      }
      let recipient: OfferEmailRecipient | null;
      try {
        recipient = await options.resolveRecipient({
          organizationId: input.organizationId,
          workerOfferId: input.workerOfferId,
          workerIdentityId: input.workerIdentityId
        });
      } catch {
        return failedDelivery(); // transient lookup failure — retryable
      }
      if (!recipient || !isEmailAddress(recipient.email)) {
        return { status: "failed", providerReference: null, retryable: false }; // no deliverable contact
      }
      const { subject, html, text } = composeOfferEmail(recipient);
      try {
        const response = await fetcher(baseUrl, {
          method: "POST",
          headers: {
            "api-key": options.apiKey,
            "content-type": "application/json",
            accept: "application/json"
          },
          body: JSON.stringify({
            sender: brevoSender(options.fromAddress),
            to: [{ email: recipient.email, ...(recipient.name ? { name: recipient.name } : {}) }],
            subject,
            htmlContent: html,
            textContent: text,
            ...(options.replyTo ? { replyTo: { email: options.replyTo } } : {})
          })
        });
        if (!response.ok) {
          const retryable = response.status >= 500 || response.status === 429;
          return { status: "failed", providerReference: null, retryable };
        }
        const record = asRecord(await response.json().catch(() => null));
        const providerReference = typeof record.messageId === "string" ? record.messageId : null;
        return { status: "sent", providerReference, retryable: false };
      } catch {
        return failedDelivery();
      }
    }
  };
}
