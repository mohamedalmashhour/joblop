import { forwardBrainMutation } from "../../../brainForward";

// Staff undo an action that offers it (a bonus offer not yet answered, approved hours not yet locked).
export async function POST(request: Request, context: { params: Promise<{ actionId: string }> }) {
  const { actionId } = await context.params;
  return forwardBrainMutation(request, `/platform/brain/actions/${encodeURIComponent(actionId)}/undo`);
}
