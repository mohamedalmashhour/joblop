import { EmployerShell, WorkflowRoutes } from "../EmployerShell";
import { styles } from "../employerStyles";
import {
  employerReportMetrics,
  reportBoundaries,
  reportDataTruth
} from "../reportWorkflowContent";

export default function EmployerReportsPage() {
  return (
    <EmployerShell
      currentRoute="/employer/reports"
      eyebrow="Page 052 - Reports"
      title="Review source-labelled employer workflow summaries."
      lede="Reports summarize the completed employer journey. They do not own shifts, applicants, assignments, attendance, timesheets, invoices, payments, or live analytics automation."
      actions={<a href="/employer/dashboard" style={styles.secondaryButton}>Back to dashboard</a>}
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Fixture-backed report metrics</p>
          <h2 style={styles.sectionTitle}>Every metric identifies its source.</h2>
          <p style={styles.sectionCopy}>
            Metrics are fixture-backed and labelled with freshness. No trends are fabricated.
          </p>
        </div>
        <div style={styles.cardGrid}>
          {employerReportMetrics.map((metric) => (
            <article key={metric.label} style={styles.card}>
              <h3 style={styles.cardTitle}>{metric.label}</h3>
              <p style={styles.cardText}>Value: {metric.value}</p>
              <p style={styles.cardText}>Source: {metric.source}</p>
              <p style={styles.cardText}>Freshness: {metric.freshness}</p>
              <a href={metric.route} style={{ ...styles.secondaryButton, marginTop: 12 }}>Open source</a>
            </article>
          ))}
        </div>
      </section>
      <section style={styles.whiteSection}>
        <div style={styles.twoColumn}>
          <article style={styles.tintedCard}>
            <h3 style={styles.cardTitle}>Report boundaries</h3>
            <ol style={styles.stepList}>{reportBoundaries.map((item) => <li key={item} style={styles.stepItem}>{item}</li>)}</ol>
          </article>
          <article style={styles.tintedCard}>
            <h3 style={styles.cardTitle}>Data truthfulness</h3>
            <ol style={styles.stepList}>{reportDataTruth.map((item) => <li key={item} style={styles.stepItem}>{item}</li>)}</ol>
          </article>
        </div>
      </section>
      <WorkflowRoutes currentRoute="/employer/reports" />
    </EmployerShell>
  );
}
