import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import { CreateShiftDraftForm } from "./CreateShiftDraftForm";
import {
  conflictWarnings,
  qualificationTypes,
  scheduleWarnings,
  shiftBoundaries,
  shiftLifecycle,
  shiftStatusAreas
} from "../shiftManagementContent";
import { styles } from "../../employerStyles";

export default function CreateShiftPage() {
  return (
    <EmployerShell
      currentRoute="/employer/shifts/create"
      eyebrow="Create Shift"
      title="Create a governed single shift without assigning workers or calculating payroll."
      lede="This page owns scheduled terms and staffing requirements only. Publication, assignment, attendance, payroll, invoice, and payment remain separate workflows."
      actions={<a href="/employer/shifts/recurring" style={styles.primaryButton}>Recurring shift</a>}
    >
      <CreateShiftDraftForm />

      <section style={styles.whiteSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Shift lifecycle</p>
          <h2 style={styles.sectionTitle}>Shift status is not one generic active label.</h2>
        </div>
        <ol style={styles.stepList}>
          {shiftLifecycle.map((state) => <li key={state} style={styles.stepItem}>{state}</li>)}
        </ol>
      </section>

      <section style={styles.section}>
        <div style={styles.twoColumn}>
          <article style={styles.tintedCard}>
            <h3 style={styles.cardTitle}>Status panel</h3>
            <div style={styles.pillGrid}>{shiftStatusAreas.map((status) => <span key={status} style={styles.pill}>{status}</span>)}</div>
          </article>
          <article style={styles.tintedCard}>
            <h3 style={styles.cardTitle}>Scheduling truthfulness</h3>
            <ol style={styles.stepList}>{scheduleWarnings.map((warning) => <li key={warning} style={styles.stepItem}>{warning}</li>)}</ol>
          </article>
        </div>
      </section>

      <section style={styles.whiteSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Requirements and warnings</p>
          <h2 style={styles.sectionTitle}>Requirements configured here do not prove worker eligibility.</h2>
        </div>
        <div style={styles.cardGrid}>
          {qualificationTypes.map((type) => <article key={type} style={styles.card}><h3 style={styles.cardTitle}>{type}</h3><p style={styles.cardText}>Configured requirement, not final eligibility.</p></article>)}
          {conflictWarnings.map((warning) => <article key={warning} style={styles.card}><h3 style={styles.cardTitle}>{warning}</h3><p style={styles.cardText}>Warning supports review; it is not automatic rejection.</p></article>)}
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.cardGrid}>{shiftBoundaries.map((boundary) => <article key={boundary} style={styles.tintedCard}><p style={styles.cardText}>{boundary}</p></article>)}</div>
      </section>

      <WorkflowRoutes currentRoute="/employer/shifts/create" />
    </EmployerShell>
  );
}
