import { EmployerShell } from "../EmployerShell";
import { styles } from "../employerStyles";
import { clientCalendarPrivacyBoundaries } from "./clientCalendarContent";
import { ClientCalendarPanel } from "./ClientCalendarPanel";
import { LongTermListingsPanel } from "../listings/LongTermListingsPanel";

export default function ClientRequestCalendarPage() {
  return (
    <EmployerShell
      currentRoute="/employer/calendar"
      eyebrow="Connected calendar / Client"
      title="See every staffing request without crossing worker or platform privacy boundaries."
      lede="Authenticated request records connect to governed review and assignment visibility without publishing offers, assigning workers, or executing money."
      mode="authenticated"
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
        {/* Long-term job listing status + "Publish / Renew" (renders nothing while employer plans are off). */}
        <LongTermListingsPanel />
        <ClientCalendarPanel />
      </section>
      <section style={styles.whiteSection}>
        <div style={styles.cardGrid}>
          {clientCalendarPrivacyBoundaries
            .filter((boundary) => !boundary.includes("fixture"))
            .map((boundary) => (
              <article key={boundary} style={styles.tintedCard}>
                <p style={styles.cardText}>{boundary}</p>
              </article>
            ))}
          <article style={styles.tintedCard}>
            <p style={styles.cardText}>
              Authenticated list and detail states never substitute fixture records for persisted
              data.
            </p>
          </article>
        </div>
      </section>
    </EmployerShell>
  );
}
