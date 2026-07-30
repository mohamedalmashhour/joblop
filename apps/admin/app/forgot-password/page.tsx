import { authStyles } from "../authStyles";
import { PasswordResetRequestForm } from "./PasswordResetRequestForm";

export default function ForgotPasswordPage() {
  return (
    <main style={authStyles.page}>
      <section style={authStyles.card}>
        <p style={authStyles.eyebrow}>Account recovery</p>
        <h1 style={authStyles.title}>Reset your password.</h1>
        <p style={authStyles.copy}>
          For privacy, the response is the same whether or not an account exists.
        </p>
        <PasswordResetRequestForm />
      </section>
    </main>
  );
}
