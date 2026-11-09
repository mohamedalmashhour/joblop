import { JobDetail } from "./JobDetail";
import { SiteHeader } from "../../SiteHeader";

// Job details route. Server shell resolves params/searchParams (Next 15 promises) and hands
// them to the client component that fetches the privacy-safe detail from the BFF.
export default async function Page({
  params,
  searchParams
}: {
  params: Promise<{ jobRequestId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { jobRequestId } = await params;
  const sp = await searchParams;
  // The worker's search place (a city or a postal code), for the distance line.
  const placeParam = typeof sp.place === "string" ? sp.place : typeof sp.postalCode === "string" ? sp.postalCode : null;
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <JobDetail id={jobRequestId} place={placeParam} />
      </main>
    </>
  );
}
