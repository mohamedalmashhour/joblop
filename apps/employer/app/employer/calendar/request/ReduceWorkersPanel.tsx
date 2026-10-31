"use client";

import { useCallback, useRef, useState } from "react";
import { formatMoney, formatRwosDateTime } from "@rwos/shared";
import { styles } from "../../employerStyles";
import type { ReduceConfirmationDto, ReducePreviewDto } from "../../../api/job-requests/reduceBoundary";

type Phase =
  | { status: "closed" }
  | { status: "choosing" }
  | { status: "previewing" }
  | { status: "preview"; preview: ReducePreviewDto; selected: Set<string> }
  | { status: "confirming"; preview: ReducePreviewDto }
  | { status: "done"; result: ReduceConfirmationDto }
  | { status: "error"; message: string };

const money = (minor: number, currency: string) =>
  formatMoney({ amountMinor: minor, currency: currency === "USD" ? "USD" : "CAD" });

// Reduce Workers — server-authoritative. The employer chooses a new target, the
// server shows the consequence, the employer selects exactly the affected confirmed
// assignments, and confirms. Reduce keeps the request active (it is not Cancel).
export function ReduceWorkersPanel({
  requestId,
  currentWorkers,
  versionToken
}: Readonly<{ requestId: string; currentWorkers: number; versionToken: number }>) {
  const [phase, setPhase] = useState<Phase>({ status: "closed" });
  const [target, setTarget] = useState(Math.max(1, currentWorkers - 1));
  const idempotencyKey = useRef("");

  const loadPreview = useCallback(async () => {
    idempotencyKey.current = `reduce-${requestId}-${crypto.randomUUID()}`;
    setPhase({ status: "previewing" });
    try {
      const res = await fetch(`/api/job-requests/${encodeURIComponent(requestId)}/reduce/preview`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ newTarget: target })
      });
      if (!res.ok) {
        return setPhase({
          status: "error",
          message: res.status === 400 ? "That new target isn't a valid reduction." : "The reduction preview could not be loaded."
        });
      }
      const body = (await res.json()) as { preview: ReducePreviewDto };
      setPhase({ status: "preview", preview: body.preview, selected: new Set() });
    } catch {
      setPhase({ status: "error", message: "The reduction preview could not be loaded." });
    }
  }, [requestId, target]);

  const confirm = useCallback(
    async (preview: ReducePreviewDto, selected: Set<string>) => {
      setPhase({ status: "confirming", preview });
      try {
        const res = await fetch(`/api/job-requests/${encodeURIComponent(requestId)}/reduce/confirm`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            newTarget: preview.newTarget,
            selectedAssignmentIds: [...selected],
            expectedVersion: versionToken,
            idempotencyKey: idempotencyKey.current
          })
        });
        if (!res.ok) {
          return setPhase({ status: "error", message: "The reduction could not be completed. Refresh and try again." });
        }
        setPhase({ status: "done", result: (await res.json()) as ReduceConfirmationDto });
      } catch {
        setPhase({ status: "error", message: "The reduction could not be completed. Please try again." });
      }
    },
    [requestId, versionToken]
  );

  if (phase.status === "closed") {
    return (
      <button type="button" onClick={() => setPhase({ status: "choosing" })} style={{ ...styles.secondaryButton, cursor: "pointer" }}>
        Reduce workers
      </button>
    );
  }
  if (phase.status === "choosing") {
    return (
      <div style={styles.panel}>
        <h3 style={styles.cardTitle}>Reduce workers</h3>
        <p style={styles.cardText}>Current requested: {currentWorkers}</p>
        <label style={{ ...styles.cardText, display: "flex", gap: 8, alignItems: "center" }}>
          New target
          <input type="number" min={1} max={currentWorkers - 1} value={target} onChange={(e) => setTarget(Math.max(1, Math.floor(Number(e.target.value) || 1)))} style={{ width: 80 }} aria-label="New target worker count" />
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={() => void loadPreview()} style={{ ...styles.primaryButton, cursor: "pointer" }}>Check consequence</button>
          <button type="button" onClick={() => setPhase({ status: "closed" })} style={{ ...styles.secondaryButton, cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }
  if (phase.status === "previewing") return <p aria-live="polite" style={styles.cardText}>Checking the reduction consequence…</p>;
  if (phase.status === "error") {
    return (
      <div role="alert" aria-live="assertive">
        <p style={styles.cardText}>{phase.message}</p>
        <button type="button" onClick={() => setPhase({ status: "closed" })} style={{ ...styles.secondaryButton, cursor: "pointer" }}>Back</button>
      </div>
    );
  }
  if (phase.status === "done") return <ReduceResult result={phase.result} />;

  const { preview } = phase;
  const busy = phase.status === "confirming";
  const selected = phase.status === "preview" ? phase.selected : new Set<string>();
  const need = preview.affectedConfirmed;
  const canConfirm = selected.size === need && !busy;

  const toggle = (id: string) => {
    if (phase.status !== "preview") return;
    const next = new Set(phase.selected);
    if (next.has(id)) next.delete(id);
    else if (next.size < need) next.add(id);
    setPhase({ status: "preview", preview, selected: next });
  };

  return (
    <div style={styles.panel} aria-live="polite">
      <h3 style={styles.cardTitle}>Reduce to {preview.newTarget}</h3>
      <p style={styles.cardText}>
        {preview.unfilledRemoved} unfilled position{preview.unfilledRemoved === 1 ? "" : "s"} will be removed.
        {need > 0 ? ` ${need} confirmed assignment${need === 1 ? "" : "s"} must be cancelled.` : " No confirmed assignment is affected."}
      </p>
      {need > 0 ? (
        <fieldset style={{ border: "1px solid rgba(148,163,184,0.35)", borderRadius: 8, padding: 10 }}>
          <legend style={styles.cardText}>Select exactly {need} confirmed assignment{need === 1 ? "" : "s"} to cancel</legend>
          {preview.eligibleAssignments.map((a) => (
            <label key={a.id} style={{ ...styles.cardText, display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={selected.has(a.id)} disabled={busy || (!selected.has(a.id) && selected.size >= need)} onChange={() => toggle(a.id)} />
              <span>
                {formatRwosDateTime(a.startAt, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} — {a.status.replaceAll("_", " ")}
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}
      {preview.obligationApplies ? (
        <p style={styles.warning}>Commercial cancellation obligation: <strong>{money(preview.obligationAmountMinor, preview.currency)}</strong></p>
      ) : need > 0 ? (
        <p style={styles.cardText}>No late-cancellation obligation applies.</p>
      ) : null}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" disabled={!canConfirm} onClick={() => void confirm(preview, selected)} style={{ ...styles.primaryButton, cursor: canConfirm ? "pointer" : "not-allowed", opacity: canConfirm ? 1 : 0.6 }}>
          {busy ? "Reducing…" : preview.obligationApplies ? `Reduce to ${preview.newTarget} & Accept ${money(preview.obligationAmountMinor, preview.currency)} Obligation` : `Reduce to ${preview.newTarget}`}
        </button>
        <button type="button" disabled={busy} onClick={() => setPhase({ status: "closed" })} style={{ ...styles.secondaryButton, cursor: "pointer" }}>Keep current</button>
      </div>
    </div>
  );
}

function ReduceResult({ result }: Readonly<{ result: ReduceConfirmationDto }>) {
  const { reduction } = result;
  const amount = reduction.obligationAmountMinor !== null && reduction.obligationCurrency !== null ? money(reduction.obligationAmountMinor, reduction.obligationCurrency) : null;
  const completed = reduction.status === "completed";
  return (
    <div style={styles.panel} aria-live="polite">
      <h3 style={styles.cardTitle}>{completed ? `Reduced to ${reduction.newTarget}` : "Reduction recorded"}</h3>
      {amount ? <p style={styles.cardText}>Commercial cancellation obligation: <strong>{amount}</strong></p> : null}
      {reduction.status === "assignment_cancellation_pending" ? (
        <p style={styles.cardText}><strong>Reduction processing.</strong> Joblop is cancelling the selected confirmed assignment(s). The request stays active at target {reduction.newTarget}.</p>
      ) : reduction.status === "requires_reconciliation" ? (
        <p style={styles.warning}><strong>Requires Joblop review.</strong> Your reduction is recorded, but the assignment cancellation needs review. The target has not changed yet.</p>
      ) : (
        <p style={styles.cardText}>The request stays active at {reduction.newTarget} worker{reduction.newTarget === 1 ? "" : "s"}; remaining assignments are unchanged.</p>
      )}
    </div>
  );
}
