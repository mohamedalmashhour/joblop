import type { CSSProperties } from "react";
import {
  aiAssistance,
  employerJourney,
  lifecyclePhases,
  trustLayer,
  workerJourney
} from "./howItWorksContent";

type ResponsibilityGroup = (typeof lifecyclePhases)[number]["responsibilities"];
const responsibilityOwners = ["Employer", "Worker", "Platform"] as const;

export default function HowItWorksPage() {
  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <a href="/" style={styles.brand} aria-label="Resident Job home">
          Resident Job
        </a>
        <nav aria-label="Primary navigation" style={styles.nav}>
          <a href="/about" style={styles.navLink}>
            About
          </a>
          <a href="/how-it-works" style={styles.navLink} aria-current="page">
            How it works
          </a>
          <a href="/pricing" style={styles.navLink}>
            Pricing
          </a>
          <a href="/contact" style={styles.navLink}>
            Contact
          </a>
          <a href="/#sign-in" style={styles.navLink}>
            Sign in
          </a>
        </nav>
        <div style={styles.headerActions}>
          <a href="/#worker" style={styles.secondaryButton}>
            I want shifts
          </a>
          <a href="/#employer" style={styles.primaryButton}>
            I need staff
          </a>
        </div>
      </header>

      <section style={styles.hero}>
        <p style={styles.eyebrow}>How Resident Job works</p>
        <h1 style={styles.title}>A clear staffing workflow for workers, employers, and operations.</h1>
        <p style={styles.lede}>
          This public page explains the process. It does not confirm availability, dispatch,
          pricing, attendance, payroll, or payment.
        </p>
        <div style={styles.heroActions}>
          <a href="/#employer" style={styles.primaryButtonLarge}>
            I need staff
          </a>
          <a href="/#worker" style={styles.secondaryButtonLarge}>
            I want shifts
          </a>
        </div>
      </section>

      <section aria-labelledby="journeys-title" style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Choose your path</p>
          <h2 id="journeys-title" style={styles.sectionTitle}>
            Workers and employers see different responsibilities inside one governed workflow.
          </h2>
        </div>
        <div style={styles.twoColumn}>
          <JourneyCard title="For workers" steps={workerJourney} />
          <JourneyCard title="For employers" steps={employerJourney} />
        </div>
      </section>

      <section aria-labelledby="lifecycle-title" style={styles.lifecycleSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Shared operating lifecycle</p>
          <h2 id="lifecycle-title" style={styles.sectionTitle}>
            Before, during, and after the shift stay distinct.
          </h2>
        </div>
        <div style={styles.phaseGrid}>
          {lifecyclePhases.map((phase) => (
            <article key={phase.title} style={styles.phaseCard}>
              <h3 style={styles.phaseTitle}>{phase.title}</h3>
              <div style={styles.statusRow}>
                {phase.statuses.map((status) => (
                  <span key={status} style={styles.statusPill}>
                    {status}
                  </span>
                ))}
              </div>
              <ResponsibilityList groups={phase.responsibilities} />
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="ai-title" style={styles.aiSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>AI assistance</p>
          <h2 id="ai-title" style={styles.sectionTitle}>
            AI recommendation, human review, final decision.
          </h2>
        </div>
        <div style={styles.aiGrid}>
          {aiAssistance.map((item) => (
            <article key={item} style={styles.aiCard}>
              <p style={styles.cardText}>{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="trust-title" style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Trust and recordkeeping</p>
          <h2 id="trust-title" style={styles.sectionTitle}>
            The workflow depends on reviewable records, not unsupported promises.
          </h2>
        </div>
        <div style={styles.pillGrid}>
          {trustLayer.map((item) => (
            <span key={item} style={styles.pill}>
              {item}
            </span>
          ))}
        </div>
      </section>

      <section aria-labelledby="questions-title" style={styles.ctaBand}>
        <div>
          <p style={styles.eyebrowDark}>Common questions</p>
          <h2 id="questions-title" style={styles.sectionTitle}>
            Need more detail before choosing a path?
          </h2>
        </div>
        <div style={styles.ctaActions}>
          <a href="/#faq" style={styles.primaryButton}>
            View FAQ
          </a>
          <a href="/contact" style={styles.secondaryButton}>
            Contact us
          </a>
        </div>
      </section>

      <footer style={styles.footer}>
        <span>Resident Job</span>
        <nav aria-label="Footer navigation" style={styles.footerLinks}>
          <a href="/" style={styles.footerLink}>
            Home
          </a>
          <a href="/about" style={styles.footerLink}>
            About
          </a>
          <a href="/how-it-works" style={styles.footerLink}>
            How it works
          </a>
          <a href="/#privacy" style={styles.footerLink}>
            Privacy
          </a>
        </nav>
        <span style={styles.footerNote}>Language and region selector reserved for localization.</span>
      </footer>
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

function ResponsibilityList({ groups }: { groups: ResponsibilityGroup }) {
  return (
    <div style={styles.responsibilityGrid}>
      {responsibilityOwners.map((owner) => (
        <section key={owner} aria-labelledby={`${owner}-responsibilities`} style={styles.ownerBlock}>
          <h4 id={`${owner}-responsibilities`} style={styles.ownerTitle}>
            {owner}
          </h4>
          <ul style={styles.itemList}>
            {groups[owner].map((item) => (
              <li key={item} style={styles.item}>
                {item}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

const baseButton: CSSProperties = {
  alignItems: "center",
  borderRadius: 8,
  display: "inline-flex",
  fontSize: 15,
  fontWeight: 800,
  justifyContent: "center",
  minHeight: 44,
  padding: "0 16px",
  textDecoration: "none"
};

const styles: Record<string, CSSProperties> = {
  page: {
    background: "#f7faf9",
    color: "#0b1f3a",
    fontFamily: "Inter, system-ui, sans-serif",
    minHeight: "100vh"
  },
  header: {
    alignItems: "center",
    background: "#ffffff",
    borderBottom: "1px solid #dce8e8",
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between",
    padding: "18px clamp(16px, 4vw, 40px)",
    position: "sticky",
    top: 0,
    zIndex: 1
  },
  brand: {
    color: "#071f4d",
    fontSize: 20,
    fontWeight: 900,
    textDecoration: "none"
  },
  nav: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: 14
  },
  navLink: {
    color: "#0b1f3a",
    fontSize: 14,
    fontWeight: 700,
    textDecoration: "none"
  },
  headerActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8
  },
  primaryButton: {
    ...baseButton,
    background: "#071f4d",
    color: "#ffffff"
  },
  secondaryButton: {
    ...baseButton,
    background: "#fff8d8",
    color: "#071f4d"
  },
  primaryButtonLarge: {
    ...baseButton,
    background: "#fff8d8",
    color: "#071f4d",
    minHeight: 52,
    padding: "0 22px"
  },
  secondaryButtonLarge: {
    ...baseButton,
    background: "transparent",
    border: "1px solid #dce8e8",
    color: "#ffffff",
    minHeight: 52,
    padding: "0 22px"
  },
  hero: {
    background: "#071f4d",
    color: "#ffffff",
    display: "grid",
    gap: 14,
    padding: "clamp(34px, 7vw, 72px) clamp(16px, 4vw, 40px)"
  },
  eyebrow: {
    color: "#fff8d8",
    fontSize: 13,
    fontWeight: 900,
    letterSpacing: 0,
    margin: 0,
    textTransform: "uppercase"
  },
  eyebrowDark: {
    color: "#123b78",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0,
    margin: 0,
    textTransform: "uppercase"
  },
  title: {
    fontSize: "clamp(34px, 5vw, 58px)",
    lineHeight: 1.04,
    margin: 0,
    maxWidth: 900
  },
  lede: {
    color: "#dce8e8",
    fontSize: 18,
    lineHeight: 1.6,
    margin: 0,
    maxWidth: 760
  },
  heroActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8
  },
  section: {
    padding: "48px clamp(16px, 4vw, 40px)"
  },
  sectionHeader: {
    display: "grid",
    gap: 8,
    marginBottom: 18,
    maxWidth: 880
  },
  sectionTitle: {
    color: "#071f4d",
    fontSize: "clamp(26px, 4vw, 42px)",
    lineHeight: 1.12,
    margin: 0
  },
  twoColumn: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))"
  },
  card: {
    background: "#ffffff",
    border: "1px solid #dce8e8",
    borderRadius: 8,
    padding: 20
  },
  cardTitle: {
    color: "#071f4d",
    fontSize: 18,
    margin: 0
  },
  cardText: {
    color: "#607276",
    fontSize: 14,
    lineHeight: 1.55,
    margin: "8px 0 0"
  },
  stepList: {
    display: "grid",
    gap: 10,
    margin: "16px 0 0",
    paddingLeft: 22
  },
  stepItem: {
    color: "#0b1f3a",
    fontWeight: 700,
    lineHeight: 1.45
  },
  lifecycleSection: {
    background: "#ffffff",
    borderBottom: "1px solid #dce8e8",
    borderTop: "1px solid #dce8e8",
    padding: "48px clamp(16px, 4vw, 40px)"
  },
  phaseGrid: {
    display: "grid",
    gap: 18
  },
  phaseCard: {
    background: "#f7faf9",
    border: "1px solid #dce8e8",
    borderRadius: 8,
    padding: 20
  },
  phaseTitle: {
    color: "#071f4d",
    fontSize: 24,
    margin: 0,
    textTransform: "capitalize"
  },
  statusRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  statusPill: {
    background: "#fff8d8",
    border: "1px solid #e7d889",
    borderRadius: 8,
    color: "#071f4d",
    fontSize: 13,
    fontWeight: 900,
    padding: "8px 10px"
  },
  responsibilityGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    marginTop: 18
  },
  ownerBlock: {
    background: "#ffffff",
    border: "1px solid #dce8e8",
    borderRadius: 8,
    padding: 16
  },
  ownerTitle: {
    color: "#123b78",
    fontSize: 15,
    margin: 0
  },
  itemList: {
    display: "grid",
    gap: 8,
    margin: "12px 0 0",
    paddingLeft: 18
  },
  item: {
    color: "#0b1f3a",
    lineHeight: 1.45
  },
  aiSection: {
    background: "#eef4ff",
    borderBottom: "1px solid #dce8e8",
    borderTop: "1px solid #dce8e8",
    padding: "48px clamp(16px, 4vw, 40px)"
  },
  aiGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
  },
  aiCard: {
    background: "#ffffff",
    border: "1px solid #bfd0f5",
    borderRadius: 8,
    padding: 18
  },
  pillGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
  },
  pill: {
    background: "#ffffff",
    border: "1px solid #dce8e8",
    borderRadius: 8,
    color: "#071f4d",
    fontWeight: 900,
    minHeight: 52,
    padding: 16
  },
  ctaBand: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: 18,
    justifyContent: "space-between",
    padding: "48px clamp(16px, 4vw, 40px)"
  },
  ctaActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10
  },
  footer: {
    alignItems: "center",
    background: "#071f4d",
    color: "#ffffff",
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between",
    padding: "28px clamp(16px, 4vw, 40px)"
  },
  footerLinks: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12
  },
  footerLink: {
    color: "#ffffff",
    fontWeight: 700,
    textDecoration: "none"
  },
  footerNote: {
    color: "#dce8e8",
    fontSize: 13
  }
};
