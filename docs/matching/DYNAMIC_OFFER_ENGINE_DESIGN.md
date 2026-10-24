# Dynamic offer + matching engine — design

**Goal:** fill each job with the right worker at a variable, profitable offer, and **learn from
outcomes**. Worker comp and client price both flex; unfilled jobs get sweetened over time within the
client's willingness-to-pay and a platform-margin floor. Real ML components (acceptance model,
willingness-to-pay model, bandit optimizer) are first-class from the start, initialized with
**cold-start priors** and improving online as the offer/outcome log grows.

**Honest footing:** a learning system has no history on day one. Early predictions are prior-driven
(from worker preferences and client intake answers) and clearly labelled as such; they get replaced by
learned estimates as data accumulates. Nothing here moves money — it decides *what offer to make*; the
money flow stays on the gated finance engine (see `docs/finance/TWO_CHANNEL_PAYROLL_DESIGN.md`).

This fits the contractor direction: workers negotiating/choosing transport and benefits, and freely
accepting or declining, is arm's-length behaviour that *strengthens* independent-worker classification.

---

## 1. The model

**Worker comp** = base rate + optional incentives chosen to attract a worker:
`transport allowance`, `gas + travel-time` (outside Montréal), `meal`, `urgency bonus`. Each worker has
preferences: min rate, requires-transport, max travel distance, availability, reliability history.

**Client price** = base + transport + out-of-Montréal (gas + time) + optional premium, plus a
**willingness-to-pay (WTP)** signal read from the client's intake answers (urgency, budget flexibility,
how badly the shift must be filled) and GST/QST on top.

**Platform margin** = client price − worker comp, kept **≥ a configured floor**. An offer is only ever
made when margin ≥ floor and client price ≤ WTP ceiling.

**Escalation:** while a job is unfilled and the shift date is still out, the optimizer raises the offer
(add transport → then bonus) step by step, each step bounded by WTP and the margin floor.

## 2. Signals captured (the training set)

- **Offer events:** job features, worker features, offer terms, time-to-shift, channel — and the
  **outcome** (accepted / declined / ignored / expired). This log is the dataset everything learns from.
- **Client intake answers** (the questions on the client page) → WTP features.
- **Worker preferences + history** → acceptance features.

## 3. ML components (a model seam, like the payroll provider seam)

- **AcceptanceModel** — `P(accept | worker, offer, context)`. Cold-start: a transparent logistic prior
  from preferences (requires-transport & no transport ⇒ low P; offer ≥ worker min ⇒ higher P). Learns
  online from the offer log.
- **WillingnessToPayModel** — the client's max acceptable price from intake answers + job. Cold-start:
  their stated budget/urgency. Learns from accepted-vs-abandoned invoices.
- **OfferOptimizer** — chooses offer terms maximizing `E[fill] × margin` within [floor, WTP]. A
  **contextual bandit** (Thompson / ε-greedy) balances exploit (known-good offers) and explore (learn
  new ones). This is the component that improves fill-rate and margin over time.

Each decision logs its features, the predicted acceptance, the chosen terms, and **why** — the engine is
explainable, never a black box.

## 4. Safety / governance

- Hard **margin floor** (never offer below a platform-net floor) and **WTP ceiling** (never bill above).
- Full decision logging (features + prediction + reason) for audit and training.
- Human override on any offer; the optimizer proposes, an operator can adjust.
- Rates/fees that touch the client invoice still run through the gated finance engine.

## 5. Phases

| Phase | Deliverable |
|---|---|
| **P1** | Offer-optimizer core + the model seam (AcceptanceModel, WillingnessToPayModel, OfferOptimizer) with cold-start priors; pure + unit-tested; margin-floor / WTP enforcement |
| **P2** | Signal capture — offer-outcome event log, worker preferences, client WTP features (schema + endpoints) |
| **P3** | Learned AcceptanceModel trained from the log + online update; the bandit explore/exploit loop |
| **P4** | WillingnessToPayModel from intake answers; automated escalation over time-to-shift |
| **P5** | Operator dashboard: fill rate, realized margin, model performance, and the offer each job received + why |

Start at P1 (the brain), capture data in P2, then the models learn in P3–P4.
