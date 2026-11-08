import { PayrollConsole } from "./PayrollConsole";
import { showPayrollTestBadge } from "./testBadge";

// Payroll admin console. Reads/writes only through the scoped payroll BFF -> API
// (PAYROLL_ADMINISTRATOR authority). No money execution — the terminal state is a governed
// ApprovedPayrollCalculation and its locked/corrected history. The "test payroll" badge shows only
// outside the production deployment tier.
export default function PayrollPage() {
  return <PayrollConsole showTestBadge={showPayrollTestBadge()} />;
}
