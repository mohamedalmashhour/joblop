"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  calendarFailureState,
  certificateLabel,
  formatRwosDateTime,
  isRequiredCertificateKey,
  parseAdminCalendarDto,
  type AdminCalendarDto,
  type AuthenticatedViewState
} from "@rwos/shared";
import { DispatchHandoffPanel } from "./DispatchHandoffPanel";
import { JobLocationMap } from "../shared/maps";
import { SignedOut } from "../shared/SignedOut";
import { usePageText } from "../i18n/pageText";
import { useLocale } from "../i18n/LocaleProvider";
import { reviewText, type ReviewActionMessage, type ReviewCopy } from "./reviewText";
import {
  formatHours,
  formatMoney,
  intlLocale,
  parseRequestSummary,
  type RequestSummary
} from "./requestSummary";

type IntakeAction = "admin-review" | "request-information" | "approve-for-dispatch";

/**
 * "I'll choose the worker myself" is hidden for now. On the live site that path is a dead end: staff
 * can send an offer and the worker can accept it, but no assignment is ever created, because the
 * assignment handoff (ASSIGNMENT_HANDOFF_ENABLED) is off and is not allowed in production. So every
 * approval opens the job on the board (openClaim = true) and the first qualified worker takes it.
 * The manual code path stays in place; set this to true once a production-safe handoff exists.
 */
export const MANUAL_WORKER_PICK_AVAILABLE = false;
type Loaded = Readonly<{ request: AdminCalendarDto; summary: RequestSummary | null }>;

