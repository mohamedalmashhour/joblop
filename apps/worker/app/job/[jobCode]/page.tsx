import { PublicJobDetail } from "./PublicJobDetail";
import { SiteHeader } from "../../SiteHeader";

// Public job page (no sign-in): one open Joblop job by its public job code. Signed-out visitors see
// what, where (city only), when and the worker's own pay, with "Create an account to take this job".
// Signed-in workers are taken straight to the real job page.
export default async function Page({ params }: { params: Promise<{ jobCode: string }> }) {
  const { jobCode } = await params;
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <PublicJobDetail jobCode={jobCode} />
      </main>
    </>
  );
}
