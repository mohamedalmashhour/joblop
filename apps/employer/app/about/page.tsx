import type { CSSProperties } from "react";
import { MarketingHeader, MarketingFooter } from "../MarketingChrome";
import {
  aiBoundary,
  operatingPhilosophy,
  platformCapabilities,
  servedOrganizations,
  trustMechanisms,
  trustStatements
} from "./aboutContent";

export default function AboutPage() {
  return (
    <main style={styles.page}>
      <MarketingHeader active="about" />

      <section style={styles.hero}>
        <div style={styles.heroCopy}>
          <p style={styles.eyebrow}>About JobLop</p>
          <h1 style={styles.title}>
            Staffing operations for organizations that need reliable workers and clear records.
          </h1>
          <p style={styles.lede}>
            JobLop helps organizations manage workforce requests with verified workflows,
            human approval, attendance evidence, and privacy-aware records.
          </p>
          <div style={styles.heroActions}>
            <a href="/signup/employer" style={styles.primaryButtonLarge}>
              Request staff
            </a>
            <a href="/#workers" style={styles.secondaryButtonLarge}>
              Become a worker
            </a>
          </div>
        </div>
        <aside aria-label="About page implementation guardrail" style={styles.heroPanel}>
          <p style={styles.panelKicker}>Trust rule</p>
          <h2 style={styles.panelTitle}>Mechanisms, not unsupported claims.</h2>
          <p style={styles.panelText}>
            This page describes how the platform is designed to operate. It does not show fake
            metrics, fabricated testimonials, unsupported certifications, or country-specific
            regulatory claims.
          </p>
        </aside>
      </section>

      <section aria-labelledby="trust-title" style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Why trust JobLop</p>
          <h2 id="trust-title" style={styles.sectionTitle}>
            Trust is built through controlled workflows, clear records, and human review.
          </h2>
        </div>
        <div style={styles.cardGrid}>
          {trustMechanisms.map((mechanism) => (
            <article key={mechanism.title} style={styles.card}>
              <h3 style={styles.cardTitle}>{mechanism.title}</h3>
              <p style={styles.cardText}>{mechanism.text}</p>
            </article>
          ))}
        </div>
        <div style={styles.statementGrid}>
          {trustStatements.map((statement) => (
            <article key={statement.audience} style={styles.statementCard}>
              <h3 style={styles.cardTitle}>{statement.audience}</h3>
              <p style={styles.cardText}>{statement.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="problem-title" style={styles.splitSection}>
        <div>
          <p style={styles.eyebrowDark}>The problem</p>
          <h2 id="problem-title" style={styles.sectionTitle}>
            Staffing gaps affect service continuity and operational confidence.
          </h2>
          <p style={styles.sectionCopy}>
            Healthcare and senior-living staffing cannot depend on listings alone. Teams need
            request intake, worker readiness, attendance evidence, communication, and governed
            handoffs.
          </p>
        </div>
        <div>
          <p style={styles.eyebrowDark}>What the platform does</p>
          <ul style={styles.featureList}>
            {platformCapabilities.map((capability) => (
              <li key={capability} style={styles.featureItem}>
                {capability}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="serves-title" style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Who it serves</p>
          <h2 id="serves-title" style={styles.sectionTitle}>
            Built for care-focused organizations and the workers who support them.
          </h2>
        </div>
        <div style={styles.pillGrid}>
          {servedOrganizations.map((organization) => (
            <span key={organization} style={styles.pill}>
              {organization}
            </span>
          ))}
        </div>
      </section>

      <section aria-labelledby="philosophy-title" style={styles.philosophySection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Operating philosophy</p>
          <h2 id="philosophy-title" style={styles.sectionTitle}>
            A governed workflow from request to record.
          </h2>
        </div>
        <ol style={styles.philosophyList}>
          {operatingPhilosophy.map((step) => (
            <li key={step} style={styles.philosophyItem}>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="ai-title" style={styles.aiSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>AI advisory philosophy</p>
          <h2 id="ai-title" style={styles.sectionTitle}>
            AI recommendation, human review, final decision.
          </h2>
          <p style={styles.sectionCopy}>
            JobLop uses AI as decision support. Operational authority remains with approved
            human workflows.
          </p>
        </div>
        <div style={styles.aiGrid}>
          {aiBoundary.map((boundary) => (
            <article key={boundary} style={styles.aiCard}>
              <p style={styles.cardText}>{boundary}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="next-title" style={styles.ctaBand}>
        <div>
          <p style={styles.eyebrowDark}>Next step</p>
          <h2 id="next-title" style={styles.sectionTitle}>
            Choose the path that matches your role.
          </h2>
        </div>
        <div style={styles.ctaActions}>
          <a href="/signup/employer" style={styles.primaryButton}>
            Request staff
          </a>
          <a href="/#workers" style={styles.secondaryButton}>
            Become a worker
          </a>
          <a href="/contact" style={styles.tertiaryButton}>
            Contact us
          </a>
        </div>
      </section>

      <MarketingFooter note="Language and region selector reserved for localization." />
    </main>
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
    background: "#fbf9f4",
    color: "#15110b",
    fontFamily: "Inter, system-ui, sans-serif",
    minHeight: "100vh"
  },
  header: {
    alignItems: "center",
    background: "#ffffff",
    borderBottom: "1px solid #f0e8d8",
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
    color: "#1b160e",
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
    color: "#15110b",
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
    background: "#1b160e",
    color: "#ffffff"
  },
  secondaryButton: {
    ...baseButton,
    background: "#fff8d8",
    color: "#1b160e"
  },
  tertiaryButton: {
    ...baseButton,
    background: "#ffffff",
    border: "1px solid #f0e8d8",
    color: "#1b160e"
  },
  primaryButtonLarge: {
    ...baseButton,
    background: "#fff8d8",
    color: "#1b160e",
    minHeight: 52,
    padding: "0 22px"
  },
  secondaryButtonLarge: {
    ...baseButton,
    background: "transparent",
    border: "1px solid #f0e8d8",
    color: "#ffffff",
    minHeight: 52,
    padding: "0 22px"
  },
  hero: {
    background: "#1b160e",
    color: "#ffffff",
    display: "grid",
    gap: 28,
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    padding: "clamp(32px, 7vw, 72px) clamp(16px, 4vw, 40px)"
  },
  heroCopy: {
    alignSelf: "center",
    maxWidth: 780
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
    color: "#2a2114",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0,
    margin: 0,
    textTransform: "uppercase"
  },
  title: {
    fontSize: "clamp(34px, 5vw, 58px)",
    lineHeight: 1.04,
    margin: "12px 0",
    maxWidth: 900
  },
  lede: {
    color: "#f0e8d8",
    fontSize: 18,
    lineHeight: 1.6,
    margin: 0,
    maxWidth: 720
  },
  heroActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 24
  },
  heroPanel: {
    alignSelf: "center",
    background: "#ffffff",
    border: "1px solid #f0e8d8",
    borderRadius: 8,
    color: "#15110b",
    display: "grid",
    gap: 10,
    padding: 20
  },
  panelKicker: {
    color: "#6b6356",
    fontSize: 13,
    fontWeight: 800,
    margin: 0,
    textTransform: "uppercase"
  },
  panelTitle: {
    color: "#1b160e",
    fontSize: 24,
    margin: 0
  },
  panelText: {
    color: "#6b6356",
    fontSize: 15,
    lineHeight: 1.6,
    margin: 0
  },
  section: {
    padding: "48px clamp(16px, 4vw, 40px)"
  },
  sectionHeader: {
    display: "grid",
    gap: 8,
    marginBottom: 18,
    maxWidth: 850
  },
  sectionTitle: {
    color: "#1b160e",
    fontSize: "clamp(26px, 4vw, 42px)",
    lineHeight: 1.12,
    margin: 0
  },
  sectionCopy: {
    color: "#6b6356",
    fontSize: 16,
    lineHeight: 1.6,
    margin: 0,
    maxWidth: 760
  },
  cardGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
  },
  card: {
    background: "#ffffff",
    border: "1px solid #f0e8d8",
    borderRadius: 8,
    minHeight: 146,
    padding: 18
  },
  cardTitle: {
    color: "#1b160e",
    fontSize: 18,
    margin: 0
  },
  cardText: {
    color: "#6b6356",
    fontSize: 14,
    lineHeight: 1.55,
    margin: "8px 0 0"
  },
  statementGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    marginTop: 18
  },
  statementCard: {
    background: "#f6efdd",
    border: "1px solid #f0e2c0",
    borderRadius: 8,
    padding: 18
  },
  splitSection: {
    background: "#ffffff",
    borderBottom: "1px solid #f0e8d8",
    borderTop: "1px solid #f0e8d8",
    display: "grid",
    gap: 28,
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    padding: "48px clamp(16px, 4vw, 40px)"
  },
  featureList: {
    display: "grid",
    gap: 10,
    listStyle: "none",
    margin: 0,
    padding: 0
  },
  featureItem: {
    background: "#fbf9f4",
    border: "1px solid #f0e8d8",
    borderRadius: 8,
    color: "#1b160e",
    fontWeight: 800,
    padding: 14
  },
  pillGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
  },
  pill: {
    background: "#ffffff",
    border: "1px solid #f0e8d8",
    borderRadius: 8,
    color: "#1b160e",
    fontWeight: 900,
    minHeight: 52,
    padding: 16
  },
  philosophySection: {
    background: "#ffffff",
    borderBottom: "1px solid #f0e8d8",
    borderTop: "1px solid #f0e8d8",
    padding: "48px clamp(16px, 4vw, 40px)"
  },
  philosophyList: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    listStyle: "none",
    margin: 0,
    padding: 0
  },
  philosophyItem: {
    background: "#fbf9f4",
    border: "1px solid #f0e8d8",
    borderRadius: 8,
    color: "#1b160e",
    fontWeight: 900,
    padding: 16
  },
  aiSection: {
    background: "#f6efdd",
    borderBottom: "1px solid #f0e8d8",
    borderTop: "1px solid #f0e8d8",
    padding: "48px clamp(16px, 4vw, 40px)"
  },
  aiGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
  },
  aiCard: {
    background: "#ffffff",
    border: "1px solid #f0e2c0",
    borderRadius: 8,
    padding: 18
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
    background: "#1b160e",
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
    color: "#f0e8d8",
    fontSize: 13
  }
};
