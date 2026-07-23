import { EmployerShell, WorkflowRoutes } from "../../employer/EmployerShell";
import { accountBoundaries, accountTypeOutcomes } from "../../employer/employerJourneyContent";
import { styles } from "../../employer/employerStyles";

export default function EmployerSignUpPage() {
  return (
    <EmployerShell
      currentRoute="/signup/employer"
      eyebrow="Page 012 - Employer sign up"
      title="Create an employer account without implying approval."
      lede="This screen starts employer account creation only. Email verification, organization setup, review, and activation remain separate."
      actions={
        <a href="/employer/onboarding/company" style={styles.primaryButton}>
          Continue to organization
        </a>
      }
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Account type</p>
          <h2 style={styles.sectionTitle}>Employer: I want to request staffing support.</h2>
          <p style={styles.sectionCopy}>
            The form below is a development surface for the approved employer account journey. It
            does not create a real account, authentication record, permission grant, API request, or
            database row.
          </p>
        </div>
        <div style={styles.formGrid}>
          <label style={styles.fieldLabel}>
            Work email
            <input placeholder="manager@example.org" style={styles.input} />
          </label>
          <label style={styles.fieldLabel}>
            Full name
            <input placeholder="Authorized contact" style={styles.input} />
          </label>
          <label style={styles.fieldLabel}>
            Role
            <select defaultValue="" style={styles.input}>
              <option value="" disabled>
                Select role
              </option>
              <option>Residence owner</option>
              <option>Residence manager</option>
              <option>Scheduler</option>
              <option>Finance contact</option>
              <option>Authorized staffing coordinator</option>
            </select>
          </label>
          <label style={styles.fieldLabel}>
            Password
            <input placeholder="Password requirements placeholder" type="password" style={styles.input} />
          </label>
        </div>
        <p style={styles.warning}>
          Terms and Privacy acknowledgements remain separate. Final legal wording is not finalized
          on this implementation surface.
        </p>
      </section>

      <section style={styles.whiteSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>What happens next</p>
          <h2 style={styles.sectionTitle}>Account creation is the first step, not the approval.</h2>
        </div>
        <ol style={styles.stepList}>
          {accountTypeOutcomes.map((outcome) => (
            <li key={outcome} style={styles.stepItem}>
              {outcome}
            </li>
          ))}
        </ol>
      </section>

      <section style={styles.section}>
        <div style={styles.cardGrid}>
          {accountBoundaries.map((boundary) => (
            <article key={boundary} style={styles.card}>
              <p style={styles.cardText}>{boundary}</p>
            </article>
          ))}
        </div>
      </section>

      <WorkflowRoutes currentRoute="/signup/employer" />
    </EmployerShell>
  );
}

