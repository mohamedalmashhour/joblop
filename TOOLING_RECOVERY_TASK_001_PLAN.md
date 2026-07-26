# Tooling Recovery Task 001 Plan

Status: Analysis complete
Repair status: Not started
Scope: Tooling and dependency recovery only
Commit status: Not created

## 1. Baseline State

Current branch:

```text
foundation/repository-foundation
```

Current HEAD:

```text
3f50db5
```

Runtime:

```text
Node.js: v20.20.2
pnpm: 10.33.2
pnpm store: /Users/mohamedalmashhour/Documents/Codex/.pnpm-store/v10
```

Current working-tree status includes:

```text
M  packages/database/package.json
M  packages/design-system/src/index.test.ts
M  packages/design-system/src/index.ts
M  packages/ui/src/index.ts
M  pnpm-lock.yaml
?? RJDS_IMPLEMENTATION_WAVE_01_REPORT.md
?? RJDS_WAVE_01_VALIDATION_BLOCKER_REPORT.md
?? packages/ui/src/index.test.ts
```

There are also existing untracked Resident Job architecture/governance documents under:

```text
docs/architecture/resident-job-platform/**
```

Existing RJDS Wave 1 changed files:

- `packages/design-system/src/index.ts`
- `packages/design-system/src/index.test.ts`
- `packages/ui/src/index.ts`
- `packages/ui/src/index.test.ts`
- `RJDS_IMPLEMENTATION_WAVE_01_REPORT.md`

Unrelated dirty dependency files:

- `packages/database/package.json`
- `pnpm-lock.yaml`

## 2. Root Cause

The validation environment is broken because the workspace dependency installation cannot be restored reproducibly in the current state.

There are two direct causes:

1. `packages/database/package.json` and `pnpm-lock.yaml` are inconsistent.
2. Required packages are missing from the local pnpm store, and network access is required to recreate the install.

The package/lockfile mismatch blocks frozen installs. The missing local store packages block offline installs.

## 3. Evidence

Committed `packages/database/package.json` at `HEAD` declares only:

```text
@rwos/config
```

Current working-tree `packages/database/package.json` declares:

```text
@prisma/client
@rwos/config
```

Current `pnpm-lock.yaml` has `packages/database` entries for:

```text
@prisma/client
@rwos/config
prisma
```

The lockfile contains package records for Prisma 7.9.0 and related dependencies. This dependency drift predates the current tooling recovery plan and is unrelated to RJDS Wave 1.

Failed command evidence:

```text
CI=true pnpm install --offline
```

reported:

```text
Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date with <ROOT>/packages/database/package.json
```

and identified a mismatch involving:

```text
prisma@^7.9.0
```

Failed command:

```text
CI=true pnpm install --no-frozen-lockfile --offline
```

reported:

```text
ERR_PNPM_NO_OFFLINE_TARBALL
eslint-config-next-15.5.20.tgz
```

Local store inspection found no visible cached paths for:

```text
eslint-config-next
vitest
```

Current `node_modules` is incomplete and contains only:

```text
node_modules
node_modules/.vite
node_modules/.vite/vitest
```

No root `node_modules/.bin` exists, so `tsc`, `eslint`, and `vitest` are unavailable from the workspace install.

## 4. Files Involved

Directly involved:

- `packages/database/package.json`
- `pnpm-lock.yaml`
- `node_modules/`
- local pnpm store at `/Users/mohamedalmashhour/Documents/Codex/.pnpm-store/v10`

Potentially involved if using a reproducible install repair:

- root `package.json`
- `pnpm-workspace.yaml`
- package manager metadata

No evidence currently requires changes to:

- application source
- RJDS implementation files
- UI components created in Wave 1
- architecture documents
- approved wireframes
- design-system specification documents
- governance documents
- APIs
- database schema
- migrations
- permissions
- state machines
- business rules
- financial logic
- AI authority

## 5. Minimal Repair

Recommended minimal repair:

