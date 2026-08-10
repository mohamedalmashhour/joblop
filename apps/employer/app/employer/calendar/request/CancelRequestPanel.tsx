"use client";

import { useCallback, useRef, useState } from "react";
import { formatMoney, formatRwosDateTime } from "@rwos/shared";
import { styles } from "../../employerStyles";
import type {
  CancellationConfirmationDto,
  CancellationPreviewDto
} from "../../../api/job-requests/cancellationBoundary";

type Phase =
  | { status: "idle" }
  | { status: "previewing" }
  | { status: "preview"; preview: CancellationPreviewDto }
  | { status: "confirming"; preview: CancellationPreviewDto }
  | { status: "done"; result: CancellationConfirmationDto }
  | { status: "error"; message: string };

function money(minor: number, currency: string) {
  return formatMoney({ amountMinor: minor, currency: currency === "USD" ? "USD" : "CAD" });
}

// Governed two-step cancellation. The server computes the authoritative
// consequence; the browser only requests the preview and confirms intent.
export function CancelRequestPanel({ requestId }: Readonly<{ requestId: string }>) {
  const [phase, setPhase] = useState<Phase>({ status: "idle" });
  // One idempotency key per cancel attempt — reused on confirm so a double-click
  // cannot create a second cancellation.
  const idempotencyKey = useRef<string>("");

  const openPreview = useCallback(async () => {
    idempotencyKey.current = `cancel-${requestId}-${crypto.randomUUID()}`;
    setPhase({ status: "previewing" });
    try {
      const res = await fetch(
        `/api/job-requests/${encodeURIComponent(requestId)}/cancel/preview`,
        { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }
      );
      if (!res.ok) return setPhase({ status: "error", message: "The cancellation preview could not be loaded." });
      const body = (await res.json()) as { preview: CancellationPreviewDto };
      setPhase({ status: "preview", preview: body.preview });
    } catch {
      setPhase({ status: "error", message: "The cancellation preview could not be loaded." });
    }
  }, [requestId]);

  const confirm = useCallback(
    async (preview: CancellationPreviewDto) => {
      setPhase({ status: "confirming", preview });
      try {
        const res = await fetch(
          `/api/job-requests/${encodeURIComponent(requestId)}/cancel/confirm`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ idempotencyKey: idempotencyKey.current })
          }
        );
        if (!res.ok) return setPhase({ status: "error", message: "The cancellation could not be completed." });
        const result = (await res.json()) as CancellationConfirmationDto;
        setPhase({ status: "done", result });
      } catch {
        setPhase({ status: "error", message: "The cancellation could not be completed." });
      }
    },
    [requestId]
  );

  if (phase.status === "idle") {
    return (
      <button type="button" onClick={() => void openPreview()} style={{ ...styles.secondaryButton, cursor: "pointer" }}>
        Cancel request
      </button>
    );
  }

  if (phase.status === "previewing") {
    return <p aria-live="polite" style={styles.cardText}>Checking the cancellation consequence…</p>;
  }

  if (phase.status === "error") {
    return (
      <div aria-live="assertive" role="alert">
        <p style={styles.cardText}>{phase.message}</p>
        <button type="button" onClick={() => setPhase({ status: "idle" })} style={{ ...styles.secondaryButton, cursor: "pointer" }}>
          Back
        </button>
      </div>
    );
  }

  if (phase.status === "done") {
    return <CancellationResult result={phase.result} />;
  }

  // preview | confirming
  const { preview } = phase;
  const busy = phase.status === "confirming";
  const late = preview.withinCutoff && preview.obligationApplies;
  const start = formatRwosDateTime(preview.shiftStartAt, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

  return (
    <div style={styles.panel} aria-live="polite">
      <h3 style={styles.cardTitle}>{late ? "Late Cancellation" : "Cancel request"}</h3>
      <p style={styles.cardText}>Shift starts: {start} UTC</p>
      <p style={styles.cardText}>Confirmed workers: {preview.affectedConfirmedWorkers}</p>
      {late ? (
        <div style={styles.warning}>
          This shift begins in less than {preview.cutoffHours} hours. Cancelling now creates a JobLop
          commercial cancellation obligation for the affected confirmed workers.
          <p style={{ ...styles.cardText, marginTop: 8 }}>
            <strong>
              {preview.affectedConfirmedWorkers} worker{preview.affectedConfirmedWorkers === 1 ? "" : "s"} ×{" "}
              {preview.minimumShiftHours} hours ×{" "}
              {preview.governedRateMinor !== null ? money(preview.governedRateMinor, preview.currency) : "—"}/hour ={" "}
              {money(preview.obligationAmountMinor, preview.currency)}
            </strong>
          </p>
        </div>
      ) : (
        <p style={styles.cardText}>No late-cancellation obligation applies.</p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
        <button
          type="button"
          disabled={busy}
          onClick={() => void confirm(preview)}
          style={{ ...styles.primaryButton, cursor: busy ? "wait" : "pointer" }}
        >
          {busy
            ? "Submitting…"
            : late
              ? `Cancel & Accept ${money(preview.obligationAmountMinor, preview.currency)} Obligation`
              : "Confirm Cancellation"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setPhase({ status: "idle" })}
          style={{ ...styles.secondaryButton, cursor: "pointer" }}
        >
          Keep request
        </button>
      </div>
    </div>
  );
}

function CancellationResult({ result }: Readonly<{ result: CancellationConfirmationDto }>) {
  const { cancellation } = result;
  const amount =
    cancellation.obligationAmountMinor !== null && cancellation.obligationCurrency !== null
      ? money(cancellation.obligationAmountMinor, cancellation.obligationCurrency)
      : null;

  return (
    <div style={styles.panel} aria-live="polite">
      <h3 style={styles.cardTitle}>Cancellation recorded</h3>
      {amount ? <p style={styles.cardText}>Commercial cancellation obligation: <strong>{amount}</strong></p> : null}
      {cancellation.status === "assignment_cancellation_pending" ? (
        <p style={styles.cardText}>
          JobLop is completing the governed cancellation of the confirmed worker assignments. This request
          is not fully cancelled until that completes.
        </p>
      ) : cancellation.status === "requires_reconciliation" ? (
        <p style={styles.warning}>
          Your cancellation and obligation are recorded, but the assignment cancellation needs review by
          JobLop. Our team will complete it — this request is not yet fully cancelled.
        </p>
      ) : (
        <p style={styles.cardText}>Your cancellation has been recorded.</p>
      )}
    </div>
  );
}
