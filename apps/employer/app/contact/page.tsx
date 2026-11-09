import type { CSSProperties } from "react";
import { JobLopLogo } from "../JobLopLogo";
import {
  activeShiftIssues,
  aiSupportBoundary,
  attachmentWarnings,
  contactPaths,
  escalationTimeline,
  faqPreview,
  generalReasons,
  immediateActions
} from "./contactContent";
import { PublicSiteFooter } from "../pricing/publicPageStyles";

export default function ContactPage() {
  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <a href="/" style={styles.brand} aria-label="Joblop home"><JobLopLogo height={28} /></a>
        <nav aria-label="Primary navigation" style={styles.nav}>
          <a href="/about" style={styles.navLink}>
            About
          </a>
          <a href="/how-it-works" style={styles.navLink}>
            How it works
          </a>
          <a href="/pricing" style={styles.navLink}>
            Pricing
          </a>
          <a href="/contact" style={styles.navLink} aria-current="page">
            Contact
          </a>
          <a href="/faq" style={styles.navLink}>
            FAQ
          </a>
          <a href="/signin" style={styles.navLink}>
            Sign in
          </a>
        </nav>
        <div style={styles.headerActions}>
          <a href="#active-shift" style={styles.primaryButton}>
            Active-shift help
          </a>
          <a href="#general-contact" style={styles.secondaryButton}>
            General contact
          </a>
        </div>
      </header>

      <section style={styles.hero}>
        <p style={styles.eyebrow}>Contact Joblop</p>
        <h1 style={styles.title}>Choose the right support path so your request can be routed safely.</h1>
        <p style={styles.lede}>
          Joblop handles staffing and operational shift issues. Medical emergencies, threats
          to immediate safety, or public-safety emergencies must use local emergency services.
        </p>
      </section>

      <section aria-labelledby="paths-title" style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Support paths</p>
          <h2 id="paths-title" style={styles.sectionTitle}>
            Active-shift support is separate from ordinary contact.
          </h2>
        </div>
        <div style={styles.twoColumn}>
          {contactPaths.map((path) => (
            <article key={path.title} style={styles.pathCard}>
              <h3 style={styles.cardTitle}>{path.title}</h3>
              <p style={styles.cardText}>{path.text}</p>
              <a
                href={path.title.startsWith("Help") ? "#active-shift" : "#general-contact"}
                style={styles.cardButton}
              >
                {path.title.startsWith("Help") ? "Start Active-Shift Support" : "Use General Contact"}
              </a>
            </article>
          ))}
        </div>
      </section>

      <section id="active-shift" aria-labelledby="active-title" style={styles.activeSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Active-shift support</p>
          <h2 id="active-title" style={styles.sectionTitle}>
            Operational help for a current or imminent shift.
          </h2>
          <p style={styles.sectionCopy}>
            This route prepares or routes an operational case. It does not promise automatic
            resolution, automatic replacement, worker discipline, or confirmed staffing.
          </p>
        </div>
        <div style={styles.splitSection}>
          <div>
            <h3 style={styles.cardTitle}>Issue category</h3>
            <div style={styles.pillGrid}>
              {activeShiftIssues.map((issue) => (
                <span key={issue} style={styles.pill}>
                  {issue}
                </span>
              ))}
            </div>
          </div>
          <aside style={styles.panel}>
            <h3 style={styles.cardTitle}>Active case panel</h3>
            <p style={styles.cardText}>
              Signed-in users may see authorized shift context. Signed-out users provide only the
              minimum details needed to identify the shift.
            </p>
            <div style={styles.pillGrid}>
              {immediateActions.map((action) => (
                <span key={action} style={styles.panelPill}>
                  {action}
                </span>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section aria-labelledby="timeline-title" style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Case escalation timeline</p>
          <h2 id="timeline-title" style={styles.sectionTitle}>
            Case status is visible, but resolution is not fabricated.
          </h2>
        </div>
        <ol style={styles.timeline}>
          {escalationTimeline.map((step) => (
            <li key={step} style={styles.timelineItem}>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section id="general-contact" aria-labelledby="general-title" style={styles.whiteSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>General contact</p>
          <h2 id="general-title" style={styles.sectionTitle}>
            Use this route for non-active-shift questions.
          </h2>
        </div>
        <div style={styles.formGrid}>
          <label style={styles.fieldLabel}>
            Contact reason
            <select defaultValue="" style={styles.input}>
              <option value="" disabled>
                Select a reason
              </option>
              {generalReasons.map((reason) => (
                <option key={reason}>{reason}</option>
              ))}
            </select>
          </label>
          <label style={styles.fieldLabel}>
            User type
            <select defaultValue="" style={styles.input}>
              <option value="" disabled>
                Select user type
              </option>
              <option>Worker</option>
              <option>Employer</option>
              <option>Residence manager</option>
              <option>Scheduler</option>
              <option>Applicant</option>
              <option>Visitor</option>
            </select>
          </label>
          <label style={styles.fieldLabel}>
            Subject
            <input placeholder="Short summary" style={styles.input} />
          </label>
          <label style={styles.fieldLabel}>
            Preferred response method
            <input placeholder="Email or secure in-app message when available" style={styles.input} />
          </label>
        </div>
        <label style={styles.messageLabel}>
          Message
          <textarea placeholder="Describe what you need. Do not include passwords or full financial details." style={styles.textarea} />
        </label>
        <a href="mailto:support@joblop.ca?subject=Joblop%20support%20request" style={styles.primaryButton}>
          Email Joblop support
        </a>
        <p style={styles.guardrail}>This opens your email app to reach Joblop support directly. Don&apos;t include passwords or full financial details.</p>
      </section>

      <section aria-labelledby="guardrails-title" style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Replacement and privacy guardrails</p>
          <h2 id="guardrails-title" style={styles.sectionTitle}>
            Support routes issues to governed workflows.
          </h2>
          <p style={styles.sectionCopy}>
            Availability is not guaranteed. Matching may be AI-assisted, but a person or authorized
            employer confirms final assignment. The original shift remains unresolved until a
            replacement is confirmed.
          </p>
        </div>
      </section>

      <section aria-labelledby="attachments-title" style={styles.whiteSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Attachment rules</p>
          <h2 id="attachments-title" style={styles.sectionTitle}>
            Sensitive material belongs in governed secure channels.
          </h2>
        </div>
        <div style={styles.cardGrid}>
          {attachmentWarnings.map((warning) => (
            <article key={warning} style={styles.card}>
              <p style={styles.cardText}>{warning}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="ai-title" style={styles.aiSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>AI support boundary</p>
          <h2 id="ai-title" style={styles.sectionTitle}>
            AI can help classify support needs, but it cannot resolve governed workflows.
          </h2>
        </div>
        <div style={styles.cardGrid}>
          {aiSupportBoundary.map((boundary) => (
            <article key={boundary} style={styles.card}>
              <p style={styles.cardText}>{boundary}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="faq-title" style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>FAQ preview</p>
          <h2 id="faq-title" style={styles.sectionTitle}>
            Common support questions before contacting us.
          </h2>
        </div>
        <div style={styles.cardGrid}>
          {faqPreview.map((question) => (
            <article key={question} style={styles.card}>
              <p style={styles.cardText}>{question}</p>
            </article>
          ))}
        </div>
      </section>

      <PublicSiteFooter />
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
  page: { background: "#000000", color: "#f4efe4", fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh" },
  header: { alignItems: "center", background: "#000000", borderBottom: "1px solid rgba(248, 184, 8, 0.16)", display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", padding: "18px clamp(16px, 4vw, 40px)", position: "sticky", top: 0, zIndex: 1 },
  brand: { color: "#f4efe4", fontSize: 20, fontWeight: 900, textDecoration: "none" },
  nav: { alignItems: "center", display: "flex", flexWrap: "wrap", gap: 14 },
  navLink: { color: "#f4efe4", fontSize: 14, fontWeight: 700, textDecoration: "none" },
  headerActions: { display: "flex", flexWrap: "wrap", gap: 8 },
  primaryButton: { ...baseButton, background: "#1b160e", color: "#ffffff" },
  secondaryButton: { ...baseButton, background: "#0c0c0c", color: "#f4efe4" },
  cardButton: { ...baseButton, background: "#1b160e", color: "#ffffff", marginTop: 14 },
  hero: { background: "#1b160e", color: "#ffffff", display: "grid", gap: 14, padding: "clamp(34px, 7vw, 72px) clamp(16px, 4vw, 40px)" },
  eyebrow: { color: "#fff8d8", fontSize: 13, fontWeight: 900, letterSpacing: 0, margin: 0, textTransform: "uppercase" },
  eyebrowDark: { color: "#f4efe4", fontSize: 12, fontWeight: 900, letterSpacing: 0, margin: 0, textTransform: "uppercase" },
  title: { fontSize: "clamp(34px, 5vw, 58px)", lineHeight: 1.04, margin: 0, maxWidth: 920 },
  lede: { color: "#f0e8d8", fontSize: 18, lineHeight: 1.6, margin: 0, maxWidth: 820 },
  section: { padding: "48px clamp(16px, 4vw, 40px)" },
  activeSection: { background: "#0c0c0c", borderBottom: "1px solid rgba(248, 184, 8, 0.16)", borderTop: "1px solid rgba(248, 184, 8, 0.16)", padding: "48px clamp(16px, 4vw, 40px)" },
  whiteSection: { background: "#000000", borderBottom: "1px solid rgba(248, 184, 8, 0.16)", borderTop: "1px solid rgba(248, 184, 8, 0.16)", padding: "48px clamp(16px, 4vw, 40px)" },
  aiSection: { background: "#0c0c0c", borderBottom: "1px solid rgba(248, 184, 8, 0.16)", borderTop: "1px solid rgba(248, 184, 8, 0.16)", padding: "48px clamp(16px, 4vw, 40px)" },
  sectionHeader: { display: "grid", gap: 8, marginBottom: 18, maxWidth: 900 },
  sectionTitle: { color: "#f4efe4", fontSize: "clamp(26px, 4vw, 42px)", lineHeight: 1.12, margin: 0 },
  sectionCopy: { color: "#b3a894", fontSize: 16, lineHeight: 1.6, margin: 0, maxWidth: 780 },
  twoColumn: { display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" },
  splitSection: { display: "grid", gap: 22, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" },
  pathCard: { background: "#000000", border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 8, padding: 20 },
  panel: { background: "#000000", border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 8, padding: 20 },
  cardGrid: { display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" },
  card: { background: "#000000", border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 8, padding: 18 },
  cardTitle: { color: "#f4efe4", fontSize: 18, margin: 0 },
  cardText: { color: "#b3a894", fontSize: 14, fontWeight: 700, lineHeight: 1.55, margin: "8px 0 0" },
  pillGrid: { display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginTop: 14 },
  pill: { background: "#000000", border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 8, color: "#f4efe4", fontWeight: 900, padding: 14 },
  panelPill: { background: "#0c0c0c", border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 8, color: "#f4efe4", fontWeight: 900, padding: 14 },
  timeline: { display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", listStyle: "none", margin: 0, padding: 0 },
  timelineItem: { background: "#000000", border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 8, color: "#f4efe4", fontWeight: 900, padding: 16 },
  formGrid: { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" },
  fieldLabel: { color: "#f4efe4", display: "grid", fontSize: 14, fontWeight: 800, gap: 6 },
  messageLabel: { color: "#f4efe4", display: "grid", fontSize: 14, fontWeight: 800, gap: 6, marginTop: 12 },
  input: { border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 8, color: "#f4efe4", font: "inherit", minHeight: 44, padding: "0 12px" },
  textarea: { border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 8, color: "#f4efe4", font: "inherit", minHeight: 120, padding: 12 },
  disabledButton: { background: "#0c0c0c", border: 0, borderRadius: 8, color: "#f4efe4", fontWeight: 900, marginTop: 12, minHeight: 48, padding: "0 16px" },
  guardrail: { color: "#f4efe4", fontSize: 14, fontWeight: 900, lineHeight: 1.5, margin: "12px 0 0" },
  footer: { alignItems: "center", background: "#1b160e", color: "#ffffff", display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", padding: "28px clamp(16px, 4vw, 40px)" },
  footerLinks: { display: "flex", flexWrap: "wrap", gap: 12 },
  footerLink: { color: "#ffffff", fontWeight: 700, textDecoration: "none" },
  footerNote: { color: "#f0e8d8", fontSize: 13 }
};
