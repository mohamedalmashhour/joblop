"use client";

import { useCallback, useEffect, useState } from "react";
import { formatWhen, formatRate } from "../../MarketplaceExplorer";
import { useLocale, useT } from "../../i18n/LocaleProvider";
import type { MessageKey } from "../../i18n/messages";

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
  description: string | null;
  duties: string | null;
  qualifications: readonly string[];
  allowances?: AllowancesData;
  saved: boolean;
}>;

type AllowanceLine = Readonly<{ provision: string; amountMinor: number | null; note: string | null }>;
type AllowancesData = Readonly<{
  transport: AllowanceLine | null;
  meal: AllowanceLine | null;
  lodging: AllowanceLine | null;
}>;

type InterestState = Readonly<{
  interest: { status: string } | null;
  eligibility: { eligible: boolean; reasons: string[] };
}>;

// Maps a server eligibility reason code to a translation key (never raw server text to the UI).
const INELIGIBLE_KEY: Record<string, MessageKey> = {
  already_assigned: "job.inelAlreadyAssigned",
  active_offer_exists: "job.inelActiveOffer",
  job_not_open: "job.inelNotOpen",
  job_not_found: "job.inelNotFound"
};

export function JobDetail({ id, postalCode }: { id: string; postalCode: string | null }) {
  const t = useT();
  const locale = useLocale();
  const [status, setStatus] = useState<"loading" | "ready" | "not_found" | "error">("loading");
  const [job, setJob] = useState<JobDetailData | null>(null);
  const [interest, setInterest] = useState<InterestState | null>(null);
  const [interestBusy, setInterestBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const url = `/api/jobs/${encodeURIComponent(id)}${postalCode ? `?postalCode=${encodeURIComponent(postalCode)}` : ""}`;
    fetch(url, { cache: "no-store" })
      .then(async (r) => {
        if (!active) return;
        if (r.status === 404) return setStatus("not_found");
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
  }, [id, postalCode]);

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
          <h1>{job.role}</h1>
          <p className="detail-title">{job.title}</p>
          <p className="employer">
            <a href={`/employers/${encodeURIComponent(job.employer.id)}`}>{job.employer.name}</a>
            {job.employer.verified ? <span className="chip verified" style={{ marginLeft: 8 }}>{t("job.verified")}</span> : null}
          </p>
        </div>
        <button className="btn" type="button" aria-pressed={job.saved} onClick={toggleSaved}>
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
        <Fact label={t("job.factWhen")}>{formatWhen(job.startAt, job.endAt, locale)}</Fact>
        <Fact label={t("job.factOpenings")}>{job.openings}</Fact>
        {job.workerRateMinor !== null ? <Fact label={t("job.factPay")}>{formatRate(job.workerRateMinor, job.currency, locale)}</Fact> : null}
      </div>

      <WorksiteMap point={job.mapPoint} locale={locale} />
      <p className="notice">{t("job.mapApproxNotice")}</p>

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
      {job.qualifications.length > 0 ? (
        <Section title={t("job.qualifications")}>
          <ul className="quals">
            {job.qualifications.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      <AllowancesSection allowances={job.allowances} currency={job.currency} locale={locale} />

      <InterestPanel state={interest} busy={interestBusy} onExpress={expressInterest} onWithdraw={withdrawInterest} />

      <div className="detail-cta">
        <button className="btn ghost" type="button" aria-pressed={job.saved} onClick={toggleSaved}>
          {job.saved ? t("job.saved") : t("job.saveJob")}
        </button>
        <a className="btn ghost" href={`/employers/${encodeURIComponent(job.employer.id)}`}>{t("job.viewEmployer")}</a>
        <a className="btn ghost" href="/my-interests">{t("nav.interests")}</a>
      </div>
    </article>
  );
}

// Worksite locator map. Renders the (approximate) worksite point via the server-side
// static-map proxy, so the Maps key never reaches the browser. Fail-closed by design:
// if the map can't be rendered (key unset, upstream error), onError hides the image and
// only the "approximate location" notice remains — the page never looks broken.
function WorksiteMap({ point, locale }: { point: { latitude: number; longitude: number; approximate: boolean }; locale: string }) {
  const t = useT();
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  if (!Number.isFinite(point?.latitude) || !Number.isFinite(point?.longitude)) return null;
  const lang = locale === "fr" ? "fr" : "en";
  const src = `/api/map/static?lat=${encodeURIComponent(point.latitude)}&lng=${encodeURIComponent(point.longitude)}&lang=${lang}`;
  return (
    <div className="worksite-map" style={{ marginTop: 12, borderRadius: 12, overflow: "hidden", lineHeight: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={t("job.mapAlt")}
        loading="lazy"
        onError={() => setFailed(true)}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
    </div>
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
  onWithdraw
}: {
  state: InterestState | null;
  busy: boolean;
  onExpress: () => void;
  onWithdraw: () => void;
}) {
  const t = useT();
  const current = state?.interest?.status ?? null;
  const eligible = state?.eligibility?.eligible ?? true;
  const reasons = state?.eligibility?.reasons ?? [];

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
      <h2>{t("job.interestedTitle")}</h2>
      {eligible ? (
        <>
          <p>{t("job.interestedBody")}</p>
          <button className="btn" type="button" onClick={onExpress} disabled={busy}>
            {busy ? t("job.submitting") : t("job.expressInterest")}
          </button>
        </>
      ) : (
        <p className="muted">{t(INELIGIBLE_KEY[reasons[0] ?? ""] ?? "job.inelDefault")}</p>
      )}
    </section>
  );
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
