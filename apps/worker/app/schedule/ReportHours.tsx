"use client";

import { useState } from "react";
import { useT } from "../i18n/LocaleProvider";
import { reportErrorKey, shiftClock } from "./reportHoursView";

// "Report my hours" for a shift worked without a check-in: arrival, departure (the shift day, in the
// shift's time zone) and a short reason. The API checks every rule again and the report waits for
// Joblop to approve; nothing here touches pay.
export function ReportHoursControl({ attendanceRecordId, scheduledStartAt, scheduledEndAt, timezone, deadlineLabel, onSent }: {
  attendanceRecordId: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  timezone: string;
  deadlineLabel: string;
  onSent: (message: string) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [arrival, setArrival] = useState(() => shiftClock(scheduledStartAt, timezone));
  const [departure, setDeparture] = useState(() => shiftClock(scheduledEndAt, timezone));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!arrival || !departure) return setError(t("sched.reportErrTimes"));
    if (departure <= arrival) return setError(t("sched.reportErrEndBeforeStart"));
    if (reason.trim().length < 3) return setError(t("sched.reportErrReason"));
    setBusy(true);
    try {
      const r = await fetch(`/api/attendance/${encodeURIComponent(attendanceRecordId)}/report-hours`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ arrivalTime: arrival, departureTime: departure, reason: reason.trim() })
      });
      if (!r.ok) {
        const body = (await r.json().catch(() => null)) as { reason?: string | null } | null;
        setError(r.status === 400 || r.status === 409 ? t(reportErrorKey(body?.reason)) : t("sched.actionFailed"));
        return;
      }
      setOpen(false);
      onSent(t("sched.reportSentNotice"));
    } catch {
      setError(t("sched.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="btn" type="button" style={{ alignSelf: "flex-start" }} onClick={() => setOpen(true)}>
        {t("sched.reportHours")}
      </button>
    );
  }
  const id = `report-${attendanceRecordId}`;
  return (
    <div role="group" aria-labelledby={`${id}-title`} className="state" style={{ display: "grid", gap: 10 }}>
      <strong id={`${id}-title`}>{t("sched.reportHours")}</strong>
      <p className="notice" style={{ margin: 0 }}>{t("sched.reportHoursIntro", { deadline: deadlineLabel })}</p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <label htmlFor={`${id}-in`} style={{ display: "grid", gap: 4 }}>
          {t("sched.reportArrival")}
          <input id={`${id}-in`} type="time" value={arrival} onChange={(e) => setArrival(e.target.value)} required />
        </label>
        <label htmlFor={`${id}-out`} style={{ display: "grid", gap: 4 }}>
          {t("sched.reportDeparture")}
          <input id={`${id}-out`} type="time" value={departure} onChange={(e) => setDeparture(e.target.value)} required />
        </label>
      </div>
      <label htmlFor={`${id}-reason`} style={{ display: "grid", gap: 4 }}>
        {t("sched.reportReason")}
        <textarea id={`${id}-reason`} rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} required />
      </label>
      {error ? <p className="error" role="alert" style={{ margin: 0 }}>{error}</p> : null}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn" type="button" disabled={busy} onClick={() => void submit()}>
          {busy ? "…" : t("sched.reportSubmit")}
        </button>
        <button className="btn ghost" type="button" disabled={busy} onClick={() => setOpen(false)}>
          {t("sched.reportClose")}
        </button>
      </div>
    </div>
  );
}
