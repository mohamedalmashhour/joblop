import type { CSSProperties } from "react";
import {
  getHowItWorksContent,
  responsibilityOwners,
  type LocalizedPhase,
  type OwnerKey
} from "./howItWorksContent";
import { PublicSiteFooter, readPublicLocale } from "../pricing/publicPageStyles";
import { SiteHeader } from "../shared/SiteHeader";

export default async function HowItWorksPage() {
  const c = getHowItWorksContent(await readPublicLocale());
  // Same rule as the home page: production keeps "contact us first".
  const requestHref = process.env.RWOS_ENV === "production" ? "/contact" : "/signup/employer";
  return (
    <main style={styles.page}>
      <SiteHeader current="/how-it-works" />

      <section style={styles.hero}>
        <p style={styles.eyebrow}>{c.eyebrow}</p>
        <h1 style={styles.title}>{c.title}</h1>
        <p style={styles.lede}>{c.lede}</p>
        <div style={styles.heroActions}>
          <a href={requestHref} style={styles.primaryButtonLarge}>
            {c.needStaff}
          </a>
          <a href="/#workers" style={styles.secondaryButtonLarge}>
            {c.wantShifts}
          </a>
        </div>
      </section>

      <section aria-labelledby="journeys-title" style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrow}>{c.pathEyebrow}</p>
          <h2 id="journeys-title" style={styles.sectionTitle}>
            {c.pathTitle}
          </h2>
        </div>
        <div style={styles.twoColumn}>
          <JourneyCard title={c.forWorkers} steps={c.workerJourney} />
          <JourneyCard title={c.forEmployers} steps={c.employerJourney} />
        </div>
      </section>

      <section aria-labelledby="lifecycle-title" style={styles.lifecycleSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrow}>{c.lifecycleEyebrow}</p>
          <h2 id="lifecycle-title" style={styles.sectionTitle}>
            {c.lifecycleTitle}
          </h2>
        </div>
        <div style={styles.phaseGrid}>
          {c.phases.map((phase) => (
            <article key={phase.key} style={styles.phaseCard}>
              <h3 style={styles.phaseTitle}>{phase.title}</h3>
              <p style={styles.statusRow}>
                <span style={styles.statusLabel}>{c.statusLabel}:</span>
                {phase.statuses.map((status) => (
                  <span key={status} style={styles.statusChip}>
                    {status}
                  </span>
                ))}
              </p>
              <ResponsibilityList groups={phase.responsibilities} labels={c.ownerLabels} idPrefix={phase.key} />
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="ai-title" style={styles.aiSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrow}>{c.aiEyebrow}</p>
          <h2 id="ai-title" style={styles.sectionTitle}>
            {c.aiTitle}
          </h2>
        </div>
        <div style={styles.aiGrid}>
          {c.aiAssistance.map((item) => (
            <article key={item} style={styles.aiCard}>
              <p style={styles.cardText}>{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="trust-title" style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrow}>{c.trustEyebrow}</p>
          <h2 id="trust-title" style={styles.sectionTitle}>
            {c.trustTitle}
          </h2>
        </div>
        <div style={styles.pillGrid}>
          {c.trustLayer.map((item) => (
            <span key={item} style={styles.pill}>
              {item}
            </span>
          ))}
        </div>
      </section>

      <section aria-labelledby="questions-title" style={styles.ctaBand}>
        <div style={{ minWidth: 0 }}>
          <p style={styles.eyebrow}>{c.questionsEyebrow}</p>
          <h2 id="questions-title" style={styles.sectionTitle}>
            {c.questionsTitle}
          </h2>
        </div>
        <div style={styles.ctaActions}>
          <a href="/faq" style={styles.primaryButton}>
            {c.viewFaq}
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

function JourneyCard({ steps, title }: { steps: readonly string[]; title: string }) {
  return (
    <article style={styles.card}>
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

function ResponsibilityList({
  groups,
  labels,
  idPrefix
}: {
  groups: LocalizedPhase["responsibilities"];
  labels: Readonly<Record<OwnerKey, string>>;
  idPrefix: string;
}) {
  return (
    <div style={styles.responsibilityGrid}>
      {responsibilityOwners.map((owner) => {
        const headingId = `${idPrefix}-${owner.toLowerCase()}-responsibilities`;
        return (
          <section key={owner} aria-labelledby={headingId} style={styles.ownerBlock}>
            <h4 id={headingId} style={styles.ownerTitle}>
              {labels[owner]}
            </h4>
            <ul style={styles.itemList}>
              {groups[owner].map((item) => (
                <li key={item} style={styles.item}>
                  {item}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
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
    gap: 14,
    padding: "clamp(34px, 7vw, 72px) clamp(16px, 4vw, 40px)"
  },
  eyebrow: {
    color: GOLD,
    fontSize: 13,
    fontWeight: 900,
    letterSpacing: 0,
    margin: "0 0 8px",
    textTransform: "uppercase"
  },
  title: { fontSize: "clamp(34px, 5vw, 58px)", lineHeight: 1.15, margin: 0, maxWidth: 900 },
  lede: { color: "#f0e8d8", fontSize: 18, lineHeight: 1.6, margin: 0, maxWidth: 760 },
  heroActions: { display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 },
  section: { padding: "48px clamp(16px, 4vw, 40px)" },
  sectionHeader: { display: "grid", gap: 0, marginBottom: 18, maxWidth: 880 },
  sectionTitle: { color: "#f4efe4", fontSize: "clamp(26px, 4vw, 42px)", lineHeight: 1.18, margin: 0 },
  twoColumn: { display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))" },
  card: { background: "#0c0c0c", border: line, borderRadius: 8, padding: 20 },
  cardTitle: { color: "#f4efe4", fontSize: 18, lineHeight: 1.3, margin: 0 },
  cardText: { color: "#b3a894", fontSize: 14, lineHeight: 1.55, margin: 0 },
  stepList: { display: "grid", gap: 10, margin: "16px 0 0", paddingInlineStart: 22 },
  stepItem: { color: "#f4efe4", fontWeight: 700, lineHeight: 1.45 },
  lifecycleSection: { background: "#000000", borderBottom: line, borderTop: line, padding: "48px clamp(16px, 4vw, 40px)" },
  phaseGrid: { display: "grid", gap: 18 },
  phaseCard: { background: "#0c0c0c", border: line, borderRadius: 8, padding: 20 },
  phaseTitle: { color: "#f4efe4", fontSize: 24, lineHeight: 1.2, margin: 0 },
  // Statuses are labels, not buttons: small, quiet pills with no border.
  statusRow: { alignItems: "center", display: "flex", flexWrap: "wrap", gap: 6, margin: "10px 0 0" },
  statusLabel: { color: "#b3a894", fontSize: 12, fontWeight: 700, marginInlineEnd: 4 },
  statusChip: {
    background: "rgba(248, 184, 8, 0.12)",
    borderRadius: 999,
    color: "#e8d9b0",
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1.4,
    padding: "2px 10px"
  },
  responsibilityGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
    marginTop: 18
  },
  // Inner boxes: no border inside the bordered card, just a slightly lighter surface.
  ownerBlock: { background: "#141210", borderRadius: 8, padding: 16 },
  ownerTitle: { color: GOLD, fontSize: 15, margin: 0 },
  itemList: { display: "grid", gap: 8, margin: "12px 0 0", paddingInlineStart: 18 },
  item: { color: "#f4efe4", lineHeight: 1.45 },
  aiSection: { background: "#0c0c0c", borderBottom: line, borderTop: line, padding: "48px clamp(16px, 4vw, 40px)" },
  aiGrid: { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))" },
  aiCard: { background: "#141210", borderRadius: 8, padding: 18 },
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