1. Confirm the uncommitted Prisma dependency drift is not part of the approved current task.
2. Restore only dependency consistency by returning `packages/database/package.json` and `pnpm-lock.yaml` to a mutually consistent state.
3. Recreate `node_modules` with a normal `pnpm install` using network access, because the local store does not contain all required packages.
4. Run the approved validation commands.
5. Keep the tooling recovery commit separate from RJDS Wave 1.

Recommended file changes before install:

- `packages/database/package.json`
- `pnpm-lock.yaml`

Exact proposed change:

- Return `packages/database/package.json` to the committed baseline for this tooling recovery task unless the owner confirms the Prisma dependency drift is intentional and approved.
- Return `pnpm-lock.yaml` to a state consistent with the chosen `packages/database/package.json`.

Why each change is necessary:

- `packages/database/package.json` and `pnpm-lock.yaml` must agree before frozen or reproducible installs can pass.
- `pnpm-lock.yaml` must match workspace manifests before validation can be trusted.

Lockfile regeneration required:

- If restoring to the committed baseline, lockfile regeneration should not be necessary; restoring the lockfile to the committed baseline is sufficient.
- If preserving Prisma dependency drift, lockfile regeneration or lockfile correction is required.

Network required:

- Yes, unless the pnpm store is pre-seeded with every required package.
- The current local pnpm store does not contain at least `eslint-config-next@15.5.20`.

## 6. Alternative Repair Options

### Option A: Restore Dependency Files to Committed Baseline

Change:

- Restore `packages/database/package.json` to `HEAD`.
- Restore `pnpm-lock.yaml` to `HEAD`.
- Run `pnpm install` with network access.

Benefits:

- Cleanest separation from RJDS Wave 1.
- Removes unrelated Prisma drift from the validation path.
- Does not require deciding backend foundation scope inside a design-system implementation wave.

Risks:

- Could discard intentional uncommitted Prisma dependency work.

Governance classification:

- Standard Engineering Process if the Prisma drift is not approved current work.
- ACR only if restoring these files reverses approved backend architecture implementation.

### Option B: Preserve and Complete Prisma Dependency Alignment

Change:

- Add or confirm required Prisma manifest entries.
- Regenerate or correct `pnpm-lock.yaml`.
- Run `pnpm install` with network access.

Benefits:

- Preserves intended backend dependency direction if the Prisma changes are approved.

Risks:

- Mixes backend dependency alignment with RJDS validation recovery unless handled as a separate tooling/backend task.
- May require broader dependency review.
- Must not be committed together with RJDS Wave 1.

Governance classification:

- Standard Engineering Process only if already covered by approved backend foundation decisions.
- ACR if this expands backend/database architecture scope.

### Option C: Pre-Seed Local pnpm Store

Change:

- Populate the pnpm store with missing packages.
- Run offline install after resolving package/lockfile consistency.

Benefits:

- Supports offline validation later.

Risks:

- Does not solve manifest/lock mismatch by itself.
- Requires external package acquisition outside current sandbox constraints.

Governance classification:

- Standard Engineering Process tooling maintenance.

## 7. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Restoring package files removes intentional Prisma work | Backend work may need reapplication | Owner confirms whether Prisma drift is approved |
| Preserving Prisma drift expands scope | RJDS Wave 1 could mix with backend setup | Separate tooling/backend commit from Wave 1 |
| Network remains unavailable | Install cannot be restored | Owner provides network-approved install path or pre-seeded store |
| Lockfile regenerated broadly | Large unrelated dependency churn | Prefer restoring to committed baseline if Prisma drift is not approved |
| Tests remain blocked after install | Wave 1 still cannot be committed | Report next concrete blocker without changing Wave 1 |

## 8. Rollback Procedure

If owner approves Option A:

1. Restore `packages/database/package.json` to `HEAD`.
2. Restore `pnpm-lock.yaml` to `HEAD`.
3. Run `pnpm install` with network access.
4. If install fails, stop and report the exact failure.

Rollback:

