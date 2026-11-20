import { CrmShell } from "./CrmShell";
import { PipelineBoard } from "./PipelineBoard";

export default function PipelinePage() {
  return (
    <CrmShell active="pipeline">
      <PipelineBoard />
    </CrmShell>
  );
}
