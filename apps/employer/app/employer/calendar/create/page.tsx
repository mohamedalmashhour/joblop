import { EmployerShell } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { clientRequestDetail } from "../clientCalendarContent";

export default function CreateClientRequestPage() {
  return (
    <EmployerShell
      currentRoute="/employer/calendar/create"
      eyebrow="Connected calendar / Client request"
      title="Create a fixture staffing request without submitting data to a backend."
      lede="Fields preview the approved request contract. The action advances only to a fixture detail screen; no request is persisted or published."
      actions={
        <a href="/employer/calendar" style={styles.secondaryButton}>
          Back to request calendar
        </a>
      }
    >
      <section style={styles.section}>
        <div style={styles.panel}>
          <div style={styles.twoColumn}>
            {Object.entries(clientRequestDetail)
              .filter(([key]) => key !== "mapPlaceholder")
              .map(([label, value]) => (
                <article key={label} style={styles.tintedCard}>
                  <p style={styles.eyebrowDark}>{label.replaceAll(/([A-Z])/g, " $1")}</p>
                  <p style={styles.cardText}>
                    {Array.isArray(value) ? value.join(", ") : String(value)}
                  </p>
                </article>
              ))}
          </div>
          <article style={styles.tintedCard}>
            <h2 style={styles.cardTitle}>Location preview</h2>
            <p style={styles.cardText}>{clientRequestDetail.mapPlaceholder}</p>
          </article>
          <a href="/employer/calendar/request" style={styles.primaryButton}>
            Review fixture request
          </a>
        </div>
      </section>
    </EmployerShell>
  );
}
