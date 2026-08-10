"use client";

import { useCallback, useState } from "react";
import { styles } from "../../employerStyles";

// Duplicate creates a NEW DRAFT (server-side, repriced from the current contract),
// then sends the employer to review the new date/time + current rate before
// submitting.
export function DuplicateRequestButton({ requestId }: Readonly<{ requestId: string }>) {
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
        return setError(
          res.status === 409
            ? "This request can't be duplicated — its site or role may no longer be active."
            : "The request could not be duplicated. Please try again."
        );
      }
      const body = (await res.json()) as { draftId: string };
      // Review the copied draft: date/time + current governed rate before submitting.
      window.location.href = `/employer/calendar/request/edit?id=${encodeURIComponent(body.draftId)}`;
    } catch {
      setBusy(false);
      setError("The request could not be duplicated. Please try again.");
    }
  }, [requestId]);

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void duplicate()}
        style={{ ...styles.secondaryButton, cursor: busy ? "wait" : "pointer" }}
      >
        {busy ? "Duplicating…" : "Duplicate request"}
      </button>
      {error ? (
        <p aria-live="assertive" role="alert" style={styles.cardText}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
