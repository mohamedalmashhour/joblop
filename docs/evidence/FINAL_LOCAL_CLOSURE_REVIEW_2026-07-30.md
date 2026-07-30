# Final Local Closure Review

Status: **LOCAL READY — EXTERNAL STAGING EVIDENCE REQUIRED**

Base checkpoint: `f3948579631e1f639c46ba80c0b7f66c94887146`

## Durable financial write capability

| Capability | API and persistence | Authorization/invariants | Local evidence |
| --- | --- | --- | --- |
| Invoice create | Authenticated organization-scoped POST; Prisma transaction creates a draft only from matching locked timesheet/version | `finance_reviewer`/`platform_admin`, source organization check, idempotency digest | Route, repository, rollback and PostgreSQL tests |
| Invoice approve/issue/view/overdue/dispute/void | Authenticated named transition endpoints; optimistic version update and append-only audit | State machine and action-role matrix; issue requires organization numbering; dispute/void require reason | Route/repository transition tests |
| Invoice send | Fake delivery POST creates digest-bound receipt and atomically moves issued → sent | Issued-only, scoped authorization, idempotency, version conflict | Delivery route/repository tests |
| Credit notes | Create, approve, reject, issue and bilingual PDF endpoints | Issued invoice, eligible-balance ceiling, action roles, optimistic version and audit | Route/repository/PDF tests |
| Payments | Method, attempt, authorize, capture, void, refund, signed local webhook, status, audit and reconciliation APIs | Issued invoice, exact organization/currency/amount limits, idempotency, replay, concurrency and state machine | Route/repository/provider tests |

Invoice issuance remains separate from collection. Generic invoice transitions do not mark payment
success or refund; those states originate in the payment/reconciliation boundary. Real providers
and production issuer/tax configuration remain disabled.

## Authenticated local workflow evidence

Synthetic route tests exercise Employer/Admin authorization through organization-scoped sessions
and verify indistinguishable denial. Employer/Admin BFF tests verify minimum-necessary durable
finance projections. Production-build browser checks verify navigation and fail-closed
authentication UX, but do **not** substitute for staging identity, email or provider evidence.

## The 39 governed inventory controls

All 39 are runtime-destination links, not dormant financial write actions. They remain classified
`governed` because static inventory cannot prove a destination computed from runtime state.

| Group (count) | Exact source locations | Decision and owner | Evidence required to classify working |
| --- | --- | --- | --- |
| Admin shell pagination/navigation (4) | `AdminShell.tsx`: 58, 96, 116, 132 | Route owner confirms runtime page bounds | E2E destination, Back/Next boundary and no-404 evidence |
| Admin request/dispatch navigation (5) | `AdminCalendarPanel.tsx`:81; `calendar/assignment/page.tsx`:17; `DispatchHandoffPanel.tsx`:138; `PersistedDispatchPanel.tsx`:70; `app/page.tsx`:206 | Admin workflow owner confirms persisted IDs and permitted destination | Authenticated synthetic request/dispatch E2E plus wrong-role denial |
| Admin Phase-01 pagination (1) | `phase-01-review/page.tsx`:47 | Review workflow owner confirms page bounds | Authenticated pagination boundary evidence |
| Admin maps (3) | `shared/maps/JobLocationMap.tsx`:58,73,81 | Privacy/Security owner approves external-map/deep-link policy | Staging browser evidence with synthetic approximate location |
| Employer contact/demo links (2) | `contact/page.tsx`:71; `app/page.tsx`:311 | Product/Legal owner supplies approved destination/contact policy | Approved destination plus no real-message staging test |
| Employer attendance/timesheet continuation (2) | `AttendanceStatePage.tsx`:40; `TimesheetReviewPanel.tsx`:92 | Operations owner confirms state-dependent next route | Authenticated assignment→attendance→timesheet E2E |
| Employer calendar/request workflow (10) | `ClientCalendarPanel.tsx`:122,129,278; `CreatePersistedRequestPanel.tsx`:318,325,447; `ClientRequestDetailPanel.tsx`:156,167; `EditPersistedRequestPanel.tsx`:273; `dashboard/page.tsx`:44 | Staffing workflow owner confirms IDs/state transitions | Authenticated create/edit/detail/progress E2E, retry and isolation evidence |
| Employer dashboard/report runtime links (2) | `dashboard/page.tsx`:136; `reports/page.tsx`:33 | Employer product owner confirms source record routes | Synthetic report/source E2E and unavailable-record denial |
| Employer shell pagination/navigation (5) | `EmployerShell.tsx`:64,148,168,184,214 | Route owner confirms runtime page bounds | E2E destination, Back/Next boundary and no-404 evidence |
| Employer landing dynamic CTAs (2) | `app/page.tsx`:81,96 | Product/Auth owner confirms role and registration state | Registration-disabled and approved-enabled staging vectors |
| Employer maps (3) | `shared/maps/JobLocationMap.tsx`:58,80,88 | Privacy/Security owner approves external-map/deep-link policy | Staging browser evidence with synthetic approximate location |
| **Total (39)** | Machine source: `LOCAL_CONTROL_INVENTORY_2026-07-30.json` | No activation inferred | Each dynamic destination needs authenticated staging evidence |

## Decisions and external handoff

- D1–D9 selectable form: `docs/decisions/D1_D9_OWNER_DECISION_FORM_2026-07-30.md`.
- Legal review requirements: `docs/legal/DRAFT_TERMS_PRIVACY_REQUIREMENTS_2026-07-30.md`.
- Exact inputs and sequence: `docs/runbooks/EXACT_STAGING_INPUT_CHECKLIST_2026-07-30.md`.

No draft, unchecked box or repository commit is approval. Classification stays **LOCAL READY**
until authenticated staging E2E, external PostgreSQL, identity, email, Stripe test, monitoring,
backup/PITR and rollback evidence all succeed.
