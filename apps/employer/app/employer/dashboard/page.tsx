import { EmployerShell } from "../EmployerShell";
import { EmployerHomePanel } from "./EmployerHomePanel";
import { serverLang } from "../../i18n/serverLang";
import { pageHeaders } from "../pageHeaderText";

export default async function EmployerDashboardPage() {
  const h = pageHeaders[await serverLang()].dashboard;
  return (
    <EmployerShell
      currentRoute="/employer/dashboard"
      eyebrow={h.eyebrow}
      hideHero
      lede={h.lede}
      mode="authenticated"
      title={h.title}
    >
      <EmployerHomePanel />
    </EmployerShell>
  );
}
