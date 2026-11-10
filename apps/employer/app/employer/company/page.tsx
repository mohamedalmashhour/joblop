import { EmployerShell } from "../EmployerShell";
import { AddEmailCard } from "./AddEmailCard";
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
      {/* Shown only while this user's account has no confirmed email (item 45). */}
      <AddEmailCard />
      <EmployerCompanyPanel />
    </EmployerShell>
  );
}
