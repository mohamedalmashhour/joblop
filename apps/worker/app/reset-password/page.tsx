import { ResetPasswordForm } from "./ResetPasswordForm";
import { SiteHeader } from "../SiteHeader";

export default async function Page({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token ?? "";
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <ResetPasswordForm token={token} />
      </main>
    </>
  );
}
