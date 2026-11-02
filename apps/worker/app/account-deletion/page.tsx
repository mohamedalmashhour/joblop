import type { Metadata } from "next";
import { AccountDeletion } from "../legal/content";

export const metadata: Metadata = {
  title: "Delete your account — Joblop",
  description: "How to request deletion of your Joblop account and associated data."
};

export default function AccountDeletionPage() {
  return <AccountDeletion />;
}
