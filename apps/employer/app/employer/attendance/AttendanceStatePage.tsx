import { EmployerShell, WorkflowRoutes } from "../EmployerShell";
import {
  attendanceBoundaries,
  attendanceDataTruth,
  attendanceEvidenceRows,
  attendanceFixture,
  getAttendanceStateSummary,
  type AttendanceState
} from "../attendanceWorkflowContent";
import { styles } from "../employerStyles";

const nextRoutes: Record<string, string> = {
  "/employer/attendance/arrival": "/employer/attendance/clock-in",
  "/employer/attendance/clock-in": "/employer/attendance/in-progress",
  "/employer/attendance/in-progress": "/employer/attendance/clock-out",
  "/employer/attendance/clock-out": "/employer/attendance/exceptions",
  "/employer/attendance/exceptions": "/employer/timesheets"
};

export function AttendanceStatePage({
  currentRoute,
  eyebrow,
  state,
  title
}: {
  currentRoute: string;
  eyebrow: string;
  state: AttendanceState;
  title: string;
}) {
  const summary = getAttendanceStateSummary(state);
  const nextRoute = nextRoutes[currentRoute] ?? "/employer/attendance";

  return (
    <EmployerShell
      currentRoute={currentRoute}
      eyebrow={eyebrow}
      title={title}
      lede="This employer view displays fixture attendance evidence only. It does not create live clock events, continuous GPS tracking, misconduct findings, timesheet approval, or payroll."
      actions={<a href={nextRoute} style={styles.primaryButton}>Continue</a>}
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Attendance state</p>
          <h2 style={styles.sectionTitle}>{state}</h2>
          <p style={styles.sectionCopy}>
            Assignment: {attendanceFixture.assignment}. Review required: {summary.requiresReview ? "Yes" : "No"}.
            Timesheet draft possible: {summary.canCreateTimesheetDraft ? "Yes" : "No"}. Payroll ready: No.
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
            <h3 style={styles.cardTitle}>Exception and freshness</h3>
            <p style={styles.cardText}>Freshness: {attendanceFixture.freshness}</p>
            <p style={styles.cardText}>Exception status: {attendanceFixture.exceptionStatus}</p>
            <p style={styles.cardText}>Manager review: {attendanceFixture.managerReviewStatus}</p>
          </article>
          <article style={styles.tintedCard}>
            <h3 style={styles.cardTitle}>Truthful data labels</h3>
            <ol style={styles.stepList}>
              {attendanceDataTruth.map((item) => <li key={item} style={styles.stepItem}>{item}</li>)}
            </ol>
          </article>
        </div>
      </section>
      <section style={styles.section}>
        <div style={styles.cardGrid}>
          {attendanceBoundaries.map((boundary) => (
            <article key={boundary} style={styles.card}>
              <p style={styles.cardText}>{boundary}</p>
            </article>
          ))}
        </div>
      </section>
      <WorkflowRoutes currentRoute={currentRoute} />
    </EmployerShell>
  );
}
