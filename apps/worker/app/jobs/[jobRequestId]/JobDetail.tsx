"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { looksLikePostalCode } from "@rwos/shared";
import { formatWhen } from "../../MarketplaceExplorer";
import { useLocale, useT, fmtLocale } from "../../i18n/LocaleProvider";
import type { MessageKey } from "../../i18n/messages";
import { workerPayLabel } from "../../workerPayLabel";
import { MissingCertificatesNotice, RequiredCertificatesSection, type RequiredCertificatesData } from "../../RequiredCertificates";
import { shiftOverlapNotice } from "../../shiftOverlapNotice";
import { ShiftAddressMap } from "../../ShiftAddressMap";
import { CancelShiftControl } from "../../schedule/CancelShift";
import { ShiftCheckIn, type CheckInShift } from "../../schedule/ShiftCheckIn";
import { JoblopJobBadge } from "../../JobSourceBadge";

type JobDetailData = Readonly<{
  jobRequestId: string;
  role: string;
  title: string;
  employer: { id: string; name: string; verified: boolean };
  areaLabel: string;
  distanceKm: number | null;
  distanceLabel: string | null;
  mapPoint: { latitude: number; longitude: number; approximate: boolean };
  travelTime: { durationLabel: string; distanceKm: number | null; mode: string } | null;
  startAt: string;
  endAt: string;
  openings: number;
  workerRateMinor: number | null;
  currency: string;
  /** Long-term listing only: the pay the employer offers and pays directly. */
  payOffered?: unknown;
  description: string | null;
  duties: string | null;
  safetyNotes: string | null;
  qualifications: readonly string[];
  allowances?: AllowancesData;
  saved: boolean;
  // Hybrid auto-offer: when claimable, the worker claims directly instead of expressing interest.
  openClaim?: boolean;
  claimable?: boolean;
  // Why the job can't be taken (the API's claim rule): it has started, or pays below the minimum wage.
  claimBlockedReason?: string | null;
  // Extra pay Joblop added to fill the job faster (null when there is none).
  bonus?: JobBonus | null;
  // Long-term listing: workers apply and the employer chooses (never claimed).
  longTerm?: boolean;
  // Certificates the employer requires, and the ones this worker misses (null when not a worker).
  requiredCertificates?: RequiredCertificatesData;
  missingCertificates?: readonly string[] | null;
  // This worker holds the shift (claimed, or assigned and confirmed): the page is their shift page.
  booked?: boolean;
}>;

// The worker's own schedule entry for this job (from /api/attendance).
type MyShiftRecord = CheckInShift & Readonly<{ assignmentId?: string; worksiteAddress?: string | null }>;

type JobBonus = Readonly<{ kind: string; amountMinor: number }>;

type ClaimState = "idle" | "claiming" | "assigned" | "full" | "election_required" | "ineligible" | "overlap" | "error";
type ClaimOutcome = Readonly<{ state: ClaimState; reasons: readonly string[] }>;

type AllowanceLine = Readonly<{ provision: string; amountMinor: number | null; note: string | null }>;
type AllowancesData = Readonly<{
  transport: AllowanceLine | null;
  meal: AllowanceLine | null;
  lodging: AllowanceLine | null;
}>;

type InterestState = Readonly<{
  interest: { status: string; employerDecision?: string | null } | null;
  lastEmployerDecision?: string | null;
  eligibility: { eligible: boolean; reasons: string[] };
}>;

// Maps a server eligibility reason code to a translation key (never raw server text to the UI).
const INELIGIBLE_KEY: Record<string, MessageKey> = {
  already_assigned: "job.inelAlreadyAssigned",
  active_offer_exists: "job.inelActiveOffer",
  job_not_open: "job.inelNotOpen",
  job_not_found: "job.inelNotFound"
};

