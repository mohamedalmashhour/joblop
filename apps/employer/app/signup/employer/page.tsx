import { cookies } from "next/headers";
import { EmployerShell, WorkflowRoutes } from "../../employer/EmployerShell";
import { styles } from "../../employer/employerStyles";
import { LOCALE_COOKIE, resolveEmployerLocale } from "../../i18n/config";
import { dictionaries, type Messages } from "../../i18n/messages";

import { SignUpForm } from "./SignUpForm";

/**
 * Employer sign-up capsule (server page). Wraps the interactive form in the shared EmployerShell and
 * passes the registration gate down from the environment: backend registration returns 404 in
 * production, so we surface an honest "not open" state there rather than a form that cannot succeed.
 */
export default async function EmployerSignUpPage() {
  const registrationOpen =
    process.env.RWOS_ENV !== "production" &&
    process.env.EMPLOYER_SELF_REGISTRATION_ENABLED === "enabled" &&
    Boolean(process.env.TERMS_VERSION && process.env.PRIVACY_NOTICE_VERSION);
  const store = await cookies();
  const locale = resolveEmployerLocale(store.get(LOCALE_COOKIE)?.value);
  const m: Messages = { ...dictionaries["en-CA"], ...dictionaries[locale] } as Messages;
  const steps = [m["signup.step1"], m["signup.step2"], m["signup.step3"], m["signup.step4"], m["signup.step5"]];

  return (
    <EmployerShell
      currentRoute="/signup/employer"
      eyebrow={m["signup.pageEyebrow"]}
      title={m["signup.pageTitle"]}
      lede={m["signup.pageLede"]}
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>{m["signup.accountEyebrow"]}</p>
          <h2 style={styles.sectionTitle}>{m["signup.accountTitle"]}</h2>
          <p style={styles.sectionCopy}>{m["signup.accountCopy"]}</p>
        </div>
        <SignUpForm registrationOpen={registrationOpen} />
      </section>

      <section style={styles.whiteSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>{m["signup.nextEyebrow"]}</p>
          <h2 style={styles.sectionTitle}>{m["signup.nextTitle"]}</h2>
        </div>
        <ol style={styles.stepList}>
          {steps.map((step) => (
            <li key={step} style={styles.stepItem}>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <WorkflowRoutes currentRoute="/signup/employer" />
    </EmployerShell>
  );
}
