"use client";

import { useCallback, useState } from "react";
import { styles } from "../../employerStyles";

type Result = {
  classification: "MATERIAL" | "NON_MATERIAL";
  applied: boolean;
  materialFields: string[];
  requiresReconfirmation: boolean;
  proposalStatus: string | null;
};

const FIELD_LABEL: Record<string, string> = {
  role: "role",
  work_location: "work location",
  work_date: "work date",
  schedule_time: "start/end time",
  timezone: "time zone",
  worker_count_confirmed: "worker count",
  qualifications: "qualifications"
};

// Live edit. Non-material changes (arrival instructions) apply directly; material
// changes (a major schedule change) are submitted for reconfirmation and never
// overwrite accepted worker terms.
export function EditRequestPanel({
  requestId,
  versionToken
}: Readonly<{ requestId: string; versionToken: number }>) {
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
      setError("Change at least one field.");
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
        return setError(res.status === 409 ? "This request changed. Refresh and try again." : "The edit could not be completed.");
      }
      setResult((await res.json()) as Result);
    } catch {
      setBusy(false);
      setError("The edit could not be completed. Please try again.");
    }
  }, [requestId, versionToken, instructions, newStart, newEnd]);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={{ ...styles.secondaryButton, cursor: "pointer" }}>
        Edit
      </button>
    );
  }

  if (result) {
    const material = result.classification === "MATERIAL";
    return (
      <div style={styles.panel} aria-live="polite">
        <h3 style={styles.cardTitle}>{material ? "Submitted for reconfirmation" : "Changes saved"}</h3>
        {material ? (
          <p style={styles.warning}>
            This change affects confirmed worker terms ({result.materialFields.map((f) => FIELD_LABEL[f] ?? f).join(", ")}) and requires
            worker reconfirmation. Your original booking stays in place until the affected workers reconfirm the new terms.
          </p>
        ) : (
          <p style={styles.cardText}>Your changes were applied. Confirmed workers and assignments are unchanged.</p>
        )}
        <button type="button" onClick={() => { setOpen(false); setResult(null); }} style={{ ...styles.secondaryButton, cursor: "pointer" }}>Done</button>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <h3 style={styles.cardTitle}>Edit request</h3>
      <label style={{ ...styles.cardText, display: "block" }}>
        Arrival instructions (applies immediately)
        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} maxLength={2000} disabled={busy} style={{ display: "block", width: "100%" }} aria-label="Arrival instructions" />
      </label>
      <p style={styles.cardText}>Changing the schedule affects confirmed workers and needs reconfirmation:</p>
      <label style={{ ...styles.cardText, display: "flex", gap: 8, alignItems: "center" }}>New start <input type="datetime-local" value={newStart} onChange={(e) => setNewStart(e.target.value)} disabled={busy} /></label>
      <label style={{ ...styles.cardText, display: "flex", gap: 8, alignItems: "center" }}>New end <input type="datetime-local" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} disabled={busy} /></label>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
        <button type="button" disabled={busy} onClick={() => void submit()} style={{ ...styles.primaryButton, cursor: busy ? "wait" : "pointer" }}>
          {busy ? "Submitting…" : "Submit changes"}
        </button>
        <button type="button" disabled={busy} onClick={() => setOpen(false)} style={{ ...styles.secondaryButton, cursor: "pointer" }}>Cancel</button>
      </div>
      {error ? <p role="alert" aria-live="assertive" style={styles.cardText}>{error}</p> : null}
    </div>
  );
}
