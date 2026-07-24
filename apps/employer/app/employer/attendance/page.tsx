import { EmployerShell, WorkflowRoutes } from "../EmployerShell";
import {
  attendanceBoundaries,
  attendanceDataTruth,
  attendanceEvidenceRows,
  attendanceFixture,
  attendanceStates
} from "../attendanceWorkflowContent";
import { styles } from "../employerStyles";

export default function AttendanceMonitoringPage() {
  return (
    <EmployerShell
      currentRoute="/employer/attendance"
      eyebrow="Page 047 - Attendance Monitoring"
      title="Monitor attendance states without continuous GPS or fabricated clock events."
      lede="Employer-side attendance monitoring preserves assignment context, shows evidence freshness, and hands off clearly to timesheet review."
      actions={<a href="/employer/attendance/arrival" style={styles.primaryButton}>Arrival state</a>}
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Assignment context</p>
          <h2 style={styles.sectionTitle}>{attendanceFixture.assignment}</h2>
          <p style={styles.sectionCopy}>
            {attendanceFixture.residence} / {attendanceFixture.department}. Current state: {attendanceFixture.attendanceState}.
          </p>
        </div>
        <div style={styles.cardGrid}>
          {attendanceEvidenceRows.map((row) => (
            <article key={row.label} style={styles.card}>
              <h3 style={styles.cardTitle}>{row.label}</h3>
              <p style={styles.cardText}>{row.value}</p>
              <p style={styles.cardText}>Source: {row.source}</p>
            </article>
          ))}
        </div>
      </section>
      <section style={styles.whiteSection}>
        <div style={styles.twoColumn}>
          <article style={styles.tintedCard}>
            <h3 style={styles.cardTitle}>Freshness and review</h3>
            <p style={styles.cardText}>Freshness: {attendanceFixture.freshness}</p>
            <p style={styles.cardText}>Exception: {attendanceFixture.exceptionStatus}</p>
            <p style={styles.cardText}>Manager review: {attendanceFixture.managerReviewStatus}</p>
          </article>
          <article style={styles.tintedCard}>
            <h3 style={styles.cardTitle}>Data truthfulness</h3>
            <ol style={styles.stepList}>{attendanceDataTruth.map((state) => <li key={state} style={styles.stepItem}>{state}</li>)}</ol>
          </article>
        </div>
      </section>
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Attendance states</p>
          <h2 style={styles.sectionTitle}>Every state remains separate.</h2>
        </div>
        <div style={styles.pillGrid}>{attendanceStates.map((state) => <span key={state} style={styles.pill}>{state}</span>)}</div>
      </section>
      <section style={styles.whiteSection}>
        <div style={styles.cardGrid}>{attendanceBoundaries.map((boundary) => <article key={boundary} style={styles.card}><p style={styles.cardText}>{boundary}</p></article>)}</div>
      </section>
      <WorkflowRoutes currentRoute="/employer/attendance" />
    </EmployerShell>
  );
}
