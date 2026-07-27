import { EmployerShell } from "../EmployerShell";
import { styles } from "../employerStyles";
import {
  clientCalendarPrivacyBoundaries,
  clientCalendarRows
} from "./clientCalendarContent";

export default function ClientRequestCalendarPage() {
  return (
    <EmployerShell
      currentRoute="/employer/calendar"
      eyebrow="Connected calendar / Client"
      title="See every staffing request without crossing worker or platform privacy boundaries."
      lede="This fixture calendar connects client request states to governed review and assignment visibility. It does not publish offers, assign workers, or execute money."
      actions={
        <a href="/employer/calendar/create" style={styles.primaryButton}>
          Create staffing request
        </a>
      }
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Request calendar</p>
          <h2 style={styles.sectionTitle}>Coverage status stays truthful from draft to closure.</h2>
        </div>
        <div style={styles.cardGrid}>
          {clientCalendarRows.map((event) => (
            <article key={event.id} style={styles.card}>
              <span style={styles.pill}>{event.status.replaceAll("_", " ")}</span>
              <h3 style={styles.cardTitle}>{event.role}</h3>
              <p style={styles.cardText}>{event.date}</p>
              <p style={styles.cardText}>{event.time}</p>
              <a href={event.route} style={styles.secondaryButton}>
                Open request detail
              </a>
            </article>
          ))}
        </div>
      </section>
      <section style={styles.whiteSection}>
        <div style={styles.cardGrid}>
          {clientCalendarPrivacyBoundaries.map((boundary) => (
            <article key={boundary} style={styles.tintedCard}>
              <p style={styles.cardText}>{boundary}</p>
            </article>
          ))}
        </div>
      </section>
    </EmployerShell>
  );
}
