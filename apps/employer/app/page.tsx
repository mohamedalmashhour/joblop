import type { CSSProperties } from "react";
import {
  employerJourney,
  faqPreview,
  staffingCategories,
  trustControls,
  workerBenefits,
  workerJourney
} from "./landingContent";

const platformPillars = [
  {
    label: "For Employers",
    points: ["Request qualified staff", "Review applicants", "Track attendance", "Approve timesheets"]
  },
  {
    label: "For Workers",
    points: ["Find fitting shifts", "Manage availability", "See payout status", "Keep work history"]
  },
  {
    label: "For Administrators",
    points: ["Control dispatch", "Review compliance", "Monitor exceptions", "Maintain audit trails"]
  }
] as const;

const dashboardMetrics = [
  ["Open shifts", "12"],
  ["Scheduled today", "24"],
  ["Workers active", "48"],
  ["Hours this week", "320"]
] as const;

const operationsRows = [
  ["CNA evening shift", "Filled"],
  ["Housekeeping", "Partial"],
  ["Dining assistant", "Open"]
] as const;

export default function LandingPage() {
  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <a href="/" style={styles.brand} aria-label="Resident Workforce OS home">
          <span aria-hidden="true" style={styles.brandMark}>
            RW
          </span>
          <span>Resident Workforce OS</span>
        </a>
        <nav aria-label="Primary navigation" style={styles.nav}>
          <a href="/how-it-works" style={styles.navLink}>
            How It Works
          </a>
          <a href="#employers" style={styles.navLink}>
            Employers
          </a>
          <a href="#workers" style={styles.navLink}>
            Workers
          </a>
          <a href="/pricing" style={styles.navLink}>
            Pricing
          </a>
          <a href="/about" style={styles.navLink}>
            About
          </a>
        </nav>
        <div style={styles.headerActions}>
          <a href="/employer/dashboard" style={styles.ghostButton}>
            Sign In
          </a>
          <a href="/signup/employer" style={styles.primaryButton}>
            Get Started
          </a>
        </div>
      </header>

      <section style={styles.hero}>
        <div style={styles.heroCopy}>
          <p style={styles.eyebrow}>Senior living workforce operations</p>
          <h1 style={styles.title}>The Workforce Operating System for Senior Living Communities</h1>
          <p style={styles.lede}>
            Hire qualified professionals, dispatch shifts, manage attendance, support compliance,
            and simplify payroll-ready operations from one AI-assisted platform.
          </p>
          <div style={styles.heroActions}>
            <a href="/signup/employer" style={styles.primaryButtonLarge}>
              Request Staff
            </a>
            <a href="#workers" style={styles.secondaryButtonLarge}>
              Become a Worker
            </a>
            <a href="/contact" style={styles.ghostButtonLarge}>
              Book a Demo
            </a>
          </div>
          <div aria-label="Platform controls" style={styles.trustStrip}>
            {["Verified Workers", "Smart Scheduling", "Compliance Ready", "Real-time Support"].map(
              (label) => (
                <span key={label} style={styles.trustPill}>
                  <span aria-hidden="true" style={styles.smallIcon} />
                  {label}
                </span>
              )
            )}
          </div>
        </div>

        <div aria-label="Care workforce scene" style={styles.heroVisual}>
          <div style={styles.photoFrame}>
            <div style={styles.carePortrait}>
              <div style={styles.caregiver} />
              <div style={styles.resident} />
            </div>
          </div>
          <div style={styles.floatingMetric}>
            <strong>86</strong>
            <span>open shifts monitored</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="categories-title" style={styles.section}>
        <div style={styles.centerHeader}>
          <p style={styles.eyebrowDark}>Work group capsules</p>
          <h2 id="categories-title" style={styles.sectionTitle}>
            Start with the right group, then narrow the request.
          </h2>
          <p style={styles.sectionCopy}>
            Capsules keep job requests easy to scan while leaving space for new roles that clients
            and workers add over time.
          </p>
        </div>
        <div style={styles.capsuleGrid}>
          {staffingCategories.map((category, index) => (
            <article key={category.name} style={styles.capsuleCard}>
              <span aria-hidden="true" style={categoryIconStyles[index % categoryIconStyles.length]} />
              <h3 style={styles.cardTitle}>{category.name}</h3>
              <p style={styles.cardText}>{category.roles}</p>
              <p style={styles.cardNote}>{category.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" aria-labelledby="workflow-title" style={styles.workflowBand}>
        <div style={styles.centerHeader}>
          <p style={styles.eyebrowDark}>Managed staffing flow</p>
          <h2 id="workflow-title" style={styles.sectionTitle}>
            Built around operations, not just job posting.
          </h2>
        </div>
        <div style={styles.timeline}>
          {[
            "Job Request",
            "Admin Dispatch",
            "Worker Offer",
            "Assignment",
            "Punch In",
            "Employer Review",
            "Invoice",
            "Worker Pay"
          ].map((step) => (
            <span key={step} style={styles.timelineStep}>
              {step}
            </span>
          ))}
        </div>
      </section>

      <section id="employers" aria-labelledby="experiences-title" style={styles.section}>
        <div style={styles.centerHeader}>
          <p style={styles.eyebrowDark}>One platform, three experiences</p>
          <h2 id="experiences-title" style={styles.sectionTitle}>
            Focused tools for every workforce role.
          </h2>
        </div>
        <div style={styles.experienceGrid}>
          {platformPillars.map((pillar, index) => (
            <article key={pillar.label} style={styles.experienceCard}>
              <div aria-hidden="true" style={portraitStyles[index]} />
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

      <section aria-labelledby="preview-title" style={styles.previewBand}>
        <div style={styles.previewIntro}>
          <p style={styles.eyebrowDark}>Platform design preview</p>
          <h2 id="preview-title" style={styles.sectionTitle}>
            Quiet dashboards for repeated daily work.
          </h2>
          <p style={styles.sectionCopy}>
            Screens are arranged for scanning, exception handling, and governed handoffs.
          </p>
        </div>
        <div style={styles.previewGrid}>
          <DashboardPreview />
          <WorkerPhonePreview />
        </div>
      </section>

      <section id="workers" aria-labelledby="workers-title" style={styles.section}>
        <div style={styles.centerHeader}>
          <p style={styles.eyebrowDark}>For workers</p>
          <h2 id="workers-title" style={styles.sectionTitle}>
            Mobile-first staffing without hidden employer economics.
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

      <section aria-labelledby="ai-title" style={styles.aiSection}>
        <div>
          <p style={styles.eyebrowDark}>AI brain boundary</p>
          <h2 id="ai-title" style={styles.sectionTitle}>
            AI assists decisions. People remain in control.
          </h2>
        </div>
        <div style={styles.aiFlow}>
          {([
            ["Recommends", "Qualified matches, gaps, and risks"],
            ["Explains", "Evidence, uncertainty, and missing data"],
            ["Waits", "Human review controls final action"]
          ] as const).map(([title, text]) => (
            <FlowStep key={title} title={title} text={text} />
          ))}
        </div>
      </section>

      <section aria-labelledby="trust-title" style={styles.section}>
        <div style={styles.centerHeader}>
          <p style={styles.eyebrowDark}>Trust controls</p>
          <h2 id="trust-title" style={styles.sectionTitle}>
            Governance stays visible across the journey.
          </h2>
        </div>
        <div style={styles.controlGrid}>
          {trustControls.map((control) => (
            <article key={control} style={styles.controlCard}>
              <span aria-hidden="true" style={styles.controlIcon} />
              <h3 style={styles.smallTitle}>{control}</h3>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="journeys-title" style={styles.section}>
        <div style={styles.twoColumn}>
          <JourneyCard title="Worker Journey" steps={workerJourney} />
          <JourneyCard title="Employer Journey" steps={employerJourney} />
        </div>
      </section>

      <section id="faq" aria-labelledby="faq-title" style={styles.section}>
        <div style={styles.centerHeader}>
          <p style={styles.eyebrowDark}>FAQ preview</p>
          <h2 id="faq-title" style={styles.sectionTitle}>
            Clear answers before users choose a path.
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
      </section>

      <section style={styles.ctaBand}>
        <div>
          <h2 style={styles.ctaTitle}>Ready to transform your workforce?</h2>
          <p style={styles.ctaCopy}>Start with a governed staffing request or schedule a demo.</p>
        </div>
        <div style={styles.ctaActions}>
          <a href="/signup/employer" style={styles.lightButton}>
            Get Started
          </a>
          <a href="/contact" style={styles.outlineLightButton}>
            Book a Demo
          </a>
        </div>
      </section>

      <footer style={styles.footer}>
        <a href="/" style={styles.footerBrand}>
          Resident Workforce OS
        </a>
        <nav aria-label="Footer navigation" style={styles.footerLinks}>
          <a href="#employers" style={styles.footerLink}>
            Employers
          </a>
          <a href="#workers" style={styles.footerLink}>
            Workers
          </a>
          <a href="/how-it-works" style={styles.footerLink}>
            How It Works
          </a>
          <a href="/pricing" style={styles.footerLink}>
            Pricing
          </a>
          <a href="/contact" style={styles.footerLink}>
            Contact
          </a>
        </nav>
      </footer>
    </main>
  );
}

function DashboardPreview() {
  return (
    <article style={styles.dashboardPreview} aria-label="Employer dashboard preview">
      <div style={styles.sidebar}>
        <strong>RWOS</strong>
        {["Dashboard", "Workers", "Jobs", "Compliance", "Reports"].map((item, index) => (
          <span key={item} style={index === 0 ? styles.sidebarActive : styles.sidebarItem}>
            {item}
          </span>
        ))}
      </div>
      <div style={styles.dashboardCanvas}>
        <div style={styles.dashboardTop}>
          <div>
            <h3 style={styles.dashboardTitle}>Welcome, Sarah Johnson</h3>
            <p style={styles.dashboardSub}>Sunrise of Oak Hill</p>
          </div>
          <a href="/employer/shifts/create" style={styles.miniButton}>
            Post a Shift
          </a>
        </div>
        <div style={styles.metricGrid}>
          {dashboardMetrics.map(([label, value]) => (
            <div key={label} style={styles.metricTile}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div style={styles.dashboardColumns}>
          <div style={styles.previewPanel}>
            <h4 style={styles.panelHeading}>Upcoming shifts</h4>
            {operationsRows.map(([role, status]) => (
              <div key={role} style={styles.shiftRow}>
                <span>{role}</span>
                <strong style={status === "Filled" ? styles.statusGreen : styles.statusAmber}>
                  {status}
                </strong>
              </div>
            ))}
          </div>
          <div style={styles.previewPanel}>
            <h4 style={styles.panelHeading}>Recent activity</h4>
            {["Worker accepted shift", "Shift filled", "New application"].map((item) => (
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

function WorkerPhonePreview() {
  return (
    <article style={styles.phoneCluster} aria-label="Worker mobile app preview">
      {[
        ["Upcoming", "CNA evening shift", "$96.00"],
        ["Schedule", "May 2026", "3 shifts"],
        ["Earnings", "$560.00", "pending"]
      ].map(([heading, detail, meta]) => (
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
    background: "#f7faff",
    color: "#081f49",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    minHeight: "100vh"
  },
  header: {
    alignItems: "center",
    background: "rgba(255, 255, 255, 0.96)",
    borderBottom: "1px solid #e3eaf4",
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
    color: "#081f49",
    display: "inline-flex",
    fontSize: 17,
    fontWeight: 900,
    gap: 10,
    textDecoration: "none"
  },
  brandMark: {
    alignItems: "center",
    background: "#0b4aa2",
    borderRadius: 8,
    color: "#ffffff",
    display: "inline-flex",
    fontSize: 11,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  nav: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: 24
  },
  navLink: {
    color: "#243b60",
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
    background: "#082a66",
    boxShadow: "0 8px 18px rgba(8, 42, 102, 0.18)",
    color: "#ffffff"
  },
  ghostButton: {
    ...baseButton,
    background: "#ffffff",
    border: "1px solid #c7d4e8",
    color: "#082a66"
  },
  hero: {
    alignItems: "center",
    background:
      "linear-gradient(180deg, #ffffff 0%, #f5f9ff 74%, #eef5ff 100%)",
    display: "grid",
    gap: 36,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
    padding: "clamp(42px, 7vw, 86px) clamp(20px, 5vw, 72px) 28px"
  },
  heroCopy: {
    maxWidth: 760
  },
  eyebrow: {
    color: "#0b58b7",
    fontSize: 13,
    fontWeight: 900,
    letterSpacing: 0,
    margin: 0,
    textTransform: "uppercase"
  },
  eyebrowDark: {
    color: "#0b58b7",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0,
    margin: 0,
    textTransform: "uppercase"
  },
  title: {
    color: "#081f49",
    fontSize: "clamp(42px, 6vw, 74px)",
    letterSpacing: 0,
    lineHeight: 1.02,
    margin: "14px 0 18px",
    maxWidth: 860
  },
  lede: {
    color: "#455a7c",
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
    background: "#0b4aa2",
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
    background: "#ffffff",
    border: "1px solid #c7d4e8",
    color: "#082a66",
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
    color: "#243b60",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 800,
    gap: 10,
    minHeight: 40
  },
  smallIcon: {
    background: "#e8f1ff",
    border: "1px solid #c9ddff",
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
    background: "#dcecff",
    borderRadius: "42% 42% 0 0",
    boxShadow: "0 26px 70px rgba(8, 31, 73, 0.14)",
    height: 390,
    maxWidth: 460,
    overflow: "hidden",
    position: "relative",
    width: "100%"
  },
  carePortrait: {
    background:
      "radial-gradient(circle at 52% 34%, #ffffff 0 16%, transparent 17%), linear-gradient(135deg, #cfe3ff, #ffffff)",
    height: "100%",
    position: "relative"
  },
  caregiver: {
    background: "#073469",
    borderRadius: "48% 48% 10% 10%",
    bottom: 0,
    height: "64%",
    left: "23%",
    position: "absolute",
    width: "30%"
  },
  resident: {
    background: "#f0ece5",
    border: "8px solid #ffffff",
    borderRadius: "50% 50% 10% 10%",
    bottom: 0,
    height: "52%",
    position: "absolute",
    right: "21%",
    width: "28%"
  },
  floatingMetric: {
    background: "#ffffff",
    border: "1px solid #d8e4f5",
    borderRadius: 8,
    bottom: 24,
    boxShadow: "0 18px 45px rgba(8, 31, 73, 0.13)",
    color: "#243b60",
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
    color: "#081f49",
    fontSize: "clamp(28px, 4vw, 44px)",
    letterSpacing: 0,
    lineHeight: 1.12,
    margin: 0
  },
  sectionCopy: {
    color: "#526782",
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
    background: "#ffffff",
    border: "1px solid #e1eaf6",
    borderRadius: 8,
    boxShadow: "0 18px 50px rgba(8, 31, 73, 0.07)",
    minHeight: 210,
    padding: 22
  },
  cardTitle: {
    color: "#081f49",
    fontSize: 19,
    margin: "12px 0 0"
  },
  cardText: {
    color: "#526782",
    fontSize: 14,
    lineHeight: 1.55,
    margin: "9px 0 0"
  },
  cardNote: {
    color: "#243b60",
    fontSize: 14,
    lineHeight: 1.55,
    margin: "14px 0 0"
  },
  workflowBand: {
    background: "#ffffff",
    borderBottom: "1px solid #e1eaf6",
    borderTop: "1px solid #e1eaf6",
    padding: "52px clamp(20px, 5vw, 72px)"
  },
  timeline: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))"
  },
  timelineStep: {
    background: "#f3f7ff",
    border: "1px solid #d8e4f5",
    borderRadius: 8,
    color: "#082a66",
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
    background: "#ffffff",
    border: "1px solid #e1eaf6",
    borderRadius: 8,
    boxShadow: "0 18px 50px rgba(8, 31, 73, 0.07)",
    overflow: "hidden"
  },
  experienceBody: {
    padding: 22
  },
  cleanList: {
    color: "#243b60",
    display: "grid",
    fontSize: 14,
    gap: 9,
    lineHeight: 1.45,
    margin: "16px 0 0",
    paddingLeft: 18
  },
  previewBand: {
    background: "#eef5ff",
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
    background: "#ffffff",
    border: "1px solid #d8e4f5",
    borderRadius: 8,
    boxShadow: "0 24px 70px rgba(8, 31, 73, 0.12)",
    display: "grid",
    gridTemplateColumns: "minmax(96px, 120px) minmax(0, 1fr)",
    minHeight: 390,
    overflow: "hidden"
  },
  sidebar: {
    background: "#06234f",
    color: "#ffffff",
    display: "grid",
    gap: 10,
    padding: 18
  },
  sidebarItem: {
    color: "#b7c8e4",
    fontSize: 12,
    fontWeight: 800
  },
  sidebarActive: {
    background: "#0b58b7",
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
    color: "#081f49",
    fontSize: 20,
    margin: 0
  },
  dashboardSub: {
    color: "#526782",
    fontSize: 13,
    margin: "4px 0 0"
  },
  miniButton: {
    ...baseButton,
    background: "#0b4aa2",
    color: "#ffffff",
    minHeight: 40
  },
  metricGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(92px, 1fr))"
  },
  metricTile: {
    background: "#f7faff",
    border: "1px solid #e1eaf6",
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
    background: "#ffffff",
    border: "1px solid #e1eaf6",
    borderRadius: 8,
    padding: 14
  },
  panelHeading: {
    color: "#081f49",
    fontSize: 14,
    margin: "0 0 10px"
  },
  shiftRow: {
    alignItems: "center",
    borderTop: "1px solid #edf2f8",
    color: "#243b60",
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
    borderTop: "1px solid #edf2f8",
    color: "#243b60",
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
    background: "#ffffff",
    border: "7px solid #121a2a",
    borderRadius: 30,
    boxShadow: "0 18px 45px rgba(8, 31, 73, 0.16)",
    minHeight: 286,
    padding: "18px 14px"
  },
  phoneTop: {
    background: "#121a2a",
    borderRadius: 999,
    height: 5,
    margin: "0 auto 18px",
    width: 44
  },
  phoneTitle: {
    color: "#081f49",
    fontSize: 15,
    margin: 0
  },
  phoneDetail: {
    color: "#526782",
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
    background: "#ffffff",
    border: "1px solid #e1eaf6",
    borderRadius: 8,
    boxShadow: "0 14px 34px rgba(8, 31, 73, 0.05)",
    color: "#082a66",
    fontWeight: 900,
    padding: 18
  },
  aiSection: {
    background: "#ffffff",
    borderBottom: "1px solid #e1eaf6",
    borderTop: "1px solid #e1eaf6",
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
    background: "#f7faff",
    border: "1px solid #d8e4f5",
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
    background: "#ffffff",
    border: "1px solid #e1eaf6",
    borderRadius: 8,
    display: "grid",
    gap: 12,
    justifyItems: "center",
    minHeight: 132,
    padding: 18,
    textAlign: "center"
  },
  controlIcon: {
    background: "#e8f1ff",
    border: "1px solid #c9ddff",
    borderRadius: 8,
    height: 38,
    width: 38
  },
  smallTitle: {
    color: "#081f49",
    fontSize: 15,
    margin: 0
  },
  twoColumn: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))"
  },
  journeyCard: {
    background: "#ffffff",
    border: "1px solid #e1eaf6",
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
    color: "#243b60",
    fontWeight: 800,
    lineHeight: 1.45
  },
  faqGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
  },
  faqItem: {
    background: "#ffffff",
    border: "1px solid #e1eaf6",
    borderRadius: 8,
    boxShadow: "0 14px 34px rgba(8, 31, 73, 0.05)",
    padding: 18
  },
  faqQuestion: {
    color: "#081f49",
    fontSize: 17,
    margin: 0
  },
  ctaBand: {
    alignItems: "center",
    background: "#06234f",
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
    color: "#c9d8ec",
    margin: "8px 0 0"
  },
  ctaActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12
  },
  lightButton: {
    ...baseButton,
    background: "#ffffff",
    color: "#082a66",
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
    background: "#ffffff",
    borderTop: "1px solid #e1eaf6",
    color: "#243b60",
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between",
    padding: "30px clamp(20px, 5vw, 72px)"
  },
  footerBrand: {
    color: "#081f49",
    fontWeight: 900,
    textDecoration: "none"
  },
  footerLinks: {
    display: "flex",
    flexWrap: "wrap",
    gap: 18
  },
  footerLink: {
    color: "#243b60",
    fontSize: 14,
    fontWeight: 800,
    textDecoration: "none"
  }
};

const categoryIconStyles: CSSProperties[] = [
  { background: "#e8f1ff", borderRadius: 8, display: "block", height: 44, width: 44 },
  { background: "#e7f8ef", borderRadius: 8, display: "block", height: 44, width: 44 },
  { background: "#fff5df", borderRadius: 8, display: "block", height: 44, width: 44 },
  { background: "#f0ebff", borderRadius: 8, display: "block", height: 44, width: 44 }
];

const portraitStyles: CSSProperties[] = [
  {
    background:
      "linear-gradient(135deg, #e8f1ff, #ffffff 52%, #cdddf3), radial-gradient(circle at 28% 35%, #082a66 0 12%, transparent 13%)",
    height: 160
  },
  {
    background:
      "linear-gradient(135deg, #e7f8ef, #ffffff 52%, #cbeede), radial-gradient(circle at 48% 32%, #0f7f56 0 12%, transparent 13%)",
    height: 160
  },
  {
    background:
      "linear-gradient(135deg, #eef5ff, #ffffff 52%, #d8e4f5), radial-gradient(circle at 62% 34%, #243b60 0 12%, transparent 13%)",
    height: 160
  }
];
