"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  EmployerJobRequestDraft,
  EmployerRequestContext
} from "../../../api/job-requests/jobRequestBoundary";
import { styles } from "../../employerStyles";

type FormState = {
  residenceId: string;
  departmentId: string;
  workGroup: string;
  roleDefinition: string;
  title: string;
  description: string;
  numberOfWorkers: string;
  urgency: "normal" | "urgent" | "immediate";
  requestType: "single_day" | "multi_day" | "recurring_intent";
  timezone: string;
  startAt: string;
  endAt: string;
};

const initialForm: FormState = {
  residenceId: "",
  departmentId: "",
  workGroup: "",
  roleDefinition: "",
  title: "",
  description: "",
  numberOfWorkers: "1",
  urgency: "normal",
  requestType: "single_day",
  timezone: "America/Toronto",
  startAt: "",
  endAt: ""
};

export function CreatePersistedRequestPanel() {
  const [context, setContext] = useState<EmployerRequestContext | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [status, setStatus] = useState<
    "loading" | "editing" | "saving" | "draft" | "submitting" | "submitted" | "denied" | "error"
  >("loading");
  const [message, setMessage] = useState("Loading authorized request choices.");
  const [draft, setDraft] = useState<EmployerJobRequestDraft | null>(null);

  async function loadContext(residenceId = "") {
    setStatus("loading");
    setMessage("Loading authorized request choices.");
    try {
      const contextUrl = new URL("/api/job-requests/context", window.location.origin);
      if (residenceId) contextUrl.searchParams.set("residenceId", residenceId);
      const response = await fetch(contextUrl.toString(), { cache: "no-store" });
      if (response.status === 401) {
        setStatus("denied");
        return setMessage("Sign in and select an employer organization from the request calendar.");
      }
      if (response.status === 409) {
        setStatus("denied");
        return setMessage("Select an employer organization from the request calendar first.");
      }
      if (!response.ok) throw new Error("context");
      setContext(await response.json());
      setStatus("editing");
      setMessage("Complete the governed fields to save a persisted draft.");
    } catch {
      setStatus("error");
      setMessage("Request choices are unavailable. Your form has not been submitted.");
    }
  }

  useEffect(() => {
    void loadContext();
  }, []);

  const selectedWorkGroup = context?.workGroups.find((item) => item.slug === form.workGroup);
  const roles = useMemo(
    () =>
      context?.roleDefinitions.filter((role) => role.workGroupId === selectedWorkGroup?.id) ?? [],
    [context, selectedWorkGroup]
  );
  const validation = validate(form);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "residenceId" ? { departmentId: "" } : {}),
      ...(key === "workGroup" ? { roleDefinition: "" } : {})
    }));
    setMessage("Complete the governed fields to save a persisted draft.");
  }

  async function selectResidence(residenceId: string) {
    update("residenceId", residenceId);
    if (residenceId) await loadContext(residenceId);
  }

  async function createDraft(event: React.FormEvent) {
    event.preventDefault();
    if (validation.length) {
      setMessage(`Complete: ${validation.join(", ")}.`);
      return;
    }
    setStatus("saving");
    setMessage("Saving persisted draft.");
    try {
      const response = await fetch("/api/job-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          numberOfWorkers: Number(form.numberOfWorkers),
          startAt: new Date(form.startAt).toISOString(),
          endAt: new Date(form.endAt).toISOString()
        })
      });
      if (!response.ok) {
        setStatus(response.status === 401 ? "denied" : "editing");
        return setMessage(
          response.status === 409
            ? "Organization context changed. Return to the calendar and select it again."
            : "Draft could not be saved. Review the fields and try again."
        );
      }
      const payload = (await response.json()) as { jobRequest: EmployerJobRequestDraft };
      setDraft(payload.jobRequest);
      setStatus("draft");
      setMessage(`Draft ${payload.jobRequest.jobRequestNumber} was saved.`);
    } catch {
      setStatus("editing");
      setMessage("Draft service is unavailable. Your entered values remain on this page.");
    }
  }

  async function submitDraft() {
    if (!draft) return;
    setStatus("submitting");
    setMessage("Submitting the persisted draft for platform review.");
    try {
      const response = await fetch(`/api/job-requests/${encodeURIComponent(draft.id)}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expectedVersion: draft.versionToken })
      });
      if (!response.ok) {
        setStatus("draft");
        return setMessage(
          response.status === 409
            ? "This draft changed. Open the latest request before submitting again."
            : "The draft was saved but could not be submitted."
        );
      }
      const payload = (await response.json()) as { jobRequest: EmployerJobRequestDraft };
      setDraft(payload.jobRequest);
      setStatus("submitted");
      setMessage(`Request ${payload.jobRequest.jobRequestNumber} was submitted for review.`);
    } catch {
      setStatus("draft");
      setMessage("The draft remains saved. Submission is temporarily unavailable.");
    }
  }

  if (status === "loading") {
    return <StateCard busy message={message} title="Preparing staffing request" />;
  }
  if (status === "denied") {
    return (
      <StateCard action="/employer/calendar" message={message} title="Employer context required" />
    );
  }
  if (status === "error" || !context) {
    return (
      <StateCard
        message={message}
        onRetry={() => void loadContext(form.residenceId)}
        title="Request setup unavailable"
      />
    );
  }
  if (!context.residences.length || !context.workGroups.length) {
    return (
      <StateCard
        message="An active residence and work group are required before a staffing request can be created. Ask an authorized administrator to complete persisted organization setup."
        title="Request setup incomplete"
      />
    );
  }

  return (
    <form aria-busy={status === "saving" || status === "submitting"} onSubmit={createDraft}>
      <div aria-live="polite" role="status" style={styles.warning}>
        {message}
      </div>
      <div style={styles.formGrid}>
        <SelectField
          disabled={status !== "editing"}
          label="Residence"
          onChange={(value) => void selectResidence(value)}
          options={context.residences.map((item) => ({ label: item.name, value: item.id }))}
          value={form.residenceId}
        />
        <SelectField
          disabled={status !== "editing" || !form.residenceId}
          label="Department"
          onChange={(value) => update("departmentId", value)}
          options={context.departments
            .filter((item) => item.residenceId === form.residenceId)
            .map((item) => ({ label: item.name, value: item.id }))}
          value={form.departmentId}
        />
        <SelectField
          disabled={status !== "editing"}
          label="Work group"
          onChange={(value) => update("workGroup", value)}
          options={context.workGroups.map((item) => ({
            label: item.displayLabel,
            value: item.slug
          }))}
          value={form.workGroup}
        />
        <SelectField
          disabled={status !== "editing" || !form.workGroup}
          label="Role"
          onChange={(value) => update("roleDefinition", value)}
          options={roles.map((item) => ({ label: item.displayLabel, value: item.slug }))}
          value={form.roleDefinition}
        />
        <TextField
          disabled={status !== "editing"}
          label="Request title"
          maxLength={160}
          onChange={(value) => update("title", value)}
          value={form.title}
        />
        <TextField
          disabled={status !== "editing"}
          label="Workers required"
          min="1"
          onChange={(value) => update("numberOfWorkers", value)}
          type="number"
          value={form.numberOfWorkers}
        />
        <TextField
          disabled={status !== "editing"}
          label="Starts"
          onChange={(value) => update("startAt", value)}
          type="datetime-local"
          value={form.startAt}
        />
        <TextField
          disabled={status !== "editing"}
          label="Ends"
          onChange={(value) => update("endAt", value)}
          type="datetime-local"
          value={form.endAt}
        />
        <SelectField
          disabled={status !== "editing"}
          label="Urgency"
          onChange={(value) => update("urgency", value as FormState["urgency"])}
          options={[
            { label: "Normal", value: "normal" },
            { label: "Urgent", value: "urgent" },
            { label: "Immediate", value: "immediate" }
          ]}
          value={form.urgency}
        />
        <SelectField
          disabled={status !== "editing"}
          label="Request type"
          onChange={(value) => update("requestType", value as FormState["requestType"])}
          options={[
            { label: "Single day", value: "single_day" },
            { label: "Multi-day", value: "multi_day" },
            { label: "Recurring intent", value: "recurring_intent" }
          ]}
          value={form.requestType}
        />
        <TextField
          disabled={status !== "editing"}
          label="Timezone"
          onChange={(value) => update("timezone", value)}
          value={form.timezone}
        />
        <label style={styles.fieldLabel}>
          Description
          <textarea
            disabled={status !== "editing"}
            maxLength={2000}
            onChange={(event) => update("description", event.target.value)}
            rows={4}
            style={styles.input}
            value={form.description}
          />
        </label>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
        {status === "editing" ? (
          <button
            disabled={validation.length > 0}
            style={validation.length ? styles.disabledAction : styles.primaryButton}
            type="submit"
          >
            Save persisted draft
          </button>
        ) : null}
        {status === "draft" ? (
          <button onClick={() => void submitDraft()} style={styles.primaryButton} type="button">
            Submit for review
          </button>
        ) : null}
        {draft ? (
          <>
            {status === "draft" ? (
              <a
                href={`/employer/calendar/request/edit?id=${encodeURIComponent(draft.id)}`}
                style={styles.secondaryButton}
              >
                Edit persisted draft
              </a>
            ) : null}
            <a
              href={`/employer/calendar/request?request=${encodeURIComponent(draft.jobRequestNumber)}`}
              style={styles.secondaryButton}
            >
              Open persisted request
            </a>
          </>
        ) : null}
        <a href="/employer/calendar" style={styles.secondaryButton}>
          Back to calendar
        </a>
      </div>
    </form>
  );
}

function validate(form: FormState) {
  const missing = [
    ["residence", form.residenceId],
    ["department", form.departmentId],
    ["work group", form.workGroup],
    ["role", form.roleDefinition],
    ["title", form.title.trim().length >= 4 ? form.title : ""],
    ["start time", form.startAt],
    ["end time", form.endAt],
    ["timezone", form.timezone]
  ].flatMap(([label, value]) => (value ? [] : [label]));
  if (!Number.isInteger(Number(form.numberOfWorkers)) || Number(form.numberOfWorkers) < 1) {
    missing.push("valid worker count");
  }
  if (form.startAt && form.endAt && new Date(form.endAt) <= new Date(form.startAt)) {
    missing.push("an end time after the start time");
  }
  return missing;
}

function SelectField({
  disabled,
  label,
  onChange,
  options,
  value
}: {
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  options: readonly { label: string; value: string }[];
  value: string;
}) {
  return (
    <label style={styles.fieldLabel}>
      {label}
      <select
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        required
        style={styles.input}
        value={value}
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  disabled,
  label,
  maxLength,
  min,
  onChange,
  type = "text",
  value
}: {
  disabled: boolean;
  label: string;
  maxLength?: number;
  min?: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <label style={styles.fieldLabel}>
      {label}
      <input
        disabled={disabled}
        maxLength={maxLength}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        required
        style={styles.input}
        type={type}
        value={value}
      />
    </label>
  );
}

function StateCard({
  action,
  busy = false,
  message,
  onRetry,
  title
}: {
  action?: string;
  busy?: boolean;
  message: string;
  onRetry?: () => void;
  title: string;
}) {
  return (
    <article aria-busy={busy} aria-live="polite" style={styles.panel}>
      <h2 style={styles.cardTitle}>{title}</h2>
      <p style={styles.sectionCopy}>{message}</p>
      {action ? (
        <a href={action} style={styles.primaryButton}>
          Continue
        </a>
      ) : null}
      {onRetry ? (
        <button onClick={onRetry} style={styles.secondaryButton} type="button">
          Retry
        </button>
      ) : null}
    </article>
  );
}
