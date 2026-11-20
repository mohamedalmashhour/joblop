"use client";

import { useCallback, useState } from "react";
import { useT } from "../../../i18n/LocaleProvider";
import type { MessageKey } from "../../../i18n/messages";
import { styles } from "../../employerStyles";

type Result = {
  classification: "MATERIAL" | "NON_MATERIAL";
  applied: boolean;
  materialFields: string[];
  requiresReconfirmation: boolean;
  proposalStatus: string | null;
};

const FIELD_LABEL: Record<string, MessageKey> = {
  role: "edit.field_role",
  work_location: "edit.field_work_location",
  work_date: "edit.field_work_date",
  schedule_time: "edit.field_schedule_time",
  timezone: "edit.field_timezone",
  worker_count_confirmed: "edit.field_worker_count",
  qualifications: "edit.field_qualifications"
};

// An opened action panel takes the whole row of the action bar.
const openPanel = { ...styles.panel, flexBasis: "100%" } as const;

// Live edit. Non-material changes (arrival instructions) apply directly; material
// changes (a major schedule change) are submitted for reconfirmation and never
// overwrite accepted worker terms.
export function EditRequestPanel({
  requestId,
  versionToken
}: Readonly<{ requestId: string; versionToken: number }>) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    const proposed: Record<string, unknown> = {};
    if (instructions.trim()) proposed.specialInstructions = instructions.trim();
    if (newStart) proposed.startAt = new Date(newStart).toISOString();
    if (newEnd) proposed.endAt = new Date(newEnd).toISOString();
    if (Object.keys(proposed).length === 0) {
      setError(t("edit.needChange"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/job-requests/${encodeURIComponent(requestId)}/edit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ proposed, expectedVersion: versionToken })
      });
      if (!res.ok) {
        setBusy(false);
        return setError(res.status === 409 ? t("detail.conflict") : t("edit.failed"));
      }
      setResult((await res.json()) as Result);
    } catch {
      setBusy(false);
      setError(t("edit.failed"));
    }
  }, [requestId, versionToken, instructions, newStart, newEnd, t]);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={{ ...styles.secondaryButton, cursor: "pointer" }}>
        {t("edit.open")}
      </button>
    );
  }

  if (result) {
    const material = result.classification === "MATERIAL";
    const fields = result.materialFields.map((f) => (FIELD_LABEL[f] ? t(FIELD_LABEL[f]) : f.replaceAll("_", " "))).join(", ");
    return (
      <div style={openPanel} aria-live="polite">
        <h3 style={styles.cardTitle}>{material ? t("edit.reconfirmTitle") : t("edit.savedTitle")}</h3>
        {material ? (
          <p style={styles.warning}>{t("edit.reconfirmBody", { fields })}</p>
        ) : (
          <p style={styles.cardText}>{t("edit.savedBody")}</p>
        )}
        <div className="employer-action-row">
          <button type="button" onClick={() => { setOpen(false); setResult(null); }} style={{ ...styles.secondaryButton, cursor: "pointer" }}>{t("edit.done")}</button>
        </div>
      </div>
    );
  }

  return (
    <div style={openPanel}>
      <h3 style={styles.cardTitle}>{t("edit.title")}</h3>
      <label style={styles.fieldLabel}>
        {t("edit.instructions")}
        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} maxLength={2000} disabled={busy} style={styles.input} />
      </label>
      <p style={{ ...styles.cardText, margin: 0 }}>{t("edit.scheduleNote")}</p>
      <div style={styles.formGrid}>
        <label style={styles.fieldLabel}>{t("edit.newStart")}<input type="datetime-local" value={newStart} onChange={(e) => setNewStart(e.target.value)} disabled={busy} style={styles.input} /></label>
        <label style={styles.fieldLabel}>{t("edit.newEnd")}<input type="datetime-local" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} disabled={busy} style={styles.input} /></label>
      </div>
      <div className="employer-action-row">
        <button type="button" disabled={busy} onClick={() => void submit()} style={{ ...styles.primaryButton, cursor: busy ? "wait" : "pointer" }}>
          {busy ? t("edit.submitting") : t("edit.submit")}
        </button>
        <button type="button" disabled={busy} onClick={() => setOpen(false)} style={{ ...styles.secondaryButton, cursor: "pointer" }}>{t("detail.cancel")}</button>
      </div>
      {error ? <p role="alert" aria-live="assertive" style={styles.cardText}>{error}</p> : null}
    </div>
  );
}
