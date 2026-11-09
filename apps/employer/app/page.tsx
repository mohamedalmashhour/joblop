import type { CSSProperties } from "react";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, resolveEmployerLocale } from "./i18n/config";
import { getLandingContent, type LandingContent } from "./landingContent";
import { LogoIntro } from "./LogoIntro";
import { VideoCard } from "./VideoCard";
import { JobLopLogo } from "./JobLopLogo";
import { HeaderNav } from "./HeaderNav";
import { EmployerFlowMovie } from "./EmployerFlowMovie";
import { LanguageSwitcher } from "./i18n/LanguageSwitcher";
import { JobScannerBand } from "./JobScannerBand";
import { PlatformLoopMovie } from "./PlatformLoopMovie";
import { homeFaqAnchors } from "./faq/faqContent";
import { PublicSiteFooter } from "./pricing/publicPageStyles";

async function resolveLocale() {
  const store = await cookies();
  return resolveEmployerLocale(store.get(LOCALE_COOKIE)?.value);
}

function CheckTile({ size = 34 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        alignItems: "center",
        background: "#0c0c0c",
        borderRadius: 9,
        display: "inline-flex",
        flex: "none",
        height: size,
        justifyContent: "center",
        width: size
      }}
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none">
        <path
          d="M5 12.5l4.2 4.2L19 6.7"
          stroke="#2a2114"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function StoreBadge({ kind, store }: { kind: "apple" | "google"; store: LandingContent["store"] }) {
  // The native apps are not published yet, so these badges are presentational only —
  // rendered as a non-interactive element (not a dead placeholder link) to keep the UI honest.
  return (
    <span
      role="img"
      aria-label={kind === "apple" ? store.apple.aria : store.google.aria}
      style={{ ...hx.badge, cursor: "default" }}
    >
      <span aria-hidden="true" style={{ display: "inline-flex", lineHeight: 1 }}>
        {kind === "apple" ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
            <path d="M4 3.5v17l9-8.5-9-8.5z" />
          </svg>
        )}
      </span>
      <span style={{ display: "grid", lineHeight: 1.1 }}>
        <span style={{ fontSize: 9, opacity: 0.85 }}>
          {kind === "apple" ? store.apple.line : store.google.line}
        </span>
        <strong style={{ fontSize: 15 }}>{kind === "apple" ? store.apple.name : store.google.name}</strong>
      </span>
    </span>
  );
}

function PhoneMockup({ p }: { p: LandingContent["heroPhone"] }) {
  return (
    <div aria-hidden="true" style={hx.phone}>
      <div style={{ fontSize: 13, color: "#b3a894" }}>{p.greeting}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#f4efe4", margin: "2px 0 16px" }}>
        {p.prompt}
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ background: "#e0a500", color: "#fff", borderRadius: 14, padding: 16 }}>
          <strong>{p.findWork}</strong>
          <div style={{ fontSize: 12, opacity: 0.85 }}>{p.findWorkSub}</div>
        </div>
        <div style={{ background: "#15110b", color: "#fff", borderRadius: 14, padding: 16 }}>
          <strong>{p.findPeople}</strong>
          <div style={{ fontSize: 12, opacity: 0.85 }}>{p.findPeopleSub}</div>
        </div>
      </div>
      <div style={{ marginTop: 16, fontSize: 13, fontWeight: 700, color: "#f4efe4" }}>
        {p.popular}
      </div>
      <div style={hx.phoneJob}>
        <div>
          <strong style={{ fontSize: 13 }}>{p.jobTitle}</strong>
          <div style={{ fontSize: 11, color: "#b3a894" }}>{p.jobMeta}</div>
        </div>
        <div style={{ fontWeight: 800, fontSize: 13 }}>{p.jobPay}</div>
      </div>
    </div>
  );
}

