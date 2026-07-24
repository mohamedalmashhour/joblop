import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { ShiftDraftSummary } from "../ShiftDraftSummary";
import { shiftCreationHandoffs, shiftOperationalStates } from "../shiftCreationModel";
import { shiftBoundaries } from "../shiftManagementContent";

export default function ShiftReviewPage() {
  return (
    <EmployerShell
      currentRoute="/employer/shifts/review"
      eyebrow="Page 041 - Shift Review"
      title="Review the shift draft before any publication request."
      lede="This step verifies planned shift terms only. It does not publish, assign, notify workers, confirm attendance, or calculate finance."
      actions={<a href="/employer/shifts/create" style={styles.secondaryButton}>Edit draft</a>}
    >
      <ShiftDraftSummary mode="review" />

      <section style={styles.whiteSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Review boundary</p>
          <h2 style={styles.sectionTitle}>Review is not publication or assignment.</h2>
        </div>
        <div style={styles.cardGrid}>
          {shiftBoundaries.map((boundary) => (
            <article key={boundary} style={styles.card}>
              <p style={styles.cardText}>{boundary}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Governed handoffs</p>
          <h2 style={styles.sectionTitle}>Every next action remains explicit.</h2>
        </div>
        <div style={styles.cardGrid}>
          {shiftCreationHandoffs.map((handoff) => (
            <article key={handoff.title} style={styles.tintedCard}>
              <h3 style={styles.cardTitle}>{handoff.title}</h3>
              <p style={styles.cardText}>{handoff.boundary}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.whiteSection}>
        <div style={styles.pillGrid}>
          {shiftOperationalStates.map((state) => (
            <span key={state} style={styles.pill}>{state}</span>
          ))}
        </div>
      </section>

      <WorkflowRoutes currentRoute="/employer/shifts/review" />
    </EmployerShell>
  );
}
