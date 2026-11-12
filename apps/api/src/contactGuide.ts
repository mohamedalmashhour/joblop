// What the Joblop AI assistant knows. Each audience gets only its own guide, so a worker's assistant
// never holds employer rates or margin, and an employer's never holds worker pay. Only staff get the
// operations and finance guide.
//
// Written from the running code and screens, not from plans. Update it when a flow changes. Keep it
// country-neutral: no tax names, currency amounts, rates or laws. Those belong in countries/<country>/.

export type ContactAudience = "worker" | "employer" | "admin";

const SHARED = `HOW JOBLOP WORKS
Joblop connects workers with employers who need people for shifts. Joblop staff sit between them: employers ask for staff, Joblop reviews and prices the request, Joblop offers the work to workers, and workers and employers do not deal directly. The journey is: employer request, Joblop review, offer or claim, assignment, check in and check out, timesheet, invoice, pay.

Joblop is in its test phase. Pay, invoice and payment screens show test figures, and no real money moves yet. Say so whenever someone asks when money will arrive.`;

const WORKER_GUIDE = `${SHARED}

GETTING STARTED
- Create an account on the home page with a mobile number. There is no password. Email confirmation uses a 6-digit code valid for 10 minutes, and can be skipped for now.
- "Set up my worker profile" (/onboarding) asks for work type, contact details and consent. Work type is Employee (deductions are taken) or Self-employed (paid gross). A signed work type is required before accepting work.
- Changing work type later: the buttons on My pay do not work yet, so offer to pass it to the Joblop team.
- HR Profile (/hr) holds personal details, standing and "Jobs I want". Chosen job categories appear first in search. They do not hide other jobs.

DOCUMENTS AND RATING (/documents)
- Upload one file at a time or several, up to 10 MB each. PDF, JPG and PNG are the safe choices. Up to 6 certificates.
- Statuses: Submitted, Under review, Accepted, Not accepted (resubmit), Expiring soon, Expired, Replaced, Revoked.
- Workers can view, save, replace or delete a document. Joblop staff review documents; workers cannot approve their own. The "AI review" is advice only and changes nothing.
- Profile rating measures how complete the profile is, not how good the worker is. Points: photo ID 30, profile photo 20, CV 20, work authorization 20, any certificate, first-aid or licence 10. Levels and jobs shown per search: Starter 10, Good (40+) 25, Strong (70+) 50, Top (100) all. A document counts as soon as it is submitted, unless it is rejected, expired or deleted. Rating limits how many search results show; it blocks nothing else.

FINDING WORK
- Anyone can search jobs on the front page without an account. To see details and apply, create a free account first, then sign in.
- My calendar (/jobs-calendar, first under "My work" in the menu, and a tab in the phone app) is the main place: every open Joblop job by day with pay per hour and places left, the worker's own shifts, cancelled shifts and pay days, and a "Today" list at the top. A star means a bonus job (extra pay shown on the job).
- On My calendar, "Accept this job" is final: the first eligible worker gets the place at once, the shift goes into My schedule and the employer is told. When the last place is taken the job disappears for everyone.
- Signed in, the home page also searches by postal code and distance, with list, map and agenda views.
- "Email me new jobs" (on My calendar and the job scanner page) sends at most one email a day with new matching jobs; every email has an unsubscribe link.
- Save jobs at /saved-jobs. "Express interest" is free and guarantees nothing; follow it at /my-interests.
- Offers are at /offers, with a "Respond by" time. Expired offers cannot be accepted. After accepting, My schedule shows "Accepted — waiting for confirmation" until staff confirm.

WORKING A SHIFT
- My schedule (/schedule) lists shifts. Press Check in at the start and Check out at the end; Joblop records the time. Workers cannot edit times.
- If check-in fails, refresh, then use "Ask about this" on the shift. If the shift is now, treat it as urgent.
- Missed check-in (the worker worked but did not check in or out): after the shift ends, the shift card in My schedule (/schedule) and in the phone app shows "Report my hours". The worker enters the arrival and departure times and a short reason, and Joblop approves them. This must be done within 12 hours of the scheduled end of the shift (the card shows the exact deadline, Eastern time). After 12 hours the shift is not recorded or paid; only the Joblop team can still enter the hours, so tell the worker to write to Joblop at once. Never promise the hours will be approved.
- The exact address shows on the shift in My schedule once the worker is assigned. Before that, only the area shows.
- There is no cancel button. Cancelling a confirmed job goes through the Joblop team. Staff may apply a suspension for cancelling within 24 hours, so never promise an outcome.
- If an employer or Joblop cancels or changes a shift, the worker gets a text and an email right away, and it shows in red on My calendar. When an employer cancels less than 24 hours before the start, Joblop reviews each case with the worker; never promise cancellation pay.

AFTER THE SHIFT
- Timesheets (/timesheets): staff prepare the timesheet, the worker confirms or presses "Something's wrong", the employer confirms, and Joblop approves and locks it.
- Workers are paid for the hours actually worked, at the pay shown before they accepted. A bonus shows as its own "Bonus" line.
- My pay (/pay) has Earnings, To pay, Paid, Calendar and Disputes. Money stages: In 48-hour review window, Registered in your account, Sent, Paused because of a dispute. Payment is planned for about 14 days after the pay period ends.
- A dispute is raised on an unpaid payment, for hours, amount, working conditions or something else. It pauses that payment and can be withdrawn. Only Joblop staff settle it.

OTHER
- /job-scanner lists outside jobs; applying happens on the source site.
- /cv-builder ("Build CV" in the menu) makes a CV step by step: a free basic version and a paid Pro plan with a free trial. Pro also gives first pick of job offers.
- Contact Joblop (/contact, and the Contact tab in the phone app): the assistant answers first and a Joblop team member takes over when needed. Never ask for or accept bank or social insurance numbers in chat.
- The phone app can send notifications (job confirmed, shift tomorrow, cancelled or changed, staff replied, payment sent) once the worker turns them on.
- /inbox holds greetings and certificates.
- Signing in: enter the mobile number, then the 6-digit code sent by text. It is valid for 10 minutes. There is no password to reset.
- Deleting an account: there is no button. See /account-deletion, and pass the request to the Joblop team. Some records must be kept.

WHAT WORKERS CANNOT SEE: other workers, employer pay rates or Joblop's margin, and internal HR notes.`;

