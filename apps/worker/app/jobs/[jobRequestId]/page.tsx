import { JobDetail } from "./JobDetail";
import { SubPageHeader } from "../../SubPageHeader";

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
  const postalCode = typeof sp.postalCode === "string" ? sp.postalCode : null;
  return (
    <>
      <SubPageHeader />
      <main className="wrap">
        <JobDetail id={jobRequestId} postalCode={postalCode} />
      </main>
    </>
  );
}
