"use client";

import { useCallback, useEffect, useState } from "react";
import type { EmployerJobRequestDraft } from "../../../../api/job-requests/jobRequestBoundary";
import { styles } from "../../../employerStyles";

type EditableFields = {
  title: string;
  description: string;
  numberOfWorkers: string;
  urgency: EmployerJobRequestDraft["urgency"];
};

export function EditPersistedRequestPanel({ requestId }: Readonly<{ requestId: string | null }>) {
  const [snapshot, setSnapshot] = useState<EmployerJobRequestDraft | null>(null);
  const [fields, setFields] = useState<EditableFields | null>(null);
  const [status, setStatus] = useState<
    "loading" | "ready" | "saving" | "saved" | "stale" | "denied" | "error"
  >("loading");
  const [message, setMessage] = useState("Loading the latest persisted draft.");

  const load = useCallback(async () => {
    if (!requestId) {
      setStatus("error");
      return setMessage("A persisted request identifier is required.");
    }
    setStatus("loading");
    try {
      const response = await fetch(`/api/job-requests/${encodeURIComponent(requestId)}`, {
        cache: "no-store"
      });
      if (!response.ok) {
        setStatus(response.status === 401 || response.status === 403 ? "denied" : "error");
        return setMessage("The persisted request could not be loaded.");
      }
      const payload = (await response.json()) as { jobRequest: EmployerJobRequestDraft };
      const request = payload.jobRequest;
      setSnapshot(request);
      setFields(toFields(request));
      setStatus("ready");
      setMessage(
        isEditable(request.status)
          ? "Edit the draft fields below."
          : "This request cannot be edited in its current status."
      );
    } catch {
      setStatus("error");
      setMessage("The request service is unavailable.");
    }
  }, [requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!snapshot || !fields || !isEditable(snapshot.status)) return;
    const validation = validate(fields);
    if (validation.length) {
      setMessage(`Complete: ${validation.join(", ")}.`);
      return;
    }
    setStatus("saving");
    setMessage("Saving the current draft version.");
    try {
      const response = await fetch(`/api/job-requests/${encodeURIComponent(snapshot.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedVersion: snapshot.versionToken,
          title: fields.title,
          description: fields.description || null,
          numberOfWorkers: Number(fields.numberOfWorkers),
          urgency: fields.urgency
        })
      });
      if (response.status === 409) {
        setStatus("stale");
        return setMessage(
          "This draft changed after you opened it. Your unsaved values are preserved."
        );
      }
      if (!response.ok) {
        setStatus(response.status === 401 || response.status === 403 ? "denied" : "ready");
        return setMessage("Draft was not saved. Your entered values remain available.");
      }
      const payload = (await response.json()) as { jobRequest: EmployerJobRequestDraft };
      setSnapshot(payload.jobRequest);
      setFields(toFields(payload.jobRequest));
      setStatus("saved");
      setMessage(`Draft ${payload.jobRequest.jobRequestNumber} saved.`);
    } catch {
      setStatus("ready");
      setMessage("Draft was not saved. The service is temporarily unavailable.");
    }
  }

  async function resubmit() {
    if (!snapshot || snapshot.status !== "information_required") return;
    setStatus("saving");
    setMessage("Resubmitting the corrected request for admin review.");
    try {
      const response = await fetch(`/api/job-requests/${encodeURIComponent(snapshot.id)}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expectedVersion: snapshot.versionToken })
      });
      if (response.status === 409) {
        setStatus("stale");
        return setMessage("This request changed. Load the latest version before resubmitting.");
      }
      if (!response.ok) {
        setStatus("ready");
        return setMessage("The corrected request remains saved but was not resubmitted.");
      }
      const payload = (await response.json()) as { jobRequest: EmployerJobRequestDraft };
      setSnapshot(payload.jobRequest);
      setFields(toFields(payload.jobRequest));
      setStatus("saved");
      setMessage(`Request ${payload.jobRequest.jobRequestNumber} resubmitted for review.`);
    } catch {
      setStatus("ready");
      setMessage("The corrected request remains saved. Resubmission is temporarily unavailable.");
    }
  }

  if (status === "loading") {
    return <State title="Loading persisted request" message={message} />;
  }
  if (!snapshot || !fields) {
    return (
      <State
        action="/employer/calendar"
        {...(status === "error" ? { onRetry: () => void load() } : {})}
        title={status === "denied" ? "Employer access required" : "Request unavailable"}
        message={message}
      />
    );
  }

  const editable = isEditable(snapshot.status);
  return (
    <form aria-busy={status === "saving"} onSubmit={save} style={styles.panel}>
      <p style={styles.eyebrowDark}>Persisted request {snapshot.jobRequestNumber}</p>
      <h2 style={styles.sectionTitle}>Draft details</h2>
      <p aria-live="polite" role={status === "stale" ? "alert" : "status"} style={styles.warning}>
        {message}
      </p>
      {snapshot.informationRequestReason ? (
        <p style={styles.sectionCopy}>
          Administrator clarification request: {snapshot.informationRequestReason}
        </p>
      ) : null}
      <div style={styles.formGrid}>
        <label style={styles.fieldLabel}>
          Request title
          <input
            disabled={!editable || status === "saving"}
            maxLength={160}
            onChange={(event) => setFields({ ...fields, title: event.target.value })}
            required
            style={styles.input}
            value={fields.title}
          />
        </label>
        <label style={styles.fieldLabel}>
          Workers required
          <input
            disabled={!editable || status === "saving"}
            min="1"
            onChange={(event) => setFields({ ...fields, numberOfWorkers: event.target.value })}
            required
            style={styles.input}
            type="number"
            value={fields.numberOfWorkers}
          />
        </label>
        <label style={styles.fieldLabel}>
          Urgency
          <select
            disabled={!editable || status === "saving"}
            onChange={(event) =>
              setFields({ ...fields, urgency: event.target.value as EditableFields["urgency"] })
            }
            style={styles.input}
            value={fields.urgency}
          >
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
            <option value="immediate">Immediate</option>
          </select>
        </label>
        <label style={styles.fieldLabel}>
          Description
          <textarea
            disabled={!editable || status === "saving"}
            maxLength={2000}
            onChange={(event) => setFields({ ...fields, description: event.target.value })}
            rows={5}
            style={styles.input}
            value={fields.description}
          />
        </label>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
        {editable && status !== "stale" ? (
          <button disabled={status === "saving"} style={styles.primaryButton} type="submit">
            {status === "saving" ? "Saving draft…" : "Save draft"}
          </button>
        ) : null}
        {snapshot.status === "information_required" && status === "saved" ? (
          <button onClick={() => void resubmit()} style={styles.primaryButton} type="button">
            Resubmit for admin review
          </button>
        ) : null}
        {status === "stale" ? (
          <button onClick={() => void load()} style={styles.primaryButton} type="button">
            Load latest version
          </button>
        ) : null}
        <a href="/employer/calendar" style={styles.secondaryButton}>
          Back to calendar
        </a>
      </div>
    </form>
  );
}

function isEditable(status: string) {
  return status === "draft" || status === "information_required";
}

function toFields(request: EmployerJobRequestDraft): EditableFields {
  return {
    title: request.title,
    description: request.description ?? "",
    numberOfWorkers: String(request.numberOfWorkers),
    urgency: request.urgency
  };
}

function validate(fields: EditableFields) {
  const issues: string[] = [];
  if (fields.title.trim().length < 4) issues.push("a title of at least four characters");
  if (!Number.isInteger(Number(fields.numberOfWorkers)) || Number(fields.numberOfWorkers) < 1) {
    issues.push("a valid worker count");
  }
  return issues;
}

function State({
  action,
  message,
  onRetry,
  title
}: {
  action?: string;
  message: string;
  onRetry?: () => void;
  title: string;
}) {
  return (
    <article aria-live="polite" style={styles.panel}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      <p style={styles.sectionCopy}>{message}</p>
      {onRetry ? (
        <button onClick={onRetry} style={styles.primaryButton} type="button">
          Retry
        </button>
      ) : null}
      {action ? (
        <a href={action} style={styles.secondaryButton}>
          Back to calendar
        </a>
      ) : null}
    </article>
  );
}
