import { cookies } from "next/headers";
import { EmployerShell } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { CreatePersistedRequestPanel } from "./CreatePersistedRequestPanel";
import { LOCALE_COOKIE, resolveEmployerLocale } from "../../../i18n/config";
import { dictionaries, type Messages } from "../../../i18n/messages";

export default async function CreateClientRequestPage() {
  const store = await cookies();
  const locale = resolveEmployerLocale(store.get(LOCALE_COOKIE)?.value);
  const m: Messages = { ...dictionaries["en-CA"], ...dictionaries[locale] } as Messages;
  return (
    <EmployerShell
      currentRoute="/employer/calendar/create"
      eyebrow={m["page.createEyebrow"]}
      title={m["page.createTitle"]}
      lede={m["page.createLede"]}
      mode="authenticated"
      actions={
        <a href="/employer/calendar" style={styles.secondaryButton}>
          {m["page.createBack"]}
        </a>
      }
    >
      <section style={styles.section}>
        <CreatePersistedRequestPanel />
      </section>
    </EmployerShell>
  );
}
