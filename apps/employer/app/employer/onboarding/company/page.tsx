import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import { serverLang } from "../../../i18n/serverLang";
import { setupText } from "../onboardingText";
import { OnboardingPanel } from "./OnboardingPanel";

export default async function CompanyProfilePage() {
  const tx = setupText[await serverLang()];
  return (
    <EmployerShell
      currentRoute="/employer/onboarding/company"
      eyebrow={tx.pageEyebrow}
      title={tx.pageTitle}
      lede={tx.pageLede}
    >
      <OnboardingPanel />

      <WorkflowRoutes currentRoute="/employer/onboarding/company" />
    </EmployerShell>
  );
}
