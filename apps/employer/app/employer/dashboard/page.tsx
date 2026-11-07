import { EmployerShell } from "../EmployerShell";
import { styles } from "../employerStyles";
import { EmployerHomePanel } from "./EmployerHomePanel";

export default function EmployerDashboardPage() {
  return (
    <EmployerShell
      actions={
        <a href="/employer/calendar/create" style={styles.primaryButton}>
          Create staffing request
        </a>
      }
      currentRoute="/employer/dashboard"
      eyebrow="Employer home"
      lede="What needs you today, read live from your own Joblop records."
      mode="authenticated"
      title="Your staffing at a glance."
    >
      <EmployerHomePanel />
    </EmployerShell>
  );
}
