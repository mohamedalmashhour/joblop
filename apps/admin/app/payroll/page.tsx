import { PayrollConsole } from "./PayrollConsole";

// SYNTHETIC / TEST payroll admin console. Reads/writes only through the scoped payroll BFF ->
// API (PAYROLL_ADMINISTRATOR authority). No money execution — the terminal state is a governed
// ApprovedPayrollCalculation and its locked/corrected history.
export default function PayrollPage() {
  return <PayrollConsole />;
}
