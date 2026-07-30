import { authStyles } from "../authStyles";

import { SignUpForm } from "./SignUpForm";

/**
 * Admin sign-up capsule (server page). Passes the registration gate down from the environment: the
 * backend registration returns 404 in production, so we surface an honest "not open" state there.
 * Creating an account produces a normal user login only — administrative authority is provisioned
 * separately and is never granted by this form.
 */
export default function AdminSignUpPage() {
  const registrationOpen = process.env.RWOS_ENV !== "production";

  return (
    <main style={authStyles.page}>
      <section style={authStyles.card}>
        <p style={authStyles.eyebrow}>Administration access</p>
        <h1 style={authStyles.title}>Create an account.</h1>
        <p style={authStyles.copy}>
          This creates a login for the workspace. It does not grant administrative authority —
          access to governed data and actions is provisioned separately after the account exists.
        </p>
        <SignUpForm registrationOpen={registrationOpen} />
      </section>
    </main>
  );
}
