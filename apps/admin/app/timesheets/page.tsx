import { TimesheetsConsole } from "./TimesheetsConsole";

// Staff queue that takes a finished shift to a locked timesheet, ready for payroll. Every action goes
// through the scoped timesheet BFF; the API enforces authority and the state machine.
export default function TimesheetsPage() {
  return <TimesheetsConsole />;
}
