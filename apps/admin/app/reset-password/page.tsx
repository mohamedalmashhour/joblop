import { authStyles } from "../authStyles";
import { PasswordResetForm } from "./PasswordResetForm";

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return (
    <main style={authStyles.page}>
      <section style={authStyles.card}>
        <p style={authStyles.eyebrow}>Account recovery</p>
        <h1 style={authStyles.title}>Choose a new password.</h1>
        <p style={authStyles.copy}>Reset links expire after 30 minutes and can be used only once.</p>
        <PasswordResetForm token={(await searchParams).token ?? ""} />
      </section>
    </main>
  );
}
