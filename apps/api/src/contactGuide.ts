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
- /browse is public. Signed in, the home page searches by postal code and distance, with list, map and agenda views.
- Save jobs at /saved-jobs. "Express interest" is free and guarantees nothing; follow it at /my-interests.
- Some jobs show "Accept & claim": the first eligible worker gets the place at once, and the shift appears in My schedule.
- Offers are at /offers, with a "Respond by" time. Expired offers cannot be accepted. After accepting, My schedule shows "Accepted — waiting for confirmation" until staff confirm.

WORKING A SHIFT
- My schedule (/schedule) lists shifts. Press Check in at the start and Check out at the end; Joblop records the time. Workers cannot edit times.
- If check-in fails, refresh, then use "Ask about this" on the shift. If the shift is now, treat it as urgent.
- The exact address shows on the shift in My schedule once the worker is assigned. Before that, only the area shows.
- There is no cancel button. Cancelling a confirmed job goes through the Joblop team. Staff may apply a suspension for cancelling within 24 hours, so never promise an outcome.

AFTER THE SHIFT
- Timesheets (/timesheets): staff prepare the timesheet, the worker confirms or presses "Something's wrong", the employer confirms, and Joblop approves and locks it.
- My pay (/pay) has Earnings, To pay, Paid, Calendar and Disputes. Money stages: In 48-hour review window, Registered in your account, Sent, Paused because of a dispute. Payment is planned for about 14 days after the pay period ends.
- A dispute is raised on an unpaid payment, for hours, amount, working conditions or something else. It pauses that payment and can be withdrawn. Only Joblop staff settle it.

OTHER
- /job-scanner lists outside jobs; applying happens on the source site.
- /cv-builder has a free basic draft and a paid Pro plan.
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
- Minimum shift is 6 hours. The work agreement must be accepted to submit; drafts can be saved first.
- Urgency is Normal, Urgent or Immediate. Urgent and Immediate cost more per hour, and that premium goes to the worker.
- Joblop reviews the request, may ask for more information, then approves and emails a job code. Calendar statuses: draft, submitted, under review, published, assigned, in progress, completed, cancelled.
- Changing a request: open it from the calendar to edit, duplicate, add or reduce workers, or cancel. Cancelling within 24 hours of the start with confirmed workers has a charge, and a preview shows the amount first.

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
1. Request calendar (/calendar): Begin review, Request information, Approve for dispatch. Approval needs an effective contract and role rate, and emails the employer a job code. "Open for direct worker claim" assigns eligible workers first come, first served.
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
3. Only locked timesheets create money. A 6-hour minimum applies to payable and billable time.
4. Payroll (/payroll): create a pay period, Calculate pay, Verify, Approve, Lock. Statuses: calculated, in_review, approved, rejected, superseded, locked. Deduction rates are synthetic placeholders. AI cannot approve, lock, correct or pay.
5. Two pay channels: an employee is paid net with a pay statement; a self-employed worker is paid gross with a fee statement. Corrections recompute from inputs, so fix the source first. After lock a correction becomes a linked adjustment.
6. Invoices: locking a timesheet creates a draft. Statuses: draft, approved, issued, sent, viewed, partially_paid, paid, overdue, disputed, voided, refunded. On /invoices, choose the employer, then Approve invoice, Issue invoice and Send to employer. Issuing gives the invoice its number and cannot be undone there. Sending emails the person who created the job. Dispute and void are API only, and due dates are not set.
7. Employer payment: employers pay an issued invoice by card through Stripe test mode. Refunds exist only on the fake local provider.
8. Worker payout: created for each locked calculation. 48-hour review window from job completion, then registered, then a 14-day hold from period end, then released, then paid. Release does not check whether the employer paid. There is no admin payout list.
9. Disputes (/disputes): a worker dispute holds the payout. Staff write a note and press "Settle dispute and release hold". The worker can also withdraw it.
10. Notices: workers get best-effort emails for confirmed earnings and sent payments. Employers get none.

KNOWN GAPS TO FLAG WHEN RELEVANT
- Workers' work-type buttons on My pay do not work.`;

export function guideFor(audience: ContactAudience): string {
  if (audience === "worker") return WORKER_GUIDE;
  if (audience === "employer") return EMPLOYER_GUIDE;
  return `${STAFF_GUIDE}\n\nWHAT WORKERS ARE TOLD\n${WORKER_GUIDE}\n\nWHAT EMPLOYERS ARE TOLD\n${EMPLOYER_GUIDE}`;
}
