import type { Metadata } from "next";
import { PrivacyPolicy } from "../legal/content";

export const metadata: Metadata = {
  title: "Privacy Policy — JobLop",
  description: "How JobLop collects, uses and shares your personal information."
};

export default function PrivacyPage() {
  return <PrivacyPolicy />;
}
