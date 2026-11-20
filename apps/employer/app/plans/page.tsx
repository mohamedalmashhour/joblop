import { SiteHeader } from "../shared/SiteHeader";
import { PlansPanel } from "./PlansPanel";
import { PublicSiteFooter } from "../pricing/publicPageStyles";

// Employer fixed plans. Shows "coming soon" until the API's EMPLOYER_PLANS_ENABLED flag is on.
// Same site header and footer as every other public employer page.
export default function PlansPage() {
  return (
    <>
      <SiteHeader current="/plans" />
      <PlansPanel />
      <PublicSiteFooter />
    </>
  );
}
