import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import { aiSuggestionBoundaries, aiSuggestionInputs } from "../shiftManagementContent";
import { styles } from "../../employerStyles";

export default function AIWorkerSuggestionsPage() {
  return (
    <EmployerShell
      currentRoute="/employer/shifts/ai-suggestions"
      eyebrow="AI Worker Suggestions"
      title="Review advisory worker suggestions without hidden ranking or automatic assignment."
      lede="AI suggestions explain compatibility and missing information. Employers still use human review, Applicants, and assignment workflows for decisions."
      actions={<a href="/employer/applicants/compare" style={styles.primaryButton}>Compare candidates</a>}
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}><p style={styles.eyebrowDark}>Suggestion inputs</p><h2 style={styles.sectionTitle}>Inputs must be job-relevant, authorized, and explainable.</h2></div>
        <div style={styles.pillGrid}>{aiSuggestionInputs.map((input) => <span key={input} style={styles.pill}>{input}</span>)}</div>
      </section>

      <section style={styles.whiteSection}>
        <div style={styles.sectionHeader}><p style={styles.eyebrowDark}>Advisory output</p><h2 style={styles.sectionTitle}>Example recommendation card</h2></div>
        <article style={styles.tintedCard}>
          <h3 style={styles.cardTitle}>Worker suggestion placeholder</h3>
          <p style={styles.cardText}>Compatibility: role and schedule appear aligned.</p>
          <p style={styles.cardText}>Confidence guidance: review required.</p>
          <p style={styles.cardText}>Missing information: final eligibility and worker response not confirmed.</p>
          <p style={styles.cardText}>Action: shortlist for human review, not assignment.</p>
          <a href="/employer/applicants/compare" style={{ ...styles.secondaryButton, marginTop: 12 }}>Compare with applicants</a>
        </article>
      </section>

      <section style={styles.section}>
        <div style={styles.cardGrid}>{aiSuggestionBoundaries.map((boundary) => <article key={boundary} style={styles.card}><p style={styles.cardText}>{boundary}</p></article>)}</div>
      </section>

      <WorkflowRoutes currentRoute="/employer/shifts/ai-suggestions" />
    </EmployerShell>
  );
}