export function JobDetail({ id, place }: { id: string; place: string | null }) {
  // Only a postal code is sent with an interest (for its audit distance); a city is not.
  const postalCode = place && looksLikePostalCode(place) ? place : null;
  const t = useT();
  const uiLocale = useLocale();
  const locale = fmtLocale(uiLocale);
  const [overlapMessage, setOverlapMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "not_found" | "signed_out" | "error">("loading");
  const [job, setJob] = useState<JobDetailData | null>(null);
  const [interest, setInterest] = useState<InterestState | null>(null);
  const [interestBusy, setInterestBusy] = useState(false);
  const [claimOutcome, setClaimOutcome] = useState<ClaimOutcome>({ state: "idle", reasons: [] });
  const setClaimState = (state: ClaimState, reasons: readonly string[] = []) => setClaimOutcome({ state, reasons });
  // The exact work address, only when this worker is confirmed on this job (from their own schedule;
  // the API sends it only for a confirmed shift that is not over). Everyone else sees the city only.
  const [confirmedAddress, setConfirmedAddress] = useState<string | null>(null);
  // The worker's own schedule entry for this job (any live status): drives the "You're assigned" box
  // with Check in / Check out, and Cancel while it has not started.
  const [myRecord, setMyRecord] = useState<MyShiftRecord | null>(null);
  const [cancelNotice, setCancelNotice] = useState<string | null>(null);
  const assignedRef = useRef<HTMLElement | null>(null);
  const confirmedJobId = job?.jobRequestId ?? null;
  const loadMine = useCallback(async () => {
    if (!confirmedJobId) return;
    try {
      const r = await fetch("/api/attendance?limit=100", { cache: "no-store" });
      if (!r.ok) return;
      const p = (await r.json()) as { items?: MyShiftRecord[] };
      const items = (p.items ?? []).filter((item) => item.jobRequestId === confirmedJobId);
      const mine = items.find((item) => item.status !== "cancelled") ?? null;
      setMyRecord(mine);
      setConfirmedAddress(mine?.worksiteAddress ?? null);
    } catch {
      /* keep what is shown */
    }
  }, [confirmedJobId]);
  useEffect(() => {
    void loadMine();
  }, [loadMine, claimOutcome.state]);
  // Right after claiming, bring the new "You're assigned" box (with Check in) into view.
  useEffect(() => {
    if (claimOutcome.state === "assigned" && myRecord) assignedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [claimOutcome.state, myRecord]);
  const myShift =
    myRecord && myRecord.status === "pending_start" && myRecord.clockInAllowed !== false
      ? { attendanceRecordId: myRecord.attendanceRecordId, scheduledStartAt: myRecord.scheduledStartAt }
      : null;

  useEffect(() => {
    let active = true;
    const url = `/api/jobs/${encodeURIComponent(id)}${place ? `?place=${encodeURIComponent(place)}` : ""}`;
    fetch(url, { cache: "no-store" })
      .then(async (r) => {
        if (!active) return;
        if (r.status === 404) return setStatus("not_found");
        if (r.status === 401) return setStatus("signed_out");
        if (!r.ok) return setStatus("error");
        const payload = (await r.json()) as { job: JobDetailData };
        setJob(payload.job);
        setStatus("ready");
      })
      .catch(() => active && setStatus("error"));
    fetch(`/api/jobs/${encodeURIComponent(id)}/interest`, { cache: "no-store" })
      .then(async (r) => {
        if (!active || !r.ok) return;
        setInterest((await r.json()) as InterestState);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [id, place]);

  const expressInterest = useCallback(async () => {
    setInterestBusy(true);
    try {
      const r = await fetch(`/api/jobs/${encodeURIComponent(id)}/interest`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(postalCode ? { postalCode } : {})
      });
      if (r.ok) {
        const body = (await r.json()) as { interest: { status: string } };
        setInterest((prev) => ({ interest: body.interest, eligibility: prev?.eligibility ?? { eligible: true, reasons: [] } }));
      }
    } finally {
      setInterestBusy(false);
    }
  }, [id, postalCode]);

  const withdrawInterest = useCallback(async () => {
    setInterestBusy(true);
    try {
      const r = await fetch(`/api/jobs/${encodeURIComponent(id)}/interest`, { method: "DELETE" });
      if (r.ok) setInterest((prev) => ({ interest: null, eligibility: prev?.eligibility ?? { eligible: true, reasons: [] } }));
    } finally {
      setInterestBusy(false);
    }
  }, [id]);

  const claimJob = useCallback(async () => {
    setClaimState("claiming");
    try {
      const r = await fetch(`/api/jobs/${encodeURIComponent(id)}/claim`, { method: "POST" });
      if (r.status === 201) {
        setClaimState("assigned");
        return;
      }
      const body = (await r.json().catch(() => ({}))) as { error?: string; reasons?: string[] };
      const overlap = r.status === 409 ? shiftOverlapNotice(body, uiLocale) : null;
      if (overlap) {
        setOverlapMessage(overlap);
        setClaimState("overlap");
      } else if (r.status === 409 && body.error === "RWOS_CLASSIFICATION_ELECTION_REQUIRED") setClaimState("election_required");
      else if (r.status === 409) setClaimState("full");
      else if (r.status === 422) setClaimState("ineligible", Array.isArray(body.reasons) ? body.reasons : []);
      else setClaimState("error");
    } catch {
      setClaimState("error");
    }
  }, [id, uiLocale]);

  const toggleSaved = useCallback(async () => {
    if (!job) return;
    const wasSaved = job.saved;
    setJob({ ...job, saved: !wasSaved });
    try {
      const response = wasSaved
        ? await fetch(`/api/saved-jobs/${encodeURIComponent(job.jobRequestId)}`, { method: "DELETE" })
        : await fetch("/api/saved-jobs", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ jobRequestId: job.jobRequestId })
          });
      if (!response.ok) throw new Error("save failed");
    } catch {
      setJob((current) => (current ? { ...current, saved: wasSaved } : current));
    }
  }, [job]);

  if (status === "loading") return <div className="state">{t("common.loading")}</div>;
  if (status === "not_found")
    return (
      <div className="state">
        {t("job.noLongerAvailable")}
        <div style={{ marginTop: 12 }}>
          <a className="btn" href="/">{t("job.returnToSearch")}</a>
        </div>
      </div>
    );
  if (status === "signed_out")
    return (
      <div className="state">
        {t("job.signInToView")}
        <div style={{ marginTop: 12 }}><a className="btn" href="/">{t("job.signInCta")}</a></div>
      </div>
    );
  if (status === "error" || !job)
    return (
      <div className="state error" role="alert">
        {t("job.loadError")}
      </div>
    );

  return (
    <article className="detail">
      <div className="detail-head">
        <div>
          <JoblopJobBadge />
          <h1>{job.role}</h1>
          <p className="detail-title">{job.title}</p>
          <p className="employer">
            <a href={`/employers/${encodeURIComponent(job.employer.id)}`}>{job.employer.name}</a>
            {job.employer.verified ? <span className="chip verified" style={{ marginLeft: 8 }}>{t("job.verified")}</span> : null}
          </p>
        </div>
        <button className="btn no-print" type="button" aria-pressed={job.saved} onClick={toggleSaved}>
          {job.saved ? t("job.saved") : t("job.saveJob")}
        </button>
      </div>

      <div className="detail-facts">
        <Fact label={t("job.factLocation")}>{job.areaLabel}{job.distanceLabel ? ` · ${job.distanceLabel}` : ""}</Fact>
        {job.travelTime ? (
          <Fact label={t("job.factTravel")}>
            {job.travelTime.durationLabel} {t("job.travelByCar")}
            {job.travelTime.distanceKm !== null ? ` · ${job.travelTime.distanceKm} km` : ""}
          </Fact>
        ) : null}
        <Fact label={t("job.factWhen")}>{formatWhen(job.startAt, job.endAt, uiLocale === "ar" ? "ar" : locale)}</Fact>
        <Fact label={t("job.factOpenings")}>{job.openings}</Fact>
        <Fact label={t("job.factPay")}>
          <bdi>{workerPayLabel(job, locale, { paidByEmployer: t("pay.paidByEmployer"), employerPaysDirectly: t("pay.employerPaysDirectly"), pending: t("pay.pending") })}</bdi>
        </Fact>
      </div>

      {job.bonus && job.bonus.amountMinor > 0 ? <BonusBox bonus={job.bonus} currency={job.currency} locale={locale} /> : null}

      {cancelNotice ? <p className="notice" role="status" style={{ color: "var(--accent)" }}>{cancelNotice}</p> : null}
      {myRecord ? (
        <section ref={assignedRef} className="detail-section interest submitted" data-testid="my-shift" aria-labelledby="my-shift-title">
          <h2 id="my-shift-title">{t("job.claimAssignedTitle")}</h2>
          <p>{t("checkin.assignedBody")}</p>
          <ShiftCheckIn shift={myRecord} onChanged={loadMine} />
          {/* "Report my hours" (feat/report-hours) goes here, next to Check in / Check out. */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {myRecord.assignmentId ? (
              <a className="btn ghost" href={`/contact?topic=shift&relatedType=assignment&relatedId=${encodeURIComponent(myRecord.assignmentId)}`}>
                {t("sched.askJoblop")}
              </a>
            ) : null}
            <a className="btn ghost" href="/schedule">{t("job.goToSchedule")}</a>
          </div>
          {myShift ? (
            <CancelShiftControl
              attendanceRecordId={myShift.attendanceRecordId}
              scheduledStartAt={myShift.scheduledStartAt}
              onCancelled={(message) => {
                setCancelNotice(message);
                setMyRecord(null);
                setConfirmedAddress(null);
              }}
            />
          ) : null}
        </section>
      ) : null}
      {confirmedAddress ? (
        <Section title={t("map.workAddress")}>
          <p>{confirmedAddress}</p>
          <ShiftAddressMap address={confirmedAddress} height={220} />
        </Section>
      ) : (
        <>
          <WorksiteMap point={job.mapPoint} locale={locale} />
          <p className="notice">{t("job.mapApproxNotice")}</p>
        </>
      )}

      {job.description ? (
        <Section title={t("job.aboutShift")}>
          <p>{job.description}</p>
        </Section>
      ) : null}
      {job.duties ? (
        <Section title={t("job.duties")}>
          <p>{job.duties}</p>
        </Section>
      ) : null}
      {job.safetyNotes ? (
        <Section title={t("job.safetyNotes")}>
          <p>{job.safetyNotes}</p>
        </Section>
      ) : null}
      {job.qualifications.length > 0 ? (
        <Section title={t("job.qualifications")}>
          <ul className="quals">
            {job.qualifications.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      <RequiredCertificatesSection required={job.requiredCertificates} missing={job.missingCertificates} />

      <AllowancesSection allowances={job.allowances} currency={job.currency} locale={locale} />

      {myRecord || job.booked ? null : blockedReasonKey(job.claimBlockedReason) ? (
        <section className="detail-section interest" role="status">
          <p className="muted">{t(blockedReasonKey(job.claimBlockedReason)!)}</p>
        </section>
      ) : job.claimable ? (
        <ClaimPanel
          outcome={claimOutcome}
          onClaim={claimJob}
          overlapMessage={overlapMessage}
          blocked={(job.missingCertificates ?? []).length > 0}
          other={job.requiredCertificates?.other ?? null}
        />
      ) : (
        <InterestPanel
          state={interest}
          busy={interestBusy}
          onExpress={expressInterest}
          onWithdraw={withdrawInterest}
          longTerm={job.longTerm === true}
          other={job.requiredCertificates?.other ?? null}
        />
      )}

      <div className="detail-cta no-print">
        <button className="btn ghost" type="button" aria-pressed={job.saved} onClick={toggleSaved}>
          {job.saved ? t("job.saved") : t("job.saveJob")}
        </button>
        <a className="btn ghost" href={`/employers/${encodeURIComponent(job.employer.id)}`}>{t("job.viewEmployer")}</a>
        <a className="btn ghost" href="/my-interests">{t("nav.interests")}</a>
        <button className="btn ghost" type="button" onClick={() => window.print()}>
          {t("job.print")}
        </button>
      </div>
    </article>
  );
}

// Worksite locator map — keyless Google Maps capsule (ported from SYBNB's googleMapCapsule).
// Renders the APPROXIMATE worksite point in Google's keyless embed iframe (output=embed), so
// NO Maps API key is ever required or sent to the browser, plus a "Get directions" link that
// opens Google Maps with the worker's own live, personalised travel time (answers "how long
// to get there" without the paid Distance Matrix API). Privacy-safe: only the approximate
// public point is used — exact coordinates never reach the browser. Fail-closed: with no
// coordinates nothing renders and only the "approximate location" notice remains.
// The server-side static-map proxy (/api/map/static) and the Distance Matrix ETA (job.travelTime)
// remain available as optional enhancements if a GOOGLE_MAPS_API_KEY is ever configured.
function WorksiteMap({ point, locale }: { point: { latitude: number; longitude: number; approximate: boolean }; locale: string }) {
  const t = useT();
  if (!Number.isFinite(point?.latitude) || !Number.isFinite(point?.longitude)) return null;
  const q = `${point.latitude},${point.longitude}`;
  const hl = locale === "fr" ? "fr" : "en";
  const embedSrc = `https://www.google.com/maps?q=${encodeURIComponent(q)}&hl=${hl}&z=14&output=embed`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
  return (
    <div className="worksite-map" style={{ marginTop: 12 }}>
      <div style={{ borderRadius: 12, overflow: "hidden", lineHeight: 0, border: "1px solid rgba(0,0,0,0.08)" }}>
        <iframe
          title={t("job.mapAlt")}
          src={embedSrc}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          style={{ width: "100%", height: 220, border: 0, display: "block" }}
          allowFullScreen
        />
      </div>
      <a
        className="btn ghost"
        href={directionsUrl}
        target="_blank"
        rel="noreferrer"
        style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        {t("job.getDirections")}
      </a>
    </div>
  );
}

function BonusBox({ bonus, currency, locale }: { bonus: JobBonus; currency: string; locale: string }) {
  const t = useT();
  const amount = (bonus.amountMinor / 100).toLocaleString(locale, { style: "currency", currency: currency || "CAD" });
  const label =
    bonus.kind === "hourly"
      ? t("job.bonusHourly", { amount })
      : bonus.kind === "transport"
        ? t("job.bonusTransport", { amount })
        : t("job.bonusOneTime", { amount });
  return (
    <section
      aria-label={t("job.bonusTitle")}
      style={{ marginTop: 12, padding: "12px 14px", borderRadius: 12, background: "#fff8dc", border: "2px solid #F8B808", color: "#3d2c00" }}
    >
      <span
        style={{ display: "inline-block", background: "#F8B808", color: "#111", fontWeight: 800, borderRadius: 999, padding: "3px 12px" }}
      >
        <span aria-hidden="true">★ </span>
        <bdi>{label}</bdi>
      </span>
      <p style={{ margin: "8px 0 0" }}>{t("job.bonusNote")}</p>
    </section>
  );
}

function AllowancesSection({ allowances, currency, locale }: { allowances: AllowancesData | undefined; currency: string; locale: string }) {
  const t = useT();
  const rows: { label: string; line: AllowanceLine }[] = [];
  if (allowances?.transport) rows.push({ label: t("job.allowanceTransport"), line: allowances.transport });
  if (allowances?.meal) rows.push({ label: t("job.allowanceMeal"), line: allowances.meal });
  if (allowances?.lodging) rows.push({ label: t("job.allowanceLodging"), line: allowances.lodging });

  function describe(line: AllowanceLine): string {
    if (line.provision === "provided") return t("job.allowanceProvided");
    if (line.provision === "allowance") {
      return line.amountMinor !== null
        ? t("job.allowanceAmount", { amount: (line.amountMinor / 100).toLocaleString(locale, { style: "currency", currency }) })
        : t("job.allowanceGeneric");
    }
    return t("job.allowanceGeneric");
  }

  return (
    <Section title={t("job.allowancesTitle")}>
      {rows.length === 0 ? (
        <p className="muted">{t("job.allowancesNone")}</p>
      ) : (
        <ul className="quals">
          {rows.map((row) => (
            <li key={row.label}>
              <strong>{row.label}:</strong> {describe(row.line)}
              {row.line.note ? <span className="muted"> — {row.line.note}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

// The governed Express-Interest CTA. Interest is intent only — the copy never implies the
// worker "got the job". If a governed offer later exists, that lives in the offer flow.
function InterestPanel({
  state,
  busy,
  onExpress,
  onWithdraw,
  longTerm,
  other
}: {
  state: InterestState | null;
  busy: boolean;
  onExpress: () => void;
  onWithdraw: () => void;
  longTerm: boolean;
  other: string | null;
}) {
  const t = useT();
  const current = state?.interest?.status ?? null;
  const decision = state?.interest?.employerDecision ?? state?.lastEmployerDecision ?? null;
  const eligible = state?.eligibility?.eligible ?? true;
  const reasons = state?.eligibility?.reasons ?? [];
  const certificateBlocked = reasons.some((r) => r.startsWith("missing_certificate:"));

  // Long-term job: the worker applied and the employer chooses.
  if (longTerm && decision === "hired") {
    return (
      <section className="detail-section interest submitted">
        <h2>{t("job.appHiredTitle")}</h2>
        <p>{t("job.appHiredBody")}</p>
      </section>
    );
  }
  if (longTerm && current && ["submitted", "under_review", "shortlisted"].includes(current)) {
    return (
      <section className="detail-section interest submitted">
        <h2>{t("job.appliedTitle")}</h2>
        <p>{decision === "shortlisted" ? t("job.appShortlisted") : t("job.appliedBody")}</p>
        <button className="btn ghost" type="button" onClick={onWithdraw} disabled={busy}>
          {t("job.withdrawApplication")}
        </button>
      </section>
    );
  }

  if (current && ["submitted", "under_review", "shortlisted"].includes(current)) {
    return (
      <section className="detail-section interest submitted">
        <h2>{t("job.interestSubmittedTitle")}</h2>
        <p>{t("job.interestSubmittedBody")}</p>
        <button className="btn ghost" type="button" onClick={onWithdraw} disabled={busy}>
          {t("job.withdrawInterest")}
        </button>
      </section>
    );
  }

  if (current && ["offer_created", "offer_accepted"].includes(current)) {
    return (
      <section className="detail-section interest">
        <h2>{t("job.offerTitle")}</h2>
        <p>{t("job.offerBody")}</p>
        <a className="btn" href="/offers">{t("job.goToOffers")}</a>
      </section>
    );
  }

  return (
    <section className="detail-section interest">
      <h2>{longTerm ? t("job.applyTitle") : t("job.interestedTitle")}</h2>
      {longTerm && decision === "not_selected" ? <p className="muted">{t("job.appNotSelected")}</p> : null}
      {eligible ? (
        <>
          <p>{longTerm ? t("job.applyBody") : t("job.interestedBody")}</p>
          <button className="btn" type="button" onClick={onExpress} disabled={busy}>
            {busy ? t("job.submitting") : longTerm ? t("job.applyButton") : t("job.expressInterest")}
          </button>
        </>
      ) : certificateBlocked ? (
        <MissingCertificatesNotice reasons={reasons} other={other} />
      ) : (
        <p className="muted">{t(INELIGIBLE_KEY[reasons[0] ?? ""] ?? "job.inelDefault")}</p>
      )}
    </section>
  );
}

// Hybrid auto-offer — direct claim CTA. First eligible worker to claim each slot is assigned
// instantly; once slots fill, the claim returns "full". The pay-channel election gate still applies.
function ClaimPanel({
  outcome,
  onClaim,
  overlapMessage,
  blocked,
  other
}: {
  outcome: ClaimOutcome;
  onClaim: () => void;
  overlapMessage: string | null;
  blocked: boolean;
  other: string | null;
}) {
  const t = useT();
  const state = outcome.state;
  const certificateReasons = outcome.reasons.filter((r) => r.startsWith("missing_certificate:"));
  const blockedKey = outcome.reasons.map(blockedReasonKey).find((key) => key !== null) ?? null;

  if (state === "assigned") {
    return (
      <section className="detail-section interest submitted">
        <h2>{t("job.claimAssignedTitle")}</h2>
        <p>{t("job.claimAssignedBody")}</p>
        <a className="btn" href="/schedule">{t("job.goToSchedule")}</a>
      </section>
    );
  }

  return (
    <section className="detail-section interest">
      <h2>{t("job.claimTitle")}</h2>
      <p>{t("job.claimBody")}</p>
      {state === "full" ? <p className="muted">{t("job.claimFull")}</p> : null}
      {state === "election_required" ? (
        <p className="muted">
          {t("job.claimElectionRequired")} <a href="/onboarding">{t("common.setUpWorker")}</a>
        </p>
      ) : null}
      {state === "ineligible" && certificateReasons.length > 0 ? (
        <MissingCertificatesNotice reasons={certificateReasons} other={other} />
      ) : state === "ineligible" ? (
        <p className="muted">{t(blockedKey ?? "job.inelDefault")}</p>
      ) : null}
      {state === "overlap" && overlapMessage ? <p className="muted" role="alert">{overlapMessage}</p> : null}
      {state === "error" ? <p className="muted">{t("job.loadError")}</p> : null}
      {state !== "full" && !blocked && certificateReasons.length === 0 ? (
        <button className="btn" type="button" onClick={onClaim} disabled={state === "claiming"}>
          {state === "claiming" ? t("job.claiming") : t("job.claimButton")}
        </button>
      ) : null}
    </section>
  );
}

/** The message for a claim-block reason from the API, or null for any other reason. */
export function blockedReasonKey(reason: string | null | undefined): "job.blockedStarted" | "job.blockedBelowWage" | null {
  if (reason === "job_started") return "job.blockedStarted";
  if (reason === "below_minimum_wage") return "job.blockedBelowWage";
  return null;
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="fact">
      <span className="fact-label">{label}</span>
      <span className="fact-value">{children}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="detail-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
