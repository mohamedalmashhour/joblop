"use client";

import { useCallback, useState } from "react";
import { useT } from "../../../i18n/LocaleProvider";
import { styles } from "../../employerStyles";

// Duplicate creates a NEW DRAFT (server-side, repriced from the current contract),
// then sends the employer to review the new date/time + current rate before
// submitting.
export function DuplicateRequestButton({ requestId }: Readonly<{ requestId: string }>) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const duplicate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/job-requests/${encodeURIComponent(requestId)}/duplicate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}"
      });
      if (!res.ok) {
        setBusy(false);
        return setError(res.status === 409 ? t("detail.duplicateBlocked") : t("detail.duplicateFailed"));
      }
      const body = (await res.json()) as { draftId: string };
      // Review the copied draft: date/time + current governed rate before submitting.
      window.location.href = `/employer/calendar/request/edit?id=${encodeURIComponent(body.draftId)}`;
    } catch {
      setBusy(false);
      setError(t("detail.duplicateFailed"));
    }
  }, [requestId, t]);

  return (
    <div style={error ? { flexBasis: "100%" } : undefined}>
      <button
        type="button"
        disabled={busy}
        onClick={() => void duplicate()}
        style={{ ...styles.secondaryButton, cursor: busy ? "wait" : "pointer" }}
      >
        {busy ? t("detail.duplicating") : t("detail.duplicate")}
      </button>
      {error ? (
        <p aria-live="assertive" role="alert" style={styles.cardText}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
