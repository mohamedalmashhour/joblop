import { EmployerProfile } from "./EmployerProfile";
import { SiteHeader } from "../../SiteHeader";

export default async function Page({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <EmployerProfile id={organizationId} />
      </main>
    </>
  );
}
