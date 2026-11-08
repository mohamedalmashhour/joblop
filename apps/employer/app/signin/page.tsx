import { cookies } from "next/headers";
import { EmployerShell } from "../employer/EmployerShell";
import { styles } from "../employer/employerStyles";
import { LOCALE_COOKIE, resolveEmployerLocale } from "../i18n/config";
import { dictionaries, type Messages } from "../i18n/messages";

import { SignInForm } from "./SignInForm";

/**
 * Employer sign-in capsule (server page). Renders the shared EmployerShell and mounts the interactive
 * client form, mirroring how the calendar panel is composed (server page → client child). The form
 * posts to the existing `/api/session/sign-in` route, which owns the httpOnly session cookie.
 */
export default async function EmployerSignInPage() {
  const store = await cookies();
  const locale = resolveEmployerLocale(store.get(LOCALE_COOKIE)?.value);
  const m: Messages = { ...dictionaries["en-CA"], ...dictionaries[locale] } as Messages;
  return (
    <EmployerShell
      currentRoute="/signin"
      eyebrow={m["signin.pageEyebrow"]}
      title={m["signin.pageTitle"]}
      lede={m["signin.pageLede"]}
    >
      <section style={styles.section}>
        <SignInForm />
      </section>
    </EmployerShell>
  );
}
