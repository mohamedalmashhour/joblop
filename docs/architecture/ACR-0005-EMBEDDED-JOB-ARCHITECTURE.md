# ACR-0005 — Embedded Job Architecture (Grading & Leveling)

Status: **PROPOSED — DESIGN DIRECTION** (not approved to build; advisory/test-mode only; gated behind
the launch gates and the multi-country policy)

## Decision

Add an **embedded job-grading & leveling layer** to JobLop that assigns any posted role a **family**,
a **level/tier**, and a **market pay band** — working across JobLop's *mixed* vertical (service/shift
work AND professional/tech) — and feeds it into the existing compensation pipeline. Two architectural
commitments:

1. **Build-first, provider-pluggable.** The grading engine is built natively (owned, auditable, zero
   per-post cost) behind a `StructuralGradingProvider` **port**, so an external provider (e.g.
   Lightcast/O*NET) can be adapter-swapped later — per family or per country — without re-architecting.
2. **Four shared, family-anchored compensable factors** (not two unrelated factor sets, not a
   tech-skewed single set). One framework, interpreted per family, so a service "L3" ≠ a tech "L3".

This is **advisory, market-guidance, test-mode** capability. It never sets binding pay, never
auto-decides, and is always human-reviewable — consistent with the HR-6 advisory-AI boundary.

## Context

- **Owner inputs:** the framework is to be **embedded in the platform** for the employers/workers who
  use it (not internal corporate HR), across a **mixed vertical** (service/shift + tech/professional),
  Québec/Canada-first (bilingual EN/FR), expanding later.
- **Already built (reuse, do not rebuild):** market-wage engine (base bands by region), the dynamic
  offer engine with **variable-comp modifiers** (the short-term "premium modifier"), the **two-channel
  T4/T4A worker-classification** election (employee vs contractor; disguised-employment control),
  advisory AI infrastructure (offline/synthetic default, real model gated, human-reviewed — HR-6), and
  the country-neutral port/adapter architecture.
- **The gap:** a systematic **input parser + factor/level calculator** — i.e. the "Structural Grading
  Layer." Everything downstream of a baseline tier already exists.
- **Reference:** the external build-vs-buy analysis (Gemini) and the vendor methodologies (gradar's
  transparent point-factor; Job-E's AI JD→grade). These are *methodology references*, not products to
  adopt wholesale.

## Two-layer architecture

```
[Inbound job post: raw JD or structured wizard]
        │
        ▼
┌─ Layer 1 · Structural Grading (NEW, this ACR) ─────────────────┐
│  StructuralGradingProvider port:                               │
│   • parse → extract factor signals (LLM-assisted, advisory)    │
│   • deterministic scorer → 4 factor points → baseline Tier     │
│   • family-aware (service L1–L4 | professional/tech L1–L6)      │
│  Default impl = native. Adapter seam for Lightcast/etc. later. │
└───────────────────────────────────────────────────────────────┘
        │  { family, tier, factorScores, confidence, needsReview }
        ▼
┌─ Layer 2 · JobLop Execution (EXISTS) ──────────────────────────┐
│  • (family, tier, region) → market band  [market-wage engine]  │
│  • engagement type → premium modifier     [offer engine]       │
│  • employee/contractor → T4/T4A routing   [classification]     │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
[Listing + targeted compensation band  (ADVISORY market guidance)]
```

Layer 1 grades the **immutable requirements** of the role (same for a 3-week contract or a permanent
hire). Layer 2 reads the **intent** (short- vs long-term) and converts the baseline tier into an
elevated hourly/daily rate (short-term, via premium modifiers + contract-compliance routing) or a
permanent salary band — both **already implemented**.

## The grading model

### Port (master-neutral)
```ts
interface StructuralGradingProvider {
  grade(input: {
    description: string;          // raw JD, or assembled from the wizard
    family: RoleFamily;           // "service" | "professional"  (caller-resolved)
    locale: "en" | "fr";
  }): Promise<{
    family: RoleFamily;
    tier: number;                 // within the family's scale
    factorScores: Record<CompensableFactor, number>;
    confidence: number;           // 0..1
    needsHumanReview: boolean;    // always true above a configurable band / low confidence
    rationale: string;            // human-readable, for the reviewer (never a pay guarantee)
  }>;
}
```
- **Native default impl**: an LLM-assisted *parser* (advisory pattern — offline/synthetic default, real
  model behind a gate, no auto-decision) feeding a **deterministic** point-factor scorer. The scorer is
  pure/unit-tested; the LLM only extracts signals, it does not assign the final tier.
- **Provider adapter (deferred)**: a Lightcast/O*NET adapter MAY implement the same port later, **only**
  after per-country provider verification (availability + sanctions + privacy of outbound JD data) per
  the multi-country policy. Likely scoped to the **professional/tech family** where its taxonomy is
  strongest.

### Four compensable factors (shared, family-anchored)
| Factor | Service/shift anchor | Professional/tech anchor |
|---|---|---|
| **Skill & Qualification** | food-handler/WHMIS/licensed trade, training | domain/technical depth |
| **Autonomy & Supervision** | follows a checklist → runs a site solo | IC → tech lead |
| **Complexity & Scope** | single task → multi-site/multi-task | component → whole system |
| **Responsibility & Risk** | safety/equipment/customer liability | production/security/data risk, leads others |

- The deterministic scorer sums the four → a **Tier** on the **family's own scale** (service **L1–L4**,
  professional/tech **L1–L6**). Families never share a ladder.
