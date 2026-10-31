"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  calendarFailureState,
  formatRwosDateTime,
  parseAdminCalendarDto,
  type AdminCalendarDto,
  type AuthenticatedViewState
} from "@rwos/shared";
import { DispatchHandoffPanel } from "./DispatchHandoffPanel";
import { JobLocationMap } from "../shared/maps";

export function PersistedAdminReviewPanel({ requestId }: Readonly<{ requestId: string | null }>) {
  const [state, setState] = useState<AuthenticatedViewState<AdminCalendarDto>>({
    status: "loading"
  });
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<
    "admin-review" | "request-information" | "approve-for-dispatch" | null
  >(null);
  const [reason, setReason] = useState("");
  // Hybrid auto-offer: when checked, approving opens the job for direct worker claim (first eligible
  // worker to tap Accept is assigned instantly). Unchecked keeps the manual shortlist→offer path.
  const [openClaim, setOpenClaim] = useState(false);
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
      const payload = (await response.json()) as { request?: unknown };
      if (generation !== requestGeneration.current) return;
      setState({ status: "ready", data: parseAdminCalendarDto(payload.request) });
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
        title="Request reference required"
        message="Open a persisted request from the authenticated administrator calendar."
      />
    );
  }

  if (state.status !== "ready") {
    const copy: readonly [string, string] =
      state.status === "loading"
        ? ["Loading review detail", "Checking the persisted administrator-authorized record."]
        : state.status === "denied"
          ? [
              "Administrator access required",
              "Return to the calendar and sign in with an authorized platform account."
            ]
          : state.status === "unavailable"
            ? [
                "Review service unavailable",
                "The persisted record could not be reached. No fixture record is substituted."
              ]
            : state.status === "stale"
              ? ["Review changed", "Refresh the persisted record before continuing."]
              : [
                  "Review detail unavailable",
                  "No fixture record is substituted for a persisted administrator request."
                ];
    return state.status === "denied" ? (
      <AdminState message={copy[1]} title={copy[0]} />
    ) : (
      <AdminState message={copy[1]} onRetry={load} title={copy[0]} />
    );
  }
  const request = state.data;
  async function performAction(
    action: "admin-review" | "request-information" | "approve-for-dispatch"
  ) {
    if (action === "request-information" && reason.trim().length < 4) {
      setActionMessage("Enter a clear reason of at least four characters.");
      return;
    }
    setActionBusy(true);
    setActionMessage("Applying the governed intake transition.");
    try {
      const response = await fetch(`/api/intake/${encodeURIComponent(request.id)}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedVersion: request.versionToken,
          ...(action === "request-information" ? { reason: reason.trim() } : {}),
          ...(action === "approve-for-dispatch" && openClaim ? { openClaim: true } : {})
        })
      });
      if (response.status === 409) {
        setConfirmAction(null);
        setActionMessage("This request changed. Load the latest review before acting again.");
        return;
      }
      if (!response.ok) {
        setConfirmAction(null);
        setActionMessage(
          response.status === 401
            ? "Administrator authorization is required."
            : "The intake action could not be completed."
        );
        return;
      }
      setConfirmAction(null);
      setReason("");
      setActionMessage(
        action === "admin-review"
          ? "Admin review started."
          : action === "request-information"
            ? "Information request recorded for the employer."
            : "Request approved for the dispatch boundary."
      );
      await load();
    } catch {
      setConfirmAction(null);
      setActionMessage("The intake service is unavailable. No success is claimed.");
    } finally {
      setActionBusy(false);
    }
  }
  return (
    <main style={styles.page}>
      <header style={styles.hero}>
        <div>
          <p style={styles.eyebrow}>Resident Workforce OS / Persisted review</p>
          <h1 style={styles.title}>{request.title}</h1>
          <p style={styles.lede}>
            {request.requestNumber} · {request.authoritativeStatus.replaceAll("_", " ")}
          </p>
        </div>
        <div style={styles.actionStack}>
          <a href="/calendar" style={styles.secondaryButton}>
            Back to admin calendar
          </a>
          <p style={styles.assignmentBoundary}>
            Assignment records are not connected in this admin view.
          </p>
        </div>
      </header>
      <section style={styles.grid}>
        <article style={styles.panel}>
          <h2 style={styles.h2}>Request readiness</h2>
          {[
            ["Request status", request.status.replaceAll("_", " ")],
            ["Authoritative status", request.authoritativeStatus.replaceAll("_", " ")],
            ["Contract", request.verification.contract],
            [
              "Payment method",
              `${request.verification.paymentMethodReadiness} — raw details hidden`
            ],
            ["Location", request.verification.location],
            ["Schedule", formatWindow(request)],
            ["Duties", request.dutiesSummary ?? "Not provided"],
            [
              "Qualifications",
              request.qualifications.length ? request.qualifications.join(", ") : "Not provided"
            ],
            ["Workers", String(request.numberOfWorkers)],
            ["Address summary", request.addressSummary ?? "Restricted or not provided"],
            ["Special instructions", request.specialInstructions ?? "Not provided"],
            ["Review reason", request.adminReviewReason ?? "Not provided"]
          ].map(([label, value]) => (
            <div key={label} style={styles.row}>
              <strong>{label}</strong>
              <span>{value}</span>
            </div>
          ))}
          <JobLocationMap address={request.addressSummary} />
        </article>
        <article style={styles.panel}>
          <h2 style={styles.h2}>Economics separation</h2>
          <p>
            Client economics and worker-offer economics are not included in this calendar
            persistence DTO.
          </p>
          <p>
            Review them only through their separate contract-authoritative sources. No raw payment
            secrets are available here.
          </p>
        </article>
        <article style={styles.panel}>
          <h2 style={styles.h2}>Governed intake action</h2>
          <p aria-live="polite" role={actionMessage.includes("changed") ? "alert" : "status"}>
            {actionMessage ||
              intakeStateCopy(request.authoritativeStatus, request.adminReviewReason)}
          </p>
          {request.authoritativeStatus === "submitted" ? (
            <button
              disabled={actionBusy}
              onClick={(event) => {
                confirmationTrigger.current = event.currentTarget;
                setConfirmAction("admin-review");
              }}
              style={styles.primaryButton}
              type="button"
            >
              Begin admin review
            </button>
          ) : null}
          {request.authoritativeStatus === "admin_review" ? (
            <>
              <label style={styles.label}>
                Information request reason
                <textarea
                  disabled={actionBusy}
                  maxLength={1000}
                  onChange={(event) => setReason(event.target.value)}
                  rows={5}
                  style={styles.textarea}
                  value={reason}
                />
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 12 }}>
                <input
                  checked={openClaim}
                  disabled={actionBusy}
                  onChange={(event) => setOpenClaim(event.currentTarget.checked)}
                  type="checkbox"
                />
                <span>
                  Open for direct worker claim — eligible workers claim and are assigned instantly
                  (first-come, up to the requested headcount). Leave unchecked to use the manual
                  shortlist → offer path.
                </span>
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
                  Request information
                </button>
                <button
                  disabled={actionBusy}
                  onClick={(event) => {
                    confirmationTrigger.current = event.currentTarget;
                    setConfirmAction("approve-for-dispatch");
                  }}
                  style={styles.primaryButton}
                  type="button"
                >
                  {openClaim ? "Approve + open claim" : "Approve for dispatch"}
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
                Confirm intake transition
              </h3>
              <p id="confirm-intake-copy">
                {confirmationCopy(confirmAction)} This does not publish, assign, notify, run
                payroll, or execute money.
              </p>
              <div style={styles.actionStack}>
                <button
                  autoFocus
                  disabled={actionBusy}
                  onClick={() => setConfirmAction(null)}
                  style={styles.secondaryAction}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  disabled={actionBusy}
                  onClick={() => void performAction(confirmAction)}
                  style={styles.primaryButton}
                  type="button"
                >
                  {actionBusy ? "Applying…" : "Confirm action"}
                </button>
              </div>
            </dialog>
          ) : null}
          {actionMessage.includes("changed") ? (
            <button onClick={() => void load()} style={styles.secondaryAction} type="button">
              Load latest review
            </button>
          ) : null}
        </article>
        {request.authoritativeStatus === "approved_for_dispatch" ? (
          <article style={styles.panel}>
            <h2 style={styles.h2}>Dispatch handoff</h2>
            <DispatchHandoffPanel jobRequestId={request.id} />
          </article>
        ) : null}
      </section>
      <section style={styles.notice}>
        <h2 style={styles.h2}>Review authority remains bounded</h2>
        <p>
          Intake actions change only the governed Job Request state. Publish, worker assignment,
          repricing, notification delivery, payroll, and payment execution remain separate.
        </p>
      </section>
    </main>
  );
}

function intakeStateCopy(status: AdminCalendarDto["authoritativeStatus"], reason: string | null) {
  if (status === "submitted") return "This submitted request is ready to begin admin review.";
  if (status === "admin_review")
    return "Review the request, then request information or approve it for the dispatch boundary.";
  if (status === "information_required") {
    return `Waiting for employer information.${reason ? ` Reason: ${reason}` : ""}`;
  }
  if (status === "approved_for_dispatch")
    return "Approved for the dispatch boundary. No intake action remains.";
  return "No intake action is available for this request state.";
}

function confirmationCopy(action: "admin-review" | "request-information" | "approve-for-dispatch") {
  if (action === "admin-review") return "Begin human admin review for this request.";
  if (action === "request-information")
    return "Return this request to the employer for clarification.";
  return "Approve this reviewed request for the future dispatch boundary.";
}

function formatWindow(request: AdminCalendarDto) {
  const start = formatRwosDateTime(request.startAt, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: request.timezone
  });
  const end = formatRwosDateTime(request.endAt, {
    timeStyle: "short",
    timeZone: request.timezone
  });
  return start === "Unavailable" || end === "Unavailable"
    ? "Unavailable"
    : `${start}–${end} (${request.timezone})`;
}

function AdminState({
  title,
  message,
  onRetry
}: Readonly<{ title: string; message: string; onRetry?: () => Promise<void> }>) {
  return (
    <main style={styles.page}>
      <header aria-live="polite" style={styles.hero}>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.lede}>{message}</p>
        <div style={styles.actionStack}>
          <a href="/calendar" style={styles.secondaryButton}>
            Back to admin calendar
          </a>
          {onRetry ? (
            <button onClick={() => void onRetry()} style={styles.retryButton} type="button">
              Retry
            </button>
          ) : null}
        </div>
      </header>
    </main>
  );
}

const styles = {
  page: {
    background: "#fbf9f4",
    color: "#171511",
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
    background: "#fff",
    borderRadius: 8,
    color: "#000000",
    display: "inline-flex",
    fontWeight: 800,
    minHeight: 44,
    padding: "0 18px",
    textDecoration: "none"
  },
  actionStack: { display: "flex", flexWrap: "wrap" as const, gap: 10 },
  assignmentBoundary: {
    color: "#faf6ec",
    fontSize: 13,
    margin: 0,
    maxWidth: 240
  },
  retryButton: {
    background: "#fff",
    border: "1px solid #ece3d2",
    borderRadius: 8,
    color: "#000000",
    cursor: "pointer",
    fontWeight: 800,
    minHeight: 44,
    padding: "0 18px"
  },
  primaryButton: {
    background: "#171511",
    border: 0,
    borderRadius: 8,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
    minHeight: 44,
    padding: "0 18px"
  },
  secondaryAction: {
    background: "#fff",
    border: "1px solid #ece3d2",
    borderRadius: 8,
    color: "#000000",
    cursor: "pointer",
    fontWeight: 800,
    minHeight: 44,
    padding: "0 18px"
  },
  label: { display: "grid", fontWeight: 800, gap: 8, marginTop: 16 },
  textarea: {
    border: "1px solid #ece3d2",
    borderRadius: 8,
    font: "inherit",
    padding: 12,
    resize: "vertical" as const
  },
  confirmation: {
    background: "#fff8d8",
    border: "1px solid #e8d782",
    borderRadius: 12,
    marginTop: 18,
    padding: 18
  },
  grid: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    padding: "24px clamp(18px, 5vw, 64px)"
  },
  panel: { background: "#fff", border: "1px solid #faf6ec", borderRadius: 14, padding: 24 },
  h2: { color: "#000000", fontSize: 25, margin: "6px 0 14px" },
  row: {
    alignItems: "center",
    borderBottom: "1px solid #faf6ec",
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 12,
    justifyContent: "space-between",
    padding: "12px 0"
  },
  notice: {
    background: "#fff8d8",
    border: "1px solid #e8d782",
    borderRadius: 14,
    margin: "0 clamp(18px, 5vw, 64px) 48px",
    padding: 24
  }
} as const;