// Staff request detail. Shows what the employer asked for (company, role, hours, extras, price with
// worker pay and margin), then the decision: start review, ask the employer a question, or approve
// and choose between the job board and picking the worker yourself. The intake actions and their
// confirmations are unchanged; only the wording and the read-only details are new.
export function PersistedAdminReviewPanel({ requestId }: Readonly<{ requestId: string | null }>) {
  const t = usePageText(reviewText);
  const appLocale = useLocale();
  const locale = intlLocale(appLocale);
  const [state, setState] = useState<AuthenticatedViewState<Loaded>>({
    status: "loading"
  });
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<ReviewActionMessage | null>(null);
  const [confirmAction, setConfirmAction] = useState<IntakeAction | null>(null);
  const [reason, setReason] = useState("");
  // Hybrid auto-offer: when on, approving opens the job for direct worker claim (first eligible
  // worker to tap Accept is assigned instantly). Off keeps the manual shortlist → offer path.
  // On by default: every approved job goes on the shared jobs calendar for all workers.
  const [openClaimChoice, setOpenClaim] = useState(true);
  // While the manual path is switched off (see MANUAL_WORKER_PICK_AVAILABLE), every approval opens
  // the job on the board, whatever the stored choice says.
  const openClaim = MANUAL_WORKER_PICK_AVAILABLE ? openClaimChoice : true;
  const requestGeneration = useRef(0);
  const confirmationDialog = useRef<HTMLDialogElement>(null);
  const confirmationTrigger = useRef<HTMLButtonElement | null>(null);
  const confirmationWasOpen = useRef(false);
  const load = useCallback(async () => {
    if (!requestId) return;
    const generation = ++requestGeneration.current;
    setState({ status: "loading" });
    try {
      const response = await fetch(`/api/calendar/requests/${encodeURIComponent(requestId)}`, {
        cache: "no-store"
      });
      if (generation !== requestGeneration.current) return;
      if (!response.ok) return setState(calendarFailureState(response.status));
      const payload = (await response.json()) as { request?: unknown; summary?: unknown };
      if (generation !== requestGeneration.current) return;
      setState({
        status: "ready",
        data: { request: parseAdminCalendarDto(payload.request), summary: parseRequestSummary(payload.summary) }
      });
    } catch {
      if (generation !== requestGeneration.current) return;
      setState({ status: "error" });
    }
  }, [requestId]);
  useEffect(() => {
    void load();
    return () => {
      requestGeneration.current += 1;
    };
  }, [load]);
  useEffect(() => {
    if (confirmAction) {
      confirmationWasOpen.current = true;
      if (!confirmationDialog.current?.open) confirmationDialog.current?.showModal();
      return;
    }
    if (confirmationDialog.current?.open) confirmationDialog.current.close();
    if (confirmationWasOpen.current) {
      confirmationWasOpen.current = false;
      confirmationTrigger.current?.focus();
    }
  }, [confirmAction]);

  if (!requestId) {
    return (
      <AdminState
        backLabel={t.back}
        message={t.referenceRequiredMessage}
        retryLabel={t.retry}
        title={t.referenceRequiredTitle}
      />
    );
  }

  if (state.status === "denied") {
    return (
      <main style={styles.page}>
        <SignedOut />
      </main>
    );
  }
  if (state.status !== "ready") {
    const copy: readonly [string, string] =
      state.status === "loading"
        ? [t.loadingTitle, t.loadingMessage]
        : state.status === "unavailable"
          ? [t.unavailableTitle, t.unavailableMessage]
          : state.status === "stale"
            ? [t.staleTitle, t.staleMessage]
            : [t.errorTitle, t.errorMessage];
    return (
      <AdminState
        backLabel={t.back}
        message={copy[1]}
        onRetry={state.status === "loading" ? undefined : load}
        retryLabel={t.retry}
        title={copy[0]}
      />
    );
  }
  const { request, summary } = state.data;
  const pricing = summary?.pricing ?? null;
  const money = (minor: number) => formatMoney(minor, pricing?.currency ?? "CAD", locale);

  async function performAction(action: IntakeAction) {
    if (action === "request-information" && reason.trim().length < 4) {
      setActionMessage("reasonTooShort");
      return;
    }
    setActionBusy(true);
    setActionMessage("applying");
    const post = (step: IntakeAction, expectedVersion: number) =>
      fetch(`/api/intake/${encodeURIComponent(request.id)}/${step}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedVersion,
          ...(step === "request-information" ? { reason: reason.trim() } : {}),
          ...(step === "approve-for-dispatch" ? { openClaim } : {})
        })
      });
    try {
      let expectedVersion: number = request.versionToken;
      // One step for staff: a new (submitted) request is first moved to "in review" with the same
      // begin-review action as before, so the audit trail still records "review started", then
      // approved or questioned with the version that step returned.
      if (request.authoritativeStatus === "submitted" && action !== "admin-review") {
        const started = await post("admin-review", expectedVersion);
        if (!started.ok) {
          setConfirmAction(null);
          setActionMessage(started.status === 409 ? "stale" : started.status === 401 ? "authRequired" : "failed");
          return;
        }
        const body = (await started.json().catch(() => null)) as { jobRequest?: { versionToken?: unknown } } | null;
        const next = body?.jobRequest?.versionToken;
        if (typeof next !== "number" || !Number.isInteger(next)) {
          setConfirmAction(null);
          setActionMessage("stale");
          await load();
          return;
        }
        expectedVersion = next;
      }
      const response = await post(action, expectedVersion);
      if (response.status === 409) {
        setConfirmAction(null);
        setActionMessage("stale");
        return;
      }
      if (!response.ok) {
        setConfirmAction(null);
        setActionMessage(response.status === 401 ? "authRequired" : "failed");
        // The review was started above: reload so the page shows the request's new version.
        if (expectedVersion !== request.versionToken) await load();
        return;
      }
      setConfirmAction(null);
      setReason("");
      setActionMessage(
        action === "admin-review"
          ? "started"
          : action === "request-information"
            ? "infoRecorded"
            : "approved"
      );
      await load();
    } catch {
      setConfirmAction(null);
      setActionMessage("serviceUnavailable");
    } finally {
      setActionBusy(false);
    }
  }

  const location = summary
    ? [summary.locationName, summary.locationCity].filter(Boolean).join(", ")
    : "";
  const certificates = summary
    ? [
        ...summary.requiredCertificates
          .filter(isRequiredCertificateKey)
          .map((key) => certificateLabel(key, appLocale, key === "other" ? summary.requiredCertificateOther : null)),
        ...(summary.requiredCertificateOther && !summary.requiredCertificates.includes("other")
          ? [summary.requiredCertificateOther]
          : [])
      ]
    : request.qualifications;
  const offeredAllowances = (summary?.allowances ?? []).filter((a) => a.provision !== "none");
  const placesOpen = summary ? Math.max(0, summary.numberOfWorkers - summary.confirmedWorkerCount) : 0;

  const askedRows: [string, ReactNode][] = [
    ...(summary
      ? ([
          [t.rows.company, summary.companyName],
          [t.rows.role, summary.roleLabel],
          [t.rows.location, location || t.notProvided]
        ] as [string, ReactNode][])
      : []),
    [t.rows.schedule, formatWindow(request, t.unavailable)],
    [t.rows.workers, String(request.numberOfWorkers)],
    ...(summary
      ? ([
          [
            t.rows.hours,
            t.hoursValue(formatHours(summary.hoursPerWorker, locale), formatHours(summary.totalHours, locale))
          ],
          [t.rows.urgency, t.urgencyNames[summary.urgency] ?? summary.urgency]
        ] as [string, ReactNode][])
      : []),
    [t.rows.certificates, certificates.length ? certificates.join(", ") : t.none],
    ...(summary
      ? ([
          [
            t.rows.allowances,
            offeredAllowances.length ? (
              <span style={styles.stack}>
                {offeredAllowances.map((a) => (
                  <span key={a.kind}>
                    {t.allowanceNames[a.kind] ?? a.kind}: {t.allowanceValue(a.provision, a.amountMinor ? money(a.amountMinor) : null)}
                    {a.note ? ` – ${a.note}` : ""}
                  </span>
                ))}
              </span>
            ) : (
              t.none
            )
          ]
        ] as [string, ReactNode][])
      : []),
    [t.rows.duties, request.dutiesSummary ?? t.notProvided],
    [t.rows.specialInstructions, request.specialInstructions ?? t.notProvided],
    [t.rows.address, request.addressSummary ?? t.notProvided]
  ];

  return (
    <main style={styles.page}>
      <header style={styles.hero}>
        <div>
          <p style={styles.eyebrow}>{t.eyebrow(request.requestNumber)}</p>
          <h1 style={styles.title}>{request.title}</h1>
          <p style={styles.lede}>
            {summary ? `${summary.companyName} · ` : ""}
            {t.statusNames[request.authoritativeStatus] ?? request.authoritativeStatus.replaceAll("_", " ")}
          </p>
        </div>
        <div style={styles.actionStack}>
          <a href="/calendar" style={styles.secondaryButton}>
            {t.back}
          </a>
        </div>
      </header>
      <section style={styles.grid}>
        <article style={styles.panel}>
          <h2 style={styles.h2}>{t.askedTitle}</h2>
          {askedRows.map(([label, value]) => (
            <div key={label} style={styles.row}>
              <strong>{label}</strong>
              <span style={styles.value}>{value}</span>
            </div>
          ))}
          <JobLocationMap address={request.addressSummary} />
        </article>
        {summary ? (
          <article style={styles.panel}>
            <h2 style={styles.h2}>{t.priceTitle}</h2>
            {pricing ? (
              <>
                {(
                  [
                    [t.priceRows.employerRate, money(pricing.employerHourlyRateMinor)],
                    ...(pricing.urgentSurchargePerHourMinor > 0
                      ? [[t.priceRows.urgentSurcharge, money(pricing.urgentSurchargePerHourMinor)]]
                      : []),
                    [t.priceRows.workerPay, money(pricing.workerHourlyRateMinor)],
                    [
                      t.priceRows.margin,
                      t.marginValue(
                        money(pricing.platformHourlyMarginMinor),
                        formatHours(pricing.marginPpm / 10_000, locale)
                      )
                    ],
                    ...(pricing.allowancesEmployerPerShiftMinor > 0
                      ? [[t.priceRows.allowances, money(pricing.allowancesEmployerPerShiftMinor)]]
                      : [])
                  ] as [string, string][]
                ).map(([label, value]) => (
                  <div key={label} style={styles.row}>
                    <strong>{label}</strong>
                    <span style={styles.value}>{value}</span>
                  </div>
                ))}
                <div style={{ ...styles.row, ...styles.totalRow }}>
                  <strong>{t.priceRows.estimatedTotal}</strong>
                  <strong style={styles.gold}>{money(pricing.estimatedTotalMinor)}</strong>
                </div>
                <p style={styles.note}>{pricing.source === "approved" ? t.approvedNote : t.estimateNote}</p>
              </>
            ) : (
              <>
                <p role="alert" style={styles.warning}>
                  {t.pricingProblem[summary.pricingProblem ?? "unavailable"] ?? t.pricingProblem.unavailable}
                </p>
                {summary.pricingProblem === "no_contract" || summary.pricingProblem === "no_role_rate" ? (
                  <a href="/contracts" style={styles.secondaryButton}>
                    {t.contractsLink}
                  </a>
                ) : null}
              </>
            )}
          </article>
        ) : null}
        {/* Right column: the decision, then the Workers card under it once approved. */}
        <div style={styles.column}>
        <article style={styles.panel}>
          <h2 style={styles.h2}>{t.intakeTitle}</h2>
          <p aria-live="polite" role={actionMessage === "stale" ? "alert" : "status"}>
            {actionMessage
              ? t.messages[actionMessage]
              : intakeStateCopy(t, request.authoritativeStatus, request.adminReviewReason)}
          </p>
          {request.authoritativeStatus === "submitted" || request.authoritativeStatus === "admin_review" ? (
            <>
              {pricing ? (
                <p style={styles.payPreview}>
                  {t.payPreview(money(pricing.workerHourlyRateMinor), money(pricing.platformHourlyMarginMinor))}
                </p>
              ) : null}
              {MANUAL_WORKER_PICK_AVAILABLE ? (
              <fieldset style={styles.fieldset}>
                <legend style={styles.legend}>{t.choiceLegend}</legend>
                <label style={styles.choice}>
                  <input
                    checked={openClaim}
                    disabled={actionBusy}
                    name="after-approval"
                    onChange={() => setOpenClaim(true)}
                    type="radio"
                  />
                  <span>{t.choiceBoard}</span>
                </label>
                <label style={styles.choice}>
                  <input
                    checked={!openClaim}
                    disabled={actionBusy}
                    name="after-approval"
                    onChange={() => setOpenClaim(false)}
                    type="radio"
                  />
                  <span>{t.choiceManual}</span>
                </label>
              </fieldset>
              ) : (
                <p style={styles.legend}>{t.choiceBoard}</p>
              )}
              <button
                disabled={actionBusy}
                onClick={(event) => {
                  confirmationTrigger.current = event.currentTarget;
                  setConfirmAction("approve-for-dispatch");
                }}
                style={styles.primaryButton}
                type="button"
              >
                {openClaim ? t.approveOpenClaim : t.approveForDispatch}
              </button>
              <label style={styles.label}>
                {t.reasonLabel}
                <textarea
                  disabled={actionBusy}
                  maxLength={1000}
                  onChange={(event) => setReason(event.target.value)}
                  rows={4}
                  style={styles.textarea}
                  value={reason}
                />
              </label>
              <div style={styles.actionStack}>
                <button
                  disabled={actionBusy || reason.trim().length < 4}
                  onClick={(event) => {
                    confirmationTrigger.current = event.currentTarget;
                    setConfirmAction("request-information");
                  }}
                  style={styles.secondaryAction}
                  type="button"
                >
                  {t.requestInformation}
                </button>
              </div>
            </>
          ) : null}
          {confirmAction ? (
            <dialog
              aria-describedby="confirm-intake-copy"
              aria-labelledby="confirm-intake-action"
              onCancel={() => setConfirmAction(null)}
              ref={confirmationDialog}
              style={styles.confirmation}
            >
              <h3 id="confirm-intake-action" style={styles.h2}>
                {t.confirmTitle}
              </h3>
              <p id="confirm-intake-copy">{confirmationCopy(t, confirmAction, openClaim)}</p>
              <div style={styles.actionStack}>
                <button
                  autoFocus
                  disabled={actionBusy}
                  onClick={() => setConfirmAction(null)}
                  style={styles.secondaryAction}
                  type="button"
                >
                  {t.cancel}
                </button>
                <button
                  disabled={actionBusy}
                  onClick={() => void performAction(confirmAction)}
                  style={styles.primaryButton}
                  type="button"
                >
                  {actionBusy ? t.applyingButton : t.confirmAction}
                </button>
              </div>
            </dialog>
          ) : null}
          {actionMessage === "stale" ? (
            <button onClick={() => void load()} style={styles.secondaryAction} type="button">
              {t.loadLatest}
            </button>
          ) : null}
        </article>
        {request.authoritativeStatus === "approved_for_dispatch" ? (
          <article style={styles.panel}>
            <h2 style={styles.h2}>{t.dispatchTitle}</h2>
            {summary ? (
              <>
                <p style={styles.posted}>
                  {summary.openClaim
                    ? t.postedBoard(placesOpen, summary.confirmedWorkerCount)
                    : t.postedManual(placesOpen, summary.confirmedWorkerCount)}
                </p>
                {summary.openClaim && summary.publicJobUrl ? (
                  <p>
                    <a href={summary.publicJobUrl} rel="noreferrer" style={styles.goldLink} target="_blank">
                      {t.seeJobBoard}
                    </a>
                  </p>
                ) : null}
              </>
            ) : null}
            <DispatchHandoffPanel jobRequestId={request.id} />
          </article>
        ) : null}
        </div>
      </section>
    </main>
  );
}

function intakeStateCopy(
  t: ReviewCopy,
  status: AdminCalendarDto["authoritativeStatus"],
  reason: string | null
) {
  if (status === "submitted") return t.stateSubmitted;
  if (status === "admin_review") return t.stateAdminReview;
  if (status === "information_required") return t.stateInformationRequired(reason);
  if (status === "approved_for_dispatch") return t.stateApproved;
  return t.stateNone;
}

function confirmationCopy(t: ReviewCopy, action: IntakeAction, openClaim: boolean) {
  if (action === "admin-review") return t.confirmAdminReview;
  if (action === "request-information") return t.confirmRequestInformation;
  return openClaim ? t.confirmApproveBoard : t.confirmApproveManual;
}

function formatWindow(request: AdminCalendarDto, unavailableLabel: string) {
  const start = formatRwosDateTime(request.startAt, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: request.timezone
  });
  const end = formatRwosDateTime(request.endAt, {
    timeStyle: "short",
    timeZone: request.timezone
  });
  // formatRwosDateTime returns the literal "Unavailable" for an unreadable date.
  return start === "Unavailable" || end === "Unavailable" ? unavailableLabel : `${start}–${end}`;
}

function AdminState({
  title,
  message,
  onRetry,
  backLabel,
  retryLabel
}: Readonly<{
  title: string;
  message: string;
  onRetry?: (() => Promise<void>) | undefined;
  backLabel: string;
  retryLabel: string;
}>) {
  return (
    <main style={styles.page}>
      <header aria-live="polite" style={styles.hero}>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.lede}>{message}</p>
        <div style={styles.actionStack}>
          <a href="/calendar" style={styles.secondaryButton}>
            {backLabel}
          </a>
          {onRetry ? (
            <button onClick={() => void onRetry()} style={styles.retryButton} type="button">
              {retryLabel}
            </button>
          ) : null}
        </div>
      </header>
    </main>
  );
}

const styles = {
  page: {
    background: "#000000",
    color: "#f4efe4",
    fontFamily: "Inter, system-ui, sans-serif",
    minHeight: "100vh"
  },
  hero: {
    alignItems: "center",
    background: "#000000",
    color: "#fff",
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 24,
    justifyContent: "space-between",
    padding: "40px clamp(18px, 5vw, 64px)"
  },
  eyebrow: { color: "#fff1a8", fontSize: 12, fontWeight: 900, textTransform: "uppercase" as const },
  title: { fontSize: "clamp(34px, 5vw, 56px)", margin: "8px 0" },
  lede: { color: "#faf6ec", fontSize: 18, lineHeight: 1.6, maxWidth: 760 },
  secondaryButton: {
    alignItems: "center",
    background: "#0c0c0c",
    border: "1px solid rgba(248, 184, 8, 0.3)",
    borderRadius: 8,
    color: "#f4efe4",
    display: "inline-flex",
    fontWeight: 800,
    minHeight: 44,
    padding: "0 18px",
    textDecoration: "none"
  },
  actionStack: { display: "flex", flexWrap: "wrap" as const, gap: 10, marginTop: 12 },
  retryButton: {
    background: "#0c0c0c",
    border: "1px solid rgba(248, 184, 8, 0.3)",
    borderRadius: 8,
    color: "#f4efe4",
    cursor: "pointer",
    fontWeight: 800,
    minHeight: 44,
    padding: "0 18px"
  },
  primaryButton: {
    background: "#F8B808",
    border: 0,
    borderRadius: 8,
    color: "#000000",
    cursor: "pointer",
    fontWeight: 800,
    minHeight: 44,
    padding: "0 18px"
  },
  secondaryAction: {
    background: "#0c0c0c",
    border: "1px solid rgba(248, 184, 8, 0.3)",
    borderRadius: 8,
    color: "#f4efe4",
    cursor: "pointer",
    fontWeight: 800,
    minHeight: 44,
    padding: "0 18px"
  },
  label: { display: "grid", fontWeight: 800, gap: 8, marginTop: 20 },
  textarea: {
    background: "#0c0c0c",
    border: "1px solid rgba(248, 184, 8, 0.16)",
    borderRadius: 8,
    color: "#f4efe4",
    font: "inherit",
    padding: 12,
    resize: "vertical" as const
  },
  fieldset: {
    border: "1px solid rgba(248, 184, 8, 0.28)",
    borderRadius: 10,
    display: "grid",
    gap: 10,
    margin: "12px 0 16px",
    padding: "12px 14px"
  },
  legend: { color: "#F8B808", fontWeight: 800, padding: "0 6px" },
  choice: { alignItems: "flex-start", display: "flex", gap: 10, lineHeight: 1.45 },
  payPreview: { color: "#F8B808", fontWeight: 800, margin: "8px 0" },
  confirmation: {
    background: "#0c0c0c",
    border: "1px solid #e8d782",
    borderRadius: 12,
    color: "#f4efe4",
    marginTop: 18,
    padding: 18
  },
  grid: {
    alignItems: "start",
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
    padding: "24px clamp(18px, 5vw, 64px) 48px"
  },
  column: { display: "grid", gap: 18, minWidth: 0 },
  panel: { background: "#0c0c0c", border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 14, padding: 24 },
  h2: { color: "#f4efe4", fontSize: 24, margin: "6px 0 14px" },
  row: {
    alignItems: "baseline",
    borderBottom: "1px solid rgba(248, 184, 8, 0.16)",
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 12,
    justifyContent: "space-between",
    padding: "12px 0"
  },
  value: { overflowWrap: "anywhere" as const, textAlign: "end" as const },
  stack: { display: "grid", gap: 4 },
  totalRow: { borderBottom: 0, fontSize: 18 },
  gold: { color: "#F8B808" },
  goldLink: { color: "#F8B808", fontWeight: 800 },
  note: { color: "#b3a894", fontSize: 14, lineHeight: 1.5, margin: "6px 0 0" },
  warning: { color: "#fff1a8", lineHeight: 1.5 },
  posted: { color: "#F8B808", fontSize: 18, fontWeight: 800, margin: "0 0 8px" }
} as const;
