import { EmployerShell, WorkflowRoutes } from "../EmployerShell";
import { styles } from "../employerStyles";

export default function ApplicantsHandoffPage() {
  return (
    <EmployerShell
      currentRoute="/employer/applicants"
      eyebrow="Page 045 - Applicants"
      title="Applicant review is the next employer workflow and remains pending implementation."
      lede="This handoff prevents a dead end after publishing a shift. It does not review applicants, select workers, assign workers, or contact workers."
      actions={<a href="/employer/shifts/detail" style={styles.secondaryButton}>Back to shift detail</a>}
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Next workflow boundary</p>
          <h2 style={styles.sectionTitle}>Applicants are not implemented in this shift-creation milestone.</h2>
          <p style={styles.sectionCopy}>
            The next milestone will add governed applicant review, AI suggestion handoff, candidate
            comparison, and manual assignment boundaries.
          </p>
        </div>
        <div style={styles.cardGrid}>
          {[
            "Published shift != Applicant approval",
            "Applicant review != Worker assignment",
            "AI suggestion != Human selection",
            "Human selection != Worker acceptance"
          ].map((boundary) => (
            <article key={boundary} style={styles.tintedCard}>
              <p style={styles.cardText}>{boundary}</p>
            </article>
          ))}
        </div>
      </section>
      <WorkflowRoutes currentRoute="/employer/applicants" />
    </EmployerShell>
  );
}
