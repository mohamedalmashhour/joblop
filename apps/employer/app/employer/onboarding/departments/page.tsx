import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import { departmentBoundaries, departmentTypes } from "../../employerJourneyContent";
import { styles } from "../../employerStyles";

export default function DepartmentsPage() {
  return (
    <EmployerShell
      currentRoute="/employer/onboarding/departments"
      eyebrow="Page 040 - Departments"
      title="Define departments as operating work areas, not shifts or worker groups."
      lede="Departments sit inside residences and prepare the organization for shift creation. They do not own staffing, assignment, attendance, payroll, or compliance decisions."
      actions={
        <a href="/employer/dashboard" style={styles.primaryButton}>
          Open dashboard
        </a>
      }
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Department setup</p>
          <h2 style={styles.sectionTitle}>Select configurable department types before creating shifts.</h2>
        </div>
        <div style={styles.pillGrid}>
          {departmentTypes.map((type) => (
            <span key={type} style={styles.pill}>
              {type}
            </span>
          ))}
        </div>
      </section>

      <section style={styles.whiteSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Department record placeholder</p>
          <h2 style={styles.sectionTitle}>Department details stay operational and minimum necessary.</h2>
        </div>
        <div style={styles.formGrid}>
          <label style={styles.fieldLabel}>
            Department name
            <input placeholder="Kitchen / evening dining support" style={styles.input} />
          </label>
          <label style={styles.fieldLabel}>
            Parent residence
            <input placeholder="Select approved residence" style={styles.input} />
          </label>
          <label style={styles.fieldLabel}>
            Department manager role
            <input placeholder="Role, not private contact details" style={styles.input} />
          </label>
          <label style={styles.fieldLabel}>
            Worker-facing label
            <input placeholder="Approved assignment-visible label" style={styles.input} />
          </label>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.cardGrid}>
          {departmentBoundaries.map((boundary) => (
            <article key={boundary} style={styles.tintedCard}>
              <p style={styles.cardText}>{boundary}</p>
            </article>
          ))}
        </div>
      </section>

      <WorkflowRoutes currentRoute="/employer/onboarding/departments" />
    </EmployerShell>
  );
}

