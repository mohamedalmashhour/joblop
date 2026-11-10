import type { BrainMode, BrainStore, StoredIssue } from "./types";

// The daily summary: what the brain found, what it did (or would have done in watch mode), what
// failed, and what still needs a person. Built only from the store, so every platform gets it free.

const DAY_MS = 86_400_000;

export type BrainSummary = Readonly<{
  since: Date;
  until: Date;
  mode: BrainMode;
  /** Issues first detected in the window, by rule. */
  found: Readonly<Record<string, number>>;
  /** Live actions done in the window, by action. */
  done: Readonly<Record<string, number>>;
  /** Watch-mode "would have done", by action. */
  simulated: Readonly<Record<string, number>>;
  failed: Readonly<Record<string, number>>;
  undone: number;
  openIssues: number;
  /** Open issues with no action, or whose action is switched off, newest first (max 20). */
  needsPeople: readonly StoredIssue[];
}>;

const bump = (map: Record<string, number>, key: string) => {
  map[key] = (map[key] ?? 0) + 1;
};

export async function buildBrainSummary(store: BrainStore, now: Date): Promise<BrainSummary> {
  const since = new Date(now.getTime() - DAY_MS);
  const [settings, issues, actions, open] = await Promise.all([
    store.loadSettings(),
    store.issuesDetectedSince(since),
    store.actionsSince(since),
    store.openIssues(undefined, 500)
  ]);
  const found: Record<string, number> = {};
  const done: Record<string, number> = {};
  const simulated: Record<string, number> = {};
  const failed: Record<string, number> = {};
  let undone = 0;
  for (const issue of issues) bump(found, issue.ruleKey);
  for (const action of actions) {
    if (action.status === "done") bump(done, action.actionKey);
    else if (action.status === "simulated") bump(simulated, action.actionKey);
    else if (action.status === "failed") bump(failed, action.actionKey);
    else if (action.status === "undone") undone += 1;
  }
  const needsPeople = open
    .filter((issue) => !issue.recommendedAction || settings.mode !== "live" || settings.switches[issue.recommendedAction] !== true)
    .slice(0, 20);
  return { since, until: now, mode: settings.mode, found, done, simulated, failed, undone, openIssues: open.length, needsPeople };
}

export type SummaryCopy = Readonly<{
  subject: string;
  intro: string;
  modeLine: (mode: BrainMode) => string;
  foundHeading: string;
  doneHeading: string;
  simulatedHeading: string;
  failedHeading: string;
  needsHeading: string;
  none: string;
  openLine: (count: number) => string;
  ruleTitle: (ruleKey: string) => string;
  actionTitle: (actionKey: string) => string;
  closing: string;
}>;

/**
 * Optional hook for a later phase: a language model could add a short narrative. Whatever a platform
 * plugs in here MUST pass the summary through that platform's privacy filter before any outside call.
 * The engine never calls one itself.
 */
export interface BrainNarrator {
  narrate(summary: BrainSummary): Promise<string | null>;
}

export async function renderBrainSummaryText(summary: BrainSummary, copy: SummaryCopy, narrator?: BrainNarrator | null): Promise<string> {
  const block = (heading: string, counts: Readonly<Record<string, number>>, title: (key: string) => string) => {
    const lines = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => `- ${title(key)}: ${count}`);
    return `${heading}\n${lines.length > 0 ? lines.join("\n") : `- ${copy.none}`}`;
  };
  const parts = [copy.intro, copy.modeLine(summary.mode)];
  if (narrator) {
    const story = await narrator.narrate(summary).catch(() => null);
    if (story) parts.push(story);
  }
  parts.push(block(copy.foundHeading, summary.found, copy.ruleTitle));
  parts.push(block(copy.doneHeading, summary.done, copy.actionTitle));
  if (Object.keys(summary.simulated).length > 0) parts.push(block(copy.simulatedHeading, summary.simulated, copy.actionTitle));
  if (Object.keys(summary.failed).length > 0) parts.push(block(copy.failedHeading, summary.failed, copy.actionTitle));
  const needs = summary.needsPeople.map((issue) => `- ${issue.summary}`);
  parts.push(`${copy.needsHeading}\n${needs.length > 0 ? needs.join("\n") : `- ${copy.none}`}`);
  parts.push(copy.openLine(summary.openIssues));
  parts.push(copy.closing);
  return parts.join("\n\n");
}
