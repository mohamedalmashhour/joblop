"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  formatPayOffered,
  hoursBetween,
  meetsMinimumShiftDuration,
  REQUIRED_CERTIFICATE_KEYS,
  certificateLabel,
  isRequiredCertificateKey,
  parseRequiredCertificates,
  type RequiredCertificateKey
} from "@rwos/shared";
import { fmtLocale, useLocale, useT, type Translate } from "../../../i18n/LocaleProvider";
import { MAX_RECURRING_SHIFTS, recurringShifts, type ShiftTimes } from "./recurringShifts";
import { DictationButton, DictationPrivacyNote } from "./DictationButton";
import { prefillSiteAddress, submittedConfirmation, type SubmittedConfirmation } from "./requestFormFlow";
import { requestActionNotice } from "./requestActionNotice";
import { LongTermListingsPanel } from "../../listings/LongTermListingsPanel";
import { formPayOffered, longTermRequestBody, requestPricingGate } from "./longTermRequestForm";
import {
  DEFAULT_SHIFT_HOURS,
  TIME_OPTIONS,
  addHoursLocal,
  allowanceAmountMissing,
  combineDateTime,
  defaultStart,
  dollarsToMinor,
  estimateTaxLines,
  isLongShift,
  localDateTimeToIso,
  minorToDollars,
  snapToQuarterHour,
  splitDateTime,
  timeOptionLabel,
  toLocalDateTime
} from "./requestFormInputs";

type Provision = "none" | "provided" | "allowance";

