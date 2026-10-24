# JobLop end-to-end journey walk — findings

**Date:** 2026-10-23
**Scope:** Live walk of the full governed lifecycle against the local API + local Postgres
(`resident_job_contract_e2e`), Stripe test-only, payments OFF.
**Record used:** `JR-2026-000003`, organization "Maple Grove Care", role Personal Support Worker.

The entire chain executed: employer self-serve signup → onboarding → create request → submit →
admin review → approve-for-dispatch → dispatch → shortlist → offer → send → worker accept →
assignment → attendance check-in/out → complete → timesheet confirm/approve/lock → payroll period →
calculation → approved. Governed economics were correct (employer $30/hr, worker $24/hr, platform
margin $6/hr = 20%; worker rate set by the platform, never the employer).

Two defects were found **and fixed** (commit `620b892`): the offer-capacity bug and (surfaced
en route) a local DB schema drift that produced a 500 on submit. The two findings below were **not**
fixed — they are policy/architecture decisions that need an owner ruling.

---

## Finding 1 — The 6-hour minimum is not enforced in pay or billing

**Severity:** High (money correctness vs. an explicit, worker-facing contract term)
**Status:** Open — needs a policy decision

### What the product promises
The staffing-request form the employer must accept states, verbatim:
> Minimum 6 hours — any shift shorter than 6 hours is billed as 6 hours.
> If the worker is dismissed for any reason, the 6-hour minimum is still paid.

### What the engine actually does
- `MINIMUM_STAFFING_SHIFT_MINUTES = 360` (`packages/auth/src/index.ts`) is enforced **only** when a
  job request is created or edited — a request shorter than 6h is rejected
  (`job_request_below_minimum_shift`). It is otherwise UI copy.
- `calculateTimesheetMinutes` (`packages/auth/src/index.ts`, ~line 9872) computes
  `rawElapsedMinutes = floor((checkOutAt − checkInAt) / 60000)` and sets
  `payableMinutes = billableMinutes = rawElapsedMinutes`. **No floor is applied.**
- Payroll (`packages/auth/src/payroll.ts`) multiplies `payableMinutes` by the hourly rate directly.
- There is no invoice/billing module in `packages/auth` that re-applies a minimum downstream.

### Consequence
Whenever **actual** worked time is under 6h — early departure, early dismissal, a short attendance,
or a no-show-then-partial — the worker is paid, and the employer billed, for the exact minutes
worked, **not** the promised 6-hour minimum. The guarantee the employer accepted and the worker
relies on is not honored by the system.

### Why tests did not catch it
Timesheet/payroll suites seed realistic full-shift worked time; none asserts the sub-6h floor.

### Options (owner to decide)
1. **Apply the floor to both worker pay and employer billing.** `billable/payable = max(rawElapsed,
   360)` at timesheet calc, gated on the assignment having reached attendance (so a true no-show is
   handled by the no-show path, not the floor). Simplest; matches the literal promise.
2. **Split the policy:** always bill the employer the 6h minimum, but pay the worker per a separate
   rule for dismissal vs. worker-initiated early departure. More faithful to labor intent, more rules.
3. **Change the promise** (UI copy) if the business does not actually intend a pay/billing floor.
   Not recommended — it is a headline fairness term.

Whichever is chosen, it should be expressed once in a governed calc step with explicit handling of:
early departure (worker choice) vs. dismissal (employer) vs. no-show, and documented provenance.

---

## Finding 2 — Residence jurisdiction column mismatch breaks payroll for API-created worksites

**Severity:** High (payroll cannot run for any worksite created through the governed API)
**Status:** Open — needs a canonical-column decision

### The mismatch
- **Write path:** `POST /organizations/:id/residences` → `residenceService.createResidence` reads
  `region` + `country` from the request and stores them (the `region` column). It does **not** read
  a `province` field.
- **Read path (payroll):** `createPrismaPayrollJurisdictionResolver`
  (`apps/api/src/payrollRepository.ts`) resolves a worksite's jurisdiction from the **`province`**
  column: `if (!residence.province) return null`.

`residences` carries **both** `province` and `region` columns for the same concept, and the two
paths use different ones.

### Consequence
Any residence created via the governed API has `region` set and `province` empty, so
`jurisdictionResolver.resolve()` returns `null` and payroll fails with
`unsupported_payroll_jurisdiction:worksite:<id>`. Evidence from the walk's DB:
`province` set / `region` empty = 129 rows (seed/test data, payroll works); `region` set /
`province` empty = 1 row (the API-created worksite, payroll fails); neither = 18.

### Why tests did not catch it
Payroll suites run against seeded residences that populate `province`. No test provisions a worksite
through the residence-create API and then runs payroll against it.

### Options (owner to decide)
1. **Make `province` canonical** (it is what payroll, and likely other readers, use): have
   `createResidence` write the region value into `province` (and/or keep `region` as an alias), and
   backfill the one/any API-created rows. Lowest blast radius for payroll.
2. **Make `region` canonical:** change the payroll resolver (and any other `province` readers) to read
   `region`, backfill seed rows into `region`, and eventually drop `province`. Larger surface.
3. **Collapse the two columns** into one during a migration, with a compatibility view. Cleanest
   long-term, most work.

Note: the onboarding BFF fix in `620b892` makes the employer app send `region` + `country` (the fields
the API actually reads), so a worksite is created **with** a jurisdiction instead of none — but it
does not resolve this mismatch, so payroll still needs one of the options above.

---

## Supporting fix already landed (`620b892`)
- **Offer-capacity bug** — the operator happy-path could never issue an offer when the shortlist met
  the headcount (common single-worker case). Fixed + regression test.

## Operational note
- The local API error handler (`apps/api/src/app.ts`, `setErrorHandler`) logs unhandled errors with
  **only** a request id — no error name, message, or stack. This made the submit-500 a dig rather
  than a glance. Consider logging the error name/message (server-side only) for unhandled errors.
