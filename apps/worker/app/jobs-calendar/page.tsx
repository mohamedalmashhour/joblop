import { SiteHeader } from "../SiteHeader";
import { BackToDashboard } from "../BackToDashboard";
import { JobsCalendar } from "./JobsCalendar";
import { JobAlertsCard } from "../job-alerts/JobAlertsCard";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <BackToDashboard />
        <JobsCalendar />
        <JobAlertsCard />
      </main>
    </>
  );
}
