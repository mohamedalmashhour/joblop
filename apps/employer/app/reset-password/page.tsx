import { EmployerShell } from "../employer/EmployerShell";
import { styles } from "../employer/employerStyles";
import { PasswordResetForm } from "./PasswordResetForm";

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token ?? "";
  return (
    <EmployerShell
      currentRoute="/signin"
      eyebrow="Account recovery"
      title="Choose a new password."
      lede="Reset links expire after 30 minutes and can be used only once."
    >
      <section style={styles.section}>
        <PasswordResetForm token={token} />
      </section>
    </EmployerShell>
  );
}
