"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "../i18n/LocaleProvider";

// Shared jobs calendar: every signed-in worker sees the same open Joblop jobs, picks a day,
// picks a job and accepts it. The server is authoritative for what is open and for the claim
// itself; this component only displays and asks.

type OpenJob = Readonly<{
  jobRequestId: string;
  role: string;
  areaLabel: string;
  startAt: string;
  endAt: string;
  urgency: string;
  placesLeft: number;
  workerRateMinor: number | null;
  // Extra pay Joblop added to fill the job faster (absent or null when there is none).
  bonus?: Readonly<{ kind: string; amountMinor: number }> | null;
}>;

type Lang = "en" | "fr" | "ar";

type Notice =
  | { kind: "accepted" }
  | { kind: "taken" }
  | { kind: "election" }
  | { kind: "ineligible"; reasons: string[] }
  | { kind: "error" };

const TEXT = {
  en: {
    title: "Jobs calendar",
    sub: "Pick a day to see the Joblop jobs you can take. Accept one and it goes straight to your schedule.",
    prev: "Previous month",
    next: "Next month",
    today: "Today",
    loading: "Loading jobs…",
    loadError: "We could not load the jobs. Please try again.",
    retry: "Try again",
    signedOut: "Create a free account to see the jobs calendar",
    signedOutCta: "Create my free account",
    pickDay: "Tap a day to see its jobs.",
    noJobsDay: "No jobs available on this day.",
    noJobsMonth: "No jobs available this month yet. Check the next month or come back soon.",
    jobsOn: (n: number, day: string) => (n === 1 ? `1 job on ${day}` : `${n} jobs on ${day}`),
    dayCount: (n: number) => (n === 1 ? "1 job" : `${n} jobs`),
    places: (n: number) => (n === 1 ? "1 place left" : `${n} places left`),
    urgent: "Urgent",
    perHour: (amount: string) => `$${amount}/h`,
    bonusHourly: (amount: string) => `+ $${amount}/h bonus`,
    bonusTransport: (amount: string) => `+ $${amount} transport`,
    bonusOneTime: (amount: string) => `+ $${amount} bonus`,
    bonusDay: "has a bonus job",
    accept: "Accept this job",
    accepting: "Accepting…",
    details: "View details",
    confirmTitle: "Accept this job?",
    confirmBody: "It will be added to your schedule and the employer will be told.",
    confirmYes: "Yes, accept",
    confirmNo: "Cancel",
    accepted: "Job accepted! It is in your schedule.",
    goSchedule: "Open my schedule",
    taken: "Sorry, this job was just taken.",
    election: "Before you take a job, choose and sign your pay agreement.",
    ineligibleIntro: "You can't accept this job right now:",
    finishSetup: "Finish setting up",
    seeOffers: "See my offers",
    error: "Something went wrong. Please try again.",
    reasons: {
      already_assigned: "You already have this job.",
      active_offer_exists: "You already have an offer for this job.",
      worker_schedule_conflict: "You already have another shift at that time.",
      not_a_worker: "Your worker profile is not set up yet.",
      worker_inactive: "Your worker account is not active yet.",
      job_not_open: "This job is no longer open.",
      job_not_found: "This job is no longer available.",
      other: "This job is not available for you."
    } as Record<string, string>
  },
  fr: {
    title: "Calendrier des emplois",
    sub: "Choisissez une journée pour voir les emplois Joblop disponibles. Acceptez-en un et il s’ajoute directement à votre horaire.",
    prev: "Mois précédent",
    next: "Mois suivant",
    today: "Aujourd’hui",
    loading: "Chargement des emplois…",
    loadError: "Impossible de charger les emplois. Veuillez réessayer.",
    retry: "Réessayer",
    signedOut: "Créez un compte gratuit pour voir le calendrier des emplois",
    signedOutCta: "Créer mon compte gratuit",
    pickDay: "Touchez une journée pour voir ses emplois.",
    noJobsDay: "Aucun emploi disponible cette journée.",
    noJobsMonth: "Aucun emploi disponible ce mois-ci pour l’instant. Regardez le mois suivant ou revenez bientôt.",
    jobsOn: (n: number, day: string) => (n === 1 ? `1 emploi le ${day}` : `${n} emplois le ${day}`),
    dayCount: (n: number) => (n === 1 ? "1 emploi" : `${n} emplois`),
    places: (n: number) => (n === 1 ? "1 place restante" : `${n} places restantes`),
    urgent: "Urgent",
    perHour: (amount: string) => `${amount} $/h`,
    bonusHourly: (amount: string) => `+ ${amount} $/h de prime`,
    bonusTransport: (amount: string) => `+ ${amount} $ transport`,
    bonusOneTime: (amount: string) => `+ ${amount} $ de prime`,
    bonusDay: "emploi avec prime",
    accept: "Accepter cet emploi",
    accepting: "Acceptation…",
    details: "Voir les détails",
    confirmTitle: "Accepter cet emploi?",
    confirmBody: "Il sera ajouté à votre horaire et l’employeur sera avisé.",
    confirmYes: "Oui, accepter",
    confirmNo: "Annuler",
    accepted: "Emploi accepté! Il est dans votre horaire.",
    goSchedule: "Ouvrir mon horaire",
    taken: "Désolé, cet emploi vient d’être pris.",
    election: "Avant de prendre un emploi, choisissez et signez votre entente de paie.",
    ineligibleIntro: "Vous ne pouvez pas accepter cet emploi pour le moment :",
    finishSetup: "Terminer mon inscription",
    seeOffers: "Voir mes offres",
    error: "Une erreur est survenue. Veuillez réessayer.",
    reasons: {
      already_assigned: "Vous avez déjà cet emploi.",
      active_offer_exists: "Vous avez déjà une offre pour cet emploi.",
      worker_schedule_conflict: "Vous avez déjà un autre quart à cette heure-là.",
      not_a_worker: "Votre profil de travailleur n’est pas encore configuré.",
      worker_inactive: "Votre compte de travailleur n’est pas encore actif.",
      job_not_open: "Cet emploi n’est plus ouvert.",
      job_not_found: "Cet emploi n’est plus disponible.",
      other: "Cet emploi n’est pas disponible pour vous."
    } as Record<string, string>
  },
  ar: {
    title: "تقويم الوظائف",
    sub: "اختر يومًا لترى وظائف Joblop المتاحة. اقبل وظيفة وستُضاف مباشرة إلى جدولك.",
    prev: "الشهر السابق",
    next: "الشهر التالي",
    today: "اليوم",
    loading: "جارٍ تحميل الوظائف…",
    loadError: "تعذّر تحميل الوظائف. حاول مرة أخرى.",
    retry: "حاول مرة أخرى",
    signedOut: "أنشئ حسابًا مجانيًا لترى تقويم الوظائف",
    signedOutCta: "أنشئ حسابي المجاني",
    pickDay: "اضغط على يوم لترى وظائفه.",
    noJobsDay: "لا توجد وظائف متاحة في هذا اليوم.",
    noJobsMonth: "لا توجد وظائف متاحة هذا الشهر بعد. انظر الشهر التالي أو عد قريبًا.",
    jobsOn: (n: number, day: string) => (n === 1 ? `وظيفة واحدة يوم ${day}` : `${n} وظائف يوم ${day}`),
    dayCount: (n: number) => (n === 1 ? "وظيفة واحدة" : `${n} وظائف`),
    places: (n: number) => (n === 1 ? "بقي مكان واحد" : `بقي ${n} أماكن`),
    urgent: "عاجل",
    perHour: (amount: string) => `${amount}$ / ساعة`,
    bonusHourly: (amount: string) => `+ ${amount}$ مكافأة في الساعة`,
    bonusTransport: (amount: string) => `+ ${amount}$ للمواصلات`,
    bonusOneTime: (amount: string) => `+ ${amount}$ مكافأة`,
    bonusDay: "فيه وظيفة بمكافأة",
    accept: "اقبل هذه الوظيفة",
    accepting: "جارٍ القبول…",
    details: "عرض التفاصيل",
    confirmTitle: "هل تقبل هذه الوظيفة؟",
    confirmBody: "ستُضاف إلى جدولك وسيتم إبلاغ صاحب العمل.",
    confirmYes: "نعم، أقبل",
    confirmNo: "إلغاء",
    accepted: "تم قبول الوظيفة! إنها في جدولك.",
    goSchedule: "افتح جدولي",
    taken: "عذرًا، أُخذت هذه الوظيفة للتو.",
    election: "قبل أن تأخذ وظيفة، اختر ووقّع اتفاقية الدفع الخاصة بك.",
    ineligibleIntro: "لا يمكنك قبول هذه الوظيفة الآن:",
    finishSetup: "أكمل التسجيل",
    seeOffers: "عرض عروضي",
    error: "حدث خطأ. حاول مرة أخرى.",
    reasons: {
      already_assigned: "لديك هذه الوظيفة بالفعل.",
      active_offer_exists: "لديك عرض لهذه الوظيفة بالفعل.",
      worker_schedule_conflict: "لديك نوبة أخرى في نفس الوقت.",
      not_a_worker: "ملفك كعامل غير مكتمل بعد.",
      worker_inactive: "حسابك كعامل غير مفعّل بعد.",
      job_not_open: "هذه الوظيفة لم تعد مفتوحة.",
      job_not_found: "هذه الوظيفة لم تعد متاحة.",
      other: "هذه الوظيفة غير متاحة لك."
    } as Record<string, string>
  }
};

