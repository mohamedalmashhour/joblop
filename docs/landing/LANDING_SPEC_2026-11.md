# Joblop Landing ("Reliable People. Better Care.") — owner spec 2026-11-03

Base page: apps/worker/app/browse/PublicJobBoard.tsx  (route: /browse — the OWNER-DESIGNATED landing)

1. "Choose your path" section moved UP near the hero (reuse existing cards, don't build new).
2. Worker card -> worker Create account / Sign in; Employer card -> employer Create account / Sign in.
3. Admin NOT on public landing — admin via special download / separate access.
4. "Find a Job" / Search -> REAL internal Joblop jobs (not JobScanner).
5. JobScanner -> header link only, separate from main search.
6. Open-jobs count + listings -> real Joblop jobs + most employer-requested roles (not external leads).
7. "How Joblop works" -> show its info/steps inline in that section.
8. "Explore jobs by category" -> add light, real, free (royalty-free) photos.
9. "Featured opportunities" -> LONG-TERM / payroll jobs; source Job Bank / long-term sources (long-term scanner). Partner/official feed only, no scraping.
10. JobScanner -> link MULTIPLE sources/feeds (not one) for effectiveness. Partner feeds only, no scraping.
11. "Live from across Joblop" (live Joblop data, NOT web) -> highest-rate Joblop jobs + market general wage + median.
12. "For employers — find and staff shifts faster" -> REMOVE from landing; rewrite as advanced search in EMPLOYER site.
13. "Ready to start your next shift?" -> move to EMPLOYEE/worker side; add "Refer your friends" + referral mechanism (reuse existing referralCode/invite-friends).

Rules: never fabricate counts/jobs; feed-dependent parts show clearly-labeled samples until a permitted feed is wired. Payments stay OFF. Build on branch, show on localhost, SAVE for owner re-review BEFORE any live deploy.
