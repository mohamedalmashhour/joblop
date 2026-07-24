import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import { recurrenceBoundaries, recurringLifecycles } from "../shiftManagementContent";
import { styles } from "../../employerStyles";

export default function RecurringShiftPage() {
  return (
    <EmployerShell
      currentRoute="/employer/shifts/recurring"
      eyebrow="Page 042 - Recurring Shift"
      title="Define recurring shift templates without pretending every occurrence is staffed."
      lede="A recurring template is not a generated occurrence, published shift, assignment, worked shift, payroll approval, or invoice."
      actions={<a href="/employer/shifts/urgent" style={styles.primaryButton}>Urgent shift</a>}
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Template setup</p>
          <h2 style={styles.sectionTitle}>Configure recurrence as a governed template.</h2>
        </div>
        <div style={styles.formGrid}>
          <label style={styles.fieldLabel}>Template name<input placeholder="Weekday dining support" style={styles.input} /></label>
          <label style={styles.fieldLabel}>Recurrence rule<select defaultValue="" style={styles.input}><option value="" disabled>Select rule</option><option>Daily</option><option>Weekly</option><option>Bi-weekly</option><option>Monthly</option><option>Custom interval</option></select></label>
          <label style={styles.fieldLabel}>Preview window<input placeholder="Future occurrences preview" style={styles.input} /></label>
          <label style={styles.fieldLabel}>Authorization status<input placeholder="View only / edit allowed / approval required" style={styles.input} /></label>
        </div>
      </section>

      <section style={styles.whiteSection}>
        <div style={styles.sectionHeader}><p style={styles.eyebrowDark}>Independent lifecycles</p><h2 style={styles.sectionTitle}>Template, occurrence, and exception states stay separate.</h2></div>
        <div style={styles.cardGrid}>{recurringLifecycles.map((lifecycle) => <article key={lifecycle.title} style={styles.card}><h3 style={styles.cardTitle}>{lifecycle.title}</h3><ol style={styles.stepList}>{lifecycle.states.map((state) => <li key={state} style={styles.stepItem}>{state}</li>)}</ol></article>)}</div>
      </section>

      <section style={styles.section}>
        <div style={styles.cardGrid}>{recurrenceBoundaries.map((boundary) => <article key={boundary} style={styles.tintedCard}><p style={styles.cardText}>{boundary}</p></article>)}</div>
      </section>

      <WorkflowRoutes currentRoute="/employer/shifts/recurring" />
    </EmployerShell>
  );
}