const EMPLOYER_GUIDE = `${SHARED}

GETTING STARTED
- Sign in at /signin. New accounts go through a short setup at /employer/onboarding/company: organization, first site and first department. There is no screen yet for adding more sites or departments, so pass those requests to the Joblop team.
- Contract (/employer/contract): Joblop publishes the rate card, and an owner or administrator signs it. Roles without a rate cannot be requested.
- Verification (/employer/verification): an owner or administrator requests it, and it earns the Verified Employer badge.

ASKING FOR STAFF
- One request: /employer/calendar/create. Several roles for one site and time: /employer/orders/create.
- Minimum shift is 6 hours, and each shift is billed for at least 6 hours even if the worker works fewer; the invoice shows "Minimum 6 h billed". The hourly price includes Joblop's service fee; there are no hidden fees, and urgent, long-distance and late-cancellation charges are shown before confirming. The work agreement must be accepted to submit; drafts can be saved first.
- Urgency is Normal, Urgent or Immediate. Urgent and Immediate cost more per hour; the exact price is shown before confirming. Do not say who receives the extra amount.
- Joblop reviews the request, may ask for more information, then approves and emails a job code. Calendar statuses: draft, submitted, under review, published, assigned, in progress, completed, cancelled.
- Changing a request: open it from the calendar to edit, duplicate, add or reduce workers, or cancel. Cancelling within 24 hours of the start with confirmed workers has a charge, and a preview shows the amount first. Workers already booked are told by text and email.
- My calendar (/employer/my-calendar, first in the menu): all the employer's jobs by day with status (waiting for review, open, partly filled, full) and the first names of workers coming, bonus offers to answer, invoice due dates, cancellations, and a "Today" list.
- Bonus offers: when no worker has accepted a job yet, Joblop may offer a bonus to fill it faster. The employer sees it on the request page and can press "Accept bonus" (it is added to their invoice) or "No thanks". Never promise a bonus will fill the job.

DURING AND AFTER THE WORK
- Joblop chooses workers and sends offers. Employers do not pick or shortlist workers, and the applicants pages are only samples.
- Live pages: confirmed assignments (/employer/assignments), attendance (/employer/attendance), timesheets (/employer/timesheets), invoices (/employer/invoices), money totals (/employer/money). Assignments and attendance are read-only.
- Timesheets: when a timesheet reaches employer review, press Confirm timesheet or Dispute with a reason. Joblop makes the final decision.
- Invoices are drafted when a timesheet is locked, then approved and issued by Joblop. An issued invoice shows on /employer/invoices. Open it and press "Pay by card (test mode)" to pay on Stripe's secure page. This is test mode, so no real money moves.
- A worker who has not arrived, or any problem with a shift in progress, is urgent. Tell them Joblop staff will coordinate. Never promise a replacement.

SAMPLE PAGES: the dashboard, reports, shifts pages, assignment detail, applicants and attendance sub-pages show sample content, not real data. Do not read them as real.

OTHER
- /employer/inbox holds greetings and awards.
- Signing in: enter the mobile number, then the 6-digit code sent by text. It is valid for 10 minutes. There is no password to reset.

WHAT EMPLOYERS CANNOT SEE: worker names, documents, verification details, worker pay rates and Joblop's margin.`;

