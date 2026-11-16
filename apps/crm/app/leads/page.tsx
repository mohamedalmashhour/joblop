import { CrmShell } from "../CrmShell";
import { LeadsList } from "./LeadsList";

export default function LeadsPage() {
  return (
    <CrmShell active="leads">
      <LeadsList />
    </CrmShell>
  );
}
