# JobLop — Local Launch Packaging & Release-Candidate Report

> **MARKET VERDICT SUPERSEDED.** This document certifies the **Canada-modeled technical** readiness
> of `43bc784`. Per the owner's market decision (Syria-only, country-neutral master +
> `countries/<country>`), the **market** GO/NO-GO is now governed by
> `JOBLOP_COUNTRY_ARCHITECTURE_AUDIT_AND_MIGRATION_PLAN.md` → **Syria launch = NO-GO** (sanctions/
> provider/legal/currency/language/data-region unresolved). The technical facts below stand; the
> "CONDITIONAL GO for staging" applies only to the Canada-modeled build, not to a Syria launch.

**Candidate (deployable code SHA):** `43bc784ddd094f19427a8c847d6946d29858fd9f` (`43bc784`).
**Scope:** every credential-free local/repo launch task. **No GCP access, no Terraform apply, no
image push, no deploy, no production, no SYBNB.** GCP identity `info@sybnb.app` deliberately NOT
used (pending owner identity confirmation).

---

## 1. Validation reconfirmation — PASS
Authoritative: **Foundation Validation run `31763316417` on `43bc784` — all jobs green** (full
`pnpm validate`, dependency-audit, all 8 container images, all terraform-validate). Locally
reconfirmed this pass:

| Check | Result |
|---|---|
| `validate:env` | ENV_VALIDATION_PASS |
| `validate:boundaries` | WORKSPACE_BOUNDARY_VALIDATION_PASS |
| `validate:migrations` | MIGRATION_INTEGRITY_VALIDATION_PASS (35 migrations) |
| `scan:secrets` | SECRET_SCAN_PASS |
| `audit:dependencies` | 2 high, **2 ignored** (documented image-size, dev/mobile-only) → exit 0 |
| `terraform validate` (state-bootstrap / bootstrap / runtime, `-backend=false`) | valid, no errors |
| full `pnpm validate` (lint/typecheck/test 1589/build) | green in CI + previously green locally |

## 2. Immutable local image artifacts (built, NOT pushed) — digests tied to `43bc784`
Built locally with `--build-arg RWOS_GIT_SHA=43bc784…` from the committed Dockerfiles
(`container-build-matrix.json`). These are local artifacts only; the authoritative **registry**
digests are produced solely by the owner-gated publish workflow.

| Service | Local image config digest |
|---|---|
| api | `sha256:58a15b71f6864680a412cd5afb0870bbf8bb3b653fd3b5758e4e63b18fd6c934` |
| employer | `sha256:f1d57b72cc47d9955f11c1028b5ff8e62c63f4079b3eadbff38f70cc7b9565fc` |
| admin | `sha256:7ae493561eba02901a467c1dcfda94788696eac9ab531fb22b7668ec9d0c6d61` |
| worker | `sha256:9b6bea8ddbcd5f8188b8a9d1fe46162d56d30f3783e197f8951799633516d252` |
| auth-limiter | `sha256:e28bc56b794e5d82c44c9f6feba081fd082233c20301df1c265ba58b081da014` |
| candidate-source | `sha256:1df191edeabb295c97f8fd23ca5a2b7f372dddbb187ef020902634c358e9ab6e` |
| offer-delivery | `sha256:5a396b05f687dfd983d7b2340ba0c5c9259969c2e36b151893c187db361d1985` |
| qa-reset | `sha256:d4a76b77be80afb9e4a71f72f85d37b611e7ea49c3c01ecaad15236d111f8bd5` |

All 8 build cleanly and are digest-stable for the candidate. (Local build IDs are host-specific;
they attest buildability + reproducibility, not the registry digests used to deploy.)

## 3. Production-config / fail-closed / operational audit — PASS
`packages/config/src/index.ts` (zod schema + `superRefine`) enforces fail-closed boundaries:
- **Money is test/local-only, never live.** Stripe is test-mode only (allowed only in test/staging;
  keys must start `sk_test_`/`whsec_`; approved account ref required). `LOCAL_PAYMENT_ENABLED` is
  rejected outside local/test. No live-payment code path is reachable in production.
- **No local-disk KYC/documents in production.** `DOCUMENT_LOCAL_UPLOAD_ENABLED` is rejected unless
  `RWOS_ENV ∈ {local,test}`, and even then requires a durable DB + private storage root + signing
  secret. Production must use a real object-storage provider (owner/infra to configure).
- **Staging/production require paired HTTPS integrations** (candidate-source/offer-delivery origins
  + tokens) — fail-closed if a URL/token is missing or non-HTTPS.
- **Health/readiness:** api exposes `/health` + `/ready`; auth-limiter, candidate-source,
  offer-delivery, qa-reset each serve health; qa-reset has an explicit fail-closed server.
- **Graceful shutdown:** api handles `SIGTERM`/`SIGINT` → `app.close()` (clean connection drain).
- **DB compatibility:** PostgreSQL 16/17; 35 governed migrations, integrity-validated; Prisma pg
  driver adapter.
- **Auth rate limiter namespace** is pinned to `rwos:authrl:<env>:v1` (env-consistent).

Verdict: **PASS** — production activation still requires the owner to provision real secrets +
object storage (enumerated in the owner checklist), but the code fails closed until they exist.

