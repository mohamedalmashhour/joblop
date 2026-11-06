import { SiteHeader } from "../../../SiteHeader";
import { PaySlip } from "./PaySlip";

export default async function Page({ params }: { params: Promise<{ calculationId: string }> }) {
  const { calculationId } = await params;
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <PaySlip calculationId={calculationId} />
      </main>
    </>
  );
}
