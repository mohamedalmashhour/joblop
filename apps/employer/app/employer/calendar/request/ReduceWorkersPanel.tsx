"use client";

import { useCallback, useRef, useState } from "react";
import { formatMoney, formatRwosDateTime } from "@rwos/shared";
import { fmtLocale, useLocale, useT, type Translate } from "../../../i18n/LocaleProvider";
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

// An opened action panel takes the whole row of the action bar.
const openPanel = { ...styles.panel, flexBasis: "100%" } as const;

// Reduce Workers — server-authoritative. The employer chooses a new target, the
// server shows the consequence, the employer selects exactly the affected confirmed
// assignments, and confirms. Reduce keeps the request active (it is not Cancel).
export function ReduceWorkersPanel({
  requestId,
  currentWorkers,
  versionToken
}: Readonly<{ requestId: string; currentWorkers: number; versionToken: number }>) {
  const t = useT();
  const locale = useLocale();
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
          message: res.status === 400 ? t("reduce.invalid") : t("reduce.previewFailed")
        });
      }
      const body = (await res.json()) as { preview: ReducePreviewDto };
      setPhase({ status: "preview", preview: body.preview, selected: new Set() });
    } catch {
      setPhase({ status: "error", message: t("reduce.previewFailed") });
    }
  }, [requestId, target, t]);

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
          return setPhase({ status: "error", message: t("reduce.failed") });
        }
        setPhase({ status: "done", result: (await res.json()) as ReduceConfirmationDto });
      } catch {
        setPhase({ status: "error", message: t("reduce.failed") });
      }
    },
    [requestId, versionToken, t]
  );

  if (phase.status === "closed") {
    return (
      <button type="button" onClick={() => setPhase({ status: "choosing" })} style={{ ...styles.secondaryButton, cursor: "pointer" }}>
        {t("reduce.open")}
      </button>
    );
  }
  if (phase.status === "choosing") {
    return (
      <div style={openPanel}>
        <h3 style={styles.cardTitle}>{t("reduce.open")}</h3>
        <p style={{ ...styles.cardText, margin: 0 }}>{t("detail.currentWorkers", { count: currentWorkers })}</p>
        <label style={{ ...styles.fieldLabel, maxWidth: 220 }}>
          {t("reduce.target")}
          <input type="number" min={1} max={currentWorkers - 1} value={target} onChange={(e) => setTarget(Math.max(1, Math.floor(Number(e.target.value) || 1)))} style={styles.input} />
        </label>
        <div className="employer-action-row">
          <button type="button" onClick={() => void loadPreview()} style={{ ...styles.primaryButton, cursor: "pointer" }}>{t("reduce.check")}</button>
          <button type="button" onClick={() => setPhase({ status: "closed" })} style={{ ...styles.secondaryButton, cursor: "pointer" }}>{t("detail.cancel")}</button>
        </div>
      </div>
    );
  }
  if (phase.status === "previewing") return <p aria-live="polite" style={{ ...styles.cardText, flexBasis: "100%" }}>{t("reduce.checking")}</p>;
  if (phase.status === "error") {
    return (
      <div role="alert" aria-live="assertive" style={{ flexBasis: "100%" }}>
        <p style={styles.cardText}>{phase.message}</p>
        <button type="button" onClick={() => setPhase({ status: "closed" })} style={{ ...styles.secondaryButton, cursor: "pointer" }}>{t("detail.back")}</button>
      </div>
    );
  }
  if (phase.status === "done") return <ReduceResult result={phase.result} t={t} />;

  const { preview } = phase;
  const busy = phase.status === "confirming";
  const selected = phase.status === "preview" ? phase.selected : new Set<string>();
  const need = preview.affectedConfirmed;
  const canConfirm = selected.size === need && !busy;
  const charge = money(preview.obligationAmountMinor, preview.currency);

  const toggle = (id: string) => {
    if (phase.status !== "preview") return;
    const next = new Set(phase.selected);
    if (next.has(id)) next.delete(id);
    else if (next.size < need) next.add(id);
    setPhase({ status: "preview", preview, selected: next });
  };

  return (
    <div style={openPanel} aria-live="polite">
      <h3 style={styles.cardTitle}>{t("reduce.toTitle", { count: preview.newTarget })}</h3>
      <p style={{ ...styles.cardText, margin: 0 }}>
        {preview.unfilledRemoved === 1 ? t("reduce.unfilledOne") : t("reduce.unfilledMany", { count: preview.unfilledRemoved })}{" "}
        {need === 0 ? t("reduce.noneAffected") : need === 1 ? t("reduce.affectedOne") : t("reduce.affectedMany", { count: need })}
      </p>
      {need > 0 ? (
        <fieldset style={{ border: "1px solid rgba(248, 184, 8, 0.25)", borderRadius: 8, margin: 0, padding: 10 }}>
          <legend style={styles.cardText}>{need === 1 ? t("reduce.selectOne") : t("reduce.selectMany", { count: need })}</legend>
          {preview.eligibleAssignments.map((a) => (
            <label key={a.id} style={{ ...styles.cardText, alignItems: "center", display: "flex", gap: 8 }}>
              <input type="checkbox" checked={selected.has(a.id)} disabled={busy || (!selected.has(a.id) && selected.size >= need)} onChange={() => toggle(a.id)} />
              <span>
                {t("reduce.bookedWorker", { start: formatRwosDateTime(a.startAt, { dateStyle: "medium", timeStyle: "short", timeZone: "America/Toronto", locale: fmtLocale(locale) }) })}
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}
      {preview.obligationApplies ? (
        <p style={styles.warning}>{t("reduce.charge", { amount: charge })}</p>
      ) : need > 0 ? (
        <p style={{ ...styles.cardText, margin: 0 }}>{t("reduce.noCharge")}</p>
      ) : null}
      <div className="employer-action-row">
        <button type="button" disabled={!canConfirm} onClick={() => void confirm(preview, selected)} style={{ ...styles.primaryButton, cursor: canConfirm ? "pointer" : "not-allowed", opacity: canConfirm ? 1 : 0.6 }}>
          {busy
            ? t("reduce.saving")
            : preview.obligationApplies
              ? t("reduce.confirmCharge", { count: preview.newTarget, amount: charge })
              : t("reduce.toTitle", { count: preview.newTarget })}
        </button>
        <button type="button" disabled={busy} onClick={() => setPhase({ status: "closed" })} style={{ ...styles.secondaryButton, cursor: "pointer" }}>{t("reduce.keep")}</button>
      </div>
    </div>
  );
}

function ReduceResult({ result, t }: Readonly<{ result: ReduceConfirmationDto; t: Translate }>) {
  const { reduction } = result;
  const amount = reduction.obligationAmountMinor !== null && reduction.obligationCurrency !== null ? money(reduction.obligationAmountMinor, reduction.obligationCurrency) : null;
  const completed = reduction.status === "completed";
  return (
    <div style={openPanel} aria-live="polite">
      <h3 style={styles.cardTitle}>{completed ? t("reduce.doneTitle", { count: reduction.newTarget }) : t("reduce.recordedTitle")}</h3>
      {amount ? <p style={{ ...styles.cardText, margin: 0 }}>{t("reduce.charge", { amount })}</p> : null}
      {reduction.status === "assignment_cancellation_pending" ? (
        <p style={{ ...styles.cardText, margin: 0 }}>{t("reduce.pending", { count: reduction.newTarget })}</p>
      ) : reduction.status === "requires_reconciliation" ? (
        <p style={styles.warning}>{t("reduce.review")}</p>
      ) : (
        <p style={{ ...styles.cardText, margin: 0 }}>{t("reduce.doneBody", { count: reduction.newTarget })}</p>
      )}
    </div>
  );
}