const hx: Record<string, CSSProperties> = {
  hero: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 44,
    alignItems: "center",
    maxWidth: 1200,
    margin: "0 auto",
    padding: "32px clamp(20px, 5vw, 64px) 56px"
  },
  heroCopy: { minWidth: 0 },
  h1: {
    fontSize: "clamp(40px, 6vw, 66px)",
    lineHeight: 1.03,
    letterSpacing: "-0.03em",
    fontWeight: 800,
    color: "#f4efe4",
    margin: 0
  },
  lede: { fontSize: 18, color: "#b3a894", margin: "22px 0 0", maxWidth: 440, lineHeight: 1.6 },
  chips: {
    display: "flex",
    gap: 22,
    flexWrap: "wrap",
    listStyle: "none",
    padding: 0,
    margin: "22px 0 0"
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 700,
    color: "#f4efe4",
    fontSize: 15
  },
  chipDot: {
    width: 22,
    height: 22,
    borderRadius: 999,
    background: "#e0a500",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "none"
  },
  ctaRow: { display: "flex", gap: 14, margin: "28px 0 0", flexWrap: "wrap" },
  ctaPrimary: {
    background: "#e0a500",
    color: "#ffffff",
    padding: "15px 26px",
    borderRadius: 12,
    fontWeight: 700,
    fontSize: 16,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    boxShadow: "0 14px 30px rgba(37,99,235,0.28)"
  },
  ctaOutline: {
    background: "#000000",
    color: "#f4efe4",
    border: "1.5px solid rgba(248, 184, 8, 0.16)",
    padding: "15px 26px",
    borderRadius: 12,
    fontWeight: 700,
    fontSize: 16,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: 10
  },
  storeWrap: { margin: "28px 0 0" },
  storeLabel: {
    fontSize: 12,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#b3a894",
    fontWeight: 700,
    margin: "0 0 10px"
  },
  storeRow: { display: "flex", gap: 12, flexWrap: "wrap" },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    background: "#15110b",
    color: "#ffffff",
    borderRadius: 11,
    padding: "9px 18px",
    textDecoration: "none"
  },
  heroVisual: {
    position: "relative",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 460
  },
  phone: {
    width: 300,
    maxWidth: "100%",
    background: "#000000",
    borderRadius: 34,
    border: "10px solid rgba(248, 184, 8, 0.16)",
    boxShadow: "0 34px 80px rgba(11,31,63,0.28)",
    padding: "20px 16px 24px"
  },
  phoneJob: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    padding: "10px 12px",
    border: "1px solid rgba(248, 184, 8, 0.16)",
    borderRadius: 12
  },
  oppCard: {
    position: "absolute",
    bottom: 20,
    right: 0,
    background: "#000000",
    borderRadius: 14,
    boxShadow: "0 18px 45px rgba(11,31,63,0.16)",
    border: "1px solid rgba(248, 184, 8, 0.16)",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: 16
  },
  avatars: { display: "flex", alignItems: "center" },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 999,
    border: "2px solid rgba(248, 184, 8, 0.16)",
    display: "inline-block"
  },
  avatarMore: {
    background: "#15110b",
    color: "#ffffff",
    fontSize: 11,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "auto",
    padding: "0 8px",
    height: 30
  }
};

