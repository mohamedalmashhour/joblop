import { CrmShell } from "../../CrmShell";
import { ContactDetail } from "./ContactDetail";

export default async function ContactPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  return (
    <CrmShell active="pipeline">
      <ContactDetail id={id} />
    </CrmShell>
  );
}
