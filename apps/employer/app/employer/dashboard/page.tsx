import { EmployerShell } from "../EmployerShell";
import { EmployerHomePanel } from "./EmployerHomePanel";

export default function EmployerDashboardPage() {
  return (
    <EmployerShell
      currentRoute="/employer/dashboard"
      eyebrow="Employer home"
      hideHero
      lede="What needs you today, read live from your own Joblop records."
      mode="authenticated"
      title="Employer home"
    >
      <EmployerHomePanel />
    </EmployerShell>
  );
}