export default async function LandingPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const locale = await resolveLocale();
  const sp = (await searchParams) ?? {};
  const scanRaw = Array.isArray(sp.scan) ? sp.scan[0] : sp.scan;
  const scanQuery = (scanRaw ?? "").trim().slice(0, 80);
  const lang = locale === "ar" ? "ar" : locale.startsWith("fr") ? "fr" : "en";
  const c = getLandingContent(locale);
  const isProduction = process.env.RWOS_ENV === "production";
  const isStaging =
    process.env.RWOS_ENV === "staging" ||
    process.env.NEXT_PUBLIC_RWOS_DEPLOYMENT_TIER === "staging";
  // The worker side is a separate app; "Find work" leaves the employer app for the worker front door.
  const workerAppUrl = process.env.NEXT_PUBLIC_WORKER_APP_URL || "http://localhost:8090";
  const hireHref = isProduction ? "/contact" : "/signup/employer";
  return (
    <main style={styles.page}>
      <LogoIntro />
      {isStaging ? (
        <aside aria-label="Staging environment notice" role="status" style={styles.stagingBanner}>
          <strong>{c.staging.label}</strong>
          <span>{c.staging.synthetic}</span>
          <span>{c.staging.noPayment}</span>
          <span>{c.staging.noProdData}</span>
        </aside>
      ) : null}
      <header style={{ ...styles.header, position: "relative" }}>
        <a href="/" style={styles.brand} aria-label="Joblop home">
          <JobLopLogo height={30} />
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <LanguageSwitcher />
          <HeaderNav
            ctaHref={isProduction ? "/contact" : "/signup/employer"}
            ctaLabel={isProduction ? c.header.ctaRequestAccess : c.header.ctaGetStarted}
            links={c.header.navLinks}
            openLabel={c.header.openMenu}
            closeLabel={c.header.closeMenu}
            signIn={c.header.signIn}
          />
        </div>
      </header>

      <section style={hx.hero}>
        <div style={hx.heroCopy}>
          <h1 style={hx.h1}>
            {c.hero.line1}
            <br />
            {c.hero.line2}
            <br />
            <span style={{ color: "#e0a500" }}>{c.hero.line3}</span>
          </h1>
          <p style={hx.lede}>{c.hero.lede}</p>
          <ul style={hx.chips} aria-label="Why Joblop">
            {c.hero.chips.map((label) => (
              <li key={label} style={hx.chip}>
                <span aria-hidden="true" style={hx.chipDot}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12.5l4.2 4.2L19 6.7"
                      stroke="#fff"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                {label}
              </li>
            ))}
          </ul>
          <div style={hx.ctaRow}>
            <a href={workerAppUrl} style={hx.ctaPrimary}>
              {c.hero.ctaWork} <span aria-hidden="true">→</span>
            </a>
            <a href={hireHref} style={hx.ctaOutline}>
              {c.hero.ctaHire} <span aria-hidden="true">→</span>
            </a>
          </div>
          <div style={hx.storeWrap}>
            <p style={hx.storeLabel}>{c.hero.availableOn}</p>
            <div style={hx.storeRow}>
              <StoreBadge kind="apple" store={c.store} />
              <StoreBadge kind="google" store={c.store} />
            </div>
          </div>
        </div>

        <div style={hx.heroVisual}>
          <PhoneMockup p={c.heroPhone} />
          <div style={hx.oppCard}>
            <div>
              <strong style={{ display: "block", fontSize: 14, color: "#f4efe4" }}>
                {c.hero.oppTitle}
              </strong>
              <span style={{ fontSize: 13, color: "#b3a894" }}>{c.hero.oppAround}</span>
            </div>
            <div style={hx.avatars}>
              {["#f8b808", "#f5a97c", "#8fd4a8", "#ffcf3f"].map((c, i) => (
                <span key={c} style={{ ...hx.avatar, background: c, marginLeft: i ? -10 : 0 }} />
              ))}
              <span style={{ ...hx.avatar, ...hx.avatarMore, marginLeft: -10 }}>+2K</span>
            </div>
          </div>
        </div>
      </section>

      <PlatformLoopMovie lang={lang} />

      <JobScannerBand lang={lang} q={scanQuery} workerAppUrl={workerAppUrl} />

      <EmployerFlowMovie lang={lang} />

      <section aria-labelledby="media-title" className="media-band">
        <div className="media-band-inner">
          <div style={styles.centerHeader}>
            <p style={styles.eyebrowDark}>{c.media.eyebrow}</p>
            <h2 id="media-title" style={styles.sectionTitle}>
              {c.media.title}
            </h2>
            <p style={styles.sectionCopy}>{c.media.copy}</p>
          </div>
          <div className="media-band-grid">
            {c.media.clips.map((clip) => (
              <div key={clip.src}>
                <VideoCard
                  src={clip.src}
                  poster={clip.poster}
                  label={clip.label}
                  soundLabel={c.media.soundOn}
                  muteLabel={c.media.soundOff}
                  playLabel={c.media.play}
                  withSound={clip.withSound === true}
                />
                <p style={{ marginTop: 14, textAlign: "center", color: "#e8dfcc", fontWeight: 600, fontSize: 15 }}>{clip.caption}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="categories-title" style={styles.section}>
        <div style={styles.centerHeader}>
          <p style={styles.eyebrowDark}>{c.categories.eyebrow}</p>
          <h2 id="categories-title" style={styles.sectionTitle}>
            {c.categories.title}
          </h2>
          <p style={styles.sectionCopy}>{c.categories.copy}</p>
        </div>
        <div style={styles.capsuleGrid}>
          {c.categories.items.map((category) => (
            <article key={category.key} style={styles.capsuleCard}>
              <img
                src={capsulePhotos[category.key]}
                alt={`${category.name} staffing`}
                style={styles.capsulePhoto}
              />
              <div style={styles.capsuleBody}>
                <h3 style={styles.cardTitle}>{category.name}</h3>
                <p style={styles.cardText}>{category.roles}</p>
                <p style={styles.cardNote}>{category.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" aria-labelledby="workflow-title" style={styles.workflowBand}>
        <div style={styles.centerHeader}>
          <p style={styles.eyebrowDark}>{c.workflow.eyebrow}</p>
          <h2 id="workflow-title" style={styles.sectionTitle}>
            {c.workflow.title}
          </h2>
        </div>
        <div style={styles.timeline}>
          {c.workflow.steps.map((step) => (
            <span key={step} style={styles.timelineStep}>
              {step}
            </span>
          ))}
        </div>
      </section>

      <section id="employers" aria-labelledby="experiences-title" style={styles.section}>
        <div style={styles.centerHeader}>
          <p style={styles.eyebrowDark}>{c.experiences.eyebrow}</p>
          <h2 id="experiences-title" style={styles.sectionTitle}>
            {c.experiences.title}
          </h2>
        </div>
        <div style={styles.experienceGrid}>
          {c.experiences.pillars.map((pillar) => (
            <article key={pillar.key} style={styles.experienceCard}>
              <img
                src={pillarPhotos[pillar.key]}
                alt={`${pillar.label} experience`}
                style={styles.experiencePhoto}
              />
              <div style={styles.experienceBody}>
                <h3 style={styles.cardTitle}>{pillar.label}</h3>
                <ul style={styles.cleanList}>
                  {pillar.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      {!isProduction ? (
        <section aria-labelledby="preview-title" style={styles.previewBand}>
          <div style={styles.previewIntro}>
            <p style={styles.eyebrowDark}>{c.preview.eyebrow}</p>
            <h2 id="preview-title" style={styles.sectionTitle}>
              {c.preview.title}
            </h2>
            <p style={styles.sectionCopy}>{c.preview.copy}</p>
          </div>
          <div style={styles.previewGrid}>
            <DashboardPreview d={c.dashboard} />
            <WorkerPhonePreview rows={c.workerPhone} />
          </div>
        </section>
      ) : null}

      <section id="workers" aria-labelledby="workers-title" style={styles.section}>
        <div style={styles.centerHeader}>
          <p style={styles.eyebrowDark}>{c.workers.eyebrow}</p>
          <h2 id="workers-title" style={styles.sectionTitle}>
            {c.workers.title}
          </h2>
        </div>
        <div style={styles.benefitGrid}>
          {c.workers.benefits.map((benefit) => (
            <span key={benefit} style={styles.benefit}>
              {benefit}
            </span>
          ))}
        </div>
      </section>

      <section aria-labelledby="ai-title" style={styles.aiSection}>
        <div>
          <p style={styles.eyebrowDark}>{c.ai.eyebrow}</p>
          <h2 id="ai-title" style={styles.sectionTitle}>
            {c.ai.title}
          </h2>
        </div>
        <div style={styles.aiFlow}>
          {c.ai.flow.map(([title, text]) => (
            <FlowStep key={title} title={title} text={text} />
          ))}
        </div>
      </section>

      <section aria-labelledby="trust-title" style={styles.section}>
        <div style={styles.centerHeader}>
          <p style={styles.eyebrowDark}>{c.trust.eyebrow}</p>
          <h2 id="trust-title" style={styles.sectionTitle}>
            {c.trust.title}
          </h2>
        </div>
        <div style={styles.controlGrid}>
          {c.trust.controls.map((control) => (
            <article key={control} style={styles.controlCard}>
              <CheckTile size={44} />
              <h3 style={styles.smallTitle}>{control}</h3>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="journeys-title" style={styles.section}>
        <div style={styles.twoColumn}>
          <JourneyCard title={c.journeys.workerTitle} steps={c.journeys.worker} />
          <JourneyCard title={c.journeys.employerTitle} steps={c.journeys.employer} />
        </div>
      </section>

      <section id="faq" aria-labelledby="faq-title" style={styles.section}>
        <div style={styles.centerHeader}>
          <p style={styles.eyebrowDark}>{c.faq.eyebrow}</p>
          <h2 id="faq-title" style={styles.sectionTitle}>
            {c.faq.title}
          </h2>
        </div>
        <div style={styles.faqGrid}>
          {c.faq.questions.map((question, index) => (
            <article key={question} style={styles.faqItem}>
              <h3 style={styles.faqQuestion}>{question}</h3>
              <p style={styles.cardText}>{c.faq.readNote}</p>
              <a href={["/faq", homeFaqAnchors[index] ?? ""].join("#")} style={styles.textLink}>
                {c.faq.readLink}
              </a>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.ctaBand}>
        <div>
          <h2 style={styles.ctaTitle}>{c.cta.title}</h2>
          <p style={styles.ctaCopy}>{c.cta.copy}</p>
        </div>
        <div style={styles.ctaActions}>
          <a href={hireHref} style={styles.lightButton}>
            {isProduction ? c.cta.requestAccess : c.cta.hire}
          </a>
          <a href={workerAppUrl} style={styles.outlineLightButton}>
            {c.cta.findWork}
          </a>
        </div>
      </section>

      <PublicSiteFooter />
    </main>
  );
}

function DashboardPreview({ d }: { d: LandingContent["dashboard"] }) {
  return (
    <article style={styles.dashboardPreview} aria-label="Employer dashboard preview">
      <div style={styles.sidebar}>
        <strong>Joblop</strong>
        {d.nav.map((item, index) => (
          <span key={item} style={index === 0 ? styles.sidebarActive : styles.sidebarItem}>
            {item}
          </span>
        ))}
      </div>
      <div style={styles.dashboardCanvas}>
        <div style={styles.dashboardTop}>
          <div>
            <h3 style={styles.dashboardTitle}>{d.welcome}</h3>
            <p style={styles.dashboardSub}>{d.org}</p>
          </div>
          <a href="/employer/calendar/create" style={styles.miniButton}>
            {d.postShift}
          </a>
        </div>
        <div style={styles.metricGrid}>
          {d.metrics.map(([label, value]) => (
            <div key={label} style={styles.metricTile}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div style={styles.dashboardColumns}>
          <div style={styles.previewPanel}>
            <h4 style={styles.panelHeading}>{d.upcoming}</h4>
            {d.operations.map((op) => (
              <div key={op.role} style={styles.shiftRow}>
                <span>{op.role}</span>
                <strong style={op.filled ? styles.statusGreen : styles.statusAmber}>
                  {op.status}
                </strong>
              </div>
            ))}
          </div>
          <div style={styles.previewPanel}>
            <h4 style={styles.panelHeading}>{d.recentActivity}</h4>
            {d.activity.map((item) => (
              <p key={item} style={styles.activityLine}>
                {item}
              </p>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function WorkerPhonePreview({ rows }: { rows: LandingContent["workerPhone"] }) {
  return (
    <article style={styles.phoneCluster} aria-label="Worker mobile app preview">
      {rows.map(([heading, detail, meta]) => (
        <div key={heading} style={styles.phone}>
          <div style={styles.phoneTop} />
          <h3 style={styles.phoneTitle}>{heading}</h3>
          <p style={styles.phoneDetail}>{detail}</p>
          <strong style={styles.phoneMeta}>{meta}</strong>
          <div style={styles.phoneNav}>
            <span />
            <span />
            <span />
          </div>
        </div>
      ))}
    </article>
  );
}

function JourneyCard({ steps, title }: { steps: readonly string[]; title: string }) {
  return (
    <article style={styles.journeyCard}>
      <h3 style={styles.cardTitle}>{title}</h3>
      <ol style={styles.stepList}>
        {steps.map((step) => (
          <li key={step} style={styles.stepItem}>
            {step}
          </li>
        ))}
      </ol>
    </article>
  );
}

function FlowStep({ text, title }: { text: string; title: string }) {
  return (
    <article style={styles.flowStep}>
      <h3 style={styles.cardTitle}>{title}</h3>
      <p style={styles.cardText}>{text}</p>
    </article>
  );
}

const baseButton: CSSProperties = {
  alignItems: "center",
  borderRadius: 8,
  display: "inline-flex",
  fontSize: 14,
  fontWeight: 800,
  justifyContent: "center",
  minHeight: 42,
  padding: "0 16px",
  textDecoration: "none"
};

const styles: Record<string, CSSProperties> = {
  page: {
    background: "#000000",
    color: "#f4efe4",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    minHeight: "100vh"
  },
  stagingBanner: {
    alignItems: "center",
    background: "#0c0c0c",
    borderBottom: "1px solid #d49b00",
    color: "#684b00",
    display: "flex",
    flexWrap: "wrap",
    fontSize: 12,
    fontWeight: 800,
    gap: "8px 18px",
    padding: "8px clamp(20px, 5vw, 72px)"
  },
  header: {
    alignItems: "center",
    background: "rgba(0, 0, 0, 0.72)",
    borderBottom: "1px solid rgba(248, 184, 8, 0.16)",
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between",
    padding: "18px clamp(20px, 5vw, 72px)",
    position: "sticky",
    top: 0,
    zIndex: 10
  },
  brand: {
    alignItems: "center",
    color: "#f4efe4",
    display: "inline-flex",
    fontSize: 17,
    fontWeight: 900,
    gap: 10,
    textDecoration: "none"
  },
  brandMark: {
    alignItems: "center",
    display: "inline-flex",
    height: 34,
    justifyContent: "center",
    width: 34
  },
  brandWord: {
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: "-0.01em"
  },
  nav: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: 24
  },
  navLink: {
    color: "#f4efe4",
    fontSize: 13,
    fontWeight: 800,
    textDecoration: "none"
  },
  headerActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10
  },
  primaryButton: {
    ...baseButton,
    background: "#2a2114",
    boxShadow: "0 8px 18px rgba(8, 42, 102, 0.18)",
    color: "#ffffff"
  },
  ghostButton: {
    ...baseButton,
    background: "#000000",
    border: "1px solid rgba(248, 184, 8, 0.16)",
    color: "#f4efe4"
  },
  hero: {
    alignItems: "center",
    background: "linear-gradient(180deg, #000000 0%, #000000 74%, #0c0c0c 100%)",
    display: "grid",
    gap: 36,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
    padding: "clamp(42px, 7vw, 86px) clamp(20px, 5vw, 72px) 28px"
  },
  heroCopy: {
    maxWidth: 760
  },
  eyebrow: {
    color: "#9a7122",
    fontSize: 13,
    fontWeight: 900,
    letterSpacing: 0,
    margin: 0,
    textTransform: "uppercase"
  },
  eyebrowDark: {
    color: "#9a7122",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0,
    margin: 0,
    textTransform: "uppercase"
  },
  title: {
    color: "#f4efe4",
    fontSize: "clamp(42px, 6vw, 74px)",
    letterSpacing: 0,
    lineHeight: 1.02,
    margin: "14px 0 18px",
    maxWidth: 860
  },
  lede: {
    color: "#b3a894",
    fontSize: 18,
    lineHeight: 1.62,
    margin: 0,
    maxWidth: 720
  },
  heroActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 28
  },
  primaryButtonLarge: {
    ...baseButton,
    background: "#9a7122",
    boxShadow: "0 14px 30px rgba(11, 74, 162, 0.22)",
    color: "#ffffff",
    minHeight: 54,
    padding: "0 24px"
  },
  secondaryButtonLarge: {
    ...baseButton,
    background: "#0f7f56",
    boxShadow: "0 14px 30px rgba(15, 127, 86, 0.18)",
    color: "#ffffff",
    minHeight: 54,
    padding: "0 24px"
  },
  ghostButtonLarge: {
    ...baseButton,
    background: "#000000",
    border: "1px solid rgba(248, 184, 8, 0.16)",
    color: "#f4efe4",
    minHeight: 54,
    padding: "0 24px"
  },
  trustStrip: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    marginTop: 42
  },
  trustPill: {
    alignItems: "center",
    color: "#f4efe4",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 800,
    gap: 10,
    minHeight: 40
  },
  smallIcon: {
    background: "#0c0c0c",
    border: "1px solid rgba(248, 184, 8, 0.16)",
    borderRadius: 8,
    height: 34,
    width: 34
  },
  heroVisual: {
    alignItems: "center",
    display: "grid",
    justifyItems: "center",
    minHeight: 440,
    position: "relative"
  },
  photoFrame: {
    background: "#0c0c0c",
    borderRadius: "42% 42% 0 0",
    boxShadow: "0 26px 70px rgba(8, 31, 73, 0.14)",
    height: 390,
    maxWidth: 460,
    overflow: "hidden",
    position: "relative",
    width: "100%"
  },
  heroPhoto: {
    display: "block",
    height: "100%",
    objectFit: "cover",
    objectPosition: "62% 44%",
    width: "100%"
  },
  carePortrait: {
    background:
      "radial-gradient(circle at 52% 34%, #000000 0 16%, transparent 17%), linear-gradient(135deg, #0c0c0c, #000000)",
    height: "100%",
    position: "relative"
  },
  caregiver: {
    background: "#3a2c12",
    borderRadius: "48% 48% 10% 10%",
    bottom: 0,
    height: "64%",
    left: "23%",
    position: "absolute",
    width: "30%"
  },
  resident: {
    background: "#0c0c0c",
    border: "8px solid rgba(248, 184, 8, 0.16)",
    borderRadius: "50% 50% 10% 10%",
    bottom: 0,
    height: "52%",
    position: "absolute",
    right: "21%",
    width: "28%"
  },
  floatingMetric: {
    background: "#000000",
    border: "1px solid rgba(248, 184, 8, 0.16)",
    borderRadius: 8,
    bottom: 24,
    boxShadow: "0 18px 45px rgba(8, 31, 73, 0.13)",
    color: "#f4efe4",
    display: "grid",
    gap: 2,
    padding: "14px 16px",
    position: "absolute",
    right: 8
  },
  section: {
    padding: "56px clamp(20px, 5vw, 72px)"
  },
  centerHeader: {
    display: "grid",
    gap: 10,
    justifyItems: "center",
    margin: "0 auto 28px",
    maxWidth: 820,
    textAlign: "center"
  },
  sectionTitle: {
    color: "#f4efe4",
    fontSize: "clamp(28px, 4vw, 44px)",
    letterSpacing: 0,
    lineHeight: 1.12,
    margin: 0
  },
  sectionCopy: {
    color: "#b3a894",
    fontSize: 16,
    lineHeight: 1.62,
    margin: 0
  },
  capsuleGrid: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
  },
  capsuleCard: {
    background: "#000000",
    border: "1px solid rgba(248, 184, 8, 0.16)",
    borderRadius: 12,
    boxShadow: "0 18px 50px rgba(8, 31, 73, 0.07)",
    minHeight: 210,
    overflow: "hidden",
    padding: 0
  },
  capsulePhoto: {
    display: "block",
    height: 132,
    objectFit: "cover",
    width: "100%"
  },
  capsuleBody: {
    padding: 20
  },
  cardTitle: {
    color: "#f4efe4",
    fontSize: 19,
    margin: "12px 0 0"
  },
  cardText: {
    color: "#b3a894",
    fontSize: 14,
    lineHeight: 1.55,
    margin: "9px 0 0"
  },
  cardNote: {
    color: "#f4efe4",
    fontSize: 14,
    lineHeight: 1.55,
    margin: "14px 0 0"
  },
  workflowBand: {
    background: "#000000",
    borderBottom: "1px solid rgba(248, 184, 8, 0.16)",
    borderTop: "1px solid rgba(248, 184, 8, 0.16)",
    padding: "52px clamp(20px, 5vw, 72px)"
  },
  timeline: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))"
  },
  timelineStep: {
    background: "#000000",
    border: "1px solid rgba(248, 184, 8, 0.16)",
    borderRadius: 8,
    color: "#f4efe4",
    fontSize: 13,
    fontWeight: 900,
    minHeight: 54,
    padding: "16px 12px",
    textAlign: "center"
  },
  experienceGrid: {
    display: "grid",
    gap: 22,
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))"
  },
  experienceCard: {
    background: "#000000",
    border: "1px solid rgba(248, 184, 8, 0.16)",
    borderRadius: 8,
    boxShadow: "0 18px 50px rgba(8, 31, 73, 0.07)",
    overflow: "hidden"
  },
  experiencePhoto: {
    display: "block",
    height: 168,
    objectFit: "cover",
    width: "100%"
  },
  experienceBody: {
    padding: 22
  },
  cleanList: {
    color: "#f4efe4",
    display: "grid",
    fontSize: 14,
    gap: 9,
    lineHeight: 1.45,
    margin: "16px 0 0",
    paddingLeft: 18
  },
  previewBand: {
    background: "#0c0c0c",
    display: "grid",
    gap: 28,
    padding: "56px clamp(20px, 5vw, 72px)"
  },
  previewIntro: {
    maxWidth: 780
  },
  previewGrid: {
    alignItems: "start",
    display: "grid",
    gap: 28,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))"
  },
  dashboardPreview: {
    background: "#000000",
    border: "1px solid rgba(248, 184, 8, 0.16)",
    borderRadius: 8,
    boxShadow: "0 24px 70px rgba(8, 31, 73, 0.12)",
    display: "grid",
    gridTemplateColumns: "minmax(96px, 120px) minmax(0, 1fr)",
    minHeight: 390,
    overflow: "hidden"
  },
  sidebar: {
    background: "#1b160e",
    color: "#ffffff",
    display: "grid",
    gap: 10,
    padding: 18
  },
  sidebarItem: {
    color: "#d8ccb4",
    fontSize: 12,
    fontWeight: 800
  },
  sidebarActive: {
    background: "#9a7122",
    borderRadius: 8,
    color: "#ffffff",
    fontSize: 12,
    fontWeight: 900,
    padding: "9px 8px"
  },
  dashboardCanvas: {
    display: "grid",
    gap: 16,
    padding: 20
  },
  dashboardTop: {
    alignItems: "center",
    display: "flex",
    gap: 16,
    justifyContent: "space-between"
  },
  dashboardTitle: {
    color: "#f4efe4",
    fontSize: 20,
    margin: 0
  },
  dashboardSub: {
    color: "#b3a894",
    fontSize: 13,
    margin: "4px 0 0"
  },
  miniButton: {
    ...baseButton,
    background: "#9a7122",
    color: "#ffffff",
    minHeight: 40
  },
  metricGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(92px, 1fr))"
  },
  metricTile: {
    background: "#000000",
    border: "1px solid rgba(248, 184, 8, 0.16)",
    borderRadius: 8,
    display: "grid",
    gap: 6,
    padding: 14
  },
  dashboardColumns: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
  },
  previewPanel: {
    background: "#000000",
    border: "1px solid rgba(248, 184, 8, 0.16)",
    borderRadius: 8,
    padding: 14
  },
  panelHeading: {
    color: "#f4efe4",
    fontSize: 14,
    margin: "0 0 10px"
  },
  shiftRow: {
    alignItems: "center",
    borderTop: "1px solid rgba(248, 184, 8, 0.16)",
    color: "#f4efe4",
    display: "flex",
    fontSize: 13,
    justifyContent: "space-between",
    padding: "10px 0"
  },
  statusGreen: {
    color: "#0f7f56"
  },
  statusAmber: {
    color: "#b36b00"
  },
  activityLine: {
    borderTop: "1px solid rgba(248, 184, 8, 0.16)",
    color: "#f4efe4",
    fontSize: 13,
    margin: 0,
    padding: "10px 0"
  },
  phoneCluster: {
    alignItems: "end",
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))"
  },
  phone: {
    background: "#000000",
    border: "7px solid rgba(248, 184, 8, 0.16)",
    borderRadius: 30,
    boxShadow: "0 18px 45px rgba(8, 31, 73, 0.16)",
    minHeight: 286,
    padding: "18px 14px"
  },
  phoneTop: {
    background: "#171511",
    borderRadius: 999,
    height: 5,
    margin: "0 auto 18px",
    width: 44
  },
  phoneTitle: {
    color: "#f4efe4",
    fontSize: 15,
    margin: 0
  },
  phoneDetail: {
    color: "#b3a894",
    fontSize: 13,
    lineHeight: 1.45,
    margin: "14px 0"
  },
  phoneMeta: {
    color: "#0f7f56",
    fontSize: 20
  },
  phoneNav: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(3, 1fr)",
    marginTop: 54
  },
  benefitGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
  },
  benefit: {
    background: "#000000",
    border: "1px solid rgba(248, 184, 8, 0.16)",
    borderRadius: 8,
    boxShadow: "0 14px 34px rgba(8, 31, 73, 0.05)",
    color: "#f4efe4",
    fontWeight: 900,
    padding: 18
  },
  aiSection: {
    background: "#000000",
    borderBottom: "1px solid rgba(248, 184, 8, 0.16)",
    borderTop: "1px solid rgba(248, 184, 8, 0.16)",
    display: "grid",
    gap: 20,
    padding: "56px clamp(20px, 5vw, 72px)"
  },
  aiFlow: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
  },
  flowStep: {
    background: "#000000",
    border: "1px solid rgba(248, 184, 8, 0.16)",
    borderRadius: 8,
    padding: 20
  },
  controlGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))"
  },
  controlCard: {
    alignItems: "center",
    background: "#000000",
    border: "1px solid rgba(248, 184, 8, 0.16)",
    borderRadius: 8,
    display: "grid",
    gap: 12,
    justifyItems: "center",
    minHeight: 132,
    padding: 18,
    textAlign: "center"
  },
  controlIcon: {
    background: "#0c0c0c",
    border: "1px solid rgba(248, 184, 8, 0.16)",
    borderRadius: 8,
    height: 38,
    width: 38
  },
  smallTitle: {
    color: "#f4efe4",
    fontSize: 15,
    margin: 0
  },
  twoColumn: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))"
  },
  journeyCard: {
    background: "#000000",
    border: "1px solid rgba(248, 184, 8, 0.16)",
    borderRadius: 8,
    boxShadow: "0 14px 34px rgba(8, 31, 73, 0.05)",
    padding: 22
  },
  stepList: {
    display: "grid",
    gap: 10,
    margin: "16px 0 0",
    paddingLeft: 22
  },
  stepItem: {
    color: "#f4efe4",
    fontWeight: 800,
    lineHeight: 1.45
  },
  faqGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
  },
  faqItem: {
    background: "#000000",
    border: "1px solid rgba(248, 184, 8, 0.16)",
    borderRadius: 8,
    boxShadow: "0 14px 34px rgba(8, 31, 73, 0.05)",
    padding: 18
  },
  faqQuestion: {
    color: "#f4efe4",
    fontSize: 17,
    margin: 0
  },
  textLink: {
    alignItems: "center",
    color: "#a8842f",
    display: "inline-flex",
    fontWeight: 800,
    marginTop: 12,
    minHeight: 44
  },
  ctaBand: {
    alignItems: "center",
    background: "#1b160e",
    color: "#ffffff",
    display: "flex",
    flexWrap: "wrap",
    gap: 20,
    justifyContent: "space-between",
    margin: "0 clamp(20px, 5vw, 72px) 40px",
    padding: "28px clamp(20px, 4vw, 38px)"
  },
  ctaTitle: {
    fontSize: "clamp(24px, 3vw, 34px)",
    margin: 0
  },
  ctaCopy: {
    color: "#ece3d2",
    margin: "8px 0 0"
  },
  ctaActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12
  },
  lightButton: {
    ...baseButton,
    background: "#000000",
    color: "#f4efe4",
    minHeight: 48,
    padding: "0 22px"
  },
  outlineLightButton: {
    ...baseButton,
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.52)",
    color: "#ffffff",
    minHeight: 48,
    padding: "0 22px"
  },
  footer: {
    alignItems: "center",
    background: "#000000",
    borderTop: "1px solid rgba(248, 184, 8, 0.16)",
    color: "#f4efe4",
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between",
    padding: "30px clamp(20px, 5vw, 72px)"
  },
  footerBrand: {
    color: "#f4efe4",
    fontWeight: 900,
    textDecoration: "none"
  },
  footerLinks: {
    display: "flex",
    flexWrap: "wrap",
    gap: 18
  },
  footerLink: {
    color: "#f4efe4",
    fontSize: 14,
    fontWeight: 800,
    textDecoration: "none"
  }
};

const capsulePhotos: Record<string, string> = {
  kitchen: "/images/cap-kitchen.jpg",
  care: "/images/cap-care.jpg",
  housekeeping: "/images/cap-housekeeping.jpg",
  maintenance: "/images/cap-maintenance.jpg"
};


const pillarPhotos: Record<string, string> = {
  employers: "/images/exp-employers.jpg",
  workers: "/images/exp-workers.jpg",
  admins: "/images/exp-admins.jpg"
};
