"use client";

import { ApplicantsPanel } from "./ApplicantsPanel";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildCalendarExport,
  calendarFailureState,
  certificateLabel,
  formatRwosDateTime,
  isRequiredCertificateKey,
  parseClientCalendarDto,
  type AuthenticatedViewState,
  type ClientCalendarDto
} from "@rwos/shared";
import { styles } from "../../employerStyles";
import { JobLocationMap } from "../../../shared/maps";
import { fmtLocale, useLocale, useT, type Translate } from "../../../i18n/LocaleProvider";
import type { MessageKey } from "../../../i18n/messages";
import { RequestStatusChip } from "../../RequestStatusChip";
import { isClosedPhase, requestPhase } from "../../requestStatus";
import { AddWorkersPanel } from "./AddWorkersPanel";
import { BonusOfferPanel } from "./BonusOfferPanel";
import { CancelRequestPanel } from "./CancelRequestPanel";
import { EditRequestPanel } from "./EditRequestPanel";
import { DuplicateRequestButton } from "./DuplicateRequestButton";
import { ReduceWorkersPanel } from "./ReduceWorkersPanel";
import { requestCertificates } from "./requestDetailText";
import { breakRuleLabel, dressCodeLabel } from "@rwos/shared";
import { parseShiftConditions, type EmployerShiftConditions } from "../../../api/job-requests/jobRequestBoundary";
import { langOf } from "../../../i18n/localText";

