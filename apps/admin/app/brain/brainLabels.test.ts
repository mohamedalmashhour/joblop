import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { brainText } from "./text";

// Every key the API's Brain can show on this page must have a plain label in English, French and
// Arabic. The keys are read from the API's own registries (not a hand-kept list), so a new switch,
// rule or action added on the API side fails here until the page has words for it. Round 8: the
// switch "remind_worker_timesheet" and the rule "hours_not_prepared" used to show as raw codes.

const api = (file: string) => readFileSync(new URL(`../../../api/src/${file}`, import.meta.url), "utf8");

function between(source: string, start: string, end: string): string {
  const from = source.indexOf(start);
  expect(from, `registry "${start}" not found`).toBeGreaterThan(-1);
  return source.slice(from, source.indexOf(end, from));
}

const actions = api("brain/joblopActions.ts");
const rules = api("brain/joblopRules.ts");
const titles = api("brain/brainText.ts");
const tools = ["assistant/workerTools.ts", "assistant/employerTools.ts", "assistant/staffTools.ts"].map(api).join("\n");

/** Switches on the page: every action, the daily summary, the assistant switches. */
const switchKeys = [
  ...[...between(actions, "JOBLOP_ACTION_KEYS", "] as const").matchAll(/\x22([a-z_]+)\x22/g)].map((m) => m[1]!),
  ...[...actions.matchAll(/_SWITCH = \x22([a-z_.]+)\x22/g)].map((m) => m[1]!),
  ...[...tools.matchAll(/switchKey: \x22([a-z_.]+)\x22/g)].map((m) => m[1]!),
  "assistant",
  "assistant.worker",
  "assistant.employer",
  "assistant.staff"
];
/** Actions in the log and as suggestions: every action title and every recommendedAction. */
const actionKeys = [
  ...[...between(titles, "export const ACTION_TITLES", "\n};").matchAll(/^\s*\x22?([a-z_.]+)\x22?: \{/gm)].map((m) => m[1]!),
  ...[...rules.matchAll(/recommendedAction: \x22([a-z_.]+)\x22/g)].map((m) => m[1]!)
];
/** Problem types: every registered rule and every rule title. */
const ruleKeys = [
  ...[...rules.matchAll(/^\s+key: \x22([a-z_]+)\x22/gm)].map((m) => m[1]!),
  ...[...between(titles, "export const RULE_TITLES", "\n};").matchAll(/^\s*\x22?([a-z_.]+)\x22?: \{/gm)].map((m) => m[1]!)
];

describe("Brain page labels cover everything the API registers", () => {
  it("finds the registries (so this test cannot pass by reading nothing)", () => {
    expect(switchKeys).toContain("remind_worker_timesheet");
    expect(switchKeys).toContain("assistant.worker.claim_job");
    expect(ruleKeys).toContain("hours_not_prepared");
    expect(actionKeys).toContain("assistant.claim_open_job");
  });

  for (const locale of ["en", "fr", "ar"] as const) {
    it(`has a ${locale} label for every switch and action`, () => {
      const names = brainText[locale].switchNames;
      const missing = [...new Set([...switchKeys, ...actionKeys])].filter((key) => !names[key]?.trim());
      expect(missing).toEqual([]);
    });

    it(`has a ${locale} label for every rule`, () => {
      const names = brainText[locale].ruleNames;
      expect([...new Set(ruleKeys)].filter((key) => !names[key]?.trim())).toEqual([]);
    });

    it(`has help text only for real keys, in ${locale}`, () => {
      const { switchHelp, ruleHelp } = brainText[locale];
      expect(Object.keys(switchHelp).filter((key) => !switchKeys.includes(key))).toEqual([]);
      expect(Object.keys(ruleHelp).filter((key) => !ruleKeys.includes(key))).toEqual([]);
    });
  }

  it("explains the round-7 Brain changes in every language", () => {
    for (const locale of ["en", "fr", "ar"] as const) {
      const copy = brainText[locale];
      for (const key of ["remind_worker_timesheet", "remind_worker_check_in"]) expect(copy.switchHelp[key], `${locale}:${key}`).toBeTruthy();
      for (const key of ["hours_not_prepared", "job_unfilled_soon", "worker_not_checked_in"]) expect(copy.ruleHelp[key], `${locale}:${key}`).toBeTruthy();
    }
  });
});
