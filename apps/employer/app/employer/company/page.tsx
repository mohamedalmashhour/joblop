import { EmployerShell } from "../EmployerShell";
import { AddEmailCard } from "./AddEmailCard";
import { EmployerCompanyPanel } from "./EmployerCompanyPanel";
import { serverLang } from "../../i18n/serverLang";
import { pageHeaders } from "../pageHeaderText";

export default async function EmployerCompanyPage() {
  const h = pageHeaders[await serverLang()].company;
  return (
    <EmployerShell
      currentRoute="/employer/company"
      eyebrow={h.eyebrow}
      lede={h.lede}
      mode="authenticated"
      title={h.title}
    >
      {/* Shown only while this user's account has no confirmed email (item 45). */}
      <AddEmailCard />
      <EmployerCompanyPanel />
    </EmployerShell>
  );
}
