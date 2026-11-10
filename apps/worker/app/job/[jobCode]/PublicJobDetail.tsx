"use client";

import { useEffect, useState } from "react";
import { useLocale } from "../../i18n/LocaleProvider";
import { workerPayLabel } from "../../workerPayLabel";
import { publicJobPath, signUpReturningTo } from "../../safeReturnPath";
import { JoblopJobBadge } from "../../JobSourceBadge";

// Public job details for signed-out visitors: what (the role), where (city and province only, never
// the exact address), when, places left and the worker's OWN pay. Never the employer, the employer
// rate or Joblop's share (the API does not send them). The main button sends the visitor to worker
// sign-up and brings them back to this job afterwards; a signed-in worker is taken straight to the
// real job page, where they can take it.

type PublicJob = {
  jobCode: string;
  role: string;
  areaLabel: string;
  startAt: string;
  endAt: string;
  timezone: string;
  urgency: string;
  openings: number;
  workerRateMinor?: number | null;
  currency?: string | null;
  payOffered?: unknown;
};

const TEXT = {
  en: {
    loading: "Loading…",
    notFound: "This job is no longer available. It may be full or closed.",
    error: "We couldn't load this job. Please try again.",
    backToSearch: "See other jobs",
    badge: "Joblop job",
    where: "Where",
    when: "When",
    pay: "Your pay",
    places: "Places left",
    urgent: "Urgent",
    exactAddress: "You get the exact address once you have the shift.",
    takeIt: "Create an account to take this job",
    haveAccount: "Already have an account?",
    signIn: "Sign in",
    free: "Free for workers. It takes one minute, then you come back to this job.",
    opening: "Opening the job…",
    paidByEmployer: "paid directly by the employer",
    employerPaysDirectly: "Pay set and paid directly by the employer",
    pending: "Hourly pay: confirmed before you're offered the shift"
  },
  fr: {
    loading: "Chargement…",
    notFound: "Cet emploi n'est plus offert. Il est peut-être complet ou fermé.",
    error: "Impossible de charger cet emploi. Veuillez réessayer.",
    backToSearch: "Voir d'autres emplois",
    badge: "Emploi Joblop",
    where: "Où",
    when: "Quand",
    pay: "Votre salaire",
    places: "Places restantes",
    urgent: "Urgent",
    exactAddress: "Vous recevez l'adresse exacte une fois le quart obtenu.",
    takeIt: "Créez un compte pour prendre cet emploi",
    haveAccount: "Vous avez déjà un compte?",
    signIn: "Se connecter",
    free: "Gratuit pour les travailleurs. Ça prend une minute, puis vous revenez à cet emploi.",
    opening: "Ouverture de l'emploi…",
    paidByEmployer: "payé directement par l'employeur",
    employerPaysDirectly: "Salaire fixé et payé directement par l'employeur",
    pending: "Salaire horaire : confirmé avant qu'on vous offre le quart"
  },
  ar: {
    loading: "جارٍ التحميل…",
    notFound: "هذه الوظيفة لم تعد متاحة. ربما اكتملت أو أُغلقت.",
    error: "تعذّر تحميل هذه الوظيفة. يرجى المحاولة مرة أخرى.",
    backToSearch: "شاهد وظائف أخرى",
    badge: "وظيفة Joblop",
    where: "أين",
    when: "متى",
    pay: "أجرك",
    places: "الأماكن المتبقية",
    urgent: "عاجل",
    exactAddress: "تحصل على العنوان الدقيق بعد حصولك على المناوبة.",
    takeIt: "أنشئ حسابًا لتأخذ هذه الوظيفة",
    haveAccount: "لديك حساب بالفعل؟",
    signIn: "تسجيل الدخول",
    free: "مجاني للعمال. يستغرق دقيقة واحدة، ثم تعود إلى هذه الوظيفة.",
    opening: "جارٍ فتح الوظيفة…",
    paidByEmployer: "يدفعه صاحب العمل مباشرة",
    employerPaysDirectly: "يحدد صاحب العمل الأجر ويدفعه مباشرة",
    pending: "الأجر بالساعة: يُؤكَّد قبل أن تُعرض عليك المناوبة"
  }
};

