import { authStyles } from "../authStyles";

/**
 * Platform administrators never self-register. The initial administrator uses the one-time,
 * fail-closed bootstrap; later administrators are provisioned through governed access management.
 */
export default function AdminSignUpPage() {
  return (
    <main style={authStyles.page}>
      <section style={authStyles.card}>
        <p style={authStyles.eyebrow}>Administration access</p>
        <h1 style={authStyles.title}>Administration registration is closed.</h1>
        <p style={authStyles.copy}>
          Platform Admin accounts cannot self-register. Use the approved one-time bootstrap for the
          first administrator or the governed access process for additional administrators.
        </p>
        <a href="/signin" style={authStyles.primaryButton}>
          Return to sign in
        </a>
      </section>
    </main>
  );
}
