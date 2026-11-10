import { CvBuilder } from "./CvBuilder";
import { CvPageIntro } from "./CvPageIntro";
import { SiteHeader } from "../SiteHeader";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        {/* R2-16: a clear way back home (a "Back to home" link above the title). */}
        <CvPageIntro />
        <CvBuilder />
      </main>
    </>
  );
}