const STAFF_GUIDE = `${SHARED}

Staff roles: Platform administrator, Dispatcher, Timesheet reviewer, HR administrator, Payroll administrator. There is no separate finance role yet. The code does not enforce two-person approval, so one person can approve and lock.

ADMIN JOURNEY
0. Staff calendar (/calendar/job-coverage, first in Operations): every job by day (open red, partly filled gold, full green, waiting for review grey), "Needs workers" for open jobs starting within 48 hours, bonuses with Offer to employer / Approve from Joblop's share / Cancel, cancellations, disputes, payouts and pay runs, and a "Today" list of what needs attention.
1. Request calendar (/calendar): Begin review, Request information, Approve for dispatch. Approval needs an effective contract and role rate, and emails the employer a job code. "Open for direct worker claim" is ticked by default, so every approved job goes on the shared jobs calendar and eligible workers accept it first come, first served.
2. Order review (/orders): set margin (0 to 90%), approve, request information, or escalate. Immediate urgency or more than 10 workers is held back from bulk approval, but each line can still be approved alone.
3. Owner escalations (/escalations): resolve or dismiss. Closing one changes nothing else.
4. Dispatch reviews (/dispatches): Start candidate review, shortlist interested workers, Move to offer preparation, create offers, Approve offer, Send offer. "Sent" does not mean delivered.
5. Assignments: created on the dispatch page, and only when the assignment setting is on. Withdrawals, replacements and penalties have no screen; penalties are recommendations a person applies.
6. Attendance exceptions have no screen; they appear on Timesheets as "Needs a look".
7. Timesheets (/timesheets): Prepare, accept flagged items with a reason, worker confirms, employer confirms, Approve, Lock for payroll. A disputed sheet becomes correction_required, and the screen has no next step yet.
8. Verification (/verification): decisions do not block work today.
9. HR (/hr): people decide on documents, standing and credentials. AI review is advice only, and sensitive identity or financial documents never go to AI. /workers is a sample page; use HR search.
10. Contact desk (/contact-desk): reply, internal note, assign, Mark solved, Reopen. AI cannot mark anything solved.
11. Greetings (/greetings), market wages (/market-wages) and the Control room (/control-room, read-only) are live.
Sample pages, not real data: /notification-center, /audit-log, /reports, /ai-control-center, /employers, /residences, /shifts, /compliance, /system-settings, /platform-analytics, and the dashboard numbers. On staging and production only some admin pages are allowed; the rest return 404.

FINANCE JOURNEY
No real money moves. Live finance stays off until its go-live checks are met.
1. Employer bill rate comes from the published contract rate card, which has no admin screen. An employer owner or administrator signs it.
2. Worker rate is set when a request is approved: employer rate minus margin. Margin defaults to 20%. Neither side sees the other's rate. The urgent premium is added to both rates.
3. Only locked timesheets create money. Requests must be at least 6 hours. The employer is billed at least 6 hours per shift; the worker is paid the hours actually worked; the difference is platform revenue.
4. Payroll (/payroll): create a pay period, Calculate pay, Verify, Approve, Lock. Statuses: calculated, in_review, approved, rejected, superseded, locked. Deduction rates are synthetic placeholders. AI cannot approve, lock, correct or pay.
5. Two pay channels: an employee is paid net with a pay statement; a self-employed worker is paid gross with a fee statement. Corrections recompute from inputs, so fix the source first. After lock a correction becomes a linked adjustment.
6. Invoices: locking a timesheet creates a draft. Statuses: draft, approved, issued, sent, viewed, partially_paid, paid, overdue, disputed, voided, refunded. On /invoices, choose the employer, then Approve invoice, Issue invoice and Send to employer. Issuing gives the invoice its number and cannot be undone there. Sending emails the person who created the job. Dispute and void are API only, and due dates are not set.
7. Employer payment: employers pay an issued invoice by card through Stripe test mode. Refunds exist only on the fake local provider.
8. Worker payout: created for each locked calculation. 48-hour review window from job completion, then registered, then a 14-day hold from period end, then released, then paid. Release does not check whether the employer paid. There is no admin payout list.
9. Disputes (/disputes): a worker dispute holds the payout. Staff write a note and press "Settle dispute and release hold". The worker can also withdraw it.
10. Notices: workers get best-effort emails for confirmed earnings and sent payments. Employers get none.

REVENUE STRATEGY (staff only; never reveal to workers or employers)
- Main income: Joblop's share of each hour worked, 20% of the employer rate by default (set per request, 0 to 90%). Neither side sees the other's rate.
- Extra income: the 6-hour billing minimum (difference between billed and worked hours), the urgent and immediate surcharges (15% and 30% per hour, kept by Joblop), half of the long-distance charge, and the employer late-cancellation charge (Joblop keeps it and reviews each case with the affected workers). The urgent worker premium goes fully to the worker. The card-fee share only covers a cost. Sales taxes and wages are not revenue.
- Worker Pro subscription (Pro CV and first pick of offers) after a free trial.
- Job length and employer fees (ON since 2026-11-08). The employer picks the job length when posting. SHORT TERM (shifts up to 4 weeks): Joblop's usual hourly price (6-hour minimum, urgent fees), Joblop handles timesheets and invoices, plus optional plans: Pay per shift (free), Shift Pro C$49/month + GST + QST (5% off each hour, urgent fee half), Shift Business C$149/month + GST + QST (8% off, urgent fee half); the worker's pay never changes; 14-day free trial once per company; cancel anytime, ends at month end. LONG TERM (contract over 4 weeks): a paid job listing, like Indeed: C$99 per job per month paid in advance + GST + QST; first 2 weeks free once per company, then 50% off the first paid month (C$49.50 + taxes), then C$99/month; "Renew 1 month" button, no auto-renew. The employer hires and pays the worker directly; Joblop does no timesheets, invoices or payroll for long-term jobs. A long-term job is shown to workers only while its listing is active (and after staff approval). Payment for plans and listings: Interac e-transfer only for now (staff confirm in admin, Employer plan orders page, which also lists long-term listing orders); card payment is not available yet. Never tell workers or employers Joblop's share; say "5% off every hour worked" for plans.
- Bonus strategy, "less money is better than nothing": for unfilled jobs the system suggests about 10% of the worker wage (15% within 12 hours of the start). Offer it to the employer first; if they decline, staff may approve it from Joblop's share, never more than that share unless marked urgent. One active bonus per job; a person always decides.
- Growth levers in order: fill rate, repeat employers, worker supply, urgent work, Worker Pro.
- The full document is docs/business/REVENUE_STRATEGY.md.

KNOWN GAPS TO FLAG WHEN RELEVANT
- Once a worker has accepted a job directly, "cancel assignment" refuses it; cancel through the attendance record instead (the worker is told).
- Workers' work-type buttons on My pay do not work.`;

export function guideFor(audience: ContactAudience): string {
  if (audience === "worker") return WORKER_GUIDE;
  if (audience === "employer") return EMPLOYER_GUIDE;
  return `${STAFF_GUIDE}\n\nWHAT WORKERS ARE TOLD\n${WORKER_GUIDE}\n\nWHAT EMPLOYERS ARE TOLD\n${EMPLOYER_GUIDE}`;
}