// The employer's view of one request: where it stands, the shift, and what they can do next. Shows only
// what the employer agreed to (their own request and its status); never worker pay or Joblop's margin.
export function ClientRequestDetailPanel({ requestId }: Readonly<{ requestId: string | null }>) {
  const t = useT();
  const locale = useLocale();
  const [state, setState] = useState<AuthenticatedViewState<ClientCalendarDto>>({
    status: "loading"
  });
  const [organizationRequired, setOrganizationRequired] = useState(false);
  // The certificates chosen on the request form (best effort; the page works without them).
  const [chosenCertificates, setChosenCertificates] = useState<readonly string[] | null>(null);
  // The employer's own shift conditions (break, dress code, equipment, arrival, notes for workers).
  const [conditions, setConditions] = useState<EmployerShiftConditions | null>(null);
  // Set once a cancel succeeds on this page: the badge then reads "Cancelled" and the cancel result
  // stays on screen, even before the refreshed record arrives.
  const [cancelledHere, setCancelledHere] = useState(false);
  const requestGeneration = useRef(0);
  // quiet: refresh in place (after a cancel) without switching the page to the loading message.
  const load = useCallback(async (quiet = false) => {
    if (!requestId) return;
    const generation = ++requestGeneration.current;
    if (!quiet) {
      setOrganizationRequired(false);
      setState({ status: "loading" });
    }
    try {
      const response = await fetch(`/api/calendar/requests/${encodeURIComponent(requestId)}`, {
        cache: "no-store"
      });
      if (generation !== requestGeneration.current) return;
      // A quiet refresh only ever updates the record; on any problem the page keeps what it shows.
      if (quiet && !response.ok) return;
      if (response.status === 409) {
        const payload = await response.json().catch(() => null);
        if (
          typeof payload === "object" &&
          payload !== null &&
          "status" in payload &&
          payload.status === "organization_required"
        ) {
          setOrganizationRequired(true);
          return setState({ status: "stale" });
        }
      }
      if (!response.ok) return setState(calendarFailureState(response.status));
      const payload = (await response.json()) as { request?: unknown };
      if (generation !== requestGeneration.current) return;
      const request = parseClientCalendarDto(payload.request);
      setState({ status: "ready", data: request });
      const jobRequest = await fetch(`/api/job-requests/${encodeURIComponent(request.id)}`, { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<{ jobRequest?: { edit?: { requiredCertificates?: unknown; conditions?: unknown } } }>) : null))
        .catch(() => null);
      if (generation !== requestGeneration.current) return;
      const keys = jobRequest?.jobRequest?.edit?.requiredCertificates;
      setChosenCertificates(Array.isArray(keys) ? keys.filter((key): key is string => typeof key === "string") : null);
      setConditions(parseShiftConditions(jobRequest?.jobRequest?.edit?.conditions));
    } catch {
      if (generation !== requestGeneration.current || quiet) return;
      setState({ status: "error" });
    }
  }, [requestId]);
  useEffect(() => {
    void load();
    return () => {
      requestGeneration.current += 1;
    };
  }, [load]);

  const backLink = (
    <a href="/employer/calendar" style={styles.secondaryButton}>
      {t("detail.backToCalendar")}
    </a>
  );

  if (!requestId) {
    return (
      <article style={styles.panel} aria-live="polite">
        <h2 style={styles.sectionTitle}>{t("detail.needIdTitle")}</h2>
        <p style={styles.sectionCopy}>{t("detail.needIdBody")}</p>
        <div className="employer-action-row">{backLink}</div>
      </article>
    );
  }

  if (organizationRequired) {
    return (
      <article style={styles.panel} aria-live="polite">
        <h2 style={styles.sectionTitle}>{t("detail.chooseCompanyTitle")}</h2>
        <p style={styles.sectionCopy}>{t("detail.chooseCompanyBody")}</p>
        <div className="employer-action-row">
          <a href="/employer/calendar" style={styles.secondaryButton}>
            {t("detail.chooseCompany")}
          </a>
        </div>
      </article>
    );
  }

  if (state.status !== "ready") {
    const copy: readonly [MessageKey, MessageKey] =
      state.status === "loading"
        ? ["detail.loadingTitle", "detail.loadingBody"]
        : state.status === "denied"
          ? ["detail.signInTitle", "detail.signInBody"]
          : state.status === "unavailable"
            ? ["detail.unavailableTitle", "detail.unavailableBody"]
            : state.status === "stale"
              ? ["detail.changedTitle", "detail.changedBody"]
              : ["detail.errorTitle", "detail.errorBody"];
    return (
      <article style={styles.panel} aria-live="polite">
        <h2 style={styles.sectionTitle}>{t(copy[0])}</h2>
        <p style={styles.sectionCopy}>{t(copy[1])}</p>
        <div className="employer-action-row">
          {backLink}
          {state.status === "error" || state.status === "stale" || state.status === "unavailable" ? (
            <button
              type="button"
              onClick={() => void load()}
              style={{ ...styles.secondaryButton, cursor: "pointer" }}
            >
              {t("detail.retry")}
            </button>
          ) : null}
        </div>
      </article>
    );
  }

  const request: ClientCalendarDto =
    cancelledHere && state.data.status !== "cancelled" ? { ...state.data, status: "cancelled" } : state.data;
  const phase = requestPhase(request);
  // Cancelled or finished: nothing left to change, so the only action is "Duplicate request".
  const closed = isClosedPhase(phase);
  const draft = request.status === "draft";
  const infoRequested = request.actionRequired === "information_required";
  const notProvided = t("detail.notProvided");
  const certificates = requestCertificates(chosenCertificates, request.qualifications, (key) =>
    isRequiredCertificateKey(key) ? certificateLabel(key, fmtLocale(locale)) : key
  );
  const fields: readonly (readonly [MessageKey, string])[] = [
    ["detail.number", request.requestNumber],
    ["detail.workers", String(request.numberOfWorkers)],
    ["detail.schedule", formatWindow(request, locale, t)],
    ["detail.duties", request.dutiesSummary ?? notProvided],
    ["detail.certificates", certificates.length ? certificates.join(", ") : t("detail.none")],
    ["detail.address", request.addressSummary ?? notProvided],
    ["detail.instructions", request.specialInstructions ?? notProvided],
    ...conditionFields(conditions, langOf(locale))
  ];
  return (
    <div style={styles.twoColumn}>
      <article style={{ ...styles.panel, alignContent: "start", gap: 14 }}>
        <p style={{ ...styles.eyebrowDark, margin: 0 }}>{t("detail.eyebrow", { num: request.requestNumber })}</p>
        <h2 style={{ ...styles.sectionTitle, margin: 0 }}>{request.title}</h2>
        <RequestStatusChip request={request} />
        {infoRequested ? (
          <p aria-live="polite" style={{ ...styles.warning, margin: 0 }}>
            {t("detail.infoRequested", { reason: request.actionRequiredReason ?? "" })}
          </p>
        ) : null}
        <div className="employer-action-row no-print">
          {!closed && (draft || infoRequested) ? (
            <a
              href={`/employer/calendar/request/edit?id=${encodeURIComponent(request.id)}`}
              style={styles.primaryButton}
            >
              {infoRequested ? t("calendar.provideInfo") : t("create.editDraft")}
            </a>
          ) : null}
          {!closed && !draft ? (
            <a
              href={`/employer/calendar/assignment?request=${encodeURIComponent(request.id)}`}
              style={styles.secondaryButton}
            >
              {t("detail.staffing")}
            </a>
          ) : null}
          <DuplicateRequestButton requestId={request.id} />
          {/* A draft is changed with "Edit draft" (the full form); live changes are for sent requests. */}
          {!closed && !draft ? <EditRequestPanel requestId={request.id} versionToken={request.versionToken} /> : null}
          {!closed && !draft ? (
            <AddWorkersPanel
              requestId={request.id}
              currentWorkers={request.numberOfWorkers}
              versionToken={request.versionToken}
            />
          ) : null}
          {!closed && !draft && request.numberOfWorkers > 1 ? (
            <ReduceWorkersPanel
              requestId={request.id}
              currentWorkers={request.numberOfWorkers}
              versionToken={request.versionToken}
            />
          ) : null}
          {!closed || cancelledHere ? (
            <CancelRequestPanel
              requestId={request.id}
              onCancelled={() => {
                setCancelledHere(true);
                void load(true);
              }}
            />
          ) : null}
          <button
            type="button"
            onClick={() => window.print()}
            style={{ ...styles.secondaryButton, cursor: "pointer" }}
          >
            🖨 {t("detail.print")}
          </button>
        </div>
        {!closed ? <BonusOfferPanel requestId={request.id} /> : null}
        {/* Interested workers no longer matter once a request is cancelled or finished. */}
        {!closed ? <ApplicantsPanel requestId={request.id} /> : null}
      </article>
      <article style={{ ...styles.panel, alignContent: "start", gap: 12 }}>
        <h2 style={styles.cardTitle}>{t("detail.detailsTitle")}</h2>
        <dl style={{ display: "grid", gap: 10, margin: 0 }}>
          {fields.map(([label, value]) => (
            <div key={label} style={{ ...styles.tintedCard, padding: "12px 14px" }}>
              <dt style={styles.metaLabel}>{t(label)}</dt>
              <dd style={{ ...styles.cardText, margin: 0, overflowWrap: "anywhere" }}>{value}</dd>
            </div>
          ))}
        </dl>
        <JobLocationMap address={request.addressSummary} />
        {request.addressSummary ? (
          <div className="employer-action-row no-print">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(request.addressSummary)}`}
              target="_blank"
              rel="noreferrer"
              style={styles.secondaryButton}
            >
              {t("detail.openMaps")}
            </a>
          </div>
        ) : null}
        {phase === "confirmed" || phase === "working" ? <AddToCalendar request={request} t={t} /> : null}
      </article>
    </div>
  );
}

// "Add this confirmed shift to my own calendar": Google Calendar link + .ics download, built from the
// request the panel already holds. Reuses the shared, tested calendar-export capsule; no server round-trip.
function AddToCalendar({ request, t }: Readonly<{ request: ClientCalendarDto; t: Translate }>) {
  const exported = buildCalendarExport({
    title: request.title,
    startAt: request.startAt,
    endAt: request.endAt,
    jobCode: request.requestNumber,
    location: request.addressSummary,
    uid: request.id,
    stampedAt: new Date().toISOString()
  });
  const downloadIcs = () => {
    const blob = new Blob([exported.ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exported.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="no-print" style={{ ...styles.tintedCard, display: "grid", gap: 10 }}>
      <strong>{t("detail.addToCalTitle")}</strong>
      <p style={{ ...styles.cardText, margin: 0 }}>{t("detail.addToCalBody", { num: request.requestNumber })}</p>
      <div className="employer-action-row">
        <a href={exported.googleCalendarUrl} target="_blank" rel="noopener noreferrer" style={styles.secondaryButton}>
          {t("detail.addGoogle")}
        </a>
        <button type="button" onClick={downloadIcs} style={{ ...styles.secondaryButton, cursor: "pointer" }}>
          {t("detail.downloadIcs")}
        </button>
      </div>
    </div>
  );
}

// The stated shift conditions, only the ones filled in (labels from the request form).
function conditionFields(c: EmployerShiftConditions | null, lang: ReturnType<typeof langOf>): (readonly [MessageKey, string])[] {
  if (!c) return [];
  const rows: (readonly [MessageKey, string])[] = [];
  const breakText = breakRuleLabel(c.breakMinutes, lang);
  if (breakText) rows.push(["create.breakLabel", breakText]);
  if (c.dressCode) rows.push(["create.dressCode", dressCodeLabel(c.dressCode, lang)]);
  if (c.equipmentToBring) rows.push(["create.equipment", c.equipmentToBring]);
  if (c.arrivalInstructions) rows.push(["create.arrival", c.arrivalInstructions]);
  if (c.workerNotes) rows.push(["create.workerNotes", c.workerNotes]);
  return rows;
}

function formatWindow(request: ClientCalendarDto, locale: Parameters<typeof fmtLocale>[0], t: Translate) {
  const start = formatRwosDateTime(request.startAt, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: request.timezone,
    locale: fmtLocale(locale)
  });
  const end = formatRwosDateTime(request.endAt, {
    timeStyle: "short",
    timeZone: request.timezone,
    locale: fmtLocale(locale)
  });
  return start === "Unavailable" || end === "Unavailable" ? t("detail.notProvided") : `${start}–${end}`;
}
