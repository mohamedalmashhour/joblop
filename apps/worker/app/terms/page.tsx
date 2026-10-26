import type { Metadata } from "next";
import { TermsOfService } from "../legal/content";

export const metadata: Metadata = {
  title: "Terms of Service — JobLop",
  description: "The terms that govern your use of JobLop."
};

export default function TermsPage() {
  return <TermsOfService />;
}
