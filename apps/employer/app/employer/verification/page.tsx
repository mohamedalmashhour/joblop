import { cookies } from "next/headers";
import { EmployerShell } from "../EmployerShell";
import { styles } from "../employerStyles";
import { OrganizationVerificationPanel } from "./OrganizationVerificationPanel";
import { LOCALE_COOKIE, resolveEmployerLocale } from "../../i18n/config";
import { dictionaries, type Messages } from "../../i18n/messages";

export default async function OrganizationVerificationPage() {
  const store = await cookies();
  const locale = resolveEmployerLocale(store.get(LOCALE_COOKIE)?.value);
  const m: Messages = { ...dictionaries["en-CA"], ...dictionaries[locale] } as Messages;
  return (
    <EmployerShell
      currentRoute="/employer/verification"
      eyebrow={m["verify.eyebrow"]}
      title={m["verify.title"]}
      lede={m["verify.lede"]}
      mode="authenticated"
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>{m["verify.sectionEyebrow"]}</p>
          <h2 style={styles.sectionTitle}>{m["verify.heading"]}</h2>
        </div>
        <OrganizationVerificationPanel />
      </section>
    </EmployerShell>
  );
}
