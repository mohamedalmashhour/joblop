import { authStyles } from "../authStyles";

import { SignInForm } from "./SignInForm";

/**
 * Admin sign-in capsule (server page). AdminShell is applied by the root layout, so this renders the
 * page content only. The interactive form owns the request to `/api/session/sign-in`, which sets the
 * httpOnly admin session cookie.
 */
export default function AdminSignInPage() {
  return (
    <main style={authStyles.page}>
      <section style={authStyles.card}>
        <p style={authStyles.eyebrow}>Administration access</p>
        <h1 style={authStyles.title}>Sign in to the administration workspace.</h1>
        <p style={authStyles.copy}>Staff sign in with their mobile number and a texted code.</p>
        <SignInForm />
      </section>
    </main>
  );
}
