# RJDS Wave 01 Validation Blocker Report

Status: Validation blocker analyzed
Scope: Infrastructure validation only
Implementation changes authorized: No
Commit status: Not created

## 1. Root Cause

The RJDS Wave 1 validation pipeline is blocked by workspace dependency state, not by an identified RJDS implementation defect.

There are two related blockers:

1. `pnpm install --offline` cannot complete because the current `packages/database/package.json` and `pnpm-lock.yaml` do not agree.
2. After attempting a non-frozen offline restore, pnpm cannot recreate the workspace dependency graph because `eslint-config-next@15.5.20` is not present in the local pnpm store.

Observed command failures:

```text
pnpm --filter @rwos/design-system typecheck
```

Failed because `vitest` types could not be resolved from the current install.

```text
pnpm exec vitest run packages/design-system/src/index.test.ts packages/ui/src/index.test.ts
```

Failed because the `vitest` executable was not available.

```text
CI=true pnpm install --offline
```

Failed because frozen lockfile validation detected that `pnpm-lock.yaml` does not match `packages/database/package.json`.

```text
CI=true pnpm install --no-frozen-lockfile --offline
```

Failed because `eslint-config-next@15.5.20` is missing from the local pnpm store and network access is restricted.

## 2. Exact Files Involved

Directly involved:

- `packages/database/package.json`
- `pnpm-lock.yaml`
- `node_modules/`
- pnpm local package store

Relevant command output identified:

- `packages/database/package.json` currently declares `@prisma/client`.
- `pnpm-lock.yaml` currently contains `@prisma/client` and `prisma` entries for `packages/database`.
- Frozen install reported a specifier mismatch and specifically identified `prisma@^7.9.0`.
- Offline non-frozen install reported missing tarball for `eslint-config-next@15.5.20`.

Wave 1 implementation files are not the root cause:

- `packages/design-system/src/index.ts`
- `packages/design-system/src/index.test.ts`
- `packages/ui/src/index.ts`
- `packages/ui/src/index.test.ts`
- `RJDS_IMPLEMENTATION_WAVE_01_REPORT.md`

## 3. Whether the Blocker Predates Wave 1

Yes.

The dependency drift was visible before Wave 1 implementation work began:

- `packages/database/package.json` was already modified.
- `pnpm-lock.yaml` was already modified.

Those files are unrelated to RJDS Wave 1 and were not included in the proposed Wave 1 commit list.

## 4. Whether Wave 1 Introduced the Blocker

No.

Wave 1 introduced design-system and UI foundation changes only. It did not intentionally modify:

- `packages/database/package.json`
- `pnpm-lock.yaml`
- dependency versions
- package manager configuration
- schema
- migrations
- APIs
- backend code

However, validation attempts did affect the local `node_modules` install state because pnpm attempted to recreate the workspace modules directory before failing. This is an environment/tooling side effect, not a committed source change.

## 5. Minimal Remediation Options

### Option A: Restore Dependency Files to the Last Committed State

Restore `packages/database/package.json` and `pnpm-lock.yaml` to the current committed baseline, then run `pnpm install`.

Benefits:

- Minimal conceptual change.
- Removes the frozen-lockfile mismatch.
- Keeps Wave 1 separate from backend dependency work.

Risks:

- May discard intentional uncommitted Prisma dependency work if those changes are owner-approved elsewhere.
- Requires owner confirmation because these files may represent separate backend progress.

ACR/DCR/GCR:

- No DCR or GCR.
- ACR may be required if the Prisma dependency changes are part of approved backend architecture and restoring them would reverse an approved implementation direction.

### Option B: Accept and Complete the Prisma Dependency Update

Update `packages/database/package.json` and `pnpm-lock.yaml` so they agree, preserving the Prisma dependency direction.

Benefits:

- Aligns package and lockfile state.
- Supports the previously approved Prisma backend direction if this drift represents intended backend foundation work.

Risks:

