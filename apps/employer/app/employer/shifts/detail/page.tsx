import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { ShiftDraftSummary } from "../ShiftDraftSummary";
import { shiftOperationalStates } from "../shiftCreationModel";

export default function ShiftDetailPage() {
  return (
    <EmployerShell
      currentRoute="/employer/shifts/detail"
      eyebrow="Page 041 - Shift Detail"
      title="Inspect the published shift without absorbing applicant, assignment, or attendance work."
      lede="This detail screen is a governed handoff surface. It summarizes the shift and points to applicants as the next workflow boundary."
      actions={<a href="/employer/shifts/published" style={styles.secondaryButton}>Published shifts</a>}
    >
      <ShiftDraftSummary mode="detail" />

      <section style={styles.whiteSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>State model</p>
          <h2 style={styles.sectionTitle}>Shift detail stays separate from assignment and attendance.</h2>
        </div>
        <div style={styles.pillGrid}>
          {shiftOperationalStates.map((state) => (
            <span key={state} style={styles.pill}>{state}</span>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.cardGrid}>
          {[
            "Shift Detail != Applicant Review",
            "Published Shift != Worker Assigned",
            "Assignment Created != Worker Acceptance",
            "Worker Acceptance != Attendance",
            "Attendance != Timesheet Approval"
          ].map((boundary) => (
            <article key={boundary} style={styles.tintedCard}>
              <p style={styles.cardText}>{boundary}</p>
            </article>
          ))}
        </div>
      </section>

      <WorkflowRoutes currentRoute="/employer/shifts/detail" />
    </EmployerShell>
  );
}
