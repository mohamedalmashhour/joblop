import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { ShiftDraftSummary } from "../ShiftDraftSummary";
import { shiftDataStates } from "../shiftCreationModel";

export default function ShiftPublishPage() {
  return (
    <EmployerShell
      currentRoute="/employer/shifts/publish"
      eyebrow="Page 041 - Publish Shift"
      title="Publish a validated fixture shift without changing staffing authority."
      lede="Publication opens the shift for staffing activity. It does not fill the shift, assign workers, start attendance, or create invoices."
      actions={<a href="/employer/shifts/review" style={styles.secondaryButton}>Back to review</a>}
    >
      <ShiftDraftSummary mode="publish" />

      <section style={styles.whiteSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Publication truthfulness</p>
          <h2 style={styles.sectionTitle}>Published does not mean filled.</h2>
        </div>
        <div style={styles.cardGrid}>
          {[
            "Publication requested != Publication completed",
            "Published != Filled",
            "Filled != Worker accepted",
            "Accepted != Attendance confirmed",
            "Completed != Payroll approved"
          ].map((boundary) => (
            <article key={boundary} style={styles.card}>
              <p style={styles.cardText}>{boundary}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Development state</p>
          <h2 style={styles.sectionTitle}>This route uses local fixture state only.</h2>
        </div>
        <div style={styles.cardGrid}>
          {shiftDataStates.map((state) => (
            <article key={state} style={styles.tintedCard}>
              <p style={styles.cardText}>{state}</p>
            </article>
          ))}
        </div>
      </section>

      <WorkflowRoutes currentRoute="/employer/shifts/publish" />
    </EmployerShell>
  );
}
