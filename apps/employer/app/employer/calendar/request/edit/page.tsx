import { cookies } from "next/headers";
import { EmployerShell } from "../../../EmployerShell";
import { styles } from "../../../employerStyles";
import { CreatePersistedRequestPanel } from "../../create/CreatePersistedRequestPanel";
import { LOCALE_COOKIE, resolveEmployerLocale } from "../../../../i18n/config";
import { dictionaries, type Messages } from "../../../../i18n/messages";

// "Edit draft" opens the same full form as Request workers, pre-filled with the saved draft.
export default async function EditPersistedRequestPage({
  searchParams
}: Readonly<{ searchParams: Promise<{ id?: string }> }>) {
  const { id } = await searchParams;
  const store = await cookies();
  const locale = resolveEmployerLocale(store.get(LOCALE_COOKIE)?.value);
  const m: Messages = { ...dictionaries["en-CA"], ...dictionaries[locale] } as Messages;
  return (
    <EmployerShell
      currentRoute="/employer/calendar/request"
      eyebrow={m["page.editEyebrow"]}
      title={m["page.editTitle"]}
      lede={m["page.editLede"]}
      mode="authenticated"
      actions={
        <a href="/employer/calendar" style={styles.secondaryButton}>
          {m["page.createBack"]}
        </a>
      }
    >
      <section style={styles.section}>
        {id ? (
          <CreatePersistedRequestPanel editRequestId={id} />
        ) : (
          <article style={styles.panel}>
            <h2 style={styles.cardTitle}>{m["create.editUnavailable"]}</h2>
            <a href="/employer/calendar" style={styles.primaryButton}>{m["create.openCalendar"]}</a>
          </article>
        )}
      </section>
    </EmployerShell>
  );
}
