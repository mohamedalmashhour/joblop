import { redirect } from "next/navigation";
import { SiteHeader } from "../SiteHeader";
import { BackToDashboard } from "../BackToDashboard";
import { JobsCalendar } from "./JobsCalendar";
import { JobAlertsCard } from "../job-alerts/JobAlertsCard";
import { hasSessionCookie } from "../hasSessionCookie";
import { findWorkHref } from "../findWorkUrl";

// "My calendar" for signed-in workers. A signed-out visitor is sent to the Calendar tab of Find work.
export default async function Page() {
  if (!(await hasSessionCookie())) redirect(findWorkHref({ tab: "calendar" }));
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        {/* Lined up with the 760px calendar column. */}
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <BackToDashboard labelKey="nav.backHome" />
        </div>
        <JobsCalendar />
        <JobAlertsCard />
      </main>
    </>
  );
}
