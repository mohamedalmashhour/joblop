"use client";

import { useCallback, useState } from "react";
import { styles } from "../../employerStyles";

// Add Workers — a live capacity increase. The employer chooses how many to add; the
// server preserves existing assignments and reprices the added capacity from the
// current contract. The browser never sends a rate or amount.
export function AddWorkersPanel({
  requestId,
  currentWorkers,
  versionToken
}: Readonly<{ requestId: string; currentWorkers: number; versionToken: number }>) {
  const [open, setOpen] = useState(false);
  const [addCount, setAddCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/job-requests/${encodeURIComponent(requestId)}/add-workers`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ additionalWorkers: addCount, expectedVersion: versionToken })
      });
      if (!res.ok) {
        setBusy(false);
        return setError(
          res.status === 409
            ? "This request just changed. Refresh and try again."
            : "Workers could not be added. Please try again."
        );
      }
      window.location.reload();
    } catch {
      setBusy(false);
      setError("Workers could not be added. Please try again.");
    }
  }, [requestId, addCount, versionToken]);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={{ ...styles.secondaryButton, cursor: "pointer" }}>
        Add workers
      </button>
    );
  }

  const newTotal = currentWorkers + (Number.isInteger(addCount) && addCount >= 1 ? addCount : 0);
  return (
    <div style={styles.panel} aria-live="polite">
      <h3 style={styles.cardTitle}>Add workers</h3>
      <p style={styles.cardText}>Current workers requested: {currentWorkers}</p>
      <label style={{ ...styles.cardText, display: "flex", gap: 8, alignItems: "center" }}>
        Add
        <input
          type="number"
          min={1}
          max={100}
          value={addCount}
          disabled={busy}
          onChange={(e) => setAddCount(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
          style={{ width: 80 }}
          aria-label="Number of workers to add"
        />
      </label>
      <p style={styles.cardText}>
        New total: <strong>{newTotal}</strong>. Additional staffing will be matched by Joblop; existing
        workers and assignments are unchanged.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          disabled={busy || addCount < 1}
          onClick={() => void submit()}
          style={{ ...styles.primaryButton, cursor: busy ? "wait" : "pointer" }}
        >
          {busy ? "Adding…" : `Add ${addCount} Worker${addCount === 1 ? "" : "s"}`}
        </button>
        <button type="button" disabled={busy} onClick={() => setOpen(false)} style={{ ...styles.secondaryButton, cursor: "pointer" }}>
          Cancel
        </button>
      </div>
      {error ? (
        <p aria-live="assertive" role="alert" style={styles.cardText}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
