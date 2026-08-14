# PERMANENT MULTI-COUNTRY PLATFORM POLICY

**Status: PERMANENT / BINDING. Every agent and contributor MUST read and follow this policy before
planning, editing, testing, migrating, packaging, or deploying anything in this repository.**

This repository is a **reusable, country-neutral master platform**. It is not a single-country
product.

## Architecture
- `master/` — the clean, reusable, **country-neutral** platform foundation.
- `countries/<country>/` — the isolated launch implementation for exactly one country.
- Initial country: `countries/syria/`.
- Future countries are created and governed **separately**.

## Mandatory isolation
1. Country-specific **law, privacy text, consent versions, currency, pricing, tax, phone/address
   rules, language, maps, providers, data regions, credentials, infrastructure, database, storage,
   migrations, domains, and deployment settings** belong to the country implementation.
2. **No country may inherit another country's** secrets, data, legal text, providers, database,
   storage, infrastructure, or deployment configuration.
3. The **master must not contain** Syria-, Canada-, Québec-, or other-country-specific launch
   assumptions.
4. **Runtime must fail closed** when the country profile is missing, unsupported, incomplete, or
   inconsistent.
5. **Production deployments must come from an explicitly selected, certified country implementation**
   — never directly from the master.
6. Every country release must record: **master source SHA, country SHA, artifact checksums,
   migration state, test evidence, legal versions, provider certifications, and launch verdict.**
7. Reusable improvements may be promoted from a country implementation into master **only through a
   reviewed change with governed regression evidence**.
8. Country-specific improvements remain **isolated** unless deliberately adopted by another country.
9. **Never perform uncontrolled copy-and-paste divergence.** Use shared core modules, explicit
   configuration, adapters, overlays, and documented extension points.
10. Each country requires **independent** build, test, security, migration, backup/restore,
    sandbox-provider, deployment, rollback, legal, and activation gates.

## Before restructuring an existing platform
- **Preserve the last verified candidate.** (Current: `43bc784ddd094f19427a8c847d6946d29858fd9f`.)
- **Inventory** all country assumptions.
- **Classify** every component as master, Syria-specific, or unresolved.
- Produce a **migration and rollback plan** (see
  `docs/launch/JOBLOP_COUNTRY_ARCHITECTURE_AUDIT_AND_MIGRATION_PLAN.md`).
- **Move files in reviewable stages** — no big-bang restructure.
- **Add CI isolation checks** (e.g. master must not reference country-specific tokens; countries
  must not cross-reference each other's secrets/config).
- **Run complete governed certification after each stage.**
- **Do not deploy or activate during the restructuring.**

## Launch-readiness gate
Agents must **not** claim launch readiness until **both** the neutral master **and** the selected
country implementation pass their **respective** gates. A country launch additionally requires
qualified legal review, targeted-sanctions screening, and written per-provider confirmation of
service availability for that country (a provider's commercial policy may differ from the legal
sanctions position — verify each directly).

## Current state (informational)
- Verified candidate `43bc784` is **Canada-configured** (not yet country-neutral) and is
  **preserved** while the country-folder architecture is planned.
- Syria launch verdict: **NO-GO — Syria country implementation unfinished** (profile/currency/
  language/address/legal/providers/deployment); targeted-sanctions screening, legal review, and
  per-provider verification still required (broad U.S./EU sanctions lifted in 2025). Live payments
  disabled, legal DRAFT, deployment blocked, public access closed.
- The country-folder restructure is **planned, not executed**, and proceeds only in reviewed stages
  with governed certification after each.
