import { EmployerShell, WorkflowRoutes } from "../EmployerShell";
import {
  dashboardAttention,
  dashboardAvailableOrdersCalendar,
  dashboardBoundaries,
  dashboardOrderCalendar,
  dashboardRevenueCalendar,
  dashboardSections
} from "../employerJourneyContent";
import { styles } from "../employerStyles";

export default function EmployerDashboardPage() {
  return (
    <EmployerShell
      currentRoute="/employer/dashboard"
      eyebrow="Page 037 - Employer Dashboard"
      title="Employer operational home for staffing attention, risks, and governed workflow handoffs."
      lede="The dashboard summarizes employer-side staffing activity. It does not become the source of truth for shifts, workers, payments, messages, notifications, documents, or compliance."
      actions={
        <>
          <a href="/employer/calendar/create" style={styles.primaryButton}>
            Create staffing request
          </a>
          <a href="/employer/calendar" style={styles.secondaryButton}>
            Open request calendar
          </a>
        </>
      }
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Primary attention band</p>
          <h2 style={styles.sectionTitle}>What requires attention now?</h2>
          <p style={styles.sectionCopy}>
            Dashboard values are development summaries until source contracts are connected. They
            route to authoritative workflows rather than silently executing actions.
          </p>
        </div>
        <div style={styles.cardGrid}>
          {dashboardAttention.map((card) => (
            <article key={card.title} style={styles.tintedCard}>
              <h3 style={styles.cardTitle}>{card.title}</h3>
              <p style={styles.cardText}>{card.state}</p>
              <a href={card.route} style={styles.secondaryButton}>
                Open workflow
              </a>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.whiteSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Operational workspace</p>
          <h2 style={styles.sectionTitle}>
            Staffing, people, communications, finance, and support summaries.
          </h2>
        </div>
        <div style={styles.pillGrid}>
          {dashboardSections.map((section) => (
            <span key={section} style={styles.pill}>
              {section}
            </span>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Employer calendars</p>
          <h2 style={styles.sectionTitle}>
            Orders and billing are visible without becoming workflow authority.
          </h2>
          <p style={styles.sectionCopy}>
            These fixture-backed calendars keep available requests, past and future staffing, and
            revenue timing separate. Estimates route to invoices and payments; they do not confirm
            final charges.
          </p>
        </div>
        <div style={styles.cardGrid}>
          <CalendarPanel
            items={dashboardAvailableOrdersCalendar}
            title="Available Orders Calendar"
            tone="urgent"
          />
          <CalendarPanel items={dashboardOrderCalendar} title="Past & Future Orders Calendar" />
          <CalendarPanel items={dashboardRevenueCalendar} title="Revenue Calendar" tone="money" />
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>AI assistant panel</p>
          <h2 style={styles.sectionTitle}>AI may summarize visible dashboard items only.</h2>
        </div>
        <div style={styles.cardGrid}>
          {dashboardBoundaries.map((boundary) => (
            <article key={boundary} style={styles.card}>
              <p style={styles.cardText}>{boundary}</p>
            </article>
          ))}
        </div>
      </section>

      <WorkflowRoutes currentRoute="/employer/dashboard" />
    </EmployerShell>
  );
}

function CalendarPanel({
  items,
  title,
  tone = "default"
}: {
  items: readonly Readonly<{
    day: string;
    detail: string;
    route: string;
    state: string;
    value: string;
  }>[];
  title: string;
  tone?: "default" | "money" | "urgent";
}) {
  return (
    <article
      style={{
        ...styles.card,
        ...(tone === "urgent" ? styles.calendarCardUrgent : {}),
        ...(tone === "money" ? styles.calendarCardMoney : {})
      }}
    >
      <h3 style={styles.cardTitle}>{title}</h3>
      <div style={styles.calendarGrid}>
        {items.map((item) => (
          <a
            aria-label={`${title}: open ${item.day} ${item.state}`}
            href={item.route}
            key={`${title}-${item.day}`}
            style={styles.calendarTile}
          >
            <span style={styles.routeStatus}>{item.day}</span>
            <strong style={styles.calendarMetric}>{item.value}</strong>
            <p style={styles.cardText}>{item.detail}</p>
            <span style={styles.calendarState}>{item.state}</span>
          </a>
        ))}
      </div>
    </article>
  );
}
