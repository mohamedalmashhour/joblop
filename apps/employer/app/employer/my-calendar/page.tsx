import { EmployerShell } from "../EmployerShell";
import { MyCalendarPanel } from "./MyCalendarPanel";
import { serverLang } from "../../i18n/serverLang";
import { pageHeaders } from "../pageHeaderText";

// Calendar hub: the employer's starting point. Jobs with coverage and who is coming, bonus offers
// to answer, invoice due dates and cancellations, plus a Today panel. Text is translated in the panel.
export default async function EmployerMyCalendarPage() {
  const h = pageHeaders[await serverLang()].myCalendar;
  return (
    <EmployerShell
      currentRoute="/employer/my-calendar"
      eyebrow={h.eyebrow}
      hideHero
      lede={h.lede}
      mode="authenticated"
      title={h.title}
    >
      <MyCalendarPanel />
    </EmployerShell>
  );
}
