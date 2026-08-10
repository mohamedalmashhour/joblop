"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  EmployerJobRequestDraft,
  EmployerRequestContext
} from "../../../api/job-requests/jobRequestBoundary";
import { styles } from "../../employerStyles";
import { JobLocationMap } from "../../../shared/maps";
import { estimateRequestCost, formatHourlyRate, formatMoney, hoursBetween } from "@rwos/shared";

type FormState = {
  residenceId: string;
  departmentId: string;
  workGroup: string;
  roleDefinition: string;
  title: string;
  description: string;
  dutiesSummary: string;
  qualifications: string;
  addressSummary: string;
  specialInstructions: string;
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
  dutiesSummary: "",
  qualifications: "",
  addressSummary: "",
  specialInstructions: "",
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
    | "loading"
    | "editing"
    | "review"
    | "saving"
    | "draft"
    | "submitting"
    | "submitted"
    | "denied"
    | "error"
  >("loading");
  const [message, setMessage] = useState("Loading authorized request choices.");
  const [draft, setDraft] = useState<EmployerJobRequestDraft | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

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
  const selectedRole = roles.find((role) => role.slug === form.roleDefinition);
  const rateCurrency: "CAD" | "USD" = selectedRole?.currency === "USD" ? "USD" : "CAD";
  const scheduledHours = hoursBetween(form.startAt, form.endAt);
  const workerCount =
    Number.isInteger(Number(form.numberOfWorkers)) && Number(form.numberOfWorkers) > 0
      ? Number(form.numberOfWorkers)
      : 1;

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

  function prepareReview(event: React.FormEvent) {
    event.preventDefault();
    if (validation.length) {
      setMessage(`Complete: ${validation.join(", ")}.`);
      return;
    }
    setStatus("review");
    setMessage("Review every staffing detail before saving the persisted draft.");
  }

  async function createDraft() {
    setStatus("saving");
    setMessage("Saving persisted draft.");
    try {
      const response = await fetch("/api/job-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          residenceId: form.residenceId,
          departmentId: form.departmentId,
          workGroup: form.workGroup,
          roleDefinition: form.roleDefinition,
          title: form.title,
          description: form.description,
          urgency: form.urgency,
          requestType: form.requestType,
          timezone: form.timezone,
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
      const saved = await saveProfile(payload.jobRequest);
      setProfileSaved(saved);
      setStatus("draft");
      setMessage(
        saved
          ? `Draft ${payload.jobRequest.jobRequestNumber} and its staffing details were saved.`
          : `Draft ${payload.jobRequest.jobRequestNumber} was saved, but its staffing details were not. Retry before submission.`
      );
    } catch {
      setStatus("editing");
      setMessage("Draft service is unavailable. Your entered values remain on this page.");
    }
  }

  async function saveProfile(request: EmployerJobRequestDraft) {
    try {
      const response = await fetch(`/api/calendar/requests/${encodeURIComponent(request.id)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          dutiesSummary: form.dutiesSummary.trim() || null,
          qualifications: splitQualifications(form.qualifications),
          addressSummary: form.addressSummary.trim() || null,
          specialInstructions: form.specialInstructions.trim() || null,
          expectedVersion: null
        })
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async function retryProfile() {
    if (!draft) return;
    setStatus("saving");
    setMessage("Saving staffing details.");
    const saved = await saveProfile(draft);
    setProfileSaved(saved);
    setStatus("draft");
    setMessage(saved ? "Staffing details saved." : "Staffing details remain unsaved. Try again.");
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
    <form aria-busy={status === "saving" || status === "submitting"} onSubmit={prepareReview}>
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
        <TextField
          disabled={status !== "editing"}
          label="Synthetic site address"
          maxLength={500}
          onChange={(value) => update("addressSummary", value)}
          value={form.addressSummary}
        />
        <TextField
          disabled={status !== "editing"}
          label="Required certifications (comma separated)"
          maxLength={2000}
          onChange={(value) => update("qualifications", value)}
          value={form.qualifications}
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
        <label style={styles.fieldLabel}>
          Duties summary
          <textarea
            disabled={status !== "editing"}
            maxLength={2000}
            onChange={(event) => update("dutiesSummary", event.target.value)}
            rows={4}
            style={styles.input}
            value={form.dutiesSummary}
          />
        </label>
        <label style={styles.fieldLabel}>
          Special instructions
          <textarea
            disabled={status !== "editing"}
            maxLength={2000}
            onChange={(event) => update("specialInstructions", event.target.value)}
            rows={4}
            style={styles.input}
            value={form.specialInstructions}
          />
        </label>
      </div>
      {selectedRole ? (
        <div style={{ marginTop: 18 }}>
          <p style={styles.metaLabel}>Governed pay rate</p>
          {selectedRole.hourlyRateMinor !== null ? (
            <div style={styles.tintedCard}>
              <strong>
                {formatHourlyRate({
                  amountMinor: selectedRole.hourlyRateMinor,
                  currency: rateCurrency
                })}
              </strong>
              {scheduledHours > 0 ? (
                <span>
                  {" "}
                  · Estimated total{" "}
                  {formatMoney(
                    estimateRequestCost({
                      hourlyRate: {
                        amountMinor: selectedRole.hourlyRateMinor,
                        currency: rateCurrency
                      },
                      hours: scheduledHours,
                      workers: workerCount
                    })
                  )}{" "}
                  ({scheduledHours}h × {workerCount})
                </span>
              ) : null}
              <p style={styles.cardText}>
                Read from your organization&rsquo;s active contract. This request applies the
                governed rate — it does not set the price.
              </p>
            </div>
          ) : (
            <div style={styles.warning}>
              Your active contract does not price this role yet.{" "}
              <a href="/employer/contract" style={{ textDecoration: "underline", color: "inherit" }}>
                Review and sign your contract
              </a>{" "}
              before submitting.
            </div>
          )}
        </div>
      ) : null}
      {form.addressSummary.trim().length > 1 ? (
        <div style={{ marginTop: 18 }}>
          <p style={styles.metaLabel}>Site location</p>
          <JobLocationMap address={form.addressSummary} height={260} />
        </div>
      ) : null}
      {status === "review" ? <RequestReview form={form} /> : null}
      <p style={styles.cardText}>
        Hourly rate and transportation compensation are governed by the approved contract and offer
        terms. This request step does not collect or invent worker economics.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
        {status === "editing" ? (
          <button
            disabled={validation.length > 0}
            style={validation.length ? styles.disabledAction : styles.primaryButton}
            type="submit"
          >
            Review request
          </button>
        ) : null}
        {status === "review" ? (
          <>
            <button onClick={() => void createDraft()} style={styles.primaryButton} type="button">
              Save persisted draft
            </button>
            <button
              onClick={() => {
                setStatus("editing");
                setMessage("Update the request, then review it again.");
              }}
              style={styles.secondaryButton}
              type="button"
            >
              Back to edit
            </button>
          </>
        ) : null}
        {status === "draft" ? (
          <button
            disabled={!profileSaved}
            onClick={() => void submitDraft()}
            style={profileSaved ? styles.primaryButton : styles.disabledAction}
            type="button"
          >
            Submit for review
          </button>
        ) : null}
        {status === "draft" && !profileSaved ? (
          <button onClick={() => void retryProfile()} style={styles.secondaryButton} type="button">
            Retry staffing details
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

function RequestReview({ form }: Readonly<{ form: FormState }>) {
  const rows = [
    ["Role", form.roleDefinition],
    ["Request type", form.requestType.replaceAll("_", " ")],
    ["Urgency", form.urgency],
    ["Workers", form.numberOfWorkers],
    ["Schedule", `${form.startAt} to ${form.endAt} (${form.timezone})`],
    ["Address", form.addressSummary || "Not provided"],
    ["Certifications", splitQualifications(form.qualifications).join(", ") || "Not provided"],
    ["Duties", form.dutiesSummary || "Not provided"],
    ["Special instructions", form.specialInstructions || "Not provided"]
  ] as const;
  return (
    <section aria-labelledby="request-review-title" style={styles.panel}>
      <h2 id="request-review-title" style={styles.sectionTitle}>
        Review staffing request
      </h2>
      <dl style={styles.cardGrid}>
        {rows.map(([label, value]) => (
          <div key={label} style={styles.tintedCard}>
            <dt style={styles.metaLabel}>{label}</dt>
            <dd style={{ margin: 0 }}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function splitQualifications(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
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
