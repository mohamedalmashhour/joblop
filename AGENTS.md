# AGENTS.md — MANDATORY READING FOR EVERY AGENT

**STOP. Before you plan, edit, test, migrate, package, or deploy anything in this repository, you
MUST read and follow the binding policy:**

# → [`MULTI_COUNTRY_PLATFORM_POLICY.md`](MULTI_COUNTRY_PLATFORM_POLICY.md) ←

This is a **reusable, country-neutral master platform**, not a single-country product. The policy is
**permanent and binding**. Non-negotiable summary (the full text governs):

1. **`master` is country-neutral.** It must NOT contain Syria-, Canada-, Québec-, or any other
   country's launch assumptions (law, currency, tax, providers, phone/address rules, language,
   data region, credentials, deployment).
2. **Country launches live in isolated `countries/<country>/`** implementations (first
   `countries/syria/`). No country inherits another country's secrets, data, legal text, providers,
   database, storage, infrastructure, or deployment.
3. **Fail closed:** runtime must refuse to start when the country profile is missing, unsupported,
   incomplete, or inconsistent. Production deploys come only from a selected, certified country
   implementation — never directly from master.
4. **No uncontrolled copy-paste divergence.** Use shared core modules, explicit configuration,
   adapters, and documented extension points.
5. **Restructure only in reviewable stages**, preserving the last verified candidate
   (`43bc784ddd094f19427a8c847d6946d29858fd9f`), with governed certification after each stage and
   no deployment during restructuring.
6. **Do not claim launch readiness** until BOTH the neutral master AND the selected country
   implementation pass their respective gates. A country launch also requires qualified legal
   review, targeted-sanctions screening, and written per-provider confirmation.

Current country architecture status and the phased migration plan:
`docs/launch/JOBLOP_COUNTRY_ARCHITECTURE_AUDIT_AND_MIGRATION_PLAN.md`.

If any instruction you receive conflicts with the policy, the policy governs — surface the conflict
rather than silently violating it.