type FormState = {
  residenceId: string;
  departmentId: string;
  workGroup: string;
  roleDefinition: string;
  title: string;
  description: string;
  dutiesSummary: string;
  // Kept so an edit never wipes certifications saved by older versions of this form (no longer shown;
  // the "Required certificates" checkboxes replace it).
  qualifications: string;
  addressSummary: string;
  specialInstructions: string;
  numberOfWorkers: string;
  urgency: "normal" | "urgent" | "immediate";
  jobLength: "short_term" | "long_term";
  // Long-term only: the pay the employer offers and pays the worker directly (dollars as typed).
  payMin: string;
  payMax: string;
  payUnit: "hour" | "year";
  // Certificates the employer requires (short-term and long-term); "other" needs a description.
  requiredCertificates: readonly RequiredCertificateKey[];
  requiredCertificateOther: string;
  requestType: "single_day" | "multi_day" | "recurring_intent";
  timezone: string;
  // Local "YYYY-MM-DDTHH:MM" (browser time), built from the date + time pickers.
  startAt: string;
  endAt: string;
  repeatWeekdays: readonly number[];
  repeatUntil: string;
  // Allowance amounts are typed in dollars ("20.00") and converted to cents when saved.
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

function initialForm(): FormState {
  const startAt = defaultStart();
  return {
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
    jobLength: "short_term",
    payMin: "",
    payMax: "",
    payUnit: "hour",
    requiredCertificates: [],
    requiredCertificateOther: "",
    requestType: "single_day",
    timezone: "America/Toronto",
    startAt,
    endAt: addHoursLocal(startAt, DEFAULT_SHIFT_HOURS),
    repeatWeekdays: [],
    repeatUntil: "",
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
}

function toMinor(value: string): number | null {
  const minor = dollarsToMinor(value);
  return minor === null || Number.isNaN(minor) ? null : minor;
}

function allowancesPayload(form: FormState) {
  return {
    transport: { provision: form.transportProvision, amountMinor: toMinor(form.transportAmount), note: form.transportNote.trim() || null },
    meal: { provision: form.mealProvision, amountMinor: toMinor(form.mealAmount), note: form.mealNote.trim() || null },
    lodging: { provision: form.lodgingProvision, amountMinor: toMinor(form.lodgingAmount), note: form.lodgingNote.trim() || null }
  };
}

const EDITABLE_STATUSES = ["draft", "information_required"];

type Status =
  | "loading"
  | "editing"
  | "review"
  | "saving"
  | "draft"
  | "submitting"
  | "submitted"
  | "deleted"
  | "locked"
  | "denied"
  | "error";

export function CreatePersistedRequestPanel({ editRequestId = null }: Readonly<{ editRequestId?: string | null }>) {
  const t = useT();
  const locale = useLocale();
  const editMode = Boolean(editRequestId);
  const [context, setContext] = useState<EmployerRequestContext | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState(() => "");
  // Why the context was denied: "signin" (401, not authenticated) routes to /signin;
  // "org" (409, no employer org selected) routes back to the request calendar.
  const [deniedKind, setDeniedKind] = useState<"signin" | "org">("org");
  const [draft, setDraft] = useState<EmployerJobRequestDraft | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  // Choices reload after a location is picked. The form stays on screen (so nothing typed is lost);
  // only the dependent pickers are disabled until the new choices arrive.
  const [contextLoading, setContextLoading] = useState(false);
  const [endTouched, setEndTouched] = useState(false);
  const contextRequest = useRef(0);
  // The Site address the form filled in from the chosen Location (null when the employer typed their own).
  const filledAddress = useRef<string | null>(null);

  useEffect(() => {
    setMessage(editMode ? t("create.editLoading") : t("create.msgLoadingChoices"));
  }, []);

  async function fetchContext(residenceId: string): Promise<EmployerRequestContext | "signin" | "org" | null> {
    try {
      const contextUrl = new URL("/api/job-requests/context", window.location.origin);
      if (residenceId) contextUrl.searchParams.set("residenceId", residenceId);
      const response = await fetch(contextUrl.toString(), { cache: "no-store" });
      if (response.status === 401) return "signin";
      if (response.status === 409) return "org";
      if (!response.ok) return null;
      return (await response.json()) as EmployerRequestContext;
    } catch {
      return null;
    }
  }

  function deny(kind: "signin" | "org") {
    setDeniedKind(kind);
    setStatus("denied");
    setMessage(kind === "signin" ? t("create.msgSignInSelectOrg") : t("create.msgSelectOrgFirst"));
  }

  // First load: the page shows a loading card until the choices are ready.
  async function loadInitialContext(residenceId = "") {
    setStatus("loading");
    setMessage(t("create.msgLoadingChoices"));
    const result = await fetchContext(residenceId);
    if (result === "signin" || result === "org") return deny(result);
    if (!result) {
      setStatus("error");
      return setMessage(t("create.msgChoicesUnavailable"));
    }
    setContext(result);
    setStatus("editing");
    setMessage(t("create.msgCompleteFields"));
  }

  // Reload after a location is picked, keeping the form mounted and every value already chosen.
  async function reloadContext(residenceId: string) {
    const ticket = ++contextRequest.current;
    setContextLoading(true);
    setMessage(t("create.msgLoadingLocation"));
    const result = await fetchContext(residenceId);
    if (ticket !== contextRequest.current) return; // a newer pick is loading
    setContextLoading(false);
    if (result === "signin" || result === "org") return deny(result);
    if (!result) return setMessage(t("create.msgChoicesUnavailable"));
    setContext(result);
    // Drop only the picks the new choices no longer offer.
    setForm((current) => ({
      ...current,
      departmentId: result.departments.some((d) => d.id === current.departmentId && d.residenceId === current.residenceId) ? current.departmentId : "",
      workGroup: result.workGroups.some((g) => g.slug === current.workGroup) ? current.workGroup : "",
      roleDefinition: result.roleDefinitions.some((r) => r.slug === current.roleDefinition) ? current.roleDefinition : ""
    }));
    setMessage(t("create.msgCompleteFields"));
  }

  // Edit mode: open the saved draft in this same form, pre-filled.
  async function loadDraftForEdit(id: string) {
    setStatus("loading");
    setMessage(t("create.editLoading"));
    try {
      const response = await fetch(`/api/job-requests/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (response.status === 401) return deny("signin");
      if (response.status === 409) return deny("org");
      if (!response.ok) {
        setStatus("error");
        return setMessage(t("create.editUnavailable"));
      }
      const { jobRequest } = (await response.json()) as { jobRequest: EmployerJobRequestDraft };
      setDraft(jobRequest);
      if (!EDITABLE_STATUSES.includes(jobRequest.status)) {
        setStatus("locked");
        return setMessage(t("create.editLockedMsg"));
      }
      const profile = await fetch(`/api/calendar/requests/${encodeURIComponent(jobRequest.id)}`, { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<{ request?: Record<string, unknown> }>) : null))
        .catch(() => null);
      const edit = jobRequest.edit;
      const loaded = await fetchContext(edit?.residenceId ?? "");
      if (loaded === "signin" || loaded === "org") return deny(loaded);
      if (!loaded) {
        setStatus("error");
        return setMessage(t("create.msgChoicesUnavailable"));
      }
      setContext(loaded);
      const filled = formFromDraft(jobRequest, loaded, profile?.request ?? null);
      const locationAddress = loaded.residences.find((r) => r.id === filled.residenceId)?.address ?? null;
      if (!filled.addressSummary && locationAddress) filledAddress.current = locationAddress;
      setForm(filled.addressSummary ? filled : { ...filled, addressSummary: locationAddress ?? "" });
      setEndTouched(true);
      setStatus("editing");
      setMessage(t("create.msgCompleteFields"));
    } catch {
      setStatus("error");
      setMessage(t("create.editUnavailable"));
    }
  }

  function retryLoad() {
    if (editRequestId) return void loadDraftForEdit(editRequestId);
    return void loadInitialContext(form.residenceId);
  }

  useEffect(() => {
    if (editRequestId) void loadDraftForEdit(editRequestId);
    else void loadInitialContext();
  }, []);

  // Job length (short / long term) is only asked while employer plans are switched on; otherwise the
  // field is hidden and every job stays short term, exactly as today.
  const [plansEnabled, setPlansEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/employer-plan?only=status", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { enabled?: boolean } | null) => {
        if (active) setPlansEnabled(payload?.enabled === true);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  // Long-term job (flag on): a paid listing, no contract rate needed and no hourly cost shown.
  const longTerm = requestPricingGate({ plansEnabled, jobLength: form.jobLength, rateUnpriced: false }).longTerm;
  const selectedWorkGroup = context?.workGroups.find((item) => item.slug === form.workGroup);
  // Once the contract prices any role, only priced roles (and the groups holding them) can be requested
  // (short-term jobs; a long-term listing can be any role).
  const contractPricesRoles = !longTerm && Boolean(context?.roleDefinitions.some((role) => role.hourlyRateMinor !== null));
  const requestableWorkGroups = useMemo(
    () =>
      context?.workGroups.filter(
        (group) =>
          !contractPricesRoles ||
          context.roleDefinitions.some((role) => role.workGroupId === group.id && role.hourlyRateMinor !== null)
      ) ?? [],
    [context, contractPricesRoles]
  );
  const roles = useMemo(
    () =>
      context?.roleDefinitions.filter(
        (role) => role.workGroupId === selectedWorkGroup?.id && (!contractPricesRoles || role.hourlyRateMinor !== null)
      ) ?? [],
    [context, selectedWorkGroup, contractPricesRoles]
  );
  const departmentOptions = useMemo(
    () => context?.departments.filter((item) => item.residenceId === form.residenceId) ?? [],
    [context, form.residenceId]
  );

  // A list with only one choice is picked for the employer (common for a single site or role).
  useEffect(() => {
    if (!context || status !== "editing" || contextLoading) return;
    const onlyResidence = context.residences.length === 1 ? context.residences[0] : undefined;
    if (!form.residenceId && onlyResidence) {
      void selectResidence(onlyResidence.id);
      return;
    }
    setForm((current) => {
      let next = current;
      const onlyDepartment = departmentOptions.length === 1 ? departmentOptions[0] : undefined;
      if (current.residenceId && !current.departmentId && onlyDepartment) next = { ...next, departmentId: onlyDepartment.id };
      const onlyGroup = requestableWorkGroups.length === 1 ? requestableWorkGroups[0] : undefined;
      if (!current.workGroup && onlyGroup) next = { ...next, workGroup: onlyGroup.slug };
      const onlyRole = roles.length === 1 ? roles[0] : undefined;
      if (current.workGroup && !current.roleDefinition && onlyRole) next = { ...next, roleDefinition: onlyRole.slug };
      return next;
    });
  }, [context, status, contextLoading, form.residenceId, departmentOptions, requestableWorkGroups, roles]);

  const repeats = form.requestType === "recurring_intent";
  const shifts = repeats
    ? recurringShifts({ startAt: form.startAt, endAt: form.endAt, weekdays: form.repeatWeekdays, until: form.repeatUntil })
    : [];
  const validation = validate(form, t);
  const payOffered = longTerm ? formPayOffered(form) : null;
  if (longTerm && !payOffered) validation.push(t("create.payOfferedInvalid"));
  const requiredCertificates = parseRequiredCertificates(
    form.requiredCertificates,
    form.requiredCertificates.includes("other") ? form.requiredCertificateOther : undefined
  );
  if (!requiredCertificates) validation.push(t("create.requiredCertOtherInvalid"));
  if (repeats && (shifts.length === 0 || shifts.length > MAX_RECURRING_SHIFTS)) {
    validation.push(t("create.repeatInvalid", { max: MAX_RECURRING_SHIFTS }));
  }
  const selectedRole = roles.find((role) => role.slug === form.roleDefinition);
  // Switching back from Long term can leave an unpriced role chosen that short-term no longer offers.
  if (longTerm === false && plansEnabled && form.roleDefinition && context && !selectedRole) validation.push(t("create.role"));
  const rateCurrency: "CAD" | "USD" = selectedRole?.currency === "USD" ? "USD" : "CAD";
  const pricingGate = requestPricingGate({
    plansEnabled,
    jobLength: form.jobLength,
    rateUnpriced: Boolean(selectedRole && selectedRole.hourlyRateMinor === null)
  });
  const rateUnpriced = pricingGate.rateUnpriced;
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

  // A new start moves the end with it (start + 6 h) until the employer sets the end themselves, and
  // whenever the end would no longer come after the start.
  function updateStart(startAt: string) {
    setForm((current) => {
      const endBeforeStart = !current.endAt || new Date(current.endAt) <= new Date(startAt);
      return {
        ...current,
        startAt,
        endAt: !endTouched || endBeforeStart ? addHoursLocal(startAt, DEFAULT_SHIFT_HOURS) : current.endAt
      };
    });
    setMessage(t("create.msgCompleteFields"));
  }

  function updateEnd(endAt: string) {
    setEndTouched(true);
    update("endAt", endAt);
  }

  async function selectResidence(residenceId: string) {
    // Site address follows the Location right away (editable); an address the employer typed stays.
    const locationAddress = context?.residences.find((r) => r.id === residenceId)?.address ?? null;
    const next = prefillSiteAddress(form.addressSummary, filledAddress.current, locationAddress);
    filledAddress.current = next.filled;
    update("residenceId", residenceId);
    setForm((current) => ({ ...current, addressSummary: next.address }));
    if (residenceId) await reloadContext(residenceId);
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

  function certificatesBody() {
    return requiredCertificates && requiredCertificates.keys.length > 0
      ? { requiredCertificates: requiredCertificates.keys, ...(requiredCertificates.other ? { requiredCertificateOther: requiredCertificates.other } : {}) }
      : {};
  }

  function postRequest(times: ShiftTimes) {
    return fetch("/api/job-requests", {
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
        ...(plansEnabled ? { jobLength: form.jobLength } : {}),
        ...longTermRequestBody(plansEnabled, form.jobLength, form),
        ...certificatesBody(),
        // Each shift in a repeat is its own one-day job.
        requestType: repeats ? "single_day" : form.requestType,
        timezone: form.timezone,
        numberOfWorkers: Number(form.numberOfWorkers),
        startAt: localDateTimeToIso(times.startAt),
        endAt: localDateTimeToIso(times.endAt)
      })
    });
  }

  // Saving a draft that already exists updates it (every field of the form), using the draft version
  // the employer opened, so a change made elsewhere is never silently overwritten.
  function patchRequest(current: EmployerJobRequestDraft) {
    return fetch(`/api/job-requests/${encodeURIComponent(current.id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        expectedVersion: current.versionToken,
        residenceId: form.residenceId,
        departmentId: form.departmentId,
        workGroup: form.workGroup,
        roleDefinition: form.roleDefinition,
        title: form.title,
        description: form.description.trim() || null,
        numberOfWorkers: Number(form.numberOfWorkers),
        urgency: form.urgency,
        requestType: form.requestType === "multi_day" ? "multi_day" : "single_day",
        timezone: form.timezone,
        startAt: localDateTimeToIso(form.startAt),
        endAt: localDateTimeToIso(form.endAt),
        requiredCertificates: requiredCertificates?.keys ?? [],
        ...(requiredCertificates?.other ? { requiredCertificateOther: requiredCertificates.other } : {})
      })
    });
  }

  async function saveRequest(submitting = false): Promise<EmployerJobRequestDraft | null> {
    setStatus("saving");
    setMessage(submitting ? t("create.msgSubmitting") : t("create.msgSavingDraft"));
    try {
      const response = draft ? await patchRequest(draft) : await postRequest(form);
      if (!response.ok) {
        if (response.status === 401) setDeniedKind("signin");
        setStatus(response.status === 401 ? "denied" : "editing");
        setMessage(
          response.status === 409
            ? draft
              ? t("create.msgDraftChanged")
              : t("create.msgOrgChanged")
            : t("create.msgDraftNotSaved")
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

  // One click from the review step: save (create or update) the draft, then send it for review using
  // the freshly saved version (the optional profile save never blocks sending).
  async function saveAndSubmit() {
    if (repeats && !draft) return submitSeries();
    const saved = await saveRequest(true);
    if (saved) await submitDraft(saved);
  }

  // A repeat is one ordinary job per shift, sent to staff review one at a time. If one fails, the
  // ones already sent stand, so the employer is told exactly where it stopped.
  async function submitSeries() {
    setStatus("saving");
    let done = 0;
    let last: EmployerJobRequestDraft | null = null;
    for (const shift of shifts) {
      setMessage(t("create.seriesProgress", { done: done + 1, total: shifts.length }));
      try {
        const created = await postRequest(shift);
        if (!created.ok) break;
        const { jobRequest } = (await created.json()) as { jobRequest: EmployerJobRequestDraft };
        last = jobRequest;
        await saveProfile(jobRequest);
        const submitted = await fetch(`/api/job-requests/${encodeURIComponent(jobRequest.id)}/submit`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ expectedVersion: jobRequest.versionToken })
        });
        if (!submitted.ok) break;
        done += 1;
      } catch {
        break;
      }
    }
    if (last) setDraft(last);
    setStatus(done > 0 ? "submitted" : "review");
    if (done > 0) trackConversion("submit_request", { method: "employer_recurring" });
    setMessage(
      done === shifts.length
        ? t("create.seriesDone", { total: shifts.length })
        : t("create.seriesStopped", { done, total: shifts.length, date: shifts[done]?.startAt.slice(0, 10) ?? "" })
    );
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

  // Delete a draft that was never sent. Uses the existing employer cancel endpoint, which checks the
  // employer belongs to the organization that owns the request; a draft has no workers and no charge.
  async function deleteDraft() {
    if (!draft || draft.status !== "draft") return;
    if (!window.confirm(t("create.deleteDraftConfirm"))) return;
    const previous = status;
    setStatus("saving");
    setMessage(t("create.deleting"));
    try {
      const response = await fetch(`/api/job-requests/${encodeURIComponent(draft.id)}/cancel/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idempotencyKey: `cancel-${draft.id}-${crypto.randomUUID()}` })
      });
      if (!response.ok) {
        setStatus(previous);
        return setMessage(t("create.deleteFailed"));
      }
      setStatus("deleted");
      setMessage(t("create.deletedMsg", { num: draft.jobRequestNumber }));
    } catch {
      setStatus(previous);
      setMessage(t("create.deleteFailed"));
    }
  }

  if (status === "loading") {
    return <StateCard busy message={message} title={editMode ? t("create.editLoading") : t("create.statePreparing")} t={t} />;
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
  if (status === "deleted") {
    return <StateCard action="/employer/calendar" actionLabel={t("create.openCalendar")} message={message} title={t("create.deleted")} t={t} />;
  }
  if (status === "locked" && draft) {
    return (
      <StateCard
        action={`/employer/calendar/request?request=${encodeURIComponent(draft.jobRequestNumber)}`}
        actionLabel={t("create.openRequest")}
        message={message}
        title={t("create.editLocked")}
        t={t}
      />
    );
  }
  if (status === "error" || !context) {
    return (
      <StateCard
        message={message}
        onRetry={retryLoad}
        title={editMode ? t("create.editUnavailable") : t("create.stateSetupUnavailable")}
        t={t}
      />
    );
  }
  if (!context.residences.length || !context.workGroups.length) {
    return <StateCard message={t("create.stateSetupIncompleteMsg")} title={t("create.stateSetupIncomplete")} t={t} />;
  }

  // Sent for review: the form is replaced by a confirmation so it cannot be sent twice by accident.
  const confirmation = submittedConfirmation({ status, draft, form, shiftCount: repeats ? shifts.length : 1 });
  if (confirmation) {
    return (
      <SubmittedView confirmation={confirmation} locale={locale} message={message} t={t}>
        {plansEnabled && form.jobLength === "long_term" && draft ? <LongTermListingsPanel onlyJobRequestId={draft.id} /> : null}
      </SubmittedView>
    );
  }

  const editing = status === "editing";
  const succeeded = status === "draft";
  const actionNotice = requestActionNotice({ editing, message, rateUnpriced, missingFields: validation.filter((field) => field !== undefined), t });
  // One shift over 16 h usually means the wrong end day or time (a multi-day request spans days on purpose).
  const longShift = form.requestType !== "multi_day" && isLongShift(scheduledHours);
  // A saved draft can't become a repeat (each repeated shift is its own request).
  const requestTypeOptions = [
    { label: t("create.typeSingle"), value: "single_day" },
    { label: t("create.typeMulti"), value: "multi_day" },
    ...(draft ? [] : [{ label: t("create.typeRecurring"), value: "recurring_intent" }])
  ];
  const subtotalMinor =
    selectedRole && selectedRole.hourlyRateMinor !== null && scheduledHours > 0
      ? estimateRequestCost({
          hourlyRate: { amountMinor: selectedRole.hourlyRateMinor, currency: rateCurrency },
          hours: repeats && shifts.length > 1 ? scheduledHours * shifts.length : scheduledHours,
          workers: workerCount
        }).amountMinor
      : null;
  const taxes = subtotalMinor !== null ? estimateTaxLines(subtotalMinor) : null;
  const money = (amountMinor: number) => formatMoney({ amountMinor, currency: rateCurrency });
  const hoursLabel = Number.isInteger(scheduledHours) ? String(scheduledHours) : scheduledHours.toFixed(2);

  return (
    <form aria-busy={status === "saving" || status === "submitting"} onSubmit={prepareReview}>
      {draft && editMode ? <p style={styles.eyebrowDark}>{t("create.editEyebrow", { num: draft.jobRequestNumber })}</p> : null}
      {draft?.informationRequestReason ? (
        <p style={styles.warning}>{t("create.infoRequested", { reason: draft.informationRequestReason })}</p>
      ) : null}
      {succeeded ? (
        <SuccessBanner message={message} t={t} />
      ) : (
        <div aria-live="polite" role="status" style={styles.warning}>
          {message}
        </div>
      )}
      {editing ? <DictationPrivacyNote /> : null}
      <div style={{ ...styles.formGrid, marginTop: 12 }}>
        <SelectField disabled={!editing || contextLoading} label={t("create.residence")} onChange={(v) => void selectResidence(v)} options={context.residences.map((i) => ({ label: i.name, value: i.id }))} value={form.residenceId} t={t} />
        <SelectField disabled={!editing || contextLoading || !form.residenceId} label={t("create.department")} onChange={(v) => update("departmentId", v)} options={departmentOptions.map((i) => ({ label: i.name, value: i.id }))} value={form.departmentId} t={t} />
        <SelectField disabled={!editing || contextLoading} label={t("create.workGroup")} onChange={(v) => update("workGroup", v)} options={requestableWorkGroups.map((i) => ({ label: i.displayLabel, value: i.slug }))} value={form.workGroup} t={t} />
        <div style={{ display: "grid", gap: 6, alignContent: "start" }}>
          <SelectField disabled={!editing || contextLoading || !form.workGroup} label={t("create.role")} onChange={(v) => update("roleDefinition", v)} options={roles.map((i) => ({ label: i.displayLabel, value: i.slug }))} value={form.roleDefinition} t={t} />
          {longTerm ? null : (
            <p style={{ ...styles.cardText, margin: 0 }}>
              {t("create.roleMissingHint")}{" "}
              <a href="/employer/contact-joblop" style={{ color: "inherit", textDecoration: "underline" }}>{t("create.roleMissingLink")}</a>
            </p>
          )}
        </div>
        <TextField dictation={editing} disabled={!editing} hint={t("create.titleHint")} label={t("create.title")} maxLength={160} onChange={(v) => update("title", v)} placeholder={t("create.titlePlaceholder")} value={form.title} />
        <TextField disabled={!editing} label={t("create.workersRequired")} min="1" onChange={(v) => update("numberOfWorkers", v)} type="number" value={form.numberOfWorkers} />
        <DateTimeField dateLabel={t("create.startDate")} disabled={!editing} locale={locale} minDate={editMode ? undefined : toLocalDateTime(new Date()).slice(0, 10)} onChange={updateStart} timeLabel={t("create.startTime")} value={form.startAt} />
        <div style={{ display: "grid", gap: 6, alignContent: "start" }}>
          <DateTimeField dateLabel={t("create.endDate")} disabled={!editing} locale={locale} minDate={splitDateTime(form.startAt).date || undefined} onChange={updateEnd} timeLabel={t("create.endTime")} value={form.endAt} />
          {endTouched ? null : <p style={{ ...styles.cardText, margin: 0 }}>{t("create.endDefaultHint")}</p>}
        </div>
        <div style={{ gridColumn: "1 / -1" }} aria-live="polite">
          {form.startAt && form.endAt && new Date(form.endAt) > new Date(form.startAt) && !meetsMinimumShiftDuration(form.startAt, form.endAt) ? (
            <div style={styles.warning} role="alert">
              {t("create.minShiftMsg")} {t("create.minShiftWarn", { hours: scheduledHours.toFixed(1), min: MINIMUM_SHIFT_HOURS })}
            </div>
          ) : longShift ? (
            <div style={styles.warning} role="alert">{t("create.longShiftWarn", { hours: hoursLabel })}</div>
          ) : longTerm ? null : (
            <p style={styles.cardText}>{t("create.minShiftMsg")}</p>
          )}
        </div>
        <SelectField disabled={!editing} label={t("create.urgency")} onChange={(v) => update("urgency", v as FormState["urgency"])} options={[{ label: t("create.urgencyNormal"), value: "normal" }, { label: t("create.urgencyUrgent"), value: "urgent" }, { label: t("create.urgencyImmediate"), value: "immediate" }]} value={form.urgency} t={t} />
        {plansEnabled && !draft ? (
          <div>
            <SelectField disabled={!editing} label={t("create.jobLength")} onChange={(v) => update("jobLength", v === "long_term" ? "long_term" : "short_term")} options={[{ label: t("create.jobLengthShort"), value: "short_term" }, { label: t("create.jobLengthLong"), value: "long_term" }]} value={form.jobLength} t={t} />
            <p style={styles.cardText}>
              {form.jobLength === "long_term" ? t("create.jobLengthHintLong") : t("create.jobLengthHintShort")}{" "}
              <a href="/plans" style={styles.inlineLink}>{t("create.jobLengthSeePlans")}</a>
            </p>
          </div>
        ) : null}
        {longTerm ? (
          <fieldset disabled={!editing} style={{ ...styles.tintedCard, border: 0, gridColumn: "1 / -1", margin: 0 }}>
            <legend style={styles.fieldLabel}>{t("create.payOffered")}</legend>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
              <label style={{ ...styles.fieldLabel, maxWidth: 180 }}>
                {t("create.payOfferedMin")}
                <input inputMode="decimal" onChange={(e) => update("payMin", e.target.value)} required style={styles.input} value={form.payMin} />
              </label>
              <label style={{ ...styles.fieldLabel, maxWidth: 180 }}>
                {t("create.payOfferedMax")}
                <input inputMode="decimal" onChange={(e) => update("payMax", e.target.value)} style={styles.input} value={form.payMax} />
              </label>
              <label style={{ ...styles.fieldLabel, maxWidth: 180 }}>
                {t("create.payOfferedUnit")}
                <select onChange={(e) => update("payUnit", e.target.value === "year" ? "year" : "hour")} style={styles.input} value={form.payUnit}>
                  <option value="hour">{t("create.payOfferedPerHour")}</option>
                  <option value="year">{t("create.payOfferedPerYear")}</option>
                </select>
              </label>
            </div>
            <p style={styles.cardText}>{t("create.payOfferedHint")}</p>
            {payOffered ? <p style={styles.cardText}><strong>{t("create.payOfferedPreview", { pay: formatPayOffered(payOffered, locale) })}</strong></p> : null}
          </fieldset>
        ) : null}
        <fieldset disabled={!editing} style={{ ...styles.tintedCard, border: 0, gridColumn: "1 / -1", margin: 0 }}>
          <legend style={styles.fieldLabel}>{t("create.requiredCerts")}</legend>
          {/* An even grid: 3 columns on wide screens, 2 on tablets, 1 on phones (see globals.css). */}
          <div className="employer-cert-grid" style={{ marginTop: 8 }}>
            {REQUIRED_CERTIFICATE_KEYS.map((key) => (
              <label key={key} style={{ alignItems: "center", display: "flex", gap: 8, minWidth: 0 }}>
                <input
                  checked={form.requiredCertificates.includes(key)}
                  onChange={(event) =>
                    update(
                      "requiredCertificates",
                      event.target.checked ? [...form.requiredCertificates, key] : form.requiredCertificates.filter((k) => k !== key)
                    )
                  }
                  style={{ flexShrink: 0, margin: 0 }}
                  type="checkbox"
                />
                <span style={{ overflowWrap: "anywhere" }}>{certificateLabel(key, locale)}</span>
              </label>
            ))}
          </div>
          {form.requiredCertificates.includes("other") ? (
            <label style={{ ...styles.fieldLabel, marginTop: 8 }}>
              {t("create.requiredCertOther")}
              <input maxLength={120} onChange={(e) => update("requiredCertificateOther", e.target.value)} required style={styles.input} value={form.requiredCertificateOther} />
            </label>
          ) : null}
          <p style={styles.cardText}>{t("create.requiredCertsHint")}</p>
        </fieldset>
        <SelectField disabled={!editing} label={t("create.requestType")} onChange={(v) => update("requestType", v as FormState["requestType"])} options={requestTypeOptions} value={form.requestType} t={t} />
        {repeats ? (
          <fieldset disabled={!editing} style={{ ...styles.tintedCard, border: 0, gridColumn: "1 / -1", margin: 0 }}>
            <legend style={styles.fieldLabel}>{t("create.repeatOn")}</legend>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
              {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                <label key={day} style={{ alignItems: "center", display: "flex", gap: 6 }}>
                  <input
                    checked={form.repeatWeekdays.includes(day)}
                    onChange={(event) =>
                      update(
                        "repeatWeekdays",
                        event.target.checked ? [...form.repeatWeekdays, day] : form.repeatWeekdays.filter((d) => d !== day)
                      )
                    }
                    type="checkbox"
                  />
                  <span style={styles.cardText}>
                    {new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "short" }).format(new Date(Date.UTC(2026, 10, 1 + day)))}
                  </span>
                </label>
              ))}
            </div>
            <label style={{ ...styles.fieldLabel, marginTop: 12, maxWidth: 260 }}>
              {t("create.repeatUntil")}
              <input min={form.startAt.slice(0, 10)} onChange={(event) => update("repeatUntil", event.target.value)} style={styles.input} type="date" value={form.repeatUntil} />
            </label>
            <p style={styles.cardText}>
              {shifts.length > 0 && shifts.length <= MAX_RECURRING_SHIFTS
                ? t("create.repeatCount", { count: shifts.length })
                : t("create.repeatHelp", { max: MAX_RECURRING_SHIFTS })}
            </p>
          </fieldset>
        ) : null}
        {/* Québec jobs are always on Eastern time, so the time zone is shown, not asked. */}
        <div style={styles.fieldLabel}>
          {t("create.timezone")}
          <span style={{ ...styles.cardText, fontWeight: 400 }}>{t("create.timezoneEastern")}</span>
        </div>
        <TextField disabled={!editing} label={t("create.siteAddress")} maxLength={500} onChange={(v) => update("addressSummary", v)} value={form.addressSummary} />
        <label style={styles.fieldLabel}>
          {t("create.description")}
          <textarea disabled={!editing} maxLength={2000} onChange={(e) => update("description", e.target.value)} rows={4} style={styles.input} value={form.description} />
          {editing ? <DictationButton maxLength={2000} onText={(v) => update("description", v)} value={form.description} /> : null}
        </label>
        <label style={styles.fieldLabel}>
          {t("create.duties")}
          <textarea disabled={!editing} maxLength={2000} onChange={(e) => update("dutiesSummary", e.target.value)} rows={4} style={styles.input} value={form.dutiesSummary} />
          {editing ? <DictationButton maxLength={2000} onText={(v) => update("dutiesSummary", v)} value={form.dutiesSummary} /> : null}
          <span style={styles.cardText}>{t("create.dutiesScopeNote")}</span>
        </label>
        <label style={styles.fieldLabel}>
          {t("create.safety")}
          <textarea disabled={!editing} maxLength={2000} onChange={(e) => update("specialInstructions", e.target.value)} rows={4} style={styles.input} value={form.specialInstructions} />
          {editing ? <DictationButton maxLength={2000} onText={(v) => update("specialInstructions", v)} value={form.specialInstructions} /> : null}
          <span style={styles.cardText}>{t("create.safetyNote")}</span>
        </label>
      </div>

      <section style={{ marginTop: 24 }}>
        <p style={styles.metaLabel}>{t("create.allowancesTitle")}</p>
        <p style={styles.cardText}>{t("create.allowancesNote")}</p>
        <div style={{ ...styles.formGrid, gap: 18, marginTop: 12 }}>
          <AllowanceFields label={t("create.allowanceTransport")} disabled={!editing} provision={form.transportProvision} amount={form.transportAmount} note={form.transportNote} onProvision={(v) => update("transportProvision", v)} onAmount={(v) => update("transportAmount", v)} onNote={(v) => update("transportNote", v)} t={t} />
          <AllowanceFields label={t("create.allowanceMeal")} disabled={!editing} provision={form.mealProvision} amount={form.mealAmount} note={form.mealNote} onProvision={(v) => update("mealProvision", v)} onAmount={(v) => update("mealAmount", v)} onNote={(v) => update("mealNote", v)} t={t} />
          <AllowanceFields label={t("create.allowanceLodging")} disabled={!editing} provision={form.lodgingProvision} amount={form.lodgingAmount} note={form.lodgingNote} onProvision={(v) => update("lodgingProvision", v)} onAmount={(v) => update("lodgingAmount", v)} onNote={(v) => update("lodgingNote", v)} t={t} />
        </div>
      </section>

      {longTerm ? (
        <div style={{ ...styles.tintedCard, marginTop: 18 }}>{t("create.longTermNoHourlyCost")}</div>
      ) : null}
      {selectedRole && pricingGate.showHourlyCost ? (
        <div style={{ marginTop: 18 }}>
          <p style={styles.metaLabel}>{t("create.rateYouPay")}</p>
          {selectedRole.hourlyRateMinor !== null ? (
            <div style={{ ...styles.tintedCard, display: "grid", gap: 8 }}>
              <PriceRow label={t("create.pricePerHour")} value={formatHourlyRate({ amountMinor: selectedRole.hourlyRateMinor, currency: rateCurrency })} />
              {taxes ? (
                <>
                  <PriceRow
                    label={t("create.priceBeforeTax")}
                    detail={
                      repeats && shifts.length > 1
                        ? t("create.priceDetailSeries", { hours: hoursLabel, workers: workerCount, count: shifts.length })
                        : t("create.priceDetail", { hours: hoursLabel, workers: workerCount })
                    }
                    value={money(taxes.subtotalMinor)}
                  />
                  <PriceRow label={t("create.priceGst")} value={money(taxes.gstMinor)} />
                  <PriceRow label={t("create.priceQst")} value={money(taxes.qstMinor)} />
                  <PriceRow bold label={t("create.priceTotal")} value={money(taxes.totalMinor)} />
                </>
              ) : null}
              <p style={{ ...styles.cardText, margin: 0 }}>{t("create.priceMinimum")}</p>
              <p style={{ ...styles.cardText, margin: 0 }}>{t("create.rateFromContract")}</p>
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

      <AgreementClauses longTerm={longTerm} t={t} />
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

      {status === "review" ? <RequestReview form={form} locale={locale} payOfferedLabel={payOffered ? formatPayOffered(payOffered, locale) : null} requiredCertificatesLabel={requiredCertificates && requiredCertificates.keys.length > 0 ? requiredCertificates.keys.map((key) => certificateLabel(key, locale, requiredCertificates.other)).join(", ") : t("create.requiredCertsNone")} roleLabel={selectedRole?.displayLabel ?? form.roleDefinition} shiftCount={shifts.length} t={t} /> : null}
      {longTerm ? null : <p style={styles.cardText}>{t("create.economicsNote")}</p>}
      {succeeded ? (
        <div style={{ marginTop: 18 }}>
          <SuccessBanner message={message} t={t} />
        </div>
      ) : actionNotice ? (
        <div style={{ ...styles.warning, marginTop: 18 }}>{actionNotice}</div>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
        {status === "editing" ? (
          <button disabled={validation.length > 0 || rateUnpriced || contextLoading} style={validation.length || rateUnpriced || contextLoading ? styles.disabledAction : styles.primaryButton} type="submit">{t("create.reviewRequest")}</button>
        ) : null}
        {status === "review" ? (
          <>
            <button disabled={!agreementAccepted} onClick={() => void saveAndSubmit()} style={agreementAccepted ? styles.primaryButton : styles.disabledAction} type="button">{t("create.submitForReview")}</button>
            {repeats && !draft ? null : (
              <button onClick={() => void saveRequest()} style={styles.secondaryButton} type="button">{t("create.saveDraft")}</button>
            )}
            <button onClick={() => { setStatus("editing"); setMessage(t("create.msgUpdateThenReview")); }} style={styles.secondaryButton} type="button">{t("create.backToEdit")}</button>
          </>
        ) : null}
        {status === "draft" ? (
          <>
            <button disabled={!agreementAccepted} onClick={() => void submitDraft()} style={agreementAccepted ? styles.primaryButton : styles.disabledAction} type="button">{t("create.submitForReview")}</button>
            <button onClick={() => { setStatus("editing"); setMessage(t("create.msgUpdateThenReview")); }} style={styles.secondaryButton} type="button">{t("create.changeDetails")}</button>
          </>
        ) : null}
        {status === "draft" && !profileSaved ? (
          <button onClick={() => void retryProfile()} style={styles.secondaryButton} type="button">{t("create.retryDetails")}</button>
        ) : null}
        {draft && status === "draft" ? (
          <a href={`/employer/calendar/request?request=${encodeURIComponent(draft.jobRequestNumber)}`} style={styles.secondaryButton}>{t("create.openRequest")}</a>
        ) : null}
        {draft && draft.status === "draft" && (status === "editing" || status === "draft" || status === "review") ? (
          <button onClick={() => void deleteDraft()} style={styles.secondaryButton} type="button">{t("create.deleteDraft")}</button>
        ) : null}
        <a href="/employer/calendar" style={styles.secondaryButton}>{t("create.backToCalendar")}</a>
      </div>
    </form>
  );
}

// Fills the form from a saved draft. Ids from the API are mapped back to the pickers' choices; a value
// the current choices no longer offer is left empty so the employer picks again.
function formFromDraft(
  request: EmployerJobRequestDraft,
  context: EmployerRequestContext,
  profile: Record<string, unknown> | null
): FormState {
  const edit = request.edit;
  const workGroup = context.workGroups.find((group) => group.id === edit?.workGroupId)?.slug ?? "";
  const roleDefinition = context.roleDefinitions.find((role) => role.roleDefinitionId === edit?.roleDefinitionId)?.slug ?? "";
  const residenceId = context.residences.some((r) => r.id === edit?.residenceId) ? (edit?.residenceId ?? "") : "";
  const departmentId = context.departments.some((d) => d.id === edit?.departmentId && d.residenceId === residenceId) ? (edit?.departmentId ?? "") : "";
  const certificates = (edit?.requiredCertificates ?? []).filter(isRequiredCertificateKey);
  const text = (key: string) => (typeof profile?.[key] === "string" ? (profile[key] as string) : "");
  const qualifications = Array.isArray(profile?.qualifications)
    ? (profile.qualifications as unknown[]).filter((q): q is string => typeof q === "string").join(", ")
    : "";
  const allowance = edit?.allowances;
  const startAt = localFromIso(request.startAt);
  const endAt = localFromIso(request.endAt);
  return {
    ...initialForm(),
    residenceId,
    departmentId,
    workGroup,
    roleDefinition,
    title: request.title,
    description: request.description ?? "",
    dutiesSummary: text("dutiesSummary"),
    qualifications,
    addressSummary: text("addressSummary"),
    specialInstructions: text("specialInstructions"),
    numberOfWorkers: String(request.numberOfWorkers),
    urgency: request.urgency,
    requiredCertificates: certificates,
    requiredCertificateOther: edit?.requiredCertificateOther ?? "",
    requestType: request.requestType === "multi_day" ? "multi_day" : "single_day",
    timezone: request.timezone || "America/Toronto",
    startAt,
    endAt,
    transportProvision: allowance?.transport.provision ?? "none",
    transportAmount: minorToDollars(allowance?.transport.amountMinor),
    transportNote: allowance?.transport.note ?? "",
    mealProvision: allowance?.meal.provision ?? "none",
    mealAmount: minorToDollars(allowance?.meal.amountMinor),
    mealNote: allowance?.meal.note ?? "",
    lodgingProvision: allowance?.lodging.provision ?? "none",
    lodgingAmount: minorToDollars(allowance?.lodging.amountMinor),
    lodgingNote: allowance?.lodging.note ?? ""
  };
}

function localFromIso(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : toLocalDateTime(date);
}

function SuccessBanner({ message, t }: Readonly<{ message: string; t: Translate }>) {
  return (
    <div aria-live="polite" role="status" style={successBanner}>
      <span>✓ {message}</span>{" "}
      <a href="/employer/calendar" style={{ color: "inherit", textDecoration: "underline", whiteSpace: "nowrap" }}>{t("create.openCalendar")}</a>
    </div>
  );
}

// Shown instead of the form once the request is sent for review. A long-term job's publish step
// (trial / card / e-transfer) comes in as children.
function SubmittedView({ children, confirmation, locale, message, t }: Readonly<{ children?: React.ReactNode; confirmation: SubmittedConfirmation; locale: Parameters<typeof fmtLocale>[0]; message: string; t: Translate }>) {
  const when = (local: string, options: Intl.DateTimeFormatOptions) => {
    const date = new Date(local);
    return Number.isNaN(date.getTime()) ? local : new Intl.DateTimeFormat(fmtLocale(locale), options).format(date);
  };
  const rows: readonly (readonly [string, string])[] = [
    ...(confirmation.requestNumber ? [[t("create.sentNumber"), confirmation.requestNumber] as const] : []),
    [t("create.title"), confirmation.title],
    [
      t("create.reviewSchedule"),
      t("create.scheduleValue", {
        start: when(confirmation.startAt, { dateStyle: "medium", timeStyle: "short" }),
        end: when(confirmation.endAt, { dateStyle: "medium", timeStyle: "short" }),
        tz: t("create.timezoneEastern")
      })
    ],
    ...(confirmation.shiftCount > 1 ? [[t("create.requestType"), t("create.repeatCount", { count: confirmation.shiftCount })] as const] : []),
    [t("create.workersRequired"), String(confirmation.workers)],
    ...(confirmation.address ? [[t("create.siteAddress"), confirmation.address] as const] : [])
  ];
  return (
    <section aria-labelledby="request-sent-title" style={styles.panel}>
      <div aria-live="polite" role="status" style={successBanner}>✓ {message}</div>
      <h2 id="request-sent-title" style={styles.sectionTitle}>{t("create.sentTitle")}</h2>
      <p style={{ ...styles.cardText, margin: 0 }}>{t("create.sentBody")}</p>
      <dl style={{ ...styles.cardGrid, margin: 0 }}>
        {rows.map(([label, value]) => (
          <div key={label} style={styles.tintedCard}>
            <dt style={styles.metaLabel}>{label}</dt>
            <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{value}</dd>
          </div>
        ))}
      </dl>
      {children}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {confirmation.openRequestHref ? <a href={confirmation.openRequestHref} style={styles.primaryButton}>{t("create.openRequest")}</a> : null}
        <a href={confirmation.requestMoreHref} style={styles.secondaryButton}>{t("create.requestMore")}</a>
        <a href={confirmation.backToCalendarHref} style={styles.secondaryButton}>{t("create.backToCalendar")}</a>
      </div>
    </section>
  );
}

function PriceRow({ bold = false, detail, label, value }: Readonly<{ bold?: boolean; detail?: string; label: string; value: string }>) {
  return (
    <div style={{ alignItems: "baseline", display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
      <span style={{ ...styles.cardText, margin: 0, fontWeight: bold ? 800 : 400 }}>
        {label}
        {detail ? <span style={{ fontSize: 12 }}> · {detail}</span> : null}
      </span>
      <span style={{ fontWeight: bold ? 900 : 700 }}>{value}</span>
    </div>
  );
}

function DateTimeField({
  dateLabel, disabled, locale, minDate, onChange, timeLabel, value
}: Readonly<{
  dateLabel: string; disabled: boolean; locale: string; minDate?: string | undefined; onChange: (local: string) => void; timeLabel: string; value: string;
}>) {
  const { date, time } = splitDateTime(value);
  const shownTime = snapToQuarterHour(time);
  const fallbackDate = splitDateTime(defaultStart()).date;
  return (
    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)" }}>
      <label style={styles.fieldLabel}>
        {dateLabel}
        <input disabled={disabled} min={minDate} onChange={(e) => onChange(combineDateTime(e.target.value, shownTime || "08:00"))} required style={{ ...styles.input, ...fillCell }} type="date" value={date} />
      </label>
      <label style={styles.fieldLabel}>
        {timeLabel}
        <select disabled={disabled} onChange={(e) => onChange(combineDateTime(date || fallbackDate, e.target.value))} required style={{ ...styles.input, ...fillCell }} value={shownTime}>
          {shownTime ? null : <option value="">—</option>}
          {TIME_OPTIONS.map((option) => (
            <option key={option} value={option}>{timeOptionLabel(option, locale)}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

function AllowanceFields({
  label, disabled, provision, amount, note, onProvision, onAmount, onNote, t
}: {
  label: string; disabled: boolean; provision: Provision; amount: string; note: string;
  onProvision: (v: Provision) => void; onAmount: (v: string) => void; onNote: (v: string) => void; t: Translate;
}) {
  const missing = allowanceAmountMissing(provision, amount);
  return (
    <div style={{ ...styles.tintedCard, display: "grid", gap: 14, alignContent: "start" }}>
      <p style={{ ...styles.metaLabel, margin: 0 }}>{label}</p>
      <label style={styles.fieldLabel}>
        <select aria-label={label} disabled={disabled} onChange={(e) => onProvision(e.target.value as Provision)} style={styles.input} value={provision}>
          <option value="none">{t("create.provisionNone")}</option>
          <option value="provided">{t("create.provisionProvided")}</option>
          <option value="allowance">{t("create.provisionAllowance")}</option>
        </select>
      </label>
      {provision === "allowance" ? (
        <label style={{ ...styles.fieldLabel, gap: 8 }}>
          {t("create.allowanceAmount")}
          <span style={{ alignItems: "center", display: "flex", gap: 8 }}>
            <span aria-hidden="true" style={{ fontWeight: 900 }}>$</span>
            <input
              aria-invalid={missing}
              disabled={disabled}
              inputMode="decimal"
              onChange={(e) => onAmount(e.target.value)}
              placeholder="20.00"
              required
              style={{ ...styles.input, flex: 1, minWidth: 0 }}
              value={amount}
            />
          </span>
          <span style={{ ...styles.cardText, fontSize: 12, fontWeight: 400 }}>{t("create.allowanceAmountHint")}</span>
        </label>
      ) : null}
      {provision !== "none" ? (
        <label style={{ ...styles.fieldLabel, gap: 8 }}>
          {t("create.allowanceNoteField")}
          <input disabled={disabled} maxLength={500} onChange={(e) => onNote(e.target.value)} style={styles.input} value={note} />
        </label>
      ) : null}
    </div>
  );
}

function AgreementClauses({ longTerm, t }: { longTerm: boolean; t: Translate }) {
  // Long-term job (paid listing): the employer hires and pays the worker directly, so the short-term
  // billing clauses (6-hour minimum, billable extra hours) do not apply and are replaced.
  const clauses = longTerm
    ? [
        t("create.clauseLongTermDirect"),
        t("create.clauseLongTermListing"),
        t("create.clauseScope"),
        t("create.clauseRespect"),
        t("create.clauseSafety")
      ]
    : [
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

function RequestReview({ form, locale, payOfferedLabel, requiredCertificatesLabel, roleLabel, shiftCount, t }: Readonly<{ form: FormState; locale: Parameters<typeof fmtLocale>[0]; payOfferedLabel: string | null; requiredCertificatesLabel: string; roleLabel: string; shiftCount: number; t: Translate }>) {
  const np = t("create.notProvided");
  const when = (local: string) => {
    const date = new Date(local);
    return Number.isNaN(date.getTime())
      ? local
      : new Intl.DateTimeFormat(fmtLocale(locale), { dateStyle: "medium", timeStyle: "short" }).format(date);
  };
  const typeLabel =
    form.requestType === "recurring_intent"
      ? t("create.repeatCount", { count: shiftCount })
      : form.requestType === "multi_day"
        ? t("create.typeMulti")
        : t("create.typeSingle");
  const urgencyLabel =
    form.urgency === "immediate" ? t("create.urgencyImmediate") : form.urgency === "urgent" ? t("create.urgencyUrgent") : t("create.urgencyNormal");
  const rows = [
    ...(payOfferedLabel ? ([[t("create.payOffered"), payOfferedLabel]] as const) : []),
    [t("create.title"), form.title],
    [t("create.requiredCerts"), requiredCertificatesLabel],
    [t("create.role"), roleLabel],
    [t("create.requestType"), typeLabel],
    [t("create.urgency"), urgencyLabel],
    [t("create.workersRequired"), form.numberOfWorkers],
    [t("create.reviewSchedule"), t("create.scheduleValue", { start: when(form.startAt), end: when(form.endAt), tz: t("create.timezoneEastern") })],
    [t("create.siteAddress"), form.addressSummary || np],
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
  // A cash allowance needs its amount (in dollars).
  const allowances: [string, Provision, string][] = [
    [t("create.allowanceTransport"), form.transportProvision, form.transportAmount],
    [t("create.allowanceMeal"), form.mealProvision, form.mealAmount],
    [t("create.allowanceLodging"), form.lodgingProvision, form.lodgingAmount]
  ];
  for (const [name, provision, amount] of allowances) {
    if (allowanceAmountMissing(provision, amount)) missing.push(t("create.allowanceAmountRequired", { name }));
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
  dictation = false, disabled, hint, label, maxLength, min, onChange, optional = false, placeholder, type = "text", value
}: {
  dictation?: boolean; disabled: boolean; hint?: string; label: string; maxLength?: number; min?: string;
  onChange: (value: string) => void; optional?: boolean; placeholder?: string; type?: string; value: string;
}) {
  return (
    <label style={styles.fieldLabel}>
      {label}
      <input disabled={disabled} maxLength={maxLength} min={min} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={!optional} style={styles.input} type={type} value={value} />
      {hint ? <span style={{ ...styles.cardText, fontSize: 13, fontWeight: 400 }}>{hint}</span> : null}
      {dictation ? <DictationButton maxLength={maxLength} onText={onChange} value={value} /> : null}
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

// A date or time box fills its own cell and never spills into the next one (the native date input has a
// wide intrinsic size that pushed it under the time box).
const fillCell: React.CSSProperties = { boxSizing: "border-box", minWidth: 0, width: "100%" };

const successBanner: React.CSSProperties = {
  background: "#0f2a17",
  border: "1px solid #22c55e",
  borderRadius: 8,
  color: "#dcfce7",
  fontSize: 14,
  fontWeight: 800,
  lineHeight: 1.5,
  padding: 14
};
