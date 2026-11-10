// Platform-neutral types for the brain engine. Nothing here knows about any one platform: a platform
// plugs in by giving the engine its rules, its actions, a store and a context object (see README.md).

/**
 * The master switch.
 *   off   — the kill switch: rules still find issues so staff can see them, but nothing is done or
 *           simulated on its own.
 *   watch — every recommended action is recorded as "would have done X" and nothing runs, whatever
 *           the per-action switches say. Used to measure accuracy before switching anything on.
 *   live  — an action runs on its own only when its own switch is on.
 */
export type BrainMode = "off" | "watch" | "live";
export const BRAIN_MODES: readonly BrainMode[] = ["off", "watch", "live"];
export const DEFAULT_BRAIN_MODE: BrainMode = "off";

export function isBrainMode(value: unknown): value is BrainMode {
  return value === "off" || value === "watch" || value === "live";
}

export type BrainSettings = Readonly<{
  mode: BrainMode;
  /** Per-action (and other) switches. A missing key is OFF. */
  switches: Readonly<Record<string, boolean>>;
}>;

export type IssueSeverity = "info" | "warning" | "urgent";

/** What a rule returns. The fingerprint identifies the issue: the same fingerprint is the same issue. */
export type DetectedIssue = Readonly<{
  ruleKey: string;
  fingerprint: string;
  subjectType: string;
  subjectId: string;
  severity: IssueSeverity;
  /** Plain, short description for staff. */
  summary: string;
  /** The facts the rule used (the "why"). Copied onto every action taken for this issue. */
  inputs: Readonly<Record<string, unknown>>;
  /** An action key, or null when only a person can deal with it. */
  recommendedAction: string | null;
}>;

export type IssueStatus = "open" | "resolved";

export type StoredIssue = DetectedIssue &
  Readonly<{
    id: string;
    status: IssueStatus;
    detectedAt: Date;
    lastSeenAt: Date;
    resolvedAt: Date | null;
    resolution: string | null;
  }>;

/** live = really done (by the brain or by staff); watch = only recorded as "would have done". */
export type ActionKind = "live" | "watch";

export type ActionActor = Readonly<{ type: "brain" }> | Readonly<{ type: "staff"; userId: string }>;

export type ActionStatus = "running" | "done" | "skipped" | "failed" | "simulated" | "undone";

/** Enough for the action's own undo() to reverse what it did. */
export type UndoTicket = Readonly<{ kind: string; data: Readonly<Record<string, unknown>> }>;

export type ActionOutcome = Readonly<{
  status: "done" | "skipped" | "failed";
  /** Plain words: what happened. */
  detail: string;
  undo?: UndoTicket | null;
  /** Default true: a done action closes its issue. */
  resolvesIssue?: boolean;
}>;

/** One audit row per action: what, why (rule + inputs), when, result and how to undo. */
export type StoredAction = Readonly<{
  id: string;
  issueId: string;
  actionKey: string;
  kind: ActionKind;
  actor: ActionActor;
  ruleKey: string;
  /** Why: the rule's summary at the time. */
  reason: string;
  inputs: Readonly<Record<string, unknown>>;
  status: ActionStatus;
  detail: string | null;
  undo: UndoTicket | null;
  /** How to undo, in plain words (shown even when there is no one-click undo). */
  undoHint: string;
  createdAt: Date;
  finishedAt: Date | null;
  undoneAt: Date | null;
  undoneByUserId: string | null;
}>;

export interface BrainRule<C> {
  readonly key: string;
  detect(context: C, now: Date): Promise<readonly DetectedIssue[]>;
}

export interface BrainAction<C> {
  readonly key: string;
  /**
   * Must be the literal false. Moving money (charging, settling, paying out, marking paid) always
   * stays with people; the engine refuses to register an action that says otherwise.
   */
  readonly movesMoney: false;
  /** At most this many runs per rolling 24 hours, counted separately for live and watch. */
  readonly dailyCap: number;
  /** How to undo, in plain words. */
  readonly undoHint: string;
  /** What the action would do for this issue, in plain words ("Text the worker a check-in reminder"). */
  describe(issue: StoredIssue): string;
  run(issue: StoredIssue, context: C): Promise<ActionOutcome>;
  /** Present only when the action can be reversed with one click. The staff member who asked is passed in. */
  undo?(ticket: UndoTicket, context: C, staff: Readonly<{ userId: string }>): Promise<Readonly<{ ok: boolean; detail: string }>>;
}

export type ClaimActionInput = Readonly<{
  issue: StoredIssue;
  actionKey: string;
  kind: ActionKind;
  actor: ActionActor;
  undoHint: string;
  now: Date;
}>;

export type FinishActionInput = Readonly<{
  status: Exclude<ActionStatus, "running" | "undone">;
  detail: string;
  undo: UndoTicket | null;
  now: Date;
}>;

/**
 * Persistence. A platform implements this on its own database (see the in-memory version for the
 * exact behaviour expected). Two guarantees carry the safety rules:
 *   - upsertIssue never reopens a resolved issue (same fingerprint = same issue, handled once);
 *   - claimAction returns null when (issue, action, kind) was already claimed, atomically.
 */
export interface BrainStore {
  loadSettings(): Promise<BrainSettings>;
  saveMode(mode: BrainMode, actorUserId: string | null, now: Date): Promise<void>;
  saveSwitch(key: string, enabled: boolean, actorUserId: string | null, now: Date): Promise<void>;

  upsertIssue(issue: DetectedIssue, now: Date): Promise<StoredIssue>;
  resolveIssue(issueId: string, resolution: string, now: Date): Promise<void>;
  getIssue(issueId: string): Promise<StoredIssue | null>;
  /** Open issues, newest first; only one rule's when ruleKey is given. */
  openIssues(ruleKey?: string, limit?: number): Promise<StoredIssue[]>;
  issuesDetectedSince(since: Date): Promise<StoredIssue[]>;

  claimAction(input: ClaimActionInput): Promise<StoredAction | null>;
  finishAction(actionId: string, input: FinishActionInput): Promise<StoredAction>;
  countActionsSince(actionKey: string, kind: ActionKind, since: Date): Promise<number>;
  getAction(actionId: string): Promise<StoredAction | null>;
  /** Newest first. */
  listActions(limit: number): Promise<StoredAction[]>;
  actionsSince(since: Date): Promise<StoredAction[]>;
  /** Marks a done action undone; false when it was not done or was already undone. */
  markUndone(actionId: string, actorUserId: string, detail: string, now: Date): Promise<boolean>;

  /** True the first time a marker is claimed (e.g. one summary email per day). */
  claimMarker(marker: string, now: Date): Promise<boolean>;
}

export type BrainLog = (event: string, fields?: Readonly<Record<string, unknown>>) => void;
