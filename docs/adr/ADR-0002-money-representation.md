# ADR-0002 - Money Representation

**Status:** Accepted for RWO-G01  
**Date:** 2026-07-13

## Decision

Represent money as integer minor units with an explicit currency.

```ts
type MoneyAmount = {
  amountMinor: number;
  currency: "CAD";
};
```

For example, `5000 CAD` means `$50.00 CAD`.

## Reason

G01 displays worker-facing shift compensation. Floating-point arithmetic is not acceptable for money because it can introduce rounding errors and later billing/payroll defects.

## Consequences

- Domain logic does not calculate money using floating-point values.
- Formatting happens in UI helpers, not domain contracts.
- Additional currencies require an explicit domain expansion.
- Client billing, worker compensation, and platform margin remain separate future domains.
