import { EmployerShell } from "../employer/EmployerShell";
import { styles } from "../employer/employerStyles";

import { SignInForm } from "./SignInForm";

/**
 * Employer sign-in capsule (server page). Renders the shared EmployerShell and mounts the interactive
 * client form, mirroring how the calendar panel is composed (server page → client child). The form
 * posts to the existing `/api/session/sign-in` route, which owns the httpOnly session cookie.
 */
export default function EmployerSignInPage() {
  return (
    <EmployerShell
      currentRoute="/signin"
      eyebrow="Employer sign in"
      title="Sign in to your employer workspace."
      lede="Access your organization’s staffing requests, calendar, and workflows. Sign-in is available in every environment; new account creation is limited to non-production."
    >
      <section style={styles.section}>
        <SignInForm />
      </section>
    </EmployerShell>
  );
}
