# JobLop — Country Architecture Phase 1 Evidence

Phase 1 of the country-neutral master + `countries/<country>` architecture
(`MULTI_COUNTRY_PLATFORM_POLICY.md`). **Additive only** — no existing files moved. Governed
certification: Foundation Validation **PASS**.

## Candidate identity
| | SHA |
|---|---|
| **Phase-1 candidate (new)** | `5d3b21c845781cbf5005ae284045b767d4edb161` (`5d3b21c`) |
| **Rollback candidate (preserved, unchanged)** | `43bc784ddd094f19427a8c847d6946d29858fd9f` (`43bc784`) |

Commits since the rollback candidate (`43bc784..5d3b21c`):
- `ab9a139` docs: country audit + migration plan + local packaging (docs only)
- `17704d1` docs: enshrine multi-country policy + correct Syria sanctions statement (docs only)
- `5005aa8` feat(country): Phase 1 selector + neutral CountryProfile + isolated Syria profile
- `5d3b21c` fix(country): fail-closed liveness (not hard-exit) + regenerate lockfile

## Exact runtime delta (Phase 1 code = `5005aa8` + `5d3b21c`)
| File | Change | Country-neutral? |
|---|---|---|
| `AGENTS.md` (root) | NEW — makes `MULTI_COUNTRY_PLATFORM_POLICY.md` mandatory for every agent | n/a (policy) |
| `packages/config/src/country.ts` | NEW — `CountryProfile` interface, `NEUTRAL_FIXTURE` (non-market, local/test only), `isCountryProfileActivatable()`, fail-closed `resolveCountryConfig()` with an **injected** registry | **YES** — master hardcodes no country |
| `packages/config/src/index.ts` | export `* from "./country"` | YES |
| `packages/config/src/country.test.ts` | NEW — 7 resolver fail-closed tests | YES |
| `countries/syria/` (`@rwos/country-syria`) | NEW isolated package: Syria profile (gate CLOSED, incomplete: SYP / Asia/Damascus / +963 / DRAFT legal / unbound providers / undecided region) + 3 tests | isolated country (correct) |
| `apps/api/src/server.ts` | on missing/unsupported/incomplete country → **liveness-only fail-closed server** (`/health`→200 `{alive, ready:false}`; `/ready` + all else →503); real app (`buildApi`) never starts. Wired at process entry, NOT `buildApi`, so the test suite is untouched | YES |
| `pnpm-workspace.yaml` | add `countries/*` glob | YES |
| `tsconfig.build.json` | add `./countries/syria` reference | YES |
| `pnpm-lock.yaml` | `@rwos/country-syria → @rwos/config` workspace dep | YES |

**No** financial, payroll, tax, employment, legal, currency, or provider **semantics** were changed.
Phase 1 adds country *selection* + a held-shut Syria gate only.

## Fail-closed behavior (the core Phase-1 guarantee)
`resolveCountryConfig({ rwosEnv, country: RWOS_COUNTRY, registry })`:
- No `RWOS_COUNTRY`, **local/test** → `NEUTRAL_FIXTURE` (non-market engine profile; never activatable).
- No `RWOS_COUNTRY`, **staging/production** → refuse (`RWOS_COUNTRY_REQUIRED`).
- `neutral-fixture` outside local/test → refuse (`RWOS_COUNTRY_UNSUPPORTED`).
- Unknown country → refuse (`RWOS_COUNTRY_UNSUPPORTED`) — **never** falls back to another country.
- Registered but not activatable (incomplete / gate closed / unsupported) → refuse (`RWOS_COUNTRY_PROFILE_INCOMPLETE`).

API startup on refusal (verified locally, `RWOS_ENV=staging`, no country):
```
/health -> 200  {"status":"alive","ready":false,"reason":"country_profile_unavailable"}
/ready  -> 503   {"status":"unavailable","reason":"country_profile_unavailable"}
log: api.country.fail_closed_liveness_only reason=RWOS_COUNTRY_REQUIRED
```
The container stays alive for liveness/orchestration, but the application is refused and no readiness
or real traffic is served. Selecting Syria (registry `{syria}`) in production → `RWOS_COUNTRY_PROFILE_INCOMPLETE`.

## Governed certification — Foundation Validation run `31771908207` (branch `main`, `5d3b21c`) — PASS
| Job | Result |
|---|---|
| `validate` (full `pnpm validate`: lint, typecheck, **test 1599 passed / 0 failed**, env, boundaries, migrations, secret scan, build, public-bundle scan) | ✓ 6m29s |
| `dependency-audit` (`pnpm audit` + `--prod`; 2 documented image-size exceptions) | ✓ |
| `container-runtime` × 8 (api, employer, admin, worker, auth-limiter, candidate-source, offer-delivery, qa-reset) — build + probe | ✓ (api fail-closed liveness `/health`→200) |
| `terraform-validate` × 3 (state-bootstrap, bootstrap, runtime) | ✓ |

Local corroboration: typecheck green, lint clean, `validate:boundaries` PASS, full regression
**1599/0**, all packages build, api image fail-closed probe verified.

## Runtime candidate status
Runtime candidate is unchanged by the documentation: it remains `5d3b21c` (this evidence + the Phase
2 proposal are docs only). `43bc784` remains the preserved rollback.

## Rollback instructions
Phase 1 is additive and gated behind the fail-closed default (no country wired into the API runtime
yet), so rollback is low-risk:
- **Code rollback:** `git revert 5d3b21c 5005aa8` (drops the selector + Syria package + server wiring),
  or redeploy/build from `43bc784`. No DB migration was introduced, so no schema rollback is needed.
- **Behavioral rollback:** because no country is wired into the API composition root in Phase 1, the
  only observable runtime change is the startup guard; reverting `apps/api/src/server.ts` restores
  the prior unconditional startup.
- **Preserved fallback:** `43bc784` (Canada-configured, previously CI-green + capacity-certified)
  remains a complete, deployable rollback target until the country-folder architecture completes its
  own certification.

## Scope boundaries honored
No image publish, no deploy, no GCP/IAM change, no payments enabled, no SYBNB/PortiqAI resources.
Live payments disabled, legal DRAFT, Syria gate CLOSED, public access closed.
