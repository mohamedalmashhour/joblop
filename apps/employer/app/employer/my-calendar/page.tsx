import { EmployerShell } from "../EmployerShell";
import { MyCalendarPanel } from "./MyCalendarPanel";

// Calendar hub: the employer's starting point. Jobs with coverage and who is coming, bonus offers
// to answer, invoice due dates and cancellations, plus a Today panel. Text is translated in the panel.
export default function EmployerMyCalendarPage() {
  return (
    <EmployerShell
      currentRoute="/employer/my-calendar"
      eyebrow="My calendar"
      hideHero
      lede="Your jobs, bonus offers and invoices in one calendar."
      mode="authenticated"
      title="My calendar"
    >
      <MyCalendarPanel />
    </EmployerShell>
  );
}
