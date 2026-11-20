# @rwos/brain

A platform-neutral operations brain. Deterministic **rules** find issues; **actions** fix them,
each behind its own switch. The engine owns everything that keeps that safe, so a platform only
writes its own rules, actions and adapters.

The engine owns:

- the rule and action interfaces (`BrainRule`, `BrainAction`)
- the master mode and per-action switches (`BrainStore.loadSettings`)
- the kill switch (mode `off`) and watch mode (`watch`)
- daily caps (rolling 24 hours, per action, counted separately for live and watch)
- once-only handling (same fingerprint = same issue; one claim per issue, action and kind)
- the audit log (`StoredAction`: what, why, when, result, how to undo)
- sweep orchestration (`createBrain(...).sweep()`), staff "Do it", close and undo
- the daily summary (`buildBrainSummary`, `renderBrainSummaryText`)

It imports nothing from any platform.

## Modes

| Mode    | Rules run | Actions                                                          |
| ------- | --------- | ---------------------------------------------------------------- |
| `off`   | yes       | none (kill switch). This is the default.                         |
| `watch` | yes       | every recommended action is logged as "Would have: …", none run  |
| `live`  | yes       | an action runs only when its own switch is on. All start off.    |

Staff can always press "Do it" on an open issue: a person decides, so switches and caps do not
apply, but the once-only claim does. One exception: when the earlier run did not get it done
(`skipped` or `failed`, e.g. no phone number), "Do it" retries it once (`reopenAction`), and the daily
summary lists such an issue under "needs a person".

## Plugging in another platform

1. **Store.** Implement `BrainStore` on your database. Use `createMemoryBrainStore()` as the
   reference behaviour. Two things are required: `upsertIssue` must never reopen a resolved issue,
   and `claimAction` must return `null` (atomically, e.g. a unique key) when the same
   `(issue, action, kind)` was already claimed (`reopenAction` turns only a skipped or failed row
   back to running, atomically). Joblop's Postgres version is
   `apps/api/src/brain/prismaBrainStore.ts` with the tables in migration
   `20261114000000_joblop_brain`.
2. **Context.** Define a context type holding your adapters, for example
   `{ data: YourReadAdapter; effects: YourEffectsAdapter }`. Rules read through `data`; actions
   act through `effects` (your email, SMS, clock and domain flows). Keep the adapters small, so
   rules and actions can be tested with fakes.
3. **Rules.** Each rule has a `key` and `detect(context, now)` that returns `DetectedIssue`s. Give
   each issue a stable `fingerprint` (for example `rule:subjectId:startAt`), a plain `summary`,
   the `inputs` it used (copied into the audit log), and a `recommendedAction` key or `null` when a
   person must handle it.
4. **Actions.** Each action has a `key` (also its switch name), `movesMoney: false` (the engine
   refuses anything else), a `dailyCap`, a plain `undoHint`, `describe(issue)` for watch mode, and
   `run(issue, context)`. Add `undo(ticket, context, staff)` only when one click can reverse it,
   and return the matching `undo` ticket from `run`. Run your platform's own validated domain
   functions, never shortcuts around them.
5. **Wire it.**

   ```ts
   const brain = createBrain({ store, rules, actions, context, extraSwitches: ["daily_summary_email"] });
   await brain.sweep(); // from a cron route protected by a shared secret
   ```

   Expose `brain.setMode`, `brain.setSwitch`, `brain.doNow`, `brain.dismiss` and `brain.undo` to
   staff only. Send `renderBrainSummaryText(await buildBrainSummary(store, now), copy)` once a day
   (use `store.claimMarker` so it goes out once).

## Outside AI

Phase 1 is fully deterministic. `renderBrainSummaryText` accepts an optional `BrainNarrator` for a
later language-model narrative or draft; whatever is plugged in there must pass the platform's
privacy filter before any outside call. The engine never calls one itself.

## Phase 2: a person-confirmed assistant on top

A platform may add an AI assistant whose actions a signed-in person confirms (Joblop:
`apps/api/src/assistant/`). It reuses this package without changing the engine: its switches are
`extraSwitches`, each proposal is stored as an issue (resolved at once, so it is never an open
problem) and each Confirm or Cancel is an action on that issue with actor `{ type: "user" }` (or
`staff`). The unique `(issue, action, kind)` claim makes every proposal usable once.

## Hard limits

Moving money (charging, settling, payouts, marking paid) and legal entitlement decisions stay with
people. The engine rejects actions that do not declare `movesMoney: false`; platforms must not
register actions that do those things.
