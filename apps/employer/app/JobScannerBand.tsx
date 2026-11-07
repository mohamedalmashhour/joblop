import { getRuntimeConfig } from "@rwos/config";

// Live JobScanner on the main landing page. Anyone can search and see real job postings scanned from
// partner job boards (no account). Opening a job sends the visitor to the worker side to create an
// account / sign in with a phone code first, so Joblop owns the worker relationship.

type Lang = "en" | "fr" | "ar";

type Lead = Readonly<{
  title: string;
  employer?: string | null;
  areaLabel: string;
  salaryMinMinor?: number | null;
  salaryMaxMinor?: number | null;
  salaryPeriod?: string | null;
  postedAt?: string | null;
}>;

const TEXT: Record<Lang, Record<string, string>> = {
  en: {
    tag: "Live job scanner",
    title: "Jobs are waiting. Search them now, free.",
    copy: "We scan job boards all day for real openings: cleaning, warehouse, retail, kitchens, driving, construction, care, events and more.",
    placeholder: "What work? e.g. cleaner, driver, cook",
    search: "Scan jobs",
    found: "jobs found right now",
    open: "See job",
    gate: "Create a free account or sign in with your phone to open a job and apply.",
    cta: "Create free account",
    empty: "No match for that search yet. Try another word.",
    all: "Show all",
    posted: "Posted",
    source: "Scanned from partner job boards"
  },
  fr: {
    tag: "Scanner d’emplois en direct",
    title: "Des emplois vous attendent. Cherchez maintenant, gratuitement.",
    copy: "Nous scannons les sites d’emploi toute la journée : entretien, entrepôt, commerce, cuisine, livraison, construction, soins, événements et plus.",
    placeholder: "Quel travail? ex. entretien, chauffeur, cuisinier",
    search: "Scanner",
    found: "emplois trouvés en ce moment",
    open: "Voir l’emploi",
    gate: "Créez un compte gratuit ou connectez-vous avec votre téléphone pour ouvrir un emploi et postuler.",
    cta: "Créer un compte gratuit",
    empty: "Aucun résultat pour cette recherche. Essayez un autre mot.",
    all: "Tout afficher",
    posted: "Publié",
    source: "Scanné depuis des sites d’emploi partenaires"
  },
  ar: {
    tag: "ماسح الوظائف المباشر",
    title: "الوظائف بانتظارك. ابحث الآن مجانًا.",
    copy: "نمسح مواقع الوظائف طوال اليوم بحثًا عن فرص حقيقية: تنظيف، مستودعات، متاجر، مطابخ، قيادة، بناء، رعاية، فعاليات والمزيد.",
    placeholder: "ما العمل؟ مثل: تنظيف، سائق، طباخ",
    search: "امسح الوظائف",
    found: "وظيفة متاحة الآن",
    open: "عرض الوظيفة",
    gate: "أنشئ حسابًا مجانيًا أو سجّل الدخول برقم هاتفك لفتح الوظيفة والتقديم.",
    cta: "أنشئ حسابًا مجانيًا",
    empty: "لا نتائج لهذا البحث بعد. جرّب كلمة أخرى.",
    all: "عرض الكل",
    posted: "نُشر",
    source: "ممسوحة من مواقع وظائف شريكة"
  }
};

function pay(l: Lead): string | null {
  const min = l.salaryMinMinor ?? null;
  const max = l.salaryMaxMinor ?? null;
  if (!min && !max) return null;
  const hourly = l.salaryPeriod === "hour" || ((max ?? min ?? 0) < 20000);
  const fmt = (v: number) => (hourly ? `$${(v / 100).toFixed(2).replace(/\.00$/, "")}` : `$${Math.round(v / 100000)}k`);
  const range = min && max && min !== max ? `${fmt(min)}–${fmt(max)}` : fmt((max ?? min) as number);
  return hourly ? `${range}/h` : `${range}/yr`;
}

async function fetchLeads(q: string): Promise<{ leads: Lead[]; total: number }> {
  try {
    const params = new URLSearchParams({ limit: "6" });
    if (q) params.set("q", q);
    const res = await fetch(`${getRuntimeConfig().internalApiOrigin}/public/jobscanner/leads?${params.toString()}`, {
      headers: { accept: "application/json" },
      next: { revalidate: 300 }
    });
    if (!res.ok) return { leads: [], total: 0 };
    const body = (await res.json()) as { leads?: Lead[]; total?: number };
    return { leads: Array.isArray(body.leads) ? body.leads : [], total: body.total ?? 0 };
  } catch {
    return { leads: [], total: 0 };
  }
}

export async function JobScannerBand({ lang, q, workerAppUrl }: { lang: Lang; q: string; workerAppUrl: string }) {
  const t = TEXT[lang];
  const { leads, total } = await fetchLeads(q);
  const signUp = workerAppUrl;
  return (
    <section id="scanner" aria-labelledby="scanner-title" className="scan-band" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="scan-inner">
        <span className="scan-tag">
          <span className="scan-dot" aria-hidden="true" /> {t.tag}
        </span>
        <h2 id="scanner-title" className="scan-title">{t.title}</h2>
        <p className="scan-copy">{t.copy}</p>
        <form className="scan-form" action="/#scanner" method="get" role="search">
          <input name="scan" defaultValue={q} placeholder={t.placeholder} aria-label={t.placeholder} maxLength={80} />
          <button type="submit">{t.search}</button>
        </form>
        <p className="scan-count" aria-live="polite">
          <strong>{total}</strong> {t.found}
          {q ? (
            <>
              {" · "}
              <a href="/#scanner">{t.all}</a>
            </>
          ) : null}
        </p>
        {leads.length === 0 ? (
          <p className="scan-empty">{t.empty}</p>
        ) : (
          <div className="scan-grid">
            {leads.map((l, i) => {
              const p = pay(l);
              return (
                <a key={`${l.title}-${i}`} href={signUp} className="scan-card" title={t.gate}>
                  <strong>{l.title}</strong>
                  <span className="scan-meta">
                    {l.employer ? `${l.employer} · ` : ""}📍 {l.areaLabel}
                  </span>
                  <span className="scan-foot">
                    {p ? <em>{p}</em> : <span />}
                    <span className="scan-open">{t.open} →</span>
                  </span>
                </a>
              );
            })}
          </div>
        )}
        <div className="scan-gate">
          <p>🔒 {t.gate}</p>
          <a href={signUp}>{t.cta}</a>
        </div>
        <p className="scan-source">{t.source}</p>
      </div>
    </section>
  );
}
