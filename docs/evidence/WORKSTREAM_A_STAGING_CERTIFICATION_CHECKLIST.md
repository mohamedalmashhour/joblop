# Workstream A — Staging Browser Certification Checklist

**Preparation only. This document does NOT deploy anything and contains NO secrets.** It is the
operator/owner checklist to provision and run the authoritative staging browser-E2E suite
(`tests/e2e/playwright.config.mjs`). The staging suite — not the local harness
(`docs/runbooks/LOCAL_BROWSER_E2E.md`) — is the final certification path.

**Separation from production:** staging certification is explicitly NOT a production launch. The
qa-reset service refuses to run unless `RWOS_ENV=staging` (never `production`); production launch is
Workstream H and is out of scope here.

## Code-side status
- Worker sign-in E2E path fix: **valid** (staging spec watches the real `/api/session/sign-in`).
- Local disposable harness cannot leak into staging: `assertLocalE2eEnabled` now rejects any env
  except `local`/`test` (staging + production throw `LOCAL_E2E_ONLY_LOCAL_OR_TEST`).
- Local lenient auth rate limiter cannot activate in staging/production: gated on
  `rwosEnv ∈ {local,test}` AND `RWOS_LOCAL_E2E=enabled`; production uses the remote limiter, staging
  uses the normal memory limiter.
- Staging environment policy is intact: it still requires remote HTTPS and rejects localhost
  (asserted by `tests/e2e/local/seed.test.ts` + `tests/e2e/e2e-environment-policy.test.ts`).
- Dry-run `node --import tsx scripts/validate-browser-e2e-inputs.ts` on an empty env lists only
  missing inputs (`BROWSER_E2E_INPUT_ERROR: …`) — **no code defect**, inputs-only.

## Validation command (operator, once provisioned)
```bash
# 1) input policy gate
node --import tsx scripts/validate-browser-e2e-inputs.ts        # expect BROWSER_E2E_INPUT_PASS
# 2) materialize synthetic fixture (in-VPC credential-bootstrap job sets passwords between these)
pnpm e2e:browser:prepare
# 3) run the authoritative browser suite
pnpm test:e2e:browser                                           # chromium+firefox+webkit
# 4) retire the fixture
pnpm e2e:browser:cleanup
```
**Expected success criteria:** `BROWSER_E2E_INPUT_PASS`, prepare returns a receipt, all staging
browser specs pass on the supported browser matrix, cleanup retires the fixture.

## Required inputs (all from `tests/e2e/e2e-environment-policy.ts` + qa-reset)
Provisioning owner: **Release Owner + Security Reviewer** (per roadmap Workstream A). No value is
committed; all are supplied at run time by the operator/CI secret store.

| Requirement | Source | Required value/type | Present? | How to provision | Safety constraint |
|---|---|---|---|---|---|
| RWOS_RELEASE_SHA | policy | full lowercase 40-hex git SHA | ❌ | the immutable staging release SHA | must match deployed image |
| RWOS_E2E_CONFIRMATION | policy | `authorized-staging-browser-e2e` | ❌ | fixed literal | authorizes the run |
| RWOS_E2E_{EMPLOYER,ADMIN,WORKER}_ORIGIN | policy | remote HTTPS URL (no localhost) | ❌ | deployed staging app origins | HTTPS only, valid TLS |
| RWOS_E2E_RESET_ORIGIN | policy | remote HTTPS URL | ❌ | deployed qa-reset service origin | HTTPS only |
| RWOS_E2E_{EMPLOYER,ADMIN,WORKER,REVOKED}_{EMAIL,PASSWORD} | policy | synthetic creds | ❌ | synthetic staging identities (passwords set by in-VPC bootstrap) | synthetic only, no real PII |
| RWOS_E2E_RESET_TOKEN | policy | bearer token | ❌ | provisioned qa-reset bearer | secret store only |
| RWOS_E2E_RESET_APP_CREDENTIAL | policy | bearer app credential | ❌ | provisioned app credential | secret store only |
| RWOS_E2E_RESET_SERVICE_IDENTITY | policy | `browser-e2e` | ❌ | fixed literal | — |
| RWOS_E2E_RESET_OPERATOR_IDENTITY | policy | immutable provider-qualified id | ❌ | operator identity | immutable-external-identity format |
| RWOS_E2E_RESET_{PROJECT,CLUSTER,DATABASE,AUTHORITY}_ID | policy | immutable provider-qualified ids | ❌ | cloud resource identities | immutable-external-identity format |
| RWOS_E2E_RESET_NAMESPACE | policy | `rwos:qa-reset:staging:v1` | ❌ | fixed literal | — |
| RWOS_E2E_RESET_MANIFEST_ID | policy | immutable id | ❌ | signed manifest id | — |
| RWOS_E2E_RESET_MANIFEST_CHECKSUM | policy | SHA-256 (`^[a-f0-9]{64}$`) | ❌ | manifest checksum | integrity gate |
| RWOS_E2E_RESET_{DRY_RUN,PREPARE,CLEANUP}_APPROVAL_REFERENCE | policy | immutable approval refs | ❌ | approval workflow references | audit trail |
| RWOS_E2E_TENANT_A_ID / RWOS_E2E_TENANT_B_ID | policy | two distinct tenant ids | ❌ | synthetic staging tenants | must differ |
| qa-reset: RWOS_ENV | qa-reset config | `staging` | ❌ | staging deploy env | never `production` |
| qa-reset: QA_RESET_PERSISTENCE_MODE | qa-reset config | `postgres` | ❌ | staging deploy env | Postgres-backed |
| qa-reset: QA_RESET_RELEASE_SHA / RWOS_IMAGE_RELEASE_SHA | qa-reset config | matching 40-hex SHAs | ❌ | staging release/image | must match |
| qa-reset: QA_RESET_MANIFEST_CREATED_AT / _EXPIRES_AT | qa-reset config | valid, non-expired timestamps | ❌ | signed manifest window | non-expired |
| in-VPC credential-bootstrap job | reset-cli | sets synthetic sign-in passwords | ❌ | run between prepare and sign-in | staging-only job |

Every row is currently **❌ (not provisioned in this environment)** — none is a code defect.

## Remaining provisioning blockers (owner action)
Deployed staging apps (3) at HTTPS origins + a deployed staging qa-reset service on Postgres + all
inputs above (secrets via the secret store) + the in-VPC bootstrap job. Provisioning is an
owner/operator responsibility; this gate does not create any of it.
