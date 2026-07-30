import { EmployerShell, WorkflowRoutes } from "../../employer/EmployerShell";
import { accountBoundaries, accountTypeOutcomes } from "../../employer/employerJourneyContent";
import { styles } from "../../employer/employerStyles";

import { SignUpForm } from "./SignUpForm";

/**
 * Employer sign-up capsule (server page). Wraps the interactive form in the shared EmployerShell and
 * passes the registration gate down from the environment: backend registration returns 404 in
 * production, so we surface an honest "not open" state there rather than a form that cannot succeed.
 * The governance sections (what happens next / account boundaries) are preserved.
 */
export default function EmployerSignUpPage() {
  const registrationOpen = process.env.RWOS_ENV !== "production";

  return (
    <EmployerShell
      currentRoute="/signup/employer"
      eyebrow="Employer sign up"
      title="Create an employer account."
      lede="Creating an account is the first step — organization setup, review, and activation remain separate. Account creation is available in non-production environments."
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Account type</p>
          <h2 style={styles.sectionTitle}>Employer: I want to request staffing support.</h2>
          <p style={styles.sectionCopy}>
            This creates your employer login. Verification, organization setup, and approval to
            request workers are handled as their own steps after the account exists.
          </p>
        </div>
        <SignUpForm registrationOpen={registrationOpen} />
        <p style={styles.warning}>
          Terms and Privacy acknowledgements are completed during organization setup. Creating an
          account does not equal employer approval.
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
