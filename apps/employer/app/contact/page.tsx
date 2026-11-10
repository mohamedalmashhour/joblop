import type { CSSProperties } from "react";
import { getContactContent } from "./contactContent";
import { PublicSiteFooter, readPublicLocale } from "../pricing/publicPageStyles";
import { SiteHeader } from "../shared/SiteHeader";

// Same order as the content paths: active-shift support first, then general contact.
const pathAnchors = ["#active-shift", "#general-contact"] as const;

export default async function ContactPage() {
  const c = getContactContent(await readPublicLocale());
  return (
    <main style={styles.page}>
      <SiteHeader current="/contact" />

      <section style={styles.hero}>
        <p style={styles.eyebrow}>{c.eyebrow}</p>
        <h1 style={styles.title}>{c.title}</h1>
        <p style={styles.lede}>{c.lede}</p>
        <div style={styles.heroActions}>
          <a href="#active-shift" style={styles.primaryButton}>
            {c.activeShortcut}
          </a>
          <a href="#general-contact" style={styles.secondaryButton}>
            {c.generalShortcut}
          </a>
        </div>
      </section>

      <section aria-labelledby="paths-title" style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrow}>{c.pathsEyebrow}</p>
          <h2 id="paths-title" style={styles.sectionTitle}>
            {c.pathsTitle}
          </h2>
        </div>
        <div style={styles.twoColumn}>
          {c.paths.map((path, index) => (
            <article key={pathAnchors[index]} style={styles.pathCard}>
              <h3 style={styles.cardTitle}>{path.title}</h3>
              <p style={styles.cardText}>{path.text}</p>
              <a href={pathAnchors[index]} style={index === 0 ? styles.cardButton : styles.cardButtonSecondary}>
                {path.button}
              </a>
            </article>
          ))}
        </div>
      </section>

      <section id="active-shift" aria-labelledby="active-title" style={styles.activeSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrow}>{c.activeEyebrow}</p>
          <h2 id="active-title" style={styles.sectionTitle}>
            {c.activeTitle}
          </h2>
          <p style={styles.sectionCopy}>{c.activeCopy}</p>
        </div>
        <div style={styles.splitSection}>
          <div style={{ minWidth: 0 }}>
            <h3 style={styles.cardTitle}>{c.issueCategory}</h3>
            <ul style={styles.choiceList}>
              {c.activeShiftIssues.map((issue) => (
                <li key={issue} style={styles.choice}>
                  {issue}
                </li>
              ))}
            </ul>
          </div>
          <aside style={styles.panel}>
            <h3 style={styles.cardTitle}>{c.panelTitle}</h3>
            <p style={styles.cardText}>{c.panelText}</p>
            <ul style={styles.choiceList}>
              {c.immediateActions.map((action) => (
                <li key={action} style={styles.panelChoice}>
                  {action}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section aria-labelledby="timeline-title" style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrow}>{c.timelineEyebrow}</p>
          <h2 id="timeline-title" style={styles.sectionTitle}>
            {c.timelineTitle}
          </h2>
        </div>
        <ol style={styles.timeline}>
          {c.escalationTimeline.map((step, index) => (
            <li key={step} style={styles.timelineItem}>
              <span aria-hidden="true" style={styles.stepNumber}>
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section id="general-contact" aria-labelledby="general-title" style={styles.whiteSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrow}>{c.generalEyebrow}</p>
          <h2 id="general-title" style={styles.sectionTitle}>
            {c.generalTitle}
          </h2>
        </div>
        <div style={styles.formGrid}>
          <label style={styles.fieldLabel}>
            {c.reasonLabel}
            <select defaultValue="" style={styles.input}>
              <option value="" disabled>
                {c.reasonPlaceholder}
              </option>
              {c.generalReasons.map((reason) => (
                <option key={reason}>{reason}</option>
              ))}
            </select>
          </label>
          <label style={styles.fieldLabel}>
            {c.userTypeLabel}
            <select defaultValue="" style={styles.input}>
              <option value="" disabled>
                {c.userTypePlaceholder}
              </option>
              {c.userTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label style={styles.fieldLabel}>
            {c.subjectLabel}
            <input placeholder={c.subjectPlaceholder} style={styles.input} />
          </label>
          <label style={styles.fieldLabel}>
            {c.responseLabel}
            <input placeholder={c.responsePlaceholder} style={styles.input} />
          </label>
        </div>
        <label style={styles.messageLabel}>
          {c.messageLabel}
          <textarea placeholder={c.messagePlaceholder} style={styles.textarea} />
        </label>
        <a href="mailto:support@joblop.ca?subject=Joblop%20support%20request" style={{ ...styles.primaryButton, marginTop: 14 }}>
          {c.emailButton}
        </a>
        <p style={styles.guardrail}>{c.emailNote}</p>
      </section>

      <section aria-labelledby="guardrails-title" style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrow}>{c.guardrailsEyebrow}</p>
          <h2 id="guardrails-title" style={styles.sectionTitle}>
            {c.guardrailsTitle}
          </h2>
          <p style={styles.sectionCopy}>{c.guardrailsCopy}</p>
        </div>
      </section>

      <section aria-labelledby="attachments-title" style={styles.whiteSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrow}>{c.attachmentsEyebrow}</p>
          <h2 id="attachments-title" style={styles.sectionTitle}>
            {c.attachmentsTitle}
          </h2>
        </div>
        <div style={styles.cardGrid}>
          {c.attachmentWarnings.map((warning) => (
            <article key={warning} style={styles.card}>
              <p style={styles.cardTextFlat}>{warning}</p>
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
        <div style={styles.cardGrid}>
          {c.aiSupportBoundary.map((boundary) => (
            <article key={boundary} style={styles.card}>
              <p style={styles.cardTextFlat}>{boundary}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="faq-title" style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrow}>{c.faqEyebrow}</p>
          <h2 id="faq-title" style={styles.sectionTitle}>
            {c.faqTitle}
          </h2>
        </div>
        <div style={styles.cardGrid}>
          {c.faqPreview.map((question) => (
            <article key={question} style={styles.card}>
              <p style={styles.cardTextFlat}>{question}</p>
            </article>
          ))}
        </div>
      </section>

      <PublicSiteFooter />
    </main>
  );
}

const GOLD = "#F8B808";
const line = "1px solid rgba(248, 184, 8, 0.16)";
const pad = "48px clamp(16px, 4vw, 40px)";

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
  page: { background: "#000000", color: "#f4efe4", fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh", overflowWrap: "anywhere" },
  primaryButton: { ...baseButton, background: GOLD, color: "#000000" },
  secondaryButton: { ...baseButton, background: "#000000", border: "1px solid rgba(248, 184, 8, 0.34)", color: "#f4efe4" },
  cardButton: { ...baseButton, background: GOLD, color: "#000000", marginTop: 14 },
  cardButtonSecondary: { ...baseButton, background: "#000000", border: "1px solid rgba(248, 184, 8, 0.34)", color: "#f4efe4", marginTop: 14 },
  hero: { background: "#1b160e", color: "#ffffff", display: "grid", gap: 14, padding: "clamp(34px, 7vw, 72px) clamp(16px, 4vw, 40px)" },
  heroActions: { display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 },
  eyebrow: { color: GOLD, fontSize: 13, fontWeight: 900, letterSpacing: 0, margin: "0 0 8px", textTransform: "uppercase" },
  title: { fontSize: "clamp(34px, 5vw, 58px)", lineHeight: 1.15, margin: 0, maxWidth: 920 },
  lede: { color: "#f0e8d8", fontSize: 18, lineHeight: 1.6, margin: 0, maxWidth: 820 },
  section: { padding: pad },
  activeSection: { background: "#0c0c0c", borderBottom: line, borderTop: line, padding: pad },
  whiteSection: { background: "#000000", borderBottom: line, borderTop: line, padding: pad },
  aiSection: { background: "#0c0c0c", borderBottom: line, borderTop: line, padding: pad },
  sectionHeader: { display: "grid", gap: 0, marginBottom: 18, maxWidth: 900 },
  sectionTitle: { color: "#f4efe4", fontSize: "clamp(26px, 4vw, 42px)", lineHeight: 1.18, margin: 0 },
  sectionCopy: { color: "#b3a894", fontSize: 16, lineHeight: 1.6, margin: "12px 0 0", maxWidth: 780 },
  twoColumn: { display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))" },
  splitSection: { display: "grid", gap: 22, gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))" },
  pathCard: { background: "#0c0c0c", border: line, borderRadius: 8, display: "grid", alignContent: "start", justifyItems: "start", padding: 20 },
  panel: { background: "#000000", border: line, borderRadius: 8, minWidth: 0, padding: 20 },
  cardGrid: { display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))" },
  card: { background: "#0c0c0c", border: line, borderRadius: 8, padding: 18 },
  cardTitle: { color: "#f4efe4", fontSize: 18, lineHeight: 1.3, margin: 0 },
  cardText: { color: "#b3a894", fontSize: 14, lineHeight: 1.55, margin: "8px 0 0" },
  cardTextFlat: { color: "#f0e8d8", fontSize: 14, lineHeight: 1.55, margin: 0 },
  // Issue categories and immediate actions are a list of choices, not big buttons: light rows.
  choiceList: {
    display: "grid",
    gap: 6,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
    listStyle: "none",
    margin: "14px 0 0",
    padding: 0
  },
  choice: {
    alignItems: "center",
    background: "#141210",
    borderRadius: 6,
    borderInlineStart: `3px solid ${GOLD}`,
    color: "#f0e8d8",
    display: "flex",
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.35,
    minHeight: 44,
    padding: "8px 12px"
  },
  panelChoice: {
    alignItems: "center",
    background: "#141210",
    borderRadius: 6,
    color: "#f0e8d8",
    display: "flex",
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.35,
    minHeight: 44,
    padding: "8px 12px"
  },
  timeline: { display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(min(180px, 100%), 1fr))", listStyle: "none", margin: 0, padding: 0 },
  timelineItem: { alignItems: "center", background: "#0c0c0c", border: line, borderRadius: 8, color: "#f4efe4", display: "flex", fontWeight: 700, gap: 10, padding: 14 },
  stepNumber: { alignItems: "center", background: GOLD, borderRadius: 999, color: "#000000", display: "inline-flex", flexShrink: 0, fontSize: 13, fontWeight: 900, height: 26, justifyContent: "center", width: 26 },
  formGrid: { display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))" },
  fieldLabel: { color: "#f4efe4", display: "grid", fontSize: 14, fontWeight: 800, gap: 8, minWidth: 0 },
  messageLabel: { color: "#f4efe4", display: "grid", fontSize: 14, fontWeight: 800, gap: 8, marginTop: 14 },
  input: { background: "#000000", border: "1px solid rgba(248, 184, 8, 0.6)", borderRadius: 8, boxSizing: "border-box", color: "#f4efe4", font: "inherit", fontWeight: 500, minHeight: 48, padding: "0 12px", width: "100%" },
  textarea: { background: "#000000", border: "1px solid rgba(248, 184, 8, 0.6)", borderRadius: 8, boxSizing: "border-box", color: "#f4efe4", font: "inherit", fontWeight: 500, minHeight: 120, padding: 12, width: "100%" },
  guardrail: { color: "#b3a894", fontSize: 14, fontWeight: 600, lineHeight: 1.5, margin: "12px 0 0" }
};
