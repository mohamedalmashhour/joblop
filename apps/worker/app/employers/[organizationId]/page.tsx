import { EmployerProfile } from "./EmployerProfile";
import { SubPageHeader } from "../../SubPageHeader";

export default async function Page({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  return (
    <>
      <SubPageHeader />
      <main className="wrap">
        <EmployerProfile id={organizationId} />
      </main>
    </>
  );
}
