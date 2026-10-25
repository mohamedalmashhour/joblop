"use client";

import { useEffect, useMemo, useState } from "react";
import { trackConversion } from "../../../analytics";
import type {
  EmployerJobRequestDraft,
  EmployerRequestContext
} from "../../../api/job-requests/jobRequestBoundary";
import { styles } from "../../employerStyles";
import { JobLocationMap } from "../../../shared/maps";
import {
  MINIMUM_SHIFT_HOURS,
  estimateRequestCost,
  formatHourlyRate,
  formatMoney,
  hoursBetween,
  meetsMinimumShiftDuration
} from "@rwos/shared";
import { LanguageSwitcher } from "../../../i18n/LanguageSwitcher";
import { useT, type Translate } from "../../../i18n/LocaleProvider";

type Provision = "none" | "provided" | "allowance";

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
  transportProvision: Provision;
  transportAmount: string;
  transportNote: string;
  mealProvision: Provision;
  mealAmount: string;
  mealNote: string;
  lodgingProvision: Provision;
  lodgingAmount: string;
  lodgingNote: string;
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
  endAt: "",
  transportProvision: "none",
  transportAmount: "",
  transportNote: "",
  mealProvision: "none",
  mealAmount: "",
  mealNote: "",
  lodgingProvision: "none",
  lodgingAmount: "",
  lodgingNote: ""
};

function toMinor(value: string): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function allowancesPayload(form: FormState) {
  return {
    transport: { provision: form.transportProvision, amountMinor: toMinor(form.transportAmount), note: form.transportNote.trim() || null },
    meal: { provision: form.mealProvision, amountMinor: toMinor(form.mealAmount), note: form.mealNote.trim() || null },
    lodging: { provision: form.lodgingProvision, amountMinor: toMinor(form.lodgingAmount), note: form.lodgingNote.trim() || null }
  };
}

