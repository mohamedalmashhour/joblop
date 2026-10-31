import type { CSSProperties } from "react";
import { MarketingHeader, MarketingFooter } from "../MarketingChrome";
import {
  aiFinancialBoundary,
  authorizationTimeline,
  calculatorInputs,
  estimateComponents,
  estimateFlow,
  pricingModels,
  transparencyPrinciples
} from "./pricingContent";

export default function PricingPage() {
  return (
    <main style={styles.page}>
      <MarketingHeader active="pricing" />

      <section style={styles.hero}>
        <p style={styles.eyebrow}>Pricing</p>
        <h1 style={styles.title}>Understand staffing costs without confusing estimates and charges.</h1>
        <p style={styles.lede}>
          Staffing prices depend on role, urgency, duration, location, travel, and approved
          requirements. Estimate is not a final invoice. Authorization is not final payment.
        </p>
        <p style={styles.notice}>
          Final billing is based on verified work, employer timesheet review, approved adjustments,
          and applicable business rules.
        </p>
        <div style={styles.heroActions}>
          <a href="/signup/employer" style={styles.primaryButtonLarge}>
            Request staff
          </a>
          <a href="#estimate" style={styles.secondaryButtonLarge}>
            Get an estimate
          </a>
        </div>
      </section>

      <section aria-labelledby="models-title" style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Employer pricing model</p>
          <h2 id="models-title" style={styles.sectionTitle}>
            Pricing remains configurable according to approved business rules.
          </h2>
          <p style={styles.sectionCopy}>
            No universal public tariff is shown. Agreement terms, timing, travel, role, and review
            outcomes can affect the final invoice.
          </p>
        </div>
        <div style={styles.pillGrid}>
          {pricingModels.map((model) => (
            <span key={model} style={styles.pill}>
              {model}
            </span>
          ))}
        </div>
      </section>

      <section aria-labelledby="transparent-title" style={styles.whiteSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>How we keep pricing transparent</p>
          <h2 id="transparent-title" style={styles.sectionTitle}>
            Financial clarity is part of the workflow.
          </h2>
        </div>
        <div style={styles.cardGrid}>
          {transparencyPrinciples.map((principle) => (
            <article key={principle} style={styles.card}>
              <p style={styles.cardText}>{principle}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="breakdown-title" style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Transparent charge breakdown</p>
          <h2 id="breakdown-title" style={styles.sectionTitle}>
            Estimate components are informational until verified work is reviewed.
          </h2>
        </div>
        <div style={styles.cardGrid}>
          {estimateComponents.map((component) => (
            <article key={component} style={styles.card}>
              <h3 style={styles.cardTitle}>{component}</h3>
              <p style={styles.cardText}>Included only where applicable and approved.</p>
            </article>
          ))}
        </div>
        <p style={styles.guardrail}>Estimate only. This is not guaranteed and is not the final invoice.</p>
      </section>

      <section aria-labelledby="authorization-title" style={styles.timelineSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Payment authorization vs final charge</p>
          <h2 id="authorization-title" style={styles.sectionTitle}>
            Authorization reserves or verifies the payment method. It is not final payment.
          </h2>
        </div>
        <ol style={styles.timeline}>
          {authorizationTimeline.map((step) => (
            <li key={step} style={styles.timelineItem}>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="invoice-title" style={styles.splitSection}>
        <div>
          <p style={styles.eyebrowDark}>Estimate vs invoice</p>
          <h2 id="invoice-title" style={styles.sectionTitle}>
            An estimate is a planning view, not a guarantee.
          </h2>
          <ol style={styles.stepList}>
            {estimateFlow.map((step) => (
              <li key={step} style={styles.stepItem}>
                {step}
              </li>
            ))}
          </ol>
        </div>
        <div>
          <p style={styles.eyebrowDark}>Separate financial processes</p>
          <h2 style={styles.sectionTitle}>Employer billing is separate from worker compensation.</h2>
          <p style={styles.sectionCopy}>
            The public pricing page does not expose commission percentages, internal pricing
            formulas, payroll calculations, or employer billing totals to workers.
          </p>
        </div>
      </section>

      <section aria-labelledby="cancellation-title" style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Cancellation and replacement principles</p>
          <h2 id="cancellation-title" style={styles.sectionTitle}>
            Charges may depend on timing, work completed, approved rules, and exceptional cases.
          </h2>
          <p style={styles.sectionCopy}>
            Exact fees are not hardcoded on this public page. Exceptional cases and disputes require
            human review.
          </p>
        </div>
      </section>

      <section id="estimate" aria-labelledby="estimate-title" style={styles.whiteSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Pricing calculator placeholder</p>
          <h2 id="estimate-title" style={styles.sectionTitle}>
            Estimate inputs are collected before a governed staffing request.
          </h2>
        </div>
        <div style={styles.formGrid}>
          {calculatorInputs.map((input) => (
            <label key={input} style={styles.fieldLabel}>
              {input}
              <input placeholder="Estimate input" disabled style={styles.input} />
            </label>
          ))}
        </div>
        <p style={styles.guardrail}>
          Output: estimate only. Final amount depends on verified time, employer timesheet review,
          approved adjustments, and applicable pricing rules.
        </p>
      </section>

      <section aria-labelledby="ai-title" style={styles.aiSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>AI estimate support</p>
          <h2 id="ai-title" style={styles.sectionTitle}>
            AI can support estimation, but it does not make financial decisions.
          </h2>
        </div>
        <div style={styles.cardGrid}>
          {aiFinancialBoundary.map((boundary) => (
            <article key={boundary} style={styles.card}>
              <p style={styles.cardText}>{boundary}</p>
            </article>
          ))}
        </div>
      </section>

      <MarketingFooter note="Payment integration is not part of this public page." />
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
    margin: 0,
    maxWidth: 920
  },
  lede: {
    color: "#f0e8d8",
    fontSize: 18,
    lineHeight: 1.6,
    margin: 0,
    maxWidth: 760
  },
  notice: {
    background: "#fff8d8",
    borderRadius: 8,
    color: "#1b160e",
    fontSize: 15,
    fontWeight: 800,
    lineHeight: 1.5,
    margin: "6px 0 0",
    maxWidth: 760,
    padding: 14
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
  whiteSection: {
    background: "#ffffff",
    borderBottom: "1px solid #f0e8d8",
    borderTop: "1px solid #f0e8d8",
    padding: "48px clamp(16px, 4vw, 40px)"
  },
  sectionHeader: {
    display: "grid",
    gap: 8,
    marginBottom: 18,
    maxWidth: 900
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
  pillGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))"
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
  cardGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
  },
  card: {
    background: "#ffffff",
    border: "1px solid #f0e8d8",
    borderRadius: 8,
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
    fontWeight: 700,
    lineHeight: 1.55,
    margin: 0
  },
  guardrail: {
    color: "#2a2114",
    fontSize: 14,
    fontWeight: 900,
    lineHeight: 1.5,
    margin: "18px 0 0"
  },
  timelineSection: {
    background: "#f6efdd",
    borderBottom: "1px solid #f0e8d8",
    borderTop: "1px solid #f0e8d8",
    padding: "48px clamp(16px, 4vw, 40px)"
  },
  timeline: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    listStyle: "none",
    margin: 0,
    padding: 0
  },
  timelineItem: {
    background: "#ffffff",
    border: "1px solid #f0e2c0",
    borderRadius: 8,
    color: "#1b160e",
    fontWeight: 900,
    padding: 16
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
  stepList: {
    display: "grid",
    gap: 10,
    margin: "18px 0 0",
    paddingLeft: 22
  },
  stepItem: {
    color: "#15110b",
    fontWeight: 800,
    lineHeight: 1.45
  },
  formGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
  },
  fieldLabel: {
    color: "#15110b",
    display: "grid",
    fontSize: 14,
    fontWeight: 800,
    gap: 6
  },
  input: {
    background: "#fbf9f4",
    border: "1px solid #d8ccb4",
    borderRadius: 8,
    color: "#6b6356",
    font: "inherit",
    minHeight: 44,
    padding: "0 12px"
  },
  aiSection: {
    background: "#f6efdd",
    borderBottom: "1px solid #f0e8d8",
    borderTop: "1px solid #f0e8d8",
    padding: "48px clamp(16px, 4vw, 40px)"
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
