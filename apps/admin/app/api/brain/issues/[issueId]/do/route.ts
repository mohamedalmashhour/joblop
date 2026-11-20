import { forwardBrainMutation } from "../../../brainForward";

// Staff "Do it": run an issue's recommended action now.
export async function POST(request: Request, context: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await context.params;
  return forwardBrainMutation(request, `/platform/brain/issues/${encodeURIComponent(issueId)}/do`);
}
