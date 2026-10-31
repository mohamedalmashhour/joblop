import type { CSSProperties } from "react";
import { MarketingHeader, MarketingFooter } from "../MarketingChrome";
import { aiFaqRules, faqAnswers, faqCategories, sensitiveSearchWarning } from "./faqContent";

export default function FAQPage() {
  return (
    <main style={styles.page}>
      <MarketingHeader />

      <section style={styles.hero}>
        <p style={styles.eyebrow}>Help center and FAQ</p>
        <h1 style={styles.title}>Find approved answers with visible content governance.</h1>
        <p style={styles.lede}>
          Some answers depend on your country, account, contract, role, or shift. Sign in may be
          required for account-specific help.
        </p>
        <label style={styles.searchLabel}>
          Search FAQ placeholder
          <input placeholder="How do I report a late worker?" style={styles.searchInput} />
        </label>
      </section>

      <section aria-labelledby="pathways-title" style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Quick pathways</p>
          <h2 id="pathways-title" style={styles.sectionTitle}>
            Start with the category that matches your role or issue.
          </h2>
        </div>
        <div style={styles.pillGrid}>
          {faqCategories.map((category) => (
            <span key={category} style={styles.pill}>
              {category}
            </span>
          ))}
        </div>
        <a href="/contact#active-shift" style={styles.activeLink}>
          Open Active-Shift Support
        </a>
      </section>

      <section aria-labelledby="answers-title" style={styles.whiteSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Expanded answers</p>
          <h2 id="answers-title" style={styles.sectionTitle}>
            Every answer shows owner, status, version, applicability, source, and escalation path.
          </h2>
        </div>
        <div style={styles.answerGrid}>
          {faqAnswers.map((answer) => (
            <article key={answer.question} style={styles.answerCard}>
              <p style={styles.category}>{answer.category}</p>
              <h3 style={styles.cardTitle}>{answer.question}</h3>
              <p style={styles.cardText}>{answer.summary}</p>
              <p style={styles.detailText}>{answer.detail}</p>
              <section aria-label={`${answer.question} answer governance`} style={styles.governance}>
                <h4 style={styles.governanceTitle}>Answer Governance</h4>
                <dl style={styles.metaGrid}>
                  <Meta label="Owner" value={answer.governance.owner} />
                  <Meta label="Review Status" value={answer.governance.reviewStatus} />
                  <Meta label="Version" value={answer.governance.version} />
                  <Meta label="Last Reviewed" value={answer.governance.lastReviewed} />
                  <Meta label="Applicability" value={answer.governance.applicability} />
                  <Meta label="Source of Truth" value={answer.governance.sourceOfTruth} />
                  <Meta label="Escalation Path" value={answer.governance.escalationPath} />
                </dl>
              </section>
              <span style={styles.action}>{answer.action}</span>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="no-results-title" style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>No results state</p>
          <h2 id="no-results-title" style={styles.sectionTitle}>
            Search stays helpful without collecting sensitive information.
          </h2>
        </div>
        <div style={styles.cardGrid}>
          {sensitiveSearchWarning.map((warning) => (
            <article key={warning} style={styles.card}>
              <p style={styles.cardText}>{warning}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="ai-title" style={styles.aiSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>AI and content governance</p>
          <h2 id="ai-title" style={styles.sectionTitle}>
            AI can help find and draft content, but it cannot publish policy.
          </h2>
        </div>
        <div style={styles.cardGrid}>
          {aiFaqRules.map((rule) => (
            <article key={rule} style={styles.card}>
              <p style={styles.cardText}>{rule}</p>
            </article>
          ))}
        </div>
      </section>

      <MarketingFooter note="No search engine or knowledge-base backend is connected." />
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt style={styles.metaLabel}>{label}</dt>
      <dd style={styles.metaValue}>{value}</dd>
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { background: "#fbf9f4", color: "#15110b", fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh" },
  header: { alignItems: "center", background: "#ffffff", borderBottom: "1px solid #f0e8d8", display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", padding: "18px clamp(16px, 4vw, 40px)", position: "sticky", top: 0, zIndex: 1 },
  brand: { color: "#1b160e", fontSize: 20, fontWeight: 900, textDecoration: "none" },
  nav: { alignItems: "center", display: "flex", flexWrap: "wrap", gap: 14 },
  navLink: { color: "#15110b", fontSize: 14, fontWeight: 700, textDecoration: "none" },
  hero: { background: "#1b160e", color: "#ffffff", display: "grid", gap: 14, padding: "clamp(34px, 7vw, 72px) clamp(16px, 4vw, 40px)" },
  eyebrow: { color: "#fff8d8", fontSize: 13, fontWeight: 900, letterSpacing: 0, margin: 0, textTransform: "uppercase" },
  eyebrowDark: { color: "#2a2114", fontSize: 12, fontWeight: 900, letterSpacing: 0, margin: 0, textTransform: "uppercase" },
  title: { fontSize: "clamp(34px, 5vw, 58px)", lineHeight: 1.04, margin: 0, maxWidth: 920 },
  lede: { color: "#f0e8d8", fontSize: 18, lineHeight: 1.6, margin: 0, maxWidth: 820 },
  searchLabel: { color: "#ffffff", display: "grid", fontSize: 14, fontWeight: 900, gap: 8, maxWidth: 620 },
  searchInput: { border: "1px solid #d8ccb4", borderRadius: 8, color: "#15110b", font: "inherit", minHeight: 48, padding: "0 14px" },
  section: { padding: "48px clamp(16px, 4vw, 40px)" },
  whiteSection: { background: "#ffffff", borderBottom: "1px solid #f0e8d8", borderTop: "1px solid #f0e8d8", padding: "48px clamp(16px, 4vw, 40px)" },
  aiSection: { background: "#f6efdd", borderBottom: "1px solid #f0e8d8", borderTop: "1px solid #f0e8d8", padding: "48px clamp(16px, 4vw, 40px)" },
  sectionHeader: { display: "grid", gap: 8, marginBottom: 18, maxWidth: 900 },
  sectionTitle: { color: "#1b160e", fontSize: "clamp(26px, 4vw, 42px)", lineHeight: 1.12, margin: 0 },
  pillGrid: { display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" },
  pill: { background: "#ffffff", border: "1px solid #f0e8d8", borderRadius: 8, color: "#1b160e", fontWeight: 900, padding: 16 },
  activeLink: { alignItems: "center", background: "#1b160e", borderRadius: 8, color: "#ffffff", display: "inline-flex", fontWeight: 900, marginTop: 18, minHeight: 48, padding: "0 18px", textDecoration: "none" },
  answerGrid: { display: "grid", gap: 16 },
  answerCard: { background: "#fbf9f4", border: "1px solid #f0e8d8", borderRadius: 8, padding: 20 },
  category: { color: "#2a2114", fontSize: 12, fontWeight: 900, margin: 0, textTransform: "uppercase" },
  cardGrid: { display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" },
  card: { background: "#ffffff", border: "1px solid #f0e8d8", borderRadius: 8, padding: 18 },
  cardTitle: { color: "#1b160e", fontSize: 20, margin: "8px 0 0" },
  cardText: { color: "#6b6356", fontSize: 14, fontWeight: 700, lineHeight: 1.55, margin: "8px 0 0" },
  detailText: { color: "#15110b", fontSize: 15, lineHeight: 1.6, margin: "12px 0 0" },
  governance: { background: "#ffffff", border: "1px solid #f0e8d8", borderRadius: 8, marginTop: 16, padding: 16 },
  governanceTitle: { color: "#1b160e", fontSize: 16, margin: 0 },
  metaGrid: { display: "grid", gap: 8, gridTemplateColumns: "minmax(140px, 180px) 1fr", margin: "12px 0 0" },
  metaLabel: { color: "#6b6356", fontSize: 13, fontWeight: 900, margin: 0 },
  metaValue: { color: "#15110b", fontSize: 13, fontWeight: 800, margin: 0 },
  action: { background: "#fff8d8", borderRadius: 8, color: "#1b160e", display: "inline-flex", fontWeight: 900, marginTop: 14, padding: "10px 12px" },
  footer: { alignItems: "center", background: "#1b160e", color: "#ffffff", display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", padding: "28px clamp(16px, 4vw, 40px)" },
  footerLinks: { display: "flex", flexWrap: "wrap", gap: 12 },
  footerLink: { color: "#ffffff", fontWeight: 700, textDecoration: "none" },
  footerNote: { color: "#f0e8d8", fontSize: 13 }
};
