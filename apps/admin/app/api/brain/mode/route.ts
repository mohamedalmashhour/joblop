import { forwardBrainMutation, readJson } from "../brainForward";

// Staff set the brain's master mode: off (kill switch), watch, or live.
export async function POST(request: Request) {
  const body = await readJson(request);
  return forwardBrainMutation(request, "/platform/brain/mode", { mode: body.mode });
}