export function CreatePersistedRequestPanel() {
  const t = useT();
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
  const [message, setMessage] = useState(() => "");
  // Why the context was denied: "signin" (401, not authenticated) routes to /signin;
  // "org" (409, no employer org selected) routes back to the request calendar.
  const [deniedKind, setDeniedKind] = useState<"signin" | "org">("org");
  const [draft, setDraft] = useState<EmployerJobRequestDraft | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);

  useEffect(() => {
    setMessage(t("create.msgLoadingChoices"));
  }, []);

  async function loadContext(residenceId = "") {
    setStatus("loading");
    setMessage(t("create.msgLoadingChoices"));
    try {
      const contextUrl = new URL("/api/job-requests/context", window.location.origin);
      if (residenceId) contextUrl.searchParams.set("residenceId", residenceId);
      const response = await fetch(contextUrl.toString(), { cache: "no-store" });
      if (response.status === 401) {
        setDeniedKind("signin");
        setStatus("denied");
        return setMessage(t("create.msgSignInSelectOrg"));
      }
      if (response.status === 409) {
        setDeniedKind("org");
        setStatus("denied");
        return setMessage(t("create.msgSelectOrgFirst"));
      }
      if (!response.ok) throw new Error("context");
      setContext(await response.json());
      setStatus("editing");
      setMessage(t("create.msgCompleteFields"));
    } catch {
      setStatus("error");
      setMessage(t("create.msgChoicesUnavailable"));
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
  const validation = validate(form, t);
  const selectedRole = roles.find((role) => role.slug === form.roleDefinition);
  const rateCurrency: "CAD" | "USD" = selectedRole?.currency === "USD" ? "USD" : "CAD";
  const rateUnpriced = Boolean(selectedRole && selectedRole.hourlyRateMinor === null);
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
    setMessage(t("create.msgCompleteFields"));
  }

  async function selectResidence(residenceId: string) {
    update("residenceId", residenceId);
    if (residenceId) await loadContext(residenceId);
  }

  function prepareReview(event: React.FormEvent) {
    event.preventDefault();
    if (rateUnpriced) {
      setMessage(t("create.gateUnpriced"));
      return;
    }
    if (validation.length) {
      setMessage(t("create.msgCompleteList", { fields: validation.join(", ") }));
      return;
    }
    setStatus("review");
    setMessage(t("create.msgReviewBeforeSave"));
  }

  async function createDraft(submitting = false): Promise<EmployerJobRequestDraft | null> {
    setStatus("saving");
    setMessage(submitting ? t("create.msgSubmitting") : t("create.msgSavingDraft"));
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
        if (response.status === 401) setDeniedKind("signin");
        setStatus(response.status === 401 ? "denied" : "editing");
        setMessage(
          response.status === 409 ? t("create.msgOrgChanged") : t("create.msgDraftNotSaved")
        );
        return null;
      }
      const payload = (await response.json()) as { jobRequest: EmployerJobRequestDraft };
      setDraft(payload.jobRequest);
      const saved = await saveProfile(payload.jobRequest);
      setProfileSaved(saved);
      setStatus("draft");
      if (!submitting) {
        setMessage(
          saved
            ? t("create.msgDraftSaved", { num: payload.jobRequest.jobRequestNumber })
            : t("create.msgDraftSavedNoDetails", { num: payload.jobRequest.jobRequestNumber })
        );
      }
      return payload.jobRequest;
    } catch {
      setStatus("editing");
      setMessage(t("create.msgDraftServiceDown"));
      return null;
    }
  }

  // One-click path from the review step: persist the draft, then submit it for review using the
  // freshly-saved draft (the optional profile save never blocks submission).
  async function saveAndSubmit() {
    const saved = await createDraft(true);
    if (saved) await submitDraft(saved);
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
          allowances: allowancesPayload(form),
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
    setMessage(t("create.msgSavingDraft"));
    const saved = await saveProfile(draft);
    setProfileSaved(saved);
    setStatus("draft");
    setMessage(saved ? t("create.msgDetailsSaved") : t("create.msgDetailsUnsaved"));
  }

  async function submitDraft(target?: EmployerJobRequestDraft) {
    const current = target ?? draft;
    if (!current) return;
    setStatus("submitting");
    setMessage(t("create.msgSubmitting"));
    try {
      const response = await fetch(`/api/job-requests/${encodeURIComponent(current.id)}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expectedVersion: current.versionToken })
      });
      if (!response.ok) {
        setStatus("draft");
        return setMessage(
          response.status === 409 ? t("create.msgDraftChanged") : t("create.msgSavedNotSubmitted")
        );
      }
      const payload = (await response.json()) as { jobRequest: EmployerJobRequestDraft };
      setDraft(payload.jobRequest);
      setStatus("submitted");
      trackConversion("submit_request", { method: "employer" });
      setMessage(t("create.msgSubmitted", { num: payload.jobRequest.jobRequestNumber }));
    } catch {
      setStatus("draft");
      setMessage(t("create.msgSubmitUnavailable"));
    }
  }

  if (status === "loading") {
    return <StateCard busy message={message} title={t("create.statePreparing")} t={t} />;
  }
  if (status === "denied") {
    const needsSignIn = deniedKind === "signin";
    return (
      <StateCard
        action={needsSignIn ? "/signin" : "/employer/calendar"}
        actionLabel={needsSignIn ? t("auth.signIn") : t("create.continue")}
        message={message}
        title={needsSignIn ? t("auth.signIn") : t("create.stateContextRequired")}
        t={t}
      />
    );
  }
  if (status === "error" || !context) {
    return (
      <StateCard
        message={message}
        onRetry={() => void loadContext(form.residenceId)}
        title={t("create.stateSetupUnavailable")}
        t={t}
      />
    );
  }
  if (!context.residences.length || !context.workGroups.length) {
    return <StateCard message={t("create.stateSetupIncompleteMsg")} title={t("create.stateSetupIncomplete")} t={t} />;
  }

  const editing = status === "editing";

  return (
    <form aria-busy={status === "saving" || status === "submitting"} onSubmit={prepareReview}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <LanguageSwitcher />
      </div>
      <div aria-live="polite" role="status" style={styles.warning}>
        {message}
      </div>
      <div style={styles.formGrid}>
        <SelectField disabled={!editing} label={t("create.residence")} onChange={(v) => void selectResidence(v)} options={context.residences.map((i) => ({ label: i.name, value: i.id }))} value={form.residenceId} t={t} />
        <SelectField disabled={!editing || !form.residenceId} label={t("create.department")} onChange={(v) => update("departmentId", v)} options={context.departments.filter((i) => i.residenceId === form.residenceId).map((i) => ({ label: i.name, value: i.id }))} value={form.departmentId} t={t} />
        <SelectField disabled={!editing} label={t("create.workGroup")} onChange={(v) => update("workGroup", v)} options={context.workGroups.map((i) => ({ label: i.displayLabel, value: i.slug }))} value={form.workGroup} t={t} />
        <SelectField disabled={!editing || !form.workGroup} label={t("create.role")} onChange={(v) => update("roleDefinition", v)} options={roles.map((i) => ({ label: i.displayLabel, value: i.slug }))} value={form.roleDefinition} t={t} />
        <TextField disabled={!editing} label={t("create.title")} maxLength={160} onChange={(v) => update("title", v)} value={form.title} />
        <TextField disabled={!editing} label={t("create.workersRequired")} min="1" onChange={(v) => update("numberOfWorkers", v)} type="number" value={form.numberOfWorkers} />
        <TextField disabled={!editing} label={t("create.starts")} onChange={(v) => update("startAt", v)} type="datetime-local" value={form.startAt} />
        <TextField disabled={!editing} label={t("create.ends")} onChange={(v) => update("endAt", v)} type="datetime-local" value={form.endAt} />
        <div style={{ gridColumn: "1 / -1" }} aria-live="polite">
          {form.startAt && form.endAt && new Date(form.endAt) > new Date(form.startAt) && !meetsMinimumShiftDuration(form.startAt, form.endAt) ? (
            <div style={styles.warning} role="alert">
              {t("create.minShiftMsg")} {t("create.minShiftWarn", { hours: scheduledHours.toFixed(1), min: MINIMUM_SHIFT_HOURS })}
            </div>
          ) : (
            <p style={styles.cardText}>{t("create.minShiftMsg")}</p>
          )}
        </div>
        <SelectField disabled={!editing} label={t("create.urgency")} onChange={(v) => update("urgency", v as FormState["urgency"])} options={[{ label: t("create.urgencyNormal"), value: "normal" }, { label: t("create.urgencyUrgent"), value: "urgent" }, { label: t("create.urgencyImmediate"), value: "immediate" }]} value={form.urgency} t={t} />
        <SelectField disabled={!editing} label={t("create.requestType")} onChange={(v) => update("requestType", v as FormState["requestType"])} options={[{ label: t("create.typeSingle"), value: "single_day" }, { label: t("create.typeMulti"), value: "multi_day" }, { label: t("create.typeRecurring"), value: "recurring_intent" }]} value={form.requestType} t={t} />
        <TextField disabled={!editing} label={t("create.timezone")} onChange={(v) => update("timezone", v)} value={form.timezone} />
        <TextField disabled={!editing} label={t("create.siteAddress")} maxLength={500} onChange={(v) => update("addressSummary", v)} value={form.addressSummary} />
        <TextField disabled={!editing} label={t("create.certifications")} maxLength={2000} onChange={(v) => update("qualifications", v)} value={form.qualifications} />
        <label style={styles.fieldLabel}>
          {t("create.description")}
          <textarea disabled={!editing} maxLength={2000} onChange={(e) => update("description", e.target.value)} rows={4} style={styles.input} value={form.description} />
        </label>
        <label style={styles.fieldLabel}>
          {t("create.duties")}
          <textarea disabled={!editing} maxLength={2000} onChange={(e) => update("dutiesSummary", e.target.value)} rows={4} style={styles.input} value={form.dutiesSummary} />
          <span style={styles.cardText}>{t("create.dutiesScopeNote")}</span>
        </label>
        <label style={styles.fieldLabel}>
          {t("create.safety")}
          <textarea disabled={!editing} maxLength={2000} onChange={(e) => update("specialInstructions", e.target.value)} rows={4} style={styles.input} value={form.specialInstructions} />
          <span style={styles.cardText}>{t("create.safetyNote")}</span>
        </label>
      </div>

      <section style={{ marginTop: 18 }}>
        <p style={styles.metaLabel}>{t("create.allowancesTitle")}</p>
        <p style={styles.cardText}>{t("create.allowancesNote")}</p>
        <div style={styles.formGrid}>
          <AllowanceFields label={t("create.allowanceTransport")} disabled={!editing} provision={form.transportProvision} amount={form.transportAmount} note={form.transportNote} onProvision={(v) => update("transportProvision", v)} onAmount={(v) => update("transportAmount", v)} onNote={(v) => update("transportNote", v)} t={t} />
          <AllowanceFields label={t("create.allowanceMeal")} disabled={!editing} provision={form.mealProvision} amount={form.mealAmount} note={form.mealNote} onProvision={(v) => update("mealProvision", v)} onAmount={(v) => update("mealAmount", v)} onNote={(v) => update("mealNote", v)} t={t} />
          <AllowanceFields label={t("create.allowanceLodging")} disabled={!editing} provision={form.lodgingProvision} amount={form.lodgingAmount} note={form.lodgingNote} onProvision={(v) => update("lodgingProvision", v)} onAmount={(v) => update("lodgingAmount", v)} onNote={(v) => update("lodgingNote", v)} t={t} />
        </div>
      </section>

      {selectedRole ? (
        <div style={{ marginTop: 18 }}>
          <p style={styles.metaLabel}>{t("create.rateYouPay")}</p>
          {selectedRole.hourlyRateMinor !== null ? (
            <div style={styles.tintedCard}>
              <strong>{formatHourlyRate({ amountMinor: selectedRole.hourlyRateMinor, currency: rateCurrency })}</strong>
              {scheduledHours > 0 ? (
                <span> · {t("create.estimatedTotal", { amount: formatMoney(estimateRequestCost({ hourlyRate: { amountMinor: selectedRole.hourlyRateMinor, currency: rateCurrency }, hours: scheduledHours, workers: workerCount })), hours: scheduledHours, workers: workerCount })}</span>
              ) : null}
              <p style={styles.cardText}>{t("create.rateFromContract")}</p>
            </div>
          ) : (
            <div style={styles.warning}>
              {t("create.rateNotPriced")}{" "}
              <a href="/employer/contract" style={{ textDecoration: "underline", color: "inherit" }}>{t("create.reviewSignContract")}</a>{" "}
              {t("create.beforeSubmitting")}
            </div>
          )}
        </div>
      ) : null}
      {form.addressSummary.trim().length > 1 ? (
        <div style={{ marginTop: 18 }}>
          <p style={styles.metaLabel}>{t("create.siteLocation")}</p>
          <JobLocationMap address={form.addressSummary} height={260} />
        </div>
      ) : null}

      <AgreementClauses t={t} />
      {status === "editing" || status === "draft" || status === "review" ? (
        <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
          <input
            aria-label={t("create.agreementAccept")}
            checked={agreementAccepted}
            onChange={(e) => setAgreementAccepted(e.target.checked)}
            style={{ flexShrink: 0, margin: 0 }}
            type="checkbox"
          />
          <span style={styles.cardText}>{t("create.agreementAccept")}</span>
        </label>
      ) : null}

      {status === "review" ? <RequestReview form={form} roleLabel={selectedRole?.displayLabel ?? form.roleDefinition} t={t} /> : null}
      <p style={styles.cardText}>{t("create.economicsNote")}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
        {status === "editing" ? (
          <button disabled={validation.length > 0 || rateUnpriced} style={validation.length || rateUnpriced ? styles.disabledAction : styles.primaryButton} type="submit">{t("create.reviewRequest")}</button>
        ) : null}
        {status === "review" ? (
          <>
            <button disabled={!agreementAccepted} onClick={() => void saveAndSubmit()} style={agreementAccepted ? styles.primaryButton : styles.disabledAction} type="button">{t("create.submitForReview")}</button>
            <button onClick={() => void createDraft()} style={styles.secondaryButton} type="button">{t("create.saveDraft")}</button>
            <button onClick={() => { setStatus("editing"); setMessage(t("create.msgUpdateThenReview")); }} style={styles.secondaryButton} type="button">{t("create.backToEdit")}</button>
          </>
        ) : null}
        {status === "draft" ? (
          <button disabled={!agreementAccepted} onClick={() => void submitDraft()} style={agreementAccepted ? styles.primaryButton : styles.disabledAction} type="button">{t("create.submitForReview")}</button>
        ) : null}
        {status === "draft" && !profileSaved ? (
          <button onClick={() => void retryProfile()} style={styles.secondaryButton} type="button">{t("create.retryDetails")}</button>
        ) : null}
        {draft ? (
          <>
            {status === "draft" ? (
              <a href={`/employer/calendar/request/edit?id=${encodeURIComponent(draft.id)}`} style={styles.secondaryButton}>{t("create.editDraft")}</a>
            ) : null}
            <a href={`/employer/calendar/request?request=${encodeURIComponent(draft.jobRequestNumber)}`} style={styles.secondaryButton}>{t("create.openRequest")}</a>
          </>
        ) : null}
        <a href="/employer/calendar" style={styles.secondaryButton}>{t("create.backToCalendar")}</a>
      </div>
    </form>
  );
}

function AllowanceFields({
  label, disabled, provision, amount, note, onProvision, onAmount, onNote, t
}: {
  label: string; disabled: boolean; provision: Provision; amount: string; note: string;
  onProvision: (v: Provision) => void; onAmount: (v: string) => void; onNote: (v: string) => void; t: Translate;
}) {
  return (
    <div style={styles.tintedCard}>
      <p style={styles.metaLabel}>{label}</p>
      <label style={styles.fieldLabel}>
        <select disabled={disabled} onChange={(e) => onProvision(e.target.value as Provision)} style={styles.input} value={provision}>
          <option value="none">{t("create.provisionNone")}</option>
          <option value="provided">{t("create.provisionProvided")}</option>
          <option value="allowance">{t("create.provisionAllowance")}</option>
        </select>
      </label>
      {provision === "allowance" ? (
        <label style={styles.fieldLabel}>
          {t("create.allowanceAmount")}
          <input disabled={disabled} inputMode="numeric" onChange={(e) => onAmount(e.target.value)} style={styles.input} type="number" min="0" value={amount} />
        </label>
      ) : null}
      {provision !== "none" ? (
        <label style={styles.fieldLabel}>
          {t("create.allowanceNoteField")}
          <input disabled={disabled} maxLength={500} onChange={(e) => onNote(e.target.value)} style={styles.input} value={note} />
        </label>
      ) : null}
    </div>
  );
}

function AgreementClauses({ t }: { t: Translate }) {
  const clauses = [
    t("create.clause6h"),
    t("create.clauseTermination"),
    t("create.clauseScope"),
    t("create.clauseRespect"),
    t("create.clauseExtraHours"),
    t("create.clauseSafety")
  ];
  return (
    <section aria-labelledby="agreement-title" style={{ ...styles.panel, marginTop: 18 }}>
      <h2 id="agreement-title" style={styles.sectionTitle}>{t("create.agreementTitle")}</h2>
      <p style={styles.cardText}>{t("create.clausesHeading")}</p>
      <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
        {clauses.map((c) => (
          <li key={c} style={{ ...styles.cardText, margin: "4px 0" }}>{c}</li>
        ))}
      </ul>
    </section>
  );
}

function RequestReview({ form, roleLabel, t }: Readonly<{ form: FormState; roleLabel: string; t: Translate }>) {
  const np = t("create.notProvided");
  const rows = [
    [t("create.role"), roleLabel],
    [t("create.requestType"), form.requestType.replaceAll("_", " ")],
    [t("create.urgency"), form.urgency],
    [t("create.workersRequired"), form.numberOfWorkers],
    [t("create.reviewSchedule"), t("create.scheduleValue", { start: form.startAt, end: form.endAt, tz: form.timezone })],
    [t("create.siteAddress"), form.addressSummary || np],
    [t("create.certifications"), splitQualifications(form.qualifications).join(", ") || np],
    [t("create.duties"), form.dutiesSummary || np],
    [t("create.safety"), form.specialInstructions || np]
  ] as const;
  return (
    <section aria-labelledby="request-review-title" style={styles.panel}>
      <h2 id="request-review-title" style={styles.sectionTitle}>{t("create.reviewTitle")}</h2>
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
  return value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20);
}

function validate(form: FormState, t: Translate) {
  const missing = [
    [t("create.residence"), form.residenceId],
    [t("create.department"), form.departmentId],
    [t("create.workGroup"), form.workGroup],
    [t("create.role"), form.roleDefinition],
    [t("create.title"), form.title.trim().length >= 4 ? form.title : ""],
    [t("create.starts"), form.startAt],
    [t("create.ends"), form.endAt],
    [t("create.timezone"), form.timezone]
  ].flatMap(([label, value]) => (value ? [] : [label]));
  if (!Number.isInteger(Number(form.numberOfWorkers)) || Number(form.numberOfWorkers) < 1) {
    missing.push(t("create.workersRequired"));
  }
  if (form.startAt && form.endAt && new Date(form.endAt) <= new Date(form.startAt)) {
    missing.push(t("create.ends"));
  }
  if (
    form.startAt &&
    form.endAt &&
    new Date(form.endAt) > new Date(form.startAt) &&
    !meetsMinimumShiftDuration(form.startAt, form.endAt)
  ) {
    missing.push(t("create.minShiftWarn", { hours: hoursBetween(form.startAt, form.endAt).toFixed(1), min: MINIMUM_SHIFT_HOURS }));
  }
  return missing;
}

function SelectField({
  disabled, label, onChange, options, value, t
}: {
  disabled: boolean; label: string; onChange: (value: string) => void;
  options: readonly { label: string; value: string }[]; value: string; t: Translate;
}) {
  return (
    <label style={styles.fieldLabel}>
      {label}
      <select disabled={disabled} onChange={(event) => onChange(event.target.value)} required style={styles.input} value={value}>
        <option value="">{t("create.selectPlaceholder", { label })}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  disabled, label, maxLength, min, onChange, type = "text", value
}: {
  disabled: boolean; label: string; maxLength?: number; min?: string;
  onChange: (value: string) => void; type?: string; value: string;
}) {
  return (
    <label style={styles.fieldLabel}>
      {label}
      <input disabled={disabled} maxLength={maxLength} min={min} onChange={(event) => onChange(event.target.value)} required style={styles.input} type={type} value={value} />
    </label>
  );
}

function StateCard({
  action, actionLabel, busy = false, message, onRetry, title, t
}: {
  action?: string; actionLabel?: string; busy?: boolean; message: string; onRetry?: () => void; title: string; t: Translate;
}) {
  return (
    <article aria-busy={busy} aria-live="polite" style={styles.panel}>
      <h2 style={styles.cardTitle}>{title}</h2>
      <p style={styles.sectionCopy}>{message}</p>
      {action ? <a href={action} style={styles.primaryButton}>{actionLabel ?? t("create.continue")}</a> : null}
      {onRetry ? <button onClick={onRetry} style={styles.secondaryButton} type="button">{t("common.retry")}</button> : null}
    </article>
  );
}
