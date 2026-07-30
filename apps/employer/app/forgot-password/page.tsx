import { EmployerShell } from "../employer/EmployerShell";
import { styles } from "../employer/employerStyles";
import { PasswordResetRequestForm } from "./PasswordResetRequestForm";

export default function ForgotPasswordPage() {
  return (
    <EmployerShell
      currentRoute="/signin"
      eyebrow="Account recovery"
      title="Reset your password."
      lede="For privacy, the response is the same whether or not an account exists."
    >
      <section style={styles.section}>
        <PasswordResetRequestForm />
      </section>
    </EmployerShell>
  );
}
