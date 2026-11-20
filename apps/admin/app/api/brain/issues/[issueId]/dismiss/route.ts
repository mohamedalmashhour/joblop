import { forwardBrainMutation } from "../../../brainForward";

// Staff close an issue by hand (handled elsewhere, or not a real problem).
export async function POST(request: Request, context: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await context.params;
  return forwardBrainMutation(request, `/platform/brain/issues/${encodeURIComponent(issueId)}/dismiss`);
}
