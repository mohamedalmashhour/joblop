import { forwardBrainMutation, readJson } from "../brainForward";

// Staff turn one brain action (or the daily summary email) on or off.
export async function POST(request: Request) {
  const body = await readJson(request);
  return forwardBrainMutation(request, "/platform/brain/switches", { key: body.key, enabled: body.enabled });
}
