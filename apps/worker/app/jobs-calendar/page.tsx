import { SiteHeader } from "../SiteHeader";
import { BackToDashboard } from "../BackToDashboard";
import { JobsCalendar } from "./JobsCalendar";
import { JobAlertsCard } from "../job-alerts/JobAlertsCard";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        {/* Lined up with the 760px calendar column; "Back to home" because this page is public. */}
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <BackToDashboard labelKey="nav.backHome" />
        </div>
        <JobsCalendar />
        <JobAlertsCard />
      </main>
    </>
  );
}
