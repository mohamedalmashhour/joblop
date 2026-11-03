import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { SiteHeader } from "../SiteHeader";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <ForgotPasswordForm />
      </main>
    </>
  );
}
