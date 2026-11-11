"use client";

import { useCallback, useRef, useState } from "react";
import { formatMoney, formatRwosDateTime } from "@rwos/shared";
import { fmtLocale, useLocale, useT, type Translate } from "../../../i18n/LocaleProvider";
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

// An opened action panel takes the whole row of the action bar.
const openPanel = { ...styles.panel, flexBasis: "100%" } as const;

// Governed two-step cancellation. The server computes the authoritative
// consequence; the browser only requests the preview and confirms intent.
export function CancelRequestPanel({
  requestId,
  onCancelled
}: Readonly<{ requestId: string; onCancelled?: () => void }>) {
  const t = useT();
  const locale = useLocale();
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
      if (!res.ok) return setPhase({ status: "error", message: t("cancel.previewFailed") });
      const body = (await res.json()) as { preview: CancellationPreviewDto };
      setPhase({ status: "preview", preview: body.preview });
    } catch {
      setPhase({ status: "error", message: t("cancel.previewFailed") });
    }
  }, [requestId, t]);

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
        if (!res.ok) return setPhase({ status: "error", message: t("cancel.failed") });
        const result = (await res.json()) as CancellationConfirmationDto;
        setPhase({ status: "done", result });
        // Let the page refresh the request so its status badge shows "Cancelled".
        onCancelled?.();
      } catch {
        setPhase({ status: "error", message: t("cancel.failed") });
      }
    },
    [requestId, t, onCancelled]
  );

  if (phase.status === "idle") {
    return (
      <button type="button" onClick={() => void openPreview()} style={{ ...styles.secondaryButton, cursor: "pointer" }}>
        {t("cancel.open")}
      </button>
    );
  }

  if (phase.status === "previewing") {
    return <p aria-live="polite" style={{ ...styles.cardText, flexBasis: "100%" }}>{t("cancel.checking")}</p>;
  }

  if (phase.status === "error") {
    return (
      <div aria-live="assertive" role="alert" style={{ flexBasis: "100%" }}>
        <p style={styles.cardText}>{phase.message}</p>
        <button type="button" onClick={() => setPhase({ status: "idle" })} style={{ ...styles.secondaryButton, cursor: "pointer" }}>
          {t("detail.back")}
        </button>
      </div>
    );
  }

  if (phase.status === "done") {
    return <CancellationResult result={phase.result} t={t} />;
  }

  // preview | confirming
  const { preview } = phase;
  const busy = phase.status === "confirming";
  const late = preview.withinCutoff && preview.obligationApplies;
  const start = formatRwosDateTime(preview.shiftStartAt, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Toronto",
    locale: fmtLocale(locale)
  });

  return (
    <div style={openPanel} aria-live="polite">
      <h3 style={styles.cardTitle}>{late ? t("cancel.lateTitle") : t("cancel.title")}</h3>
      <p style={{ ...styles.cardText, margin: 0 }}>{t("cancel.starts", { start })}</p>
      <p style={{ ...styles.cardText, margin: 0 }}>{t("cancel.booked", { count: preview.affectedConfirmedWorkers })}</p>
      {late ? (
        <div style={styles.warning} role="alert">
          {t("cancel.lateBody", {
            hours: preview.cutoffHours,
            minimum: preview.minimumShiftHours,
            count: preview.affectedConfirmedWorkers,
            amount: money(preview.obligationAmountMinor, preview.currency)
          })}
        </div>
      ) : (
        <p style={{ ...styles.cardText, margin: 0 }}>{t("cancel.noCharge")}</p>
      )}
      <div className="employer-action-row">
        <button
          type="button"
          disabled={busy}
          onClick={() => void confirm(preview)}
          style={{ ...styles.primaryButton, cursor: busy ? "wait" : "pointer" }}
        >
          {busy ? t("cancel.submitting") : late ? t("cancel.confirmLate") : t("cancel.confirm")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setPhase({ status: "idle" })}
          style={{ ...styles.secondaryButton, cursor: "pointer" }}
        >
          {t("cancel.keep")}
        </button>
      </div>
    </div>
  );
}

function CancellationResult({ result, t }: Readonly<{ result: CancellationConfirmationDto; t: Translate }>) {
  const { cancellation } = result;
  const amount =
    cancellation.obligationAmountMinor !== null && cancellation.obligationCurrency !== null
      ? money(cancellation.obligationAmountMinor, cancellation.obligationCurrency)
      : null;

  const completed = cancellation.status === "completed";
  return (
    <div style={openPanel} aria-live="polite">
      <h3 style={styles.cardTitle}>{completed ? t("cancel.doneTitle") : t("cancel.recordedTitle")}</h3>
      {amount ? <p style={{ ...styles.cardText, margin: 0 }}>{t("cancel.charge", { amount })}</p> : null}
      {cancellation.status === "assignment_cancellation_pending" ? (
        <p style={{ ...styles.cardText, margin: 0 }}>{t("cancel.pending")}</p>
      ) : cancellation.status === "requires_reconciliation" ? (
        <p style={styles.warning}>{t("cancel.review")}</p>
      ) : completed ? (
        <p style={{ ...styles.cardText, margin: 0 }}>{t("cancel.doneBody")}</p>
      ) : (
        <p style={{ ...styles.cardText, margin: 0 }}>{t("cancel.recordedBody")}</p>
      )}
    </div>
  );
}
