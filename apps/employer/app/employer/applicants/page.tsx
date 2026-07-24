import { EmployerShell, WorkflowRoutes } from "../EmployerShell";
import {
  applicantBoundaries,
  assignmentDataStates,
  prohibitedSensitiveApplicantData
} from "../assignmentWorkflowContent";
import { styles } from "../employerStyles";
import { ApplicantReviewPanel } from "./ApplicantReviewPanel";

export default function ApplicantsPage() {
  return (
    <EmployerShell
      currentRoute="/employer/applicants"
      eyebrow="Page 045 - Applicants"
      title="Review applicants for a published shift without creating an assignment."
      lede="Applicants supports human review, filtering, qualification summaries, availability review, and comparison handoff. Assignment happens later."
      actions={<a href="/employer/applicants/detail" style={styles.primaryButton}>Open applicant detail</a>}
    >
      <ApplicantReviewPanel />

      <section style={styles.whiteSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Applicant boundaries</p>
          <h2 style={styles.sectionTitle}>Applicant review is not assignment.</h2>
        </div>
        <div style={styles.cardGrid}>
          {applicantBoundaries.map((boundary) => (
            <article key={boundary} style={styles.card}>
              <p style={styles.cardText}>{boundary}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.twoColumn}>
          <article style={styles.tintedCard}>
            <h3 style={styles.cardTitle}>Hidden sensitive information</h3>
            <div style={styles.pillGrid}>
              {prohibitedSensitiveApplicantData.map((item) => <span key={item} style={styles.pill}>{item}</span>)}
            </div>
          </article>
          <article style={styles.tintedCard}>
            <h3 style={styles.cardTitle}>Integration state</h3>
            <ol style={styles.stepList}>
              {assignmentDataStates.map((state) => <li key={state} style={styles.stepItem}>{state}</li>)}
            </ol>
          </article>
        </div>
      </section>

      <WorkflowRoutes currentRoute="/employer/applicants" />
    </EmployerShell>
  );
}
