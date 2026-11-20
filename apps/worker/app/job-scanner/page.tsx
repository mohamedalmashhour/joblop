import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { JobScannerFeed } from "./JobScannerFeed";
import { SiteHeader } from "../SiteHeader";
import { JobAlertsCard } from "../job-alerts/JobAlertsCard";
import { hasSessionCookie } from "../hasSessionCookie";
import { findWorkHref, firstParam } from "../findWorkUrl";
import { LOCALE_COOKIE, resolveWorkerLocale } from "../i18n/config";
import { dictionaries } from "../i18n/messages";

// Signed-out visitors: outside listings now live in the Find work list (after Joblop jobs).
// Signed-in workers keep their ranked JobScanner feed here.
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  if (!(await hasSessionCookie())) {
    redirect(findWorkHref({ tab: "list", q: firstParam(params.q), city: firstParam(params.city) }));
  }
  const store = await cookies();
  const m = dictionaries[resolveWorkerLocale(store.get(LOCALE_COOKIE)?.value)] ?? dictionaries["en-CA"];
  const en = dictionaries["en-CA"];
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <h1 style={{ color: "#fbf7ee", fontSize: "clamp(26px,5vw,40px)", margin: "18px 0 6px" }}>{m["scanner.title"] ?? en["scanner.title"]}</h1>
        <p style={{ color: "#cabfa8", fontSize: 16, lineHeight: 1.6, margin: "0 0 4px", maxWidth: 760 }}>
          {m["scanner.lede"] ?? en["scanner.lede"]}
        </p>
        <JobAlertsCard />
        <JobScannerFeed />
      </main>
    </>
  );
}
