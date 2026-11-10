import type { CSSProperties } from "react";
import { getAboutContent } from "./aboutContent";
import { PublicSiteFooter, readPublicLocale } from "../pricing/publicPageStyles";
import { SiteHeader } from "../shared/SiteHeader";

export default async function AboutPage() {
  const c = getAboutContent(await readPublicLocale());
  // Same rule as the home page: production keeps "contact us first".
  const requestHref = process.env.RWOS_ENV === "production" ? "/contact" : "/signup/employer";
  return (
    <main style={styles.page}>
      <SiteHeader current="/about" />

      <section style={styles.hero}>
        <div style={styles.heroCopy}>
          <p style={styles.eyebrow}>{c.eyebrow}</p>
          <h1 style={styles.title}>{c.title}</h1>
          <p style={styles.lede}>{c.lede}</p>
          <div style={styles.heroActions}>
            <a href={requestHref} style={styles.primaryButtonLarge}>
              {c.requestStaff}
            </a>
            <a href="/#workers" style={styles.secondaryButtonLarge}>
              {c.becomeWorker}
            </a>
          </div>
        </div>
        <aside aria-label={c.panelAria} style={styles.heroPanel}>
          <p style={styles.panelKicker}>{c.panelKicker}</p>
          <h2 style={styles.panelTitle}>{c.panelTitle}</h2>
          <p style={styles.panelText}>{c.panelText}</p>
        </aside>
      </section>

      <section aria-labelledby="trust-title" style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrow}>{c.trustEyebrow}</p>
          <h2 id="trust-title" style={styles.sectionTitle}>
            {c.trustTitle}
          </h2>
        </div>
        <div style={styles.cardGrid}>
          {c.trustMechanisms.map((mechanism) => (
            <article key={mechanism.title} style={styles.card}>
              <h3 style={styles.cardTitle}>{mechanism.title}</h3>
              <p style={styles.cardText}>{mechanism.text}</p>
            </article>
          ))}
        </div>
        <div style={styles.statementGrid}>
          {c.trustStatements.map((statement) => (
            <article key={statement.audience} style={styles.statementCard}>
              <h3 style={styles.cardTitle}>{statement.audience}</h3>
              <p style={styles.cardText}>{statement.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="problem-title" style={styles.splitSection}>
        <div>
          <p style={styles.eyebrow}>{c.problemEyebrow}</p>
          <h2 id="problem-title" style={styles.sectionTitle}>
            {c.problemTitle}
          </h2>
          <p style={{ ...styles.sectionCopy, marginTop: 12 }}>{c.problemCopy}</p>
        </div>
        <div>
          <p style={styles.eyebrow}>{c.doesEyebrow}</p>
          <ul style={styles.featureList}>
            {c.platformCapabilities.map((capability) => (
              <li key={capability} style={styles.featureItem}>
                {capability}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="serves-title" style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrow}>{c.servesEyebrow}</p>
          <h2 id="serves-title" style={styles.sectionTitle}>
            {c.servesTitle}
          </h2>
        </div>
        <div style={styles.pillGrid}>
          {c.servedOrganizations.map((organization) => (
            <span key={organization} style={styles.pill}>
              {organization}
            </span>
          ))}
        </div>
      </section>

      <section aria-labelledby="philosophy-title" style={styles.philosophySection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrow}>{c.philosophyEyebrow}</p>
          <h2 id="philosophy-title" style={styles.sectionTitle}>
            {c.philosophyTitle}
          </h2>
        </div>
        <ol style={styles.philosophyList}>
          {c.operatingPhilosophy.map((step, index) => (
            <li key={step} style={styles.philosophyItem}>
              <span aria-hidden="true" style={styles.stepNumber}>
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="ai-title" style={styles.aiSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrow}>{c.aiEyebrow}</p>
          <h2 id="ai-title" style={styles.sectionTitle}>
            {c.aiTitle}
          </h2>
          <p style={styles.sectionCopy}>{c.aiCopy}</p>
        </div>
        <div style={styles.aiGrid}>
          {c.aiBoundary.map((boundary) => (
            <article key={boundary} style={styles.aiCard}>
              <p style={{ ...styles.cardText, margin: 0 }}>{boundary}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="next-title" style={styles.ctaBand}>
        <div style={{ minWidth: 0 }}>
          <p style={styles.eyebrow}>{c.nextEyebrow}</p>
          <h2 id="next-title" style={styles.sectionTitle}>
            {c.nextTitle}
          </h2>
        </div>
        <div style={styles.ctaActions}>
          <a href={requestHref} style={styles.primaryButton}>
            {c.requestStaff}
          </a>
          <a href="/#workers" style={styles.secondaryButton}>
            {c.becomeWorker}
          </a>
          <a href="/contact" style={styles.secondaryButton}>
            {c.contactUs}
          </a>
        </div>
      </section>

      <PublicSiteFooter />
    </main>
  );
}

const GOLD = "#F8B808";
const line = "1px solid rgba(248, 184, 8, 0.16)";

const baseButton: CSSProperties = {
  alignItems: "center",
  borderRadius: 8,
  boxSizing: "border-box",
  display: "inline-flex",
  fontSize: 15,
  fontWeight: 800,
  justifyContent: "center",
  minHeight: 44,
  padding: "0 16px",
  textAlign: "center",
  textDecoration: "none"
};

const styles: Record<string, CSSProperties> = {
  page: {
    background: "#000000",
    color: "#f4efe4",
    fontFamily: "Inter, system-ui, sans-serif",
    minHeight: "100vh",
    overflowWrap: "anywhere"
  },
  primaryButton: { ...baseButton, background: GOLD, color: "#000000" },
  secondaryButton: {
    ...baseButton,
    background: "#000000",
    border: "1px solid rgba(248, 184, 8, 0.34)",
    color: "#f4efe4"
  },
  primaryButtonLarge: { ...baseButton, background: GOLD, color: "#000000", minHeight: 52, padding: "0 22px" },
  secondaryButtonLarge: {
    ...baseButton,
    background: "#000000",
    border: "1px solid rgba(248, 184, 8, 0.34)",
    color: "#f4efe4",
    minHeight: 52,
    padding: "0 22px"
  },
  hero: {
    background: "#1b160e",
    color: "#ffffff",
    display: "grid",
    gap: 28,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
    padding: "clamp(32px, 7vw, 72px) clamp(16px, 4vw, 40px)"
  },
  heroCopy: { alignSelf: "center", maxWidth: 780, minWidth: 0 },
  eyebrow: {
    color: GOLD,
    fontSize: 13,
    fontWeight: 900,
    letterSpacing: 0,
    margin: "0 0 8px",
    textTransform: "uppercase"
  },
  title: { fontSize: "clamp(34px, 5vw, 58px)", lineHeight: 1.15, margin: "0 0 14px", maxWidth: 900 },
  lede: { color: "#f0e8d8", fontSize: 18, lineHeight: 1.6, margin: 0, maxWidth: 720 },
  heroActions: { display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 },
  heroPanel: {
    alignSelf: "center",
    background: "#000000",
    border: line,
    borderRadius: 8,
    color: "#f4efe4",
    display: "grid",
    gap: 10,
    minWidth: 0,
    padding: 20
  },
  panelKicker: { color: GOLD, fontSize: 13, fontWeight: 800, margin: 0, textTransform: "uppercase" },
  panelTitle: { color: "#f4efe4", fontSize: 24, lineHeight: 1.2, margin: 0 },
  panelText: { color: "#b3a894", fontSize: 15, lineHeight: 1.6, margin: 0 },
  section: { padding: "48px clamp(16px, 4vw, 40px)" },
  sectionHeader: { display: "grid", gap: 0, marginBottom: 18, maxWidth: 850 },
  sectionTitle: { color: "#f4efe4", fontSize: "clamp(26px, 4vw, 42px)", lineHeight: 1.18, margin: 0 },
  sectionCopy: { color: "#b3a894", fontSize: 16, lineHeight: 1.6, margin: "12px 0 0", maxWidth: 760 },
  // 8 cards: 4 x 2 at desktop, 2 x 4 at tablet, 1 column on phones; no orphan slots.
  cardGrid: { display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))" },
  card: { background: "#0c0c0c", border: line, borderRadius: 8, minHeight: 146, padding: 18 },
  cardTitle: { color: "#f4efe4", fontSize: 18, lineHeight: 1.3, margin: 0 },
  cardText: { color: "#b3a894", fontSize: 14, lineHeight: 1.55, margin: "8px 0 0" },
  statementGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
    marginTop: 18
  },
  statementCard: { background: "#141210", borderRadius: 8, borderInlineStart: `3px solid ${GOLD}`, padding: 18 },
  splitSection: {
    background: "#0c0c0c",
    borderBottom: line,
    borderTop: line,
    display: "grid",
    gap: 28,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
    padding: "48px clamp(16px, 4vw, 40px)"
  },
  featureList: { display: "grid", gap: 8, listStyle: "none", margin: 0, padding: 0 },
  featureItem: { background: "#141210", borderRadius: 8, color: "#f4efe4", fontWeight: 700, padding: "12px 14px" },
  pillGrid: { display: "flex", flexWrap: "wrap", gap: 10 },
  pill: {
    background: "#0c0c0c",
    border: line,
    borderRadius: 999,
    color: "#f4efe4",
    fontSize: 15,
    fontWeight: 700,
    padding: "10px 18px"
  },
  philosophySection: { background: "#000000", borderBottom: line, borderTop: line, padding: "48px clamp(16px, 4vw, 40px)" },
  philosophyList: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(180px, 100%), 1fr))",
    listStyle: "none",
    margin: 0,
    padding: 0
  },
  philosophyItem: {
    alignItems: "center",
    background: "#0c0c0c",
    border: line,
    borderRadius: 8,
    color: "#f4efe4",
    display: "flex",
    fontWeight: 800,
    gap: 10,
    padding: 16
  },
  stepNumber: {
    alignItems: "center",
    background: GOLD,
    borderRadius: 999,
    color: "#000000",
    display: "inline-flex",
    flexShrink: 0,
    fontSize: 13,
    fontWeight: 900,
    height: 26,
    justifyContent: "center",
    width: 26
  },
  aiSection: { background: "#0c0c0c", borderBottom: line, borderTop: line, padding: "48px clamp(16px, 4vw, 40px)" },
  aiGrid: { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))" },
  aiCard: { background: "#141210", borderRadius: 8, padding: 18 },
  ctaBand: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: 18,
    justifyContent: "space-between",
    padding: "48px clamp(16px, 4vw, 40px)"
  },
  ctaActions: { display: "flex", flexWrap: "wrap", gap: 10 }
};