function formatShift(job: PublicJob, intlLocale: string): string {
  const timeZone = (() => {
    try {
      new Intl.DateTimeFormat("en-CA", { timeZone: job.timezone });
      return job.timezone;
    } catch {
      return "America/Toronto";
    }
  })();
  const start = new Date(job.startAt);
  const end = new Date(job.endAt);
  const day = new Intl.DateTimeFormat(intlLocale, { timeZone, weekday: "long", month: "long", day: "numeric" }).format(start);
  const time = new Intl.DateTimeFormat(intlLocale, { timeZone, hour: "numeric", minute: "2-digit" });
  return `${day} · ${time.format(start)} – ${time.format(end)}`;
}

export function PublicJobDetail({ jobCode }: { jobCode: string }) {
  const locale = useLocale();
  const lang = locale === "ar" ? "ar" : locale.startsWith("fr") ? "fr" : "en";
  const t = TEXT[lang];
  const intlLocale = lang === "fr" ? "fr-CA" : lang === "ar" ? "ar-u-nu-latn" : "en-CA";
  const moneyLocale = lang === "fr" ? "fr-CA" : "en-CA";
  const [status, setStatus] = useState<"loading" | "ready" | "not_found" | "error" | "redirecting">("loading");
  const [job, setJob] = useState<PublicJob | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      // A signed-in worker goes straight to the real job page, where they can take it.
      try {
        const session = await fetch("/api/session", { cache: "no-store" });
        if (session.ok) {
          const resolved = await fetch(`/api/job-codes/${encodeURIComponent(jobCode)}`, { cache: "no-store" });
          const body = (await resolved.json().catch(() => null)) as { jobRequestId?: unknown } | null;
          const id = typeof body?.jobRequestId === "string" ? body.jobRequestId : null;
          if (resolved.ok && id && /^[0-9a-f-]{36}$/i.test(id)) {
            if (!active) return;
            setStatus("redirecting");
            window.location.replace(`/jobs/${encodeURIComponent(id)}`);
            return;
          }
        }
      } catch {
        /* fall through to the public view */
      }
      try {
        const res = await fetch(`/api/public/jobs/${encodeURIComponent(jobCode)}`, { cache: "no-store" });
        if (!active) return;
        if (res.status === 404) return setStatus("not_found");
        if (!res.ok) return setStatus("error");
        const body = (await res.json()) as { job?: PublicJob };
        if (!body.job) return setStatus("not_found");
        setJob(body.job);
        setStatus("ready");
      } catch {
        if (active) setStatus("error");
      }
    })();
    return () => {
      active = false;
    };
  }, [jobCode]);

  if (status === "loading") return <div className="state">{t.loading}</div>;
  if (status === "redirecting") return <div className="state">{t.opening}</div>;
  if (status === "not_found" || status === "error" || !job)
    return (
      <div className={status === "error" ? "state error" : "state"} role={status === "error" ? "alert" : undefined}>
        {status === "error" ? t.error : t.notFound}
        <div style={{ marginTop: 12 }}>
          <a className="btn" href="/browse">{t.backToSearch}</a>
        </div>
      </div>
    );

  const back = publicJobPath(job.jobCode);
  const urgent = job.urgency === "urgent" || job.urgency === "immediate";
  return (
    <article className="detail">
      <div className="detail-head">
        <div>
          <JoblopJobBadge />
          <span className="chip" style={{ marginInlineStart: 8 }}>{t.badge}</span>
          {urgent ? <span className="chip" style={{ marginInlineStart: 8 }}>{t.urgent}</span> : null}
          <h1>{job.role}</h1>
        </div>
      </div>

      <div className="detail-facts">
        <div className="fact">
          <span className="fact-label">{t.where}</span>
          <span className="fact-value"><bdi>{job.areaLabel}</bdi></span>
        </div>
        <div className="fact">
          <span className="fact-label">{t.when}</span>
          <span className="fact-value"><bdi>{formatShift(job, intlLocale)}</bdi></span>
        </div>
        <div className="fact">
          <span className="fact-label">{t.pay}</span>
          <span className="fact-value"><bdi>{workerPayLabel(job, moneyLocale, t)}</bdi></span>
        </div>
        <div className="fact">
          <span className="fact-label">{t.places}</span>
          <span className="fact-value">{job.openings}</span>
        </div>
      </div>
      <p className="notice">{t.exactAddress}</p>

      <section className="detail-section interest">
        <a className="btn" href={signUpReturningTo(back)}>{t.takeIt}</a>
        <p className="muted" style={{ marginTop: 10 }}>{t.free}</p>
        <p className="muted">
          {t.haveAccount} <a href={signUpReturningTo(back, "signin")}>{t.signIn}</a>
        </p>
      </section>
    </article>
  );
}
