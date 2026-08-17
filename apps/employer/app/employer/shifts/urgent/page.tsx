import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import { conflictWarnings, urgentBoundaries, urgentLevels } from "../shiftManagementContent";
import { styles } from "../../employerStyles";

export default function UrgentShiftPage() {
  return (
    <EmployerShell
      currentRoute="/employer/shifts/urgent"
      eyebrow="Urgent Shift"
      title="Prioritize urgent staffing without bypassing qualification, pricing, or human review."
      lede="Urgency means governed priority. It does not create an emergency-service obligation, guarantee coverage, or override eligibility."
      actions={<a href="/employer/shifts/published" style={styles.primaryButton}>Published shifts</a>}
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}><p style={styles.eyebrowDark}>Urgency classification</p><h2 style={styles.sectionTitle}>Urgency levels remain configurable and truthful.</h2></div>
        <div style={styles.pillGrid}>{urgentLevels.map((level) => <span key={level} style={styles.pill}>{level}</span>)}</div>
      </section>

      <section style={styles.whiteSection}>
        <div style={styles.sectionHeader}><p style={styles.eyebrowDark}>Urgent request facts</p><h2 style={styles.sectionTitle}>Minimum facts for review before publication.</h2></div>
        <div style={styles.formGrid}>
          <label style={styles.fieldLabel}>Urgent role needed<input placeholder="Role and department" style={styles.input} /></label>
          <label style={styles.fieldLabel}>Requested start time<input placeholder="Start time and timezone" style={styles.input} /></label>
          <label style={styles.fieldLabel}>Urgency reason<input placeholder="Operational need, not emergency claim" style={styles.input} /></label>
          <label style={styles.fieldLabel}>Urgent premium summary<input placeholder="Governed input only" style={styles.input} /></label>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.twoColumn}>
          <article style={styles.tintedCard}><h3 style={styles.cardTitle}>Urgency boundaries</h3><ol style={styles.stepList}>{urgentBoundaries.map((boundary) => <li key={boundary} style={styles.stepItem}>{boundary}</li>)}</ol></article>
          <article style={styles.tintedCard}><h3 style={styles.cardTitle}>Conflict review</h3><ol style={styles.stepList}>{conflictWarnings.slice(0, 5).map((warning) => <li key={warning} style={styles.stepItem}>{warning}</li>)}</ol></article>
        </div>
      </section>

      <WorkflowRoutes currentRoute="/employer/shifts/urgent" />
    </EmployerShell>
  );
}

