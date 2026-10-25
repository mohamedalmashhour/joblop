import type { Metadata } from "next";
import { PublicJobBoard } from "./PublicJobBoard";

// Public, no-sign-in job board across Canada. A funnel front door for workers. Google-ready metadata
// (title, description, Open Graph, Twitter, keywords) so it indexes and shares well once deployed.
export const metadata: Metadata = {
  title: "JobLop — Find work across Canada, free",
  description:
    "Search open jobs across Canada and apply free. JobLop's JobScanner scans the market for care, kitchen, housekeeping and more — ranked for you, with no cut of your pay.",
  keywords: [
    "jobs Canada",
    "find work",
    "staffing",
    "care jobs",
    "nurse jobs",
    "PSW jobs",
    "kitchen jobs",
    "housekeeping jobs",
    "JobScanner",
    "apply free",
    "emplois Canada",
    "trouver du travail"
  ],
  openGraph: {
    title: "JobLop — Find work across Canada, free",
    description:
      "Search open jobs across Canada and apply free. JobScanner scans the market and ranks the best matches for you.",
    siteName: "JobLop",
    type: "website",
    locale: "en_CA"
  },
  twitter: {
    card: "summary_large_image",
    title: "JobLop — Find work across Canada, free",
    description: "Search open jobs across Canada and apply free. JobScanner scans the market for you."
  },
  robots: { index: true, follow: true }
};

export default function BrowsePage() {
  return <PublicJobBoard />;
}
