import type { Metadata } from "next";
import { HowItWorks } from "./HowItWorks";
import { SiteHeader } from "../SiteHeader";
import { HowItWorksVideos } from "./HowItWorksVideos";

export const metadata: Metadata = {
  title: "How Joblop works — guide for workers",
  description:
    "Create a free account, build a free CV, find shifts near you, see the pay before you accept, and get help from real people."
};

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main>
        <HowItWorksVideos />
        <HowItWorks />
      </main>
    </>
  );
}
