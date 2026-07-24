import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import {
  aiRecommendationBoundaries,
  applicantFixtures,
  assignmentBoundaries
} from "../../assignmentWorkflowContent";
import { styles } from "../../employerStyles";

export default function CandidateComparisonPage() {
  return (
    <EmployerShell
      currentRoute="/employer/applicants/compare"
      eyebrow="Page 045 - Candidate Comparison"
      title="Compare candidates for human review without hidden ranking."
      lede="Comparison supports an employer decision. It does not assign, reject, notify, or score workers using protected characteristics."
      actions={<a href="/employer/assignments/manual" style={styles.primaryButton}>Manual assignment</a>}
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Comparison table</p>
          <h2 style={styles.sectionTitle}>Visible criteria remain operational and explainable.</h2>
        </div>
        <div style={styles.cardGrid}>
          {applicantFixtures.map((applicant) => (
            <article key={applicant.id} style={styles.card}>
              <h3 style={styles.cardTitle}>{applicant.displayName}</h3>
              <p style={styles.cardText}>Role fit: {applicant.roleFit}</p>
              <p style={styles.cardText}>Availability: {applicant.availability}</p>
              <p style={styles.cardText}>Qualifications: {applicant.qualifications}</p>
              <p style={styles.cardText}>AI note: {applicant.aiExplanation}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.whiteSection}>
        <div style={styles.cardGrid}>
          {aiRecommendationBoundaries.map((boundary) => (
            <article key={boundary} style={styles.tintedCard}>
              <p style={styles.cardText}>{boundary}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.cardGrid}>
          {assignmentBoundaries.slice(0, 4).map((boundary) => (
            <article key={boundary} style={styles.card}>
              <p style={styles.cardText}>{boundary}</p>
            </article>
          ))}
        </div>
      </section>

      <WorkflowRoutes currentRoute="/employer/applicants/compare" />
    </EmployerShell>
  );
}