- Revert only the tooling recovery changes.
- Do not touch RJDS Wave 1 files.

If owner approves Option B:

1. Apply the approved Prisma/package manifest alignment.
2. Regenerate or correct the lockfile.
3. Run `pnpm install` with network access.
4. If install fails, stop and report the exact failure.

Rollback:

- Revert only the tooling/backend dependency alignment commit.
- Do not touch RJDS Wave 1 files.

## 9. Reproducibility Procedure

After owner-approved repair:

```text
pnpm install
pnpm --filter @rwos/design-system typecheck
pnpm --filter @rwos/ui typecheck
pnpm test
pnpm build
git diff --check
```

Additional validation expected before claiming Wave 1 complete:

- lint runner operational
- test runner operational
- build runner operational
- accessibility validation path operational
- responsive validation path operational

## 10. Network Requirement

Network required: Yes.

Reason:

- The local pnpm store does not visibly contain `eslint-config-next@15.5.20`.
- The local pnpm store does not visibly contain `vitest`.
- Current `node_modules` is incomplete and lacks `node_modules/.bin`.

Network can be avoided only if the required packages are pre-seeded into:

```text
/Users/mohamedalmashhour/Documents/Codex/.pnpm-store/v10
```

## 11. Lockfile Impact

Lockfile change required: Yes, unless the owner approves restoring `pnpm-lock.yaml` to the current committed baseline.

Preferred lockfile impact:

- Restore `pnpm-lock.yaml` to `HEAD` if Prisma drift is not intentional.

Alternative lockfile impact:

- Regenerate/correct `pnpm-lock.yaml` to preserve Prisma dependencies if owner confirms those are intentional and approved.

## 12. Expected Validation Commands

After approved repair:

```text
pnpm install
pnpm --filter @rwos/design-system typecheck
pnpm --filter @rwos/ui typecheck
pnpm --filter @rwos/design-system build
pnpm --filter @rwos/ui build
pnpm test
pnpm build
git diff --check
```

If the repository has dedicated accessibility or responsive validation commands after dependency restoration, run them as part of the RJDS Wave 1 validation pass.

## 13. ACR / DCR / GCR Determination

For this plan:

- ACR required: No
- DCR required: No
- GCR required: No

For the repair:

- ACR required: No if restoring tooling consistency without changing backend architecture.
- ACR required: Possible if preserving or changing Prisma dependency scope affects approved backend/database architecture.
- DCR required: No
- GCR required: No

## 14. Proposed Commit Boundary

Tooling recovery commit must be separate from RJDS Wave 1.

Proposed tooling commit includes only the owner-approved dependency repair files, likely:

- `packages/database/package.json`
- `pnpm-lock.yaml`

Do not include:

- `packages/design-system/src/index.ts`
- `packages/design-system/src/index.test.ts`
- `packages/ui/src/index.ts`
- `packages/ui/src/index.test.ts`
- `RJDS_IMPLEMENTATION_WAVE_01_REPORT.md`
- product source files
- architecture documents
- governance documents

Proposed commit message after repair approval:

```text
chore(tooling): restore validation dependency environment
```

## 15. RJDS Wave 1 Implementation Remains Untouched

Confirmed.

This plan does not modify:

- Wave 1 implementation files.
- RJDS documents.
- application source.
- UI pages.
- architecture.
- workflows.
- governance.

RJDS Wave 1 remains complete but uncommitted pending validation restoration and owner commit approval.

## Final Status

```text
TOOLING RECOVERY TASK 001

Analysis:
COMPLETE

Repair:
NOT STARTED

Proposed files:
packages/database/package.json
pnpm-lock.yaml

Network required:
YES

Lockfile change required:
YES

ACR required:
NO

DCR required:
NO

GCR required:
NO

RJDS Wave 1 implementation:
UNTOUCHED

Commit:
NOT CREATED

Push:
NOT PERFORMED

Merge:
NOT PERFORMED

Deployment:
NOT PERFORMED

Awaiting owner approval for the minimal repair.
```
