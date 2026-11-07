import { EmployerShell } from "../EmployerShell";
import { EmployerCompanyPanel } from "./EmployerCompanyPanel";

export default function EmployerCompanyPage() {
  return (
    <EmployerShell
      currentRoute="/employer/company"
      eyebrow="Your company"
      lede="Keep your company's names up to date."
      mode="authenticated"
      title="Company details"
    >
      <EmployerCompanyPanel />
    </EmployerShell>
  );
}
