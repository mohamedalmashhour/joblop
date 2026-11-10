"use client";

import { useCallback, useState } from "react";
import { useT } from "../../../i18n/LocaleProvider";
import { styles } from "../../employerStyles";

// Add Workers — a live capacity increase. The employer chooses how many to add; the
// server preserves existing assignments and reprices the added capacity from the
// current contract. The browser never sends a rate or amount.
export function AddWorkersPanel({
  requestId,
  currentWorkers,
  versionToken
}: Readonly<{ requestId: string; currentWorkers: number; versionToken: number }>) {
  const t = useT();
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
        return setError(res.status === 409 ? t("detail.conflict") : t("add.failed"));
      }
      window.location.reload();
    } catch {
      setBusy(false);
      setError(t("add.failed"));
    }
  }, [requestId, addCount, versionToken, t]);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={{ ...styles.secondaryButton, cursor: "pointer" }}>
        {t("add.open")}
      </button>
    );
  }

  const newTotal = currentWorkers + (Number.isInteger(addCount) && addCount >= 1 ? addCount : 0);
  return (
    <div style={{ ...styles.panel, flexBasis: "100%" }} aria-live="polite">
      <h3 style={styles.cardTitle}>{t("add.open")}</h3>
      <p style={{ ...styles.cardText, margin: 0 }}>{t("detail.currentWorkers", { count: currentWorkers })}</p>
      <label style={{ ...styles.fieldLabel, maxWidth: 220 }}>
        {t("add.label")}
        <input
          type="number"
          min={1}
          max={100}
          value={addCount}
          disabled={busy}
          onChange={(e) => setAddCount(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
          style={styles.input}
        />
      </label>
      <p style={{ ...styles.cardText, margin: 0 }}>{t("add.newTotal", { total: newTotal })}</p>
      <div className="employer-action-row">
        <button
          type="button"
          disabled={busy || addCount < 1}
          onClick={() => void submit()}
          style={{ ...styles.primaryButton, cursor: busy ? "wait" : "pointer" }}
        >
          {busy ? t("add.adding") : addCount === 1 ? t("add.submitOne") : t("add.submitMany", { count: addCount })}
        </button>
        <button type="button" disabled={busy} onClick={() => setOpen(false)} style={{ ...styles.secondaryButton, cursor: "pointer" }}>
          {t("detail.cancel")}
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