- This is outside RJDS Wave 1.
- It may require network access or a populated pnpm store.
- It may become a backend/tooling commit, not a design-system foundation commit.
- It may require validating Node engine compatibility for Prisma packages.

ACR/DCR/GCR:

- No DCR or GCR.
- ACR likely not required if this is already covered by the approved backend foundation/persistence decision.
- If the Prisma dependency scope differs from approved backend foundation, ACR review would be required.

### Option C: Restore the Local Dependency Cache Without Changing Source Files

Populate the pnpm store with missing dependencies such as `eslint-config-next@15.5.20`, then run install again without changing package files.

Benefits:

- Keeps source files untouched.
- Addresses the missing offline tarball blocker.

Risks:

- Does not solve the package/lockfile mismatch by itself.
- Network access is restricted in the current environment.
- Requires either temporary network access or pre-seeded pnpm store/cache.

ACR/DCR/GCR:

- No ACR, DCR, or GCR.
- Tooling/environment action only.

### Option D: Split Validation Restoration into a Dedicated Tooling Task

Open a dedicated tooling remediation task that resolves dependency consistency and local install health before Wave 1 commit approval.

Benefits:

- Preserves Wave 1 implementation integrity.
- Avoids mixing RJDS foundation changes with dependency repair.
- Produces a clean audit trail.

Risks:

- Delays Wave 1 commit.
- Requires owner decision on whether Prisma dependency drift is intentional.

ACR/DCR/GCR:

- No DCR or GCR.
- ACR only if dependency remediation changes approved backend architecture scope.

## 6. Risks of Each Option

| Option | Main risk | Governance risk |
| --- | --- | --- |
| A | Could remove intentional Prisma work | Possible ACR concern if backend approval depends on it |
| B | Mixes tooling/backend dependency work near RJDS Wave 1 | Must not be committed with Wave 1 |
| C | Requires cache/network support and does not fix mismatch alone | Low governance risk |
| D | Adds a separate step before commit | Lowest governance risk |

## 7. Recommended Option

Recommended path: Option D, with owner decision on Option A or Option B inside that tooling task.

Suggested sequence:

1. Confirm whether the current `packages/database/package.json` and `pnpm-lock.yaml` Prisma changes are intentional and approved.
2. If not intentional, restore both files to the committed baseline.
3. If intentional, complete a separate tooling/backend dependency alignment task so package and lockfile agree.
4. Restore the pnpm install using network access or a pre-seeded pnpm store.
5. Rerun Wave 1 validation.
6. Only after validation passes, request commit approval for Wave 1.

This keeps RJDS Wave 1 clean and avoids mixing design-system implementation with dependency repair.

## 8. Whether Any ACR, DCR, or GCR Is Required

For this validation blocker analysis:

- ACR required: No
- DCR required: No
- GCR required: No

For remediation:

- DCR required: No
- GCR required: No
- ACR required: Only if the dependency remediation changes approved backend architecture scope or reverses owner-approved Prisma foundation work.

## 9. Whether the Fix Affects Implementation or Only Tooling

The immediate blocker is tooling/environmental:

- dependency installation
- lockfile/package consistency
- local pnpm store/cache health
- test runner availability
- TypeScript/ESLint executable availability

It does not require changes to RJDS Wave 1 implementation logic.

The Prisma dependency mismatch may be connected to backend implementation planning, but it is not part of the RJDS Wave 1 foundation implementation.

## Final Status

```text
VALIDATION BLOCKER ANALYZED

Root cause:
Workspace dependency install and lockfile/package mismatch.

Predates Wave 1:
YES

Introduced by Wave 1:
NO

Recommended remediation:
Dedicated tooling dependency alignment task before Wave 1 commit.

ACR required:
NO for analysis
ONLY POSSIBLE for remediation if backend architecture scope changes

DCR required:
NO

GCR required:
NO

Commit:
NOT CREATED

Push:
NOT PERFORMED

Merge:
NOT PERFORMED

Deployment:
NOT PERFORMED

Awaiting owner decision on the tooling remediation path.
```
