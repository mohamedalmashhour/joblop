# Joblop revenue strategy

Owner-approved plan for how Joblop earns money, written so the owner, the staff and the staff AI
assistant all work from the same rules. Figures are the defaults in the code today
(`packages/shared/src/domain/platformPricing.ts`, `variableClientPricing.ts`, `jobBonus.ts`).
Joblop is in its test phase: no real money moves until live finance is switched on.

**Confidential.** This is internal. Workers never see employer rates or Joblop's share. Employers
see their own price, which includes Joblop's service fee, but not the worker's pay.

## 1. The main income: Joblop's share of every hour worked

- The employer pays an hourly rate from their signed contract (the rate card for each role).
- The worker is paid that rate minus Joblop's share. **Default share: 20%** of the employer rate.
  Staff can set it per request when approving (0–90%).
- Example: employer pays $25/h, worker gets $20/h, Joblop keeps $5/h. An 8-hour shift earns
  Joblop $40.
- Neither side sees the other's rate. The employer's price is presented as including Joblop's
  service fee: no hidden fees.

## 2. Fair minimums and extra charges (all shown to the employer before they confirm)

| Charge | Rule | Who keeps it |
|---|---|---|
| **6-hour minimum** | The employer is billed at least 6 hours per shift. The worker is paid the hours actually worked. | The difference is Joblop revenue. The invoice says "Minimum 6 h billed (x h worked)". |
| **Urgent / immediate job** | +15% (urgent) or +30% (immediate) per hour. | Joblop. |
| **Urgent premium for the worker** | +$5/h added to both the employer price and the worker pay. | The worker. |
| **Long distance** (over 25 km) | Gas ($0.25/km round trip) and travel time. | Split 50/50 worker / Joblop. |
| **Employer cancels < 24 h before start** | Employer pays 6 h per confirmed worker; each worker is owed 3 h. | Joblop keeps the rest. |
| **Card payment** | The employer pays half of the card fee (about 1.45% + $0.15); Interac costs them nothing extra. | Covers a cost; not profit. |

Sales taxes (GST + QST) and workers' wages are **not** revenue: taxes go to the government and
wages go to workers.

## 3. Worker subscription

- **Worker Pro:** C$12.99/month after a 14-day free trial. Includes the Pro CV builder and first
  pick of job offers. Basic CV and all job search stay free.

## 4. Bonus strategy for jobs nobody has taken ("less money is better than nothing")

Goal: fill every job. When an approved job still has open places close to its start:

1. **The AI suggests** a bonus: about **10% of the worker wage** per hour (15% if the shift starts
   within 12 hours). Kinds: extra $/h, transport money, or a one-time amount.
2. **Offer it to the employer first.** If they accept, they pay it (it goes on their invoice).
3. **If the employer says no**, staff may approve it **from Joblop's share**, never more than that
   share, so the job still makes money. In urgent cases staff may offer any amount ("urgent
   override", recorded).
4. One active bonus per job. Every step is recorded with who decided.

The worker sees "+ $2.50/h bonus" on the job and gets it as a "Bonus" line on their pay.

## 5. Growth levers (in order of impact)

1. **Fill rate.** Every filled shift earns the 20% share; an unfilled one earns nothing. The shared
   jobs calendar, instant Accept, job alerts and bonuses all push fill rate up.
2. **Repeat employers.** Clear prices, no hidden fees, the 6-hour minimum shown up front, invoices
   by email with a PDF, and the employer calendar build trust and repeat orders.
3. **Worker supply.** Free job search without an account, phone sign-in, the free CV builder,
   transparent pay before accepting, and fast pay keep workers coming back.
4. **Urgent work.** Same-day and urgent jobs carry the +15% / +30% surcharge: the platform's
   best-margin work. Be fast and reliable on these.
5. **Worker Pro** subscriptions as a steady extra income once worker numbers grow.

Planned later (not built): employer subscriptions or plans, AI scheduling tools, payroll tools.

## 6. Rules the AI assistant must follow

- Only the **staff** assistant knows this document. The worker and employer assistants never
  mention Joblop's share, employer rates (to workers) or worker pay (to employers).
- Never invent prices, percentages or dates beyond this document and the live records.
- Bonuses: suggest; never promise one. A person approves.
- No real money moves until live finance is on; say so if asked when money arrives.

## 7. Open items before real money

- Real Québec payroll deduction rates from the accountant (today's are placeholders).
- Accountant view on vacation pay applied to bonuses.
- Brevo text sender approval (codes and urgent texts), Stripe account branding, live finance
  switch-on checks.