- **Physical demand / hazard / unsocial hours** are a **premium modifier in Layer 2**, NOT a base
  factor — they drive the short-term pay premium, not the intrinsic level.

## Boundaries & guardrails (binding)
- **Advisory only.** Output is **market guidance**, never binding/statutory pay; JobLop does not assume
  employers' compensation-compliance liability. Employers always see it as a suggestion they can override.
- **Never auto-decides.** Above a configurable tier/confidence threshold → `needsHumanReview = true`.
  Mirrors the HR-6 advisory-AI boundary (AI explains, humans decide).
- **No money.** This layer computes a *band*, never moves funds; `FINANCE_LIVE_ENABLED` is untouched.
- **Test-mode / fail-closed.** Ships gated like the rest of the platform; absent config → no grade, not
  a silent default. The LLM parser's real-model path is gated (offline/synthetic default).
- **No external data egress** of employer job descriptions without a per-country-verified provider
  (multi-country policy). The native default has none.
- **Bilingual** (EN/FR) from day one; country-neutral core + per-country anchors where needed.

## Phased roadmap
- **Phase 1 — Factor engine (native, deterministic).** Role families + the 4-factor point scorer over
  existing role definitions; pure, unit-tested; structured-wizard input. No LLM yet.
- **Phase 2 — Band wiring.** `(family, tier, region)` → market band via the market-wage engine; surface
  as advisory guidance on the listing.
- **Phase 3 — Premium modifier formalization.** Make the engagement-type premium explicit in the offer
  engine (mostly exists) + T4/T4A routing.
- **Phase 4 — LLM-assisted parser (advisory).** JD → factor signals via the gated advisory-AI provider,
  human-reviewed; never auto-assigns the tier.
- **Phase 5 (deferred, optional).** External provider adapter (Lightcast/O*NET) for the tech family
  and/or specific countries — only after per-provider/per-country verification.

## Explicitly deferred / open owner decisions
- **Exact tier counts** per family (proposed L1–L4 / L1–L6) and the factor-weighting curve — to be
  calibrated on a benchmark role set (standard "calibration" phase).
- **Whether Phase 5 (Lightcast) is ever pursued** — gated on per-country provider verification + cost.
- Build is **not authorized by this ACR** — it records direction. Implementation needs owner approval
  and sits behind the launch gates + multi-country policy (test-mode/advisory until then).

## Relationship to existing ACRs
Extends ACR-0004 (product portfolio) under JobLop; consumes the market-wage/offer engines and the
T4/T4A classification; follows the advisory-AI boundary (HR-6) and the port/adapter + fail-closed
patterns from the multi-country platform policy.