## 6. SYBNB isolation — PASS
Repo-wide scan: SYBNB is referenced **only** in two planning markdown docs
(`RESIDENT_JOB_HR_MONEY_LAYER_DISCOVERY_PLAN.md`,
`RESIDENT_JOB_SHARED_MONEY_CONTRACT_TRACEABILITY_MATRIX.md`), and every mention **affirms**
isolation ("no SYBNB repo access", "keep boundaries separate", "does not access the SYBNB
repository"). **No SYBNB credential, account, secret, resource, or configuration is required or
referenced** by any JobLop code, config, Dockerfile, workflow, or Terraform.

## 7. Remaining launch risks — audit
| Risk | Status | Note |
|---|---|---|
| `image-size` GHSA-w3rx-r6r6-pgpr / GHSA-5p2g-fcmc-qvqq | ACCEPTED (documented) | No patched version exists; reaches only `apps/mobile>expo>metro` (dev/mobile build toolchain), not deployed web services. Re-check when Expo/metro ships a fix. |
| Reviewed destructive migrations (payroll_rate_snapshots, payroll_corrections) | ACCEPTED | `ALTER COLUMN … DROP DEFAULT` only (backfill→drop-default); no data loss. Recorded in `reviewedDestructiveMigrations`. |
| Production object storage (KYC/documents) | BLOCKED (owner/infra) | Must be provisioned; code fails closed until then. |
| Monitoring / alerting | NEEDS INFRA | Staging GCP has monitoring/alert + log sink (per prior inventory); production coverage owner-defined. |
| Backups / restore / PITR | NEEDS INFRA/PROOF | Cloud SQL exists; PITR + restore drill not yet witnessed (runbook in JOBLOP_STAGING_RUNBOOKS.md). |
| DNS / TLS | NEEDS OWNER | `*.staging.sybnb.app` DNS + managed cert exist (prior inventory); production DNS is a public-cutover step. |
| Access controls | PASS (code) | Role resolver (platform grants / memberships / worker identity); payroll authority-gated; tenant isolation proven under load. |
| WIF `approved_release_sha` pin | BLOCKED (owner/infra) | Publish blocked until pin = `43bc784` (see owner checklist). |

## 8. Launch-readiness matrix (delta vs `docs/evidence/JOBLOP_LAUNCH_BLOCKER_MATRIX.md`)
| Area | Status | Evidence |
|---|---|---|
| Worker / Employer / Admin apps | PASS (build+CI) | all 3 Next apps build; CI green |
| Offer accept/decline loop | PASS | shipped + P0 import fixed; browser-verified vs 10k |
| Payroll (governed, money-safe) | PASS | HR-5.1; index-backed; idempotent; no live money |
| Canonical regression | PASS | 1589/0 (CI + local) |
| Container images (8) | PASS | build green in CI + locally; digests recorded |
| Migrations | PASS | 35, manifest complete, integrity-validated |
| Dependency audit | PASS | 0 actionable; 2 documented dev/mobile exceptions |
| Terraform config | PASS | validate green (3 modules) |
| Fail-closed money/storage | PASS | config superRefine |
| SYBNB isolation | PASS | §6 |
| 10k capacity (local) | PASS | `docs/scale/JOBLOP_10000_USER_CAPACITY_CERTIFICATION.md` |
| Image publication | **BLOCKED** | WIF SHA-pin ≠ 43bc784 (owner Terraform apply) |
| Staging deploy / qa-reset / staging load / browser cert | **BLOCKED** | requires published images + authorized GCP identity |
| Production secrets / storage / DNS / monitoring / backups | **NEEDS OWNER/INFRA** | enumerated in owner checklist |

## 9. Repository-level blockers found this pass
**None.** `43bc784` is CI-green and fail-closed; no new code defect surfaced. No blocker-fix commit
was required, so the deployable code candidate remains `43bc784`. (Launch documentation added in
this pass is non-runtime collateral.)

## 10. Release-candidate verdict
- **Deployable candidate:** `43bc784` — CODE-COMPLETE, CI-GREEN, LOCALLY CERTIFIED, fail-closed,
  SYBNB-isolated, 10k-capacity-certified (local), 8 images build with recorded digests.
- **Verdict:** **CONDITIONAL GO — fully packaged and locally certified; only owner/cloud/external
  gates remain.** Not launched. No production touched.

### Smallest exact owner actions to reach staging → then public launch
1. **Confirm the authorized JobLop staging GCP identity** (do not assume `info@sybnb.app`); authenticate it interactively (`gcloud auth login` + `gcloud auth application-default login`).
2. **Read-only** WIF `providers describe` to confirm the `approved_release_sha` pin (I run this first).
3. **Terraform apply (bootstrap)** setting `approved_release_sha=43bc784…` — updates the WIF condition (owner-authorized IAM change; review plan first).
4. **Re-dispatch publish** with a **fresh** envelope (not `-001`) → verify 8 registry digests bind to `43bc784`.
5. **Deploy/align** all 9 services to `43bc784` (runtime Terraform apply) → health/readiness.
6. **qa-reset recovery** → **staging load** (250/500/1,000-if-healthy) → **soak** → **browser cert**.
7. **Production**: provision object storage + real secrets + monitoring/alerts + backup/restore drill + DNS/TLS, then a separate public-cutover decision.

See `JOBLOP_STAGING_RUNBOOKS.md` (procedures) and `JOBLOP_OWNER_GCP_CHECKLIST.md` (exact commands/inputs).
