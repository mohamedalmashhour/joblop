import type { Metadata } from "next";
import { TermsOfService } from "../legal/content";

export const metadata: Metadata = {
  title: "Terms of Service — Joblop",
  description: "The terms that govern your use of Joblop."
};

export default function TermsPage() {
  return <TermsOfService />;
}
