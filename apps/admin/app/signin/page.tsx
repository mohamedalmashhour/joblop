import { authStyles } from "../authStyles";
import { serverPageText } from "../i18n/serverPageText";

import { SignInForm } from "./SignInForm";
import { signInText } from "./text";

/**
 * Admin sign-in capsule (server page). AdminShell is applied by the root layout, so this renders the
 * page content only. The interactive form owns the request to `/api/session/sign-in`, which sets the
 * httpOnly admin session cookie.
 */
export default async function AdminSignInPage() {
  const t = await serverPageText(signInText);
  return (
    <main style={authStyles.page}>
      <section style={authStyles.card}>
        <p style={authStyles.eyebrow}>{t.eyebrow}</p>
        <h1 style={authStyles.title}>{t.title}</h1>
        <p style={authStyles.copy}>{t.copy}</p>
        <SignInForm />
      </section>
    </main>
  );
}
