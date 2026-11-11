import type { BrainLog, BrainStore } from "@rwos/brain";
import { createBrain } from "@rwos/brain";
import { DAILY_SUMMARY_SWITCH, JOBLOP_BRAIN_ACTIONS } from "./joblopActions";
import type { JoblopBrainData, JoblopBrainEffects } from "./joblopRules";
import { JOBLOP_BRAIN_RULES } from "./joblopRules";

// Joblop's plug-in to the platform-neutral brain: Joblop rules + Joblop actions + Joblop adapters
// (data, effects) on top of the shared engine. Another platform does the same with its own pieces.

export function createJoblopBrain(input: {
  store: BrainStore;
  data: JoblopBrainData;
  effects: JoblopBrainEffects;
  /** More switches stored with the brain settings (phase 2: the assistant's switches). */
  extraSwitches?: readonly string[];
  now?: () => Date;
  log?: BrainLog;
}) {
  return createBrain({
    store: input.store,
    rules: JOBLOP_BRAIN_RULES,
    actions: JOBLOP_BRAIN_ACTIONS,
    context: { data: input.data, effects: input.effects },
    extraSwitches: [DAILY_SUMMARY_SWITCH, ...(input.extraSwitches ?? [])],
    ...(input.now ? { now: input.now } : {}),
    ...(input.log ? { log: input.log } : {})
  });
}
