import type { CSSProperties } from "react";
import {
  employerJourney,
  faqPreview,
  staffingCategories,
  trustControls,
  workerBenefits,
  workerJourney
} from "./landingContent";

export default function LandingPage() {
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
          <a href="/how-it-works" style={styles.navLink}>
            How it works
          </a>
          <a href="#worker" style={styles.navLink}>
            Worker
          </a>
          <a href="#employer" style={styles.navLink}>
            Employer
          </a>
          <a href="/pricing" style={styles.navLink}>
            Pricing
          </a>
          <a href="/faq" style={styles.navLink}>
            FAQ
          </a>
          <a href="#sign-in" style={styles.navLink}>
            Sign in
          </a>
        </nav>
        <div style={styles.headerActions}>
          <a href="#worker" style={styles.secondaryButton}>
            Become worker
          </a>
          <a href="#employer" style={styles.primaryButton}>
            Request staff
          </a>
        </div>
      </header>

      <section style={styles.hero}>
        <div style={styles.heroCopy}>
          <p style={styles.eyebrow}>Senior living and healthcare staffing</p>
          <h1 style={styles.title}>Enterprise staffing operations for care-focused teams.</h1>
          <p style={styles.lede}>
            Resident Job helps residences request staff, workers find suitable shifts, and teams
            keep decisions governed. AI assists with recommendations. Humans review and approve.
          </p>
          <div style={styles.heroActions}>
            <a href="#employer" style={styles.primaryButtonLarge}>
              Request staff
            </a>
            <a href="#worker" style={styles.secondaryButtonLarge}>
              Become a worker
            </a>
          </div>
        </div>

        <aside aria-labelledby="quick-request-title" style={styles.quickPanel}>
          <p style={styles.panelKicker}>Start a staffing request</p>
          <h2 id="quick-request-title" style={styles.panelTitle}>
            What do you need?
          </h2>
          <div style={styles.choiceGrid}>
            {staffingCategories.map((category) => (
              <button key={category.name} type="button" style={styles.choiceButton}>
                {category.name}
              </button>
            ))}
          </div>
          <label style={styles.fieldLabel}>
            Location
            <input placeholder="City / region" style={styles.input} />
          </label>
          <label style={styles.fieldLabel}>
            Timing
            <select defaultValue="today" style={styles.input}>
              <option value="today">Today</option>
              <option value="urgent">Emergency</option>
              <option value="recurring">Recurring</option>
            </select>
          </label>
          <button type="button" style={styles.fullButton}>
            Start request
          </button>
          <p style={styles.guardrail}>Starts human review, not automatic dispatch.</p>
        </aside>
      </section>

      <section aria-labelledby="categories-title" style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Staffing categories</p>
          <h2 id="categories-title" style={styles.sectionTitle}>
            Request the right group before details are reviewed.
          </h2>
        </div>
        <div style={styles.cardGrid}>
          {staffingCategories.map((category) => (
            <article key={category.name} style={styles.card}>
              <h3 style={styles.cardTitle}>{category.name}</h3>
              <p style={styles.cardText}>{category.roles}</p>
              <p style={styles.cardNote}>{category.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="worker" aria-labelledby="worker-title" style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>For workers</p>
          <h2 id="worker-title" style={styles.sectionTitle}>
            A mobile-first way to manage approved healthcare staffing opportunities.
          </h2>
        </div>
        <div style={styles.benefitGrid}>
          {workerBenefits.map((benefit) => (
            <span key={benefit} style={styles.benefit}>
              {benefit}
            </span>
          ))}
        </div>
      </section>

      <section id="how-it-works" aria-labelledby="workflow-title" style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>How it works</p>
          <h2 id="workflow-title" style={styles.sectionTitle}>
            Two clear journeys, one governed operating model.
          </h2>
        </div>
        <div style={styles.twoColumn}>
          <JourneyCard title="For Workers" steps={workerJourney} />
          <JourneyCard title="For Employers" steps={employerJourney} />
        </div>
      </section>

      <section aria-labelledby="ai-title" style={styles.aiSection}>
        <div>
          <p style={styles.eyebrowDark}>AI support model</p>
          <h2 id="ai-title" style={styles.sectionTitle}>
            AI recommendations stay separate from human decisions.
          </h2>
        </div>
        <div style={styles.aiFlow}>
          <FlowStep
            title="AI Recommendations"
            text="Evidence, context, and suggested next steps."
          />
          <FlowStep
            title="Human Review"
            text="Employer or authorized operator reviews the recommendation."
          />
          <FlowStep title="Final Decision" text="Recorded human approval controls the workflow." />
        </div>
        <p style={styles.guardrailDark}>
          AI does not hire, assign, approve payment, or dispatch workers automatically.
        </p>
      </section>

      <section aria-labelledby="trust-title" style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Trust and compliance</p>
          <h2 id="trust-title" style={styles.sectionTitle}>
            Visible controls without unsupported promises.
          </h2>
          <p style={styles.sectionCopy}>
            These are platform mechanisms and review states. They are not certification claims
            unless confirmed by approved policy and actual records.
          </p>
        </div>
        <div style={styles.cardGrid}>
          {trustControls.map((control) => (
            <article key={control} style={styles.controlCard}>
              <h3 style={styles.cardTitle}>{control}</h3>
              <p style={styles.cardText}>Status placeholder for controlled review and audit.</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="proof-title" style={styles.proofSection}>
        <div>
          <p style={styles.eyebrowDark}>Proof area reserved</p>
          <h2 id="proof-title" style={styles.sectionTitle}>
            Testimonials will appear only after approval.
          </h2>
        </div>
        <p style={styles.sectionCopy}>
          No fabricated names, companies, metrics, or quotes are shown in this launch baseline.
        </p>
      </section>

      <section id="faq" aria-labelledby="faq-title" style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>FAQ preview</p>
          <h2 id="faq-title" style={styles.sectionTitle}>
            Questions visitors should answer before choosing a path.
          </h2>
        </div>
        <div style={styles.faqGrid}>
          {faqPreview.map((question) => (
            <article key={question} style={styles.faqItem}>
              <h3 style={styles.faqQuestion}>{question}</h3>
              <p style={styles.cardText}>Answer preview links to the governed FAQ page.</p>
            </article>
          ))}
        </div>
        <a href="/faq" style={styles.faqLink}>
          View governed FAQ
        </a>
      </section>

      <footer style={styles.footer}>
        <span>Resident Job</span>
        <nav aria-label="Footer navigation" style={styles.footerLinks}>
          <a href="/about" style={styles.footerLink}>
            About
          </a>
          <a href="/pricing" style={styles.footerLink}>
            Pricing
          </a>
          <a href="/contact" style={styles.footerLink}>
            Contact
          </a>
          <a href="#privacy" style={styles.footerLink}>
            Privacy
          </a>
          <a href="#terms" style={styles.footerLink}>
            Terms
          </a>
          <a href="#worker" style={styles.footerLink}>
            Become a Worker
          </a>
          <a href="#employer" style={styles.footerLink}>
            Request Staff
          </a>
        </nav>
        <span style={styles.footerNote}>
          Language and region selector reserved for localization.
        </span>
      </footer>
    </main>
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
    gap: 28,
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    padding: "clamp(32px, 7vw, 72px) clamp(16px, 4vw, 40px)"
  },
  heroCopy: {
    alignSelf: "center",
    maxWidth: 760
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
    fontSize: "clamp(36px, 6vw, 68px)",
    lineHeight: 1,
    margin: "12px 0",
    maxWidth: 840
  },
  lede: {
    color: "#dce8e8",
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
  quickPanel: {
    background: "#ffffff",
    border: "1px solid #dce8e8",
    borderRadius: 8,
    color: "#0b1f3a",
    display: "grid",
    gap: 12,
    padding: 20
  },
  panelKicker: {
    color: "#607276",
    fontSize: 13,
    fontWeight: 800,
    margin: 0,
    textTransform: "uppercase"
  },
  panelTitle: {
    fontSize: 24,
    margin: 0
  },
  choiceGrid: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))"
  },
  choiceButton: {
    background: "#f7faf9",
    border: "1px solid #dce8e8",
    borderRadius: 8,
    color: "#071f4d",
    fontWeight: 800,
    minHeight: 44,
    padding: "0 12px"
  },
  fieldLabel: {
    color: "#0b1f3a",
    display: "grid",
    fontSize: 14,
    fontWeight: 800,
    gap: 6
  },
  input: {
    border: "1px solid #bccdce",
    borderRadius: 8,
    color: "#0b1f3a",
    font: "inherit",
    minHeight: 44,
    padding: "0 12px"
  },
  fullButton: {
    background: "#071f4d",
    border: 0,
    borderRadius: 8,
    color: "#ffffff",
    fontWeight: 900,
    minHeight: 48,
    padding: "0 16px"
  },
  guardrail: {
    color: "#607276",
    fontSize: 13,
    fontWeight: 700,
    margin: 0
  },
  guardrailDark: {
    color: "#123b78",
    fontSize: 14,
    fontWeight: 800,
    margin: 0
  },
  section: {
    padding: "48px clamp(16px, 4vw, 40px)"
  },
  sectionHeader: {
    display: "grid",
    gap: 8,
    marginBottom: 18,
    maxWidth: 820
  },
  sectionTitle: {
    color: "#071f4d",
    fontSize: "clamp(26px, 4vw, 42px)",
    lineHeight: 1.12,
    margin: 0
  },
  sectionCopy: {
    color: "#607276",
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
    border: "1px solid #dce8e8",
    borderRadius: 8,
    minHeight: 164,
    padding: 18
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
  cardNote: {
    color: "#0b1f3a",
    fontSize: 14,
    lineHeight: 1.55,
    margin: "12px 0 0"
  },
  benefitGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))"
  },
  benefit: {
    background: "#ffffff",
    border: "1px solid #dce8e8",
    borderRadius: 8,
    color: "#071f4d",
    fontWeight: 900,
    minHeight: 56,
    padding: 16
  },
  twoColumn: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))"
  },
  journeyCard: {
    background: "#ffffff",
    border: "1px solid #dce8e8",
    borderRadius: 8,
    padding: 20
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
  aiSection: {
    background: "#eef4ff",
    borderBottom: "1px solid #dce8e8",
    borderTop: "1px solid #dce8e8",
    display: "grid",
    gap: 18,
    padding: "48px clamp(16px, 4vw, 40px)"
  },
  aiFlow: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
  },
  flowStep: {
    background: "#ffffff",
    border: "1px solid #bfd0f5",
    borderRadius: 8,
    padding: 18
  },
  controlCard: {
    background: "#ffffff",
    border: "1px solid #dce8e8",
    borderRadius: 8,
    minHeight: 132,
    padding: 18
  },
  proofSection: {
    background: "#ffffff",
    borderBottom: "1px solid #dce8e8",
    borderTop: "1px solid #dce8e8",
    display: "grid",
    gap: 12,
    padding: "40px clamp(16px, 4vw, 40px)"
  },
  faqGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
  },
  faqItem: {
    background: "#ffffff",
    border: "1px solid #dce8e8",
    borderRadius: 8,
    padding: 18
  },
  faqQuestion: {
    color: "#071f4d",
    fontSize: 17,
    margin: 0
  },
  faqLink: {
    alignItems: "center",
    background: "#071f4d",
    borderRadius: 8,
    color: "#ffffff",
    display: "inline-flex",
    fontWeight: 900,
    marginTop: 18,
    minHeight: 48,
    padding: "0 18px",
    textDecoration: "none"
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