const ONBOARDING_REASONS = new Set(["not_a_worker", "worker_inactive"]);

function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

function intlLocale(lang: Lang): string {
  return lang === "ar" ? "ar-u-nu-latn" : lang === "fr" ? "fr-CA" : "en-CA";
}

function hasBonus(job: OpenJob): boolean {
  return Boolean(job.bonus && job.bonus.amountMinor > 0);
}

function bonusLabel(job: OpenJob, t: (typeof TEXT)[Lang]): string | null {
  if (!job.bonus || !(job.bonus.amountMinor > 0)) return null;
  const amount = formatAmount(job.bonus.amountMinor);
  if (job.bonus.kind === "hourly") return t.bonusHourly(amount);
  if (job.bonus.kind === "transport") return t.bonusTransport(amount);
  return t.bonusOneTime(amount);
}

function formatAmount(minor: number): string {
  return (minor / 100).toFixed(2).replace(/\.00$/, "");
}

// Monday-first grid: leading blanks, then each day of the month.
function monthCells(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function JobsCalendar() {
  const locale = useLocale();
  const lang: Lang = locale === "ar" ? "ar" : locale.startsWith("fr") ? "fr" : "en";
  const t = TEXT[lang];
  const loc = intlLocale(lang);

  const [todayKey] = useState(() => dayKey(new Date()));
  const [view, setView] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selected, setSelected] = useState<string | null>(() => dayKey(new Date()));
  const [status, setStatus] = useState<"loading" | "ready" | "signed_out" | "error">("loading");
  const [jobs, setJobs] = useState<OpenJob[]>([]);
  const [reloadTick, setReloadTick] = useState(0);
  const [confirming, setConfirming] = useState<OpenJob | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notices, setNotices] = useState<Record<string, Notice>>({});
  const [banner, setBanner] = useState<Notice | null>(null);

  const reload = useCallback(() => setReloadTick((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    const from = new Date(view.year, view.month, 1);
    const to = new Date(view.year, view.month + 1, 1);
    const qs = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
    if (reloadTick === 0) setStatus("loading");
    fetch(`/api/marketplace/open-jobs?${qs.toString()}`, { cache: "no-store" })
      .then(async (r) => {
        if (!active) return;
        if (r.status === 401) return setStatus("signed_out");
        if (!r.ok) return setStatus("error");
        const body = (await r.json()) as { jobs?: OpenJob[] };
        if (!active) return;
        setJobs(Array.isArray(body.jobs) ? body.jobs.filter((j) => j.placesLeft > 0) : []);
        setStatus("ready");
      })
      .catch(() => active && setStatus("error"));
    return () => {
      active = false;
    };
  }, [view, reloadTick]);

  const byDay = useMemo(() => {
    const map = new Map<string, OpenJob[]>();
    for (const job of jobs) {
      const key = dayKey(new Date(job.startAt));
      const list = map.get(key) ?? [];
      list.push(job);
      map.set(key, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.startAt.localeCompare(b.startAt));
    return map;
  }, [jobs]);

  const cells = useMemo(() => monthCells(view.year, view.month), [view]);
  const weekdays = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(loc, { weekday: "narrow" });
    // 2024-01-01 is a Monday.
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 1 + i)));
  }, [loc]);
  const monthLabel = new Intl.DateTimeFormat(loc, { month: "long", year: "numeric" }).format(
    new Date(view.year, view.month, 1)
  );

  const changeMonth = (delta: number) => {
    const d = new Date(view.year, view.month + delta, 1);
    const now = new Date();
    const isCurrentMonth = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    setView({ year: d.getFullYear(), month: d.getMonth() });
    setSelected(dayKey(isCurrentMonth ? now : d));
    setBanner(null);
    setStatus("loading");
  };

  const timeFmt = useMemo(() => new Intl.DateTimeFormat(loc, { hour: "numeric", minute: "2-digit" }), [loc]);
  const dayFmt = useMemo(() => new Intl.DateTimeFormat(loc, { weekday: "long", day: "numeric", month: "long" }), [loc]);

  const accept = useCallback(
    async (job: OpenJob) => {
      setConfirming(null);
      setBusyId(job.jobRequestId);
      setBanner(null);
      let notice: Notice;
      try {
        const r = await fetch(`/api/jobs/${encodeURIComponent(job.jobRequestId)}/claim`, { method: "POST" });
        const body = (await r.json().catch(() => ({}))) as { error?: string; reasons?: unknown };
        if (r.status === 201) {
          notice = { kind: "accepted" };
          setJobs((current) => current.filter((j) => j.jobRequestId !== job.jobRequestId));
          setBanner(notice);
        } else if (r.status === 409 && body.error === "RWOS_CLASSIFICATION_ELECTION_REQUIRED") {
          notice = { kind: "election" };
        } else if (r.status === 409 || r.status === 404) {
          notice = { kind: "taken" };
          setJobs((current) => current.filter((j) => j.jobRequestId !== job.jobRequestId));
          setBanner(notice);
        } else if (r.status === 401) {
          setStatus("signed_out");
          return;
        } else if (r.status === 422) {
          const reasons = Array.isArray(body.reasons) ? body.reasons.filter((x): x is string => typeof x === "string") : [];
          notice = { kind: "ineligible", reasons };
        } else {
          notice = { kind: "error" };
        }
      } catch {
        notice = { kind: "error" };
      } finally {
        setBusyId(null);
      }
      setNotices((prev) => ({ ...prev, [job.jobRequestId]: notice }));
      if (notice.kind === "accepted" || notice.kind === "taken") reload();
    },
    [reload]
  );

  // Close the confirm dialog with Escape.
  useEffect(() => {
    if (!confirming) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirming(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirming]);

  const selectedJobs = selected ? byDay.get(selected) ?? [] : [];
  const selectedDate = selected ? new Date(`${selected}T12:00:00`) : null;

  return (
    <section className="jc" aria-labelledby="jc-title">
      <style>{STYLES}</style>
      <h1 id="jc-title" className="jc-title">{t.title}</h1>
      <p className="jc-sub">{t.sub}</p>

      {status === "signed_out" ? (
        <div className="jc-panel">
          <p>{t.signedOut}</p>
          <a className="jc-btn" href="/#auth-card">{t.signedOutCta}</a>
        </div>
      ) : (
        <>
          {banner ? <BannerView notice={banner} t={t} onClose={() => setBanner(null)} /> : null}

          <div className="jc-cal">
            <div className="jc-head">
              <button type="button" className="jc-nav" aria-label={t.prev} onClick={() => changeMonth(-1)}>
                <span aria-hidden="true">{lang === "ar" ? "›" : "‹"}</span>
              </button>
              <h2 className="jc-month" aria-live="polite">{monthLabel}</h2>
              <button type="button" className="jc-nav" aria-label={t.next} onClick={() => changeMonth(1)}>
                <span aria-hidden="true">{lang === "ar" ? "‹" : "›"}</span>
              </button>
            </div>
            <div className="jc-grid">
              {weekdays.map((w, i) => (
                <div key={`w${i}`} className="jc-wd" aria-hidden="true">{w}</div>
              ))}
              {cells.map((date, i) => {
                if (!date) return <div key={`b${i}`} className="jc-cell jc-blank" aria-hidden="true" />;
                const key = dayKey(date);
                const count = byDay.get(key)?.length ?? 0;
                const dayHasBonus = (byDay.get(key) ?? []).some(hasBonus);
                const isToday = key === todayKey;
                const isPast = key < todayKey;
                const isSelected = key === selected;
                const cls = [
                  "jc-cell",
                  isToday ? "jc-today" : "",
                  isPast ? "jc-past" : "",
                  isSelected ? "jc-selected" : "",
                  count > 0 ? "jc-has" : ""
                ].join(" ");
                return (
                  <button
                    key={key}
                    type="button"
                    className={cls}
                    aria-pressed={isSelected}
                    aria-current={isToday ? "date" : undefined}
                    aria-label={`${dayFmt.format(date)}${count > 0 ? `, ${t.dayCount(count)}` : ""}${dayHasBonus ? `, ${t.bonusDay}` : ""}`}
                    onClick={() => {
                      setSelected(key);
                      setBanner(null);
                    }}
                  >
                    {dayHasBonus ? <span className="jc-star" aria-hidden="true">★</span> : null}
                    <span className="jc-num">{date.getDate()}</span>
                    {count > 0 ? <span className="jc-badge">{count}</span> : <span className="jc-badge-empty" />}
                  </button>
                );
              })}
            </div>
            {status === "loading" ? <p className="jc-note">{t.loading}</p> : null}
          </div>

          {status === "error" ? (
            <div className="jc-panel" role="alert">
              <p>{t.loadError}</p>
              <button type="button" className="jc-btn" onClick={reload}>{t.retry}</button>
            </div>
          ) : null}

          {status === "ready" && jobs.length === 0 ? <p className="jc-note">{t.noJobsMonth}</p> : null}

          {status === "ready" ? (
            <div className="jc-list" aria-live="polite">
              {selected && selectedDate ? (
                <>
                  <h3 className="jc-day-title">
                    {selectedJobs.length > 0 ? t.jobsOn(selectedJobs.length, dayFmt.format(selectedDate)) : dayFmt.format(selectedDate)}
                  </h3>
                  {selectedJobs.length === 0 ? <p className="jc-note">{t.noJobsDay}</p> : null}
                  {selectedJobs.map((job) => {
                    const notice = notices[job.jobRequestId];
                    const busy = busyId === job.jobRequestId;
                    const bonus = bonusLabel(job, t);
                    return (
                      <article key={job.jobRequestId} className="jc-card">
                        <div className="jc-card-top">
                          <h4 className="jc-role">{job.role}</h4>
                          {job.urgency && job.urgency !== "standard" ? <span className="jc-urgent">{t.urgent}</span> : null}
                        </div>
                        <p className="jc-meta">📍 {job.areaLabel}</p>
                        <p className="jc-meta">
                          🕒 <bdi>{timeFmt.format(new Date(job.startAt))} – {timeFmt.format(new Date(job.endAt))}</bdi>
                        </p>
                        <div className="jc-facts">
                          {job.workerRateMinor !== null && job.workerRateMinor !== undefined ? (
                            <span className="jc-pay"><bdi>{t.perHour(formatAmount(job.workerRateMinor))}</bdi></span>
                          ) : null}
                          {bonus ? <span className="jc-bonus"><span aria-hidden="true">★ </span><bdi>{bonus}</bdi></span> : null}
                          <span className="jc-places">{t.places(job.placesLeft)}</span>
                        </div>
                        {notice ? <NoticeView notice={notice} t={t} /> : null}
                        <div className="jc-actions">
                          <button type="button" className="jc-btn" disabled={busy} onClick={() => setConfirming(job)}>
                            {busy ? t.accepting : t.accept}
                          </button>
                          <a className="jc-link" href={`/jobs/${encodeURIComponent(job.jobRequestId)}`}>{t.details}</a>
                        </div>
                      </article>
                    );
                  })}
                </>
              ) : (
                <p className="jc-note">{t.pickDay}</p>
              )}
            </div>
          ) : null}
        </>
      )}

      {confirming ? (
        <div className="jc-overlay" onClick={() => setConfirming(null)}>
          <div
            className="jc-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="jc-confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="jc-confirm-title">{t.confirmTitle}</h3>
            <p className="jc-dialog-job">
              <strong>{confirming.role}</strong> · {confirming.areaLabel}
              <br />
              <bdi>
                {dayFmt.format(new Date(confirming.startAt))}, {timeFmt.format(new Date(confirming.startAt))} –{" "}
                {timeFmt.format(new Date(confirming.endAt))}
              </bdi>
            </p>
            <p>{t.confirmBody}</p>
            <div className="jc-dialog-actions">
              <button type="button" className="jc-btn-ghost" onClick={() => setConfirming(null)}>{t.confirmNo}</button>
              <button type="button" className="jc-btn" autoFocus onClick={() => void accept(confirming)}>{t.confirmYes}</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

type Text = (typeof TEXT)[Lang];

function BannerView({ notice, t, onClose }: { notice: Notice; t: Text; onClose: () => void }) {
  if (notice.kind === "accepted") {
    return (
      <div className="jc-banner jc-ok" role="status">
        <span>✓ {t.accepted}</span>
        <a className="jc-banner-link" href="/schedule">{t.goSchedule}</a>
        <button type="button" className="jc-x" aria-label="×" onClick={onClose}>×</button>
      </div>
    );
  }
  if (notice.kind === "taken") {
    return (
      <div className="jc-banner jc-warn" role="status">
        <span>{t.taken}</span>
        <button type="button" className="jc-x" aria-label="×" onClick={onClose}>×</button>
      </div>
    );
  }
  return null;
}

function NoticeView({ notice, t }: { notice: Notice; t: Text }) {
  if (notice.kind === "election") {
    return (
      <div className="jc-notice" role="alert">
        <p>{t.election}</p>
        <a href="/onboarding">{t.finishSetup}</a>
      </div>
    );
  }
  if (notice.kind === "ineligible") {
    const reasons = notice.reasons.length > 0 ? notice.reasons : ["other"];
    const needsSetup = reasons.some((r) => ONBOARDING_REASONS.has(r));
    const hasOffer = reasons.includes("active_offer_exists");
    return (
      <div className="jc-notice" role="alert">
        <p>{t.ineligibleIntro}</p>
        <ul>
          {reasons.map((r) => (
            <li key={r}>{t.reasons[r] ?? t.reasons.other}</li>
          ))}
        </ul>
        {needsSetup ? <a href="/onboarding">{t.finishSetup}</a> : null}
        {hasOffer ? <a href="/offers">{t.seeOffers}</a> : null}
      </div>
    );
  }
  if (notice.kind === "error") {
    return (
      <div className="jc-notice" role="alert">
        <p>{t.error}</p>
      </div>
    );
  }
  return null;
}

const STYLES = `
.jc { color: #f4efe4; max-width: 760px; margin: 0 auto; padding: 8px 0 40px; }
.jc-title { font-size: 1.6rem; margin: 8px 0 4px; color: #f4efe4; }
.jc-sub { margin: 0 0 16px; color: rgba(244,239,228,0.75); line-height: 1.45; }
.jc-cal { background: #141414; border: 1px solid rgba(248,184,8,0.25); border-radius: 16px; padding: 12px; }
.jc-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.jc-month { margin: 0; font-size: 1.1rem; text-transform: capitalize; color: #f4efe4; text-align: center; flex: 1; }
.jc-nav { width: 40px; height: 40px; border-radius: 999px; border: 1px solid rgba(248,184,8,0.5); background: transparent; color: #f8b808; font-size: 1.4rem; line-height: 1; cursor: pointer; }
.jc-nav:hover, .jc-nav:focus-visible { background: rgba(248,184,8,0.12); }
.jc-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
.jc-wd { text-align: center; font-size: 0.75rem; font-weight: 600; color: rgba(244,239,228,0.6); padding: 4px 0; }
.jc-cell { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; min-height: 46px; padding: 4px 0; border-radius: 10px; border: 1px solid transparent; background: rgba(255,255,255,0.04); color: #f4efe4; font: inherit; cursor: pointer; }
.jc-cell:hover, .jc-cell:focus-visible { border-color: rgba(248,184,8,0.6); outline: none; }
.jc-blank { background: transparent; cursor: default; }
.jc-num { font-size: 0.9rem; font-weight: 600; }
.jc-past { opacity: 0.4; }
.jc-today { border-color: #f8b808; }
.jc-today .jc-num { color: #f8b808; }
.jc-selected { background: #f8b808; color: #111; border-color: #f8b808; opacity: 1; }
.jc-selected .jc-num { color: #111; }
.jc-badge { min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; background: #f8b808; color: #111; font-size: 0.7rem; font-weight: 700; line-height: 18px; text-align: center; }
.jc-selected .jc-badge { background: #111; color: #f8b808; }
.jc-badge-empty { height: 18px; }
.jc-note { color: rgba(244,239,228,0.75); margin: 12px 0 0; }
.jc-panel { margin-top: 12px; background: #141414; border: 1px solid rgba(248,184,8,0.3); border-radius: 16px; padding: 16px; }
.jc-panel p { margin: 0 0 12px; }
.jc-list { margin-top: 16px; display: flex; flex-direction: column; gap: 12px; }
.jc-day-title { margin: 0; font-size: 1.05rem; color: #f4efe4; }
.jc-card { background: #fff; color: #1a1a1a; border-radius: 14px; padding: 14px; box-shadow: 0 2px 10px rgba(0,0,0,0.3); }
.jc-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.jc-role { margin: 0 0 6px; font-size: 1.05rem; color: #111; }
.jc-urgent { flex: none; background: #c62828; color: #fff; font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 999px; text-transform: uppercase; }
.jc-meta { margin: 2px 0; color: #444; font-size: 0.92rem; }
.jc-facts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.jc-pay { background: #111; color: #f8b808; font-weight: 700; padding: 3px 10px; border-radius: 999px; font-size: 0.85rem; }
.jc-bonus { background: #F8B808; color: #111; font-weight: 800; padding: 3px 10px; border-radius: 999px; font-size: 0.85rem; }
.jc-star { position: absolute; top: 2px; inset-inline-end: 4px; color: #F8B808; font-size: 0.75rem; line-height: 1; }
.jc-selected .jc-star { color: #111; }
.jc-places { background: #fdf3d4; color: #6b4e00; font-weight: 600; padding: 3px 10px; border-radius: 999px; font-size: 0.85rem; }
.jc-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 12px; }
.jc-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 18px; border-radius: 999px; border: 0; background: #f8b808; color: #111; font: inherit; font-weight: 700; text-decoration: none; cursor: pointer; }
.jc-btn:disabled { opacity: 0.6; cursor: wait; }
.jc-btn:focus-visible, .jc-btn-ghost:focus-visible { outline: 2px solid #f4efe4; outline-offset: 2px; }
.jc-btn-ghost { min-height: 44px; padding: 0 18px; border-radius: 999px; border: 1px solid #999; background: transparent; color: #333; font: inherit; font-weight: 600; cursor: pointer; }
.jc-link { color: #6b4e00; font-weight: 600; font-size: 0.9rem; }
.jc-notice { margin-top: 10px; padding: 10px 12px; border-radius: 10px; background: #fff4e5; border: 1px solid #f0b46a; color: #5a3400; font-size: 0.9rem; }
.jc-notice p { margin: 0 0 4px; }
.jc-notice ul { margin: 4px 0; padding-inline-start: 20px; }
.jc-notice a { display: inline-block; margin-top: 4px; margin-inline-end: 12px; color: #5a3400; font-weight: 700; }
.jc-banner { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 12px; padding: 12px 14px; border-radius: 12px; font-weight: 600; }
.jc-ok { background: #e8f5e9; color: #1b5e20; }
.jc-warn { background: #fff4e5; color: #5a3400; }
.jc-banner span { flex: 1 1 200px; }
.jc-banner-link { color: inherit; font-weight: 700; }
.jc-x { background: transparent; border: 0; color: inherit; font-size: 1.3rem; line-height: 1; cursor: pointer; padding: 0 4px; }
.jc-overlay { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(0,0,0,0.7); }
.jc-dialog { width: 100%; max-width: 420px; background: #fff; color: #1a1a1a; border-radius: 16px; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
.jc-dialog h3 { margin: 0 0 10px; color: #111; }
.jc-dialog p { margin: 0 0 10px; line-height: 1.45; }
.jc-dialog-job { background: #f6f3ea; border-radius: 10px; padding: 10px 12px; font-size: 0.92rem; }
.jc-dialog-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
@media (min-width: 640px) {
  .jc-cell { min-height: 64px; }
  .jc-num { font-size: 1rem; }
  .jc-cal { padding: 16px; }
}
`;
