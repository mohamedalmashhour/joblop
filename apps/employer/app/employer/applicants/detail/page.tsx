import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import {
  applicantBoundaries,
  getPrimaryApplicant,
  prohibitedSensitiveApplicantData
} from "../../assignmentWorkflowContent";
import { styles } from "../../employerStyles";

const applicant = getPrimaryApplicant();

export default function ApplicantDetailPage() {
  return (
    <EmployerShell
      currentRoute="/employer/applicants/detail"
      eyebrow="Page 045 - Applicant Detail"
      title="Review one applicant using minimum necessary staffing information."
      lede="This page displays role fit, qualification summaries, availability, experience, and AI explanation. It does not expose sensitive personal information or assign the worker."
      actions={<a href="/employer/shifts/ai-suggestions" style={styles.primaryButton}>Review AI recommendations</a>}
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Applicant summary</p>
          <h2 style={styles.sectionTitle}>{applicant.displayName}</h2>
          <p style={styles.sectionCopy}>Fixture applicant data. No backend applicant profile is being fetched.</p>
        </div>
        <div style={styles.cardGrid}>
          {[
            ["Application status", applicant.status],
            ["Qualification summary", applicant.qualifications],
            ["Availability", applicant.availability],
            ["Experience summary", applicant.experience],
            ["AI explanation", applicant.aiExplanation],
            ["Privacy level", applicant.privacyLevel]
          ].map(([label, value]) => (
            <article key={label} style={styles.card}>
              <h3 style={styles.cardTitle}>{label}</h3>
              <p style={styles.cardText}>{value}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.whiteSection}>
        <div style={styles.twoColumn}>
          <article style={styles.tintedCard}>
            <h3 style={styles.cardTitle}>Review actions</h3>
            <p style={styles.cardText}>Shortlist, request clarification, or compare. These are local display actions only.</p>
            <a href="/employer/applicants/compare" style={{ ...styles.secondaryButton, marginTop: 12 }}>Compare candidates</a>
          </article>
          <article style={styles.tintedCard}>
            <h3 style={styles.cardTitle}>Not shown to employer</h3>
            <div style={styles.pillGrid}>
              {prohibitedSensitiveApplicantData.map((item) => <span key={item} style={styles.pill}>{item}</span>)}
            </div>
          </article>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.cardGrid}>
          {applicantBoundaries.map((boundary) => (
            <article key={boundary} style={styles.card}>
              <p style={styles.cardText}>{boundary}</p>
            </article>
          ))}
        </div>
      </section>

      <WorkflowRoutes currentRoute="/employer/applicants/detail" />
    </EmployerShell>
  );
}
