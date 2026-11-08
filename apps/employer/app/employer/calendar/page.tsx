import { cookies } from "next/headers";
import { EmployerShell } from "../EmployerShell";
import { styles } from "../employerStyles";
import { ClientCalendarPanel } from "./ClientCalendarPanel";
import { LongTermListingsPanel } from "../listings/LongTermListingsPanel";
import { LOCALE_COOKIE, resolveEmployerLocale } from "../../i18n/config";
import { dictionaries, type Messages } from "../../i18n/messages";

export default async function ClientRequestCalendarPage() {
  const store = await cookies();
  const locale = resolveEmployerLocale(store.get(LOCALE_COOKIE)?.value);
  const m: Messages = { ...dictionaries["en-CA"], ...dictionaries[locale] } as Messages;
  return (
    <EmployerShell
      currentRoute="/employer/calendar"
      eyebrow={m["page.calendarEyebrow"]}
      title={m["page.calendarTitle"]}
      lede={m["page.calendarLede"]}
      mode="authenticated"
      actions={
        <a href="/employer/calendar/create" style={styles.primaryButton}>
          {m["page.calendarCreate"]}
        </a>
      }
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>{m["page.calendarSectionEyebrow"]}</p>
          <h2 style={styles.sectionTitle}>{m["page.calendarSectionTitle"]}</h2>
        </div>
        {/* Long-term job listing status + "Publish / Renew" (renders nothing while employer plans are off). */}
        <LongTermListingsPanel />
        <ClientCalendarPanel />
      </section>
    </EmployerShell>
  );
}
