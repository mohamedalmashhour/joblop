"use client";

import { useState } from "react";
import { useT } from "../i18n/LocaleProvider";

const DAY_MS = 24 * 3_600_000;

/** True when cancelling now is a late cancellation (less than 24 h before the start). */
export function isLateCancellation(scheduledStartAt: string, now: number = Date.now()): boolean {
  return new Date(scheduledStartAt).getTime() - now < DAY_MS;
}

// "Cancel this shift" with a clear confirm step, shared by the schedule card and the job page. The API
// cancels the booking and the schedule entry together, applies the 7-day suspension under 24 h and tells
// the employer and Joblop; this control only explains it first and shows the outcome. No rates.
export function CancelShiftControl({ attendanceRecordId, scheduledStartAt, disabled, onCancelled }: {
  attendanceRecordId: string;
  scheduledStartAt: string;
  disabled?: boolean;
  onCancelled: (message: string) => void;
}) {
  const t = useT();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const late = isLateCancellation(scheduledStartAt);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/attendance/${encodeURIComponent(attendanceRecordId)}/cancel`, {
        method: "POST", headers: { "content-type": "application/json" }, body: "{}"
      });
      const body = (await r.json().catch(() => null)) as { error?: string; suspended?: boolean } | null;
      if (!r.ok) {
        setError(body?.error === "RWOS_SHIFT_ALREADY_STARTED" ? t("sched.cancelStarted") : r.status === 409 ? t("sched.changed") : t("sched.actionFailed"));
        return;
      }
      setConfirming(false);
      onCancelled(body?.suspended ? t("sched.cancelledSuspendedNotice") : t("sched.cancelledNotice"));
    } catch {
      setError(t("sched.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button className="btn ghost" type="button" style={{ alignSelf: "flex-start" }} disabled={disabled || busy} onClick={() => setConfirming(true)}>
        {t("sched.cancelShift")}
      </button>
    );
  }
  const titleId = `cancel-title-${attendanceRecordId}`;
  return (
    <div role="alertdialog" aria-labelledby={titleId} className="state" style={{ display: "grid", gap: 10 }}>
      <strong id={titleId}>{t("sched.cancelConfirmTitle")}</strong>
      <p className="notice" style={{ margin: 0 }}>{late ? t("sched.cancelLateBody") : t("sched.cancelFreeBody")}</p>
      {error ? <p className="error" role="alert" style={{ margin: 0 }}>{error}</p> : null}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn" type="button" disabled={busy} onClick={() => void confirm()}>
          {busy ? "…" : t("sched.cancelConfirm")}
        </button>
        <button className="btn ghost" type="button" disabled={busy} onClick={() => setConfirming(false)}>
          {t("sched.cancelKeep")}
        </button>
      </div>
    </div>
  );
}
